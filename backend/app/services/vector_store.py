from qdrant_client import AsyncQdrantClient
from app.core.config import settings

qdrant_client = AsyncQdrantClient(
    url=settings.QDRANT_URL,
    api_key=settings.QDRANT_API_KEY,
    timeout=60,
)

COLLECTION_NAME = "user_notes"
VECTOR_SIZE = settings.VECTOR_SIZE
