# app/models/document.py
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(String, unique=True, nullable=False)
    filename = Column(String, nullable=False)
    user_email = Column(String, ForeignKey("users.email"), nullable=False)
    upload_time = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="processing")
