from sqlalchemy import Column, DateTime, ForeignKey, String, func

from app.db.base import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, index=True)
    user_email = Column(String, ForeignKey("users.email"), nullable=False, index=True)
    title = Column(String, nullable=False)
    scope = Column(String, nullable=False)
    doc_id = Column(String, ForeignKey("documents.doc_id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
