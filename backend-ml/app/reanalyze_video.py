# -----------------------------------------------------------------------------
# SCRIPT ANALISIS ULANG (REANALYZE VIDEO)
# Berfungsi sebagai alat (tools) bantuan admin untuk menghitung ulang sentimen
# seluruh komentar dari sebuah video secara manual, jika terjadi error sebelumnya.
# -----------------------------------------------------------------------------
import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.models import CommentData, SentimentSummary
from app.core.sentiment.sentiment import analyze_comment

async def reanalyze_video(video_id: str):
    # Membuka jalur komunikasi (koneksi) ke database
    async with AsyncSessionLocal() as db:
        print(f"🔄 Reanalyzing comments for video: {video_id}...")
        
        # LANGKAH 1: Mengambil (Fetch) seluruh komentar mentah dari video tersebut di database
        result = await db.execute(
            select(CommentData).where(CommentData.video_id == video_id)
        )
        comments = result.scalars().all()
        print(f"Found {len(comments)} comments in database.")
        
        # Variabel pencatat skor
        positive = 0
        negative = 0
        neutral = 0
        total_score = 0.0
        
        # LANGKAH 2: Menganalisis ulang satu per satu komentar menggunakan AI HuggingFace
        for comment in comments:
            # Ambil teks aslinya, atau teks terjemahan jika ada
            text = comment.text_original or comment.text_display or ""
            
            if text.strip():
                # Masukkan ke Mesin AI Sentimen
                res = analyze_comment(text)
                comment.sentiment = res["sentiment"]
                comment.sentiment_score = res["sentimentScore"]
            else:
                # Jika komentarnya ternyata kosong (misal cuma isi emoji yang tak terbaca)
                comment.sentiment = "neutral"
                comment.sentiment_score = 0.0
                
            # Tambahkan ke papan skor
            if comment.sentiment == "positive":
                positive += 1
            elif comment.sentiment == "negative":
                negative += 1
            else:
                neutral += 1
            total_score += comment.sentiment_score
            
        # Simpan perubahan setiap komentar secara permanen ke database
        await db.commit()
        print(f"Updated comments in database: +{positive} / -{negative} / ~{neutral}")
        
        # LANGKAH 3: Memperbarui papan rangkuman total (Summary) dari video ini
        total = len(comments)
        avg_score = round(total_score / total if total > 0 else 0.0, 4)
        
        # Cari apakah video ini sudah punya rangkuman sebelumnya
        sum_result = await db.execute(
            select(SentimentSummary).where(SentimentSummary.video_id == video_id)
        )
        summary = sum_result.scalars().first()
        
        if summary:
            # Jika sudah ada, cukup timpa nilainya dengan yang baru
            summary.positive = positive
            summary.negative = negative
            summary.neutral = neutral
            summary.total_comments = total
            summary.average_score = avg_score
            print("Updated sentiment summary in database.")
        else:
            # Jika belum pernah dirangkum sama sekali, buat data rangkuman baru
            summary = SentimentSummary(
                video_id=video_id,
                positive=positive,
                negative=negative,
                neutral=neutral,
                total_comments=total,
                average_score=avg_score
            )
            db.add(summary)
            print("Created new sentiment summary in database.")
            
        # Simpan pembaruan rangkuman ke database
        await db.commit()
        print("✅ Reanalysis complete!")

# -----------------------------------------------------------------------------
# TITIK AWAL EKSEKUSI (ENTRY POINT)
# Jika file ini dijalankan langsung via terminal (misal: python reanalyze_video.py <ID_VIDEO>)
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    # Ambil ID YouTube dari ketikan pengguna, jika tidak ada, gunakan video default
    vid = sys.argv[1] if len(sys.argv) > 1 else "dQw4w9WgXcQ"
    # Jalankan proses asinkron (karena asyncio tidak bisa langsung di-run begitu saja di Python)
    asyncio.run(reanalyze_video(vid))
