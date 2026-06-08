CRYPTO_SCAM_PATTERN = re.compile(
    r'\b(whatsapp|telegram|invest|crypto|bitcoin|btc|eth|ethereum|usdt|profit|guaranteed|binary options|forex|fx trading|investment|earning|investor|mining)\b', 
    re.IGNORECASE
)

# Pola untuk mendeteksi akun pengemis subscriber (Sub4Sub)
SUB4SUB_PATTERN = re.compile(r'\b(sub4sub|subscribe to my channel|check out my channel|pls sub|plz sub|please subscribe)\b', re.IGNORECASE)

# Pola untuk mendeteksi penipuan berkedok hadiah/giveaway
PRIZE_SCAM_PATTERN = re.compile(r'\b(giveaway|click the link|win a prize|claim your prize|congratulations you won)\b', re.IGNORECASE)

# Pola untuk mendeteksi ketikan sembarangan (orang gabut menekan 1 huruf belasan kali, contoh: wkwkwkkkkkkkkkkkkkk)
REPEATING_CHAR_PATTERN = re.compile(r'(.)\1{10,}') # E.g., 'aaaaaaaaaaa'

# Pola untuk mendeteksi nomor handphone yang disamarkan dengan spasi/strip
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
    # Jika komentar isinya 70% hanya sebuah tautan/link, maka anggap spam
    urls = URL_PATTERN.findall(text)
    if urls:
        # If the text length is very short compared to the URL length, it's just spamming a link
        total_url_len = sum(len(u) for u in urls)
        if total_url_len > (len(text) * 0.7):
            return True
            
    # 2. Sub4Sub / Channel promotion
    # Cek apakah dia minta disubscribe balik
    if SUB4SUB_PATTERN.search(text_lower):
        return True
        
    # 3. Crypto / Investment scams
    # Require at least 2 distinct crypto/invest keywords to reduce false positives
    # Or an obvious phone number alongside a keyword
    # Untuk penipuan crypto, pastikan ada minimal 2 kata kunci (contoh: bitcoin + profit) agar tidak salah tangkap orang biasa yang cuma bahas crypto
    crypto_matches = CRYPTO_SCAM_PATTERN.findall(text_lower)
    if len(set(crypto_matches)) >= 2:
        return True
        
    # Atau jika ada 1 kata kunci crypto ditambah nomor HP/WA, itu sudah pasti penipuan
    if crypto_matches and WHATSAPP_NUMBER_PATTERN.search(text):
        return True
        
    # 4. Giveaway / Prize scams
    # Cek penipuan hadiah palsu
    if PRIZE_SCAM_PATTERN.search(text_lower):
        return True
        
    # 5. Gibberish (Repeating characters massively)
    # Cek karakter yang diulang-ulang tanpa arti
    if REPEATING_CHAR_PATTERN.search(text_lower):
        return True
        
    # 6. Word repetition (e.g. "nice nice nice nice nice nice")
    # Cek spam kata yang sama secara berulang kali (contoh komentar bot peningkat engagement)
    words = text_lower.split()
    if len(words) >= 6:
        unique_words = set(words)
        # If the number of unique words is very low compared to total words
        # Jika komentar cukup panjang, tapi isinya cuma kata yang itu-itu saja (variasi katanya < 20%), maka itu bot
        if len(unique_words) / len(words) < 0.2:
            return True
            
    # Not flagged as spam
    # Jika lolos semua jebakan di atas, berarti ini komentar manusia betulan
    return False
