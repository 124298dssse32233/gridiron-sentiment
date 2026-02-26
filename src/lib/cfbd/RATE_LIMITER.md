# CFBD API Rate Limiter

Production-grade rate limiting, request queuing, and circuit breaker for the CollegeFootballData.com API.

## Features

### Token Bucket Rate Limiting
- **500ms minimum delay** between requests (CFBD API requirement)
- **Burst capacity**: Up to 10 tokens (allows short bursts)
- **Refill rate**: 2 tokens/second (1 request per 500ms sustained)
- **Automatic token management**: No manual delay calls needed

### Priority-Based Request Queue
Five priority levels ensure critical requests are processed first:

1. **critical** — Live gameday data, real-time dashboards
2. **high** — Current week predictions, rankings refresh
3. **normal** — Default, team page data, standard operations
4. **low** — Historical data, supplementary information
5. **background** — Cache warming, precomputation, off-peak backfills

### Circuit Breaker Pattern
Protects the API from cascading failures:

- **CLOSED** (normal) — Processing requests normally
- **OPEN** (API down) — Rejecting all requests, waiting for recovery
- **HALF_OPEN** (testing) — Allowing limited requests to test recovery

**Transitions:**
- CLOSED → OPEN: After 5 failures within 60 seconds
- OPEN → HALF_OPEN: After 30-second cooldown
- HALF_OPEN → CLOSED: After 2 successful requests
- HALF_OPEN → OPEN: If any request fails

### Request Deduplication
Simultaneous identical requests share a single API call:

```typescript
// All three resolve with same data from one API call
const [a, b, c] = await Promise.all([
  rateLimitedFetch<Teams>('/teams', { deduplicateKey: 'teams' }),
  rateLimitedFetch<Teams>('/teams', { deduplicateKey: 'teams' }),
  rateLimitedFetch<Teams>('/teams', { deduplicateKey: 'teams' }),
]);
```

### Exponential Backoff
On rate limit (429) or server error (5xx):

```
Attempt 1: 1 second
Attempt 2: 2 seconds
Attempt 3: 4 seconds
Attempt 4: 8 seconds
Attempt 5: 16 seconds
Then: Fail
```

Includes ±10% jitter to prevent thundering herd.

### Monthly Budget Tracking
Respects your CFBD API tier:

- **Free tier**: 1,000 calls/month
- **Tier 2**: 25,000 calls/month ($5/mo Patreon)
- **Tier 3**: 75,000 calls/month ($10/mo Patreon)

**Thresholds:**
- **Warning** (80%): Background requests paused
- **Critical** (95%): Only critical/high priority requests allowed

Tracks per-month usage with auto-reset on month boundary.

## Quick Start

### Basic Usage

```typescript
import { rateLimitedFetch } from '@/lib/cfbd/rate-limiter';

// Simple fetch
const teams = await rateLimitedFetch<CFBDTeam[]>(
  'https://apinext.collegefootballdata.com/teams'
);
```

### With Options

```typescript
const games = await rateLimitedFetch<CFBDGame[]>(
  'https://apinext.collegefootballdata.com/games?year=2024&week=1',
  {
    priority: 'critical',    // Process first
    maxRetries: 10,           // More retries
    timeout: 15000,           // Tighter timeout for real-time
    deduplicateKey: 'w1-2024' // Share results with other callers
  }
);
```

### Batch Operations

```typescript
import { batchFetch } from '@/lib/cfbd/rate-limiter';

const results = await batchFetch([
  {
    url: 'https://apinext.collegefootballdata.com/teams',
    options: { priority: 'high' }
  },
  {
    url: 'https://apinext.collegefootballdata.com/games?year=2024',
    options: { priority: 'critical' },
    transform: (data) => data.filter(g => g.week === 1)
  }
]);

// Results maintain order and include timing
for (const result of results) {
  if (result.error) {
    console.warn(`Failed: ${result.error.message}`);
  } else {
    console.log(`Success: ${result.duration}ms`);
  }
}
```

## Monitoring

### Check Status

```typescript
import { getRateLimiterStatus } from '@/lib/cfbd/rate-limiter';

const status = getRateLimiterStatus();
console.log(`Queue: ${status.queueLength}`);
console.log(`Circuit: ${status.circuitState}`);
console.log(`Tokens: ${status.availableTokens}`);
console.log(`Budget: ${status.budget.percentUsed}%`);
```

