"""
NeuroTube ML Backend — FastAPI Application

This service:
1. Consumes jobs from Redis (published by the Go fetcher)
2. Runs VADER sentiment analysis on YouTube comments
3. Stores results in PostgreSQL
4. Serves analysis data to the frontend via REST API
"""

import asyncio # Menjalankan banyak pekerjaan sekaligus secara asinkron (tidak memblokir kode lain)
import logging # Mencatat pesan status (info/error) server ke terminal hitam
from contextlib import asynccontextmanager # Mengatur proses yang harus dijalankan saat server baru nyala dan mau mati

from fastapi import FastAPI # Kerangka kerja eksternal untuk membuat server web (API) yang sangat cepat
from fastapi.middleware.cors import CORSMiddleware # Satpam lalu lintas web agar React bisa menembak API ini lintas port

from app.core.config import settings # Memanggil variabel sandi/setting internal dari file config
from app.db.session import init_db # Memanggil modul internal database untuk menyambung ke tabel PostgreSQL
from app.api.routes.analysis import router as analysis_router # Memanggil rute/alamat URL spesifik dari internal proyek
from app.workers.worker import worker_loop # Memanggil otak pekerja internal yang menyedot antrean Redis

# ── Logging ───────────────────────────────────────────────────────
# Mengonfigurasi format pencatatan log agar rapi dan mudah dibaca (mencakup waktu, level, nama, dan pesan)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────
# Fungsi ini mengatur siklus hidup (lifecycle) aplikasi: apa yang terjadi saat server baru menyala dan saat akan mati
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle management."""
    # Startup (Saat server menyala)
    logger.info("🚀 Starting NeuroTube ML Backend...")

    # Initialize database tables
    # Membuat tabel-tabel di database PostgreSQL jika belum ada
    await init_db()
    logger.info("✅ Database initialized")

    # Start Redis worker in background
    # Menjalankan proses pekerja (Worker) secara asinkron di latar belakang untuk membaca antrean dari Redis
    worker_task = asyncio.create_task(worker_loop())
    logger.info("✅ Redis worker started")

    yield # Memberikan kendali ke aplikasi utama FastAPI selama server berjalan

    # Shutdown (Saat server dimatikan)
    logger.info("🛑 Shutting down...")
    worker_task.cancel() # Membatalkan tugas pekerja Redis
    try:
        await worker_task # Menunggu hingga pekerja benar-benar berhenti
    except asyncio.CancelledError:
        pass


# ── App ───────────────────────────────────────────────────────────
# Membuat instance utama aplikasi web FastAPI beserta metadata judul dan deskripsinya
app = FastAPI(
    title="NeuroTube ML Engine",
    description="Sentiment analysis engine for YouTube comments",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
# Konfigurasi keamanan Cross-Origin Resource Sharing agar frontend bisa menembak API ini tanpa diblokir browser
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Mengizinkan semua metode HTTP (GET, POST, dll)
    allow_headers=["*"], # Mengizinkan semua header
)

# Routes
# Memasukkan rute/endpoint analisis dari file lain ke dalam prefix /api
app.include_router(analysis_router, prefix="/api")

# Endpoint bawaan sederhana (Root) untuk mengecek apakah server Python hidup
@app.get("/")
async def root():
    return {"service": "NeuroTube-ml", "status": "running"}
