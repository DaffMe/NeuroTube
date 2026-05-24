import re
from typing import List

# Pre-compiled regex patterns for performance
URL_PATTERN = re.compile(r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+')
CRYPTO_SCAM_PATTERN = re.compile(
    r'\b(whatsapp|telegram|invest|crypto|bitcoin|btc|eth|ethereum|usdt|profit|guaranteed|binary options|forex|fx trading|investment|earning|investor|mining)\b', 
    re.IGNORECASE
)
SUB4SUB_PATTERN = re.compile(r'\b(sub4sub|subscribe to my channel|check out my channel|pls sub|plz sub|please subscribe)\b', re.IGNORECASE)
PRIZE_SCAM_PATTERN = re.compile(r'\b(giveaway|click the link|win a prize|claim your prize|congratulations you won)\b', re.IGNORECASE)
REPEATING_CHAR_PATTERN = re.compile(r'(.)\1{10,}') # E.g., 'aaaaaaaaaaa'
WHATSAPP_NUMBER_PATTERN = re.compile(r'(\+?\d{1,3}[\s-]?\d{3,}[\s-]?\d{3,})')

def is_spam(text: str) -> bool:
    """
    Lightweight heuristic filter to detect YouTube spam and bot comments.
    Returns True if the comment is considered spam/bot, False otherwise.
    """
    if not text:
        return True

    text_lower = text.lower()
    
    # 1. Purely a link (or mostly a link)
    urls = URL_PATTERN.findall(text)
    if urls:
        # If the text length is very short compared to the URL length, it's just spamming a link
        total_url_len = sum(len(u) for u in urls)
        if total_url_len > (len(text) * 0.7):
            return True
            
    # 2. Sub4Sub / Channel promotion
    if SUB4SUB_PATTERN.search(text_lower):
        return True
        
    # 3. Crypto / Investment scams
    # Require at least 2 distinct crypto/invest keywords to reduce false positives
    # Or an obvious phone number alongside a keyword
    crypto_matches = CRYPTO_SCAM_PATTERN.findall(text_lower)
    if len(set(crypto_matches)) >= 2:
        return True
        
    if crypto_matches and WHATSAPP_NUMBER_PATTERN.search(text):
        return True
        
    # 4. Giveaway / Prize scams
    if PRIZE_SCAM_PATTERN.search(text_lower):
        return True
        
    # 5. Gibberish (Repeating characters massively)
    if REPEATING_CHAR_PATTERN.search(text_lower):
        return True
        
    # 6. Word repetition (e.g. "nice nice nice nice nice nice")
    words = text_lower.split()
    if len(words) >= 6:
        unique_words = set(words)
        # If the number of unique words is very low compared to total words
        if len(unique_words) / len(words) < 0.2:
            return True
            
    # Not flagged as spam
    return False