### Check Budget

```typescript
import { getBudgetStatus } from '@/lib/cfbd/rate-limiter';

const budget = getBudgetStatus();
if (budget.isCritical) {
  console.warn('API budget nearly exhausted!');
  // Skip background operations
}
```

## Configuration

Environment variables (optional, sensible defaults provided):

```env
# Your CFBD API key (required)
CFBD_API_KEY=your_api_key_here

# Monthly API call limit (optional, defaults to 1000)
CFBD_MONTHLY_LIMIT=1000
```

Defaults in `rate-limiter.ts`:

| Setting | Value | Notes |
|---------|-------|-------|
| MIN_DELAY_MS | 500 | CFBD requirement |
| MAX_TOKENS | 10 | Burst capacity |
| REFILL_RATE | 2 | tokens/second |
| DEFAULT_TIMEOUT | 30000 | milliseconds |
| MAX_RETRIES | 5 | attempts |
| CIRCUIT_FAILURE_THRESHOLD | 5 | fails to trip |
| CIRCUIT_RESET_TIMEOUT | 30000 | milliseconds |
| MAX_QUEUE_SIZE | 500 | requests |

## Priority Guidelines

### Use `critical` for:
- Live gameday scores
- Real-time dashboards
- User-blocking operations
- Time-sensitive predictions

### Use `high` for:
- Current week predictions
- Rankings refresh
- Team page loads
- Weekly data updates

### Use `normal` (default) for:
- Standard page loads
- Non-blocking data fetches
- Typical API calls

### Use `low` for:
- Historical data
- Supplementary information
- Non-essential enrichment

### Use `background` for:
- Cache warming
- Precomputation jobs
- Off-peak data loads
- Backfill operations (paused when budget constrained)

## Handling Failures

### Circuit Breaker Open

```typescript
try {
  const data = await rateLimitedFetch(url);
} catch (error) {
  if (error.message.includes('Circuit breaker is OPEN')) {
    // API is down, use cached data
    return getCachedData();
  }
  throw error;
}
```

### Budget Exhaustion

```typescript
const budget = getBudgetStatus();
if (budget.remaining === 0) {
  // Serve from cache until next month
  return getCachedResults();
}
```

### Queue Full

```typescript
try {
  const data = await rateLimitedFetch(url);
} catch (error) {
  if (error.message.includes('queue is full')) {
    // Too many pending requests, retry later
    return retryLater();
  }
  throw error;
}
```

## Testing

### Reset for Tests

```typescript
import { resetRateLimiter } from '@/lib/cfbd/rate-limiter';

beforeEach(() => {
  resetRateLimiter(); // Clean state
});

it('should fetch teams', async () => {
  const teams = await rateLimitedFetch<CFBDTeam[]>(url);
  expect(teams.length).toBeGreaterThan(0);
});
```

### Mock API Responses

```typescript
// Mock fetch in your test setup
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => [{ id: 1, school: 'Alabama' }]
});

const teams = await rateLimitedFetch(url);
expect(teams[0].school).toBe('Alabama');
```

## Architecture

### Token Bucket
Continuously refilling bucket with tokens at fixed rate. When API call needed, consume 1 token. If no tokens, wait for refill.

```
Max 10 tokens
│
├─────────────────────────────
│ ██ ██ ██ ██ ██ ██         │  Request uses 1 token
│    ↑        ↑             │  Refills at 2 tokens/sec
└─────────────────────────────
  0s         5s         10s
```

### Request Queue
Prioritized queue with FIFO per priority level:

```
critical: [req1, req2, ...]      ← processed first
high:     [req3, req4, ...]
normal:   [req5, req6, ...]      ← default
low:      [req7, req8, ...]
background: [req9, req10, ...]   ← processed last
```

### Circuit Breaker State Machine

```
           5 failures in 60s
    ┌──────────────────────────┐
    │                          ▼
  CLOSED ──────────────────→ OPEN
    ▲                         │
    │                  30s cooldown
    │                         ▼
    └─────────────────── HALF_OPEN
        2 successes        │
                      1 failure
                           ▼
                          OPEN
```

### Deduplication
Tracks in-flight requests by key (URL or custom). Second request for same key gets same promise.

```
Request 1: /teams              ──→ API call
Request 2: /teams              ──→ Reuse Request 1's promise
Request 3: /teams (different key) ──→ API call
```

