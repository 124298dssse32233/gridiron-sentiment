h"""
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
    PORT: Server port (default 8000, Railway overrides this)
    ENVIRONMENT: "production" or "development"
    LOG_LEVEL: Logging level (default INFO)
"""

import os
import sys
import time
import asyncio
import logging
from datetime import datetime, timezone
from contextlib import contextmanager
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import httpx
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

# Import models
from models import (
    SentimentRaw, TeamSentiment, PlayerSentiment,
    TeamBuzz, CoachApproval, SentimentStory,
    Team, Season, Base
)

# ============================================================================
# Logging
# ============================================================================

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("gridiron.sentiment")

# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="Gridiron Intel Sentiment Service",
    description="CFB Sentiment Analysis Microservice",
    version="1.0.0",
)

# ============================================================================
# Database
# ============================================================================

DATABASE_URL = os.getenv("DATABASE_URL")

# Railway Postgres provides DATABASE_URL starting with "postgres://..."
# SQLAlchemy 2.0 requires "postgresql://..." — fix on the fly.
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    logger.info("Rewrote DATABASE_URL scheme: postgres:// -> postgresql://")

if not DATABASE_URL:
    logger.warning("DATABASE_URL not set — running in mock mode (no persistence)")

engine = None
SessionLocal = None
if DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_recycle=300,       # Recycle connections every 5 min (Railway idle timeout)
        connect_args={
            "connect_timeout": 10,
            "options": "-c statement_timeout=30000",  # 30 s query timeout
        },
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@contextmanager
def get_db():
    """Context manager for database sessions with automatic cleanup."""
    if not SessionLocal:
        raise RuntimeError("Database not configured")
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ============================================================================
# Startup State (tracked for /health introspection)
# ============================================================================

_startup_state: Dict[str, Any] = {
    "started_at": None,
    "db_ok": False,
    "tables_created": False,
    "models_loaded": False,
    "ready": False,
}


# ============================================================================
# API Schemas
# ============================================================================

