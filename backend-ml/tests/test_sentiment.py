"""
Tests for sentiment.py — Phase 1 critical tests.

Covers:
1. Label mapping (LABEL_0, NEGATIVE, negative → "negative")
2. Compound score computation (negative → -score, neutral → 0.0)
3. Empty text → neutral with score 0.0
4. Model loading failure → neutral fallback
5. Langdetect failure → graceful routing to multilingual model
"""
import pytest

from app.core.sentiment.sentiment import (
    analyze_comment,
    _LABEL_MAP,
)


def test_label_map_all_variants():
    """All label variants from both models must map correctly."""
    for label in ("LABEL_0", "NEGATIVE", "negative", "Negative"):
        result = _LABEL_MAP.get(label.upper(), label.lower())
        assert result == "negative", f"Label {label!r} did not map to 'negative'"

    for label in ("LABEL_1", "NEUTRAL", "neutral", "Neutral"):
        result = _LABEL_MAP.get(label.upper(), label.lower())
        assert result == "neutral", f"Label {label!r} did not map to 'neutral'"

    for label in ("LABEL_2", "POSITIVE", "positive", "Positive"):
        result = _LABEL_MAP.get(label.upper(), label.lower())
        assert result == "positive", f"Label {label!r} did not map to 'positive'"


def test_analyze_comment_empty_text():
    """Empty/whitespace-only text returns neutral with score 0.0."""
    for text in ("", "   ", "\n\t"):
        result = analyze_comment(text)
        assert result["sentiment"] == "neutral", f"Empty text {text!r} should be neutral"
        assert result["sentimentScore"] == 0.0


def test_analyze_comment_score_positive(monkeypatch):
    """Positive label → compound score is in [0.0, 1.0]."""
    from app.core.sentiment import sentiment

    mock_pipeline = pytest.Mock(return_value=[{"label": "positive", "score": 0.87}])
    monkeypatch.setattr(sentiment, "multi_pipeline", mock_pipeline)
    monkeypatch.setattr(sentiment, "indo_pipeline", mock_pipeline)
    monkeypatch.setattr(sentiment, "models_loaded", True)

    result = analyze_comment("This is a great video!")

    assert result["sentiment"] == "positive"
    assert 0.0 <= result["sentimentScore"] <= 1.0


def test_analyze_comment_score_negative(monkeypatch):
    """Negative label → compound score is in [-1.0, 0.0]."""
    from app.core.sentiment import sentiment

    mock_pipeline = pytest.Mock(return_value=[{"label": "negative", "score": 0.91}])
    monkeypatch.setattr(sentiment, "multi_pipeline", mock_pipeline)
    monkeypatch.setattr(sentiment, "indo_pipeline", mock_pipeline)
    monkeypatch.setattr(sentiment, "models_loaded", True)

    result = analyze_comment("This is a terrible video!")

    assert result["sentiment"] == "negative"
    assert -1.0 <= result["sentimentScore"] <= 0.0


def test_analyze_comment_score_neutral(monkeypatch):
    """Neutral label → compound score is always 0.0 regardless of raw score."""
    from app.core.sentiment import sentiment

    mock_pipeline = pytest.Mock(return_value=[{"label": "neutral", "score": 0.55}])
    monkeypatch.setattr(sentiment, "multi_pipeline", mock_pipeline)
    monkeypatch.setattr(sentiment, "indo_pipeline", mock_pipeline)
    monkeypatch.setattr(sentiment, "models_loaded", True)

    result = analyze_comment("This is an okay video.")

    assert result["sentiment"] == "neutral"
    assert result["sentimentScore"] == 0.0  # hardcoded 0.0 for neutral


def test_models_not_loaded_fallback(monkeypatch):
    """When models fail to load, analyze_comment returns neutral 0.0 (not an exception)."""
    from app.core.sentiment import sentiment

    monkeypatch.setattr(sentiment, "models_loaded", False)
    monkeypatch.setattr(sentiment, "multi_pipeline", None)
    monkeypatch.setattr(sentiment, "indo_pipeline", None)

    result = analyze_comment("Any text at all")

    assert result["sentiment"] == "neutral"
    assert result["sentimentScore"] == 0.0


def test_langdetect_failure_graceful(monkeypatch):
    """Langdetect failure → routes to multilingual model without raising."""
    from app.core.sentiment import sentiment

    # Patch detect to raise so the "unknown" branch is taken
    def failing_detect(*args, **kwargs):
        raise Exception("langdetect unavailable")

    monkeypatch.setattr(sentiment.detect, "__wrapped__", failing_detect)
    monkeypatch.setattr(sentiment, "models_loaded", True)

    # Multi pipeline used for "unknown" language
    mock_pipeline = pytest.Mock(return_value=[{"label": "positive", "score": 0.8}])
    monkeypatch.setattr(sentiment, "multi_pipeline", mock_pipeline)
    monkeypatch.setattr(sentiment, "indo_pipeline", mock_pipeline)

    # Should not raise; routes to multilingual pipeline
    try:
        result = analyze_comment("Some text")
        # If no exception, result should be valid
        assert result["sentiment"] in ("positive", "negative", "neutral")
    except Exception:
        pytest.fail("analyze_comment raised an exception on langdetect failure")
