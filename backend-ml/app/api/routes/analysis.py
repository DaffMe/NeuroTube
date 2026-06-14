"""
API routes for the NeuroTube ML backend.

Provides endpoints for the frontend to:
- Get analysis results by job ID
- Get analysis results by video ID
- Get analysis history
- Health check
"""

from datetime import datetime # Fungsi dasar Python untuk merekam tanggal dan waktu akses
from typing import Optional # Mengizinkan parameter fungsi atau rute untuk tidak diisi (opsional)

from fastapi import APIRouter, Depends, HTTPException, Query # Pustaka FastAPI untuk membuat gerbang rute, melempar error HTTP, dan menangkap parameter URL
from pydantic import BaseModel
import uuid
from sqlalchemy.ext.asyncio import AsyncSession # Menjamin koneksi database asinkron tidak saling bertabrakan

from app.db.session import get_db # Modul internal yang bertugas membuka dan menutup brankas database setiap kali ada request
from app.crud import crud # Modul internal berisi fungsi perantara manipulasi data SQL (Create, Read, Update, Delete)
import redis.asyncio as aioredis # Pustaka klien untuk membaca antrean RAM pada server Redis secara asinkron
from app.core.config import settings # Konfigurasi pusat yang menyimpan alamat peladen (Host) Redis

# Router berfungsi sebagai sub-aplikasi yang mengatur sekelompok endpoint tertentu (seperti Controller di pola MVC)
router = APIRouter()


@router.get("/health")
async def health():
    """Health check endpoint."""
    # Endpoint untuk mengecek apakah server ini masih hidup atau crash
    return {
        "status": "ok",
        "service": "NeuroTube-ml",
        "time": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/analysis/{job_id}")
async def get_analysis_by_job(
    job_id: str, db: AsyncSession = Depends(get_db)
):
    """
    Get analysis results by job ID.
    Returns the full AnalysisResponse matching the frontend interface.
    """
    # Mencari status pekerjaan berdasarkan ID job dari database
    job = await crud.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Jika masih dihitung/diproses, tolak permintaan data lengkap tapi kembalikan statusnya ke frontend
    if job.status == "processing" or job.status == "analyzing":
        return {
            "status": job.status,
            "jobId": job.id,
            "videoId": job.video_id,
            "message": "Analysis in progress...",
        }

    # Jika sempat crash atau gagal, lempar peringatan error 500 (Internal Server Error)
    if job.status == "failed":
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {job.error_message or 'Unknown error'}",
        )

    # Job completed — return full results
    # Jika sudah 'completed', rakit datanya dan kirimkan format lengkap ke frontend
    return await _build_analysis_response(db, job.video_id, job.id)


@router.get("/analysis/video/{video_id}")
async def get_analysis_by_video(
    video_id: str, db: AsyncSession = Depends(get_db)
):
    """
    Get analysis results by YouTube video ID.
    Looks up the latest completed job for this video.
    """
    # Mirip endpoint di atas, bedanya ini dicari menggunakan URL ID videonya langsung dari YouTube
    job = await crud.get_job_by_video(db, video_id)
    if not job:
        raise HTTPException(status_code=404, detail="No analysis found for this video")

    if job.status != "completed":
        return {
            "status": job.status,
            "jobId": job.id,
            "videoId": job.video_id,
            "message": f"Analysis status: {job.status}",
        }

    return await _build_analysis_response(db, video_id, job.id)


