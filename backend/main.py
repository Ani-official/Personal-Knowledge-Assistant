from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.api import upload, chat, status, auth, documents, user_api_key
from app.core.config import settings
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY  # from .env or config.py
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(upload.router, prefix="/upload")
app.include_router(user_api_key.router, prefix="/api-key", tags=["User API Key"])
app.include_router(status.router, prefix="/status", tags=["Status"])
app.include_router(documents.router, prefix="/documents", tags=["Documents"])
app.include_router(chat.router, prefix="/chat")

@app.get("/")
def root():
    return {"message": "Personal Knowledge Assistant API"}
