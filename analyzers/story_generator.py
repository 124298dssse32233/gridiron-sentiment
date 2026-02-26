"""
Story Generator

Auto-generates narrative stories from sentiment data.

Creates weekly digest stories about:
- Rising teams (positive momentum)
- Falling teams (negative sentiment)
- Controversies (negative spikes)
- Viral players (high buzz)

Stories are templated but use real data.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

from sqlalchemy.orm import Session
from sqlalchemy import func, desc

logger = logging.getLogger(__name__)


@dataclass
class SentimentStory:
    """Generated story data"""
    story_type: str  # 'rising', 'falling', 'controversy', 'buzz'
    headline: str
    summary: str
    related_teams: List[int]
    related_players: List[str]


# Story templates
HEADLINE_TEMPLATES = {
    "rising": [
        "{team} Fans Riding High After Week of Positive Buzz",
        "Sentiment Surge: {team} Sees Fan Confidence Soar",
        "Good Vibes Only: {team} Leads Week in Fan Sentiment",
    ],
    "falling": [
        "Sentiment Sours: {team} Fans Growing Restless",
        "Confidence Cratering: {team} Hits Low Point in Fan Sentiment",
        "Trouble in {city}? {team} Fans Express Concern",
    ],
    "controversy": [
        "Firestorm Erupts Around {team} After Dramatic Week",
        "Social Media Erupts: {team} at Center of CFB Conversation",
        "Chaos and Controversy: {team} Drives Most Negative Sentiment",
    ],
    "buzz": [
        "Viral Sensation: {player} Becoming CFB Household Name",
        "National Spotlight: {player} Driving Heisman Buzz",
        "Breakout Star: {player} Dominates Social Media Conversation",
    ]
}

SUMMARY_TEMPLATES = {
    "rising": [
        "{team} fans have plenty to be optimistic about after a week that saw their sentiment score jump to {score}/100. Social media activity is up {buzz_percent}%, with fans highlighting {highlight}. The positive momentum has {team} trending upward in the Power Rankings conversation.",
        "It's all good vibes in {team} country this week. Fan sentiment has climbed to {score}/100, with {count}K+ social mentions driving the buzz. Supporters are particularly excited about {highlight}, signaling a renewed sense of optimism.",
    ],
    "falling": [
        "It's getting tense in {team} nation. Fan sentiment has dropped to {score}/100 this week, with social media sentiment turning negative following {highlight}. The drop marks a {change}-point decline from last week, as fan patience wears thin.",
        "Concern is mounting among {team} faithful. A sentiment score of {score}/100 reflects growing frustration, with {highlight} dominating the conversation. The team now ranks among the bottom 5 in fan sentiment this week.",
    ],
    "controversy": [
        "{team} is at the center of a social media firestorm this week. Sentiment has swung dramatically, with {count}K+ posts driving a {buzz_percent}% spike in conversation volume. The controversy stems from {highlight}, putting {team} firmly in the national spotlight for all the wrong reasons.",
        "All eyes are on {team} after a week that had CFB Twitter buzzing. Media coverage and fan discourse are at a season high, with {highlight} fueling intense debate. The team now leads CFB in conversation volume—but not necessarily for the right reasons.",
    ],
    "buzz": [
        "{player} has gone from rising star to viral sensation. The {team} {position} is seeing social media mentions up {buzz_percent}%, with Heisman buzz reaching a fever pitch. NFL scouts and fans alike are taking notice of {highlight}, cementing {player}'s status as a household name.",
        "Meet the new face of CFB: {player}. The {team} star is dominating social media conversation, with mention volume rivaling the biggest names in the sport. {highlight} has {player} firmly in the Heisman conversation and NFL draft discussions.",
    ]
}


class StoryGenerator:
    """
    Generates narrative stories from sentiment data.
    """

    def __init__(self, db: Session):
        self.db = db

    async def generate_weekly_stories(
        self,
        season: int,
        week: int
    ) -> List[Dict[str, Any]]:
        """
        Generate all story types for a given week.

        Returns list of story dictionaries.
        """
        stories = []

        try:
            # Get season record
            from models import Season
            season_rec = self.db.query(Season).filter_by(year=season).first()

            if not season_rec:
                logger.warning(f"Season {season} not found")
                return []

            week_start = self._calculate_week_start(season, week)

            # Generate each story type
            rising_story = await self._generate_rising_story(season_rec.id, week, week_start)
            if rising_story:
                stories.append(rising_story)

            falling_story = await self._generate_falling_story(season_rec.id, week, week_start)
            if falling_story:
                stories.append(falling_story)

            controversy_story = await self._generate_controversy_story(season_rec.id, week, week_start)
            if controversy_story:
                stories.append(controversy_story)

            buzz_story = await self._generate_buzz_story(season_rec.id, week, week_start)
            if buzz_story:
                stories.append(buzz_story)

            # Store stories
            for story_data in stories:
                await self._store_story(season_rec.id, week, week_start, story_data)

            logger.info(f"Generated {len(stories)} stories for week {week}")

        except Exception as e:
            logger.error(f"Error generating stories: {e}", exc_info=True)

        return stories

    async def _generate_rising_story(
        self,
        season_id: int,
        week: int,
        week_start: datetime
    ) -> Optional[Dict]:
        """Generate story about team with rising sentiment"""
        try:
            from models import TeamSentiment, Team

            # Get team with highest positive sentiment this week
            result = self.db.query(TeamSentiment, Team).join(
                Team, TeamSentiment.teamId == Team.id
            ).filter(
                TeamSentiment.seasonId == season_id,
                TeamSentiment.measuredAt >= week_start,
                TeamSentiment.score.isnot(None)
            ).order_by(
                desc(TeamSentiment.score)
            ).first()

            if not result:
                return None

            sentiment, team = result

            # Get previous week's score for comparison
            prev_week_start = week_start - timedelta(days=7)
            prev_sentiment = self.db.query(TeamSentiment).filter(
                TeamSentiment.teamId == team.id,
                TeamSentiment.seasonId == season_id,
                TeamSentiment.measuredAt >= prev_week_start,
                TeamSentiment.measuredAt < week_start
            ).first()

            prev_score = prev_sentiment.score if prev_sentiment else 50
            change = round(sentiment.score - prev_score, 1)

            # Generate headline and summary
            import random
            headline = random.choice(HEADLINE_TEMPLATES["rising"]).format(
                team=team.name
            )

            highlight = self._get_highlight(sentiment, "rising")
            buzz_percent = round((sentiment.buzzVolume or 0) / 100, 0)

            summary = random.choice(SUMMARY_TEMPLATES["rising"]).format(
                team=team.name,
                score=round(sentiment.score, 1),
                buzz_percent=buzz_percent or 50,
                count=round((sentiment.buzzVolume or 0) / 1000, 1),
                highlight=highlight
            )

            return {
                "story_type": "rising",
                "headline": headline,
                "summary": summary,
                "related_teams": [team.id],
                "related_players": []
            }

        except Exception as e:
            logger.error(f"Error generating rising story: {e}")
            return None

    async def _generate_falling_story(
        self,
        season_id: int,
        week: int,
        week_start: datetime
    ) -> Optional[Dict]:
        """Generate story about team with falling sentiment"""
        try:
            from models import TeamSentiment, Team

            # Get team with lowest sentiment this week
            result = self.db.query(TeamSentiment, Team).join(
                Team, TeamSentiment.teamId == Team.id
            ).filter(
                TeamSentiment.seasonId == season_id,
                TeamSentiment.measuredAt >= week_start,
                TeamSentiment.score.isnot(None)
            ).order_by(
                TeamSentiment.score.asc()
            ).first()

            if not result:
                return None

            sentiment, team = result

            # Get previous week's score for comparison
            prev_week_start = week_start - timedelta(days=7)
            prev_sentiment = self.db.query(TeamSentiment).filter(
                TeamSentiment.teamId == team.id,
                TeamSentiment.seasonId == season_id,
                TeamSentiment.measuredAt >= prev_week_start,
                TeamSentiment.measuredAt < week_start
            ).first()

            prev_score = prev_sentiment.score if prev_sentiment else 50
            change = round(prev_score - sentiment.score, 1)

            # Generate headline and summary
            import random
            headline = random.choice(HEADLINE_TEMPLATES["falling"]).format(
                team=team.name,
                city=team.name.split()[0] if " " in team.name else team.name
            )

            highlight = self._get_highlight(sentiment, "falling")

            summary = random.choice(SUMMARY_TEMPLATES["falling"]).format(
                team=team.name,
                score=round(sentiment.score, 1),
                change=abs(change),
                highlight=highlight
            )

            return {
                "story_type": "falling",
                "headline": headline,
                "summary": summary,
                "related_teams": [team.id],
                "related_players": []
            }

        except Exception as e:
            logger.error(f"Error generating falling story: {e}")
            return None

    async def _generate_controversy_story(
        self,
        season_id: int,
        week: int,
        week_start: datetime
    ) -> Optional[Dict]:
        """Generate story about controversial team (high buzz, low sentiment)"""
        try:
            from models import TeamSentiment, Team

            # Get team with highest buzz volume but low sentiment (<50)
            result = self.db.query(TeamSentiment, Team).join(
                Team, TeamSentiment.teamId == Team.id
            ).filter(
                TeamSentiment.seasonId == season_id,
                TeamSentiment.measuredAt >= week_start,
                TeamSentiment.score < 50,
                TeamSentiment.buzzVolume > 100
            ).order_by(
                desc(TeamSentiment.buzzVolume)
            ).first()

            if not result:
                return None

            sentiment, team = result

            # Generate headline and summary
            import random
            headline = random.choice(HEADLINE_TEMPLATES["controversy"]).format(
                team=team.name
            )

            highlight = self._get_highlight(sentiment, "controversy")
            buzz_percent = round((sentiment.buzzVolume or 0) / 100, 0)

            summary = random.choice(SUMMARY_TEMPLATES["controversy"]).format(
                team=team.name,
                score=round(sentiment.score, 1),
                count=round((sentiment.buzzVolume or 0) / 1000, 1),
                buzz_percent=buzz_percent or 50,
                highlight=highlight
            )

            return {
                "story_type": "controversy",
                "headline": headline,
                "summary": summary,
                "related_teams": [team.id],
                "related_players": []
            }

        except Exception as e:
            logger.error(f"Error generating controversy story: {e}")
            return None

    async def _generate_buzz_story(
        self,
        season_id: int,
        week: int,
        week_start: datetime
    ) -> Optional[Dict]:
        """Generate story about viral player"""
        try:
            from models import PlayerSentiment, Team

            # Get player with highest buzz score
            result = self.db.query(PlayerSentiment, Team).join(
                Team, PlayerSentiment.teamId == Team.id,
                isouter=True
            ).filter(
                PlayerSentiment.seasonId == season_id,
                PlayerSentiment.buzzZscore > 1.0,
                PlayerSentiment.lastUpdated >= week_start
            ).order_by(
                desc(PlayerSentiment.buzzZscore)
            ).first()

            if not result:
                return None

            player, team = result

            # Generate headline and summary
            import random
            headline = random.choice(HEADLINE_TEMPLATES["buzz"]).format(
                player=player.playerName
            )

            highlight = self._get_player_highlight(player)
            buzz_percent = round((player.buzzZscore or 0) * 50 + 50, 0)

            summary = random.choice(SUMMARY_TEMPLATES["buzz"]).format(
                player=player.playerName,
                team=team.name if team else "Unknown",
                position=player.position or "star",
                buzz_percent=buzz_percent,
                highlight=highlight
            )

            return {
                "story_type": "buzz",
                "headline": headline,
                "summary": summary,
                "related_teams": [team.id] if team else [],
                "related_players": [player.playerName]
            }

        except Exception as e:
            logger.error(f"Error generating buzz story: {e}")
            return None

    def _get_highlight(self, sentiment, story_type: str) -> str:
        """Generate a highlight based on sentiment data"""
        highlights = {
            "rising": [
                "the team's improved performance on the field",
                "strong recruiting momentum",
                "key player developments",
                "optimism about the season ahead",
            ],
            "falling": [
                "recent on-field struggles",
                "coaching decisions",
                "injury concerns",
                "recruiting setbacks",
            ],
            "controversy": [
                "a heated debate about team direction",
                "controversial officiating decisions",
                "coaching speculation",
                "player transfers and roster moves",
            ]
        }

        import random
        return random.choice(highlights.get(story_type, ["team developments"]))

    def _get_player_highlight(self, player) -> str:
        """Generate a highlight based on player data"""
        if player.position == "QB":
            return "electric performances and clutch plays"
        elif player.position in ["RB", "WR"]:
            return "explosive plays and highlight-reel moments"
        else:
            return "dominant performances and NFL draft buzz"

    def _calculate_week_start(self, season: int, week: int) -> datetime:
        """Calculate start date for a given week"""
        # Approximate: Week 1 starts late August
        season_start = datetime(season, 8, 29)
        return season_start + timedelta(weeks=week - 1)

    async def _store_story(
        self,
        season_id: int,
        week: int,
        week_start: datetime,
        story_data: Dict
    ):
        """Store generated story in database"""
        try:
            from models import SentimentStory

            # Check for existing story
            existing = self.db.query(SentimentStory).filter(
                SentimentStory.seasonId == season_id,
                SentimentStory.weekNumber == week,
                SentimentStory.storyType == story_data["story_type"]
            ).first()

            if existing:
                # Update
                existing.headline = story_data["headline"]
                existing.summary = story_data["summary"]
                existing.relatedTeams = story_data["related_teams"]
                existing.relatedPlayers = story_data["related_players"]
                existing.generatedAt = datetime.utcnow()
            else:
                # Create
                story = SentimentStory(
                    seasonId=season_id,
                    weekNumber=week,
                    weekStart=week_start,
                    storyType=story_data["story_type"],
                    headline=story_data["headline"],
                    summary=story_data["summary"],
                    relatedTeams=story_data["related_teams"],
                    relatedPlayers=story_data["related_players"],
                    generatedAt=datetime.utcnow()
                )
                self.db.add(story)

            self.db.commit()

        except Exception as e:
            logger.error(f"Error storing story: {e}")
            self.db.rollback()
