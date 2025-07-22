import os
import re
import asyncio
from sentence_transformers import SentenceTransformer
from app.utils.compression import decompress_text
from app.models.document import Document
from app.core.config import settings

import chromadb

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import update
from app.db.base import Base
from dotenv import load_dotenv

# Load env vars
load_dotenv()
DATABASE_URL = settings.DATABASE_URL
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in .env")

# Adjust dialect for asyncpg
DATABASE_URL = re.sub(r"^postgresql:", "postgresql+asyncpg:", DATABASE_URL)

# Async DB setup
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# Init model + Chroma
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


async def embed_and_store(compressed_text: bytes, doc_id: str):
    try:
        text = decompress_text(compressed_text)
        chunks = chunk_text(text)
        embeddings = model.encode(chunks, batch_size=8, show_progress_bar=True, convert_to_numpy=True).tolist()

        ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
        metadata = [{"source": doc_id, "chunk": i} for i in range(len(chunks))]

        # Store in vector DB
        collection.add(documents=chunks, embeddings=embeddings, ids=ids, metadatas=metadata)

        # ✅ Update document status to 'done' in DB
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(Document).where(Document.doc_id == doc_id).values(status="done")
            )
            await session.commit()

    except Exception as e:
        print(f"[embed_and_store_async] Error processing doc_id={doc_id}:", e)



def get_context_chunks(doc_id: str, query: str, top_k: int = 3):
    query_embedding = model.encode([query])[0].tolist()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={"source": doc_id}
    )
    documents = results.get("documents", [[]])
    return documents[0] if documents and len(documents[0]) > 0 else []



def query_llm(question: str, context_chunks: list, model:str = "meta-llama/llama-3.3-70b-instruct:free", api_key: str | None = None) -> str:
    import httpx

    key = api_key or settings.OPENROUTER_API_KEY

    if not key:
        return "[Error] No API key provided"

    endpoint = "https://openrouter.ai/api/v1/chat/completions"
    context = "\n\n".join(context_chunks)
    prompt = f"""Use only the below context to answer the question.\n\nContext:\n{context}\n\nQuestion: {question}\nAnswer:"""

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "PersonalKnowledgeAssistant"
    }

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}]
    
    }

    try:
        response = httpx.post(endpoint, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"[Error] {str(e)}"
