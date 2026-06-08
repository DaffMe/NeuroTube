# -----------------------------------------------------------------------------
# SCRIPT PENGUNDUH MODEL AI (DOWNLOAD MODELS)
# Berfungsi sebagai skrip persiapan (setup) untuk mengunduh model AI dari HuggingFace
# ke dalam memori komputer sebelum server ML dinyalakan pertama kali.
# Mencegah server mati karena timeout (kelamaan download) saat pertama kali menerima request.
# -----------------------------------------------------------------------------
import os # Berfungsi untuk memanipulasi variabel lingkungan sistem
import sys # Berfungsi untuk berinteraksi dengan interpreter Python
from huggingface_hub import snapshot_download # Alat khusus untuk mengunduh model dari HuggingFace

# Matikan animasi bar persentase unduhan agar log di Docker terlihat rapi dan tidak spam
os.environ["HF_HUB_DISABLE_PROGRESS_BAR"] = "1"

print("Downloading INDO-RoBERTa...")
try:
    # Mengunduh model AI khusus sentimen bahasa Indonesia
    # Disimpan di folder khusus (/root/.cache/huggingface/hub) agar bisa digunakan berulang kali
    snapshot_download(repo_id="w11wo/indonesian-roberta-base-sentiment-classifier", cache_dir="/root/.cache/huggingface/hub", local_files_only=False)
    print("INDO-RoBERTa downloaded!")
except Exception as e:
    print(f"Error: {e}")

print("Downloading XLM-RoBERTa...")
try:
    # Mengunduh model AI multibahasa (internasional) untuk menangani komentar bahasa inggris/campuran
    snapshot_download(repo_id="cardiffnlp/twitter-xlm-roberta-base-sentiment", cache_dir="/root/.cache/huggingface/hub", local_files_only=False)
    print("XLM-RoBERTa downloaded!")
except Exception as e:
    print(f"Error: {e}")

print("Done.")
