from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.document import Document

router = APIRouter()

@router.get("/")
async def list_documents(
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Document).where(Document.user_email == user))
    docs = result.scalars().all()
    return [
        {
            "doc_id": d.doc_id,
            "filename": d.filename,
            "status": d.status,
            "upload_time": d.upload_time
        } for d in docs
    ]


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Document).where(Document.doc_id == doc_id, Document.user_email == user)
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    await db.delete(doc)
    await db.commit()

    return {"message": "Document deleted"}
