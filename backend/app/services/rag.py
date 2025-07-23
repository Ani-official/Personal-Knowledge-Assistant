import os
import re
import asyncio
import logging
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from concurrent.futures import ThreadPoolExecutor

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


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


async def encode_chunks_async(chunks):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        executor,
        lambda: model.encode(
            chunks, batch_size=8, show_progress_bar=False, convert_to_numpy=True
        ).tolist()
    )


async def embed_and_store(compressed_text: bytes, doc_id: str):
    try:
        text = decompress_text(compressed_text)
        if not text:
            logger.warning(f"[Empty] No text found for doc_id={doc_id}")
            return

        chunks = chunk_text(text)
        if not chunks:
            logger.warning(f"[Empty] Chunking failed for doc_id={doc_id}")
            return

        embeddings = await encode_chunks_async(chunks)
        ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
        metadata = [{"source": doc_id, "chunk": i} for i in range(len(chunks))]

        collection.add(documents=chunks, embeddings=embeddings, ids=ids, metadatas=metadata)

        async with AsyncSessionLocal() as session:
            await session.execute(
                update(Document).where(Document.doc_id == doc_id).values(status="done")
            )
            await session.commit()

        logger.info(f"[✅] Stored embeddings for doc_id={doc_id}")

    except Exception as e:
        logger.exception(f"[❌] Failed to embed/store for doc_id={doc_id}: {e}")


def get_context_chunks(doc_id: str, query: str, top_k: int = 3):
    try:
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


def query_llm(question: str, context_chunks: list, model: str = "meta-llama/llama-3.3-70b-instruct:free", api_key: str) -> str:
    import httpx

    if not api_key or not api_key.strip():
        return "[Error] API key is required and cannot be empty."

    context = "\n\n".join(context_chunks)
    prompt = (
        "You are a helpful assistant. Use only the context provided between triple backticks.\n"
        f"```\n{context}\n```\n"
        f"Question: {question}\nAnswer:"
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        # "HTTP-Referer": "http://localhost",
        "X-Title": "PersonalKnowledgeAssistant"
    }

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}]
    }

    try:
        response = httpx.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        logger.exception(f"[❌] LLM request failed: {e}")
        return "[Error] Failed to get LLM response"
