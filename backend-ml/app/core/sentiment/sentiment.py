"""
VADER-based sentiment analysis engine.

VADER (Valence Aware Dictionary and sEntiment Reasoner) is a lightweight,
rule-based sentiment analysis tool specifically tuned for social media text.
It requires no GPU and handles informal English (YouTube comments) well.
"""

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_analyzer = SentimentIntensityAnalyzer()

# Custom lexicon for Gaming/Horror/Indonesian context
GAMING_LEXICON = {
    # Indonesian Positive/Gaming
    "seru": 3.0,
    "mantap": 3.0,
    "keren": 3.0,
    "gokil": 2.5,
    "asik": 2.5,
    "lucu": 2.5,
    "ngakak": 3.0,
    "menarik": 2.0,
    "bagus": 2.0,
    
    # Horror Context (Arousal as Positive/Neutral excitement)
    "deg-degan": 1.5,
    "merinding": 1.5,
    "kaget": 1.0,
    "seram": 1.0,
    "serem": 1.0,
    "horor": 0.5,
    
    # English Gaming Nuances
    "hype": 3.0,
    "clutch": 3.0,
    "scary": 1.0,  # Usually positive in horror context
    "creepy": 0.5,
}

_analyzer.lexicon.update(GAMING_LEXICON)

# Override Emojis that are often positive/neutral in gaming
GAMING_EMOJIS = {
    "😭": "excited crying",  # Often used for "ngakak" or overwhelming excitement
    "💀": "laughing dead",   # Used as "mati ketawa" (laughing to death)
    "😱": "shocked excitement",
    "🔥": "awesome",
    "💯": "perfect",
}

_analyzer.emojis.update(GAMING_EMOJIS)

# General Indonesian Sentiment Lexicon
INDONESIAN_LEXICON = {
    # Positive
    "bagus": 3.0,
    "baik": 2.5,
    "oke": 2.0,
    "sip": 2.0,
    "juara": 3.0,
    "top": 2.5,
    "puas": 3.0,
    "bahagia": 3.0,
    "senang": 2.5,
    "suka": 2.5,
    "cinta": 3.5,
    "terima kasih": 3.0,
    "makasih": 2.5,
    "bermanfaat": 2.5,
    "edukatif": 2.0,
    "informatif": 2.0,
    "keren": 3.0,
    "hebat": 3.0,
    "luar biasa": 3.5,
    "bangga": 3.0,
    "setuju": 2.0,
    "awet": 2.5,
    "murah": 2.0,
    "cepat": 2.0,
    
    # Negative
    "buruk": -3.0,
    "jelek": -3.0,
    "kecewa": -3.0,
    "sedih": -2.0,
    "marah": -3.0,
    "kesal": -2.5,
    "benci": -3.5,
    "rugi": -2.5,
    "mahal": -1.5,
    "lambat": -2.0,
    "lemot": -2.5,
    "rusak": -3.0,
    "cacat": -3.0,
    "payah": -2.5,
    "sampah": -3.5,
    "penipu": -3.5,
    "hoax": -3.0,
    "bohong": -3.0,
    "ngaco": -2.5,
    "ngawur": -2.5,
    "parah": -1.0,  # Context dependent, but usually negative in general
    "jangan": -1.5,
    "stop": -1.5,
    "tolak": -2.0,
    "bosan": -2.0,
    "bingung": -1.0,
}

# Additional Indonesian terms to ensure they are recognized
INDONESIAN_EXTRAS = {
    "banget": 0.5,    # Intensifier
    "sekali": 0.5,    # Intensifier
    "aja": 0.0,       # Neutral
    "sih": 0.0,       # Neutral
    "kok": 0.0,       # Neutral
    "nih": 0.0,       # Neutral
}

# International YouTube Slang & Culture
YOUTUBE_CULTURE_LEXICON = {
    # Speed/Kai/Streaming Slang
    "w": 3.0,
    "l": -3.0,
    "ratio": -2.0,
    "rizz": 1.5,
    "gyatt": 1.0,
    "cap": -1.5,
    "no cap": 2.0,
    "fr": 1.0,
    "ong": 1.5,
    "clout": 1.0,
    "sus": -1.5,
    "mid": -2.0,
    "valid": 2.0,
    "bet": 1.0,
    
    # Common Praise/Terms (Including praise-as-insult)
    "goat": 3.5,
    "goated": 3.5,
    "legend": 3.0,
    "beast": 2.0,
    "underrated": 2.5,
    "overrated": -2.0,
    "peak": 3.0,
    "fell off": -3.0,
    "cooking": 2.5,
    "cooked": -2.5,
    "insane": 2.5,
    "insanity": 2.5,
    "sick": 2.0,
    "madman": 2.0,
    "cracked": 2.5,
    "fire": 3.0,
    
    # Vtuber/Anime Culture
    "kawaii": 2.5,
    "seiso": 2.0,
    "wholesome": 2.5,
    "cute": 2.0,
    "waifu": 1.5,
    "lewd": -0.5,
    "simp": 0.5,
    "evil": 0.0,      # Neutralize for Evil Neuro
    "demon": 0.5,
    "monster": 1.0,
}

# Cinematic/Music Appreciation (Neutralize negative triggers for art)
CINEMATIC_LEXICON = {
    "cry": 0.0,
    "crying": 0.0,
    "tears": 0.0,
    "sob": 0.0,
    "sobbing": 0.0,
    "sad": 0.0,       # In art context, sad is often the goal (positive engagement)
    "heartbroken": 0.5,
    "hurts": 0.5,     # "It hurts so good"
    "emotional": 2.0,
    "masterpiece": 4.0,
    "cinematic": 3.0,
    "art": 2.5,
    "masterful": 3.5,
    "stunning": 3.0,
    "beautiful": 3.0,
    "onion": 0.5,     # "cutting onions" joke
    "onions": 0.5,
}

_analyzer.lexicon.update(YOUTUBE_CULTURE_LEXICON)
_analyzer.lexicon.update(INDONESIAN_LEXICON)
_analyzer.lexicon.update(INDONESIAN_EXTRAS)
_analyzer.lexicon.update(CINEMATIC_LEXICON)
_analyzer.lexicon.update({
    "sedih": 0.0,     # Neutralize for same reason as "sad"
    "parah": 0.5,     # Often used as "Keren parah" (Crazy cool)
    "nangis": 0.0,    # Neutralize cry in ID
    "sakit": 0.0,     # "Sakit hati" (Heartbroken) is usually positive engagement in art
})


def analyze_comment(text: str) -> dict:
    """
    Analyze the sentiment of a single comment.

    Returns:
        {
            "sentiment": "positive" | "negative" | "neutral",
            "sentimentScore": float  (-1.0 to 1.0, compound score)
        }
    """
    # Pre-processing for specific tropes
    clean_text = text.lower()
    if "cutting onions" in clean_text or "cut onions" in clean_text:
        # This is a 100% positive trope for "moving/sad video"
        return {"sentiment": "positive", "sentimentScore": 0.8}

    scores = _analyzer.polarity_scores(text)
    compound = scores["compound"]

    # Adjusted thresholds for better balance
    if compound >= 0.15:
        label = "positive"
    elif compound <= -0.25:
        label = "negative"
    else:
        label = "neutral"

    return {
        "sentiment": label,
        "sentimentScore": round(compound, 4),
    }


def analyze_batch(texts: list[str]) -> list[dict]:
    """Analyze a batch of comments and return sentiment results."""
    return [analyze_comment(text) for text in texts]
