from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from app.core.config import settings

load_dotenv()

DATABASE_URL = settings.DATABASE_URL

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=2,
    max_overflow=3,  # max 5 total connections — matches Neon free tier limit
)

async_session = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Alias used by rag.py for background tasks
AsyncSessionLocal = async_session

async def get_db():
    async with async_session() as session:
        yield session
