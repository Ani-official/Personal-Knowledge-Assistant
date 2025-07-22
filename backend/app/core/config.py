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

    # Tokens
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    class Config:
        env_file = ".env"


settings = Settings()
