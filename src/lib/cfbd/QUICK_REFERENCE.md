# CFBD Rate Limiter Quick Reference

One-page cheat sheet for the production-grade CFBD API rate limiter.

## Core Functions

```typescript
// Make a single rate-limited request
await rateLimitedFetch<T>(url, options?)

// Batch multiple requests
await batchFetch<T>(requests)

// Get status snapshot
getRateLimiterStatus()

// Get budget info
getBudgetStatus()

// Reset (testing only)
resetRateLimiter()
```

## Priority Levels

```
critical  ← Gameday live data, real-time dashboards
high      ← Current week predictions, rankings
normal    ← Default, team pages
low       ← Historical data, supplementary
background← Cache warming, backfill (paused when budget constrained)
```

## Options

```typescript
{
  priority: 'critical' | 'high' | 'normal' | 'low' | 'background',
  maxRetries: number,           // default: 5
  timeout: number,              // default: 30000 (ms)
  deduplicateKey: string,       // optional: share results with identical requests
  tags: string[],               // optional: for monitoring/grouping
}
```

## Basic Examples

### Simple fetch
```typescript
const teams = await rateLimitedFetch<CFBDTeam[]>(url);
```

### With priority
```typescript
const games = await rateLimitedFetch<CFBDGame[]>(url, {
  priority: 'critical'
});
```

### Batch
```typescript
const results = await batchFetch([
  { url: url1, options: { priority: 'high' } },
  { url: url2, options: { priority: 'normal' } },
]);
```

## Status Checking

```typescript
const status = getRateLimiterStatus();
status.queueLength         // How many requests waiting
status.circuitState        // 'closed' | 'open' | 'half-open'
status.availableTokens     // Current tokens (max 10)
status.budget.percentUsed  // Budget usage 0-100%
```

```typescript
const budget = getBudgetStatus();
budget.used                // Calls used this month
budget.limit               // Monthly quota
budget.remaining           // Calls left
budget.isCritical          // true if > 95% used
budget.isWarning           // true if > 80% used
```

## Circuit Breaker

| State | Meaning | Action |
|-------|---------|--------|
| CLOSED | Normal | Process requests |
| OPEN | API down | Reject requests, wait 30s |
| HALF_OPEN | Testing | Allow 2 requests to test recovery |

Transitions:
- **5 failures in 60s** → OPEN
- **30s timeout** → HALF_OPEN
- **2 successes** → CLOSED
- **1 failure in HALF_OPEN** → OPEN

## Error Handling

```typescript
try {
  const data = await rateLimitedFetch<T>(url);
} catch (error) {
  if (error.message.includes('Circuit breaker is OPEN')) {
    // API is down, use cache
  } else if (error.message.includes('queue is full')) {
    // Too many requests, retry later
  } else if (error.message.includes('timeout')) {
    // Request took too long
  } else {
    // Other error (400, 401, 404, etc)
  }
}
```

## Monitoring

```typescript
// Health check
const status = getRateLimiterStatus();
const isHealthy = status.circuitState !== 'open' && !status.budget.isCritical;

// Metrics
metrics = {
  queue_length: status.queueLength,
  circuit_state: status.circuitState,
  success_rate: (status.successfulRequests / status.totalRequests) * 100,
  budget_percent: status.budget.percentUsed,
}
```

## Configuration

```env
CFBD_API_KEY=your_api_key        # Required
CFBD_MONTHLY_LIMIT=1000          # Optional (default: 1000)
```

Defaults:
- Min delay: 500ms (CFBD requirement)
- Max tokens: 10 (burst capacity)
- Max retries: 5
- Timeout: 30s
- Max queue: 500 requests
- Warning: 80% budget
- Critical: 95% budget

## When to Use Each Priority

```
critical
  ├─ Live gameday scores
  ├─ Real-time dashboards
  └─ User-blocking operations

high
  ├─ Current week predictions
  ├─ Rankings refresh
  └─ Team page loads

normal (default)
  ├─ Standard page loads
  ├─ Non-blocking fetches
  └─ Typical API calls

low
  ├─ Historical data
  ├─ Supplementary info
  └─ Non-essential enrichment

background
  ├─ Cache warming
  ├─ Precomputation
  └─ Off-peak backfills (paused when budget constrained)
```

## Deduplication

Identical simultaneous requests share one API call:

```typescript
// All three wait for one API call
const [a, b, c] = await Promise.all([
  rateLimitedFetch(url, { deduplicateKey: 'key' }),
  rateLimitedFetch(url, { deduplicateKey: 'key' }),
  rateLimitedFetch(url, { deduplicateKey: 'key' }),
]);
// a === b === c
```

## Exponential Backoff

On 429 or 5xx error:
```
Attempt 1: 1 second
Attempt 2: 2 seconds
Attempt 3: 4 seconds
Attempt 4: 8 seconds
Attempt 5: 16 seconds
Then:      Fail
```

