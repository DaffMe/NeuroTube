import os
import sys
from huggingface_hub import snapshot_download

os.environ["HF_HUB_DISABLE_PROGRESS_BAR"] = "1"

print("Downloading INDO-RoBERTa...")
try:
    snapshot_download(repo_id="w11wo/indonesian-roberta-base-sentiment-classifier", cache_dir="/root/.cache/huggingface/hub", local_files_only=False)
    print("INDO-RoBERTa downloaded!")
except Exception as e:
    print(f"Error: {e}")

print("Downloading XLM-RoBERTa...")
try:
    snapshot_download(repo_id="cardiffnlp/twitter-xlm-roberta-base-sentiment", cache_dir="/root/.cache/huggingface/hub", local_files_only=False)
    print("XLM-RoBERTa downloaded!")
except Exception as e:
    print(f"Error: {e}")

print("Done.")
