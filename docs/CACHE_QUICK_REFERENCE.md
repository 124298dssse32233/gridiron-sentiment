# Cache Layer Quick Reference

> Copy-paste ready examples for the most common caching patterns.

## Import

```typescript
import {
  cached,
  cachedBatch,
  invalidate,
  invalidateByTag,
  staleWhileRevalidate,
  warmCache,
  CACHE_TTL,
  cacheKeys,
  cacheTags,
} from '@/lib/db/cache';
```

## 1. Basic Caching (Most Common)

**Cache a single expensive operation:**

```typescript
const rankings = await cached(
  cacheKeys.rankings(2024, 12, 'FBS'),
  () => computeGridRank(2024, 12, 'FBS'),
  CACHE_TTL.RANKINGS
);
```

**With invalidation tags:**

```typescript
const rankings = await cached(
  cacheKeys.rankings(2024, 12, 'FBS'),
  () => computeGridRank(2024, 12, 'FBS'),
  CACHE_TTL.RANKINGS,
  {
    tags: [
      cacheTags.season(2024),
      cacheTags.week(2024, 12),
      cacheTags.rankings(),
    ]
  }
);
```

## 2. Batch Loading (Load Many Items)

**Load 100 teams efficiently:**

```typescript
const teamIds = ['alabama', 'georgia', 'ohio-state', ...]; // 100 items

const teams = await cachedBatch(
  'team:',
  teamIds,
  async (missing) => {
    const rows = await db.team.findMany({
      where: { slug: { in: missing } }
    });
    return new Map(rows.map(t => [t.slug, t]));
  },
  CACHE_TTL.TEAM_PROFILE,
  { tags: [cacheTags.team] }
);

// Result is a Map<id, value>
teams.get('alabama');
```

## 3. Invalidate One Key

```typescript
await invalidate(cacheKeys.team('alabama'));
```

## 4. Invalidate by Pattern

```typescript
// All Alabama caches
await invalidatePattern('team:alabama:*');

// All rankings
await invalidatePattern('rankings:*');

// All 2024 season data
await invalidatePattern('*2024*');
```

## 5. Invalidate by Tag (Cleanest)

```typescript
// When a team's roster is updated
await invalidateByTag(cacheTags.team('alabama'));

// When a week completes
await invalidateByTag(cacheTags.week(2024, 12));

// When the entire season is refreshed
await invalidateByTag(cacheTags.season(2024));
```

## 6. Stale-While-Revalidate (Fast + Fresh)

**For expensive operations, serve stale data instantly:**

```typescript
const simulation = await staleWhileRevalidate(
  cacheKeys.matchup('alabama', 'georgia', 10000),
  () => runMonteCarloSimulation('alabama', 'georgia', 10000),
  CACHE_TTL.MATCHUP_SIM,
  600  // Stale for up to 10 minutes is acceptable
);
```

## 7. Preload Cache on Deploy

**In a cron job or deploy hook:**

```typescript
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
]);

console.log(`Warmed ${result.warmed}, failed ${result.failed}`);
```

## 8. Monitor Cache Health

```typescript
const stats = await getCacheStats();
console.log(`Hit rate: ${stats.hitRate}%`);
console.log(`Total keys: ${stats.totalKeys}`);
console.log(`Memory: ${stats.memoryUsage}`);

if (stats.hitRate < 50) {
  alerts.warn('Low cache hit rate');
}
```

## 9. Debug Mode (Development)

```typescript
await cached(
  key,
  () => compute(),
  ttl,
  { debug: true }
);

// Logs:
// [CACHE HIT] key (12.34ms)
// [CACHE MISS] key
// [CACHE COMPUTE] key (5234.12ms)
```

## 10. Custom Serialization

**For objects with Date, BigInt, etc.:**

```typescript
await cached(
  key,
  computeFn,
  ttl,
  {
    serialize: (data) => JSON.stringify(data, (_, v) => {
      if (v instanceof Date) return { $date: v.toISOString() };
      if (typeof v === 'bigint') return { $bigint: v.toString() };
      return v;
    }),
    deserialize: (str) => JSON.parse(str, (_, v) => {
      if (v?.$date) return new Date(v.$date);
      if (v?.$bigint) return BigInt(v.$bigint);
      return v;
    }),
  }
);
```

