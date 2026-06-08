"""
SQLModel database models for NeuroTube.

These models define the PostgreSQL schema and match the frontend's
TypeScript interfaces (VideoInfo, Comment, SentimentResult, AnalyzedVideo).
"""

from datetime import datetime # Pustaka untuk mengambil dan merekam waktu saat ini (jam, menit, tanggal)
from typing import Optional, List # Pustaka pelindung tipe (Type Hinting) agar kode lebih stabil
from sqlmodel import SQLModel, Field # Pustaka untuk mendefinisikan kolom dan tipe tabel database seperti cetak biru (blueprint)
from sqlalchemy import Column, JSON # Pustaka murni SQL untuk tipe data khusus tingkat lanjut (seperti objek JSON dalam tabel)

# Masing-masing Class di bawah ini akan diubah (di-compile) oleh framework SQLModel menjadi struktur tabel di database PostgreSQL

class AnalysisJob(SQLModel, table=True):
    """Tracks the lifecycle of an analysis job (Go → Redis → Python)."""
    # Tabel ini mencatat status pemrosesan pekerjaan (processing, completed, failed)

    __tablename__ = "analysis_jobs"

    id: str = Field(primary_key=True)  # UUID from Go fetcher (Berfungsi sebagai Primary Key/Kolom Utama)
    video_id: str = Field(index=True)  # Diberi indeks agar pencarian video_id jauh lebih cepat di database
    status: str = Field(default="processing")  # processing | analyzing | completed | failed
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow) # Waktu otomatis catat saat baris ini dibuat
    completed_at: Optional[datetime] = None


class VideoData(SQLModel, table=True):
    """Stores YouTube video metadata — maps to frontend VideoInfo."""
    # Tabel ini menyimpan rekam jejak informasi dasar sebuah video (Thumbnail, Judul, dll)

    __tablename__ = "video_data"

    id: str = Field(primary_key=True)  # YouTube video ID (Contoh: "dQw4w9WgXcQ")
    title: str
    channel_title: str
    thumbnail: str
    published_at: str
    view_count: str
    like_count: str
    comment_count: str
    description: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CommentData(SQLModel, table=True):
    """Stores individual YouTube comments with sentiment analysis results."""
    # Tabel super besar yang menampung ratusan ribu komentar dari berbagai video beserta label sentimen (positive/negative)

    __tablename__ = "comment_data"

    id: str = Field(primary_key=True)  # YouTube comment ID
    # Relasi/Kaitan ke tabel VideoData. Jika data video dihapus, komentar ini biasanya ikut hilang atau terputus
    video_id: str = Field(index=True, foreign_key="video_data.id") 
    author_display_name: str
    author_profile_image_url: str
    text_display: str
    text_original: str = ""
    like_count: int = 0
    published_at: str
    is_reply: bool = False # Flag penanda apakah ini anak balasan komentar atau bukan
    parent_id: Optional[str] = None
    sentiment: str = "neutral"  # positive | negative | neutral
    sentiment_score: float = 0.0


class SentimentSummary(SQLModel, table=True):
    """Aggregated sentiment results per video — maps to frontend SentimentResult."""
    # Tabel ini menyimpan rekapitulasi nilai analisis agar tidak perlu menghitung ulang ribuan komentar setiap di-refresh

    __tablename__ = "sentiment_summaries"

    video_id: str = Field(primary_key=True, foreign_key="video_data.id")
    positive: int = 0
    negative: int = 0
    neutral: int = 0
    total_comments: int = 0
    average_score: float = 0.0
    # Field khusus untuk menyimpan ringkasan topik dari Gemini berformat teks JSON utuh
    topics_positive: Optional[list] = Field(default=None, sa_column=Column(JSON))
    topics_negative: Optional[list] = Field(default=None, sa_column=Column(JSON))
    updated_at: datetime = Field(default_factory=datetime.utcnow)
