# API Routes Implementation Notes

## Overview

This document outlines the implementation details, design decisions, and TODO items for Gridiron Intel's API routes.

## Design Philosophy

1. **Type Safety First** — All routes use TypeScript strict mode, no `any` types
2. **Separation of Concerns** — Business logic in scripts, data serving in routes
3. **Caching Everywhere** — Every response leverages Redis via the `cached()` function
4. **Graceful Degradation** — Redis failures don't prevent responses (fallback to compute)
5. **Consistent Patterns** — All routes follow the same structure for maintainability

## Shared Helpers (`_helpers.ts`)

### Response Formatting

The two main helper functions ensure consistent API responses:

```typescript
// Success response (with optional metadata)
successResponse({ rankings, teams }, { total: 100, page: 1 })
// → { rankings, teams, meta: { total, page } }

// Error response (with HTTP status code)
errorResponse("Team not found", 404)
// → HTTP 404 { error: "Team not found" }
```

### Query Parameter Extraction

Helper functions safely extract and type-coerce query parameters:

```typescript
getQueryParam(req, "level", "FBS")        // string with default
getQueryParamInt(req, "limit", 50)        // integer with default
getQueryParamBool(req, "sort", false)     // boolean with default
```

### Season/Week Detection

`getCurrentSeasonAndWeek()` uses a simple heuristic based on current date:

```typescript
// August = week 0, September-December = weeks 1-17
// Should be replaced with DB query for accuracy
const { season, week } = getCurrentSeasonAndWeek();
```

**TODO:** Replace with actual database query:
```typescript
const currentSeason = await prisma.season.findFirst({
  where: { isCurrent: true },
  select: { year: true }
});
```

## Per-Route Implementation Details

### Rankings Route

**Key Decisions:**

1. **Filtering Pipeline** — Level filter → Conference filter → Sort → Paginate
2. **Sparkline Data** — Currently empty array; should pull from historical ratings
3. **Percentile Calculations** — Marked TODO; requires full ranking context
4. **RD (Rating Deviation)** — Currently hardcoded to 0; fetch from Glicko-2 state

**Cache Strategy:**

- Key: `rankings:${season}:${week}:${level}:${conference}`
- TTL: 1 hour (RANKINGS)
- Tags: `season:${season}`, `week:${season}:${week}`
- Invalidated when: New rankings computed for week

**Performance Considerations:**

- Use database indexes on (seasonId, week, levelId, conferenceId)
- Consider denormalizing percentiles into TeamRanking table
- Batch load related team data to reduce N+1 queries

### Teams Search Route

**Key Decisions:**

1. **Search Scope** — Searches name, abbreviation, slug, and mascot
2. **Case Insensitive** — Uses Prisma's `mode: "insensitive"`
3. **Multiple Filters** — Level AND conference (not OR)
4. **Result Ordering** — By name alphabetically

**Cache Strategy:**

- Key: `teams:search:${q}:${level}:${conference}:${limit}`
- TTL: 12 hours (SEARCH_INDEX)
- Tags: `team`
- Invalidated when: Team data changes

**Note:** Search doesn't use full-text indexing yet. Consider PostgreSQL GIN/GIST indexes for production.

### Team Detail Route

**Key Decisions:**

1. **Recent Games** — Combines home + away games, limits to 10
2. **Single Lookup** — Fetches latest rating (not historical)
3. **Conference Nesting** — Includes full conference object
4. **Historical Data** — Separate cached query for rating history

**Cache Strategy:**

- Main data: `team:${slug}` (30 minutes)
- History: `team:${slug}:history:${season}` (24 hours)
- Tags: `team:${slug}`, `season:${season}`

**TODO Items:**

- Fetch RD/Volatility from Glicko-2 engine
- Calculate rank changes from previous week
- Populate sparklines in history
- Include recruiting composite in TeamFull
- Calculate roster size dynamically

### Matchup Simulation Route

**Key Decisions:**

1. **Simulation Model** — Uses normal distribution for score generation
2. **Spread Calculation** — Based on rating difference normalized to ~[-10, 10]
3. **Home Field Advantage** — 2.5 points; can be disabled with neutralSite flag
4. **Upsets Counting** — Based on initial rating comparison, not spread

**Algorithm:**

