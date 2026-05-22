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
    "😭": "laughing crying wholesome joy",  # Overwhelming excitement / cute / laughing hysterically
    "💀": "extremely funny positive dead",    # Laughing to death / hilarious
    "☠️": "extremely funny positive dead",
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
    # Platform & Conversational Neutralizations (overriding standard English VADER negative bias)
    "discord": 0.0,
    "dies": 0.0,
    "death": 0.0,
    "dying": 0.0,
    "loser": 0.0,
    "fake": 0.0,
    "revenge": 0.0,
    "dangerous": 0.0,
    "mad": 0.0,

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
    
    # Neutralize common emphasis words in YouTube comments
    "damn": 0.0,
    "damnn": 0.0,
    "freaking": 0.0,
    "freak": 0.0,
    "crazy": 0.0,
    "insane": 0.0,
    "wild": 0.0,
    "wtf": 0.0,      # Often used as "WTF that's good"
    "lmao": 1.0,     # Ensure laughing is positive
    "lmfao": 1.0,

    # Gaming & Social/Co-op Interaction Neutralizations
    "scared": 0.0,
    "afraid": 0.0,
    "anxious": 0.0,
    "lonely": 0.0,
    "terrible": 0.0,
    "kill": 0.0,
    "kills": 0.0,
    "killed": 0.0,
    "killing": 0.0,
    "died": 0.0,
    "fight": 0.0,
    "fighting": 0.0,
    "defeat": 0.0,
    "defeated": 0.0,
    "attack": 0.0,
    "attacks": 0.0,
    "weak": 0.0,
    "weirdo": 0.0,
    "dumb": 0.0,
    "ruin": 0.0,
    "ruins": 0.0,
    "hurt": 0.0,
    "hurts": 0.0,
    "sadly": 0.0,
    "badly": 0.0,
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
    "menangis": 0.0,
    "matanya": 0.0,   # Often related to "kaca-kaca" (teary eyes)
    
    # Neutralize words that are often factual or descriptive in comments
    "video": 0.0,
    "channel": 0.0,
    "youtube": 0.0,
    "watch": 0.0,
    "comment": 0.0,
    "subscribe": 0.0,
    "notification": 0.0,
    "durasi": 0.0,
    "menit": 0.0,
    "detik": 0.0,
    "jam": 0.0,
    "time": 0.0,
    "wait": 0.0,
    "question": 0.0,
    "tanya": 0.0,
    "apa": 0.0,
    "siapa": 0.0,
    "kapan": 0.0,
    "kenapa": 0.0,
})


def preprocess_tracklist(text: str) -> str:
    """
    Strips out list-based timestamps and catalog entries (like tracklists).
    If the comment is purely a tracklist, returns empty string.
    """
    import re
    lines = text.split('\n')
    cleaned_lines = []
    timestamp_pattern = re.compile(r'\b\d{1,2}:\d{2}(?::\d{2})?\b')
    
    total_timestamps = len(timestamp_pattern.findall(text))
    
    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue
            
        if timestamp_pattern.search(line_clean):
            if total_timestamps >= 2:
                # If the line starts with a timestamp or has catalog markers
                if (re.match(r'^\s*\[?\d{1,2}:\d{2}', line_clean) or 
                    "ost" in line_clean.lower() or 
                    "track" in line_clean.lower() or
                    "-" in line_clean):
                    continue
            
            line_clean = timestamp_pattern.sub("", line_clean).strip()
            
        cleaned_lines.append(line_clean)
        
    return " ".join(cleaned_lines).strip()


