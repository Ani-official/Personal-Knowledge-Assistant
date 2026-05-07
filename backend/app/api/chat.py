import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.conversations import (
    build_default_title,
    create_conversation_record,
    get_conversation_or_404,
    store_conversation_message,
    validate_conversation_scope,
)
from app.core.config import settings
from app.core.encryption import decrypt_key
from app.core.security import get_current_user
from app.db.session import AsyncSessionLocal, get_db
from app.models.document import Document
from app.models.user_api_key import UserAPIKey
from app.services.rag import (
    get_context_chunks,
    get_workspace_context_chunks,
    has_sufficient_context,
    query_llm,
    stream_text_response,
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

MAX_QUESTION_LENGTH = 2000


async def persist_streaming_response(
    generator: AsyncGenerator[str, None],
    conversation_id: str,
) -> AsyncGenerator[str, None]:
    ai_response = ""
    pending_sources: list[dict] | None = None

    try:
        async for chunk in generator:
            if chunk.startswith("data: "):
                data = chunk[6:].strip()
                if data and data != "[DONE]":
                    try:
                        parsed = json.loads(data)
                        if isinstance(parsed.get("sources"), list):
                            pending_sources = parsed["sources"]
                        delta = parsed.get("choices", [{}])[0].get("delta", {}).get("content")
                        if isinstance(delta, str):
                            ai_response += delta
                    except json.JSONDecodeError:
                        pass
            yield chunk
    finally:
        if ai_response.strip():
            async with AsyncSessionLocal() as session:
                await store_conversation_message(
                    db=session,
                    conversation_id=conversation_id,
                    role="ai",
                    content=ai_response,
                    sources=pending_sources,
                )


@router.post("/")
@limiter.limit("10/minute")
async def chat_with_doc(
    request: Request,
    question: str = Body(...),
    doc_id: str | None = Body(None),
    scope: str = Body("document"),
    conversation_id: str | None = Body(None),
    api_key: str | None = Body(None),
    model: str = Body("meta-llama/llama-3.3-70b-instruct:free"),
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not question:
        raise HTTPException(status_code=400, detail="Missing question")

    if len(question) > MAX_QUESTION_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Question too long. Maximum {MAX_QUESTION_LENGTH} characters.",
        )

    if conversation_id:
        conversation = await get_conversation_or_404(db, conversation_id, user)
        if conversation.scope != scope:
            raise HTTPException(status_code=400, detail="Conversation scope mismatch")
        if conversation.doc_id != doc_id:
            raise HTTPException(status_code=400, detail="Conversation document mismatch")
    else:
        await validate_conversation_scope(db=db, user=user, scope=scope, doc_id=doc_id)
        conversation = await create_conversation_record(
            db=db,
            user=user,
            scope=scope,
            doc_id=doc_id,
            title=build_default_title(question),
        )
        conversation_id = conversation.id

    await store_conversation_message(
        db=db,
        conversation_id=conversation.id,
        role="user",
        content=question,
    )

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

    headers = {"X-Conversation-Id": conversation.id}
    if using_fallback:
        headers["X-Fallback-Key"] = "true"

    if scope == "workspace":
        docs_result = await db.execute(
            select(Document).where(
                Document.user_email == user,
                Document.status == "done",
            )
        )
        user_docs = docs_result.scalars().all()

        if not user_docs:
            return StreamingResponse(
                persist_streaming_response(
                    stream_text_response("You haven't uploaded any documents yet."),
                    conversation.id,
                ),
                media_type="text/event-stream",
                headers=headers,
            )

        doc_id_to_filename = {d.doc_id: d.filename for d in user_docs}
        doc_ids = list(doc_id_to_filename.keys())

        matches = await get_workspace_context_chunks(doc_ids, question)

        if not matches or not has_sufficient_context(matches):
            return StreamingResponse(
                persist_streaming_response(
                    stream_text_response("I couldn't find relevant information across your documents."),
                    conversation.id,
                ),
                media_type="text/event-stream",
                headers=headers,
            )

        chunks = [m["text"] for m in matches]

        seen: dict[str, dict] = {}
        for match in matches:
            match_doc_id = match["doc_id"]
            if match_doc_id not in seen or match["score"] > seen[match_doc_id]["score"]:
                seen[match_doc_id] = {
                    "doc_id": match_doc_id,
                    "filename": doc_id_to_filename.get(match_doc_id, match_doc_id),
                    "score": round(match["score"], 3),
                }
        sources = list(seen.values())

        return StreamingResponse(
            persist_streaming_response(
                query_llm(question, chunks, final_key, model, sources=sources),
                conversation.id,
            ),
            media_type="text/event-stream",
            headers=headers,
        )

    if not doc_id:
        raise HTTPException(status_code=400, detail="doc_id required for document scope")

    matches = await get_context_chunks(doc_id, question, top_k=4)

    if not matches or not isinstance(matches, list):
        raise HTTPException(status_code=404, detail="No relevant context found")

    if not has_sufficient_context(matches):
        return StreamingResponse(
            persist_streaming_response(
                stream_text_response("I couldn't find that in this document."),
                conversation.id,
            ),
            media_type="text/event-stream",
            headers=headers,
        )

    chunks = [match["text"] for match in matches]

    return StreamingResponse(
        persist_streaming_response(
            query_llm(question, chunks, final_key, model),
            conversation.id,
        ),
        media_type="text/event-stream",
        headers=headers,
    )
