# Gridiron Intel Caching Strategy Guide

> A comprehensive guide to using the production-grade Redis caching abstraction for Gridiron Intel.

## Overview

The caching layer (`src/lib/db/cache.ts`) provides:

- **Smart memoization** — Automatic `get-or-compute` with atomic writes
- **Batch operations** — Efficient multi-key loading (e.g., 100 team profiles in one Redis roundtrip)
- **Tag-based invalidation** — Group-invalidate all "Alabama-related" caches with one call
- **Stale-while-revalidate** — Instant responses + background refresh for slow computations
- **Cache warming** — Preload expensive data during deployment
- **Monitoring** — Hit/miss rates, memory usage, and per-operation timing
- **Graceful degradation** — If Redis is down, the app falls through to compute (no broken pages)

## Quick Start

### 1. Basic Caching

```typescript
import { cached, CACHE_TTL, cacheKeys } from '@/lib/db/cache';

// Compute once, cache for 1 hour
const rankings = await cached(
  cacheKeys.rankings(2024, 12, 'FBS'),
  () => computeGridRank(2024, 12, 'FBS'),
  CACHE_TTL.RANKINGS
);
```

### 2. Caching with Tags (Invalidation Groups)

```typescript
import { cached, CACHE_TTL, cacheKeys, cacheTags } from '@/lib/db/cache';

// Cache rankings with tags so we can invalidate them as a group
const rankings = await cached(
  cacheKeys.rankings(2024, 12, 'FBS'),
  () => computeGridRank(2024, 12, 'FBS'),
  CACHE_TTL.RANKINGS,
  {
    tags: [
      cacheTags.season(2024),     // All 2024 season caches
      cacheTags.week(2024, 12),   // All week 12 caches
      cacheTags.rankings(),        // All rankings caches
    ]
  }
);
```

### 3. Batch Loading (Multiple Items)

```typescript
import { cachedBatch, CACHE_TTL, cacheKeys } from '@/lib/db/cache';

// Load 100 teams: hit cache for any that exist, compute + cache the rest
const teamIds = ['alabama', 'georgia', 'ohio-state', ...];
const teams = await cachedBatch(
  'team:',  // key prefix
  teamIds,
  async (missingIds) => {
    // Only called for teams not in cache
    const rows = await db.team.findMany({
      where: { slug: { in: missingIds } }
    });
    return new Map(rows.map(t => [t.slug, t]));
  },
  CACHE_TTL.TEAM_PROFILE,
  { tags: ['tag:team'] }
);

const alabama = teams.get('alabama');
```

### 4. Stale-While-Revalidate (Fast + Fresh)

```typescript
import { staleWhileRevalidate, CACHE_TTL, cacheKeys } from '@/lib/db/cache';

// Return stale rankings immediately while refreshing in background
// (useful for expensive computations like Monte Carlo simulations)
const rankings = await staleWhileRevalidate(
  cacheKeys.matchup('alabama', 'georgia', 10000),
  () => runMonteCarloSimulation('alabama', 'georgia', 10000),
  CACHE_TTL.MATCHUP_SIM,
  300  // stale for up to 5 minutes is acceptable
);
```

### 5. Invalidation

```typescript
import {
  invalidate,
  invalidatePattern,
  invalidateByTag,
  invalidateAll
} from '@/lib/db/cache';

// Invalidate one key
await invalidate('rankings:2024:12:FBS');

// Invalidate by pattern (Redis glob)
await invalidatePattern('team:alabama:*');  // All Alabama caches

// Invalidate by tag (all keys with a tag)
await invalidateByTag('tag:team:alabama');  // Same thing, cleaner

// Nuclear option (use rarely!)
await invalidateAll();
```

### 6. Cache Warming (Preload on Deploy)

