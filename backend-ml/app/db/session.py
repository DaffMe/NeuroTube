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


async def init_db():
    """Create all tables defined by SQLModel metadata and perform automatic migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        
        # Check and add new JSON columns if they don't exist
        try:
            result_pos = await conn.execute(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'sentiment_summaries' AND column_name = 'topics_positive'"
            )
            if not result_pos.fetchone():
                await conn.execute("ALTER TABLE sentiment_summaries ADD COLUMN topics_positive JSON DEFAULT NULL")
                
            result_neg = await conn.execute(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'sentiment_summaries' AND column_name = 'topics_negative'"
            )
            if not result_neg.fetchone():
                await conn.execute("ALTER TABLE sentiment_summaries ADD COLUMN topics_negative JSON DEFAULT NULL")
        except Exception as e:
            import logging
            logging.getLogger("uvicorn").warning(f"⚠️ DB Migration warning: {e}")


async def get_db():
    """FastAPI dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        yield session
