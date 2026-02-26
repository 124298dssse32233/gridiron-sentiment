# Gridiron Intel Sentiment Service - Deployment Guide

## Overview

The Sentiment Service is a Python microservice deployed on Railway that:
- Collects CFB-related posts from Bluesky, Reddit, and news sources
- Analyzes sentiment using VADER + DistilBERT NLP
- Stores aggregated sentiment data in Supabase
- Runs automatically every 6 hours via cron jobs

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Railway   │────────▶│   Supabase   │◀────────│  Next.js    │
│  (Python)   │  API    │  PostgreSQL  │  API    │   App       │
└─────────────┘         └──────────────┘         └─────────────┘
     Service                                                  Frontend
```

### Data Flow

1. **Collection**: Python collectors fetch data from external APIs
2. **Processing**: NLP analyzer computes sentiment scores
3. **Aggregation**: Entity extractor links posts to teams/players
4. **Storage**: Results stored in `team_sentiment` table
5. **Display**: Next.js Pulse page queries data via API

## Deployment Setup

### 1. Railway Service Configuration

**Repository**: `https://github.com/124298dssse32233/gridiron-sentiment`

**Environment Variables** (set in Railway dashboard):

```bash
# Supabase Database (REQUIRED)
# IMPORTANT: Use pooler URL for external Railway connections
DATABASE_URL=postgres://postgres.PROJECT_REF:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Optional: Redis cache for performance
REDIS_URL=redis://default:PASSWORD@your-redis.upstash.io:6379

# Service Configuration
PORT=8000
ENVIRONMENT=production
LOG_LEVEL=INFO
```

**Critical**: Always use the **pooler URL** format for Railway→Supabase connections:
- ✅ Correct: `aws-0-us-east-1.pooler.supabase.com:6543`
- ❌ Wrong: `db.qtixkhsahwsokpejnnpp.supabase.co:5432`

### 2. Supabase Setup

Your Supabase database already has the required tables:
- `team_sentiment` - Aggregate sentiment per team
- `player_sentiment` - Player buzz tracking
- `sentiment_raw` - Raw ingested posts buffer
- `coach_approval` - Coach approval ratings
- `team_buzz` - Google Trends search volume
- `sentiment_story` - Auto-generated weekly narratives

### 3. Cron Jobs

Cron jobs are configured in `services/sentiment/railway.toml`:

```toml
# Every 6 hours - main sentiment processing
[[cron]]
id = "sentiment-process-6h"
schedule = "0 */6 * * * *"
command = "curl -X POST http://localhost:8000/cron/process"

# Weekly - mock data refresh (testing)
[[cron]]
id = "sentiment-mock-weekly"
schedule = "0 3 * * 0"
command = "curl -X POST http://localhost:8000/mock"
```

## API Endpoints

### Health Check
```bash
GET /health
```
Returns service status and database connectivity.

### Mock Data (Testing)
```bash
POST /mock
```
Creates sample sentiment data for 6 teams (ALA, UGA, OSU, MICH, TEX, FSU).

### Process Sentiment
```bash
POST /process
Content-Type: application/json

{
  "season": 2024,
  "week": null,
  "sources": ["bluesky", "reddit", "news", "trends"],
  "force": false
}
```
Runs full sentiment pipeline. Use `force: true` to re-process existing data.

### Cron Job Handler
```bash
POST /cron/process
```
Triggered by Railway cron every 6 hours.

### Stats
```bash
GET /stats
```
Returns processing statistics.

## Troubleshooting

### Database Connection Issues

**Symptom**: `"database": false` in health check

**Solution**: Verify DATABASE_URL uses pooler format:
```bash
# Correct format
DATABASE_URL=postgres://postgres.PROJECT_REF:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Wrong formats (will fail)
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require
DATABASE_URL=postgres://postgres.PROJECT_REF:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
```

### Collector Timeout Issues

**Symptom**: `/process` endpoint times out after 60s

**Solution**: Collectors are optimized with:
- Parallel processing (3 concurrent requests)
- 45s timeout per source
- Limited keyword search (5 keywords instead of 20)
- Graceful degradation (continues if one source fails)

If timeouts persist, reduce sources:
```json
{
  "sources": ["bluesky", "news"]  // Skip reddit and trends
}
```

### Empty Pulse Page

**Symptom**: Pulse page loads but shows no data

**Solutions**:
1. Check sentiment data exists in Supabase:
```sql
SELECT COUNT(*) FROM team_sentiment WHERE seasonId = (SELECT id FROM season WHERE year = 2024);
```

2. Create mock data for testing:
```bash
curl -X POST https://gridiron-sentiment-production.up.railway.app/mock
```

3. Verify API works locally:
```bash
curl http://localhost:3000/api/sentiment/pulse?season=2024
```