class ProcessRequest(BaseModel):
    """Request to trigger sentiment processing"""
    season: int = Field(default=2024, description="Season year")
    week: Optional[int] = Field(default=None, description="Week number (None for current)")
    sources: List[str] = Field(
        default=["bluesky", "reddit", "news", "trends"],
        description="Data sources to process",
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
    models_loaded: bool
    uptime_seconds: float
    timestamp: str


# ============================================================================
# Sentiment Pipeline
# ============================================================================

async def process_sentiment_pipeline(
    db: Session,
    season: int,
    week: Optional[int],
    sources: List[str],
) -> Dict[str, Any]:
    """
    Run the full sentiment pipeline.

    1. Collect data from sources
    2. Analyze sentiment with NLP
    3. Extract entities and aggregate
    4. Generate stories
    """
    stats: Dict[str, Any] = {}
    pipeline_start = time.monotonic()

    try:
        # Step 1: Collect data with timeouts
        for source in sources:
            try:
                # Add timeout wrapper for each collector
                collect_task = None

                if source == "bluesky":
                    from collectors.bluesky_collector import BlueskyCollector
                    collector = BlueskyCollector(db)
                    collect_task = asyncio.create_task(collector.collect(season, week))

                elif source == "reddit":
                    from collectors.reddit_collector import RedditCollector
                    collector = RedditCollector(db)
                    collect_task = asyncio.create_task(collector.collect(season, week))

                elif source == "news":
                    from collectors.news_collector import NewsCollector
                    collector = NewsCollector(db)
                    collect_task = asyncio.create_task(collector.collect(season, week))

                elif source == "trends":
                    from collectors.trends_collector import TrendsCollector
                    collector = TrendsCollector(db)
                    collect_task = asyncio.create_task(collector.collect(season, week))

                if collect_task:
                    # 45 second timeout per collector
                    count = await asyncio.wait_for(collect_task, timeout=45.0)
                    stats[f"{source}_collected"] = count

            except asyncio.TimeoutError:
                logger.warning(f"Collector '{source}' timed out after 45s")
                stats[f"{source}_error"] = "timeout"
            except Exception as e:
                logger.error(f"Collector '{source}' failed: {e}", exc_info=True)
                stats[f"{source}_error"] = str(e)

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

        stats["pipeline_duration_s"] = round(time.monotonic() - pipeline_start, 2)
        return stats

    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        raise


# ============================================================================
# Health Check
# ============================================================================

def _check_db_health() -> bool:
    """Lightweight DB connectivity check."""
    if not engine:
        return False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.warning(f"DB health check failed: {e}")
        return False


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.

    Returns 200 as long as the service is running — even if the DB is
    temporarily unreachable.  Railway uses this to confirm the process is
    alive.  Downstream monitors can inspect the `database` field for
    deeper status.
    """
    db_ok = _check_db_health()

    uptime = 0.0
    if _startup_state["started_at"]:
        uptime = time.monotonic() - _startup_state["started_at"]

    return HealthResponse(
        status="healthy",
        database=db_ok,
        models_loaded=_startup_state["models_loaded"],
        uptime_seconds=round(uptime, 1),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


# ============================================================================
# Process Endpoint
# ============================================================================

@app.post("/process", response_model=ProcessResponse)
async def process_sentiment(request: ProcessRequest, background_tasks: BackgroundTasks):
    """
    Trigger sentiment processing.

    Collects data from sources, analyzes sentiment, and updates the
    database with aggregated results.
    """
    if not SessionLocal:
        return ProcessResponse(success=False, message="Database not configured")

    try:
        with get_db() as db:
            stats = await process_sentiment_pipeline(
                db, request.season, request.week, request.sources
            )
        return ProcessResponse(
            success=True,
            message=f"Processed sentiment data for {request.season}",
            stats=stats,
        )
    except Exception as e:
        logger.error(f"Error processing sentiment: {e}", exc_info=True)
        return ProcessResponse(success=False, message=str(e))


# ============================================================================
# Stats Endpoint
# ============================================================================

@app.get("/stats")
async def get_stats():
    """Get sentiment processing statistics."""
    if not SessionLocal:
        return {"error": "Database not configured"}

    try:
        with get_db() as db:
            raw_count = db.query(SentimentRaw).filter_by(processed=False).count()
            team_sentiment_count = db.query(TeamSentiment).count()
            player_sentiment_count = db.query(PlayerSentiment).count()
            latest = (
                db.query(TeamSentiment)
                .order_by(TeamSentiment.measuredAt.desc())
                .first()
            )

            return {
                "raw_unprocessed": raw_count,
                "team_sentiments": team_sentiment_count,
                "player_sentiments": player_sentiment_count,
                "latest_measurement": (
                    latest.measuredAt.isoformat() if latest else None
                ),
            }
    except Exception as e:
        logger.error(f"Stats query failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch stats")


# ============================================================================
# Mock Data Endpoint (for testing)
# ============================================================================

@app.post("/mock")
async def create_mock_data():
    """
    Create mock sentiment data for testing.

    This endpoint creates sample sentiment data for a few popular teams
    to verify the pipeline works without calling external APIs.
    """
    if not SessionLocal:
        return {"success": False, "message": "Database not configured"}

    try:
        import random
        from sqlalchemy import text

        with get_db() as db:
            # Get season ID for 2024
            season_result = db.execute(text("SELECT id FROM "Season" WHERE year = 2024 LIMIT 1"))
            season_row = season_result.fetchone()
            if not season_row:
                return {"success": False, "message": "Season 2024 not found"}
            season_id = season_row[0]

            # Get team IDs for popular teams
            teams_result = db.execute(
                text("SELECT id, abbreviation FROM team WHERE abbreviation IN ('ALA', 'UGA', 'OSU', 'MICH', 'TEX', 'FSU')")
            )
            teams = teams_result.fetchall()

            created = 0
            for team_id, abbreviation in teams:
                # Check if sentiment already exists for this team today
                existing = db.execute(
                    text("""
                        SELECT id FROM team_sentiment
                        WHERE teamId = :team_id
                        AND measuredAt > NOW() - INTERVAL '1 hour'
                        LIMIT 1
                    """),
                    {"team_id": team_id}
                ).fetchone()

                if existing:
                    continue

                # Create mock sentiment data
                score = round(60 + random.random() * 40, 1)
                trend = "up" if random.random() > 0.5 else "down"
                buzz_volume = int(100 + random.random() * 500)
                bluesky_score = round(50 + random.random() * 50, 1)
                reddit_score = round(50 + random.random() * 50, 1)
                news_score = round(50 + random.random() * 50, 1)

                db.execute(
                    text("""
                        INSERT INTO team_sentiment
                        (teamId, seasonId, measuredAt, score, trend, buzzVolume,
                         blueskyScore, redditScore, newsScore, hotTopics, sourceBreakdown)
                        VALUES
                        (:team_id, :season_id, NOW(), :score, :trend, :buzz_volume,
                         :bluesky_score, :reddit_score, :news_score,
                         '["playoffs", "heisman", "coaching"]'::jsonb,
                         '{"bluesky": 30, "reddit": 50, "news": 20}'::jsonb)
                    """),
                    {
                        "team_id": team_id,
                        "season_id": season_id,
                        "score": score,
                        "trend": trend,
                        "buzz_volume": buzz_volume,
                        "bluesky_score": bluesky_score,
                        "reddit_score": reddit_score,
                        "news_score": news_score,
                    }
                )
                created += 1

            return {
                "success": True,
                "message": f"Created mock sentiment data for {created} teams",
                "teams_created": created,
            }
    except Exception as e:
        logger.error(f"Error creating mock data: {e}", exc_info=True)
        return {"success": False, "message": str(e)}


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

    now = datetime.now(timezone.utc)
    season = now.year if now.month >= 8 else now.year - 1
    week = None  # Auto-determine

    if not SessionLocal:
        return {"success": False, "message": "Database not configured"}

    try:
        with get_db() as db:
            stats = await process_sentiment_pipeline(
                db, season, week,
                ["bluesky", "reddit", "news"],  # Skip trends (daily only)
            )
        return {"success": True, "stats": stats}
    except Exception as e:
        logger.error(f"Cron job failed: {e}", exc_info=True)
        return {"success": False, "message": str(e)}


# ============================================================================
# Lifecycle
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize service on startup."""
    _startup_state["started_at"] = time.monotonic()
    logger.info("Starting Gridiron Intel Sentiment Service")
    logger.info(f"  PORT={os.getenv('PORT', '8000')}")
    logger.info(f"  ENVIRONMENT={os.getenv('ENVIRONMENT', 'production')}")
    logger.info(f"  DATABASE_URL={'set' if DATABASE_URL else 'NOT SET'}")

    # --- Database -----------------------------------------------------------
    if DATABASE_URL and engine:
        try:
            Base.metadata.create_all(engine)
            _startup_state["tables_created"] = True
            logger.info("Database tables created / verified")
        except Exception as e:
            logger.error(f"Table creation failed: {e}", exc_info=True)

        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            _startup_state["db_ok"] = True
            logger.info("Database connection verified")
        except Exception as e:
            logger.error(f"Database connection test failed: {e}", exc_info=True)

    # --- NLP Models ---------------------------------------------------------
    try:
        from analyzers.nlp_analyzer import NLPAnalyzer
        NLPAnalyzer.load_models()
        _startup_state["models_loaded"] = True
        logger.info("NLP models loaded (VADER ready, DistilBERT deferred)")
    except Exception as e:
        logger.warning(f"NLP model pre-load failed (will retry on first request): {e}")

    _startup_state["ready"] = True
    logger.info("Sentiment Service ready")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down Gridiron Intel Sentiment Service")
    if engine:
        engine.dispose()
        logger.info("Database connections closed")


# ============================================================================
# Main entry point
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENVIRONMENT") == "development",
    )
