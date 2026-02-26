# Cache Layer Implementation Details

> Technical deep-dive into the Redis caching abstraction for Gridiron Intel

## Overview

The cache layer (`src/lib/db/cache.ts`) provides a production-grade abstraction for Redis-backed caching. It's designed to be:

- **Smart** — Automatic memoization with atomic writes
- **Efficient** — Batch operations, reduced roundtrips
- **Reliable** — Graceful degradation when Redis is unavailable
- **Scalable** — Tag-based invalidation for complex scenarios
- **Observable** — Built-in stats and debug logging

## Architecture

### Layer Stack

```
Application Layer (pages, API routes)
         ↓
Cache Layer (cache.ts)
         ↓
Redis Client (redis.ts)
         ↓
Upstash Redis Service
```

The cache layer sits between application code and the Upstash Redis client, adding:
- Automatic serialization/deserialization
- Error handling and graceful degradation
- Tag registry for grouped invalidation
- Statistics tracking
- Debug logging

### Design Principles

1. **Fail-Safe** — If Redis fails, compute function is called; app never breaks
2. **Atomic** — Either data is fully cached or it's recomputed; no partial state
3. **Observable** — Track hits, misses, and timing for monitoring
4. **Flexible** — Support custom serialization, tags, SWR, batch operations
5. **Minimal** — Small overhead per cache operation

## Core Functions

### `cached<T>(key, computeFn, ttl, options?): Promise<T>`

The most-used function. Implements the get-or-compute pattern:

```typescript
export async function cached<T>(
  key: string,
  computeFn: () => Promise<T>,
  ttl: number,
  options: CacheOptions = {}
): Promise<T> {
  // 1. Try to read from cache
  // 2. If hit: return (track stat, log debug)
  // 3. If miss: compute value
  // 4. Write to cache (async, don't wait)
  // 5. Return computed value
}
```

**Flow:**

```
┌──────────────┐
│   Request    │
└──────┬───────┘
       │
       ├─ Try Redis GET(key)
       │
       ├─ HIT? → Deserialize → Return
       │  └─ Track: hits++
       │
       └─ MISS? → Call computeFn()
          │
          ├─ Get value
          │
          ├─ SET(key, value) in Redis (async)
          │  └─ Track: misses++
          │
          └─ Return value
```

**Error Handling:**
- Redis GET fails → Fall through to compute
- Redis SET fails → Compute succeeded anyway; log warning, continue
- Both cases are handled gracefully; no app breakage

### `cachedBatch<T>(keyPrefix, ids, computeFn, ttl): Promise<Map<string, T>>`

Efficiently load multiple items in one batch:

```typescript
export async function cachedBatch<T>(
  keyPrefix: string,           // "team:"
  ids: string[],               // ['alabama', 'georgia', ...]
  computeFn: (missing) => Promise<Map<string, T>>,
  ttl: number
): Promise<Map<string, T>> {
  // 1. Build full keys: "team:alabama", "team:georgia", ...
  // 2. MGET all keys from Redis in one roundtrip
  // 3. Separate hits from misses
  // 4. Call computeFn(missing) for cache misses
  // 5. MSET computed values (pipeline, atomic)
  // 6. Merge hits + computed, return Map
}
```

**Benefits:**
- Single MGET instead of N separate GET calls
- Single MSET instead of N separate SET calls
- Reduces roundtrips from O(n) to O(1) for reads, O(1) for writes

**Example:**

```typescript
// Without cachedBatch: 100 GET calls + 50 SET calls = 150 roundtrips
const teams = await Promise.all(
  ids.map(id =>
    cached(`team:${id}`, () => db.team.findUnique(...), CACHE_TTL.TEAM_PROFILE)
  )
);

// With cachedBatch: 1 MGET call + 1 MSET call = 2 roundtrips
const teams = await cachedBatch('team:', ids, async (missing) => {
  const rows = await db.team.findMany({ where: { slug: { in: missing } } });
  return new Map(rows.map(t => [t.slug, t]));
}, CACHE_TTL.TEAM_PROFILE);
```