@router.get("/history")
async def get_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Get analysis history — list of previously analyzed videos.
    Returns data matching the frontend AnalyzedVideo[] interface.
    """
    # Mengambil daftar histori riwayat video yang sudah pernah dianalisis orang lain
    # Mendukung 'Limit' (batas jumlah halaman) dan 'Offset' (mulai dari baris ke berapa) untuk fitur Pagination Dashboard
    history = await crud.get_analysis_history(db, limit=limit, offset=offset)
    return history


@router.delete("/history")
async def clear_history(db: AsyncSession = Depends(get_db)):
    """
    Clear all analysis history from the database.
    Deletes jobs, summaries, and video metadata records.
    """
    # Menghapus seluruh memori di database PostgreSQL jika pengguna ingin cuci gudang/restart
    await crud.clear_all_data(db)
    return {"message": "All history cleared successfully"}


@router.delete("/history/{video_id}")
async def delete_history_item(video_id: str, db: AsyncSession = Depends(get_db)):
    """
    Delete a specific video and all its analysis results from history.
    Also deletes its Redis cache.
    """
    # Menghapus riwayat spesifik untuk 1 buah video saja
    await crud.delete_video_data(db, video_id)
    
    # Delete from Redis cache
    # Pastikan data di memori sementara Redis juga ikut dihapus (Invalidate Cache) agar saat dicari ulang, sistem akan mengambil ulang dari awal
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL)
        await redis_client.delete(f"neurotube:cache:{video_id}")
        await redis_client.close()
    except Exception as e:
        pass
        
    return {"message": f"History for video {video_id} deleted successfully"}


@router.get("/comments/{video_id}")
async def get_comments(
    video_id: str,
    sentiment: Optional[str] = Query(None), # Memungkinkan filter: hanya mencari komen Positif / Negatif saja
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated comments for a video with optional sentiment filter.
    
    This endpoint retrieves video comments in pages (pagination).
    'video_id': The YouTube video ID.
    'sentiment': Optional, filter comments by sentiment (e.g., 'positive', 'negative').
    'limit': Number of comments per page (default 100).
    'offset': Starting index for data retrieval (for pagination).
    """
    # Endpoint ini khusus untuk memuat isi komentarnya saja secara bertahap saat di-scroll di Frontend
    comments = await crud.get_comments_by_video(
        db, video_id, sentiment_filter=sentiment, limit=limit, offset=offset
    )
    # Menghitung total seluruh komentar agar komponen Paginasi di Frontend tau batas akhirnya
    total = await crud.count_comments_by_video(db, video_id, sentiment_filter=sentiment)

    return {
        "comments": [
            {
                "id": c.id,
                "authorDisplayName": c.author_display_name,
                "authorProfileImageUrl": c.author_profile_image_url,
                "textDisplay": c.text_display,
                "likeCount": c.like_count,
                "publishedAt": c.published_at,
                "sentiment": c.sentiment,
                "sentimentScore": c.sentiment_score,
            }
            for c in comments
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
        "hasMore": (offset + len(comments)) < total, # Boolean True/False untuk menandakan apakah masih ada sisa komentar untuk tombol Load More
    }


# ── Simple Keyword-based Sentiment Analysis (Assignment Requirement B) ──

def analyze_sentiment_keyword(text: str):
    """
    Sistem melakukan analisis sentimen komentar secara sederhana 
    berdasarkan kata kunci positif dan negatif.
    """
    text_lower = text.lower()
    positive_words = ["bagus", "keren", "mantap", "hebat", "suka", "terbaik", "kreatif", "bermanfaat", "good", "awesome", "amazing", "love"]
    negative_words = ["jelek", "buruk", "parah", "sampah", "benci", "mengecewakan", "bad", "terrible", "awful", "boring", "hate"]
    
    pos_count = sum(1 for word in positive_words if word in text_lower)
    neg_count = sum(1 for word in negative_words if word in text_lower)
    
    if pos_count > neg_count:
        return "positive", 0.8
    elif neg_count > pos_count:
        return "negative", -0.8
    else:
        return "neutral", 0.0

class CommentCreate(BaseModel):
    authorName: str
    text: str

class CommentUpdate(BaseModel):
    text: str

@router.post("/comments/{video_id}")
async def create_comment(
    video_id: str,
    payload: CommentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new manual comment with simple keyword sentiment."""
    sentiment, score = analyze_sentiment_keyword(payload.text)
    comment_id = f"manual_{uuid.uuid4().hex}"
    
    comment = await crud.create_user_comment(
        db, 
        video_id=video_id,
        comment_id=comment_id,
        author_name=payload.authorName,
        text=payload.text,
        sentiment=sentiment,
        sentiment_score=score
    )
    
    return {
        "id": comment.id,
        "authorDisplayName": comment.author_display_name,
        "authorProfileImageUrl": comment.author_profile_image_url,
        "textDisplay": comment.text_display,
        "likeCount": comment.like_count,
        "publishedAt": comment.published_at,
        "sentiment": comment.sentiment,
        "sentimentScore": comment.sentiment_score,
    }

@router.put("/comments/{comment_id}")
async def update_comment(
    comment_id: str,
    payload: CommentUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing comment and re-evaluate its sentiment."""
    sentiment, score = analyze_sentiment_keyword(payload.text)
    
    updated = await crud.update_user_comment(
        db,
        comment_id=comment_id,
        new_text=payload.text,
        new_sentiment=sentiment,
        new_score=score
    )
    
    if not updated:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    return {
        "id": updated.id,
        "authorDisplayName": updated.author_display_name,
        "textDisplay": updated.text_display,
        "sentiment": updated.sentiment,
        "sentimentScore": updated.sentiment_score,
    }

@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a manual comment."""
    deleted = await crud.delete_user_comment(db, comment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"message": "Comment deleted successfully"}


# ── Private helpers ───────────────────────────────────────────────


async def _build_analysis_response(
    db: AsyncSession, video_id: str, job_id: str
) -> dict:
    """
    Build the full AnalysisResponse matching the frontend interface:
    { videoInfo, comments, sentimentResult }
    """
    # Fungsi pembantu rahasia (private) untuk mengkompilasi data video, rangkuman skor AI, dan ribuan komentar menjadi 1 paket besar
    video = await crud.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video data not found")

    summary = await crud.get_sentiment_summary(db, video_id)
    comments = await crud.get_comments_by_video(db, video_id, limit=10000)

    # Mengemasnya ke dalam struktur Map/Dictionary (akan otomatis diubah jadi JSON oleh FastAPI saat dikirim)
    return {
        "jobId": job_id,
        "status": "completed",
        "videoInfo": {
            "id": video.id,
            "title": video.title,
            "channelTitle": video.channel_title,
            "thumbnail": video.thumbnail,
            "publishedAt": video.published_at,
            "viewCount": video.view_count,
            "likeCount": video.like_count,
            "commentCount": video.comment_count,
            "description": video.description,
        },
        "comments": [
            {
                "id": c.id,
                "authorDisplayName": c.author_display_name,
                "authorProfileImageUrl": c.author_profile_image_url,
                "textDisplay": c.text_display,
                "textOriginal": c.text_original,
                "likeCount": c.like_count,
                "publishedAt": c.published_at,
                "sentiment": c.sentiment,
                "sentimentScore": c.sentiment_score,
                "isReply": c.is_reply,
                "parentId": c.parent_id,
            }
            for c in comments
        ],
        "sentimentResult": {
            "positive": summary.positive if summary else 0,
            "negative": summary.negative if summary else 0,
            "neutral": summary.neutral if summary else 0,
            "totalComments": summary.total_comments if summary else 0,
            "averageScore": summary.average_score if summary else 0.0,
            "topicsPositive": summary.topics_positive if summary else None,
            "topicsNegative": summary.topics_negative if summary else None,
        },
    }
