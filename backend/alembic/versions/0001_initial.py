from alembic import op
import sqlalchemy as sa

# Enum type used in User model
subscription_enum = sa.Enum("free", "pro", name="subscriptionlevel")

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    subscription_enum.create(op.get_bind(), checkfirst=True)

    # op.create_table(
    #     "users",
    #     sa.Column("id", sa.Integer, primary_key=True),
    #     sa.Column("email", sa.String, nullable=False, unique=True, index=True),
    #     sa.Column("hashed_password", sa.String, nullable=False),
    #     sa.Column("subscription", subscription_enum, nullable=True),
    # )

    # op.create_table(
    #     "documents",
    #     sa.Column("id", sa.Integer, primary_key=True),
    #     sa.Column("doc_id", sa.String, nullable=False, unique=True),
    #     sa.Column("filename", sa.String, nullable=False),
    #     sa.Column("user_email", sa.String, sa.ForeignKey("users.email"), nullable=False),
    #     sa.Column("upload_time", sa.DateTime(timezone=True), server_default=sa.func.now()),
    #     sa.Column("status", sa.String, default="processing")
    # )

def downgrade():
    op.drop_table("documents")
    op.drop_table("users")
    subscription_enum.drop(op.get_bind(), checkfirst=True)
