import sys
sys.path.append('.')
from app.core.sentiment.sentiment import analyze_comment

tests = [
    ('Music', 'This song is a masterpiece!'),
    ('Music', 'I can\'t stop listening to this, love from Indonesia!'),
    ('Music', 'The visuals are stunning.'),
    ('News', 'Pemerintah harus bertindak tegas dalam masalah ini.'),
    ('News', 'Kecewa sekali dengan kebijakan baru ini.'),
    ('News', 'Semoga ada jalan keluar yang terbaik.'),
    ('Tech', 'HP-nya bagus tapi harganya terlalu mahal.'),
    ('Tech', 'Baterainya awet banget buat seharian.'),
    ('Tech', 'Jangan beli HP ini, layarnya gampang pecah.')
]

print("-" * 50)
for genre, text in tests:
    res = analyze_comment(text)
    print(f"[{genre:5}] \"{text}\"")
    print(f"        Label: {res['sentiment']} (Score: {res['sentimentScore']})")
print("-" * 50)
