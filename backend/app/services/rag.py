# rag.py
import json
import asyncio
import logging
import uuid
from typing import Any, AsyncGenerator, List

from openai import AsyncOpenAI
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue, MatchAny
from sqlalchemy import update

from app.utils.compression import decompress_text
from app.models.document import Document
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.services.vector_store import qdrant_client, COLLECTION_NAME

logger = logging.getLogger(__name__)

# Stores the last error reason per doc_id so the status endpoint can expose it.
# Cleared when a document succeeds or the server restarts.
_processing_errors: dict[str, str] = {}

openai_client = AsyncOpenAI(
    api_key=settings.EMBEDDING_API_KEY,
    base_url=settings.EMBEDDING_BASE_URL,
)

EMBED_MODEL = settings.EMBEDDING_MODEL
MIN_CONTEXT_SCORE = 0.35


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    chunks: List[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


async def embed_texts(texts: List[str], batch_size: int = 96) -> List[List[float]]:
    """Embed texts in batches to respect Jina AI's per-request item limit."""
    embeddings: List[List[float]] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = await openai_client.embeddings.create(input=batch, model=EMBED_MODEL)
        embeddings.extend(item.embedding for item in response.data)
    return embeddings


async def embed_and_store(compressed_text: bytes, doc_id: str):
    """
    Decompress, chunk, embed via OpenAI, and upsert into Qdrant.
    Updates Document status to 'done' on success or 'failed' on error.
    """
    try:
        text = decompress_text(compressed_text)
        if not text or not text.strip():
            raise ValueError(f"No extractable text found in document {doc_id}")

        chunks = chunk_text(text)
        if not chunks:
            raise ValueError(f"Text chunking produced no chunks for document {doc_id}")

        embeddings = await embed_texts(chunks)

        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding,
                payload={"source": doc_id, "chunk": i, "text": chunk},
            )
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]

        for i in range(0, len(points), 50):
            await qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points[i : i + 50])

        async with AsyncSessionLocal() as session:
            await session.execute(
                update(Document).where(Document.doc_id == doc_id).values(status="done")
            )
            await session.commit()

        _processing_errors.pop(doc_id, None)
        logger.info(f"[OK] Stored {len(points)} embeddings for doc_id={doc_id}")

    except Exception as e:
        cause = getattr(e, "__cause__", None) or getattr(e, "__context__", None)
        reason = str(cause) if cause and str(cause) else (str(e) or type(e).__name__)
        _processing_errors[doc_id] = reason
        logger.exception(f"[FAILED] embed/store for doc_id={doc_id}: {e}")
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(
                    update(Document).where(Document.doc_id == doc_id).values(status="failed")
                )
                await session.commit()
        except Exception as db_err:
            logger.exception(f"[FAILED] Could not update status to 'failed' for doc_id={doc_id}: {db_err}")


async def get_context_chunks(doc_id: str, query: str, top_k: int = 3) -> List[dict[str, Any]]:
    """
    Retrieve top-k most relevant chunks for doc_id using OpenAI embeddings + Qdrant.
    """
    try:
        query_embeddings = await embed_texts([query])
        query_vector = query_embeddings[0]

        results = await qdrant_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            query_filter=Filter(
                must=[FieldCondition(key="source", match=MatchValue(value=doc_id))]
            ),
            limit=top_k,
        )
        return [
            {
                "text": hit.payload["text"],
                "score": getattr(hit, "score", 0.0) or 0.0,
                "chunk": hit.payload.get("chunk"),
            }
            for hit in results
            if hit.payload and "text" in hit.payload
        ]

    except Exception as e:
        logger.exception(f"[FAILED] Retrieval for doc_id={doc_id}, query='{query}': {e}")
        return []


async def _rerank(query: str, chunks: List[dict], top_n: int) -> List[dict]:
    """
    Cross-encoder re-ranking via Jina Reranker API.
    Returns chunks re-ordered by relevance_score (descending), capped at top_n.
    Reuses EMBEDDING_API_KEY and EMBEDDING_BASE_URL — Jina exposes both
    embeddings and reranking under the same key and base URL.
    """
    import httpx
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{settings.EMBEDDING_BASE_URL}/rerank",
            headers={"Authorization": f"Bearer {settings.EMBEDDING_API_KEY}"},
            json={
                "model": settings.RERANKER_MODEL,
                "query": query,
                "documents": [c["text"] for c in chunks],
                "top_n": top_n,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    return [
        {**chunks[r["index"]], "score": r["relevance_score"]}
        for r in data["results"]
    ]


async def get_workspace_context_chunks(
    doc_ids: List[str], query: str, max_total: int = 20
) -> List[dict[str, Any]]:
    """
    Three-phase retrieval for workspace mode.

    Phase 1 — ANN candidate pool: fetch min(4 * n_docs, 80) chunks via Qdrant
    so every document gets a realistic chance to surface relevant content.

    Phase 2 — Cross-encoder re-ranking (when RERANKING_ENABLED): the Jina
    reranker re-scores all candidates by reading query + chunk together,
    producing accuracy far beyond bi-encoder cosine similarity. Falls back
    gracefully to bi-encoder scores if the reranker call fails.

    Phase 3 — Diversity enforcement: guarantee one slot per document whose
    best candidate clears the relevance threshold, then fill remaining slots
    by global score rank up to max_total.
    """
    if not doc_ids:
        return []
    try:
        query_embeddings = await embed_texts([query])
        query_vector = query_embeddings[0]

        candidate_k = min(4 * len(doc_ids), 80)
        results = await qdrant_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            query_filter=Filter(
                must=[FieldCondition(key="source", match=MatchAny(any=doc_ids))]
            ),
            limit=candidate_k,
        )

        candidates: list[dict] = [
            {
                "text": hit.payload["text"],
                "score": getattr(hit, "score", 0.0) or 0.0,
                "doc_id": hit.payload.get("source"),
                "chunk": hit.payload.get("chunk"),
            }
            for hit in results
            if hit.payload and "text" in hit.payload
        ]

        if not candidates:
            return []

        # Phase 2 — cross-encoder re-ranking
        using_reranker = False
        if settings.RERANKING_ENABLED:
            try:
                rerank_n = min(len(candidates), max_total + len(doc_ids))
                candidates = await _rerank(query, candidates, top_n=rerank_n)
                using_reranker = True
                logger.info(f"[Reranker] scored {len(candidates)} candidates for workspace query")
            except Exception as e:
                logger.warning(f"[Reranker] failed, falling back to bi-encoder scores: {e}")

        # Phase 3 — diversity enforcement using whichever scores are available
        score_threshold = settings.RERANKER_MIN_SCORE if using_reranker else MIN_CONTEXT_SCORE

        # candidates is already sorted by score (Qdrant ANN or reranker both return sorted)
        by_doc: dict[str, list] = {}
        for c in candidates:
            by_doc.setdefault(c["doc_id"], []).append(c)

        selected: list[dict] = []
        remainder: list[dict] = []

        for chunks in by_doc.values():
            best = chunks[0]
            if best["score"] >= score_threshold:
                selected.append(best)
                remainder.extend(chunks[1:])
            else:
                remainder.extend(chunks)

        remainder.sort(key=lambda x: x["score"], reverse=True)
        selected.extend(remainder[: max(0, max_total - len(selected))])
        selected.sort(key=lambda x: x["score"], reverse=True)
        return selected[:max_total]

    except Exception as e:
        logger.exception(f"[FAILED] Workspace retrieval for query='{query}': {e}")
        return []


