"""
Dual-Engine Sentiment Analysis using Hugging Face Transformers.

This module uses a routing strategy:
1. Detects the language of the comment using langdetect.
2. If Indonesian, routes to an Indonesian-specific RoBERTa model (highly accurate for local slang/sarcasm).
3. If any other language, routes to a multilingual XLM-RoBERTa model.
"""
import asyncio
import asyncio
import logging
import re
import torch
from transformers import pipeline, AutoTokenizer
from langdetect import detect, DetectorFactory

# Fix random seed for langdetect to ensure consistent language detection
DetectorFactory.seed = 0

logger = logging.getLogger(__name__)

# Model 1: Multilingual Model (Jack of all trades)
MULTI_MODEL_NAME = "cardiffnlp/twitter-xlm-roberta-base-sentiment"
# Model 2: Indonesian Model (Specialist for Indo Sarcasm/Slang)
INDO_MODEL_NAME = "w11wo/indonesian-roberta-base-sentiment-classifier"

multi_pipeline = None
indo_pipeline = None
models_loaded = False

logger.info(f"Loading Dual NLP Models...")
try:
    device_id = 0 if torch.cuda.is_available() else -1
    device_name = "cuda:0" if device_id == 0 else "cpu"
    logger.info(f"Hardware Acceleration: {device_name.upper()}")

    logger.info(f"Loading Indo-RoBERTa: {INDO_MODEL_NAME}")
    indo_tokenizer = AutoTokenizer.from_pretrained(INDO_MODEL_NAME, use_fast=False)
    indo_pipeline = pipeline("sentiment-analysis", model=INDO_MODEL_NAME, tokenizer=indo_tokenizer, truncation=True, max_length=512, device=device_id)

    logger.info(f"Loading XLM-RoBERTa: {MULTI_MODEL_NAME}")
    multi_tokenizer = AutoTokenizer.from_pretrained(MULTI_MODEL_NAME, use_fast=False)
    multi_pipeline = pipeline("sentiment-analysis", model=MULTI_MODEL_NAME, tokenizer=multi_tokenizer, truncation=True, max_length=512, device=device_id)

    models_loaded = True
    logger.info(f"✅ Models loaded successfully on {device_name.upper()}")
except Exception as e:
    logger.error(f"Failed to load NLP models: {e}")
    models_loaded = False

_LABEL_MAP = {
    "LABEL_0": "negative",
    "LABEL_1": "neutral",
    "LABEL_2": "positive",
    "NEGATIVE": "negative",
    "NEUTRAL": "neutral",
    "POSITIVE": "positive",
    "negative": "negative",
    "neutral": "neutral",
    "positive": "positive",
}

# --- Lightweight Spam Heuristics Engine (0% GPU Load) ---
SPAM_KEYWORDS = [
    r"whatsapp", r"wa\.me", r"08\d{8,12}", r"\+62\d{8,12}", # WA / Phone Numbers
    r"crypto", r"kripto", r"bitcoin", r"investasi", r"saham", r"trading", r"binomo", # Crypto/Trading
    r"hubungi saya", r"t\.me", r"telegram", r"klik link", r"http", r"www\.", # Links / Phishing
    r"promosi", r"diskon", r"subs", r"subscribe channel", r"mampir ke channel" # Self-promo
]
SPAM_REGEX = re.compile("|".join(SPAM_KEYWORDS), re.IGNORECASE)

def is_spam_or_bot(text: str) -> bool:
    """Very fast regex-based filter to detect common spam patterns."""
    text_lower = text.lower()
    
    # 1. Check for spam keywords
    if SPAM_REGEX.search(text_lower):
        return True
        
    # 2. Check for excessive emojis (often used by bots to bypass filters)
    # Simple heuristic: if a short text is mostly non-alphanumeric, it might be spam.
    # But regex keyword is usually enough for 90% of YouTube spam.
    
    return False


def analyze_comment(text: str) -> dict:
    """
    Analyzes the sentiment of a given comment using the Dual AI Routing strategy.
    """
    if not text or not str(text).strip():
        return {"sentiment": "neutral", "sentimentScore": 0.0}
    # Lightweight Spam/Bot Filter (Before wasting GPU cycles)
    if is_spam_or_bot(str(text)):
        return {"sentiment": "spam", "sentimentScore": 0.0}

    if not models_loaded:
        logger.error("NLP models failed to load — cannot analyze sentiment")
        return {"sentiment": "neutral", "sentimentScore": 0.0}

    try:
        # 1. Detect Language
        # Note: langdetect might fail on pure emojis or very short strings
        try:
            lang = detect(str(text))
        except:
            lang = "unknown"

        # 2. Route to appropriate model
        if lang == "id":
            # Use Indonesian specialist model
            result = indo_pipeline(str(text))
        else:
            # Use Multilingual model for everything else (English, Arabic, Spanish, etc)
            result = multi_pipeline(str(text))
        
        # 3. Process Result
        raw_label = result[0]["label"]
        score = float(result[0]["score"])
        
        # Map label to standard NeuroTube format
        sentiment = _LABEL_MAP.get(raw_label.upper(), raw_label.lower())
        
        # Compound score: scale score based on sentiment for legacy compatibility
        compound = score
        if sentiment == "negative":
            compound = -score
        elif sentiment == "neutral":
            compound = 0.0
            
        return {
            "sentiment": sentiment,
            "sentimentScore": round(compound, 4)
        }
    except Exception as e:
        logger.error(f"Error analyzing sentiment for text: {e}")
        return {"sentiment": "neutral", "sentimentScore": 0.0}


def analyze_batch(texts: list[str]) -> list[dict]:
    """Analyze a batch of comments and return sentiment results."""
    # Since we need to route each comment based on language, we process them individually
    return [analyze_comment(text) for text in texts]


# Lock to prevent concurrent pipeline calls on GPU (not thread-safe)
pipeline_lock = asyncio.Lock()

async def analyze_comment_async(text: str, client=None) -> dict:
    """Async wrapper for compatibility. Uses a lock to ensure only one
    pipeline call runs at a time to avoid CUDA race conditions."""
    async with pipeline_lock:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, analyze_comment, text)


async def analyze_batch_async(texts: list[str]) -> list[dict]:
    """Analyze a batch of comments concurrently."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, analyze_batch, texts)
