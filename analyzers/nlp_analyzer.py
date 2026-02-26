"""
NLP Sentiment Analyzer

Uses VADER (fast, rule-based) and DistilBERT (deep learning)
to analyze sentiment of CFB-related posts.

VADER:
- Fast, no GPU needed
- Good for social media text
- Handles emojis, slang, capitalization
- Score range: -1 (negative) to +1 (positive)

DistilBERT:
- Fine-tuned for sentiment analysis (SST-2)
- More accurate for complex sentences
- Requires PyTorch
- Score range: 0 (negative) to 1 (positive)

Hybrid approach:
- Use VADER for initial filtering
- Use DistilBERT for ambiguous or important posts
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass

from sqlalchemy.orm import Session
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# DistilBERT - lazy loaded to save memory/startup time
_transformer_model = None
_transformer_tokenizer = None

logger = logging.getLogger(__name__)


@dataclass
class SentimentResult:
    """Result of sentiment analysis"""
    score: float  # 0-100 composite score
    vader_compound: float  # VADER compound score (-1 to +1)
    bert_score: Optional[float]  # BERT score (0-1)
    confidence: str  # "high", "medium", "low"
    label: str  # "positive", "negative", "neutral"
    keywords: List[str]  # Extracted keywords


class NLPAnalyzer:
    """
    Main NLP sentiment analyzer.

    Processes raw sentiment data and generates scores.
    """

    # Class-level model cache (shared across instances)
    _vader = None
    _bert_model = None
    _bert_tokenizer = None
    _models_loaded = False

    def __init__(self, db: Session):
        self.db = db

    @classmethod
    def load_models(cls):
        """Load NLP models (call once at startup)"""
        if cls._models_loaded:
            return

        try:
            # Load VADER
            cls._vader = SentimentIntensityAnalyzer()
            logger.info("VADER model loaded")

            # Load DistilBERT (optional - will load on first use)
            cls._models_loaded = True

        except Exception as e:
            logger.error(f"Error loading NLP models: {e}")

    async def process_raw_data(self, batch_size: int = 100) -> int:
        """
        Process all unprocessed raw sentiment data.

        Returns count of posts processed.
        """
        count = 0

        try:
            from models import SentimentRaw

            # Get unprocessed posts
            unprocessed = self.db.query(SentimentRaw).filter_by(
                processed=False
            ).limit(batch_size).all()

            if not unprocessed:
                logger.info("No unprocessed sentiment data found")
                return 0

            logger.info(f"Processing {len(unprocessed)} raw sentiment entries")

            for raw in unprocessed:
                try:
                    result = await self._analyze_text(raw.content)

                    # Update raw entry with sentiment results
                    raw.extra_data = raw.extra_data or {}
                    raw.extra_data.update({
                        "sentiment": {
                            "score": result.score,
                            "vader": result.vader_compound,
                            "bert": result.bert_score,
                            "label": result.label,
                            "keywords": result.keywords
                        }
                    })
                    raw.processed = True

                    count += 1

                except Exception as e:
                    logger.error(f"Error analyzing post {raw.sourceId}: {e}")
                    continue

            self.db.commit()
            logger.info(f"Processed {count} sentiment entries")

        except Exception as e:
            logger.error(f"Error processing raw data: {e}", exc_info=True)
            self.db.rollback()

        return count

    async def _analyze_text(self, text: str) -> SentimentResult:
        """Analyze sentiment of a single text"""
        # Initialize VADER if needed
        if self._vader is None:
            self._vader = SentimentIntensityAnalyzer()

        # Run VADER analysis
        vader_scores = self._vader.polarity_scores(text)
        vader_compound = vader_scores["compound"]

        # Determine label from VADER
        if vader_compound >= 0.05:
            vader_label = "positive"
        elif vader_compound <= -0.05:
            vader_label = "negative"
        else:
            vader_label = "neutral"

        # Extract keywords
        keywords = self._extract_keywords(text)

        # BERT analysis (for important/ambiguous posts only)
        bert_score = None
        if abs(vader_compound) < 0.3 or len(text) > 200:
            bert_score = await self._bert_analyze(text)

        # Compute composite score (0-100)
        if bert_score is not None:
            # Average VADER (normalized to 0-100) and BERT
            vader_norm = (vader_compound + 1) * 50
            composite = (vader_norm + bert_score * 100) / 2
        else:
            composite = (vader_compound + 1) * 50

        # Determine confidence
        confidence = "low"
        if abs(vader_compound) > 0.5 or (bert_score and abs(bert_score - 0.5) > 0.3):
            confidence = "high"
        elif abs(vader_compound) > 0.2:
            confidence = "medium"

        # Final label
        if composite >= 60:
            label = "positive"
        elif composite <= 40:
            label = "negative"
        else:
            label = "neutral"

        return SentimentResult(
            score=round(composite, 1),
            vader_compound=round(vader_compound, 3),
            bert_score=round(bert_score, 3) if bert_score else None,
            confidence=confidence,
            label=label,
            keywords=keywords
        )

    async def _bert_analyze(self, text: str) -> Optional[float]:
        """
        Analyze sentiment using DistilBERT.

        Returns probability of positive sentiment (0-1).
        """
        try:
            # Lazy load BERT model
            if self._bert_model is None:
                from transformers import DistilBertForSequenceClassification, DistilBertTokenizerFast
                import torch

                logger.info("Loading DistilBERT model...")
                model_name = "distilbert-base-uncased-finetuned-sst-2-english"
                self._bert_tokenizer = DistilBertTokenizerFast.from_pretrained(model_name)
                self._bert_model = DistilBertForSequenceClassification.from_pretrained(model_name)
                logger.info("DistilBERT model loaded")

            # Tokenize and predict
            inputs = self._bert_tokenizer(
                text[:512],  # BERT max length
                return_tensors="pt",
                truncation=True,
                padding=True
            )

            import torch
            with torch.no_grad():
                outputs = self._bert_model(**inputs)
                predictions = outputs.logits.softmax(dim=-1)

            # SST-2: [0] = negative, [1] = positive
            positive_prob = float(predictions[0][1])

            return positive_prob

        except Exception as e:
            logger.warning(f"BERT analysis failed: {e}")
            return None

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract relevant keywords from text"""
        keywords = []

        # Common CFB terms to look for
        cfb_terms = {
            # Positive terms
            "win", "wins", "won", "victory", "dominated", "crushed", "blowout",
            "playoff", "championship", "ranked", "ranking", "top 10", "top 25",
            "heisman", "all-american", "draft", "first round",

            # Negative terms
            "loss", "lose", "lost", "defeat", "upset", "blown out", "embarrassing",
            "fired", "firing", "coach", "coaching", "injured", "injury",
            "transfer", "portal", "transfer portal",

            # Game situations
            "overtime", "ot", "game winning", "game-winning", "field goal",
            "touchdown", "interception", "fumble", "turnover", "fourth down",

            # Seasons/timing
            "season", "offseason", "bowl game", "bowl week", "national signing day",
        }

        text_lower = text.lower()
        for term in cfb_terms:
            if term in text_lower:
                keywords.append(term)

        return keywords[:5]  # Limit to 5 keywords

    async def aggregate_by_team(
        self,
        season_id: int,
        measured_at: datetime
    ) -> Dict[int, float]:
        """
        Aggregate sentiment scores by team.

        Returns dict mapping team_id to composite score.
        """
        try:
            from models import SentimentRaw, Team

            # Get all processed raw sentiment
            all_raw = self.db.query(SentimentRaw).filter(
                SentimentRaw.processed == True,
                SentimentRaw.collectedAt >= measured_at - timedelta(days=7)
            ).all()

            # Group by team (entity extraction would have tagged them)
            # For now, return empty dict - entity extraction will handle this
            return {}

        except Exception as e:
            logger.error(f"Error aggregating by team: {e}")
            return {}


async def analyze_sentiment_batch(texts: List[str]) -> List[SentimentResult]:
    """
    Analyze sentiment for a batch of texts.

    Utility function for external use.
    """
    results = []

    for text in texts:
        analyzer = NLPAnalyzer(None)  # No DB needed for text-only analysis
        result = await analyzer._analyze_text(text)
        results.append(result)

    return results
