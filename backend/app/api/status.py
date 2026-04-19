from fastapi import APIRouter
from fastapi.params import Depends
from app.core.security import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.document import Document
from app.db.session import get_db
from sqlalchemy.future import select
from app.services.rag import _processing_errors

router = APIRouter()

@router.get("/{doc_id}")
async def get_status(
    doc_id: str,
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Document).where(Document.doc_id == doc_id, Document.user_email == user)
    )
    doc = result.scalar_one_or_none()
    status = doc.status if doc else "not_found"
    response: dict = {"status": status}
    if status == "failed":
        error = _processing_errors.get(doc_id)
        if error:
            response["error_detail"] = error
    return response
