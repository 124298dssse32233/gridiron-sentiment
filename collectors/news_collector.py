"""
News Collector

Collects CFB-related articles from sports news sites.

Monitors RSS feeds from:
- ESPN College Football
- CBS Sports College Football
- Yahoo Sports College Football
- SI.com - College Football
- FOX Sports College Football
- Athlon Sports
- 247Sports

Uses feedparser - no authentication required.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

import httpx
import feedparser
from sqlalchemy.orm import Session

from ..models import SentimentRaw

logger = logging.getLogger(__name__)


# RSS feeds to monitor
RSS_FEEDS = [
    {
        "name": "ESPN CFB",
        "url": "https://www.espn.com/espn/rss/college-football",
        "source": "espn",
    },
    {
        "name": "CBS Sports CFB",
        "url": "https://www.cbssports.com/rss/college-football/news",
        "source": "cbs",
    },
    {
        "name": "Yahoo Sports CFB",
        "url": "https://sports.yahoo.com/ncaaf/rss.xml",
        "source": "yahoo",
    },
    {
        "name": "SI.com CFB",
        "url": "https://www.si.com/college-football/rss",
        "source": "si",
    },
    {
        "name": "FOX Sports CFB",
        "url": "https://api.foxsports.com/v1/rss?partnerKey=zBaTxR8i59UPSlhB9v7jVDbxEr0cEcnRya&category=college-football",
        "source": "fox",
    },
    {
        "name": "Athlon Sports CFB",
        "url": "https://www.athlonsports.com/college-football/rss.xml",
        "source": "athlon",
    },
    {
        "name": "247Sports",
        "url": "https://247sports.com/Article/RSS/College-Football.aspx",
        "source": "247sports",
    },
]


class NewsCollector:
    """
    Collects CFB-related articles from news RSS feeds.
    """

    USER_AGENT = "GridironIntel-Sentiment/1.0"

    def __init__(self, db: Session):
        self.db = db
        self._client: Optional[httpx.AsyncClient] = None

    async def collect(self, season: int, week: Optional[int] = None) -> int:
        """
        Collect articles from all RSS feeds.

        Returns count of new articles stored.
        """
        count = 0

        async with httpx.AsyncClient(timeout=30.0) as client:
            for feed_config in RSS_FEEDS:
                try:
                    feed_count = await self._collect_feed(
                        client,
                        feed_config,
                        season,
                        week
                    )
                    count += feed_count

                    logger.info(f"Collected {feed_count} articles from {feed_config['name']}")

                except Exception as e:
                    logger.error(f"Error collecting from {feed_config['name']}: {e}", exc_info=True)

                # Rate limiting
                await asyncio.sleep(0.3)

        logger.info(f"News collection complete: {count} total articles")
        return count

    async def _collect_feed(
        self,
        client: httpx.AsyncClient,
        feed_config: Dict,
        season: int,
        week: Optional[int]
    ) -> int:
        """Collect articles from a single RSS feed"""
        count = 0

        try:
            # Fetch RSS feed
            response = await client.get(
                feed_config["url"],
                headers={"User-Agent": self.USER_AGENT},
                timeout=15.0
            )

            if response.status_code != 200:
                logger.warning(f"{feed_config['name']} returned status {response.status_code}")
                return 0

            # Parse RSS feed
            feed = feedparser.parse(response.content)

            # Process entries
            for entry in feed.entries[:50]:  # Limit to 50 most recent
                try:
                    article_data = {
                        "source": feed_config["source"],
                        "feed_name": feed_config["name"],
                        "title": entry.get("title", ""),
                        "summary": entry.get("summary", ""),
                        "content": self._extract_content(entry),
                        "link": entry.get("link", ""),
                        "published": entry.get("published"),
                        "author": entry.get("author", ""),
                    }

                    if await self._store_article(article_data, season, week):
                        count += 1

                except Exception as e:
                    logger.error(f"Error processing article: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error fetching feed {feed_config['name']}: {e}")

        return count

    def _extract_content(self, entry: Dict) -> str:
        """Extract content from RSS entry"""
        # Try different content fields
        if "content" in entry:
            content_list = entry.get("content", [])
            if content_list and isinstance(content_list, list):
                return content_list[0].get("value", "")

        if "summary" in entry:
            return entry.get("summary", "")

        if "description" in entry:
            return entry.get("description", "")

        return ""

    async def _store_article(
        self,
        article_data: Dict,
        season: int,
        week: Optional[int]
    ) -> bool:
        """Store a news article in the database"""
        try:
            link = article_data.get("link")
            if not link:
                return False

            # Check for duplicates
            from ..models import SentimentRaw
            existing = self.db.query(SentimentRaw).filter_by(
                source="news",
                sourceId=link
            ).first()

            if existing:
                return False

            # Parse published date
            published_str = article_data.get("published")
            created_at = datetime.utcnow()

            if published_str:
                try:
                    created_at = datetime.strptime(published_str, "%a, %d %b %Y %H:%M:%S %z")
                except:
                    try:
                        created_at = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
                    except:
                        pass

            # Combine title and content
            title = article_data.get("title", "")
            content = article_data.get("content", article_data.get("summary", ""))
            full_content = f"{title}\n\n{content}"

            # Create entry
            raw = SentimentRaw(
                source="news",
                sourceId=link,
                content=full_content[:5000],
                author=article_data.get("author", article_data.get("feed_name", "")),
                authorFollowers=None,
                url=link,
                createdAt=created_at,
                collectedAt=datetime.utcnow(),
                extra_data={
                    "source": article_data.get("source"),
                    "feed": article_data.get("feed_name"),
                    "title": title,
                    "season": season,
                    "week": week
                },
                processed=False
            )

            self.db.add(raw)
            self.db.commit()

            return True

        except Exception as e:
            logger.error(f"Error storing news article: {e}")
            self.db.rollback()
            return False


async def collect_news_task(db: Session, duration_seconds: int = 120):
    """
    Background task to collect from news feeds.

    Useful for cron jobs.
    """
    collector = NewsCollector(db)
    count = await collector.collect(season=2024)

    logger.info(f"News collection complete: {count} articles")
    return count
