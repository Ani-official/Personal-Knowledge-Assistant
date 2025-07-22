from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.user_api_key import UserAPIKey
from app.core.security import get_current_user
from app.core.encryption import encrypt_key, decrypt_key
from pydantic import BaseModel

router = APIRouter()

class APIKeyRequest(BaseModel):
    api_key: str


@router.post("/")
async def set_user_api_key(
    payload: APIKeyRequest,
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    encrypted = encrypt_key(payload.api_key)
    result = await db.execute(select(UserAPIKey).where(UserAPIKey.email == user))
    existing = result.scalar_one_or_none()

    if existing:
        existing.encrypted_key = encrypted
    else:
        db.add(UserAPIKey(email=user, encrypted_key=encrypted))

    await db.commit()
    return {"message": "API key saved securely"}

@router.get("/")
async def get_user_api_key(
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserAPIKey).where(UserAPIKey.email == user))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="API key not found")

    return {"api_key": decrypt_key(row.encrypted_key)}