Plus ±10% jitter to prevent thundering herd.

## Budget Alerts

```typescript
const budget = getBudgetStatus();

if (budget.isCritical) {
  // > 95% used, only allow critical/high priority
}

if (budget.isWarning) {
  // > 80% used, pause background requests
}

if (budget.remaining === 0) {
  // Exhausted, wait until next month
}
```

## Testing

```typescript
beforeEach(() => {
  resetRateLimiter(); // Clean state
});

it('should work', async () => {
  const data = await rateLimitedFetch(url);
  expect(data).toBeDefined();
});
```

## Performance

| Scenario | Time |
|----------|------|
| Instant token | ~5-10ms |
| Wait for token | 500ms+ |
| Hit queue | 500ms + queue_length×500ms |
| Dedup hit | API latency |
| Circuit OPEN | ~10ms (instant reject) |

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Circuit OPEN | API returning errors | Wait 30s, check CFBD status |
| Queue full | Too many pending | Reduce request rate |
| Budget exhausted | Over quota | Wait for month reset |
| Timeout | API slow | Increase timeout option |
| Not retrying | Non-retryable error (4xx) | Check request format |

## File Locations

- Implementation: `src/lib/cfbd/rate-limiter.ts` (28KB)
- Documentation: `src/lib/cfbd/RATE_LIMITER.md`
- Examples: `src/lib/cfbd/rate-limiter.example.ts`
- Integration: `src/lib/cfbd/INTEGRATION_GUIDE.md`
- This file: `src/lib/cfbd/QUICK_REFERENCE.md`

## Type Exports

```typescript
type Priority = 'critical' | 'high' | 'normal' | 'low' | 'background'
enum CircuitState { CLOSED, OPEN, HALF_OPEN }
interface RateLimitedFetchOptions { ... }
interface BatchRequest<T> { ... }
interface BatchResult<T> { ... }
interface RateLimiterStatus { ... }
interface BudgetStatus { ... }
```

## Related Constants

```typescript
// From src/lib/utils/constants.ts
export const API_DELAY_MS = 500;                // Min delay
export const CFBD_BASE_URL = 'https://apinext.collegefootballdata.com';
export const CACHE_TTL = { ... };               // Cache durations
```

## Monthly Limits by Tier

| Tier | Limit | Cost |
|------|-------|------|
| Free | 1,000 | Free |
| Tier 2 | 25,000 | $5/mo Patreon |
| Tier 3 | 75,000 | $10/mo Patreon |

Set `CFBD_MONTHLY_LIMIT` to your tier's limit.

## One-Liner Examples

```typescript
// Fetch
const teams = await rateLimitedFetch<CFBDTeam[]>(`${CFBD_BASE_URL}/teams`);

// Critical
const games = await rateLimitedFetch(url, { priority: 'critical' });

// Background
const old = await rateLimitedFetch(url, { priority: 'background' });

// Dedup
const shared = await rateLimitedFetch(url, { deduplicateKey: 'teams' });

// Batch
const results = await batchFetch([{ url: url1 }, { url: url2 }]);

// Status
const { queueLength, circuitState } = getRateLimiterStatus();

// Budget
const { percentUsed, isCritical } = getBudgetStatus();

// Reset (tests)
resetRateLimiter();
```

## Integration Steps

1. Set env: `CFBD_API_KEY`, `CFBD_MONTHLY_LIMIT`
2. Import: `import { rateLimitedFetch } from '@/lib/cfbd/rate-limiter'`
3. Use instead of fetch: `await rateLimitedFetch(url, options)`
4. Monitor: `getRateLimiterStatus()`, `getBudgetStatus()`
5. Handle errors: Check circuit state and budget

## Key Insights

- **Rate limiter runs automatically** — No manual delay calls needed
- **Priority handles scheduling** — Critical requests processed first
- **Circuit breaker protects API** — Stops hammering failing endpoints
- **Deduplication saves quota** — Identical simultaneous requests cost 1 call
- **Budget awareness prevents overages** — Never exceeds monthly limit
- **Exponential backoff is smart** — Respects 429s without aggressive retries
- **All state is in-memory** — No database needed, lightweight
- **Metrics exportable** — Feed to monitoring systems (Prometheus, DataDog, etc.)

## Remember

- Always set `priority` for important operations
- Use `background` for historical/cache operations
- Check `budget` before data-intensive jobs
- Monitor `circuitState` for API health
- Use `deduplicateKey` to save quota
- `resetRateLimiter()` in tests only
- Environment variables are loaded once at startup

---

**Version:** 1.0
**Files:** 5 (implementation + docs + examples)
**Total size:** ~58KB
**Production ready:** Yes
**Monitoring:** Yes (status + metrics + alerts)
