"""add document pages for the evidence reader

Revision ID: c9d0e1f2a3b4
Revises: b7c8d9e0f1a2
Create Date: 2026-09-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9d0e1f2a3b4"
down_revision: Union[str, Sequence[str], None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("page_count", sa.Integer(), nullable=True))
    op.add_column(
        "documents",
        sa.Column("page_label", sa.String(), nullable=False, server_default="page"),
    )

    op.create_table(
        "document_pages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("doc_id", sa.String(), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["doc_id"], ["documents.doc_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("doc_id", "page_number", name="uq_document_pages_doc_page"),
    )
    op.create_index("ix_document_pages_id", "document_pages", ["id"], unique=False)
    op.create_index("ix_document_pages_doc_id", "document_pages", ["doc_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_document_pages_doc_id", table_name="document_pages")
    op.drop_index("ix_document_pages_id", table_name="document_pages")
    op.drop_table("document_pages")

    op.drop_column("documents", "page_label")
    op.drop_column("documents", "page_count")
