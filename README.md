# Personal Knowledge Assistant

A full-stack AI-powered assistant for managing, searching, and chatting with your personal documents. Built with FastAPI (Python) on the backend and Next.js (React) on the frontend.

---

## Features
- **User Authentication**: Email/password & Google OAuth login
- **File Upload**: Upload PDF and Markdown files
- **Document Parsing & Embedding**: Text extraction, chunking, embedding via Sentence Transformers, stored in ChromaDB
- **Chat with Your Notes**: RAG-powered chat over your own documents using OpenRouter (OpenAI-compatible streaming)
- **API Key Encryption**: Securely store and use your own LLM API keys
- **Subscription Plans**: Free users have upload limits; 'pro' tier allows more
- **Status Tracking**: Check document processing status

---

## Tech Stack
- **Backend**: FastAPI, SQLAlchemy, Alembic, ChromaDB, SentenceTransformers, httpx
- **Database**: PostgreSQL (via asyncpg)
- **Frontend**: Next.js (App Router), React, TailwindCSS, Radix UI
- **Other**: Google OAuth, JWT, python-dotenv, encryption (cryptography/fernet)

---

## Directory Structure
```
backend/     # FastAPI app & services
frontend/    # Next.js frontend app
```

---

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js (v18+ recommended)
- PostgreSQL for backend DB

### Backend Setup
1. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Configure `.env` (see below)
3. Run database migrations:
   ```bash
   alembic upgrade head
   ```
4. Start the server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Visit http://localhost:3000

---

## Environment Variables (Backend)
Create a `.env` file in `backend/` root:
```
SECRET_KEY=your_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
OPENROUTER_API_KEY=your_openrouter_key
FERNET_SECRET=your_fernet_secret_for_encryption
DATABASE_URL=postgresql+asyncpg://user:password@localhost/dbname
FRONTEND_DASHBOARD_URL=http://localhost:3000/dashboard
```

---

## API Overview

### Auth
- `POST /auth/signup`: Email/password registration; returns a session like login (201)
- `POST /auth/login`: Login with password
- `POST /auth/refresh`: Exchange a valid token for a fresh one (sliding session)
- `GET /auth/login/google`: Google OAuth login
- `GET /auth/google/callback`: Google OAuth callback; redirects to the frontend with `#token=…` or `#error=<CODE>`
- `GET /auth/me`: Get current user info
- `POST /auth/logout`: Log out on every device (revokes all of the account's tokens server-side)

**Sessions.** A token is valid for 7 days (`ACCESS_TOKEN_EXPIRE_MINUTES`). While the app is open, it refreshes the token at most hourly, so an active user stays signed in. A user who doesn't open the app for 7 days must sign in again. Every session also ends 30 days after the original sign-in (`SESSION_MAX_AGE_DAYS`), however active the user is. When a session ends, the user sees `/auth/session-expired`, which then sends them to `/login`.

**Errors.** Every error response has the same shape, with a stable machine-readable code:
```json
{ "error": { "code": "AUTH_TOKEN_EXPIRED", "message": "…", "status": 401, "request_id": "…" }, "detail": "…" }
```
Auth codes include `AUTH_TOKEN_MISSING`, `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED`, `AUTH_USER_NOT_FOUND`, `AUTH_SESSION_REVOKED`, `AUTH_INVALID_CREDENTIALS`, `AUTH_USE_GOOGLE_SIGNIN`, `AUTH_EMAIL_TAKEN`, `AUTH_EMAIL_INVALID`, `AUTH_PASSWORD_TOO_SHORT`, `AUTH_PASSWORD_TOO_LONG` and `AUTH_OAUTH_*`. General codes include `VALIDATION_FAILED`, `RATE_LIMITED`, `NOT_FOUND` and `INTERNAL_ERROR`. The full list is in `backend/app/core/errors.py`. Every response also carries an `X-Request-ID` header.

### Documents
- `POST /upload`: Upload PDF or Markdown document
- `GET /documents`: List user’s documents
- `DELETE /documents/{doc_id}`: Delete a document
- `GET /status/{doc_id}`: Status of document processing

### API Keys
- `POST /api-key`: Set user's LLM API key (encrypted)
- `GET /api-key`: Retrieve user's API key (decrypted)

### Chat
- `POST /chat`: Chat with a document (parameters: `doc_id`, `question`, `api_key` (optional), `model` (optional)). Streams LLM responses, retrieving document context using embedded similarity.

---

## Running Tests
```bash
# Backend (uses in-memory SQLite; never touches the real database)
cd backend
pip install -r requirements-dev.txt
pytest

# Frontend
cd frontend
npm test
```

---

## How it Works
- Users upload documents (PDF/Markdown). Text is extracted, chunked, embedded via a transformer model, and stored in ChromaDB.
- Users can then chat with any uploaded document using RAG (Retrieval-Augmented Generation), where relevant document pieces are fetched and sent to an LLM for contextual answers.
- Users must supply their own LLM API key (stored encrypted in the DB), supporting privacy and cost control.

---

## Contribution
Pull requests are welcome. For major changes, please open an issue first to discuss your ideas/review design.

---

## License
MIT (include your chosen license here)
