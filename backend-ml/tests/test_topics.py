"""
Tests for topics.py — Phase 1 critical tests.

Covers:
1. extract_topics_local — empty input, 500+ comment limit, all-stopwords fallback
2. extract_topics_gemini — missing API key
3. extract_topics — fallback chain: Gemini → Local
"""
import pytest

from app.core.topics import extract_topics_local, extract_topics_gemini, extract_topics


def test_local_empty_comments():
    """Empty comment list → returns default 'General Overview' topic."""
    result = extract_topics_local([])
    assert len(result) == 1
    assert result[0]["topic"] == "General Overview"
    assert result[0]["keywords"] == ["video", "comments"]


def test_local_comment_limit_500():
    """500+ comments are truncated to 500 for performance."""
    comments = [f"Comment {i} with some meaningful text content here" for i in range(600)]
    # Should not raise
    result = extract_topics_local(comments)
    assert isinstance(result, list)


def test_local_all_gibberish():
    """Comments that are all stopwords/emoji → default topic (no crash)."""
    gibberish = ["#$%^&*()", "   ", "!!!", "...", "❤️🔥😎"]
    result = extract_topics_local(gibberish)
    assert len(result) == 1
    assert "topic" in result[0]
    assert "keywords" in result[0]
    assert "quotes" in result[0]


def test_local_keywords_extracted():
    """Top 5 keywords are extracted from all comments."""
    comments = [
        "Python programming is great",
        "Python machine learning tutorial",
        "Data science with Python",
        "Python vs JavaScript comparison",
        "Learn Python from scratch",
    ]
    result = extract_topics_local(comments)
    keywords = result[0]["keywords"]
    assert len(keywords) == 5
    assert "python" in keywords


def test_local_short_comments_skipped():
    """Comments with < 4 meaningful words are skipped in scoring."""
    short = ["ok", "nice", "lol", "woah"]
    result = extract_topics_local(short)
    # Should return the default topic since all comments are skipped
    assert len(result) == 1
    assert result[0]["topic"] == "General Overview"


@pytest.mark.asyncio
async def test_gemini_missing_api_key():
    """No API key → returns None (triggers local fallback)."""
    result = await extract_topics_gemini(["comment 1", "comment 2"], "positive")
    assert result is None


@pytest.mark.asyncio
async def test_extract_topics_falls_back_to_local():
    """When Gemini returns None, extract_topics uses local extraction."""
    comments = [
        "This Python tutorial is absolutely fantastic and helpful",
        "Great explanation of machine learning concepts clearly",
    ]
    result = await extract_topics(comments, "positive")
    assert isinstance(result, list)
    assert len(result) >= 1
    assert "topic" in result[0]


@pytest.mark.asyncio
async def test_extract_topics_empty_uses_local():
    """Empty comment list → local fallback returns default topic."""
    result = await extract_topics([], "negative")
    assert result == [
        {
            "topic": "General Overview",
            "summary": "Viewers are discussing the video, but no distinct keywords could be extracted locally.",
            "keywords": ["video", "comments"],
            "quotes": [],
        }
    ]
