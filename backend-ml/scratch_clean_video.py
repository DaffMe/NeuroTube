import asyncio
from app.db.session import AsyncSessionLocal
from app.db.session import AsyncSessionLocal
from app.models.models import VideoData, CommentData, AnalysisJob, SentimentSummary
from sqlalchemy import delete

async def clean():
    db = AsyncSessionLocal()
    try:
        print("Cleaning video Xc2C0tmt154...")
        await db.execute(delete(CommentData).where(CommentData.video_id == 'Xc2C0tmt154'))
        await db.execute(delete(AnalysisJob).where(AnalysisJob.video_id == 'Xc2C0tmt154'))
        await db.execute(delete(SentimentSummary).where(SentimentSummary.video_id == 'Xc2C0tmt154'))
        await db.execute(delete(VideoData).where(VideoData.id == 'Xc2C0tmt154'))
        await db.commit()
        print("Done!")
    except Exception as e:
        print(f"Error: {e}")
        await db.rollback()
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(clean())
