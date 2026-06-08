"""
Topic extraction and summarization module for NeuroTube.
Supports Gemini API and local NLP extractive summarization fallback.
"""

import re
import json
from collections import Counter
import httpx

# Daftar kata hubung (Stopwords) bahasa Indonesia yang tidak memiliki makna penting dan harus dibuang sebelum analisis
INDONESIAN_STOPWORDS = {
    "yang", "di", "dan", "ini", "itu", "ke", "dari", "ada", "bisa", "untuk", "dengan", "saya", "aku", "kamu",
    "dia", "mereka", "kita", "kami", "adalah", "sebagai", "akan", "telah", "sudah", "oleh", "pada", "juga",
    "atau", "hanya", "jika", "kalau", "bahwa", "sih", "kok", "nih", "ya", "yg", "dgn", "utk", "aja", "buat",
    "udah", "bgt", "banget", "lu", "gua", "gue", "lo", "pas", "kalo", "biar", "sama", "tapi", "tp", "lah"
}

# Daftar kata hubung bahasa Inggris
ENGLISH_STOPWORDS = {
    "the", "and", "to", "is", "a", "of", "in", "it", "you", "that", "he", "was", "for", "on", "are", "as",
    "with", "his", "they", "i", "at", "be", "this", "have", "from", "or", "one", "had", "by", "word", "but",
    "not", "what", "all", "were", "we", "when", "your", "can", "said", "there", "use", "an", "each", "which"
}

# Gabungkan kedua bahasa agar mendukung komentar campur-campur (Set Union)
STOPWORDS = INDONESIAN_STOPWORDS.union(ENGLISH_STOPWORDS)

# Fungsi pembersihan teks dari emoji, link, tanda baca, serta membuang Stopwords
def clean_text(text: str) -> list[str]:
    # Remove emojis, links, and punctuation, convert to lowercase
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    text = re.sub(r'[^\w\s]', '', text.lower())
    words = text.split()
    return [w for w in words if w not in STOPWORDS and len(w) > 2]


# ------------------------------------------------------------------------------
# LOCAL NLP EXTRACTIVE SUMMARIZATION
# ------------------------------------------------------------------------------
# This function is used if the Gemini API Key is missing or the request fails.
# Instead of using an LLM, it uses an Extractive Summarization algorithm:
# It calculates word frequencies and scores every comment. The highest-scoring
# comment is extracted as the "Summary" since it represents the most common themes.
# Algoritma ini berjalan jika API Key Gemini habis/error. Ia meringkas tanpa AI, murni dengan statistik kemunculan kata (matematika).
def extract_topics_local(comments: list[str]) -> list[dict]:
    # If the comment list is empty, return an empty array
    if not comments:
        return []
        
    # Optimization: Limit to 500 comments so local CPU scoring is instantaneous
    # Batasi sampel maksimal 500 agar CPU komputer tidak lemot
    if len(comments) > 500:
        comments = comments[:500]
        
    # Clean comments from emojis/punctuation and convert to lowercase
    # Bersihkan komentar dan simpan versi bersihnya berdampingan dengan versi aslinya
    cleaned_comments = [clean_text(c) for c in comments]
    valid_comments = [(comments[i], cleaned_comments[i]) for i in range(len(comments)) if cleaned_comments[i]]
    
    # If no valid text remains after cleaning
    if not valid_comments:
        return [{
            "topic": "General Overview",
            "summary": "Viewers are discussing the video, but no distinct keywords could be extracted locally.",
            "keywords": ["video", "comments"],
            "quotes": comments[:2]
        }]

    # Calculate word/phrase occurrences (Frequencies)
    # Menghitung berapa kali tiap kata diucapkan oleh semua orang (Frekuensi kemunculan)
    all_words = []
    for _, words in valid_comments:
        all_words.extend(words)

    word_freq = Counter(all_words)
    top_keywords = [word for word, count in word_freq.most_common(5)] # Ambil 5 kata yang paling viral

    # Extractive Summarization Logic: Score each sentence/comment
    # Logika Meringkas: Kita berikan 'skor' ke setiap komentar
    scored_comments = []
    for orig_c, words in valid_comments:
        # Skip very short comments (less than 4 meaningful words)
        # Komentar yang cuma terdiri dari 1-3 kata jangan dijadikan ringkasan utama
        if len(words) < 4:
            continue
            
        # The score is the average frequency of the unique words in the comment.
        # This rewards comments that use many popular words, without heavily biasing long spam comments.
        # Skor dihitung berdasarkan rata-rata popularitas kata di dalam kalimat tersebut
        # Semakin banyak dia menggunakan "kata yang sedang viral dibicarakan orang lain", semakin tinggi skornya
        unique_words = set(words)
        score = sum(word_freq[w] for w in unique_words) / len(unique_words)
        scored_comments.append((score, orig_c))

    # Sort comments by score (highest to lowest)
    # Urutkan dari komentar dengan skor tertinggi (paling mewakili isi video)
    scored_comments.sort(reverse=True, key=lambda x: x[0])

    if not scored_comments:
        # Fallback if no comment met the length criteria
        best_comment = valid_comments[0][0]
        quotes = [c for c, _ in valid_comments[1:3]]
    else:
        # Extract the highest scoring comment as the ultimate representative summary
        # Ambil komentar juara 1 sebagai "Ringkasan" utama
        best_comment = scored_comments[0][1]
        # The next highest scoring comments become the highlighted quotes
        # Juara 2 dan 3 dijadikan "Kutipan sorotan"
        quotes = [c for _, c in scored_comments[1:3]] if len(scored_comments) > 1 else [best_comment]

    # Construct an English narrative utilizing the extracted best comment
    summary_text = f"Based on local NLP analysis, the most representative viewpoint shared by the crowd is encapsulated in this thought: \"{best_comment}\""
    
    return [{
        "topic": "Crowd Consensus",
        "summary": summary_text,
        "keywords": top_keywords,
        "quotes": quotes
    }]


