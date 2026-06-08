"""
Dual-Engine Sentiment Analysis using Hugging Face Transformers.

This module uses a routing strategy:
1. Detects the language of the comment using langdetect.
2. If Indonesian, routes to an Indonesian-specific RoBERTa model (highly accurate for local slang/sarcasm).
3. If any other language, routes to a multilingual XLM-RoBERTa model.
"""
import asyncio # Mengatur urutan eksekusi asinkron agar server tetap responsif walau AI sedang berpikir lambat
import logging # Menulis pesan jejak operasi (log) ke terminal
import re # Mencocokkan teks menggunakan pola khusus (Regular Expression/RegEx)
import torch # Pustaka matematika tingkat lanjut (Tensor) untuk menjalankan jaringan saraf tiruan Kecerdasan Buatan (GPU)
from transformers import pipeline, AutoTokenizer # Pustaka utama HuggingFace untuk memuat dan menjalankan model bahasa AI seperti IndoBERT
from langdetect import detect, DetectorFactory # Pustaka pendeteksi teks bahasa untuk merutekan apakah ini komentar orang Indonesia atau Asing

# Fix random seed for langdetect to ensure consistent language detection
# Memastikan hasil deteksi bahasa selalu konsisten meskipun dijalankan berulang kali
DetectorFactory.seed = 0

logger = logging.getLogger(__name__)

# Model 1: Multilingual Model (Jack of all trades)
# Model serbaguna untuk berbagai macam bahasa (Inggris, Arab, Spanyol, dll)
MULTI_MODEL_NAME = "cardiffnlp/twitter-xlm-roberta-base-sentiment"
# Model 2: Indonesian Model (Specialist for Indo Sarcasm/Slang)
# Model AI khusus yang dilatih dengan data bahasa Indonesia (mampu mendeteksi bahasa gaul atau sarkas)
INDO_MODEL_NAME = "w11wo/indonesian-roberta-base-sentiment-classifier"

# Variabel global untuk menyimpan model ke dalam memori server (agar tidak mengunduh ulang tiap kali ada permintaan)
multi_pipeline = None
indo_pipeline = None

logger.info(f"Loading Dual NLP Models...")
try:
    # Memeriksa apakah server memiliki Kartu Grafis (GPU/CUDA) untuk mempercepat analisis
    device_id = 0 if torch.cuda.is_available() else -1
    device_name = "cuda:0" if device_id == 0 else "cpu"
    logger.info(f"Hardware Acceleration: {device_name.upper()}")

    logger.info(f"Loading Indo-RoBERTa: {INDO_MODEL_NAME}")
    # Memuat 'kamus kata' (Tokenizer) dan Model AI untuk spesialis Bahasa Indonesia
    indo_tokenizer = AutoTokenizer.from_pretrained(INDO_MODEL_NAME, use_fast=False)
    indo_pipeline = pipeline("sentiment-analysis", model=INDO_MODEL_NAME, tokenizer=indo_tokenizer, truncation=True, max_length=512, device=device_id)
    
    logger.info(f"Loading XLM-RoBERTa: {MULTI_MODEL_NAME}")
    # Memuat Tokenizer dan Model AI untuk bahasa global/campuran
    multi_tokenizer = AutoTokenizer.from_pretrained(MULTI_MODEL_NAME, use_fast=False)
    multi_pipeline = pipeline("sentiment-analysis", model=MULTI_MODEL_NAME, tokenizer=multi_tokenizer, truncation=True, max_length=512, device=device_id)
    
    logger.info(f" Models loaded successfully on {device_name.upper()}")
except Exception as e:
    logger.error(f"Failed to load NLP models: {e}")

