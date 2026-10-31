import json, uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.db.postgres import get_db
from app.models.entities import User, Document, ChatMessage
from app.schemas import AuthRequest, TokenResponse, UserResponse, ChatRequest, ChatResponse, Source, DocumentResponse
from app.security.auth import hash_password, verify_password, create_access_token, current_user
from app.services.document_service import extract_text, chunk_text, SUPPORTED_EXTENSIONS
from app.services.vector_service import upsert_chunks, search_chunks, delete_document_vectors
from app.services.llm_service import generate_answer
router = APIRouter()
@router.post("/auth/register", response_model=UserResponse, status_code=201)
async def register(payload: AuthRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower()
    if await db.scalar(select(User).where(User.email == email)): raise HTTPException(409, "Email is already registered")
    user = User(email=email, password_hash=hash_password(payload.password)); db.add(user); await db.commit(); await db.refresh(user)
    return UserResponse(id=user.id, email=user.email)
@router.post("/auth/login", response_model=TokenResponse)
async def login(payload: AuthRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash): raise HTTPException(401, "Invalid email or password")
    return TokenResponse(access_token=create_access_token(user.id))
@router.get("/auth/me", response_model=UserResponse)
async def me(user: User = Depends(current_user)): return UserResponse(id=user.id, email=user.email)
@router.post("/documents", response_model=DocumentResponse, status_code=201)
async def upload_document(file: UploadFile = File(...), user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    filename = Path(file.filename or "upload").name; ext = Path(filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS: raise HTTPException(415, "Supported formats: PDF, DOCX, TXT, MD")
    data = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if len(data) > settings.max_upload_mb * 1024 * 1024: raise HTTPException(413, f"File exceeds {settings.max_upload_mb} MB limit")
    try: text = extract_text(filename, data); chunks = chunk_text(text)
    except ValueError as e: raise HTTPException(422, str(e))
    doc = Document(id=str(uuid.uuid4()), user_id=user.id, filename=filename, content_type=file.content_type or "application/octet-stream", chunk_count=len(chunks))
    db.add(doc); await db.commit()
    try: upsert_chunks(user.id, doc.id, filename, chunks)
    except Exception as e:
        await db.delete(doc); await db.commit()
        raise HTTPException(503, "Could not index document. Check the embedding model and Qdrant.") from e
    await db.refresh(doc)
    return DocumentResponse(id=doc.id, filename=doc.filename, content_type=doc.content_type, chunk_count=doc.chunk_count, created_at=doc.created_at)
@router.get("/documents", response_model=list[DocumentResponse])
async def list_documents(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(select(Document).where(Document.user_id == user.id).order_by(Document.created_at.desc()))
    return [DocumentResponse(id=d.id, filename=d.filename, content_type=d.content_type, chunk_count=d.chunk_count, created_at=d.created_at) for d in rows.all()]
@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(document_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    doc = await db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if doc is None: raise HTTPException(404, "Document not found")
    try: delete_document_vectors(user.id, document_id)
    except Exception as e: raise HTTPException(503, "Could not delete document vectors") from e
    await db.delete(doc); await db.commit()
@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    question = payload.question.strip()
    if not question: raise HTTPException(422, "Question cannot be blank")
    try:
        sources = search_chunks(user.id, question, payload.top_k)
        answer = generate_answer(question, sources) if sources else "I couldn't find relevant information in your uploaded notes. Upload notes or try a more specific question."
    except RuntimeError as e: raise HTTPException(503, str(e))
    except Exception as e: raise HTTPException(503, "RAG service is temporarily unavailable") from e
    db.add(ChatMessage(user_id=user.id, question=question, answer=answer, sources_json=json.dumps(sources, ensure_ascii=False))); await db.commit()
    return ChatResponse(answer=answer, sources=[Source(**s) for s in sources])
@router.get("/chat/history")
async def chat_history(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(select(ChatMessage).where(ChatMessage.user_id == user.id).order_by(ChatMessage.created_at.desc()).limit(100))
    return [{"id": m.id, "question": m.question, "answer": m.answer, "sources": json.loads(m.sources_json), "created_at": m.created_at} for m in rows.all()]