### `staleWhileRevalidate<T>(key, computeFn, ttl, staleWindow?): Promise<T>`

Serves stale data immediately while refreshing in background:

```typescript
export async function staleWhileRevalidate<T>(
  key: string,
  computeFn: () => Promise<T>,
  ttl: number,
  staleWindow: number = 300
): Promise<T> {
  // 1. Try to read from cache
  // 2. If cached:
  //    - Return immediately (fast!)
  //    - Check TTL: if older than staleWindow, trigger background refresh
  //    - Non-blocking: fire-and-forget recompute
  // 3. If not cached:
  //    - Compute value
  //    - Cache it
  //    - Return
}
```

**Timeline:**

```
Time 0:     Request 1 → Compute (500ms) → Return fresh value
            Cache: [fresh value, TTL: 3600s]

Time 100:   Request 2 → Read cache (10ms) → Return immediately
            Cache: [still fresh, TTL: 3500s]

Time 400:   Request 3 → Read cache (10ms) → Return immediately
            Cache: [stale? No (TTL: 3200s > staleWindow: 300s)]
            Cache: [still fresh, TTL: 3200s]

Time 700:   Request 4 → Read cache (10ms) → Return immediately
            Cache: [stale? Yes (TTL: 2900s > staleWindow: 300s)? No wait...]

            Actually: If (ttl - ttl_remaining) > staleWindow
            Time in cache: 700 - 0 = 700s > 300s staleWindow → YES, stale!

            Cache: [trigger background refresh]
            Return: [stale value, 10ms response]

Time 701:   Background: computeFn() completes → SET new value
            Cache: [fresh value, TTL: 3600s]
```

**Benefits:**
- Instant responses even for expensive computations
- Fresh data eventually (within one request after stale window passes)
- Better UX for interactive features (matchup sims, heavy rankings)

### Tag-Based Invalidation

Tags enable grouped cache invalidation. Internally:

```typescript
// Tag registry (in-memory map)
tagRegistry = Map<tagName, Set<cacheKeys>>

// Example:
{
  "tag:team:alabama": {"team:alabama", "team:alabama:games:2024", "roster:alabama"},
  "tag:season:2024": {"rankings:2024:12:FBS", "predictions:2024:12", ...},
  "tag:week:2024:12": {"rankings:2024:12:*", "predictions:2024:12", ...}
}
```

When you call:

```typescript
await cached(
  cacheKeys.team('alabama'),
  () => db.team.findUnique(...),
  CACHE_TTL.TEAM_PROFILE,
  { tags: [cacheTags.team('alabama')] }
);
```

Internally:
1. Data is cached with key "team:alabama"
2. Tag "tag:team:alabama" is registered with key set: {"team:alabama"}

Then when you call:

```typescript
await invalidateByTag(cacheTags.team('alabama'));
```

It:
1. Looks up all keys in tag registry under "tag:team:alabama"
2. DELs all those keys from Redis
3. Removes tag from registry

**Why Not Just Use Redis Sets?**

Redis does have SADD/SMEMBERS for sets. We could store tags as Redis sets:

```
SADD tag:team:alabama team:alabama team:alabama:games:2024 ...
SMEMBERS tag:team:alabama
DEL team:alabama team:alabama:games:2024 ...
```

But:
- Tag writes happen on every cached() call → extra network roundtrips
- Tag reads happen on every invalidateByTag() call
- In-memory registry is faster and simpler for this use case
- Tags are "nice to have" for invalidation, not critical

Our hybrid approach:
- Simple in-memory registry for immediate access
- Trades memory (few KB for tag sets) for speed
- If process restarts, tags are cleared but caches remain valid

### Error Handling & Graceful Degradation

Every Redis call is wrapped in try-catch:

