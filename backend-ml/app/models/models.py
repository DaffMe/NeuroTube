"""
SQLModel database models for NeuroTube.

These models define the PostgreSQL schema and match the frontend's
TypeScript interfaces (VideoInfo, Comment, SentimentResult, AnalyzedVideo).
"""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class AnalysisJob(SQLModel, table=True):
    """Tracks the lifecycle of an analysis job (Go → Redis → Python)."""

    __tablename__ = "analysis_jobs"

    id: str = Field(primary_key=True)  # UUID from Go fetcher
    video_id: str = Field(index=True)
    status: str = Field(default="processing")  # processing | analyzing | completed | failed
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class VideoData(SQLModel, table=True):
    """Stores YouTube video metadata — maps to frontend VideoInfo."""

    __tablename__ = "video_data"

    id: str = Field(primary_key=True)  # YouTube video ID
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

    __tablename__ = "comment_data"

    id: str = Field(primary_key=True)  # YouTube comment ID
    video_id: str = Field(index=True, foreign_key="video_data.id")
    author_display_name: str
    author_profile_image_url: str
    text_display: str
    text_original: str = ""
    like_count: int = 0
    published_at: str
    is_reply: bool = False
    parent_id: Optional[str] = None
    sentiment: str = "neutral"  # positive | negative | neutral
    sentiment_score: float = 0.0


class SentimentSummary(SQLModel, table=True):
    """Aggregated sentiment results per video — maps to frontend SentimentResult."""

    __tablename__ = "sentiment_summaries"

    video_id: str = Field(primary_key=True, foreign_key="video_data.id")
    positive: int = 0
    negative: int = 0
    neutral: int = 0
    total_comments: int = 0
    average_score: float = 0.0
    updated_at: datetime = Field(default_factory=datetime.utcnow)
