"""
Data collectors for sentiment analysis.

Each collector fetches data from a specific source:
- bluesky_collector: Bluesky firehose (real-time fan posts)
- reddit_collector: Reddit CFB subreddits (r/CFB, r/CollegeFootball)
- news_collector: News articles from ESPN, CBS Sports, etc.
- trends_collector: Google Trends search volume data
"""

from .bluesky_collector import BlueskyCollector
from .reddit_collector import RedditCollector
from .news_collector import NewsCollector
from .trends_collector import TrendsCollector

__all__ = [
    "BlueskyCollector",
    "RedditCollector",
    "NewsCollector",
    "TrendsCollector",
]
