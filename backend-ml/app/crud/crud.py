"""
CRUD operations for NeuroTube database models.

All database writes go through this layer to maintain data integrity.
Response serialization uses camelCase to match frontend TypeScript interfaces.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import AnalysisJob, VideoData, CommentData, SentimentSummary


# ── Analysis Jobs ─────────────────────────────────────────────────


async def create_job(db: AsyncSession, job_id: str, video_id: str) -> AnalysisJob:
    """
    FUNCTION: Create a New Job Record
    Every time a user submits a YouTube link, the system creates a new 'Job'
    with an initial status of 'processing' before it starts fetching comments.
    """
    # 1. Create a new object/row to be inserted into the AnalysisJob table
    job = AnalysisJob(id=job_id, video_id=video_id, status="processing")
    
    # 2. Add the row to the database session queue
    db.add(job)
    
    # 3. Permanently save (commit) to the database
    await db.commit()
    
    # 4. Refresh the data to get the creation time (created_at) from the database
    await db.refresh(job)
    return job


async def get_job(db: AsyncSession, job_id: str) -> Optional[AnalysisJob]:
    """
    FUNCTION: Check Job Status
    The frontend constantly polls this function: "Is the video analysis complete yet?"
    """
    # Search for 1 row in the AnalysisJob table where the ID matches the requested job_id
    result = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
    return result.scalars().first()


async def get_job_by_video(db: AsyncSession, video_id: str) -> Optional[AnalysisJob]:
    """Get the latest analysis job for a video."""
    result = await db.execute(
        select(AnalysisJob)
        .where(AnalysisJob.video_id == video_id)
        .order_by(AnalysisJob.created_at.desc())
    )
    return result.scalars().first()


async def update_job_status(
    db: AsyncSession, job_id: str, status: str, error: Optional[str] = None
) -> Optional[AnalysisJob]:
    """Update the status of an analysis job."""
    job = await get_job(db, job_id)
    if not job:
        return None

    job.status = status
    if error:
        job.error_message = error
    if status in ("completed", "failed"):
        job.completed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(job)
    return job


# ── Video Data ────────────────────────────────────────────────────


async def save_video(db: AsyncSession, video_info: dict) -> VideoData:
    """
    FUNCTION: Save Video Profile (Title, Thumbnail, etc.)
    If the video has been analyzed before, we update the data (e.g., new view count).
    If not, we create a new entry in the database.
    """
    # Check if this video exists in our database
    existing = await db.execute(
        select(VideoData).where(VideoData.id == video_info["id"])
    )
    video = existing.scalars().first()

    if video:
        # Explicit snake_case mapping for the update branch.
        # Go's VideoInfo sends camelCase keys, but VideoData uses snake_case.
        video.title = video_info.get("title", video.title)
        video.channel_title = video_info.get("channelTitle", video.channel_title)
        video.thumbnail = video_info.get("thumbnail", video.thumbnail)
        video.published_at = video_info.get("publishedAt", video.published_at)
        video.view_count = video_info.get("viewCount", video.view_count)
        video.like_count = video_info.get("likeCount", video.like_count)
        video.comment_count = video_info.get("commentCount", video.comment_count)
        video.description = video_info.get("description", video.description)
    else:
        # If video DOES NOT EXIST: Create a new row in the VideoData table
        # We map data from camelCase (e.g., channelTitle) to snake_case (e.g., channel_title)
        # to match the database schema.
        video = VideoData(
            id=video_info["id"],
            title=video_info["title"],
            channel_title=video_info.get("channelTitle", ""),
            thumbnail=video_info.get("thumbnail", ""),
            published_at=video_info.get("publishedAt", ""),
            view_count=video_info.get("viewCount", "0"),
            like_count=video_info.get("likeCount", "0"),
            comment_count=video_info.get("commentCount", "0"),
            description=video_info.get("description", ""),
        )
        db.add(video)

    # Persist the changes to the database
    await db.commit()
    await db.refresh(video)
    return video


async def get_video(db: AsyncSession, video_id: str) -> Optional[VideoData]:
    """Get video data by YouTube video ID."""
    result = await db.execute(select(VideoData).where(VideoData.id == video_id))
    return result.scalars().first()


# ── Comments ──────────────────────────────────────────────────────


async def save_comments_batch(
    db: AsyncSession, video_id: str, comments: list[dict]
) -> int:
    """
    Save a batch of comments with their sentiment analysis results.
    Skips duplicates. Returns the number of new comments saved.
    """
    comment_ids = [c.get("id", "") for c in comments if c.get("id", "")]
    if not comment_ids:
        return 0

    existing_ids = set()
    # Chunk the query by 1000 to prevent hitting database parameters limits
    for i in range(0, len(comment_ids), 1000):
        chunk = comment_ids[i:i+1000]
        result = await db.execute(
            select(CommentData.id).where(CommentData.id.in_(chunk))
        )
        existing_ids.update(result.scalars().all())

    saved = 0
    for comment in comments:
        comment_id = comment.get("id", "")
        if not comment_id or comment_id in existing_ids:
            continue

        db_comment = CommentData(
            id=comment_id,
            video_id=video_id,
            author_display_name=comment.get("authorDisplayName", "Anonymous"),
            author_profile_image_url=comment.get("authorProfileImageUrl", ""),
            text_display=comment.get("textDisplay", ""),
            text_original=comment.get("text_original", ""),
            like_count=comment.get("likeCount", 0),
            published_at=comment.get("publishedAt", ""),
            is_reply=comment.get("is_reply", False),
            parent_id=comment.get("parent_id"),
            sentiment=comment.get("sentiment", "neutral"),
            sentiment_score=comment.get("sentimentScore", 0.0),
        )
        db.add(db_comment)
        saved += 1

    await db.commit()
    return saved


async def get_comments_by_video(
    db: AsyncSession,
    video_id: str,
    sentiment_filter: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> list[CommentData]:
    """Get comments for a video with optional sentiment filter."""
    query = select(CommentData).where(CommentData.video_id == video_id)

    if sentiment_filter and sentiment_filter in ("positive", "negative", "neutral"):
        query = query.where(CommentData.sentiment == sentiment_filter)

    query = query.order_by(CommentData.like_count.desc(), CommentData.published_at.asc()).offset(offset).limit(limit)

    result = await db.execute(query)
    return list(result.scalars().all())


async def count_comments_by_video(
    db: AsyncSession, video_id: str, sentiment_filter: Optional[str] = None
) -> int:
    """Count comments for a video with optional sentiment filter."""
    query = select(func.count()).select_from(CommentData).where(
        CommentData.video_id == video_id
    )
    if sentiment_filter and sentiment_filter in ("positive", "negative", "neutral"):
        query = query.where(CommentData.sentiment == sentiment_filter)

    result = await db.scalar(query)
    return result or 0


# ── Sentiment Summary ─────────────────────────────────────────────


async def save_sentiment_summary(
    db: AsyncSession,
    video_id: str,
    positive: int,
    negative: int,
    neutral: int,
    total_comments: int,
    average_score: float,
    topics_positive: Optional[list] = None,
    topics_negative: Optional[list] = None,
) -> SentimentSummary:
    """Save or update the aggregated sentiment summary for a video."""
    existing = await db.execute(
        select(SentimentSummary).where(SentimentSummary.video_id == video_id)
    )
    summary = existing.scalars().first()

    if summary:
        summary.positive = positive
        summary.negative = negative
        summary.neutral = neutral
        summary.total_comments = total_comments
        summary.average_score = average_score
        summary.topics_positive = topics_positive
        summary.topics_negative = topics_negative
        summary.updated_at = datetime.utcnow()
    else:
        summary = SentimentSummary(
            video_id=video_id,
            positive=positive,
            negative=negative,
            neutral=neutral,
            total_comments=total_comments,
            average_score=average_score,
            topics_positive=topics_positive,
            topics_negative=topics_negative,
        )
        db.add(summary)

    await db.commit()
    await db.refresh(summary)
    return summary


async def get_sentiment_summary(
    db: AsyncSession, video_id: str
) -> Optional[SentimentSummary]:
    """Get the sentiment summary for a video."""
    result = await db.execute(
        select(SentimentSummary).where(SentimentSummary.video_id == video_id)
    )
    return result.scalars().first()


# ── History ───────────────────────────────────────────────────────


async def get_analysis_history(
    db: AsyncSession, limit: int = 20, offset: int = 0
) -> list[dict]:
    """
    Get analysis history: videos with their sentiment summaries.
    Returns data shaped for the frontend AnalyzedVideo interface.
    """
    query = (
        select(VideoData, SentimentSummary, AnalysisJob)
        .outerjoin(SentimentSummary, VideoData.id == SentimentSummary.video_id)
        .outerjoin(AnalysisJob, VideoData.id == AnalysisJob.video_id)
        .where(
            # Only show videos that have at least one completed job.
            # Videos with no job row or only non-completed jobs are excluded.
            AnalysisJob.status == "completed"
        )
        .order_by(AnalysisJob.completed_at.desc())
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.unique().all()

    history = []
    for video, summary, job in rows:
        history.append(
            {
                "id": job.id if job else "",
                "videoId": video.id,
                "title": video.title,
                "thumbnail": video.thumbnail,
                "channelTitle": video.channel_title,
                "analyzedAt": (
                    job.completed_at.isoformat() if job and job.completed_at else ""
                ),
                "sentimentResult": {
                    "positive": summary.positive if summary else 0,
                    "negative": summary.negative if summary else 0,
                    "neutral": summary.neutral if summary else 0,
                    "totalComments": summary.total_comments if summary else 0,
                    "averageScore": summary.average_score if summary else 0.0,
                    "topicsPositive": summary.topics_positive if summary else None,
                    "topicsNegative": summary.topics_negative if summary else None,
                },
            }
        )

    return history


async def clear_all_data(db: AsyncSession):
    """
    Clear all data from the database (Jobs, Summaries, Comments, Videos).
    """
    from sqlalchemy import delete
    await db.execute(delete(AnalysisJob))
    await db.execute(delete(SentimentSummary))
    await db.execute(delete(CommentData))
    await db.execute(delete(VideoData))
    await db.commit()


async def delete_video_data(db: AsyncSession, video_id: str):
    """
    Delete all data related to a specific video (Jobs, Summary, Comments, Video).
    """
    from sqlalchemy import delete
    await db.execute(delete(CommentData).where(CommentData.video_id == video_id))
    await db.execute(delete(SentimentSummary).where(SentimentSummary.video_id == video_id))
    await db.execute(delete(AnalysisJob).where(AnalysisJob.video_id == video_id))
    await db.execute(delete(VideoData).where(VideoData.id == video_id))
    await db.commit()
