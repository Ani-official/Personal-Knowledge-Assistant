# rag.py
import os
import re
import json
import asyncio
import logging
from typing import AsyncGenerator, List
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from concurrent.futures import ThreadPoolExecutor

import httpx
import chromadb
from app.utils.compression import decompress_text
from app.models.document import Document
from app.core.config import settings

# Setup logging
logger = logging.getLogger(__name__)
executor = ThreadPoolExecutor()

# Load env vars
load_dotenv()
DATABASE_URL = settings.DATABASE_URL
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in .env")

# Adjust dialect for asyncpg
DATABASE_URL = re.sub(r"^postgresql:", "postgresql+asyncpg:", DATABASE_URL)
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# Init embedding model and ChromaDB
model = SentenceTransformer("thenlper/gte-large")
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="user_notes")


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    chunks: List[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


async def encode_chunks_async(chunks: List[str]):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        executor,
        lambda: model.encode(
            chunks, batch_size=8, show_progress_bar=False, convert_to_numpy=True
        ).tolist()
    )


async def embed_and_store(compressed_text: bytes, doc_id: str):
    """
    Decompress, chunk, embed and store in Chroma. Offloads CPU/blocking calls to threadpool.
    """
    try:
        text = decompress_text(compressed_text)
        if not text:
            logger.warning(f"[Empty] No text found for doc_id={doc_id}")
            return

        chunks = chunk_text(text)
        if not chunks:
            logger.warning(f"[Empty] Chunking failed for doc_id={doc_id}")
            return

        # encode in executor (already implemented above)
        embeddings = await encode_chunks_async(chunks)
        ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
        metadata = [{"source": doc_id, "chunk": i} for i in range(len(chunks))]

        # collection.add can be blocking — run in executor to avoid blocking event loop
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            executor,
            lambda: collection.add(documents=chunks, embeddings=embeddings, ids=ids, metadatas=metadata)
        )

        async with AsyncSessionLocal() as session:
            await session.execute(
                update(Document).where(Document.doc_id == doc_id).values(status="done")
            )
            await session.commit()

        logger.info(f"[✅] Stored embeddings for doc_id={doc_id}")

    except Exception as e:
        logger.exception(f"[❌] Failed to embed/store for doc_id={doc_id}: {e}")


def get_context_chunks(doc_id: str, query: str, top_k: int = 3) -> List[str]:
    """
    Retrieve top-k most relevant chunks for doc_id using the sentence-transformer model + Chroma.
    """
    try:
        # NOTE: model.encode here is synchronous; for single-query it's usually fine but
        # consider offloading if you notice blocking
        query_embedding = model.encode([query])[0].tolist()
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where={"source": doc_id}
        )
        documents = results.get("documents", [[]])
        return documents[0] if documents and len(documents[0]) > 0 else []
    except Exception as e:
        logger.exception(f"[❌] Retrieval failed for doc_id={doc_id}, query='{query}': {e}")
        return []



async def query_llm(
    question: str,
    chunks: List[str],
    api_key: str,
    model_name: str
) -> AsyncGenerator[str, None]:
    """
    Calls OpenRouter (or other provider that returns OpenAI-style streaming events),
    normalizes their streaming lines and yields OpenAI-style SSE JSON events.

    Each yielded string is an SSE event, e.g.
      data: {"choices":[{"delta":{"content":"...token..."}}]}\n\n
    """
    url = "https://openrouter.ai/api/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "system",
                "content": "You are an AI assistant. Use the provided context to answer the question."
            },
            {
                "role": "user",
                "content": f"Context: {' '.join(chunks)}\n\nQuestion: {question}"
            },
        ],
        "stream": True,
    }

    # ✅ Let frontend know AI has started typing immediately
    yield "data: {\"choices\":[{\"delta\":{\"content\":\"\"}}]}\n\n"

    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
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
                    yield "data: [DONE]\n\n"
                    break

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

                        # ✅ Slow down slightly so frontend streams smoothly
                        await asyncio.sleep(0.02)

                except json.JSONDecodeError:
                    logger.debug("Failed to json-decode stream fragment; skipping.")
                    continue
                except Exception as e:
                    logger.exception("Error processing stream chunk: %s", e)
                    continue

    # ✅ Safety net
    yield "data: [DONE]\n\n"
