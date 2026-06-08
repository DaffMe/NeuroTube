"""
Async PostgreSQL database session management using SQLAlchemy.
"""

from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Engine merupakan "mesin utama" yang terhubung langsung dan menggerakkan jalur pipa komunikasi TCP ke server PostgreSQL
engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)

# Membuat "pabrik pembuat sesi" (Session Maker) untuk membukakan koneksi khusus bagi setiap request tanpa membuat tabrakan data
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False, # Membiarkan objek tetap bisa dibaca (tidak expired) setelah data di-commit
)


from sqlalchemy import text

async def init_db():
    """Create all tables defined by SQLModel metadata and perform automatic migrations."""
    # Membuka koneksi awal untuk membuat cetak biru tabel-tabel ke dalam PostgreSQL (Migration)
    async with engine.begin() as conn:
        # Menjalankan sinkronisasi model class di file models.py menjadi tabel SQL betulan di database
        await conn.run_sync(SQLModel.metadata.create_all)
        
        # Check and add new JSON columns if they don't exist
        # Fitur migrasi paksa: Berjaga-jaga jika database yang dipakai adalah versi lama yang belum punya kolom 'topics_positive' JSON
        try:
            result_pos = await conn.execute(
                text("SELECT column_name FROM information_schema.columns "
                     "WHERE table_name = 'sentiment_summaries' AND column_name = 'topics_positive'")
            )
            if not result_pos.fetchone():
                # Jika tidak ada kolomnya, buat kolom tersebut secara manual via kueri mentah
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
    # Fungsi Dependency Injection: FastAPI akan memanggil fungsi ini tiap kali ada HTTP Request masuk
    # yang butuh database, lalu otomatis membuang/menutup koneksinya jika proses sudah selesai agar tidak bocor
    async with AsyncSessionLocal() as session:
        yield session
