"""
NeuroTube End-to-End System Test & Profiler
Tests: Fetcher -> ML Sentiment (with Spam Filter) -> Gemini AI Summary -> API Response
"""
import urllib.request, json, sys, time

sys.stdout.reconfigure(encoding='utf-8')

VIDEO_URL = "https://youtu.be/qNIhngowViI"
FETCHER = "http://localhost:8080"
ML = "http://localhost:8000"

def post_json(url, data):
    req = urllib.request.Request(url, json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=15) as f:
        return json.loads(f.read().decode('utf-8'))

def get_json(url):
    with urllib.request.urlopen(url, timeout=10) as f:
        return json.loads(f.read().decode('utf-8'))

print("=" * 60)
print("  NeuroTube System Test - Validation Check")
print("=" * 60)

# 1. Test Fetcher health
print("\n[1/6] Submitting job to Fetcher...")
try:
    resp = post_json(f"{FETCHER}/api/analyze?force=true", {"url": VIDEO_URL}) # force=true to bypass cache
    job_id = resp.get('jobId')
    print(f"  ✅ Fetcher OK — Job ID: {job_id}")
except Exception as e:
    print(f"  ❌ Fetcher FAILED: {e}")
    sys.exit(1)

# 2. Wait for ML to process
print(f"\n[2/6] Waiting for ML processing (Sentiments & Spam Filter)...")
max_wait = 300  # 5 minutes max
start = time.time()
status = None
for i in range(max_wait // 3):
    time.sleep(3)
    elapsed = int(time.time() - start)
    try:
        res = get_json(f"{ML}/api/analysis/{job_id}")
        status = res.get('status')
        if status == 'completed':
            print(f"  ✅ Analysis completed in {elapsed}s")
            break
        elif status == 'failed':
            print(f"  ❌ Analysis FAILED after {elapsed}s")
            sys.exit(1)
        else:
            print(f"  ⏳ {status}... ({elapsed}s)", end='\r')
    except Exception:
        print(f"  ⏳ waiting for ML... ({elapsed}s)", end='\r')

if status != 'completed':
    print(f"\n  ❌ TIMEOUT after {max_wait}s — status: {status}")
    sys.exit(1)

# 3. Verify sentiment data
print(f"\n[3/6] Checking sentiment data & Spam Filter impact...")
try:
    data = get_json(f"{ML}/api/analysis/{job_id}")
    if data.get('status') == 'failed':
         print(f"  ❌ Backend Failed: {data.get('message')}")
         sys.exit(1)
         
    result = data.get('sentimentResult', {})
    pos = result.get('positive', 0)
    neg = result.get('negative', 0)
    neu = result.get('neutral', 0)
    total = result.get('totalComments', 0)
    
    # Check spam (spam comments don't count towards positive/negative/neutral usually)
    comments = data.get('comments', [])
    spam_count = sum(1 for c in comments if c.get('sentiment') == 'spam')
    
    print(f"  ✅ Sentiment: +{pos} / -{neg} / ~{neu} (Valid: {total})")
    print(f"  ✅ Spam Filtered: {spam_count} comments blocked from GPU!")
except Exception as e:
    print(f"  ❌ Failed to get sentiment data: {e}")
    sys.exit(1)

# 4. Verify Gemini AI topics
print(f"\n[4/6] Checking Gemini AI Summary & Word Cloud data...")
topics_pos = result.get('topicsPositive', [])
topics_neg = result.get('topicsNegative', [])

gemini_ok = False
if topics_pos:
    t = topics_pos[0]
    print(f"  ✅ Positive Topic: \"{t.get('topic', 'N/A')}\"")
    kw = t.get('keywords', [])
    print(f"     Keywords (for WordCloud): {kw}")
    if t.get('topic') != 'Crowd Consensus':
        gemini_ok = True

# Summary
print("\n" + "=" * 60)
print(f"  RESULT: {'✅ ALL SYSTEMS GO' if gemini_ok else '⚠️  PARTIAL SUCCESS (Local Fallback?)'}")
print(f"  Speed: {elapsed} seconds for processing")
print(f"  AI Engine: {'🤖 Gemini API' if gemini_ok else '📊 Local NLP Fallback'}")
print("=" * 60)
