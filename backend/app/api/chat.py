from fastapi import APIRouter, Body, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.security import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user_api_key import UserAPIKey
from app.core.encryption import decrypt_key
from app.services.rag import get_context_chunks, has_sufficient_context, query_llm, stream_text_response

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

MAX_QUESTION_LENGTH = 2000


@router.post("/")
@limiter.limit("10/minute")
async def chat_with_doc(
    request: Request,
    doc_id: str = Body(...),
    question: str = Body(...),
    api_key: str | None = Body(None),
    model: str = Body("meta-llama/llama-3.3-70b-instruct:free"),
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not doc_id or not question:
        raise HTTPException(status_code=400, detail="Missing doc_id or question")

    if len(question) > MAX_QUESTION_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Question too long. Maximum {MAX_QUESTION_LENGTH} characters.",
        )

    matches = await get_context_chunks(doc_id, question, top_k=4)

    if not matches or not isinstance(matches, list):
        raise HTTPException(status_code=404, detail="No relevant context found")

    if not has_sufficient_context(matches):
        return StreamingResponse(
            stream_text_response("I couldn't find that in this document."),
            media_type="text/event-stream",
        )

    chunks = [match["text"] for match in matches]

    # Determine API key: request body > DB stored key > server fallback
    using_fallback = False
    final_key = api_key
    if not final_key:
        result = await db.execute(select(UserAPIKey).where(UserAPIKey.email == user))
        user_key_row = result.scalar_one_or_none()
        if user_key_row:
            final_key = decrypt_key(user_key_row.encrypted_key)

    if not final_key:
        if not settings.OPENROUTER_API_KEY:
            raise HTTPException(status_code=403, detail="No API key configured")
        final_key = settings.OPENROUTER_API_KEY
        using_fallback = True

    headers = {"X-Fallback-Key": "true"} if using_fallback else {}

    return StreamingResponse(
        query_llm(question, chunks, final_key, model),
        media_type="text/event-stream",
        headers=headers,
    )
