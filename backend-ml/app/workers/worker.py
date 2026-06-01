"""
Redis consumer worker for NeuroTube.

Listens on the 'neurotube:jobs' queue (BRPOP) for jobs published by the Go fetcher.
For each job:
  1. Runs VADER sentiment analysis on every comment
  2. Computes aggregate sentiment metrics
  3. Saves results to PostgreSQL
  4. Updates job status in Redis to 'completed'
"""

import asyncio
import json
import logging
import redis.asyncio as aioredis

from app.core.config import settings
from app.core.sentiment.sentiment import analyze_comment, analyze_comment_async
from app.crud import crud
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

QUEUE_KEY = "neurotube:jobs"
STATUS_PREFIX = "neurotube:status:"


async def process_job(job_data: dict):
    """
    Process a single analysis job:
    1. Save video metadata to DB
    2. Analyze each comment with VADER
    3. Save comments with sentiment to DB
    4. Compute and save sentiment summary
    5. Update job status
    """
    job_id = job_data["jobId"]
    video_id = job_data["videoId"]
    video_info = job_data["videoInfo"]
    raw_comments = job_data["comments"]

    logger.info(f"🔬 [{job_id}] Processing {len(raw_comments)} comments for video {video_id}")

    async with AsyncSessionLocal() as db:
        try:
            # 1. Create job record
            await crud.create_job(db, job_id, video_id)

            # Update status to analyzing
            redis_client = aioredis.from_url(settings.REDIS_URL)
            await redis_client.set(STATUS_PREFIX + job_id, "analyzing", ex=3600)

            # 2. Save video metadata
            await crud.save_video(db, video_info)

            # 3. Analyze sentiment for each comment
            import httpx
            
            analyzed_comments = []
            total_comments_to_analyze = len(raw_comments)
            
            async with httpx.AsyncClient() as client:
                # Use a larger semaphore size to maximize local GPU utilization
                # We want to feed as many comments concurrently as possible to hit 90%+ GPU load
                sem_size = 200
                semaphore = asyncio.Semaphore(sem_size)
                completed_count = 0
                last_percent = 50
                progress_lock = asyncio.Lock()
                from app.core.sentiment.spam import is_spam
                
                async def sem_analyze(comment_obj, index):
                    nonlocal completed_count, last_percent
                    text = comment_obj.get("textOriginal") or comment_obj.get("textDisplay", "")
                    
                    if text.strip():
                        if is_spam(text):
                            comment_obj["sentiment"] = "spam"
                            comment_obj["sentimentScore"] = 0.0
                        else:
                            async with semaphore:
                                sentiment_result = await analyze_comment_async(text, client)
                            comment_obj["sentiment"] = sentiment_result["sentiment"]
                            comment_obj["sentimentScore"] = sentiment_result["sentimentScore"]
                    else:
                        comment_obj["sentiment"] = "neutral"
                        comment_obj["sentimentScore"] = 0.0
                        
                    # Ensure fields match DB model naming (snake_case)
                    comment_obj["text_original"] = comment_obj.get("textOriginal", "")
                    comment_obj["is_reply"] = comment_obj.get("isReply", False)
                    comment_obj["parent_id"] = comment_obj.get("parentId")
                    
                    async with progress_lock:
                        completed_count += 1
                        if total_comments_to_analyze > 0:
                            ml_percent = int(50 + (completed_count / total_comments_to_analyze) * 40)  # range 50% - 90%
                            if ml_percent > last_percent or completed_count == total_comments_to_analyze:
                                last_percent = ml_percent
                                await redis_client.set(f"neurotube:progress:{job_id}", ml_percent, ex=3600)
                            
                    return comment_obj

                tasks = [sem_analyze(c, idx) for idx, c in enumerate(raw_comments)]
                analyzed_comments = await asyncio.gather(*tasks)

            # Eliminate spam/bot comments so they don't pollute the DB or statistics
            analyzed_comments = [c for c in analyzed_comments if c.get("sentiment") != "spam"]

            # 4. Save analyzed comments to DB
            saved_count = await crud.save_comments_batch(db, video_id, analyzed_comments)
            logger.info(f"💾 [{job_id}] Saved {saved_count} new comments to DB")
            await redis_client.set(f"neurotube:progress:{job_id}", 90, ex=3600)

            # Extract topics for positive and negative comments
            pos_comment_texts = [
                c.get("text_original") or c.get("textDisplay", "")
                for c in analyzed_comments
                if c["sentiment"] == "positive"
            ]
            neg_comment_texts = [
                c.get("text_original") or c.get("textDisplay", "")
                for c in analyzed_comments
                if c["sentiment"] == "negative"
            ]
            pos_comment_texts = [t for t in pos_comment_texts if t.strip()]
            neg_comment_texts = [t for t in neg_comment_texts if t.strip()]

            from app.core.topics import extract_topics
            topics_positive = await extract_topics(pos_comment_texts, "positive")
            topics_negative = await extract_topics(neg_comment_texts, "negative")
            await redis_client.set(f"neurotube:progress:{job_id}", 95, ex=3600)

            # 5. Compute and save sentiment summary
            positive = sum(1 for c in analyzed_comments if c["sentiment"] == "positive")
            negative = sum(1 for c in analyzed_comments if c["sentiment"] == "negative")
            neutral = sum(1 for c in analyzed_comments if c["sentiment"] == "neutral")
            total = len(analyzed_comments)
            avg_score = (
                sum(c["sentimentScore"] for c in analyzed_comments) / total
                if total > 0
                else 0.0
            )

            await crud.save_sentiment_summary(
                db,
                video_id=video_id,
                positive=positive,
                negative=negative,
                neutral=neutral,
                total_comments=total,
                average_score=round(avg_score, 4),
                topics_positive=topics_positive,
                topics_negative=topics_negative,
            )

            # 6. Update job status to completed
            await crud.update_job_status(db, job_id, "completed")
            await redis_client.set(STATUS_PREFIX + job_id, "completed", ex=3600)
            await redis_client.set(f"neurotube:progress:{job_id}", 100, ex=3600)
            
            # Save cache entry with 24 hour TTL (Quota Guard)
            await redis_client.set(f"neurotube:cache:{video_id}", job_id, ex=86400)

            logger.info(
                f"✅ [{job_id}] Analysis complete: "
                f"+{positive} / -{negative} / ~{neutral} ({total} total)"
            )

            await redis_client.close()

        except Exception as e:
            logger.exception(f"❌ [{job_id}] Failed to process job: {e}")
            try:
                await crud.update_job_status(db, job_id, "failed", str(e))
                redis_client = aioredis.from_url(settings.REDIS_URL)
                await redis_client.set(STATUS_PREFIX + job_id, f"failed:{e}", ex=3600)
                await redis_client.close()
            except Exception:
                pass


async def worker_loop():
    """
    Main worker loop. Uses BRPOP to block-wait for new jobs from Redis.
    Runs in a background asyncio task.
    """
    logger.info("🔄 Redis worker started — waiting for jobs...")

    redis_client = aioredis.from_url(settings.REDIS_URL)

    while True:
        try:
            # BRPOP blocks until a message is available (timeout 5s to allow shutdown)
            result = await redis_client.brpop(QUEUE_KEY, timeout=5)
            if result is None:
                continue

            _, raw_data = result
            job_data = json.loads(raw_data)

            logger.info(f"📨 Received job: {job_data.get('jobId', 'unknown')}")

            # Process asynchronously
            await process_job(job_data)

        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to decode job data: {e}")
        except Exception as e:
            logger.error(f"❌ Worker error: {e}")
            await asyncio.sleep(2)  # Brief backoff on error


def start_worker():
    """Start the worker in the current event loop."""
    loop = asyncio.get_event_loop()
    loop.create_task(worker_loop())
