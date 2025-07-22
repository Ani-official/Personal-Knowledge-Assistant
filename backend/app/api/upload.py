from fastapi import APIRouter, File, UploadFile, BackgroundTasks, Depends, HTTPException
import os
import tempfile
import aiofiles
from app.utils.parser import parse_pdf, parse_markdown
from app.services.rag import embed_and_store
from app.utils.compression import compress_text
from app.models.document import Document
from app.core.security import get_current_user
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.models.user import User
from app.models.user import SubscriptionLevel
import uuid
import time

router = APIRouter()
CHUNK_SIZE = 1024 * 1024  # 1MB

@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
     # ✅ Guard: check if file is valid
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="File is missing or invalid")

    # ✅ Guard: check if user is valid
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized user")

    filename = file.filename.lower()
    temp_file_path = tempfile.mktemp(suffix=filename)

    start_time = time.time()

    try:
        async with aiofiles.open(temp_file_path, 'wb') as temp_file:
            while chunk := await file.read(CHUNK_SIZE):
                await temp_file.write(chunk)

        if filename.endswith(".pdf"):
            text = parse_pdf(temp_file_path)
        elif filename.endswith(".md"):
            async with aiofiles.open(temp_file_path, "rb") as f:
                md_content = await f.read()
            text = parse_markdown(md_content)
        else:
            return {"error": "Unsupported file format"}

        doc_id = str(uuid.uuid4())
        compressed_text = compress_text(text)

        # 🧠 Get user subscription from DB
        user_result = await db.execute(select(User).where(User.email == user))
        user_obj = user_result.scalar_one_or_none()
        if not user_obj:
            raise HTTPException(status_code=404, detail="User not found")


        # 🎯 Determine upload limit by plan
        upload_limit = 3 if user_obj.subscription == SubscriptionLevel.free else float("inf")

        # 🔢 Count user uploads
        doc_count_result = await db.execute(
            select(func.count()).select_from(Document).where(Document.user_email == user)
        )
        upload_count = doc_count_result.scalar()

        if upload_count >= upload_limit:
            raise HTTPException(
                status_code=403,
                detail=f"Upload limit reached. Plan: {user_obj.subscription}, Limit: {upload_limit}"
            )

        # Store document record
        document = Document(
            doc_id=doc_id,
            filename=file.filename,
            user_email=user,
            status="processing"
        )
        db.add(document)
        await db.commit()

        background_tasks.add_task(embed_and_store, compressed_text, doc_id)

        elapsed = round(time.time() - start_time, 2)
        return {
            "filename": file.filename,
            "doc_id": doc_id,
            "status": "Processing embeddings in background",
            "upload_time_sec": elapsed
        }

    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