```typescript
import { warmCache, CACHE_TTL, cacheKeys, cacheTags } from '@/lib/db/cache';

// In a cron job or deploy hook, preload expensive data
const result = await warmCache([
  {
    key: cacheKeys.rankings(2024, 12, 'FBS'),
    computeFn: () => computeGridRank(2024, 12, 'FBS'),
    ttl: CACHE_TTL.RANKINGS,
    tags: [cacheTags.season(2024), cacheTags.week(2024, 12)],
  },
  {
    key: cacheKeys.rankings(2024, 12, 'FCS'),
    computeFn: () => computeGridRank(2024, 12, 'FCS'),
    ttl: CACHE_TTL.RANKINGS,
    tags: [cacheTags.season(2024), cacheTags.week(2024, 12)],
  },
  // ... other keys
]);

console.log(`Warmed ${result.warmed} keys in ${result.duration}ms`);
```

### 7. Debug Mode

```typescript
const rankings = await cached(
  cacheKeys.rankings(2024, 12, 'FBS'),
  () => computeGridRank(2024, 12, 'FBS'),
  CACHE_TTL.RANKINGS,
  { debug: true }
);

// Logs:
// [CACHE HIT] rankings:2024:12:FBS (45.32ms)
// or
// [CACHE MISS] rankings:2024:12:FBS
// [CACHE COMPUTE] rankings:2024:12:FBS (5234.12ms)
```

### 8. Monitoring

```typescript
import { getCacheStats } from '@/lib/db/cache';

const stats = await getCacheStats();
console.log(`Cache hit rate: ${stats.hitRate}%`);
console.log(`Total keys: ${stats.totalKeys}`);
console.log(`Memory: ${stats.memoryUsage}`);

// Output:
// Cache hit rate: 87.5%
// Total keys: 342
// Memory: 2.4M
```

## Patterns & Best Practices

### Pattern 1: Page Rendering with Caching

```typescript
// src/app/team/[slug]/page.tsx
import { cached, CACHE_TTL, cacheKeys, cacheTags } from '@/lib/db/cache';

export const revalidate = 300; // ISR: revalidate every 5 minutes

export default async function TeamPage({ params }: { params: { slug: string } }) {
  const team = await cached(
    cacheKeys.team(params.slug),
    () => db.team.findUnique({ where: { slug: params.slug } }),
    CACHE_TTL.TEAM_PROFILE,
    { tags: [cacheTags.team(params.slug)] }
  );

  if (!team) return notFound();

  const games = await cached(
    cacheKeys.teamGames(params.slug, 2024),
    () => db.game.findMany({
      where: {
        OR: [
          { homeTeamId: team.id },
          { awayTeamId: team.id }
        ]
      }
    }),
    CACHE_TTL.GAMES,
    { tags: [cacheTags.team(params.slug), cacheTags.season(2024)] }
  );

  return (
    <div>
      <h1>{team.name}</h1>
      <GameList games={games} />
    </div>
  );
}
```

### Pattern 2: API Route with Batch Loading

```typescript
// src/app/api/teams/bulk/route.ts
import { cachedBatch, CACHE_TTL, cacheTags } from '@/lib/db/cache';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.getAll('id');

  const teams = await cachedBatch(
    'team:',
    ids,
    async (missing) => {
      const rows = await db.team.findMany({
        where: { slug: { in: missing } },
        select: { slug: true, name: true, level: true }
      });
      return new Map(rows.map(t => [t.slug, t]));
    },
    CACHE_TTL.TEAM_PROFILE,
    { tags: [cacheTags.team] }
  );

  return Response.json(Array.from(teams.values()));
}
```

### Pattern 3: Background Refresh (Cron Job)

```typescript
// src/app/api/cron/compute-rankings/route.ts
import { invalidateByTag, warmCache, CACHE_TTL, cacheKeys, cacheTags } from '@/lib/db/cache';

export async function POST(request: Request) {
  // Check auth header
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const season = 2024;
  const week = 12;

  // Invalidate old rankings
  await invalidateByTag(cacheTags.week(season, week));

  // Preload new rankings
  const result = await warmCache([
    {
      key: cacheKeys.rankings(season, week, 'FBS'),
      computeFn: () => computeGridRank(season, week, 'FBS'),
      ttl: CACHE_TTL.RANKINGS,
      tags: [cacheTags.week(season, week)],
    },
    {
      key: cacheKeys.rankings(season, week, 'FCS'),
      computeFn: () => computeGridRank(season, week, 'FCS'),
      ttl: CACHE_TTL.RANKINGS,
      tags: [cacheTags.week(season, week)],
    },
  ]);

  return Response.json({
    warmed: result.warmed,
    failed: result.failed,
    duration: `${result.duration}ms`
  });
}
```