SLANG_REPLACEMENTS = {
    "could not be happier": "extremely happy",
    "couldn't be happier": "extremely happy",
    "could not be more happy": "extremely happy",
    "couldn't be more happy": "extremely happy",
    "could not be prouder": "extremely proud",
    "couldn't be prouder": "extremely proud",
    "no longer a loser": "a winner",
    "no longer loser": "a winner",
    "too dangerous to be left alive": "legendary and awesome",
    "dangerous to be left alive": "legendary and awesome",
    "mad lad": "awesome person",
    "madlad": "awesome person",
    "voice kills": "voice is spectacular",
    "voice killed": "voice was spectacular",
    "beat kills": "beat is spectacular",
    "song kills": "song is spectacular",
    
    # Gen-Z / Laughter / Social Media Idioms (preventing negative score on "weak", "cry", "dead")
    "got me weak": "made me laugh so much",
    "i'm weak": "i am laughing so hard",
    "im weak": "i am laughing so hard",
    "i am weak": "i am laughing so hard",
    "got me crying": "made me laugh so hard",
    "i'm dead": "i am laughing so hard",
    "im dead": "i am laughing so hard",
    "i am dead": "i am laughing so hard",
    "actually weak": "actually laughing so hard",
    "that shit got me": "that made me laugh so much",
}

# Rick Astley Lyric Quote Detection (highly positive/loyal community engagement)
RICKROLL_LYRICS = [
    "give you up", "let you down", "run around and desert you",
    "make you cry", "say goodbye", "tell a lie", "hurt you", "never gonna"
]

_local_transformer = None

def get_local_transformer():
    global _local_transformer
    if _local_transformer is not None:
        return _local_transformer
    try:
        from transformers import pipeline
        # Lazy load pipeline
        _local_transformer = pipeline("sentiment-analysis", model="lxyuan/distilbert-base-multilingual-cased-sentiments-student")
        return _local_transformer
    except ImportError:
        return None

def analyze_with_gemini(text: str) -> str | None:
    from app.core.config import settings
    import httpx
    if not settings.GEMINI_API_KEY:
        return None
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [{
                "parts": [{
                    "text": (
                        "Analyze the sentiment of the following comment. "
                        "Respond with ONLY a single word: positive, negative, or neutral. "
                        "Do not include punctuation or explain your reasoning.\n\n"
                        f"Comment: \"{text}\""
                    )
                }]
            }]
        }
        resp = httpx.post(url, json=payload, timeout=2.0)
        if resp.status_code == 200:
            result = resp.json()
            content_text = result["candidates"][0]["content"]["parts"][0]["text"].strip().lower()
            if "positive" in content_text:
                return "positive"
            elif "negative" in content_text:
                return "negative"
            elif "neutral" in content_text:
                return "neutral"
    except Exception:
        pass
    return None


async def analyze_with_gemini_async(text: str, client) -> str | None:
    from app.core.config import settings
    if not settings.GEMINI_API_KEY:
        return None
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [{
                "parts": [{
                    "text": (
                        "Analyze the sentiment of the following comment. "
                        "Respond with ONLY a single word: positive, negative, or neutral. "
                        "Do not include punctuation or explain your reasoning.\n\n"
                        f"Comment: \"{text}\""
                    )
                }]
            }]
        }
        resp = await client.post(url, json=payload, timeout=3.0)
        if resp.status_code == 200:
            result = resp.json()
            content_text = result["candidates"][0]["content"]["parts"][0]["text"].strip().lower()
            if "positive" in content_text:
                return "positive"
            elif "negative" in content_text:
                return "negative"
            elif "neutral" in content_text:
                return "neutral"
    except Exception:
        pass
    return None


def analyze_with_transformer(text: str) -> str | None:
    classifier = get_local_transformer()
    if not classifier:
        return None
    try:
        results = classifier(text[:512])
        if results and len(results) > 0:
            label = results[0]["label"].lower()
            if label in ["positive", "pos"]:
                return "positive"
            elif label in ["negative", "neg"]:
                return "negative"
            elif label in ["neutral", "neu"]:
                return "neutral"
    except Exception:
        pass
    return None


