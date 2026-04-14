# app/core/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Secrets
    SECRET_KEY: str
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    OPENROUTER_API_KEY: str
    FERNET_SECRET: str

    # DB
    DATABASE_URL: str

    # Frontend
    FRONTEND_URL: str
    FRONTEND_DASHBOARD_URL: str

    # Qdrant Cloud vector database
    QDRANT_URL: str
    QDRANT_API_KEY: str

    # Embedding provider — works with any OpenAI-compatible API
    # Defaults: Jina AI (free 1M tokens/month, no credit card — jina.ai)
    # For OpenAI: set EMBEDDING_BASE_URL=https://api.openai.com/v1, EMBEDDING_MODEL=text-embedding-3-small, VECTOR_SIZE=1536
    EMBEDDING_API_KEY: str
    EMBEDDING_BASE_URL: str = "https://api.jina.ai/v1"
    EMBEDDING_MODEL: str = "jina-embeddings-v3"
    VECTOR_SIZE: int = 1024  # jina-embeddings-v3 default; use 1536 for OpenAI text-embedding-3-small

    # Cookie settings (use secure=True + samesite=None in production)
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "Lax"

    # Tokens
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    class Config:
        env_file = ".env"


settings = Settings()
