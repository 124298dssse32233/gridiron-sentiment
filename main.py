"""
Gridiron Intel Sentiment Service
=================================

A Python microservice that collects and analyzes CFB sentiment from:
- Bluesky firehose (real-time fan posts)
- Reddit CFB subreddits
- News articles (ESPN, CBS Sports)
- Google Trends search volume

Processes sentiment using VADER + DistilBERT and stores to PostgreSQL.
Runs on Railway with cron-based processing every 6 hours.

Environment Variables:
    DATABASE_URL: PostgreSQL connection string
    REDIS_URL: Redis URL for caching (optional)
"""

import os
import asyncio
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Import models
from models import (
    SentimentRaw, TeamSentiment, PlayerSentiment,
    TeamBuzz, CoachApproval, SentimentStory,
    Team, Season, Base
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="Gridiron Intel Sentiment Service",
    description="CFB Sentiment Analysis Microservice",
    version="1.0.0"
)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.warning("DATABASE_URL not set - using mock mode")

engine = None
SessionLocal = None
if DATABASE_URL:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ============================================================================
# API Schemas
# ============================================================================

class ProcessRequest(BaseModel):
    """Request to trigger sentiment processing"""
    season: int = Field(default=2024, description="Season year")
    week: Optional[int] = Field(default=None, description="Week number (None for current)")
    sources: List[str] = Field(
        default=["bluesky", "reddit", "news", "trends"],
        description="Data sources to process"
    )
    force: bool = Field(default=False, description="Force re-processing")


class ProcessResponse(BaseModel):
    """Response from sentiment processing"""
    success: bool
    message: str
    stats: Optional[Dict[str, Any]] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    database: bool
    timestamp: str


# ============================================================================
# Sentiment Pipeline (Simplified)
# ============================================================================

async def process_sentiment_pipeline(
    db: Session,
    season: int,
    week: Optional[int],
    sources: List[str]
) -> Dict[str, Any]:
    """
    Run the full sentiment pipeline.

    1. Collect data from sources
    2. Analyze sentiment with NLP
    3. Extract entities and aggregate
    4. Generate stories
    """
    stats = {}

    try:
        # Step 1: Collect data
        for source in sources:
            if source == "bluesky":
                from collectors.bluesky_collector import BlueskyCollector
                collector = BlueskyCollector(db)
                count = await collector.collect(season, week)
                stats["bluesky_collected"] = count

            elif source == "reddit":
                from collectors.reddit_collector import RedditCollector
                collector = RedditCollector(db)
                count = await collector.collect(season, week)
                stats["reddit_collected"] = count

            elif source == "news":
                from collectors.news_collector import NewsCollector
                collector = NewsCollector(db)
                count = await collector.collect(season, week)
                stats["news_collected"] = count

            elif source == "trends":
                from collectors.trends_collector import TrendsCollector
                collector = TrendsCollector(db)
                count = await collector.collect(season, week)
                stats["trends_collected"] = count

        # Step 2: Analyze sentiment
        from analyzers.nlp_analyzer import NLPAnalyzer
        nlp = NLPAnalyzer(db)
        nlp.load_models()
        processed = await nlp.process_raw_data()
        stats["posts_analyzed"] = processed

        # Step 3: Extract entities and aggregate
        from analyzers.entity_extractor import EntityExtractor
        extractor = EntityExtractor(db)
        teams_updated = await extractor.extract_and_aggregate()
        stats["teams_updated"] = teams_updated

        players_updated = await extractor.extract_players()
        stats["players_updated"] = players_updated

        # Step 4: Generate stories (if week specified)
        if week is not None:
            from analyzers.story_generator import StoryGenerator
            generator = StoryGenerator(db)
            stories = await generator.generate_weekly_stories(season, week)
            stats["stories_generated"] = len(stories)

        return stats

    except Exception as e:
        logger.error(f"Error in pipeline: {e}", exc_info=True)
        raise


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    db_ok = False
    if engine:
        try:
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            db_ok = True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")

    return HealthResponse(
        status="healthy" if db_ok else "unhealthy",
        database=db_ok,
        timestamp=datetime.utcnow().isoformat()
    )


@app.post("/process", response_model=ProcessResponse)
async def process_sentiment(request: ProcessRequest, background_tasks: BackgroundTasks):
    """
    Trigger sentiment processing.

    This endpoint collects data from sources, analyzes sentiment,
    and updates the database with aggregated results.
    """
    if not SessionLocal:
        return ProcessResponse(
            success=False,
            message="Database not configured"
        )

    db = SessionLocal()
    try:
        stats = await process_sentiment_pipeline(
            db,
            request.season,
            request.week,
            request.sources
        )

        return ProcessResponse(
            success=True,
            message=f"Processed sentiment data for {request.season}",
            stats=stats
        )

    except Exception as e:
        logger.error(f"Error processing sentiment: {e}", exc_info=True)
        return ProcessResponse(
            success=False,
            message=str(e)
        )
    finally:
        db.close()


@app.get("/stats")
async def get_stats():
    """Get sentiment processing statistics"""
    if not SessionLocal:
        return {"error": "Database not configured"}

    db = SessionLocal()
    try:
        # Get counts from tables
        raw_count = db.query(SentimentRaw).filter_by(processed=False).count()
        team_sentiment_count = db.query(TeamSentiment).count()
        player_sentiment_count = db.query(PlayerSentiment).count()

        # Get latest measurement
        latest = db.query(TeamSentiment).order_by(TeamSentiment.measuredAt.desc()).first()

        return {
            "raw_unprocessed": raw_count,
            "team_sentiments": team_sentiment_count,
            "player_sentiments": player_sentiment_count,
            "latest_measurement": latest.measuredAt.isoformat() if latest else None
        }
    finally:
        db.close()


# ============================================================================
# Cron Job Handler
# ============================================================================

@app.post("/cron/process")
async def cron_process():
    """
    Cron job endpoint for Railway scheduled tasks.

    Run every 6 hours during season to process sentiment data.
    """
    logger.info("Cron job triggered: processing sentiment")

    # Determine current season/week
    now = datetime.utcnow()
    season = now.year if now.month >= 8 else now.year - 1
    week = None  # Let it auto-determine

    if not SessionLocal:
        return {"success": False, "message": "Database not configured"}

    db = SessionLocal()
    try:
        stats = await process_sentiment_pipeline(
            db,
            season,
            week,
            ["bluesky", "reddit", "news"]  # Skip trends (daily only)
        )

        return {"success": True, "stats": stats}

    except Exception as e:
        logger.error(f"Cron job failed: {e}", exc_info=True)
        return {"success": False, "message": str(e)}
    finally:
        db.close()


# ============================================================================
# Startup
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize service on startup"""
    logger.info("Starting Gridiron Intel Sentiment Service")

    if DATABASE_URL and engine:
        try:
            # Test database connection
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            logger.info("Database connection established")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")

    # Initialize NLP models
    try:
        from analyzers.nlp_analyzer import NLPAnalyzer
        NLPAnalyzer.load_models()
        logger.info("NLP models loaded")
    except Exception as e:
        logger.warning(f"Failed to load NLP models: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Gridiron Intel Sentiment Service")

    if engine:
        engine.dispose()


# ============================================================================
# Main entry point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENVIRONMENT") == "development"
    )
