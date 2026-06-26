"""
Topic extraction and summarization module for NeuroTube.
Supports Gemini API and local NLP extractive summarization fallback.
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
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    text = re.sub(r'[^\w\s]', '', text.lower())
    words = text.split()
    return [w for w in words if w not in STOPWORDS and len(w) > 2]
def extract_topics_local(comments: list[str]) -> list[dict]:
    if not comments:
        return []
    if len(comments) > 500:
        comments = comments[:500]
    cleaned_comments = [clean_text(c) for c in comments]
    valid_comments = [(comments[i], cleaned_comments[i]) for i in range(len(comments)) if cleaned_comments[i]]
    if not valid_comments:
        return [{
            "topic": "General Overview",
            "summary": "Viewers are discussing the video, but no distinct keywords could be extracted locally.",
            "keywords": ["video", "comments"],
            "quotes": comments[:2]
        }]
    all_words = []
    for _, words in valid_comments:
        all_words.extend(words)
    word_freq = Counter(all_words)
    top_keywords = [word for word, count in word_freq.most_common(5)]
    scored_comments = []
    for orig_c, words in valid_comments:
        if len(words) < 4:
            continue
        unique_words = set(words)
        score = sum(word_freq[w] for w in unique_words) / len(unique_words)
        scored_comments.append((score, orig_c))
    scored_comments.sort(reverse=True, key=lambda x: x[0])
    if not scored_comments:
        best_comment = valid_comments[0][0]
        quotes = [c for c, _ in valid_comments[1:3]]
    else:
        best_comment = scored_comments[0][1]
        quotes = [c for _, c in scored_comments[1:3]] if len(scored_comments) > 1 else [best_comment]
    summary_text = f"Based on local NLP analysis, the most representative viewpoint shared by the crowd is encapsulated in this thought: \"{best_comment}\""
    return [{
        "topic": "Crowd Consensus",
        "summary": summary_text,
        "keywords": top_keywords,
        "quotes": quotes
    }]
async def extract_topics_gemini(comments: list[str], sentiment: str) -> list[dict] | None:
    from app.core.config import settings
    if not settings.GEMINI_API_KEY or not comments:
        return None
    sampled_comments = comments[:50]
    comments_input = "\n".join([f"- {c}" for c in sampled_comments])
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
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
        async with httpx.AsyncClient(http2=False, timeout=60.0) as client:
            resp = await client.post(url, json=payload)
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
async def extract_topics(comments: list[str], sentiment: str) -> list[dict]:
    """
    Extract topics from comments.
    Attempts Gemini API first, falls back to local statistics.
    """
    topics = await extract_topics_gemini(comments, sentiment)
    if topics is not None:
        return topics
    return extract_topics_local(comments)