import json
import uuid

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.conversation_message import ConversationMessage
from app.models.document import Document

router = APIRouter()

VALID_SCOPES = {"document", "workspace"}


class ConversationCreateRequest(BaseModel):
    scope: str
    doc_id: str | None = None
    title: str | None = None


class ConversationRenameRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)


def build_default_title(text: str) -> str:
    normalized = " ".join(text.split())
    if not normalized:
        return "New chat"
    if len(normalized) <= 70:
        return normalized
    return f"{normalized[:67].rstrip()}..."


async def validate_conversation_scope(
    *,
    db: AsyncSession,
    user: str,
    scope: str,
    doc_id: str | None,
) -> Document | None:
    if scope not in VALID_SCOPES:
        raise HTTPException(status_code=400, detail="Invalid scope")

    if scope == "workspace":
        if doc_id is not None:
            raise HTTPException(status_code=400, detail="doc_id must be null for workspace scope")
        return None

    if not doc_id:
        raise HTTPException(status_code=400, detail="doc_id required for document scope")

    result = await db.execute(
        select(Document).where(Document.doc_id == doc_id, Document.user_email == user)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


async def get_conversation_or_404(
    db: AsyncSession,
    conversation_id: str,
    user: str,
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_email == user,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


async def serialize_conversation_summary(
    db: AsyncSession,
    conversation: Conversation,
) -> dict:
    document = None
    if conversation.doc_id:
        result = await db.execute(
            select(Document).where(Document.doc_id == conversation.doc_id)
        )
        document = result.scalar_one_or_none()

    count_result = await db.execute(
        select(func.count())
        .select_from(ConversationMessage)
        .where(ConversationMessage.conversation_id == conversation.id)
    )

    return {
        "id": conversation.id,
        "title": conversation.title,
        "scope": conversation.scope,
        "doc_id": conversation.doc_id,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "document_filename": document.filename if document else None,
        "document_deleted": bool(conversation.doc_id and document is None),
        "message_count": count_result.scalar() or 0,
    }


async def create_conversation_record(
    *,
    db: AsyncSession,
    user: str,
    scope: str,
    doc_id: str | None,
    title: str,
) -> Conversation:
    conversation = Conversation(
        id=str(uuid.uuid4()),
        user_email=user,
        title=title,
        scope=scope,
        doc_id=doc_id,
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation


async def store_conversation_message(
    *,
    db: AsyncSession,
    conversation_id: str,
    role: str,
    content: str,
    sources: list[dict] | None = None,
) -> ConversationMessage:
    message = ConversationMessage(
        conversation_id=conversation_id,
        role=role,
        content=content,
        sources_json=json.dumps(sources) if sources else None,
    )
    db.add(message)

    conversation = await db.get(Conversation, conversation_id)
    if conversation:
        conversation.updated_at = func.now()

    await db.commit()
    await db.refresh(message)
    return message


@router.get("/")
async def list_conversations(
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_email == user)
        .order_by(Conversation.updated_at.desc(), Conversation.created_at.desc())
    )
    conversations = result.scalars().all()
    return [await serialize_conversation_summary(db, conversation) for conversation in conversations]


@router.post("/")
async def create_conversation(
    payload: ConversationCreateRequest,
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await validate_conversation_scope(db=db, user=user, scope=payload.scope, doc_id=payload.doc_id)
    title = payload.title.strip() if payload.title else "New chat"
    if not title:
        title = "New chat"
    conversation = await create_conversation_record(
        db=db,
        user=user,
        scope=payload.scope,
        doc_id=payload.doc_id,
        title=title,
    )
    return await serialize_conversation_summary(db, conversation)


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await get_conversation_or_404(db, conversation_id, user)
    messages_result = await db.execute(
        select(ConversationMessage)
        .where(ConversationMessage.conversation_id == conversation.id)
        .order_by(ConversationMessage.created_at.asc(), ConversationMessage.id.asc())
    )
    messages = messages_result.scalars().all()
    summary = await serialize_conversation_summary(db, conversation)
    summary["messages"] = [
        {
            "id": message.id,
            "role": message.role,
            "content": message.content,
            "sources": json.loads(message.sources_json) if message.sources_json else [],
            "created_at": message.created_at,
        }
        for message in messages
    ]
    return summary


@router.patch("/{conversation_id}")
async def rename_conversation(
    conversation_id: str,
    payload: ConversationRenameRequest,
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await get_conversation_or_404(db, conversation_id, user)
    next_title = payload.title.strip()
    if not next_title:
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    conversation.title = next_title
    conversation.updated_at = func.now()
    await db.commit()
    await db.refresh(conversation)
    return await serialize_conversation_summary(db, conversation)


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await get_conversation_or_404(db, conversation_id, user)
    await db.execute(
        delete(ConversationMessage).where(ConversationMessage.conversation_id == conversation.id)
    )
    await db.delete(conversation)
    await db.commit()
    return {"message": "Conversation deleted"}
