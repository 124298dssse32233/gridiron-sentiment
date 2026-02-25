# Gridiron Intel Sentiment Service

A Python microservice that collects and analyzes college football sentiment from social media, news, and search trends.

## Overview

This service powers the **Pulse** page by:
1. **Collecting** CFB-related posts from Bluesky, Reddit, and news sites
2. **Analyzing** sentiment using VADER + DistilBERT NLP models
3. **Extracting** team and player mentions from content
4. **Aggregating** sentiment scores by team and player
5. **Generating** narrative stories from sentiment trends

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Collectors    │───>│  NLP Analyzer   │───>│ Entity Extractor│
│                 │    │                 │    │                 │
│ • Bluesky       │    │ • VADER         │    │ • Teams         │
│ • Reddit        │    │ • DistilBERT    │    │ • Players       │
│ • News RSS      │    │                 │    │                 │
│ • Google Trends │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                                      ▼
                                              ┌─────────────────┐
                                              │  PostgreSQL DB  │
                                              │                 │
                                              │ • sentiment_raw │
                                              │ • team_sentiment│
                                              │ • player_sent.. │
                                              │ • team_buzz     │
                                              └─────────────────┘
```

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Optional
REDIS_URL=redis://host:6379
ENVIRONMENT=development
PORT=8000
```

## Deployment (Railway)

1. **Create new project on Railway**
2. **Add PostgreSQL database**
3. **Deploy this service** from the `services/sentiment` directory
4. **Set environment variables** (copy from your Railway database)
5. **Configure cron job** (Railway → Services → Cron)
   - Schedule: `0 */6 * * *` (every 6 hours during season)

### Cron Configuration

```bash
# Railway cron endpoint
POST /cron/process
```

Schedule: `0 */6 * * *` (every 6 hours)

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your database URL

# Run the service
uvicorn main:app --reload --port 8000
```

## API Endpoints

### `GET /health`
Health check endpoint.

### `GET /stats`
Get sentiment processing statistics.

### `POST /process`
Trigger manual sentiment processing.

**Request:**
```json
{
  "season": 2024,
  "week": null,
  "sources": ["bluesky", "reddit", "news", "trends"],
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processed sentiment data for 2024",
  "stats": {
    "bluesky_collected": 150,
    "reddit_collected": 80,
    "news_collected": 45,
    "posts_analyzed": 275,
    "teams_updated": 130,
    "players_updated": 25
  }
}
```

### `POST /cron/process`
Cron job endpoint. Automatically determines current season/week.

## Data Sources

### Bluesky
- **Method**: Search API (no auth required for public posts)
- **Rate Limit**: 300 requests/5 minutes
- **Content**: Fan posts, real-time reactions

### Reddit
- **Method**: JSON API (no auth required for public posts)
- **Subreddits**: r/CFB, r/CollegeFootball, r/cfbmemes
- **Content**: Fan discussions, hot topics

### News
- **Method**: RSS feeds
- **Sources**: ESPN, CBS Sports, Yahoo Sports, SI.com, FOX Sports
- **Content**: Articles, headlines, analysis

### Google Trends
- **Method**: PyTrends library
- **Rate Limit**: Strict (60s between batch requests)
- **Content**: Search volume by team

## NLP Pipeline

### VADER (Valence Aware Dictionary and sEntiment Reasoner)
- **Speed**: Fast (~1ms per post)
- **Best for**: Social media, slang, emojis
- **Output**: Compound score (-1 to +1)

### DistilBERT
- **Speed**: Slower (~50ms per post)
- **Best for**: Complex sentences, nuanced sentiment
- **Model**: `distilbert-base-uncased-finetuned-sst-2-english`
- **Output**: Positive probability (0-1)

### Hybrid Approach
1. Run VADER on all posts
2. Use DistilBERT for:
   - Ambiguous posts (|compound| < 0.3)
   - Long posts (>200 characters)
   - High-engagement posts

## Database Schema

See the main application's `prisma/schema.prisma` for full schema definitions.

Key tables:
- `sentiment_raw`: Raw ingested posts
- `team_sentiment`: Aggregate team sentiment (score, trend, buzz)
- `player_sentiment`: Player buzz tracking
- `team_buzz`: Google Trends search volume
- `sentiment_story`: Auto-generated stories

## Monitoring

### Health Check
```bash
curl https://your-service.railway.app/health
```

### Stats
```bash
curl https://your-service.railway.app/stats
```

## Troubleshooting

### Issue: "Database not configured"
**Solution**: Set `DATABASE_URL` environment variable in Railway dashboard.

### Issue: "PyTrends rate limit"
**Solution**: Trends collection runs daily, not hourly. Reduce frequency.

### Issue: "High memory usage"
**Solution**: The DistilBERT model is ~250MB. Railway has 512MB minimum, which should be sufficient.

## License

MIT
