"""
Google Trends Collector

Collects search volume data for CFB teams using PyTrends.

This provides "buzz" metrics - how much people are searching
for each team. Complements the sentiment analysis with
intent/interest data.

Note: PyTrends has rate limits. Use sparingly.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from pytrends.request import TrendReq
from sqlalchemy.orm import Session

from ..models import TeamBuzz

logger = logging.getLogger(__name__)


# Team name mappings for Google Trends
# Must match common search terms
TEAM_SEARCH_TERMS = {
    # SEC
    "Alabama": "Alabama Crimson Tide",
    "Texas A&M": "Texas A&M Football",
    "Arkansas": "Arkansas Razorbacks",
    "Auburn": "Auburn Tigers",
    "LSU": "LSU Football",
    "Mississippi": "Ole Miss Football",
    "Mississippi State": "Mississippi State Bulldogs",
    "Georgia": "Georgia Football",
    "Kentucky": "Kentucky Football",
    "Missouri": "Mizzou Football",
    "South Carolina": "South Carolina Gamecocks",
    "Tennessee": "Tennessee Volunteers",
    "Vanderbilt": "Vanderbilt Football",
    "Florida": "Florida Gators",
    "Florida State": "Florida State Seminoles",
    "Miami (FL)": "Miami Hurricanes",
    "Clemson": "Clemson Tigers",
    "Virginia Tech": "Virginia Tech Football",

    # Big Ten
    "Ohio State": "Ohio State Football",
    "Michigan": "Michigan Football",
    "Penn State": "Penn State Football",
    "Michigan State": "Michigan State Football",
    "Indiana": "Indiana Football",
    "Maryland": "Maryland Football",
    "Rutgers": "Rutgers Football",
    "Illinois": "Illinois Football",
    "Iowa": "Iowa Hawkeyes",
    "Minnesota": "Minnesota Football",
    "Nebraska": "Nebraska Football",
    "Northwestern": "Northwestern Football",
    "Purdue": "Purdue Football",
    "Wisconsin": "Wisconsin Badgers",

    # Big 12
    "TCU": "TCU Football",
    "Baylor": "Baylor Football",
    "Oklahoma State": "Oklahoma State Football",
    "Oklahoma": "Oklahoma Football",
    "Kansas State": "K-State Football",
    "Kansas": "Kansas Football",
    "West Virginia": "West Virginia Football",
    "Texas Tech": "Texas Tech Football",
    "Texas": "Texas Longhorns",
    "Houston": "Houston Football",
    "BYU": "BYU Football",
    "UCF": "UCF Football",
    "Cincinnati": "Cincinnati Football",
    "West Virginia": "West Virginia Football",
    "Arizona": "Arizona Football",
    "Arizona State": "ASU Football",
    "Colorado": "Colorado Football",

    # Pac-12
    "Oregon": "Oregon Ducks",
    "Washington": "Washington Huskies",
    "USC": "USC Football",
    "UCLA": "UCLA Football",
    "Utah": "Utah Utes",
    "Washington State": "Washington State Football",
    "Oregon State": "Oregon State Football",
    "California": "California Football",
    "Stanford": "Stanford Football",

    # AAC / Others
    "SMU": "SMU Football",
    "Memphis": "Memphis Football",
    "Tulane": "Tulane Football",
    "UAB": "UAB Football",
    "North Texas": "North Texas Football",
    "Rice": "Rice Football",
    "Tulsa": "Tulsa Football",
    "South Florida": "USF Football",
    "Charlotte": "Charlotte Football",
    "Florida Atlantic": "FAU Football",
    "WKU": "WKU Football",

    # Independents
    "Notre Dame": "Notre Dame Football",
    "Army": "Army Football",
    "Navy": "Navy Football",
    "Liberty": "Liberty Football",
    "New Mexico State": "NMSU Football",
    "UMass": "UMass Football",
    "Connecticut": "UConn Football",
}


class TrendsCollector:
    """
    Collects Google Trends data for CFB teams.

    Groups teams into batches of 5 (PyTrends limit).
    """

    BATCH_SIZE = 5  # PyTrends allows up to 5 terms per request

    def __init__(self, db: Session):
        self.db = db
        self._pytrends: Optional[TrendReq] = None

    async def collect(self, season: int, week: Optional[int] = None) -> int:
        """
        Collect trends data for all teams.

        Returns count of teams updated.
        """
        count = 0

        try:
            # Initialize PyTrends
            self._pytrends = TrendReq(
                hl='en-US',
                tz=360,
                timeout=(10, 25),
                retries=2,
                backoff_factor=0.1
            )

            # Get current season record
            from ..models import Season
            season_rec = self.db.query(Season).filter_by(year=season).first()

            if not season_rec:
                logger.warning(f"Season {season} not found in database")
                return 0

            # Get all teams
            from ..models import Team
            teams = self.db.query(Team).all()

            # Process in batches
            for i in range(0, len(teams), self.BATCH_SIZE):
                batch = teams[i:i + self.BATCH_SIZE]
                batch_count = await self._collect_batch(batch, season_rec.id, week)
                count += batch_count

                # Rate limiting - PyTrends is strict
                await asyncio.sleep(60)  # 1 minute between batches

            logger.info(f"Trends collection complete: {count} teams updated")

        except Exception as e:
            logger.error(f"Error collecting trends: {e}", exc_info=True)

        return count

    async def _collect_batch(
        self,
        teams: List,
        season_id: int,
        week: Optional[int]
    ) -> int:
        """Collect trends for a batch of teams"""
        count = 0

        try:
            # Build search terms list
            terms = []
            team_map = {}  # Maps term index to team

            for team in teams:
                search_term = TEAM_SEARCH_TERMS.get(team.name, f"{team.name} Football")
                terms.append(search_term)
                team_map[search_term] = team

            # Make request to PyTrends
            self._pytrends.build_payload(
                terms,
                cat=0,  # All categories
                timeframe='now 7-d',  # Last 7 days
                geo='US',
                gprop=''  # Not restricted to news/images/etc
            )

            # Get interest over time
            interest_over_time = self._pytrends.interest_over_time()

            if interest_over_time is None or interest_over_time.empty:
                logger.warning(f"No trends data returned for batch")
                return 0

            # Get average interest for each term
            avg_interest = {}
            for term in terms:
                if term in interest_over_time.columns:
                    avg_interest[term] = int(interest_over_time[term].mean())

            # Store results
            now = datetime.utcnow()
            week_start = now - timedelta(days=7)

            for term, interest in avg_interest.items():
                team = team_map.get(term)
                if team:
                    await self._store_buzz(
                        team,
                        season_id,
                        week,
                        week_start,
                        interest
                    )
                    count += 1

            # Get related queries
            try:
                related_queries = self._pytrends.related_queries()
                for term, data in related_queries.items():
                    if data and 'top' in data and data['top'] is not None:
                        # Could store related queries for additional insights
                        pass
            except:
                pass

        except Exception as e:
            logger.error(f"Error collecting batch: {e}")

        return count

    async def _store_buzz(
        self,
        team,
        season_id: int,
        week: Optional[int],
        week_start: datetime,
        search_volume: int
    ):
        """Store buzz data in the database"""
        try:
            from ..models import TeamBuzz

            # Check for existing entry
            existing = self.db.query(TeamBuzz).filter(
                TeamBuzz.teamId == team.id,
                TeamBuzz.seasonId == season_id,
                TeamBuzz.weekStart == week_start
            ).first()

            if existing:
                # Update
                existing.searchVolume = search_volume
                existing.lastUpdated = datetime.utcnow()
            else:
                # Create new
                buzz = TeamBuzz(
                    teamId=team.id,
                    seasonId=season_id,
                    weekStart=week_start,
                    weekNumber=week,
                    searchVolume=search_volume,
                    relatedQueries={},
                    relatedTopics={},
                    regionalInterest={}
                )
                self.db.add(buzz)

            self.db.commit()

        except Exception as e:
            logger.error(f"Error storing buzz data: {e}")
            self.db.rollback()


async def collect_trends_task(db: Session):
    """
    Background task to collect trends data.

    Note: This takes a long time due to rate limits.
    Better to run daily, not hourly.
    """
    collector = TrendsCollector(db)
    count = await collector.collect(season=2024)

    logger.info(f"Trends collection complete: {count} teams")
    return count
