"""
NeuroTube End-to-End System Test & Profiler
Tests: Fetcher -> ML Sentiment (with Spam Filter) -> Gemini AI Summary -> API Response
"""
# -----------------------------------------------------------------------------
# FILE PENGUJIAN OTOMATIS (E2E TEST)
# Berfungsi sebagai naskah (script) python untuk mengetes apakah seluruh sistem (Go + Python + Gemini)
# sudah terhubung dan berjalan dengan normal, seperti layaknya simulasi operasi aslinya.
# -----------------------------------------------------------------------------
import urllib.request, json, sys, time

# Memastikan keluaran teks di terminal tidak error jika mencetak logo Emoji
sys.stdout.reconfigure(encoding='utf-8')

# Variabel konfigurasi pengujian
VIDEO_URL = "https://youtu.be/qNIhngowViI" # Link percobaan
FETCHER = "http://localhost:8080" # URL service Penarik YouTube
ML = "http://localhost:8000" # URL service Machine Learning

# FUNGSI PEMBANTU: Mengirim data ke server (POST Request)
def post_json(url, data):
    req = urllib.request.Request(url, json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=15) as f:
        return json.loads(f.read().decode('utf-8'))

# FUNGSI PEMBANTU: Meminta data dari server (GET Request)
def get_json(url):
    with urllib.request.urlopen(url, timeout=10) as f:
        return json.loads(f.read().decode('utf-8'))

print("=" * 60)
print("  NeuroTube System Test - Validation Check")
print("=" * 60)

# LANGKAH 1: Uji coba apakah server Golang (Fetcher) berhasil menerima pendaftaran tugas
print("\n[1/6] Submitting job to Fetcher...")
try:
    # Memaksa Fetcher menganalisis ulang dengan ?force=true (mengabaikan tembolok/cache database lama)
    resp = post_json(f"{FETCHER}/api/analyze?force=true", {"url": VIDEO_URL}) 
    job_id = resp.get('jobId')
    print(f"  ✅ Fetcher OK — Job ID: {job_id}")
except Exception as e:
    # Jika fetcher mati atau URL YouTube tidak valid, hentikan program paksa (sys.exit(1))
    print(f"  ❌ Fetcher FAILED: {e}")
    sys.exit(1)

# LANGKAH 2: Menunggu Mesin ML merespon via sistem Polling
print(f"\n[2/6] Waiting for ML processing (Sentiments & Spam Filter)...")
max_wait = 300  # Waktu tunggu maksimal 5 menit (Jika lebih, anggap server hang)
start = time.time()
status = None

# Melakukan perulangan pengecekan status tugas setiap 3 detik sekali
for i in range(max_wait // 3):
    time.sleep(3)
    elapsed = int(time.time() - start)
    try:
        # Cek ke database (lewat ML API) apakah statusnya masih 'processing' atau sudah 'completed'
        res = get_json(f"{ML}/api/analysis/{job_id}")
        status = res.get('status')
        if status == 'completed':
            print(f"  ✅ Analysis completed in {elapsed}s")
            break # Berhenti mengecek, analisis sudah selesai
        elif status == 'failed':
            print(f"  ❌ Analysis FAILED after {elapsed}s")
            sys.exit(1)
        else:
            # Animasi terminal: Menimpa baris sebelumnya (\r)
            print(f"  ⏳ {status}... ({elapsed}s)", end='\r')
    except Exception:
        print(f"  ⏳ waiting for ML... ({elapsed}s)", end='\r')

# Jika sudah lebih dari 5 menit tapi masih nyangkut, matikan.
if status != 'completed':
    print(f"\n  ❌ TIMEOUT after {max_wait}s — status: {status}")
    sys.exit(1)

# LANGKAH 3: Verifikasi hasil angka persentase model Machine Learning
print(f"\n[3/6] Checking sentiment data & Spam Filter impact...")
try:
    data = get_json(f"{ML}/api/analysis/{job_id}")
    if data.get('status') == 'failed':
         print(f"  ❌ Backend Failed: {data.get('message')}")
         sys.exit(1)
         
    # Mengumpulkan total sentimennya
    result = data.get('sentimentResult', {})
    pos = result.get('positive', 0)
    neg = result.get('negative', 0)
    neu = result.get('neutral', 0)
    total = result.get('totalComments', 0)
    
    # Check spam: Komentar spam sengaja tidak dijumlahkan pada angka total positif/negatif
    comments = data.get('comments', [])
    spam_count = sum(1 for c in comments if c.get('sentiment') == 'spam')
    
    print(f"  ✅ Sentiment: +{pos} / -{neg} / ~{neu} (Valid: {total})")
    print(f"  ✅ Spam Filtered: {spam_count} comments blocked from GPU!")
except Exception as e:
    print(f"  ❌ Failed to get sentiment data: {e}")
    sys.exit(1)

# LANGKAH 4: Memastikan integrasi API LLM Gemini tidak bermasalah
print(f"\n[4/6] Checking Gemini AI Summary & Word Cloud data...")
topics_pos = result.get('topicsPositive', [])
topics_neg = result.get('topicsNegative', [])

gemini_ok = False
if topics_pos:
    t = topics_pos[0]
    print(f"  ✅ Positive Topic: \"{t.get('topic', 'N/A')}\"")
    kw = t.get('keywords', [])
    print(f"     Keywords (for WordCloud): {kw}")
    
    # "Crowd Consensus" adalah topik statis fallback jika Gemini mati/gagal.
    # Jika teks ini tidak muncul, berarti Gemini di Google Cloud benar-benar bekerja normal.
    if t.get('topic') != 'Crowd Consensus':
        gemini_ok = True

# LANGKAH AKHIR: Rangkuman Kesimpulan Tes (Sukses atau Gagal)
print("\n" + "=" * 60)
print(f"  RESULT: {'✅ ALL SYSTEMS GO' if gemini_ok else '⚠️  PARTIAL SUCCESS (Local Fallback?)'}")
print(f"  Speed: {elapsed} seconds for processing")
print(f"  AI Engine: {'🤖 Gemini API' if gemini_ok else '📊 Local NLP Fallback'}")
print("=" * 60)
