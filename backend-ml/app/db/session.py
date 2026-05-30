"""
Async PostgreSQL database session management using SQLAlchemy.
"""

from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


from sqlalchemy import text

async def init_db():
    """Create all tables defined by SQLModel metadata and perform automatic migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        
        # Check and add new JSON columns if they don't exist
        try:
            result_pos = await conn.execute(
                text("SELECT column_name FROM information_schema.columns "
                     "WHERE table_name = 'sentiment_summaries' AND column_name = 'topics_positive'")
            )
            if not result_pos.fetchone():
                await conn.execute(text("ALTER TABLE sentiment_summaries ADD COLUMN topics_positive JSON DEFAULT NULL"))
                
            result_neg = await conn.execute(
                text("SELECT column_name FROM information_schema.columns "
                     "WHERE table_name = 'sentiment_summaries' AND column_name = 'topics_negative'")
            )
            if not result_neg.fetchone():
                await conn.execute(text("ALTER TABLE sentiment_summaries ADD COLUMN topics_negative JSON DEFAULT NULL"))
        except Exception as e:
            import logging
            logging.getLogger("uvicorn").warning(f"⚠️ DB Migration warning: {e}")


async def get_db():
    """FastAPI dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        yield session


# ── Redis client ──────────────────────────────────────────────────────────────

_redis_client: "redis.asyncio.Redis | None" = None


async def get_redis() -> "redis.asyncio.Redis":
    """
    Returns a shared Redis client instance.
    Uses a lazy singleton: the client is created on first call and reused
    for all subsequent calls. Call .aclose() only at application shutdown,
    never after individual operations.
    """
    global _redis_client
    if _redis_client is None:
        import redis.asyncio as redis_asyncio
        from app.core.config import settings

        _redis_client = redis_asyncio.from_url(settings.REDIS_URL)
    return _redis_client
