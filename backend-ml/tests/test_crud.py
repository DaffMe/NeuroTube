"""
Tests for crud.py — Phase 1 critical tests covering the bugs that were fixed.

Covers:
1. get_analysis_history — outerjoin filter in join condition (NOT WHERE clause)
2. save_video — camelCase→snake_case mapping for both update AND create paths
"""
import pytest
import pytest_asyncio

from app.crud import crud
from app.models.models import AnalysisJob, VideoData, CommentData, SentimentSummary


async def _seed_video(session, video_id: str, **fields):
    defaults = dict(
        title="Test Video",
        channel_title="Test Channel",
        thumbnail="",
        published_at="",
        view_count="0",
        like_count="0",
        comment_count="0",
        description="",
    )
    defaults.update(fields)
    video = VideoData(id=video_id, **defaults)
    session.add(video)
    await session.commit()
    await session.refresh(video)
    return video


async def _seed_job(session, job_id: str, video_id: str, status: str):
    job = AnalysisJob(id=job_id, video_id=video_id, status=status)
    session.add(job)
    await session.commit()
    await session.refresh(job)
    return job


async def _seed_summary(session, video_id: str, positive=10, negative=5, neutral=3):
    summary = SentimentSummary(
        video_id=video_id,
        positive=positive,
        negative=negative,
        neutral=neutral,
        total_comments=positive + negative + neutral,
        average_score=0.25,
    )
    session.add(summary)
    await session.commit()
    await session.refresh(summary)
    return summary


# ── get_analysis_history ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_history_returns_videos_with_completed_jobs(db_session):
    """
    Regression: outerjoin filter must be in join condition (not WHERE).

    The old code had:
        outerjoin(AnalysisJob, VideoData.id == AnalysisJob.video_id)
        .where(AnalysisJob.status == "completed")

    This collapsed the outerjoin into an inner join, silently dropping videos
    that had no completed job.
    """
    await _seed_video(db_session, "vid_complete")
    await _seed_job(db_session, "job-1", "vid_complete", "completed")
    await _seed_summary(db_session, "vid_complete")

    history = await crud.get_analysis_history(db_session)
    assert len(history) == 1
    assert history[0]["videoId"] == "vid_complete"


@pytest.mark.asyncio
async def test_history_returns_videos_with_no_jobs_at_all(db_session):
    """
    Regression: videos with no AnalysisJob rows must still appear in history
    if they have a SentimentSummary (e.g., data populated by reanalyze_video.py).

    With the WHERE-on-outerjoin bug, these were silently dropped.
    """
    await _seed_video(db_session, "vid_no_job")
    await _seed_summary(db_session, "vid_no_job", positive=5, negative=2, neutral=1)

    history = await crud.get_analysis_history(db_session)
    assert len(history) == 1
    assert history[0]["videoId"] == "vid_no_job"
    assert history[0]["id"] == ""


@pytest.mark.asyncio
async def test_history_excludes_videos_with_failed_jobs_only(db_session):
    """
    Videos with only failed or processing jobs should be excluded.
    This is intentional behavior, not a regression.
    """
    await _seed_video(db_session, "vid_failed")
    await _seed_job(db_session, "job-fail", "vid_failed", "failed")

    history = await crud.get_analysis_history(db_session)
    ids = [h["videoId"] for h in history]
    assert "vid_failed" not in ids


@pytest.mark.asyncio
async def test_history_returns_multiple_videos(db_session):
    """Happy path: multiple completed videos appear in history."""
    await _seed_video(db_session, "v1")
    await _seed_job(db_session, "j1", "v1", "completed")
    await _seed_summary(db_session, "v1")

    await _seed_video(db_session, "v2")
    await _seed_job(db_session, "j2", "v2", "completed")
    await _seed_summary(db_session, "v2", positive=1, negative=1, neutral=1)

    history = await crud.get_analysis_history(db_session)
    assert len(history) == 2


