"""let documents be deleted while their conversations survive

Deleting a document failed with a foreign key violation whenever any chat
referenced it. The API reports a conversation as orphaned via
`document_deleted = doc_id is set AND the document is gone`, so the id must
survive the delete — ON DELETE SET NULL would make the chat look like a
workspace chat instead. Drop the constraint and keep doc_id as a plain
reference.

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-09-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "d0e1f2a3b4c5"
down_revision: Union[str, Sequence[str], None] = "c9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("conversations_doc_id_fkey", "conversations", type_="foreignkey")
    op.create_index("ix_conversations_doc_id", "conversations", ["doc_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_conversations_doc_id", table_name="conversations")
    # Conversations whose document is already gone would violate the restored
    # constraint, so detach them first.
    op.execute(
        "UPDATE conversations SET doc_id = NULL WHERE doc_id IS NOT NULL "
        "AND doc_id NOT IN (SELECT doc_id FROM documents)"
    )
    op.create_foreign_key(
        "conversations_doc_id_fkey", "conversations", "documents", ["doc_id"], ["doc_id"]
    )
