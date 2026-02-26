# Cache Layer Deployment Checklist

> Pre-deployment verification and setup steps for the Redis caching abstraction.

## Pre-Deployment

### Environment Setup

- [ ] Verify `UPSTASH_REDIS_REST_URL` is set in `.env.local`
- [ ] Verify `UPSTASH_REDIS_REST_TOKEN` is set in `.env.local`
- [ ] Test Redis connection locally: `npm run test -- cache.test.ts`
- [ ] All tests pass

### Code Review

- [ ] Review `src/lib/db/cache.ts` (890 lines, production-ready)
- [ ] Review all new usages of `cached()`, `cachedBatch()`, etc.
- [ ] Ensure all cache keys use `cacheKeys.*` utilities (no hardcoded strings)
- [ ] Ensure all invalidations use `invalidateByTag()` or `invalidatePattern()`
- [ ] Check TTLs are appropriate for each data type

### Documentation Review

- [ ] Team has read `docs/CACHE_QUICK_REFERENCE.md` (5-minute read)
- [ ] Team is aware of patterns in `docs/CACHING_GUIDE.md`
- [ ] Team knows how to debug with `{ debug: true }` option
- [ ] Team understands graceful degradation when Redis fails

### Performance Testing

- [ ] Verify cache hit rates are above 50% in staging
- [ ] Monitor response times: cache hits should be <20ms
- [ ] Check memory usage in Redis doesn't exceed budget
- [ ] Load test with expected concurrent users

### Backup Plan

- [ ] Know how to disable cache if issues arise
- [ ] Have rollback procedure ready
- [ ] Alert thresholds configured (hit rate < 50%, memory > limit)

## Deployment

### Before Deploy

```bash
# Run all tests
npm test -- cache.test.ts

# Build and verify no TypeScript errors
npm run build

# Check for any cache-related TypeScript warnings
npm run type-check
```

### During Deploy

```bash
# Deploy normally via Vercel/your platform
# No special steps needed

# Verify Redis connection is working
# (Check logs for "Redis unavailable" warnings)
```

### After Deploy

- [ ] Verify Redis connection established (check logs)
- [ ] Check cache statistics: `getCacheStats()` in endpoint
- [ ] Monitor first hour: hit rate should climb
- [ ] Verify no "[REDIS ERROR]" messages in logs

## Initial Cache Warming (Optional But Recommended)

To prevent cache cold-start after deployment:

### Option 1: Manual Cache Warming

Create a cron job or API endpoint:

```typescript
// src/app/api/cron/warm-cache/route.ts
import { warmCache, CACHE_TTL, cacheKeys, cacheTags } from '@/lib/db/cache';

export async function POST(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const season = 2024;
  const week = 12;

  const result = await warmCache([
    {
      key: cacheKeys.rankings(season, week, 'FBS'),
      computeFn: () => computeGridRank(season, week, 'FBS'),
      ttl: CACHE_TTL.RANKINGS,
      tags: [cacheTags.season(season), cacheTags.week(season, week)],
    },
    {
      key: cacheKeys.rankings(season, week, 'FCS'),
      computeFn: () => computeGridRank(season, week, 'FCS'),
      ttl: CACHE_TTL.RANKINGS,
      tags: [cacheTags.season(season), cacheTags.week(season, week)],
    },
  ]);

  return Response.json(result);
}
```

Call this endpoint after deployment:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://yourdomain.com/api/cron/warm-cache
```

### Option 2: Vercel Deployment Webhook

Add to `vercel.json`:

```json
{
  "deploymentCompletedHooks": [
    {
      "url": "https://yourdomain.com/api/cron/warm-cache",
      "headers": {
        "Authorization": "Bearer ${{ secrets.CRON_SECRET }}"
      }
    }
  ]
}
```

## Monitoring Setup

### Metrics to Track

```typescript
// In an observability dashboard (DataDog, New Relic, etc.)

import { getCacheStats } from '@/lib/db/cache';

export async function reportMetrics() {
  const stats = await getCacheStats();

  metrics.gauge('cache.hit_rate', stats.hitRate);
  metrics.gauge('cache.total_keys', stats.totalKeys);
  metrics.gauge('cache.hits', stats.hits);
  metrics.gauge('cache.misses', stats.misses);
}

// Call every minute from a cron job
```

### Alert Rules

```
Alert if:
  cache.hit_rate < 50%        → Invalidation too aggressive or TTLs too short
  cache.total_keys > 10000    → Memory usage too high
  Redis connection errors     → Check Upstash status