## Metrics & Monitoring

Export metrics for dashboards:

```typescript
const status = getRateLimiterStatus();
const metrics = {
  'cfbd_available_tokens': status.availableTokens,
  'cfbd_queue_length': status.queueLength,
  'cfbd_circuit_state': status.circuitState,
  'cfbd_total_requests': status.totalRequests,
  'cfbd_success_rate': (status.successfulRequests / status.totalRequests) * 100,
  'cfbd_budget_percent': status.budget.percentUsed,
};
```

## Performance Characteristics

| Scenario | Latency | Notes |
|----------|---------|-------|
| Instant token available | ~5-10ms | Direct API call |
| Wait for token | 500ms+ | Token bucket refill time |
| Hit queue | 500ms+queue_length*500ms | Priority scheduling |
| Retry 429 | 1s+2s+4s+8s+16s | Exponential backoff |
| Circuit OPEN | ~10ms | Immediate rejection |
| Deduplication hit | API latency | Shared promise |

## Examples

See `rate-limiter.example.ts` for 13 detailed examples:

1. Basic fetch
2. Priority-based requests
3. Request deduplication
4. Batch fetching
5. Budget-aware operations
6. Status monitoring
7. Circuit breaker handling
8. Custom retry policy
9. Request tagging
10. Data backfill pattern
11. Testing with reset
12. API route integration
13. Metrics export

## Troubleshooting

### "Circuit breaker is OPEN"
**Cause**: API returning errors. **Solution**: Check CFBD status page, wait 30s, use cached data.

### "Queue is full"
**Cause**: Too many pending requests. **Solution**: Reduce request rate or increase timeout for requests to complete.

### "Budget exhausted"
**Cause**: Exceeded monthly quota. **Solution**: Wait for reset on 1st of month or upgrade tier.

### "Request timeout"
**Cause**: API slow to respond. **Solution**: Increase timeout option or check network connectivity.

### Retries not working
**Cause**: Request not retryable (e.g., 400, 401). **Solution**: Check API documentation, verify request format.

## Type Safety

All types exported with TypeScript strict mode:

```typescript
// Explicit types
type Priority = 'critical' | 'high' | 'normal' | 'low' | 'background';
enum CircuitState { CLOSED, OPEN, HALF_OPEN }

interface RateLimitedFetchOptions {
  priority?: Priority;
  maxRetries?: number;
  timeout?: number;
  deduplicateKey?: string;
  tags?: string[];
}

interface RateLimiterStatus {
  availableTokens: number;
  queueLength: number;
  queueByPriority: Record<Priority, number>;
  circuitState: CircuitState;
  // ... more fields
}
```

## Production Checklist

- [ ] Set CFBD_API_KEY in env
- [ ] Set CFBD_MONTHLY_LIMIT to your tier
- [ ] Monitor circuit breaker state (alert if OPEN)
- [ ] Monitor budget (alert at 80%, 95%)
- [ ] Set up metrics export to monitoring system
- [ ] Test failure scenarios in staging
- [ ] Document priority levels for team
- [ ] Set up on-call alert for budget/circuit
- [ ] Review logs for 429 patterns
- [ ] Track success rate over time

## API Reference

See JSDoc comments in `rate-limiter.ts` for complete API documentation. Key functions:

```typescript
// Make a rate-limited fetch
rateLimitedFetch<T>(url: string, options?: RateLimitedFetchOptions): Promise<T>

// Batch multiple requests
batchFetch<T>(requests: BatchRequest<T>[]): Promise<BatchResult<T>[]>

// Get status snapshot
getRateLimiterStatus(): RateLimiterStatus

// Get budget info
getBudgetStatus(): BudgetStatus

// Reset for testing
resetRateLimiter(): void
```

## Future Enhancements

Potential improvements:

- Per-endpoint rate limiting (if CFBD implements)
- Request tagging with per-tag metrics
- Webhook on budget threshold crossed
- Predictive backoff (learn API patterns)
- Request caching layer integration
- Multi-tier fallback (tier 1 → tier 2 → tier 3)
- A/B testing request patterns
- Request cancellation by tag

## Support

For issues, check:
1. CFBD API status page
2. Rate limiter status (`getRateLimiterStatus()`)
3. Environment variables set correctly
4. Network connectivity (CFBD endpoint reachable)
5. API key has correct permissions for endpoint