## Performance Optimization

### Current Optimizations
- **Parallel processing**: 3 concurrent API requests
- **Timeout handling**: 45s per source, graceful degradation
- **Connection pooling**: SQLAlchemy with pool_size=5
- **Lazy loading**: BERT model loads on first use

### Future Improvements
- Add Redis caching for API responses
- Implement rate limiting per source
- Add retry logic with exponential backoff
- Stream processing for large datasets

## Monitoring

### Health Checks
```bash
# Service health
curl https://gridiron-sentiment-production.up.railway.app/health

# Expected response:
{
  "status": "healthy",
  "database": true,
  "models_loaded": true,
  "uptime_seconds": 1234.5,
  "timestamp": "2026-02-26T06:00:00.000000+00:00"
}
```

### Statistics
```bash
curl https://gridiron-sentiment-production.up.railway.app/stats
```

### Railway Dashboard
- **Logs**: View real-time logs for debugging
- **Metrics**: CPU, memory, and response times
- **Deployments**: Track deployment history
- **Cron Jobs**: Monitor cron execution

## Local Development

### Setup
```bash
cd services/sentiment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Variables
Create `.env` file:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/gridiron
LOG_LEVEL=DEBUG
```

### Run Locally
```bash
python main.py
# or with uvicorn
uvicorn main:app --reload --port 8000
```

### Test Endpoints
```bash
# Health check
curl http://localhost:8000/health

# Create mock data
curl -X POST http://localhost:8000/mock

# Process sentiment
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d '{"season": 2024, "sources": ["bluesky"]}'
```

## Code Structure

```
services/sentiment/
├── main.py                    # FastAPI app & endpoints
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Railway deployment
├── railway.toml              # Cron job configuration
├── start.sh                  # Container entrypoint
├── models/
│   ├── __init__.py           # SQLAlchemy models
│   └── ...                   # TeamSentiment, PlayerSentiment, etc.
├── collectors/
│   ├── bluesky_collector.py  # Bluesky firehose/relay
│   ├── reddit_collector.py   # Reddit CFB subreddits
│   ├── news_collector.py     # News article RSS feeds
│   └── trends_collector.py   # Google Trends search volume
└── analyzers/
    ├── nlp_analyzer.py       # VADER + DistilBERT
    ├── entity_extractor.py   # Team/player extraction
    └── story_generator.py    # Weekly narratives
```

## Deployment Workflow

### Automatic Deployment
1. Push changes to GitHub
2. Railway automatically builds and deploys
3. Health checks verify service is running
4. Cron jobs continue on schedule

### Manual Redeploy
In Railway dashboard:
1. Go to service → Deployments
2. Click "Deployment actions" → "Redeploy"

### Rollback
In Railway dashboard:
1. Go to service → Deployments
2. Find previous successful deployment
3. Click "Deployment actions" → "Redeploy"

## Cost Management

### Railway Pricing
- **Free Tier**: $5/month credit
- **Paid Plans**: $5+/month based on usage

### Cost Optimization
- Use `/mock` endpoint for testing (no external API calls)
- Limit keyword searches during development
- Run cron jobs less frequently in off-season
- Monitor Railway usage dashboard

## Security

### Secrets Management
- Never commit DATABASE_URL to git
- Use Railway environment variables
- Rotate passwords regularly
- Use Supabase Row Level Security (RLS)

### API Rate Limits
- Bluesky: 1000 requests/month (free tier)
- Reddit: Requires API key
- Google Trends: Use pyTrends library

## Support

### Documentation
- Railway: https://docs.railway.app
- Supabase: https://supabase.com/docs
- FastAPI: https://fastapi.tiangolo.com

### Troubleshooting Links
- Railway status: https://status.railway.app
- Supabase status: https://status.supabase.com

### Common Issues
1. **IPv6 connection errors**: Use pooler URL instead of direct connection
2. **Import errors**: Use absolute imports (`from models import`)
3. **Timeout errors**: Reduce number of sources or increase timeout
4. **Empty data**: Create mock data via `/mock` endpoint

## Summary

✅ **Deployed**: https://gridiron-sentiment-production.up.railway.app
✅ **Health**: `/health` endpoint confirms database connectivity
✅ **Mock Data**: `/mock` endpoint creates test sentiment data
✅ **Cron Jobs**: Configured to run every 6 hours
✅ **Pulse Page**: Next.js app displays sentiment data at `/pulse`

**Next Steps**:
1. Monitor Railway logs for first few cron runs
2. Verify sentiment data appears in Pulse page
3. Add real API keys for Bluesky, Reddit, Google Trends
4. Tune keyword lists and collection frequency
5. Add monitoring and alerting

---

**Last Updated**: 2026-02-26
**Service Version**: 1.0.0
**Deployment**: Railway (Production)
