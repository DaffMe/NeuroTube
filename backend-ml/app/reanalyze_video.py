import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.models import CommentData, SentimentSummary
from app.core.sentiment.sentiment import analyze_comment

async def reanalyze_video(video_id: str):
    async with AsyncSessionLocal() as db:
        print(f"🔄 Reanalyzing comments for video: {video_id}...")
        
        # 1. Fetch all comments for the video
        result = await db.execute(
            select(CommentData).where(CommentData.video_id == video_id)
        )
        comments = result.scalars().all()
        print(f"Found {len(comments)} comments in database.")
        
        positive = 0
        negative = 0
        neutral = 0
        total_score = 0.0
        
        # 2. Re-analyze each comment
        for comment in comments:
            text = comment.text_original or comment.text_display or ""
            if text.strip():
                res = analyze_comment(text)
                comment.sentiment = res["sentiment"]
                comment.sentiment_score = res["sentimentScore"]
            else:
                comment.sentiment = "neutral"
                comment.sentiment_score = 0.0
                
            if comment.sentiment == "positive":
                positive += 1
            elif comment.sentiment == "negative":
                negative += 1
            else:
                neutral += 1
            total_score += comment.sentiment_score
            
        await db.commit()
        print(f"Updated comments in database: +{positive} / -{negative} / ~{neutral}")
        
        # 3. Update or create sentiment summary
        total = len(comments)
        avg_score = round(total_score / total if total > 0 else 0.0, 4)
        
        sum_result = await db.execute(
            select(SentimentSummary).where(SentimentSummary.video_id == video_id)
        )
        summary = sum_result.scalars().first()
        if summary:
            summary.positive = positive
            summary.negative = negative
            summary.neutral = neutral
            summary.total_comments = total
            summary.average_score = avg_score
            print("Updated sentiment summary in database.")
        else:
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
            
        await db.commit()
        print("✅ Reanalysis complete!")

if __name__ == "__main__":
    import sys
    vid = sys.argv[1] if len(sys.argv) > 1 else "dQw4w9WgXcQ"
    asyncio.run(reanalyze_video(vid))
