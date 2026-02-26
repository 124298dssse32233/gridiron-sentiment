"""
Bluesky Firehose Collector

Listens to the Bluesky firehose (com.atproto.sync.subscribeRepos)
to collect CFB-related posts in real-time.

Bluesky firehose is FREE and requires NO authentication for read access.
We filter for posts containing CFB-related keywords.

Resources:
- Firehose spec: https://docs.bsky.app/docs/api/com-atproto-sync-subscribe-repos
- WebSocket endpoint: wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any, Set
from dataclasses import dataclass

import httpx
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, DateTime, Integer, Text, Boolean

from ..models import SentimentRaw

logger = logging.getLogger(__name__)


# CFB-related keywords to filter firehose
CFB_KEYWORDS: Set[str] = {
    # Team names (FBS conferences)
    "alabama", "crimson tide", "a&m", "tamu", "aggies", "arkansas", "razorbacks",
    "auburn", "tigers", "lsu", "lSU", "baton rouge", "mississippi", "ole miss",
    "rebels", "mississippi state", "bulldogs", "georgia", "uga", "kentucky",
    "missouri", "mizzou", "south carolina", "gamecocks", "tennessee", "vols",
    "vanderbilt", "commodores", "florida", "gators", "fsu", "florida state",
    "miami", "hurricanes", "clemson", "virginia tech", "vt", "hokies",

    # Big 10
    "ohio state", "buckeyes", "michigan", "wolverines", "penn state", "nittany lions",
    "michigan state", "spartans", "indiana", "hoosiers", "maryland", "terrapins",
    "rutgers", "scarlet knights", "illinois", "fighting illini", "iowa", "hawkeyes",
    "minnesota", "golden gophers", "nebraska", "cornhuskers", "northwestern",
    "wildcats", "purdue", "boilermakers", "wisconsin", "badgers",

    # Big 12
    "tcu", "horned frogs", "baylor", "bears", "oklahoma state", "cowboys", "oklahoma",
    "sooners", "kansas state", "wildcats", "kansas", "jayhawks", "west virginia",
    "mountaineers", "texas tech", "red raiders", "texas", "longhorns",

    # Pac-12 / others
    "oregon", "ducks", "washington", "huskies", "usc", "trojans", "ucla", "bruins",
    "utah", "utes", "arizona state", "sun devils", "arizona", "wildcats",
    "colorado", "buffaloes", "cal", "berkeley", "stanford", "cardinal",
    "washington state", "cougars", "oregon state", "beavers",

    # AAC / others
    "smu", "mustangs", "memphis", "tulane", "green wave", "uab", "blazers",
    "north texas", "mean green", "rice", "owls", "tulsa", "golden hurricane",

    # Notre Dame
    "notre dame", "fighting irish",

    # Army / Navy
    "army", "black knights", "navy", "midshipmen", "air force", "falcons",

    # General terms
    "college football", "cfb", "ncaa football", "fbs", "fcs",
    "football saturday", "gameday", "college gameday",
    "transfer portal", "nil", "recruiting", "national signing day",

    # Coaches
    "saban", "day", "riley", "harbaugh", "kiffin", "tucker", "campbell",

    # Awards
    "heisman", "doak walker", "maxwell", "biletnikoff", "outland", "thorpe",
}


@dataclass
class FirehoseMessage:
    """Parsed firehose message"""
    repo: str  # DID of the repository
    commit: str  # Commit CID
    ops: List[Dict[str, Any]]  # List of operations (creates, deletes)
    time: datetime
    blocks: Dict[str, Any]  # Decoded blocks (posts, etc.)


class BlueskyCollector:
    """
    Collects CFB-related posts from the Bluesky firehose.

    The firehose streams ALL repository events on Bluesky.
    We filter for CFB-related content and store for sentiment analysis.
    """

    FIREHOSE_URL = "wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos"
    RELAY_URL = "wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos"

    def __init__(self, db: Session):
        self.db = db
        self._client: Optional[httpx.AsyncClient] = None
        self._ws: Optional[Any] = None

    async def collect(self, season: int, week: Optional[int] = None) -> int:
        """
        Collect posts from Bluesky firehose.

        This runs for a limited time window and returns the count collected.
        For continuous operation, run as a background task.
        """
        count = 0

        try:
            # Use HTTP relay approach instead of WebSocket for Railway compatibility
            count = await self._collect_from_relay(season, week)

        except Exception as e:
            logger.error(f"Error collecting from Bluesky: {e}", exc_info=True)

        return count

    async def _collect_from_relay(self, season: int, week: Optional[int] = None) -> int:
        """
        Collect using the Bluesky relay service (HTTP-based).

        The bsky.social relay provides recent posts over HTTP.
        """
        count = 0

        try:
            # Search for CFB-related posts using the search API
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Search for each keyword and collect results
                for keyword in list(CFB_KEYWORDS)[:20]:  # Limit for rate limits
                    try:
                        response = await client.get(
                            "https://api.bsky.app/xrpc/app.bsky.feed.searchPosts",
                            params={
                                "q": keyword,
                                "limit": 25,
                                "sort": "latest"
                            },
                            headers={
                                "User-Agent": "GridironIntel-Sentiment/1.0"
                            }
                        )

                        if response.status_code == 200:
                            data = response.json()
                            posts = data.get("posts", [])

                            for post in posts:
                                if await self._store_post(post, season, week):
                                    count += 1

                        # Rate limiting
                        await asyncio.sleep(0.1)

                    except httpx.HTTPStatusError as e:
                        if e.response.status_code == 429 or e.response.status_code == 429:
                            logger.warning(f"Rate limited on Bluesky API, waiting...")
                            await asyncio.sleep(5)
                        else:
                            logger.error(f"HTTP error: {e}")

        except Exception as e:
            logger.error(f"Error in relay collection: {e}", exc_info=True)

        logger.info(f"Collected {count} posts from Bluesky")
        return count

    async def _store_post(self, post: Dict[str, Any], season: int, week: Optional[int]) -> bool:
        """
        Store a post in the sentiment_raw table.

        Returns True if stored (not duplicate), False otherwise.
        """
        try:
            # Extract post data
            uri = post.get("uri", "")
            cid = post.get("cid", "")

            if not uri:
                return False

            # Check for duplicates
            existing = self.db.query(SentimentRaw).filter_by(
                source="bluesky",
                sourceId=uri
            ).first()

            if existing:
                return False

            # Extract author info
            author = post.get("author", {})
            author_handle = author.get("handle", "")
            author_followers = author.get("followersCount", 0)

            # Extract post content
            record = post.get("record", {})
            text = record.get("text", "")
            created_at = record.get("createdAt", "")

            # Build post URL
            post_url = uri
            if "://bsky.app/" not in uri:
                post_url = uri.replace("at://", "https://bsky.app/post/")

            # Create sentiment raw entry
            raw = SentimentRaw(
                source="bluesky",
                sourceId=uri,
                content=text[:5000],  # Truncate if needed
                author=author_handle,
                authorFollowers=author_followers,
                url=post_url,
                createdAt=datetime.fromisoformat(created_at.replace("Z", "+00:00")) if created_at else datetime.utcnow(),
                collectedAt=datetime.utcnow(),
                extra_data={
                    "cid": cid,
                    "replyCount": post.get("replyCount", 0),
                    "repostCount": post.get("repostCount", 0),
                    "likeCount": post.get("likeCount", 0),
                    "quoteCount": post.get("quoteCount", 0),
                    "season": season,
                    "week": week
                },
                processed=False
            )

            self.db.add(raw)
            self.db.commit()

            return True

        except Exception as e:
            logger.error(f"Error storing post: {e}")
            self.db.rollback()
            return False

    async def search_hashtags(self, hashtags: List[str], season: int) -> int:
        """
        Search Bluesky for specific hashtags.

        Useful for catching up on missed posts.
        """
        count = 0

        async with httpx.AsyncClient(timeout=30.0) as client:
            for tag in hashtags:
                try:
                    response = await client.get(
                        "https://api.bsky.app/xrpc/app.bsky.feed.searchPosts",
                        params={
                            "q": f"#{tag}",
                            "limit": 50,
                            "sort": "latest"
                        }
                    )

                    if response.status_code == 200:
                        data = response.json()
                        posts = data.get("posts", [])

                        for post in posts:
                            if await self._store_post(post, season, None):
                                count += 1

                except Exception as e:
                    logger.error(f"Error searching hashtag #{tag}: {e}")

        return count


async def collect_bluesky_task(db: Session, duration_seconds: int = 300):
    """
    Background task to collect from Bluesky for a set duration.

    Useful for cron jobs.
    """
    collector = BlueskyCollector(db)
    count = await collector.collect(season=2024)

    logger.info(f"Bluesky collection complete: {count} posts")
    return count


# CFB-related hashtags for searching
CFB_HASHTAGS = [
    "cfb", "collegefootball", "ncaafootball", "fbs", "fcs",
    "rolltide", "gobucks", "gotigers", "gogamecocks", "hookem",
    "goirish", "wreckem", "goducks", "gobulldogs",
]
