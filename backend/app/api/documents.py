from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.document import Document
from app.models.document_page import DocumentPage
from app.services.vector_store import qdrant_client, COLLECTION_NAME
from qdrant_client.models import Filter, FieldCondition, MatchValue

router = APIRouter()


@router.get("/")
async def list_documents(
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.user_email == user))
    docs = result.scalars().all()
    return [
        {
            "doc_id": d.doc_id,
            "filename": d.filename,
            "status": d.status,
            "upload_time": d.upload_time,
            "page_count": d.page_count,
            "page_label": d.page_label,
        }
        for d in docs
    ]


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.doc_id == doc_id, Document.user_email == user)
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    await db.delete(doc)
    await db.commit()

    # Delete all vectors for this document from Qdrant
    try:
        await qdrant_client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[FieldCondition(key="source", match=MatchValue(value=doc_id))]
            ),
        )
    except Exception:
        # Log but don't fail the request — Postgres record is already deleted
        import logging
        logging.getLogger(__name__).warning(f"Failed to delete Qdrant vectors for doc_id={doc_id}")

    return {"message": "Document deleted"}


@router.get("/{doc_id}/pages/{page_number}")
async def read_document_page(
    doc_id: str,
    page_number: int,
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Text of a single page, for the reader pane beside an answer.

    Documents indexed before page extraction existed have no rows here; the
    client is told so explicitly rather than being shown an empty page.
    """
    doc_result = await db.execute(
        select(Document).where(Document.doc_id == doc_id, Document.user_email == user)
    )
    document = doc_result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if not document.page_count:
        raise HTTPException(
            status_code=409,
            detail="This document was indexed before page text was stored. Re-upload it to use the reader.",
        )

    page_result = await db.execute(
        select(DocumentPage).where(
            DocumentPage.doc_id == doc_id,
            DocumentPage.page_number == page_number,
        )
    )
    page = page_result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    return {
        "doc_id": doc_id,
        "filename": document.filename,
        "page_number": page.page_number,
        "page_count": document.page_count,
        "page_label": document.page_label,
        "text": page.text,
    }
