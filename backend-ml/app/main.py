import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import init_db
from app.api.routes.analysis import router as analysis_router
from app.workers.worker import worker_loop

# ── Logging ───────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ── Lifespan ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle management."""
    await init_db()
    logger.info(" Database initialized")

    worker_task = asyncio.create_task(worker_loop())
    logger.info(" Redis worker started")

    yield

    logger.info(" Shutting down...")
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass

# ── App ───────────────────────────────────────────────────────────
app = FastAPI(
    title="NeuroTube ML Engine",
    description="Sentiment analysis engine for YouTube comments",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"], # Mengizinkan semua header
)

# Routes
app.include_router(analysis_router, prefix="/api")

@app.get("/")
async def root():
    return {"service": "NeuroTube-ml", "status": "running"}
