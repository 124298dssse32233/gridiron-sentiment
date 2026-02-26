"""
Entity Extractor

Extracts team and player mentions from social media posts.

Uses:
1. Keyword matching for team names
2. Fuzzy matching for nicknames/abbreviations
3. Context analysis to disambiguate

Links sentiment data to specific teams for aggregation.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Set, Tuple
from dataclasses import dataclass
from collections import defaultdict

from sqlalchemy.orm import Session
from rapidfuzz import process, fuzz

logger = logging.getLogger(__name__)


@dataclass
class EntityMention:
    """A detected entity mention"""
    entity_type: str  # "team" or "player"
    entity_id: int
    entity_name: str
    confidence: float  # 0-1
    context: str  # Surrounding text


class TeamEntityIndex:
    """
    Index of team names, nicknames, and abbreviations for fast matching.

    Built from database teams on initialization.
    """

    def __init__(self, db: Session):
        self.db = db
        self.team_names: Dict[str, int] = {}  # name -> team_id
        self.team_keywords: Dict[int, Set[str]] = defaultdict(set)
        self.team_mentions: Dict[int, List[str]] = defaultdict(list)

        self._build_index()

    def _build_index(self):
        """Build the team entity index from database"""
        try:
            from ..models import Team

            teams = self.db.query(Team).all()

            for team in teams:
                team_id = team.id

                # Primary name
                self.team_names[team.name.lower()] = team_id
                self.team_keywords[team_id].add(team.name.lower())

                # Abbreviation
                if team.abbreviation:
                    abbr = team.abbreviation.lower()
                    self.team_names[abbr] = team_id
                    self.team_keywords[team_id].add(abbr)
                    self.team_mentions[team_id].append(abbr)

                # Add common nicknames/aliases
                aliases = self._get_aliases(team)
                for alias in aliases:
                    self.team_names[alias.lower()] = team_id
                    self.team_keywords[team_id].add(alias.lower())

            logger.info(f"Built entity index for {len(teams)} teams")

        except Exception as e:
            logger.error(f"Error building team entity index: {e}")

    def _get_aliases(self, team) -> List[str]:
        """Get common aliases for a team"""
        aliases = []

        name_lower = team.name.lower()

        # Common nickname mappings
        NICKNAMES = {
            "alabama": ["bama", "crimson tide", "tide"],
            "auburn": ["war eagles", "tigers"],
            "lsu": ["bayou bengals", "death valley"],
            "georgia": ["uga", "bulldogs", "dawgs"],
            "florida": ["gators", "gator nation"],
            "florida state": ["fsu", "noles", "seminoles"],
            "miami": ["the u", "hurricanes", "canes"],
            "ohio state": ["osu", "buckeyes", "the buckeyes"],
            "michigan": ["um", "wolverines", "blue"],
            "michigan state": ["msu", "spartans"],
            "penn state": ["psu", "nittany lions"],
            "notre dame": ["nd", "fighting irish", "irish"],
            "usc": ["southern cal", "trojans"],
            "ucla": ["bruins"],
            "oklahoma": ["ou", "sooners", "boomer sooner"],
            "texas": ["longhorns", "horns", "hookem"],
            "texas a&m": ["tamu", "aggies", "gig em"],
            "oregon": ["ducks", "quack attack"],
            "washington": ["huskies", "uw", "dawgs"],
            "oregon state": ["beavers", "osu", "beavs"],
            "washington state": ["wazzu", "cougs", "cougars"],
            "stanford": ["cardinal", "tree"],
            "california": ["cal", "golden bears", "bears"],
            "clemson": ["tigers", "death valley"],
            "virginia tech": ["vt", "hokies"],
            "oklahoma state": ["okstate", "pokes", "cowboys"],
            "tcu": ["horned frogs", "frogs"],
            "baylor": ["bears"],
            "iowa": ["hawks", "hawkeyes"],
            "iowa state": ["cyclones", "clone"],
            "kansas state": ["k-state", "wildcats", "cats"],
            "west virginia": ["wvu", "mountaineers"],
            "arizona state": ["asu", "sun devils", "devils"],
            "arizona": ["wildcats", "cats"],
            "colorado": ["buffaloes", "buffs", "boulder"],
            "utah": ["utes"],
            "duke": ["blue devils"],
            "wake forest": ["deacons", "wake"],
            "louisville": ["cards", "cardinals"],
            "virginia": ["hoos", "cavaliers"],
            "north carolina": ["unc", "tar heels", "heels"],
            "nc state": ["wolfpack", "pack"],
            "boston college": ["bc", "eagles"],
            "syracuse": ["cuse", "orange"],
            "pittsburgh": ["pitt", "panthers"],
            "miami (oh)": ["miami ohio", "redhawks"],
            "army": ["black knights", "cadets", "west point"],
            "navy": ["midshipmen", "mids"],
            "air force": ["falcons", "afa"],
            "houston": ["uh", "cougars"],
            "smu": ["mustangs", "ponies"],
            "memphis": ["tigers"],
            "tulane": ["green wave", "green wave"],
            "tulsa": ["golden hurricane"],
            "uab": ["blazers"],
            "north texas": ["mean green"],
            "rice": ["owls"],
            "marshall": ["thundering herd"],
            "liberty": ["flames"],
            "coastal carolina": ["ccu", "chanticleers", "chants"],
            "appalachian state": ["app state", "mountaineers"],
            "georgia southern": ["eagles", "gs"],
            "georgia state": ["panthers", "gsu"],
            "james madison": ["jmu", "dukes"],
            "san jose state": ["sjsu", "spartans"],
            "fresno state": ["bulldogs", "dogs"],
            "boise state": ["broncos", "blue turf"],
            "unlv": ["rebels"],
            "nevada": ["wolf pack"],
        }

        if name_lower in NICKNAMES:
            aliases.extend(NICKNAMES[name_lower])

        return aliases

    def find_teams(self, text: str) -> List[EntityMention]:
        """Find team mentions in text"""
        mentions = []
        text_lower = text.lower()

        # Direct matches
        for keyword, team_id in self.team_names.items():
            if keyword in text_lower:
                mentions.append(EntityMention(
                    entity_type="team",
                    entity_id=team_id,
                    entity_name=keyword,
                    confidence=0.9,
                    context=self._get_context(text, keyword)
                ))

        # Remove duplicates (same team, keep highest confidence)
        seen = {}
        for mention in mentions:
            if mention.entity_id not in seen or mention.confidence > seen[mention.entity_id].confidence:
                seen[mention.entity_id] = mention

        return list(seen.values())

    def _get_context(self, text: str, keyword: str, window: int = 50) -> str:
        """Get surrounding context for a keyword"""
        idx = text.lower().find(keyword.lower())
        if idx == -1:
            return ""

        start = max(0, idx - window)
        end = min(len(text), idx + len(keyword) + window)
        return text[start:end]


class PlayerEntityIndex:
    """
    Index of player names for matching.

    Built from player mentions in posts.
    """

    def __init__(self, db: Session):
        self.db = db
        self.player_names: Dict[str, Tuple[int, str]] = {}  # name -> (id, team_name)
        self._build_index()

    def _build_index(self):
        """Build player index from existing mentions"""
        try:
            from ..models import PlayerSentiment

            players = self.db.query(PlayerSentiment).all()

            for player in players:
                key = player.playerName.lower()
                self.player_names[key] = (player.id, player.teamName or "")

            logger.info(f"Built player index for {len(players)} players")

        except Exception as e:
            logger.error(f"Error building player entity index: {e}")


class EntityExtractor:
    """
    Main entity extraction and aggregation service.

    Links sentiment data to teams and generates aggregates.
    """

    def __init__(self, db: Session):
        self.db = db
        self.team_index = None
        self.player_index = None

    async def extract_and_aggregate(self) -> int:
        """
        Extract entities from processed sentiment data and aggregate.

        Returns count of teams updated.
        """
        count = 0

        try:
            # Initialize indices
            self.team_index = TeamEntityIndex(self.db)
            self.player_index = PlayerEntityIndex(self.db)

            # Get current season
            from ..models import Season
            season_rec = self.db.query(Season).order_by(Season.year.desc()).first()

            if not season_rec:
                logger.warning("No season found")
                return 0

            # Get processed raw sentiment with sentiment scores
            from ..models import SentimentRaw
            raw_entries = self.db.query(SentimentRaw).filter(
                SentimentRaw.processed == True,
                SentimentRaw.createdAt >= datetime.utcnow() - timedelta(days=7)
            ).all()

            # Aggregate by team
            team_scores = defaultdict(lambda: {
                "scores": [],
                "sources": defaultdict(list),
                "posts": []
            })

            for raw in raw_entries:
                # Extract team mentions
                mentions = self.team_index.find_teams(raw.content)

                # Get sentiment score
                sentiment = raw.extra_data.get("sentiment", {}) if raw.extra_data else {}
                score = sentiment.get("score", 50)  # Default to neutral

                for mention in mentions:
                    team_scores[mention.entity_id]["scores"].append(score)
                    team_scores[mention.entity_id]["sources"][raw.source].append(score)
                    team_scores[mention.entity_id]["posts"].append(raw.id)

            # Update team sentiment records
            for team_id, data in team_scores.items():
                if not data["scores"]:
                    continue

                # Calculate aggregate metrics
                avg_score = sum(data["scores"]) / len(data["scores"])
                buzz_volume = len(data["scores"])

                # Calculate source breakdown
                bluesky_scores = data["sources"].get("bluesky", [])
                reddit_scores = data["sources"].get("reddit", [])
                news_scores = data["sources"].get("news", [])

                bluesky_avg = sum(bluesky_scores) / len(bluesky_scores) if bluesky_scores else None
                reddit_avg = sum(reddit_scores) / len(reddit_scores) if reddit_scores else None
                news_avg = sum(news_scores) / len(news_scores) if news_scores else None

                # Determine trend (compare to previous - simplified)
                trend = "stable"
                if avg_score > 60:
                    trend = "up"
                elif avg_score < 40:
                    trend = "down"

                # Media-fan divergence
                media_avg = news_avg or bluesky_avg or avg_score
                fan_avg = reddit_avg or avg_score
                divergence = abs(media_avg - fan_avg)

                # Create or update TeamSentiment
                from ..models import TeamSentiment
                existing = self.db.query(TeamSentiment).filter(
                    TeamSentiment.teamId == team_id,
                    TeamSentiment.seasonId == season_rec.id
                ).order_by(TeamSentiment.measuredAt.desc()).first()

                # Create new measurement
                team_sentiment = TeamSentiment(
                    teamId=team_id,
                    seasonId=season_rec.id,
                    measuredAt=datetime.utcnow(),
                    score=round(avg_score, 1),
                    trend=trend,
                    buzzVolume=buzz_volume,
                    blueskyScore=round(bluesky_avg, 1) if bluesky_avg else None,
                    redditScore=round(reddit_avg, 1) if reddit_avg else None,
                    newsScore=round(news_avg, 1) if news_avg else None,
                    mediaFanDivergence=round(divergence, 1),
                    sourceBreakdown={
                        "bluesky": len(bluesky_scores),
                        "reddit": len(reddit_scores),
                        "news": len(news_scores)
                    },
                    samplePosts=data["posts"][:10]  # Store sample post IDs
                )

                self.db.add(team_sentiment)
                count += 1

            self.db.commit()
            logger.info(f"Aggregated sentiment for {count} teams")

        except Exception as e:
            logger.error(f"Error extracting entities: {e}", exc_info=True)
            self.db.rollback()

        return count

    async def extract_players(self, limit: int = 20) -> int:
        """
        Extract player mentions and update PlayerSentiment.

        Returns count of players updated.
        """
        count = 0

        try:
            # Get current season
            from ..models import Season, SentimentRaw, PlayerSentiment
            season_rec = self.db.query(Season).order_by(Season.year.desc()).first()

            if not season_rec:
                return 0

            # Get processed raw sentiment
            raw_entries = self.db.query(SentimentRaw).filter(
                SentimentRaw.processed == True,
                SentimentRaw.createdAt >= datetime.utcnow() - timedelta(days=7)
            ).limit(500).all()

            # Simple player name extraction (capitalized words in sentences)
            player_mentions = defaultdict(lambda: {
                "scores": [],
                "count": 0,
                "teams": defaultdict(int)
            })

            for raw in raw_entries:
                # Skip news sources (player mentions in headlines are common)
                if raw.source == "news":
                    continue

                # Extract potential player names
                # This is a simplified approach - production would use NER
                content = raw.content
                words = content.split()

                for i, word in enumerate(words):
                    # Look for capitalized words that might be names
                    if word and word[0].isupper() and len(word) > 2:
                        # Check context (last name usually followed by position or stat)
                        context_words = words[max(0, i-2):min(len(words), i+3)]
                        context = " ".join(context_words)

                        # Common CFB positions that follow player names
                        if any(pos in content.lower() for pos in [
                            "qb", "quarterback", "rb", "running back",
                            "wr", "wide receiver", "te", "tight end",
                            "linebacker", "defensive end", "cornerback"
                        ]):
                            # Extract full name (First Last pattern)
                            if i + 1 < len(words) and words[i + 1] and words[i + 1][0].isupper():
                                full_name = f"{word} {words[i + 1]}"

                                # Get sentiment
                                sentiment = raw.extra_data.get("sentiment", {}) if raw.extra_data else {}
                                score = sentiment.get("score", 50)

                                player_mentions[full_name]["scores"].append(score)
                                player_mentions[full_name]["count"] += 1

                                # Try to infer team from content
                                team_mentions = self.team_index.find_teams(content) if self.team_index else []
                                for tm in team_mentions:
                                    player_mentions[full_name]["teams"][tm.entity_id] += 1

            # Update player sentiment records
            avg_mentions = sum(m["count"] for m in player_mentions.values()) / len(player_mentions) if player_mentions else 1

            for player_name, data in player_mentions.items():
                if data["count"] < 3:  # Minimum mentions threshold
                    continue

                # Calculate z-score
                z_score = (data["count"] - avg_mentions) / (avg_mentions + 1)

                # Determine buzz status
                if z_score > 2:
                    buzz_status = "VIRAL"
                elif z_score > 1:
                    buzz_status = "TRENDING"
                elif z_score > 0.5:
                    buzz_status = "RISING"
                else:
                    buzz_status = None

                # Infer team (most mentioned team)
                team_id = max(data["teams"].items(), key=lambda x: x[1])[0] if data["teams"] else None

                # Average sentiment
                avg_sentiment = sum(data["scores"]) / len(data["scores"]) if data["scores"] else 50

                # Create or update
                existing = self.db.query(PlayerSentiment).filter(
                    PlayerSentiment.playerName == player_name,
                    PlayerSentiment.seasonId == season_rec.id
                ).first()

                if existing:
                    existing.buzzZscore = round(z_score, 2)
                    existing.buzzStatus = buzz_status
                    existing.mentionCount = data["count"]
                    existing.sentimentScore = round(avg_sentiment, 1)
                    existing.lastUpdated = datetime.utcnow()
                else:
                    player_sentiment = PlayerSentiment(
                        playerName=player_name,
                        teamId=team_id,
                        seasonId=season_rec.id,
                        buzzZscore=round(z_score, 2),
                        buzzStatus=buzz_status,
                        mentionCount=data["count"],
                        sentimentScore=round(avg_sentiment, 1),
                        lastUpdated=datetime.utcnow()
                    )
                    self.db.add(player_sentiment)

                count += 1

            self.db.commit()
            logger.info(f"Updated {count} player sentiment records")

        except Exception as e:
            logger.error(f"Error extracting players: {e}", exc_info=True)
            self.db.rollback()

        return count
