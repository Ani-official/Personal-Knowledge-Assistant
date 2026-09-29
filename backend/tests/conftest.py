"""
Test harness: the real FastAPI app, wired to an in-memory SQLite database.

Environment values are forced (not defaulted) before the app is imported so a
test run can never reach the real Postgres, Qdrant or Google endpoints.
"""
import os

from cryptography.fernet import Fernet

os.environ.update(
    {
        "SECRET_KEY": "test-secret-key-that-is-long-enough-for-hs256",
        "GOOGLE_CLIENT_ID": "test-client-id",
        "GOOGLE_CLIENT_SECRET": "test-client-secret",
        "OPENROUTER_API_KEY": "test-openrouter",
        "FERNET_SECRET": Fernet.generate_key().decode(),
        "DATABASE_URL": "postgresql+asyncpg://test:test@127.0.0.1:1/unused",
        "FRONTEND_URL": "http://frontend.test",
        "FRONTEND_DASHBOARD_URL": "http://frontend.test/dashboard",
        "QDRANT_URL": "https://127.0.0.1:1",
        "QDRANT_API_KEY": "test",
        "EMBEDDING_API_KEY": "test",
    }
)

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.user import User
from main import app


@pytest.fixture
async def db_sessionmaker():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        # Only the users table: the other models use Postgres-only column types.
        await conn.run_sync(User.__table__.create)
    maker = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    yield maker
    await engine.dispose()


@pytest.fixture
async def client(db_sessionmaker):
    async def override_get_db():
        async with db_sessionmaker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    limiter.enabled = False
    limiter.reset()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://api.test") as ac:
        yield ac
    app.dependency_overrides.clear()
    limiter.enabled = True
    limiter.reset()


@pytest.fixture
async def make_user(db_sessionmaker):
    from app.core.security import hash_password

    async def _make(email: str, password: str | None = "correct-horse-battery"):
        async with db_sessionmaker() as session:
            user = User(email=email, hashed_password=hash_password(password) if password else None)
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user

    return _make


def error_code(response) -> str:
    return response.json()["error"]["code"]