## Cache TTL Constants

```typescript
CACHE_TTL.RANKINGS         // 1 hour
CACHE_TTL.TEAM_PROFILE     // 30 minutes
CACHE_TTL.GAMES            // 10 minutes
CACHE_TTL.PREDICTIONS      // 2 hours
CACHE_TTL.CHAOS_INDEX      // 1 hour
CACHE_TTL.MATCHUP_SIM      // 10 minutes (expensive)
CACHE_TTL.COACH_GRADES     // 2 hours
CACHE_TTL.AWARDS           // 2 hours
CACHE_TTL.SEARCH_INDEX     // 12 hours
CACHE_TTL.CONFERENCE       // 1 hour
CACHE_TTL.METHODOLOGY      // 24 hours
CACHE_TTL.RECRUITING       // 2 hours
CACHE_TTL.RIVALRY          // 2 hours
CACHE_TTL.ROSTER           // 1 hour
CACHE_TTL.SOS              // 1 hour
CACHE_TTL.HISTORICAL       // 24 hours
CACHE_TTL.LIVE_SCORES      // 30 seconds
```

## Cache Key Functions

```typescript
// Consistent, type-safe key generation
cacheKeys.rankings(2024, 12, 'FBS')           // "rankings:2024:12:FBS"
cacheKeys.team('alabama')                      // "team:alabama"
cacheKeys.teamGames('georgia', 2024)          // "team:georgia:games:2024"
cacheKeys.matchup('alabama', 'georgia', 10k)  // "matchup:alabama:georgia:10000"
cacheKeys.chaos(2024, 12)                     // "chaos:2024:12"
cacheKeys.coach('id', 2024)                   // "coach:id:2024"
cacheKeys.predictions(2024, 12)               // "predictions:2024:12"
cacheKeys.awards(2024, 'Heisman')             // "awards:2024:Heisman"
cacheKeys.conference('sec')                   // "conference:sec"
cacheKeys.rivalry('alabama', 'auburn')        // "rivalry:alabama:auburn"
cacheKeys.recruiting(2024, 'QB')              // "recruiting:2024:QB"
cacheKeys.roster('alabama')                   // "roster:alabama"
cacheKeys.sos('alabama', 2024)                // "sos:alabama:2024"
```

## Cache Tag Functions

```typescript
// Grouped invalidation tags
cacheTags.team('alabama')              // "tag:team:alabama"
cacheTags.season(2024)                 // "tag:season:2024"
cacheTags.week(2024, 12)               // "tag:week:2024:12"
cacheTags.conference('sec')            // "tag:conference:sec"
cacheTags.live()                       // "tag:live"
cacheTags.rankings()                   // "tag:rankings"
```

## Real-World Patterns

### Pattern: Team Page

```typescript
// src/app/team/[slug]/page.tsx
export default async function TeamPage({ params }: { params: { slug: string } }) {
  const team = await cached(
    cacheKeys.team(params.slug),
    () => db.team.findUnique({ where: { slug: params.slug } }),
    CACHE_TTL.TEAM_PROFILE,
    { tags: [cacheTags.team(params.slug)] }
  );

  const games = await cached(
    cacheKeys.teamGames(params.slug, 2024),
    () => db.game.findMany({/* ... */}),
    CACHE_TTL.GAMES,
    { tags: [cacheTags.team(params.slug)] }
  );

  return <TeamContent team={team} games={games} />;
}
```

### Pattern: Bulk API Endpoint

```typescript
// src/app/api/teams/bulk/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.getAll('id');

  const teams = await cachedBatch(
    'team:',
    ids,
    async (missing) => {
      const rows = await db.team.findMany({
        where: { slug: { in: missing } }
      });
      return new Map(rows.map(t => [t.slug, t]));
    },
    CACHE_TTL.TEAM_PROFILE
  );

  return Response.json(Array.from(teams.values()));
}
```

### Pattern: Expensive Computation with SWR