def analyze_comment(text: str) -> dict:
    """
    Analyze the sentiment of a single comment.

    Returns:
        {
            "sentiment": "positive" | "negative" | "neutral",
            "sentimentScore": float  (-1.0 to 1.0, compound score)
        }
    """
    import re
    # 1. Clean tracklists and timestamps
    processed_text = preprocess_tracklist(text)
    if not processed_text:
        return {"sentiment": "neutral", "sentimentScore": 0.0}

    clean_text = processed_text.lower()

    # Pre-processing for specific tropes
    if "cutting onions" in clean_text or "cut onions" in clean_text:
        # This is a 100% positive trope for "moving/sad video"
        return {"sentiment": "positive", "sentimentScore": 0.8}

    # 2. Rick Astley Special Quote Shield
    lyric_matches = sum(1 for lyric in RICKROLL_LYRICS if lyric in clean_text)
    if lyric_matches >= 2:
        return {"sentiment": "positive", "sentimentScore": 0.8}

    # 3. Timestamp shield: If any single timestamps remain, check if it's descriptive
    if re.search(r'\d+:\d+', clean_text):
        # Unless it's explicitly toxic, treat as neutral
        scores = _analyzer.polarity_scores(processed_text)
        if -0.6 < scores["compound"] < 0.6:
            return {"sentiment": "neutral", "sentimentScore": 0.0}

    # 4. Pure questions: "Who is this?", "What song?"
    if clean_text.endswith("?") and len(clean_text.split()) < 8:
        return {"sentiment": "neutral", "sentimentScore": 0.0}

    # 5. Apply Slang and Double-Negation Phrase Mapping
    for original, replacement in SLANG_REPLACEMENTS.items():
        if original in clean_text:
            processed_text = re.sub(re.escape(original), replacement, processed_text, flags=re.IGNORECASE)

    # 6. Sentence-by-sentence evaluation and aggregation to prevent negation leakage
    sentences = [s.strip() for s in re.split(r'[.!?\n]', processed_text) if s.strip()]
    
    if len(sentences) <= 1:
        # Single sentence or short comment: directly evaluate
        scores = _analyzer.polarity_scores(processed_text)
        compound = scores["compound"]
    else:
        # Multi-sentence comment: evaluate each sentence and aggregate
        sentence_scores = []
        for s in sentences:
            sentence_scores.append(_analyzer.polarity_scores(s)["compound"])
        
        # Negativity safeguard: if any sentence is extremely toxic/negative (<= -0.70),
        # keep it negative to prevent false positives for harassment/toxicity.
        min_score = min(sentence_scores)
        if min_score <= -0.70:
            compound = min_score
        else:
            # Self-weighted average to ignore neutral sentence dilution
            weighted_sum = sum(c * abs(c) for c in sentence_scores)
            abs_sum = sum(abs(c) for c in sentence_scores)
            if abs_sum == 0:
                compound = 0.0
            else:
                compound = weighted_sum / abs_sum

    # Calibrated thresholds for YouTube comments with hybrid engine fallback.
    # Ambiguous or neutral compound range check (-0.35 to 0.15)
    if -0.35 < compound < 0.15:
        gemini_sentiment = analyze_with_gemini(processed_text)
        if gemini_sentiment:
            if gemini_sentiment == "positive":
                compound = 0.5
            elif gemini_sentiment == "negative":
                compound = -0.5
            else:
                compound = 0.0
            label = gemini_sentiment
        else:
            transformer_sentiment = analyze_with_transformer(processed_text)
            if transformer_sentiment:
                if transformer_sentiment == "positive":
                    compound = 0.5
                elif transformer_sentiment == "negative":
                    compound = -0.5
                else:
                    compound = 0.0
                label = transformer_sentiment
            else:
                if compound >= 0.20:
                    label = "positive"
                elif compound <= -0.40:
                    label = "negative"
                else:
                    label = "neutral"
    else:
        if compound >= 0.20:
            label = "positive"
        elif compound <= -0.40:
            label = "negative"
        else:
            label = "neutral"

    return {
        "sentiment": label,
        "sentimentScore": round(compound, 4),
    }