# ------------------------------------------------------------------------------
# GEMINI AI SUMMARIZATION (LLM)
# ------------------------------------------------------------------------------
# The primary function that calls Gemini AI to deeply read and summarize sentiments.
# Fungsi utama (Bintangnya aplikasi ini): Menembak server LLM Gemini buatan Google untuk membaca komentar dan menuliskan ringkasan
async def extract_topics_gemini(comments: list[str], sentiment: str) -> list[dict] | None:
    # Import settings to retrieve the Gemini API Key
    from app.core.config import settings
    
    # If no API key is set or no comments exist, return None (triggers the local fallback)
    # Jika tidak ada kunci API, fungsi akan menyerah (Return None) agar program jatuh ke fungsi Lokal di atas
    if not settings.GEMINI_API_KEY or not comments:
        return None
        
    # Sample 50 comments to keep the AI processing fast and cost-effective
    # Cukup ambil sampel 50 komentar pertama. Terlalu banyak = token limit tercapai & bayar mahal
    sampled_comments = comments[:50]
    comments_input = "\n".join([f"- {c}" for c in sampled_comments])
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
    
    # AI PROMPT: Instructions sent to Gemini.
    # We command it to read the comments and holistically summarize the overall sentiment in English.
    # PROMPT ENGINEERING: Menulis instruksi spesifik ke Gemini layaknya menyuruh bawahan
    # Kita minta format JSON persis seperti schema yang ditentukan, agar Frontend tidak pusing bacanya
    prompt = (
        f"You are an expert YouTube comments sentiment analyzer.\n"
        f"Analyze the following list of YouTube comments which have a {sentiment} sentiment.\n"
        f"Provide a holistic narrative summary of the overarching sentiment and themes in these comments.\n"
        f"Return exactly 1 item in the JSON array, with these fields:\n"
        f"1. topic: A concise title (e.g., 'Positive Sentiment Overview' or 'Main Criticisms', max 4 words)\n"
        f"2. summary: A comprehensive 3-5 sentence narrative summary capturing the nuance of what viewers are feeling and why.\n"
        f"3. keywords: 3-5 key themes/keywords.\n"
        f"4. quotes: 2-3 highly representative quotes directly from the text.\n\n"
        f"CRITICAL: All generated text (topic, summary, keywords) MUST be in English.\n\n"
        f"Respond strictly in JSON format as a list of objects matching this schema:\n"
        f"[\n"
        f"  {{\n"
        f"    \"topic\": \"Title Here\",\n"
        f"    \"summary\": \"Narrative summary here.\",\n"
        f"    \"keywords\": [\"keyword1\", \"keyword2\"],\n"
        f"    \"quotes\": [\"quote1\", \"quote2\"]\n"
        f"  }}\n"
        f"]\n\n"
        f"Comments:\n{comments_input}"
    )
    
    # Membungkus instruksi ke dalam paket standar format Google Gemini API
    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "responseMimeType": "application/json" # Memaksa bot menjawab dalam balutan JSON valid, jangan ada teks pembuka "Tentu, ini jawabannya"
        }
    }
    
    try:
        # Menembak server Google secara Asinkron (agar server kita tidak macet nunggu Gemini ngetik)
        async with httpx.AsyncClient(http2=False, timeout=60.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                # Membedah teks balasan dari struktur JSON API Gemini yang cukup dalam
                result = resp.json()
                text_response = result["candidates"][0]["content"]["parts"][0]["text"].strip()
                
                # Membersihkan tanda kutip backticks markdown ```json ... ``` dari jawaban Gemini jika ada
                if text_response.startswith("```"):
                    lines = text_response.splitlines()
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines[-1].startswith("```"):
                        lines = lines[:-1]
                    text_response = "\n".join(lines).strip()
                
                # Mengubah teks balasan Gemini yang sudah bersih kembali menjadi objek Dictionary Python asli
                data = json.loads(text_response)
                if isinstance(data, list):
                    return data
    except Exception as e:
        import logging
        logging.getLogger("uvicorn").warning(f"Failed to extract topics with Gemini: {e}")
        
    return None


async def extract_topics(comments: list[str], sentiment: str) -> list[dict]:
    """
    Extract topics from comments.
    Attempts Gemini API first, falls back to local statistics.
    """
    # Fungsi perantara/jembatan: Coba pakai Google Gemini dulu, kalau gagal, pakai Algoritma Statistik Lokal
    topics = await extract_topics_gemini(comments, sentiment)
    if topics is not None:
        return topics
    return extract_topics_local(comments)