```
For each simulation:
  z ~ Normal(0,1)                    # Random normal deviate
  rateDiff = (rA - rB) / 150         # Normalize to spread scale
  spread = rateDiff + HFA + z * 5    # Add HFA and noise
  scoreA = 24 + spread/2 + z*7       # Base + spread + noise
  scoreB = 24 - spread/2 + z*7       # Symmetric
  Record winner and scores
```

**Cache Strategy:**

- Key: `matchup:${teamA}:${teamB}:${simCount}`
- TTL: 10 minutes (MATCHUP_SIM)
- Tags: `team:${teamA}`, `team:${teamB}`

**TODO Items:**

- Implement Poisson model for score generation
- Add tempo/pace factors from team data
- Account for injury status from roster data
- Validate against Vegas lines for model accuracy

### Chaos Index Route

**Key Decisions:**

1. **Chaos Score** — Aggregates 6 components weighted per CHAOS_WEIGHTS constant
2. **Week Tier** — Calculated from average week score
3. **Component Clarity** — Each component 0-100, independent scoring
4. **Tag System** — Games can have multiple tags (UPSET, THRILLER, etc.)

**Chaos Tiers:**

- Normal: < 30
- Notable: 30-45
- Elevated: 45-60
- Mayhem: 60-75
- Chaos Reigns: 75+

**Cache Strategy:**

- Key: `chaos:${season}:${week}`
- TTL: 1 hour (CHAOS_INDEX)
- Tags: `season:${season}`, `week:${season}:${week}`

**TODO Items:**

- Populate chaos percentile (relative to all games ever)
- Calculate WP crossings from play-by-play data
- Implement spread bust factor from Vegas line
- Fill chaos headline generation from narrative engine

### Predictions Route

**Key Decisions:**

1. **WP Model** — Uses Glicko-2 rating difference with logistic function
2. **Spread Conversion** — Linear mapping from rating diff (rA-rB)/30 + HFA
3. **Confidence** — Based on rating difference magnitude
4. **Interval Width** — Wider for low-confidence predictions

**Win Probability Formula:**

```
ratingDiff = (homeRating - awayRating) / 400
homeWP = 1 / (1 + 10^(-ratingDiff))
```

**Cache Strategy:**

- Key: `predictions:${season}:${week}`
- TTL: 2 hours (PREDICTIONS)
- Tags: `season:${season}`, `week:${season}:${week}`

**TODO Items:**

- Fetch preseason predictions from modeling pipeline
- Calculate prediction accuracy against actual outcomes
- Add VegasLine comparison for upset alerts
- Implement model versioning (track xgboost vs logistic)

## Error Handling

All routes use consistent error handling:

```typescript
try {
  // Route logic
} catch (error) {
  console.error("[/api/endpoint] Error:", error);

  // Determine status code
  const status = error.message.includes("not found") ? 404 : 500;
  return errorResponse(error.message, status);
}
```

**Error Scenarios:**

| Scenario | Status | Response |
|----------|--------|----------|
| Missing required field | 400 | `{error: "Missing required fields: ..."}`|
| Invalid JSON body | 400 | `{error: "Invalid JSON: ..."}` |
| Team not found | 404 | `{error: "Team not found: ..."}` |
| Database error | 500 | `{error: "Internal server error"}` |
| Invalid query param | 400 | Defaults applied, no error |

## Database Query Patterns

### Pattern 1: Ranked Data with Filters

```typescript
// Rankings route — complex filtering + sorting + pagination
const ranking = await prisma.ranking.findUnique({
  where: { seasonId_week: { seasonId, week } },
  select: {
    teamRankings: {
      where: { /* filters */ },
      orderBy: { /* sort */ },
      skip: offset,
      take: limit
    }
  }
});
```

### Pattern 2: Search with Multiple Filters

```typescript
// Teams route — multi-field search + optional filters
const teams = await prisma.team.findMany({
  where: {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { abbreviation: { contains: q } },
      // ...
    ],
    levelId: level ? levelRecord.id : undefined
  }
});
```

### Pattern 3: Detailed Nested Data

```typescript
// Team detail — single team with all relations
const team = await prisma.team.findUnique({
  where: { slug },
  select: {
    // Base fields
    id: true,
    name: true,
    // Nested relations
    conference: { select: { /* conf fields */ } },
    homeGames: { select: { /* game fields */ } },
    teamRankings: { select: { /* rating fields */ } }
  }
});
```

