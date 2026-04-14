"""add subscription column to users

Revision ID: 679e5e686d18
Revises: 0001_initial
Create Date: 2025-07-16 15:03:58.202163

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Define the enum type
subscription_enum = sa.Enum("free", "pro", name="subscriptionlevel")

# revision identifiers, used by Alembic.
revision: str = '679e5e686d18'
down_revision: Union[str, Sequence[str], None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("users")}

    subscription_enum.create(bind, checkfirst=True)

    if "subscription" not in existing_columns:
        op.add_column("users", sa.Column("subscription", subscription_enum, nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("users")}

    if "subscription" in existing_columns:
        op.drop_column("users", "subscription")

    subscription_enum.drop(bind, checkfirst=True)
