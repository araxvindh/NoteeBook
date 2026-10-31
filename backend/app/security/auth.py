from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from pwdlib import PasswordHash
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.db.postgres import get_db
from app.models.entities import User
password_hash = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)
def hash_password(p): return password_hash.hash(p)
def verify_password(p, h): return password_hash.verify(p, h)
def create_access_token(uid):
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode({"sub": str(uid), "exp": exp}, settings.jwt_secret_key, algorithm="HS256")
async def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: AsyncSession = Depends(get_db)):
    err = HTTPException(status_code=401, detail="Invalid or missing bearer token", headers={"WWW-Authenticate": "Bearer"})
    if credentials is None: raise err
    try: uid = int(jwt.decode(credentials.credentials, settings.jwt_secret_key, algorithms=["HS256"]).get("sub", ""))
    except (JWTError, ValueError, TypeError): raise err
    user = await db.scalar(select(User).where(User.id == uid))
    if user is None: raise err
    return user
