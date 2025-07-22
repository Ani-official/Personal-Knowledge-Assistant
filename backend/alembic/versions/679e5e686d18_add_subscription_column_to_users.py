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
    subscription_enum.create(op.get_bind(), checkfirst=True)
    op.add_column('users', sa.Column('subscription', subscription_enum, nullable=True))


def downgrade():
    op.drop_column('users', 'subscription')
    subscription_enum.drop(op.get_bind(), checkfirst=True)