@pytest.mark.asyncio
async def test_history_pagination(db_session):
    """limit and offset work correctly."""
    for i in range(5):
        await _seed_video(db_session, f"v{i}")
        await _seed_job(db_session, f"j{i}", f"v{i}", "completed")
        await _seed_summary(db_session, f"v{i}", positive=1, negative=0, neutral=0)

    page1 = await crud.get_analysis_history(db_session, limit=2, offset=0)
    assert len(page1) == 2

    page2 = await crud.get_analysis_history(db_session, limit=2, offset=2)
    assert len(page2) == 2


# ── save_video ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_save_video_create_path(db_session):
    """
    Regression: the create path must map camelCase→snake_case.
    The fixed code uses _VIDEO_FIELD_MAP explicitly.
    """
    video_info = {
        "id": "new_video",
        "title": "My New Video",
        "channelTitle": "My Channel",
        "thumbnail": "https://example.com/thumb.jpg",
        "publishedAt": "2025-01-01T00:00:00Z",
        "viewCount": "12345",
        "likeCount": "678",
        "commentCount": "90",
        "description": "A description",
    }
    video = await crud.save_video(db_session, video_info)

    assert video.id == "new_video"
    assert video.title == "My New Video"
    assert video.channel_title == "My Channel"
    assert video.thumbnail == "https://example.com/thumb.jpg"
    assert video.published_at == "2025-01-01T00:00:00Z"
    assert video.view_count == "12345"
    assert video.like_count == "678"
    assert video.comment_count == "90"
    assert video.description == "A description"


@pytest.mark.asyncio
async def test_save_video_update_path(db_session):
    """
    Regression: the update path maps camelCase fields to snake_case.
    The fixed code uses _VIDEO_FIELD_MAP explicitly.
    """
    initial_info = {
        "id": "update_video",
        "title": "Original Title",
        "channelTitle": "Original Channel",
        "thumbnail": "old_thumb.jpg",
        "publishedAt": "2020-01-01T00:00:00Z",
        "viewCount": "100",
        "likeCount": "10",
        "commentCount": "5",
        "description": "Old desc",
    }
    await crud.save_video(db_session, initial_info)

    update_info = {
        "id": "update_video",
        "title": "Updated Title",
        "channelTitle": "Updated Channel",
        "thumbnail": "new_thumb.jpg",
        "publishedAt": "2025-06-01T00:00:00Z",
        "viewCount": "99999",
        "likeCount": "999",
        "commentCount": "500",
        "description": "New desc",
    }
    video = await crud.save_video(db_session, update_info)

    assert video.title == "Updated Title"
    assert video.channel_title == "Updated Channel"
    assert video.thumbnail == "new_thumb.jpg"
    assert video.view_count == "99999"
    assert video.like_count == "999"
    assert video.comment_count == "500"
    assert video.description == "New desc"


@pytest.mark.asyncio
async def test_save_video_update_preserves_unset_fields(db_session):
    """
    Regression: updating with missing fields should preserve existing DB values.

    _apply_video_fields uses getattr/setattr, keeping the current value
    when the incoming dict doesn't have the key.
    """
    initial = {
        "id": "partial_update",
        "title": "Title",
        "channelTitle": "Channel",
        "thumbnail": "thumb.jpg",
        "publishedAt": "2020-01-01T00:00:00Z",
        "viewCount": "100",
        "likeCount": "10",
        "commentCount": "5",
        "description": "Desc",
    }
    await crud.save_video(db_session, initial)

    # Omit view_count and description to test preservation
    partial = {
        "id": "partial_update",
        "title": "New Title",
        "channelTitle": "New Channel",
        "thumbnail": "new_thumb.jpg",
        "publishedAt": "2025-01-01T00:00:00Z",
        "likeCount": "999",
        "commentCount": "500",
        # view_count and description omitted — must be preserved
    }
    video = await crud.save_video(db_session, partial)

    assert video.title == "New Title"
    assert video.channel_title == "New Channel"
    assert video.view_count == "100"   # preserved
    assert video.description == "Desc"  # preserved