```typescript
try {
  const cached = await redis.get<string>(key);
  if (cached !== null) {
    return deserialize(cached);
  }
} catch (error) {
  console.warn("Redis get failed:", error);
  // Fall through to compute
}

const value = await computeFn();

try {
  await redis.set(key, serialize(value), { ex: ttl });
} catch (error) {
  console.warn("Redis set failed:", error);
  // Return computed value anyway
}

return value;
```

Failure modes:
| Error | Behavior |
|-------|----------|
| Redis GET timeout | Fall through to compute |
| Redis SET timeout | Compute succeeds; log warning |
| Redis connection down | All calls compute; app works |
| Serialization error | Compute called; value not cached |

**Result:** The app never crashes due to Redis issues. You get slower response times, but full functionality.

### Statistics Tracking

Maintains simple in-memory counters:

```typescript
let cacheStats = {
  hits: 0,
  misses: 0,
};

// On every cache hit: hits++
// On every cache miss: misses++
```

Hit rate calculation:

```typescript
const total = cacheStats.hits + cacheStats.misses;
const hitRate = total > 0 ? (cacheStats.hits / total) * 100 : 0;
```

Retrieved via `getCacheStats()`:

```typescript
{
  hits: 1234,
  misses: 456,
  hitRate: 73.04,
  totalKeys: 342,
  memoryUsage: "2.4M"
}
```

**For Monitoring:**

Hook this into your observability platform:

```typescript
// Every minute, emit metrics
setInterval(async () => {
  const stats = await getCacheStats();
  metrics.gauge('cache.hit_rate', stats.hitRate);
  metrics.gauge('cache.total_keys', stats.totalKeys);

  if (stats.hitRate < 50) {
    alerts.warn('Low cache hit rate');
  }
}, 60000);
```

### Debug Mode

Enable per-cache with `{ debug: true }`:

```typescript
await cached(key, computeFn, ttl, { debug: true });

// Logs:
// [CACHE HIT] rankings:2024:12:FBS (12.34ms)
// [CACHE MISS] rankings:2024:12:FBS
// [CACHE COMPUTE] rankings:2024:12:FBS (5234.12ms)
```

Useful for development and troubleshooting. Timing info helps identify slow computations.

## Serialization

By default, uses `JSON.stringify` and `JSON.parse`:

```typescript
const serialize = (data) => JSON.stringify(data);
const deserialize = (data) => JSON.parse(data);
```

For custom types, provide serializers:

```typescript
interface CustomType {
  date: Date;
  bigint: bigint;
}

await cached(
  key,
  computeFn,
  ttl,
  {
    serialize: (data) => {
      const d = data as CustomType;
      return JSON.stringify({
        date: d.date.toISOString(),
        bigint: d.bigint.toString()
      });
    },
    deserialize: (str) => {
      const obj = JSON.parse(str);
      return {
        date: new Date(obj.date),
        bigint: BigInt(obj.bigint)
      };
    }
  }
);
```

**Note:** All cached data must be JSON-serializable. Complex objects with circular references won't work.

## Cache Key Patterns

Consistent key naming via `cacheKeys` utility:

```typescript
// Instead of:
const key1 = `rankings:${season}:${week}:${level}`;
const key2 = "rankings:" + season + ":" + week + ":" + level;
const key3 = `rankings_${season}_${week}_${level}`; // Wrong separator!

// Use:
const key = cacheKeys.rankings(season, week, level);
// Always: "rankings:2024:12:FBS"
```

Benefits:
- Type-safe key generation
- Consistent separators
- Autocomplete in IDE
- Single source of truth
- Easier refactoring

## Cache Warming

Used during deployment or after data imports to reduce cache stampedes:

```typescript
// In a deploy hook or cron job
const result = await warmCache([
  { key: ..., computeFn: ..., ttl: ... },
  { key: ..., computeFn: ..., ttl: ... },
  // ... many keys
]);

// Sequentially computes each, writes to Redis
// If any fail, doesn't crash; tracks failure
```

**Without warming:**
```
Deploy happens → All users hit cold cache → All compute simultaneously
→ 10 expensive queries hit DB at once → Database overloaded
```