# Peta konversi agar label/jawaban mentah dari berbagai model bisa disamakan ke format baku: positive, neutral, negative
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
# Daftar pola RegEx (Regular Expression) untuk mendeteksi nomor WA, tautan pishing, dan kata kunci spam/promosi
SPAM_KEYWORDS = [
    r"whatsapp", r"wa\.me", r"08\d{8,12}", r"\+62\d{8,12}", # WA / Phone Numbers
    r"crypto", r"kripto", r"bitcoin", r"investasi", r"saham", r"trading", r"binomo", # Crypto/Trading
    r"hubungi saya", r"t\.me", r"telegram", r"klik link", r"http", r"www\.", # Links / Phishing
    r"promosi", r"diskon", r"subs", r"subscribe channel", r"mampir ke channel" # Self-promo
]
# Menggabungkan semua pola ke dalam satu mesin pencari teks yang super cepat
SPAM_REGEX = re.compile("|".join(SPAM_KEYWORDS), re.IGNORECASE)

def is_spam_or_bot(text: str) -> bool:
    """Very fast regex-based filter to detect common spam patterns."""
    # Mengecilkan semua huruf untuk mempermudah pencocokan
    text_lower = text.lower()
    
    # 1. Check for spam keywords
    # Jika pola kalimat cocok dengan daftar hitam di atas, maka otomatis ditandai sebagai Spam
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
    # Jika komentar kosong, lewati saja dan anggap netral
    if not text or not str(text).strip():
        return {"sentiment": "neutral", "sentimentScore": 0.0}
        
    # Lightweight Spam/Bot Filter (Before wasting GPU cycles)
    # Jalankan pengecekan Spam terlebih dahulu agar model AI yang berat tidak perlu repot memproses teks "sampah"
    if is_spam_or_bot(str(text)):
        return {"sentiment": "spam", "sentimentScore": 0.0}

    # Fallback if models failed to load
    # Jika server AI mati saat start up, otomatis semua komentar dianggap netral untuk menghindari Crash
    if indo_pipeline is None or multi_pipeline is None:
        return {"sentiment": "neutral", "sentimentScore": 0.0}

    try:
        # 1. Detect Language
        # Note: langdetect might fail on pure emojis or very short strings
        # Mendeteksi bahasa apa yang dipakai di komentar tersebut
        try:
            lang = detect(str(text))
        except:
            lang = "unknown"

        # 2. Route to appropriate model
        # Konsep Routing: Arahkan ke dokter yang tepat
        if lang == "id":
            # Use Indonesian specialist model
            # Jika terdeteksi teks berbahasa Indonesia, gunakan model spesialis lokal
            result = indo_pipeline(str(text))
        else:
            # Use Multilingual model for everything else (English, Arabic, Spanish, etc)
            # Jika bahasa asing/campuran, pakai model jenderal (XLM-RoBERTa)
            result = multi_pipeline(str(text))
        
        # 3. Process Result
        # Membaca hasil analisis dari model AI (contoh raw_label: "LABEL_2", score: 0.95)
        raw_label = result[0]["label"]
        score = float(result[0]["score"])
        
        # Map label to standard NeuroTube format
        # Menyeragamkan bahasa mesin menjadi label normal (positive/negative/neutral)
        sentiment = _LABEL_MAP.get(raw_label.upper(), raw_label.lower())
        
        # Compound score: scale score based on sentiment for legacy compatibility
        # Menghitung bobot skor agar nilai negatif diubah menjadi minus (contoh -0.9)
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
    # Menjalankan fungsi analisis ke sekumpulan komentar sekaligus menggunakan list comprehension (fitur khas Python)
    return [analyze_comment(text) for text in texts]


async def analyze_comment_async(text: str, client=None) -> dict:
    """Async wrapper for compatibility."""
    # Membungkus fungsi Python biasa agar bisa dipanggil oleh sistem asinkron (await) tanpa membekukan proses lain
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, analyze_comment, text)


async def analyze_batch_async(texts: list[str]) -> list[dict]:
    """Analyze a batch of comments concurrently."""
    # Membungkus fungsi list agar mendukung asinkron
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, analyze_batch, texts)
