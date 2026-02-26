"""
Database models for the sentiment service.

These mirror the main application's Prisma models but use SQLAlchemy
for direct Python database access.

NOTE: In production, this service would connect to the same PostgreSQL
database as the main Next.js app.
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, JSON, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime

Base = declarative_base()


class Team(Base):
    """CFB Team"""
    __tablename__ = "Team"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    abbreviation = Column(String, nullable=True)
    slug = Column(String, nullable=False, unique=True)
    logoUrl = Column(String, nullable=True)
    levelId = Column(Integer, ForeignKey("Level.id"), nullable=True)

    # Relations
    level = relationship("Level", foreign_keys=[levelId])
    teamBuzz = relationship("TeamBuzz", back_populates="team", foreign_keys="TeamBuzz.teamId")
    coachApprovals = relationship("CoachApproval", back_populates="team", foreign_keys="CoachApproval.teamId")


class Level(Base):
    """Competition level (FBS, FCS, D2, D3, NAIA)"""
    __tablename__ = "Level"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)


class Season(Base):
    """Season"""
    __tablename__ = "Season"

    id = Column(Integer, primary_key=True)
    year = Column(Integer, nullable=False, unique=True)


class SentimentRaw(Base):
    """Raw ingested posts buffer"""
    __tablename__ = "SentimentRaw"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source = Column(String, nullable=False)  # 'bluesky', 'reddit', 'news'
    sourceId = Column(String, nullable=False)  # Post ID
    content = Column(Text, nullable=False)
    author = Column(String, nullable=True)
    authorFollowers = Column(Integer, nullable=True)
    url = Column(String, nullable=True)
    createdAt = Column(DateTime, nullable=True)
    collectedAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    extra_data = Column("metadata", JSONB, nullable=True)
    processed = Column(Boolean, default=False, nullable=False)


class TeamSentiment(Base):
    """Aggregate sentiment per team per measurement period"""
    __tablename__ = "TeamSentiment"

    id = Column(Integer, primary_key=True, autoincrement=True)
    teamId = Column(Integer, ForeignKey("Team.id"), nullable=False, index=True)
    seasonId = Column(Integer, ForeignKey("Season.id"), nullable=False, index=True)
    measuredAt = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    score = Column(Float, nullable=True)
    trend = Column(String, nullable=True)
    buzzVolume = Column(Integer, nullable=True)

    blueskyScore = Column(Float, nullable=True)
    redditScore = Column(Float, nullable=True)
    newsScore = Column(Float, nullable=True)

    mediaFanDivergence = Column(Float, nullable=True)
    sourceBreakdown = Column(JSONB, nullable=True)

    hotTopics = Column(JSONB, nullable=True)
    samplePosts = Column(JSONB, nullable=True)
    coachApproval = Column(Float, nullable=True)

    team = relationship("Team", foreign_keys=[teamId])
    season = relationship("Season", foreign_keys=[seasonId])


class PlayerSentiment(Base):
    """Player buzz tracking"""
    __tablename__ = "PlayerSentiment"

    id = Column(Integer, primary_key=True, autoincrement=True)
    playerName = Column(String, nullable=False, index=True)
    teamId = Column(Integer, ForeignKey("Team.id"), nullable=True, index=True)
    seasonId = Column(Integer, ForeignKey("Season.id"), nullable=False, index=True)
    position = Column(String, nullable=True)

    buzzZscore = Column(Float, nullable=True)
    buzzStatus = Column(String, nullable=True)
    mentionCount = Column(Integer, default=0, nullable=False)
    sentimentScore = Column(Float, nullable=True)
    lastUpdated = Column(DateTime, default=datetime.utcnow, nullable=False)

    team = relationship("Team", foreign_keys=[teamId])
    season = relationship("Season", foreign_keys=[seasonId])


class TeamBuzz(Base):
    """Google Trends search volume data"""
    __tablename__ = "TeamBuzz"

    id = Column(Integer, primary_key=True, autoincrement=True)
    teamId = Column(Integer, ForeignKey("Team.id"), nullable=False, index=True)
    seasonId = Column(Integer, ForeignKey("Season.id"), nullable=False, index=True)

    weekStart = Column(DateTime, nullable=False, index=True)
    weekNumber = Column(Integer, nullable=True)

    searchVolume = Column(Integer, nullable=True)
    relatedQueries = Column(JSONB, nullable=True)
    relatedTopics = Column(JSONB, nullable=True)
    regionalInterest = Column(JSONB, nullable=True)

    team = relationship("Team", foreign_keys=[teamId], back_populates="teamBuzz")
    season = relationship("Season", foreign_keys=[seasonId])


class CoachApproval(Base):
    """Coach approval ratings"""
    __tablename__ = "CoachApproval"

    id = Column(Integer, primary_key=True, autoincrement=True)
    teamId = Column(Integer, ForeignKey("Team.id"), nullable=False, index=True)
    season = Column(Integer, nullable=False, index=True)
    weekNumber = Column(Integer, nullable=True)

    coachName = Column(String, nullable=False)
    approvalScore = Column(Float, nullable=False)
    approvalTrend = Column(String, nullable=True)
    mentionCount = Column(Integer, default=0, nullable=False)

    positiveSentiment = Column(Float, nullable=True)
    negativeSentiment = Column(Float, nullable=True)

    lastUpdated = Column(DateTime, default=datetime.utcnow, nullable=False)

    team = relationship("Team", foreign_keys=[teamId], back_populates="coachApprovals")


class SentimentStory(Base):
    """Auto-generated weekly narrative stories"""
    __tablename__ = "SentimentStory"

    id = Column(Integer, primary_key=True, autoincrement=True)
    seasonId = Column(Integer, ForeignKey("Season.id"), nullable=False, index=True)
    weekNumber = Column(Integer, nullable=False)
    weekStart = Column(DateTime, nullable=False)

    storyType = Column(String, nullable=False)
    headline = Column(String, nullable=False)
    summary = Column(Text, nullable=False)

    relatedTeams = Column(JSONB, nullable=True)
    relatedPlayers = Column(JSONB, nullable=True)

    generatedAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    season = relationship("Season", foreign_keys=[seasonId])


def datetime_utc():
    """Helper for UTC datetime"""
    from datetime import datetime, timezone
    return datetime.now(timezone.utc)