### Pattern 4: Force Refresh with User Trigger

```typescript
// src/app/admin/refresh/route.ts
import { cached, invalidate, CACHE_TTL, cacheKeys } from '@/lib/db/cache';

export async function POST(request: Request) {
  const { key } = await request.json();

  // Invalidate
  await invalidate(key);

  // Immediately recompute
  const value = await cached(
    key,
    () => computeValue(key),
    CACHE_TTL.RANKINGS,
    { forceRefresh: true }
  );

  return Response.json({ refreshed: true, value });
}
```

### Pattern 5: Stale-While-Revalidate for Expensive Sims

```typescript
// src/app/matchup/page.tsx (server component)
import { staleWhileRevalidate, CACHE_TTL, cacheKeys } from '@/lib/db/cache';

export default async function MatchupPage({
  searchParams,
}: {
  searchParams: { a?: string; b?: string };
}) {
  const teamA = searchParams.a || 'alabama';
  const teamB = searchParams.b || 'georgia';

  // This simulation takes 2-5 seconds
  // With SWR, users get last week's result instantly
  // while we compute this week's result in the background
  const simulation = await staleWhileRevalidate(
    cacheKeys.matchup(teamA, teamB, 10000),
    () => runMonteCarloSimulation(teamA, teamB, 10000),
    CACHE_TTL.MATCHUP_SIM,
    600  // stale for up to 10 minutes is acceptable
  );

  return (
    <div>
      <h1>{teamA} vs {teamB}</h1>
      <SimulationResults data={simulation} />
    </div>
  );
}
```

## Cache TTL Reference

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| **LIVE_SCORES** | 30s | Real-time updates during games |
| **RANKINGS** | 1h | Updated after each week; users expect fresh data |
| **TEAM_PROFILE** | 30m | Team info changes slowly; balance freshness with load |
| **PREDICTIONS** | 2h | Weekly predictions; refresh every couple hours |
| **HISTORICAL** | 24h | Past data rarely changes |
| **CHAOS_INDEX** | 1h | Recalculate after each week |
| **MATCHUP_SIM** | 10m | Expensive computation; 10 min is a good balance |
| **COACH_GRADES** | 2h | Updated weekly |
| **AWARDS** | 2h | Award predictions updated weekly |
| **SEARCH_INDEX** | 12h | Indexing is expensive; 12h is acceptable staleness |
| **CONFERENCE** | 1h | Same as rankings |
| **METHODOLOGY** | 24h | Static content; rarely changes |
| **RECRUITING** | 2h | Portal updates; refresh frequently |
| **GAMES** | 10m | Scores update live; 10 min is good |
| **RIVALRY** | 2h | Historical data; infrequently updated |
| **ROSTER** | 1h | Roster changes weekly |
| **SOS** | 1h | Strength of schedule updates weekly |

## Tag-Based Invalidation Reference

| Tag | Invalidates |
|-----|------------|
| `tag:team:alabama` | All Alabama-related caches (profile, games, roster, SOS) |
| `tag:season:2024` | All 2024 season data (rankings, games, predictions) |
| `tag:week:2024:12` | All week 12 data (rankings, predictions, chaos) |
| `tag:conference:sec` | All SEC-related caches |
| `tag:live` | All real-time/live data (scores, WP charts) |
| `tag:rankings` | All rankings caches (by level and week) |

## Common Mistakes

### ❌ Don't: Compute Inside Cached Key

```typescript
// BAD: Key changes every time, cache never hits
const key = Math.random().toString();
const data = await cached(key, () => fetchData(), 3600);
```

### ✅ Do: Use Semantic Keys