async def analyze_comment_async(text: str, client=None) -> dict:
    """
    Analyze the sentiment of a single comment asynchronously.
    """
    import re
    # 1. Clean tracklists and timestamps
    processed_text = preprocess_tracklist(text)
    if not processed_text:
        return {"sentiment": "neutral", "sentimentScore": 0.0}

    clean_text = processed_text.lower()

    # Pre-processing for specific tropes
    if "cutting onions" in clean_text or "cut onions" in clean_text:
        return {"sentiment": "positive", "sentimentScore": 0.8}

    # 2. Rick Astley Special Quote Shield
    lyric_matches = sum(1 for lyric in RICKROLL_LYRICS if lyric in clean_text)
    if lyric_matches >= 2:
        return {"sentiment": "positive", "sentimentScore": 0.8}

    # 3. Timestamp shield: If any single timestamps remain, check if it's descriptive
    if re.search(r'\d+:\d+', clean_text):
        scores = _analyzer.polarity_scores(processed_text)
        if -0.6 < scores["compound"] < 0.6:
            return {"sentiment": "neutral", "sentimentScore": 0.0}

    # 4. Pure questions: "Who is this?", "What song?"
    if clean_text.endswith("?") and len(clean_text.split()) < 8:
        return {"sentiment": "neutral", "sentimentScore": 0.0}

    # 5. Apply Slang and Double-Negation Phrase Mapping
    for original, replacement in SLANG_REPLACEMENTS.items():
        if original in clean_text:
            processed_text = re.sub(re.escape(original), replacement, processed_text, flags=re.IGNORECASE)

    # 6. Sentence-by-sentence evaluation and aggregation to prevent negation leakage
    sentences = [s.strip() for s in re.split(r'[.!?\n]', processed_text) if s.strip()]
    
    if len(sentences) <= 1:
        scores = _analyzer.polarity_scores(processed_text)
        compound = scores["compound"]
    else:
        sentence_scores = []
        for s in sentences:
            sentence_scores.append(_analyzer.polarity_scores(s)["compound"])
        
        min_score = min(sentence_scores)
        if min_score <= -0.70:
            compound = min_score
        else:
            weighted_sum = sum(c * abs(c) for c in sentence_scores)
            abs_sum = sum(abs(c) for c in sentence_scores)
            if abs_sum == 0:
                compound = 0.0
            else:
                compound = weighted_sum / abs_sum

    # Calibrated thresholds with async hybrid engine fallback
    if -0.35 < compound < 0.15:
        gemini_sentiment = None
        if client:
            gemini_sentiment = await analyze_with_gemini_async(processed_text, client)
        else:
            gemini_sentiment = analyze_with_gemini(processed_text)
            
        if gemini_sentiment:
            if gemini_sentiment == "positive":
                compound = 0.5
            elif gemini_sentiment == "negative":
                compound = -0.5
            else:
                compound = 0.0
            label = gemini_sentiment
        else:
            transformer_sentiment = analyze_with_transformer(processed_text)
            if transformer_sentiment:
                if transformer_sentiment == "positive":
                    compound = 0.5
                elif transformer_sentiment == "negative":
                    compound = -0.5
                else:
                    compound = 0.0
                label = transformer_sentiment
            else:
                if compound >= 0.20:
                    label = "positive"
                elif compound <= -0.40:
                    label = "negative"
                else:
                    label = "neutral"
    else:
        if compound >= 0.20:
            label = "positive"
        elif compound <= -0.40:
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


async def analyze_batch_async(texts: list[str]) -> list[dict]:
    """Analyze a batch of comments concurrently using httpx.AsyncClient."""
    import httpx
    import asyncio
    async with httpx.AsyncClient() as client:
        tasks = [analyze_comment_async(text, client) for text in texts]
        return await asyncio.gather(*tasks)