**With warming:**
```
Deploy happens → Warming job pre-computes → Cache is warm before users arrive
→ Users hit cache → Fast responses → Database happy
```

## Performance Characteristics

| Operation | Time | Roundtrips |
|-----------|------|-----------|
| `cached()` (hit) | Redis latency (5-10ms) | 1 |
| `cached()` (miss) | Redis + compute | 2 |
| `cachedBatch()` (100 items, 20 hits) | Redis + compute | 2 |
| `staleWhileRevalidate()` (hit) | Redis (5-10ms) | 1 |
| `staleWhileRevalidate()` (miss) | Redis + compute | 2 |
| `invalidate()` | Redis DEL | 1 |
| `invalidatePattern()` | Redis KEYS + DEL | 2 |
| `invalidateByTag()` | In-memory lookup + Redis DEL | 1 |

Upstash REST API latency: typically 5-10ms from North America.

## Redis Commands Used

| Command | Count | Notes |
|---------|-------|-------|
| GET | Every hit | Cached reads |
| SET | On compute | With EX (expire) |
| MGET | Batch reads | Multiple keys at once |
| MSET + EX | Batch writes | Via pipeline |
| DEL | Invalidation | Single or pattern |
| KEYS | Pattern invalidation | Glob pattern matching |
| TTL | SWR check | Check remaining TTL |
| INFO | Stats | Memory usage |
| DBSIZE | Stats | Total keys |
| FLUSHDB | Nuclear option | Clear entire cache |

All commands are standard Redis commands supported by Upstash.

## Cost Analysis (Upstash)

Upstash pricing (as of 2025):
- Free tier: 10k commands/day
- Paid: ~$0.2 per 100k commands

Estimated daily usage (active season):
- 100 users
- 10 rankings lookups per user per day = 1k lookups
- 50% hit rate = 500 hits, 500 misses
- 500 GETs + 500 SETs = 1k commands/day from rankings alone

Add other features (team pages, predictions, etc.) and typical usage is 5-10k commands/day.

**Cost:** Free tier sufficient for development; might need paid tier in heavy season.

## Deployment Considerations

### Vercel ISR + Cache Layer

Vercel's ISR works alongside the cache layer:

```
ISR: Revalidate page every 300 seconds
Cache: Revalidate data every 3600 seconds (1 hour)
```

When a page requests data:
1. Check cache → if hit, return (fast)
2. If miss, compute (slow)
3. ISR page is revalidated every 5 minutes
4. Cache data is revalidated hourly

This layering provides good performance.

### Cold Starts

Upstash Redis is serverless, has cold start latency. For Vercel Functions:
- First request: 50-100ms latency
- Subsequent requests: 5-10ms latency

The cache layer handles this gracefully.

### Environment Variables

```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

Both required for Redis to function. If missing or invalid, cache falls through to compute.

## Testing

Unit tests in `src/lib/db/__tests__/cache.test.ts` cover:
- Basic caching and cache hits/misses
- Batch loading
- Invalidation patterns
- Stale-while-revalidate
- Cache warming
- Stats tracking
- Error scenarios

Run: `npm test -- cache.test.ts`

## Future Enhancements

Possible improvements:

1. **Distributed Tag Registry** — Currently in-memory; if you run multiple processes, tags don't sync. Could use Redis for tag registry.

2. **Cache Locking** — Prevent thundering herd on cache miss. When multiple requests miss same key simultaneously, only first computes; others wait.

3. **Compression** — For large cached objects, compress before storing in Redis to save memory.

4. **Metrics Export** — Prometheus-compatible metrics endpoint for monitoring.

5. **Circuit Breaker** — If Redis fails repeatedly, disable caching temporarily to reduce load.

## References

- Redis Commands: https://redis.io/commands/
- Upstash Docs: https://upstash.com/docs
- Glicko-2 Algorithm: https://en.wikipedia.org/wiki/Glicko_rating_system
- Cache Patterns: https://martinfowler.com/bliki/CacheAsidePattern.html
