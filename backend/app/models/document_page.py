# app/models/document_page.py
from sqlalchemy import Column, ForeignKey, Integer, String, Text, UniqueConstraint

from app.db.base import Base


class DocumentPage(Base):
    """
    The extracted text of one page (PDF) or section (plain-text formats).

    The uploaded file itself is never stored, so this is what the reader pane
    shows when a user opens the evidence behind an answer.
    """

    __tablename__ = "document_pages"

    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(
        String,
        ForeignKey("documents.doc_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    page_number = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint("doc_id", "page_number", name="uq_document_pages_doc_page"),
    )
