from cryptography.fernet import Fernet
from app.core.config import settings
import os

FERNET_SECRET = settings.FERNET_SECRET

if not FERNET_SECRET:
    raise ValueError("FERNET_SECRET not set in .env")

fernet = Fernet(FERNET_SECRET.encode())

def encrypt_key(api_key: str) -> str:
    return fernet.encrypt(api_key.encode()).decode()

def decrypt_key(encrypted: str) -> str:
    return fernet.decrypt(encrypted.encode()).decode()