```typescript
// src/app/matchup/page.tsx
export default async function MatchupPage({ searchParams }: { searchParams: Record<string, string> }) {
  const teamA = searchParams.a || 'alabama';
  const teamB = searchParams.b || 'georgia';

  // Users get instant response with last week's simulation
  // While we compute this week's in the background
  const simulation = await staleWhileRevalidate(
    cacheKeys.matchup(teamA, teamB, 10000),
    () => runMonteCarloSimulation(teamA, teamB, 10000),
    CACHE_TTL.MATCHUP_SIM,
    600
  );

  return <MatchupResults data={simulation} />;
}
```

### Pattern: Cache Refresh on Update

```typescript
// src/app/api/admin/teams/[id]/route.ts (PUT endpoint)
export async function PUT(request: Request) {
  const data = await request.json();

  // Update database
  const team = await db.team.update({
    where: { id: data.id },
    data: { name: data.name, /* ... */ }
  });

  // Invalidate all related caches
  await invalidateByTag(cacheTags.team(team.slug));

  return Response.json(team);
}
```

### Pattern: Cron Job Cache Warming

```typescript
// src/app/api/cron/warm-rankings/route.ts
export async function POST(request: Request) {
  // Auth check
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const season = 2024;
  const week = 12;

  // Invalidate old rankings for this week
  await invalidateByTag(cacheTags.week(season, week));

  // Preload new rankings
  const result = await warmCache([
    { key: cacheKeys.rankings(season, week, 'FBS'), computeFn: () => computeRankings(season, week, 'FBS'), ttl: CACHE_TTL.RANKINGS, tags: [cacheTags.week(season, week)] },
    { key: cacheKeys.rankings(season, week, 'FCS'), computeFn: () => computeRankings(season, week, 'FCS'), ttl: CACHE_TTL.RANKINGS, tags: [cacheTags.week(season, week)] },
    { key: cacheKeys.chaos(season, week), computeFn: () => computeChaos(season, week), ttl: CACHE_TTL.CHAOS_INDEX, tags: [cacheTags.week(season, week)] },
  ]);

  return Response.json({
    warmed: result.warmed,
    failed: result.failed,
    duration: `${result.duration}ms`,
    errors: result.errors.map(e => ({ key: e.key, error: e.error })),
  });
}
```

## Error Scenarios

All errors are handled gracefully. If Redis fails:

```typescript
// Example: Redis is down

await cached(key, computeFn, ttl);
// → Redis GET fails
// → Falls through to computeFn()
// → Calls computeFn()
// → Returns computed value
// → App continues normally, just without cache
```

No exceptions thrown. No page crashes. Just slower response times.

## Performance Tips

1. **Use `cachedBatch()` instead of looping `cached()`**
   - 100 items: 1 MGET instead of 100 GETs
   - Reduces latency from 1000ms to 10ms

2. **Use `staleWhileRevalidate()` for expensive computations**
   - Users get instant response with stale data
   - Background refresh keeps data fresh
   - Better UX for heavy operations

3. **Use tags for invalidation, not patterns**
   - `invalidateByTag()` is instant (in-memory)
   - `invalidatePattern()` is slower (Redis KEYS scan)

4. **Warm cache before deployments**
   - Prevents thundering herd when app restarts
   - Users always hit cache

5. **Monitor hit rates**
   - Track with `getCacheStats()`
   - Goal: 70%+ hit rate in production
   - If below 50%, adjust TTLs or invalidation strategy

## Troubleshooting

**Cache never hits:**
- Check key consistency. Use `cacheKeys.*` functions.
- Check forceRefresh isn't being used
- Monitor logs in debug mode

**Memory usage increasing:**
- Check TTLs. Longer TTLs = more data in cache
- Monitor with `getCacheStats()`
- Use `invalidateAll()` to clear cache during development

**Redis connection errors:**
- Check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
- Cache falls through to compute automatically
- Check Upstash dashboard for quota limits

**Tag invalidation not working:**
- Tags are in-memory per process
- If you run multiple processes, tags don't sync
- Use `invalidatePattern()` as workaround
- Restart process to clear tag registry

## Further Reading

- **Full Guide:** `docs/CACHING_GUIDE.md`
- **Implementation Details:** `docs/CACHE_IMPLEMENTATION.md`
- **Tests & Examples:** `src/lib/db/__tests__/cache.test.ts`
