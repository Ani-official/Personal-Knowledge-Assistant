from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.feedback import Feedback

router = APIRouter()


class FeedbackIn(BaseModel):
    name: str | None = None
    email: str | None = None
    message: str
    rating: int | None = None


@router.post("/", status_code=201)
async def submit_feedback(payload: FeedbackIn, db: AsyncSession = Depends(get_db)):
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")
    if payload.rating is not None and payload.rating not in range(1, 6):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5.")

    entry = Feedback(
        name=payload.name or None,
        email=payload.email or None,
        message=payload.message.strip(),
        rating=payload.rating,
    )
    db.add(entry)
    await db.commit()
    return {"ok": True}