```typescript
// GOOD: Consistent key, cache hits
const key = cacheKeys.rankings(2024, 12, 'FBS');
const data = await cached(key, () => computeRankings(), CACHE_TTL.RANKINGS);
```

### ❌ Don't: Forget Tags for Invalidation

```typescript
// BAD: Can't invalidate without knowing exact key
await cached('rankings', () => compute(), 3600);
```

### ✅ Do: Always Tag Predictable Invalidation

```typescript
// GOOD: Can invalidate by season/week
await cached(
  cacheKeys.rankings(2024, 12, 'FBS'),
  () => compute(),
  CACHE_TTL.RANKINGS,
  { tags: [cacheTags.season(2024), cacheTags.week(2024, 12)] }
);
```

### ❌ Don't: Cache Errors

```typescript
// BAD: Caches even if compute throws
const data = await cached(key, async () => {
  const response = await fetch('/api/broken');
  return response.json(); // May be null
}, 3600);
```

### ✅ Do: Validate Before Caching

```typescript
// GOOD: Only cache valid data
const data = await cached(
  key,
  async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('API failed');
    return response.json();
  },
  CACHE_TTL.RANKINGS
);
```

### ❌ Don't: Overuse SWR

```typescript
// BAD: Every request triggers background refreshes
const data = await staleWhileRevalidate(
  key,
  () => compute(),
  3600,
  10  // 10 second stale window = constant refreshes!
);
```

### ✅ Do: Use Reasonable Stale Windows

```typescript
// GOOD: Stale window wide enough to prevent thrashing
const data = await staleWhileRevalidate(
  key,
  () => compute(),
  3600,
  600  // 10 minute stale window
);
```

## Redis Failure Modes

The caching layer is designed to gracefully degrade if Redis is unavailable:

1. **Redis GET fails** → Fall through to compute
2. **Redis SET fails** → Compute succeeds anyway; log warning
3. **Redis FLUSHDB fails** → Log warning; continue app
4. **Redis CONNECTION timeout** → All calls eventually compute; no app crash

In all cases, the app continues to function, just without cache benefits.

## Testing

```typescript
import {
  cached,
  resetStats,
  getCacheStats,
  invalidate,
  CACHE_TTL,
  cacheKeys
} from '@/lib/db/cache';

describe('caching', () => {
  afterEach(() => resetStats());

  it('should cache values', async () => {
    let callCount = 0;
    const key = cacheKeys.team('test');

    await cached(key, async () => { callCount++; return 'value'; }, CACHE_TTL.TEAM_PROFILE);
    await cached(key, async () => { callCount++; return 'value'; }, CACHE_TTL.TEAM_PROFILE);

    expect(callCount).toBe(1); // Called once
    const stats = await getCacheStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('should invalidate', async () => {
    const key = cacheKeys.team('test');
    let callCount = 0;

    await cached(key, async () => { callCount++; return 'v1'; }, CACHE_TTL.TEAM_PROFILE);
    await cached(key, async () => { callCount++; return 'v1'; }, CACHE_TTL.TEAM_PROFILE);
    await invalidate(key);
    await cached(key, async () => { callCount++; return 'v2'; }, CACHE_TTL.TEAM_PROFILE);

    expect(callCount).toBe(2);
  });
});
```

## Monitoring & Alerts

Hook into `getCacheStats()` for monitoring:

```typescript
// Emit cache stats to observability service
async function emitCacheMetrics() {
  const stats = await getCacheStats();

  metrics.gauge('cache.hit_rate', stats.hitRate);
  metrics.gauge('cache.total_keys', stats.totalKeys);
  metrics.gauge('cache.memory_mb', parseMemory(stats.memoryUsage));

  if (stats.hitRate < 50) {
    alerts.warn('Cache hit rate below 50%');
  }
}
```

## Next Steps

1. **Adopt caching** in heavy-compute pages (rankings, matchup sims, predictions)
2. **Monitor** hit rates and memory usage
3. **Tune TTLs** based on data freshness requirements
4. **Use tags** for all invalidatable data
5. **Warm cache** before/after deployments