```

## Troubleshooting

### Cache Hit Rate Too Low

**Problem:** Hit rate below 50%

**Causes:**
1. Keys are not consistent (use `cacheKeys.*`)
2. TTLs are too short
3. Data is invalidated too frequently
4. Cache size is too small (Upstash quota exceeded)

**Solutions:**
1. Verify all cached calls use semantic keys
2. Check TTLs match your data freshness requirements
3. Audit invalidation patterns, ensure not over-invalidating
4. Check Redis memory usage; consider paid Upstash tier

### Memory Usage Too High

**Problem:** Redis memory exceeds budget

**Causes:**
1. TTLs are too long
2. Cache keys are not being cleaned up
3. Caching objects that are too large

**Solutions:**
1. Reduce TTLs for high-volume data
2. Verify Redis is cleaning up expired keys (TTL is set)
3. Check what's being cached; serialize more efficiently
4. Use `cachedBatch()` instead of individual cached() calls

### Redis Connection Issues

**Problem:** "[REDIS ERROR]" or "[REDIS GET FAILED]" in logs

**Causes:**
1. Network latency to Upstash (5-10ms normal)
2. Redis quota exceeded
3. Invalid credentials
4. Upstash service issue

**Solutions:**
1. Check Upstash dashboard for quota/errors
2. Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Check Upstash status page
4. Cache will fall through to compute; performance degrades but app works

### Stale Data

**Problem:** Users see outdated information

**Causes:**
1. TTL is too long
2. Invalidation isn't being called after updates
3. Tags not set on cached calls

**Solutions:**
1. Reduce TTL for that data type
2. Ensure all data updates call `invalidateByTag()` or `invalidate()`
3. Add tags to all `cached()` calls: `{ tags: [tag1, tag2] }`
4. Use stale-while-revalidate for non-critical data

## Post-Deployment Monitoring

### First Week

- [ ] Monitor hit rate daily (should be 70%+)
- [ ] Check for any Redis connection errors
- [ ] Review response time improvements (cache hits should be <20ms)
- [ ] Verify no user complaints about stale data

### First Month

- [ ] Analyze hit rate by data type (rankings, team pages, etc.)
- [ ] Adjust TTLs if needed based on actual freshness requirements
- [ ] Optimize heavy cache operations (consider batch loading)
- [ ] Document actual cache performance in CLAUDE.md

### Ongoing

- [ ] Monitor hit rate monthly
- [ ] Alert on hit rate drops
- [ ] Audit cache invalidation patterns quarterly
- [ ] Review memory usage and consider tier changes if needed

## Rollback Plan

If cache causes issues, disable it quickly:

### Option 1: Quick Disable

In all `cached()` calls, add:

```typescript
export const CACHE_ENABLED = false; // Set to true to enable

await cached(
  key,
  computeFn,
  CACHE_ENABLED ? CACHE_TTL.RANKINGS : 1, // TTL=1 means data expires immediately
);
```

Then update the constant in `.env`:

```
CACHE_ENABLED=false
```

### Option 2: Redis Disconnect

Stop the Redis service temporarily:

- Upstash dashboard → Suspend instance
- All cache calls fall through to compute
- App continues working normally, just slower

### Option 3: Full Rollback

Revert the commits that added caching:

```bash
git revert <commit-hash>
npm run build
vercel deploy
```

All previous behavior is restored immediately.

## Success Criteria

Cache deployment is successful when:

- [ ] All tests pass
- [ ] No Redis connection errors in logs
- [ ] Cache hit rate > 70% after 24 hours
- [ ] Response times for cache hits < 20ms
- [ ] Memory usage stable and within budget
- [ ] No increase in error rates
- [ ] Team is using cache in new features
- [ ] Monitoring alerts are configured and working

## Handoff to Team

Before handing off to the team:

1. **Share Documentation**
   - `docs/CACHE_QUICK_REFERENCE.md` — copy-paste examples
   - `docs/CACHING_GUIDE.md` — comprehensive guide
   - `docs/CACHE_IMPLEMENTATION.md` — technical details

2. **Demonstrate Usage**
   - Show cached() in a page component
   - Show cachedBatch() loading multiple items
   - Show invalidateByTag() on data update
   - Show debug mode: `{ debug: true }`

3. **Review Code**
   - Walk through `src/lib/db/cache.ts`
   - Highlight error handling strategy
   - Explain graceful degradation

4. **Test Together**
   - Run tests: `npm test -- cache.test.ts`
   - Monitor cache stats in real app
   - Trigger cache invalidation manually

5. **Set Up Monitoring**
   - Create dashboard for hit rate, memory, errors
   - Configure alerts
   - Decide on escalation path if issues arise

## Contact & Support

If issues arise after deployment:

1. **Check Logs**
   - Look for "[CACHE" or "[REDIS" messages
   - Check Upstash dashboard for errors

2. **Consult Documentation**
   - Troubleshooting section in this file
   - `docs/CACHE_IMPLEMENTATION.md` → Error Handling section

3. **Review Code**
   - `src/lib/db/cache.ts` — all functions documented
   - `src/lib/db/__tests__/cache.test.ts` — usage examples

4. **Verify Environment**
   - Confirm Redis credentials are set
   - Check Upstash quota hasn't been exceeded
   - Verify network connectivity to Upstash

## Deployment Sign-Off

- [ ] Code review completed
- [ ] Tests pass locally
- [ ] Tests pass in CI/CD
- [ ] Documentation reviewed by team
- [ ] Monitoring set up and tested
- [ ] Rollback plan understood by team
- [ ] Deployed to staging, tested
- [ ] Ready for production deployment

**Deployed by:** ________________
**Date:** ________________
**Version:** ________________
