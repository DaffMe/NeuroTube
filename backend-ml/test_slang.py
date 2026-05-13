import sys
sys.path.append('.')
from app.core.sentiment.sentiment import analyze_comment

tests = [
    ('Slang', 'L stream'),
    ('Slang', 'W video'),
    ('Slang', 'common speed W'),
    ('Slang', 'major L'),
    ('Slang', 'W creator'),
    ('Slang', 'L takes')
]

print("-" * 50)
for genre, text in tests:
    res = analyze_comment(text)
    print(f"[{genre:5}] \"{text}\"")
    print(f"        Label: {res['sentiment']} (Score: {res['sentimentScore']})")
print("-" * 50)
