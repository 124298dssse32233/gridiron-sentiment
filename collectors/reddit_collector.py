"""
Reddit Collector

Collects CFB-related posts from Reddit subreddits.

Uses Reddit's JSON API (no authentication required for public reads).
Monitors:
- r/CFB (1.1M members)
- r/CollegeFootball (100K+ members)

Reddit provides JSON responses for any URL by adding .json extension.
No API key needed for public reads.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

import httpx
import feedparser
from sqlalchemy.orm import Session

from models import SentimentRaw

logger = logging.getLogger(__name__)


# Subreddits to monitor
SUBREDDITS = [
    "CFB",
    "CollegeFootball",
    "cfbmemes",  # For sentiment diversity
    "NCAAF",
]


class RedditCollector:
    """
    Collects CFB-related posts from Reddit.

    Uses the public JSON API - no authentication required.
    """

    BASE_URL = "https://www.reddit.com/r"
    USER_AGENT = "GridironIntel-Sentiment/1.0"

    def __init__(self, db: Session):
        self.db = db
        self._client: Optional[httpx.AsyncClient] = None

    async def collect(self, season: int, week: Optional[int] = None) -> int:
        """
        Collect posts from monitored subreddits.

        Returns count of new posts stored.
        """
        count = 0

        async with httpx.AsyncClient(timeout=30.0) as client:
            for subreddit in SUBREDDITS:
                try:
                    subreddit_count = await self._collect_subreddit(
                        client, subreddit, season, week
                    )
                    count += subreddit_count

                    logger.info(f"Collected {subreddit_count} posts from r/{subreddit}")

                except Exception as e:
                    logger.error(f"Error collecting from r/{subreddit}: {e}", exc_info=True)

                # Rate limiting
                await asyncio.sleep(0.5)

        logger.info(f"Reddit collection complete: {count} total posts")
        return count

    async def _collect_subreddit(
        self,
        client: httpx.AsyncClient,
        subreddit: str,
        season: int,
        week: Optional[int]
    ) -> int:
        """Collect posts from a single subreddit"""
        count = 0

        try:
            # Get hot posts (sorted by engagement)
            url = f"{self.BASE_URL}/{subreddit}/hot.json"
            response = await self._make_request(client, url)

            if response:
                posts = self._parse_posts(response, subreddit, season, week)
                for post_data in posts:
                    if await self._store_post(post_data, season, week):
                        count += 1

            # Get new posts (sorted by recency)
            url = f"{self.BASE_URL}/{subreddit}/new.json"
            response = await self._make_request(client, url)

            if response:
                posts = self._parse_posts(response, subreddit, season, week)
                for post_data in posts:
                    if await self._store_post(post_data, season, week):
                        count += 1

        except Exception as e:
            logger.error(f"Error collecting from r/{subreddit}: {e}")

        return count

    async def _make_request(self, client: httpx.AsyncClient, url: str) -> Optional[Dict]:
        """Make request to Reddit API"""
        try:
            response = await client.get(
                url,
                headers={
                    "User-Agent": self.USER_AGENT
                },
                params={"limit": 50}
            )

            if response.status_code == 200:
                return response.json()

            elif response.status_code == 429:
                logger.warning(f"Reddit rate limit reached, waiting...")
                await asyncio.sleep(5)
                return None

            else:
                logger.warning(f"Reddit returned status {response.status_code}")
                return None

        except Exception as e:
            logger.error(f"Error making request to Reddit: {e}")
            return None

    def _parse_posts(
        self,
        data: Dict,
        subreddit: str,
        season: int,
        week: Optional[int]
    ) -> List[Dict]:
        """Parse posts from Reddit response"""
        posts = []

        try:
            children = data.get("data", {}).get("children", [])

            for child in children:
                post_data = child.get("data", {})

                # Skip NSFW or removed posts
                if post_data.get("over_18") or post_data.get("removed_by_category"):
                    continue

                posts.append({
                    "subreddit": subreddit,
                    "reddit_id": post_data.get("id"),
                    "title": post_data.get("title", ""),
                    "selftext": post_data.get("selftext", ""),
                    "author": post_data.get("author", ""),
                    "score": post_data.get("score", 0),
                    "num_comments": post_data.get("num_comments", 0),
                    "created_utc": post_data.get("created_utc"),
                    "permalink": post_data.get("permalink", ""),
                    "url": post_data.get("url", ""),
                    "is_self": post_data.get("is_self", True),
                })

        except Exception as e:
            logger.error(f"Error parsing Reddit posts: {e}")

        return posts

    async def _store_post(
        self,
        post_data: Dict,
        season: int,
        week: Optional[int]
    ) -> bool:
        """Store a Reddit post in the database"""
        try:
            reddit_id = post_data.get("reddit_id")
            if not reddit_id:
                return False

            # Check for duplicates
            from models import SentimentRaw
            existing = self.db.query(SentimentRaw).filter_by(
                source="reddit",
                sourceId=reddit_id
            ).first()

            if existing:
                return False

            # Combine title and content for sentiment analysis
            title = post_data.get("title", "")
            content = post_data.get("selftext", "")
            full_content = f"{title}\n\n{content}" if content else title

            # Build URL
            permalink = post_data.get("permalink", "")
            post_url = f"https://www.reddit.com{permalink}" if permalink else ""

            # Convert timestamp
            created_utc = post_data.get("created_utc")
            if created_utc:
                created_at = datetime.fromtimestamp(created_utc)
            else:
                created_at = datetime.utcnow()

            # Create entry
            raw = SentimentRaw(
                source="reddit",
                sourceId=reddit_id,
                content=full_content[:5000],
                author=post_data.get("author", ""),
                authorFollowers=None,  # Reddit doesn't expose follower count
                url=post_url,
                createdAt=created_at,
                collectedAt=datetime.utcnow(),
                extra_data={
                    "subreddit": post_data.get("subreddit"),
                    "score": post_data.get("score", 0),
                    "numComments": post_data.get("num_comments", 0),
                    "isSelfPost": post_data.get("is_self", True),
                    "season": season,
                    "week": week
                },
                processed=False
            )

            self.db.add(raw)
            self.db.commit()

            return True

        except Exception as e:
            logger.error(f"Error storing Reddit post: {e}")
            self.db.rollback()
            return False


async def collect_reddit_task(db: Session, duration_seconds: int = 180):
    """
    Background task to collect from Reddit.

    Useful for cron jobs.
    """
    collector = RedditCollector(db)
    count = await collector.collect(season=2024)

    logger.info(f"Reddit collection complete: {count} posts")
    return count
