from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
engine = create_async_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
class Base(DeclarativeBase): pass
async def get_db():
    async with SessionLocal() as session: yield session
async def init_db():
    from app.models.entities import User, Document, ChatMessage
    async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all)
