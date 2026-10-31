from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
class AuthRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
class TokenResponse(BaseModel): access_token: str; token_type: str = "bearer"
class UserResponse(BaseModel): id: int; email: EmailStr
class ChatRequest(BaseModel): question: str = Field(min_length=1, max_length=4000); top_k: int = Field(default=5, ge=1, le=10)
class Source(BaseModel): document_id: str; filename: str; chunk_index: int; text: str; score: float | None = None
class ChatResponse(BaseModel): answer: str; sources: list[Source]
class DocumentResponse(BaseModel): id: str; filename: str; content_type: str; chunk_count: int; created_at: datetime
