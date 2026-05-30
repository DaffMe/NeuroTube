"""
Tests for spam.py — Phase 1 critical tests.

Covers all 6 spam detection patterns:
1. Pure/majority URL
2. Sub4Sub / channel promotion
3. Crypto/investment scams (2+ keywords OR keyword + phone)
4. Giveaway/prize scams
5. Gibberish (repeating characters)
6. Word repetition (< 20% unique words with 6+ words)
"""
from app.core.sentiment.spam import is_spam


def spam(text):
    return is_spam(text)


# ── 1. URL-based detection ───────────────────────────────────────────


def test_spam_pure_url():
    """Text that is >70% URL is spam."""
    long_url = "https://bit.ly/spam-link-here-now-click-here"
    assert spam(long_url + " ab")


def test_spam_mostly_url():
    """Text where URL length > 70% of total length is spam."""
    url = "https://example.com/path"
    # URL is ~28 chars; text is 30 chars → URL is ~93% → spam
    assert spam(url + " ab")


def test_spam_url_in_normal_text():
    """Normal text that mentions a URL is NOT spam."""
    assert not spam("Check out this video at https://youtube.com/watch?v=abc123 Great content!")
    assert not spam("I found this on youtube.com while browsing")


# ── 2. Sub4Sub detection ─────────────────────────────────────────


def test_spam_sub4sub():
    """Subscribe promotion patterns should be detected."""
    assert spam("Please subscribe to my channel for more videos!")
    assert spam("Hey everyone! Check out my channel, pls sub!")
    assert spam("Sub4sub? I will sub back")


def test_spam_not_sub4sub():
    """Normal comments mentioning 'subscribe' casually are not spam."""
    assert not spam("This video convinced me to subscribe to the notification bell")
    assert not spam("I subscribed because the content is amazing")


# ── 3. Crypto/investment scams ───────────────────────────────────


def test_spam_crypto_two_keywords():
    """Crypto scam requires 2+ distinct keywords."""
    assert spam("Guaranteed bitcoin profit every day with this crypto trading strategy")
    assert spam("Best investment platform! Ethereum and bitcoin returns")


def test_spam_crypto_keyword_plus_phone():
    """One crypto keyword + phone number = spam."""
    assert spam("DM me for crypto tips +62 812 3456 7890")


def test_spam_single_crypto_keyword():
    """Single crypto keyword without phone or second keyword → not spam."""
    assert not spam("I bought some bitcoin last year and it worked out")


def test_spam_crypto_casual():
    """Mentioning crypto casually is not spam."""
    assert not spam("The bitcoin network uses proof of work consensus")


# ── 4. Giveaway/prize scams ──────────────────────────────────────────


def test_spam_giveaway():
    """Giveaway and prize scam patterns detected."""
    assert spam("Congratulations! You won a prize! Click the link to claim")
    assert spam("FREE GIVEAWAY! Click here to win a gift card")


def test_spam_not_giveaway():
    """Casual mentions of giving things are not spam."""
    assert not spam("This video gave me chills, what an amazing giveaway moment")
    assert not spam("I give this video 5 stars")


# ── 5. Gibberish (repeating characters) ───────────────────────────


def test_spam_gibberish_repeating_chars():
    """10+ repeated characters = spam."""
    assert spam("hhhhhhhhhhhhhhhhhhhhh")
    assert spam("wwwwwwwwwwwwwwooooooorrrrrrrrllllllddddd")


def test_spam_not_gibberish():
    """Normal text with repeated letters (< 10) is not spam."""
    assert not spam("This video is sooo good!")


# ── 6. Word repetition ────────────────────────────────────────────


def test_spam_word_repetition():
    """< 20% unique words with 6+ words → spam."""
    # 1 unique word / 8 words = 12.5% < 20% → spam
    assert spam("good good good good good good good good")


def test_spam_word_repetition_edge():
    """Exactly at 20% unique → not spam (strictly less than)."""
    # 2 unique words / 8 total = 25% > 20% → not spam
    assert not spam("good good bad bad good good bad bad")


def test_spam_no_word_repetition():
    """Normal varied text is not spam."""
    assert not spam("This video is amazing, I love the editing and the content")


# ── Edge cases ───────────────────────────────────────────────────


def test_spam_empty_string():
    """Empty string → True (spam filter treats unparseable as spam."""
    assert spam("")


def test_spam_whitespace_only():
    """Whitespace-only string → spam."""
    assert spam("     ")


def test_spam_combinations():
    """Combinations of spam patterns should all be detected."""
    assert spam("Subscribe to my channel https://bit.ly/scam")
    assert spam("Win free bitcoin! DM me on whatsapp +62 812 3456")
