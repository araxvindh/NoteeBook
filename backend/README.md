# Personal RAG Assistant — FastAPI Backend

Implemented starter backend: JWT auth, Argon2 password hashing, PDF/DOCX/TXT/MD upload, chunking, BGE-small embeddings, Qdrant search, Gemini answer generation, PostgreSQL metadata/chat history, and per-user vector filters.

## Prerequisites
- Python 3.11+
- PostgreSQL and Qdrant running locally
- Gemini API key

## Run on Windows PowerShell
```powershell
Copy-Item .env.example .env
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Set `GEMINI_API_KEY` and replace `JWT_SECRET_KEY` in `.env`. API docs: http://localhost:8000/docs. The first embedding model use downloads BGE-small, which may take a while.

## Start PostgreSQL and Qdrant with Docker
Create a `docker-compose.yml` with PostgreSQL 16 and Qdrant services, or run them separately. Example Compose services:
```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ragdb
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  qdrant:
    image: qdrant/qdrant:latest
    ports: ["6333:6333"]
    volumes: [qdrantdata:/qdrant/storage]
volumes:
  pgdata:
  qdrantdata:
```
Do not expose database ports publicly in production.

## API workflow
1. `POST /api/auth/register` JSON: `{"email":"you@example.com","password":"at-least-8-chars"}`
2. `POST /api/auth/login` with the same credentials; copy `access_token`.
3. Use Swagger's Authorize control with the bearer token.
4. `POST /api/documents` multipart field `file`.
5. `POST /api/chat` JSON: `{"question":"Summarize my notes","top_k":5}`.
6. List/delete documents with `/api/documents`; history is `/api/chat/history`.

## Tests
```bash
pytest
```
The included unit tests don't require databases. For production, add Alembic migrations, background workers, OCR, malware scanning, rate limiting, S3 storage, observability, backups, and Ragas/Promptfoo evaluation. The current upload/index flow is synchronous and is intended as a starter, not a hardened production service.
