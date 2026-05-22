"""
Topic extraction and summarization module for NeuroTube.
Supports Gemini API and local statistics fallback.
"""

import re
import json
from collections import Counter
import httpx

INDONESIAN_STOPWORDS = {
    "yang", "di", "dan", "ini", "itu", "ke", "dari", "ada", "bisa", "untuk", "dengan", "saya", "aku", "kamu",
    "dia", "mereka", "kita", "kami", "adalah", "sebagai", "akan", "telah", "sudah", "oleh", "pada", "juga",
    "atau", "hanya", "jika", "kalau", "bahwa", "sih", "kok", "nih", "ya", "yg", "dgn", "utk", "aja", "buat",
    "udah", "bgt", "banget", "lu", "gua", "gue", "lo", "pas", "kalo", "biar", "sama", "tapi", "tp", "lah"
}

ENGLISH_STOPWORDS = {
    "the", "and", "to", "is", "a", "of", "in", "it", "you", "that", "he", "was", "for", "on", "are", "as",
    "with", "his", "they", "i", "at", "be", "this", "have", "from", "or", "one", "had", "by", "word", "but",
    "not", "what", "all", "were", "we", "when", "your", "can", "said", "there", "use", "an", "each", "which"
}

STOPWORDS = INDONESIAN_STOPWORDS.union(ENGLISH_STOPWORDS)


def clean_text(text: str) -> list[str]:
    # Remove emojis, links, and punctuation, convert to lowercase
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    text = re.sub(r'[^\w\s]', '', text.lower())
    words = text.split()
    return [w for w in words if w not in STOPWORDS and len(w) > 2]


def extract_topics_local(comments: list[str], max_topics: int = 3) -> list[dict]:
    if not comments:
        return []
        
    cleaned_comments = [clean_text(c) for c in comments]
    valid_comments = [(comments[i], cleaned_comments[i]) for i in range(len(comments)) if cleaned_comments[i]]
    
    if not valid_comments:
        return [{
            "topic": "Ulasan Umum",
            "summary": "Kumpulan komentar penonton mengenai video.",
            "keywords": ["video", "komentar"],
            "quotes": comments[:2]
        }]

    # Count word/phrase frequencies
    phrases = []
    for _, words in valid_comments:
        # Unigrams
        phrases.extend(words)
        # Bigrams
        for i in range(len(words) - 1):
            phrases.append(f"{words[i]} {words[i+1]}")

    phrase_counts = Counter(phrases)
    top_phrases = [phrase for phrase, count in phrase_counts.most_common(10) if count >= 2]
    if not top_phrases:
        top_phrases = [phrase for phrase, count in phrase_counts.most_common(5)]

    topics = []
    used_indices = set()
    
    for phrase in top_phrases:
        if len(topics) >= max_topics:
            break
            
        matching_comments = []
        for idx, (orig, _) in enumerate(valid_comments):
            if phrase in orig.lower() and idx not in used_indices:
                matching_comments.append((idx, orig))
                
        if len(matching_comments) >= 2:
            cluster_indices = [idx for idx, _ in matching_comments]
            cluster_texts = [orig for _, orig in matching_comments]
            
            for idx in cluster_indices:
                used_indices.add(idx)
                
            topic_title = phrase.title()
            summary = f"Penonton banyak membahas tentang '{phrase}' secara antusias."
            keywords = phrase.split()
            quotes = sorted(cluster_texts, key=lambda c: abs(len(c) - 80))[:2]
            
            topics.append({
                "topic": topic_title,
                "summary": summary,
                "keywords": keywords,
                "quotes": quotes
            })

    if not topics:
        quotes = [c for c in comments if len(c.strip()) > 10][:2]
        topics.append({
            "topic": "Ulasan Umum",
            "summary": "Komentar umum dari penonton mengenai konten video.",
            "keywords": ["ulasan", "konten"],
            "quotes": quotes
        })

    return topics


def extract_topics_gemini(comments: list[str], sentiment: str) -> list[dict] | None:
    from app.core.config import settings
    if not settings.GEMINI_API_KEY or not comments:
        return None
        
    # Sample up to 50 comments
    sampled_comments = comments[:50]
    comments_input = "\n".join([f"- {c}" for c in sampled_comments])
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
    prompt = (
        f"You are an expert YouTube comments sentiment analyzer.\n"
        f"Analyze the following list of YouTube comments which have a {sentiment} sentiment.\n"
        f"Group them into 2-3 distinct topic clusters. For each cluster, provide:\n"
        f"1. topic: A concise topic title (2-4 words in Indonesian)\n"
        f"2. summary: A brief 1-2 sentence summary of what viewers are saying about this topic (in Indonesian)\n"
        f"3. keywords: A list of 3-5 keywords/keyphrases (in Indonesian/English)\n"
        f"4. quotes: 2 direct representative quotes from the comments provided.\n\n"
        f"Respond strictly in JSON format as a list of objects matching this schema:\n"
        f"[\n"
        f"  {{\n"
        f"    \"topic\": \"Judul Topik\",\n"
        f"    \"summary\": \"Ringkasan isi topik.\",\n"
        f"    \"keywords\": [\"keyword1\", \"keyword2\"],\n"
        f"    \"quotes\": [\"kutipan1\", \"kutipan2\"]\n"
        f"  }}\n"
        f"]\n\n"
        f"Do not wrap your response in markdown code blocks like ```json, just return raw JSON text.\n"
        f"Comments:\n{comments_input}"
    )
    
    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    try:
        resp = httpx.post(url, json=payload, timeout=8.0)
        if resp.status_code == 200:
            result = resp.json()
            text_response = result["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            if text_response.startswith("```"):
                lines = text_response.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                text_response = "\n".join(lines).strip()
            
            data = json.loads(text_response)
            if isinstance(data, list):
                return data
    except Exception as e:
        import logging
        logging.getLogger("uvicorn").warning(f"Failed to extract topics with Gemini: {e}")
        
    return None


def extract_topics(comments: list[str], sentiment: str) -> list[dict]:
    """
    Extract topics from comments.
    Attempts Gemini API first, falls back to local statistics.
    """
    topics = extract_topics_gemini(comments, sentiment)
    if topics is not None:
        return topics
    return extract_topics_local(comments)
