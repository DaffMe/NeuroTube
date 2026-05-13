import sys
sys.path.append('.')
from app.core.sentiment.sentiment import analyze_comment

tests = [
    ('MrBeast', 'This is insanity! Best video ever.'),
    ('MrBeast', 'Jimmy is an absolute madman.'),
    ('Vtuber', 'Evil Neuro is healing my soul.'),
    ('Gaming', 'He is cracked at Fortnite my guy.'),
    ('Speed', 'Speed is literally the goat.'),
    ('General', 'This edit is fire 🔥')
]

print("-" * 50)
for genre, text in tests:
    res = analyze_comment(text)
    print(f"[{genre:7}] \"{text}\"")
    print(f"         Label: {res['sentiment']} (Score: {res['sentimentScore']})")
print("-" * 50)