def has_sufficient_context(matches: List[dict[str, Any]], min_score: float = MIN_CONTEXT_SCORE) -> bool:
    if not matches:
        return False

    best_score = max(match.get("score", 0.0) for match in matches)
    return best_score >= min_score


async def stream_text_response(message: str) -> AsyncGenerator[str, None]:
    yield 'data: {"choices":[{"delta":{"content":""}}]}\n\n'
    yield f'data: {json.dumps({"choices": [{"delta": {"content": message}}]})}\n\n'
    yield "data: [DONE]\n\n"


async def query_llm(
    question: str,
    chunks: List[str],
    api_key: str,
    model_name: str,
    sources: List[dict] | None = None,
) -> AsyncGenerator[str, None]:
    """
    Calls OpenRouter with streaming and yields OpenAI-style SSE events.
    If sources is provided, emits a sources SSE event before [DONE].
    """
    import httpx

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    formatted_context = "\n\n---\n\n".join(chunks)
    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a retrieval-augmented assistant. Answer only from the provided context. "
                    "If the answer is not explicitly supported by the context, reply exactly with: "
                    "\"I couldn't find that in this document.\" "
                    "Do not use outside knowledge. Do not guess. "
                    "Format the answer in clean Markdown with short paragraphs, blank lines between sections, "
                    "and fenced code blocks when showing code."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Use only the context below.\n\n"
                    f"Context:\n\n{formatted_context}\n\n"
                    f"Question: {question}"
                ),
            },
        ],
        "stream": True,
    }

    # Signal to frontend that AI has started
    yield 'data: {"choices":[{"delta":{"content":""}}]}\n\n'

    try:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code == 429:
                    yield 'data: {"rate_limit": true}\n\n'
                    return

                if response.status_code < 200 or response.status_code >= 300:
                    try:
                        body_text = await response.aread()
                        err_text = body_text.decode() if isinstance(body_text, (bytes, bytearray)) else str(body_text)
                    except Exception:
                        err_text = f"HTTP {response.status_code} (no body)"
                    error_event = {"error": f"Upstream API error: {err_text}"}
                    yield f"data: {json.dumps(error_event)}\n\n"
                    return

                async for line in response.aiter_lines():
                    logger.debug("LLM STREAM LINE: %s", line)

                    if not line or not line.startswith("data: "):
                        continue

                    data = line[len("data: "):].strip()

                    if data == "[DONE]":
                        return

                    try:
                        parsed = json.loads(data)
                        content = None

                        choices = parsed.get("choices") or []
                        if choices:
                            first = choices[0]
                            delta = first.get("delta") or {}
                            if isinstance(delta, dict) and "content" in delta:
                                content = delta["content"]
                            else:
                                message = first.get("message") or {}
                                if isinstance(message, dict) and "content" in message:
                                    val = message["content"]
                                    if isinstance(val, str):
                                        content = val
                                    elif isinstance(val, dict) and "text" in val:
                                        content = val["text"]

                        if content is None:
                            if "text" in parsed and isinstance(parsed["text"], str):
                                content = parsed["text"]
                            elif "content" in parsed and isinstance(parsed["content"], str):
                                content = parsed["content"]

                        if content:
                            event = {"choices": [{"delta": {"content": content}}]}
                            yield f"data: {json.dumps(event)}\n\n"
                            await asyncio.sleep(0.02)

                    except json.JSONDecodeError:
                        logger.debug("Failed to json-decode stream fragment; skipping.")
                        continue
                    except Exception as e:
                        logger.exception("Error processing stream chunk: %s", e)
                        continue

    except Exception as e:
        logger.exception("Unexpected error in LLM stream: %s", e)
        error_event = {"error": f"Stream error: {str(e)}"}
        yield f"data: {json.dumps(error_event)}\n\n"
    finally:
        if sources:
            yield f"data: {json.dumps({'sources': sources})}\n\n"
        yield "data: [DONE]\n\n"
