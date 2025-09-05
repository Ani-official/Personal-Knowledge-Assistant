from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user_api_key import UserAPIKey
from app.core.encryption import decrypt_key
from app.services.rag import get_context_chunks, query_llm

router = APIRouter()

@router.post("/")
async def chat_with_doc(
    doc_id: str = Body(...),
    question: str = Body(...),
    api_key: str | None = Body(None),
    model: str = Body("meta-llama/llama-3.3-70b-instruct:free"),
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not doc_id or not question:
        raise HTTPException(status_code=400, detail="Missing doc_id or question")

    chunks = get_context_chunks(doc_id, question, top_k=4)

    if not chunks or not isinstance(chunks, list):
        raise HTTPException(status_code=404, detail="No relevant context found")

    # Determine API key
    final_key = api_key
    if not final_key:
        result = await db.execute(select(UserAPIKey).where(UserAPIKey.email == user))
        user_key_row = result.scalar_one_or_none()
        if user_key_row:
            final_key = decrypt_key(user_key_row.encrypted_key)

    if not final_key:
        raise HTTPException(status_code=403, detail="No API key found")

    # Directly stream from query_llm
    return StreamingResponse(
        query_llm(question, chunks, final_key, model),
        media_type="text/event-stream"
    )