### Pattern 4: Aggregation and Stats

```typescript
// Predictions route — need to join game + team ratings
const games = await prisma.game.findMany({
  where: { week: week, seasonId: seasonId },
  select: {
    id: true,
    homeTeam_ratings: { take: 1, orderBy: { createdAt: "desc" } },
    awayTeam_ratings: { take: 1, orderBy: { createdAt: "desc" } }
  }
});
```

## Caching Behavior

### Cache Keys

Keys follow pattern: `feature:context:context:filter`

- `rankings:2024:12:FBS:big-ten` — Rankings for 2024 week 12, FBS, Big Ten
- `team:ohio-state` — Team profile for Ohio State
- `matchup:ohio-state:michigan:10000` — Matchup sim with 10k runs
- `chaos:2024:12` — Chaos index for 2024 week 12
- `predictions:2024:13` — Predictions for 2024 week 13

### Cache Invalidation Strategy

**Scenario: New rankings are computed for week 12**

```typescript
// Invalidate all week 12 rankings
await invalidatePattern('rankings:*:12:*');

// OR use tags (future improvement)
await invalidateByTag('week:2024:12');
```

**Scenario: Team data is updated (roster, coach change)**

```typescript
// Invalidate all Ohio State data
await invalidatePattern('team:ohio-state:*');
await invalidateByTag('team:ohio-state');
```

**Scenario: New games are added**

```typescript
// Invalidate predictions for that week
await invalidate(cacheKeys.predictions(2024, 13));
```

## Performance Considerations

### Query Optimization

1. **Database Indexes**
   ```sql
   -- Add to Prisma schema or migration
   @@index([seasonId, week])
   @@index([slug])
   @@index([levelId, conferenceId])
   @@index([chaosScore(sort: Desc)])  -- Already in schema
   ```

2. **Select Optimization**
   - Use `select` not `include` to avoid fetching unnecessary data
   - Only select fields needed for response
   - Use `take` limits on nested relations

3. **N+1 Prevention**
   - Join related tables in single query
   - Use batch loading for similar queries
   - Consider denormalizing frequently accessed data

### Caching Strategy

| Route | TTL | Why |
|-------|-----|-----|
| rankings | 1h | Updates after games complete |
| teams | 12h | Rare changes (roster updates) |
| team detail | 30m | More volatile (rating updates) |
| matchup | 10m | Expensive compute, short window |
| chaos | 1h | Updated with rankings |
| predictions | 2h | Updated midweek |

### Pagination Defaults

- Default limit: 50 (reasonable for most use cases)
- Max limit: 200-500 (prevent abuse)
- Default offset: 0
- Validates limit < max before using

## Testing Considerations

### Unit Tests

```typescript
// Test helper functions
describe('_helpers', () => {
  test('getQueryParamInt with valid int', () => {
    const req = new NextRequest(new URL('http://localhost?limit=100'));
    expect(getQueryParamInt(req, 'limit', 50)).toBe(100);
  });

  test('getQueryParamInt with invalid int', () => {
    const req = new NextRequest(new URL('http://localhost?limit=abc'));
    expect(getQueryParamInt(req, 'limit', 50)).toBe(50); // Default
  });
});
```

### Integration Tests

```typescript
// Test actual routes
describe('GET /api/rankings', () => {
  test('returns paginated rankings', async () => {
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rankings).toHaveLength(100);
  });

  test('filters by level', async () => {
    const req = new NextRequest(
      new URL('http://localhost/api/rankings?level=FBS')
    );
    const res = await GET(req);
    const json = await res.json();
    expect(json.rankings.every(r => r.level === 'FBS')).toBe(true);
  });
});
```

### Load Testing

```bash
# Test concurrent requests to measure cache effectiveness
wrk -t12 -c400 -d30s http://localhost:3000/api/rankings

# Observe cache hit rate improving after first request
# Monitor Redis memory usage
```

## Future Enhancements

1. **GraphQL Layer** — Consider adding GraphQL API alongside REST
2. **Webhooks** — Alert subscriptions when rankings/predictions change
3. **Rate Limiting** — Protect against abuse (currently open)
4. **API Keys** — Track usage per client
5. **Request Logging** — Structured logging of all requests
6. **Metrics** — Prometheus metrics for cache hits, query times
7. **Versioning** — API version headers for backward compatibility
8. **Compression** — gzip responses for large payloads
