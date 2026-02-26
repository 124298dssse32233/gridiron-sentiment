/**
 * CFBD Rate Limiter Usage Examples
 *
 * This file demonstrates real-world usage patterns for the production-grade
 * rate limiter with request queuing, circuit breaker, and budget tracking.
 *
 * Not meant to be executed - just a reference guide.
 */

import {
  rateLimitedFetch,
  batchFetch,
  getRateLimiterStatus,
  getBudgetStatus,
  resetRateLimiter,
  type Priority,
  type RateLimitedFetchOptions,
  type BatchRequest,
} from "./rate-limiter";
import { CFBD_BASE_URL } from "@/lib/utils/constants";
import type { CFBDTeam, CFBDGame } from "./client";

// =============================================================================
// EXAMPLE 1: Basic Rate-Limited Fetch
// =============================================================================

/**
 * Simple usage: fetch teams with default settings
 * - Priority: normal
 * - Max retries: 5
 * - Timeout: 30 seconds
 * - No deduplication key specified (uses URL)
 */
async function example1_basicFetch(): Promise<void> {
  try {
    const teams = await rateLimitedFetch<CFBDTeam[]>(
      `${CFBD_BASE_URL}/teams`
    );

    console.log(`Fetched ${teams.length} teams`);
  } catch (error) {
    console.error("Failed to fetch teams:", error);
  }
}

// =============================================================================
// EXAMPLE 2: Priority-Based Requests
// =============================================================================

/**
 * Gameday critical request: live game data
 * - Priority: critical (processed before other requests)
 * - Higher budget allowance when budget is constrained
 * - Useful for real-time dashboards
 */
async function example2_criticalRequest(): Promise<void> {
  const gamedayGames = await rateLimitedFetch<CFBDGame[]>(
    `${CFBD_BASE_URL}/games?year=2024&week=1`,
    {
      priority: "critical",
      timeout: 15000, // Tighter timeout for real-time
    }
  );

  console.log("Live games:", gamedayGames.length);
}

/**
 * Background request: precomputation and cache warming
 * - Priority: background (processed last, even if budget constrained)
 * - Useful for data loads that don't impact user experience
 * - Gets paused when budget is warning/critical
 */
async function example2_backgroundRequest(): Promise<void> {
  const historicalGames = await rateLimitedFetch<CFBDGame[]>(
    `${CFBD_BASE_URL}/games?year=2014`,
    {
      priority: "background",
      timeout: 60000, // More generous timeout for historical backfills
    }
  );

  console.log("Historical games:", historicalGames.length);
}

// =============================================================================
// EXAMPLE 3: Request Deduplication
// =============================================================================

/**
 * Deduplication: prevent hammering the API with duplicate requests
 *
 * Scenario: Multiple components render simultaneously and all request
 * the same team data. Without deduplication, 5 requests → 5 API calls.
 * With deduplication, 5 requests → 1 API call, result shared.
 */
async function example3_deduplication(): Promise<void> {
  // All three promises will wait for a single API call
  const [teams1, teams2, teams3] = await Promise.all([
    rateLimitedFetch<CFBDTeam[]>(
      `${CFBD_BASE_URL}/teams`,
      { deduplicateKey: "all-teams-2024" }
    ),
    rateLimitedFetch<CFBDTeam[]>(
      `${CFBD_BASE_URL}/teams`,
      { deduplicateKey: "all-teams-2024" }
    ),
    rateLimitedFetch<CFBDTeam[]>(
      `${CFBD_BASE_URL}/teams`,
      { deduplicateKey: "all-teams-2024" }
    ),
  ]);

  // All three arrays are identical and came from one API call
  console.log("Deduplication saved 2 API calls!");
}

// =============================================================================
// EXAMPLE 4: Batch Fetching
// =============================================================================

/**
 * Batch multiple requests with smart scheduling
 * - Automatically respects rate limits across all requests
 * - Maintains priority order
 * - Returns results with timing information
 * - Continues on individual failures
 */
async function example4_batchFetch(): Promise<void> {
  const requests: BatchRequest<unknown>[] = [
    {
      url: `${CFBD_BASE_URL}/teams`,
      options: { priority: "high" },
    },
    {
      url: `${CFBD_BASE_URL}/conferences`,
      options: { priority: "high" },
    },
    {
      url: `${CFBD_BASE_URL}/games?year=2024&week=1`,
      options: { priority: "critical" },
    },
    {
      url: `${CFBD_BASE_URL}/games?year=2014`,
      options: { priority: "background" },
    },
  ];

  const results = await batchFetch(requests);

  // Results are in the same order as requests
  for (const result of results) {
    if (result.error) {
      console.warn(`Failed to fetch ${result.url}: ${result.error.message}`);
    } else {
      console.log(
        `Fetched ${result.url} in ${result.duration}ms`
      );
    }
  }
}

// =============================================================================
// EXAMPLE 5: Budget-Aware Operations
// =============================================================================

/**
 * Check budget before starting data-intensive operations
 */
async function example5_budgetAware(): Promise<void> {
  const budget = getBudgetStatus();

  console.log(`Budget: ${budget.used}/${budget.limit} calls`);
  console.log(`Remaining: ${budget.remaining} calls`);
  console.log(`Usage: ${budget.percentUsed.toFixed(1)}%`);

  if (budget.isCritical) {
    console.warn("Budget is critical! Only allowing high-priority requests.");
    // Skip background data loads
    return;
  }

  if (budget.isWarning) {
    console.warn("Budget is at warning level (80%). Reducing request frequency.");
    // Reduce polling frequency or batch requests
  }

  // Proceed with normal operations
}

// =============================================================================
// EXAMPLE 6: Rate Limiter Status Monitoring
// =============================================================================

/**
 * Monitor rate limiter health for ops/logging
 */
async function example6_statusMonitoring(): Promise<void> {
  // Check periodically (e.g., health check endpoint)
  setInterval(() => {
    const status = getRateLimiterStatus();

    console.log("=== Rate Limiter Status ===");
    console.log(`Available tokens: ${status.availableTokens.toFixed(2)}`);
    console.log(`Queue length: ${status.queueLength}`);
    console.log(`  Critical: ${status.queueByPriority.critical}`);
    console.log(`  High: ${status.queueByPriority.high}`);
    console.log(`  Normal: ${status.queueByPriority.normal}`);
    console.log(`  Low: ${status.queueByPriority.low}`);
    console.log(`  Background: ${status.queueByPriority.background}`);
    console.log(`Circuit state: ${status.circuitState}`);
    console.log(`In-flight requests: ${status.inflightRequests}`);
    console.log(`Total requests: ${status.totalRequests}`);
    console.log(`Successful: ${status.successfulRequests}`);
    console.log(`Failed: ${status.failedRequests}`);
    console.log(`Budget: ${status.budget.used}/${status.budget.limit} (${status.budget.percentUsed.toFixed(1)}%)`);
    console.log(`Critical: ${status.budget.isCritical}, Warning: ${status.budget.isWarning}`);

    // Alert if circuit is open
    if (status.circuitState === "open") {
      console.error("ALERT: Circuit breaker is OPEN - API experiencing issues");
    }
  }, 60000); // Check every minute
}

// =============================================================================
// EXAMPLE 7: Handling Circuit Breaker
// =============================================================================

/**
 * Graceful degradation when API is down
 */
async function example7_circuitBreakerHandling(): Promise<void> {
  try {
    // This request might fail if circuit is open
    const teams = await rateLimitedFetch<CFBDTeam[]>(
      `${CFBD_BASE_URL}/teams`,
      { priority: "normal" }
    );

    console.log("Fetched from live API:", teams.length);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Circuit breaker is OPEN")
    ) {
      console.warn("API is experiencing issues. Using cached data...");
      // Fall back to cache
      const cachedTeams = getCachedTeams();
      console.log("Served from cache:", cachedTeams.length);
    } else {
      throw error;
    }
  }
}

function getCachedTeams(): unknown[] {
  // Implementation: fetch from Redis/cache layer
  return [];
}

// =============================================================================
// EXAMPLE 8: Custom Retry Policy
// =============================================================================

/**
 * Override max retries for different scenarios
 */
async function example8_customRetryPolicy(): Promise<void> {
  // Aggressive retries for critical operations
  const criticalData = await rateLimitedFetch(
    `${CFBD_BASE_URL}/teams`,
    {
      priority: "critical",
      maxRetries: 10, // More retries for critical
      timeout: 10000,
    }
  );

  // Quick-fail for non-essential data
  const optionalData = await rateLimitedFetch(
    `${CFBD_BASE_URL}/conferences`,
    {
      priority: "background",
      maxRetries: 1, // Fail fast for background tasks
      timeout: 5000,
    }
  ).catch(() => {
    console.log("Background task failed, but that's OK");
    return null;
  });
}

// =============================================================================
// EXAMPLE 9: Tags for Request Grouping
// =============================================================================

/**
 * Tag requests for monitoring and grouping
 *
 * Useful for:
 * - A/B testing different request patterns
 * - Monitoring requests by feature
 * - Per-feature rate limiting
 */
async function example9_requestTags(): Promise<void> {
  // Tag for "homepage rankings" feature
  const homePageRankings = await rateLimitedFetch<CFBDTeam[]>(
    `${CFBD_BASE_URL}/teams`,
    {
      priority: "high",
      tags: ["homepage", "rankings"],
    }
  );

  // Tag for "team page" feature
  const teamPageData = await rateLimitedFetch<CFBDTeam[]>(
    `${CFBD_BASE_URL}/teams`,
    {
      priority: "normal",
      tags: ["team-page", "detail-view"],
    }
  );

  // Use tags in monitoring: count requests by tag
  const status = getRateLimiterStatus();
  // Future: extend status to include request breakdown by tag
}

// =============================================================================
// EXAMPLE 10: Real-world Data Seeding Pattern
// =============================================================================

/**
 * Efficient backfill of historical data with proper rate limiting
 *
 * Pattern:
 * 1. Check budget first
 * 2. Use background priority to avoid user impact
 * 3. Batch requests
 * 4. Handle failures gracefully
 */
async function example10_dataBackfill(): Promise<void> {
  const budget = getBudgetStatus();

  // Only proceed if we have plenty of budget
  if (budget.percentUsed > 50) {
    console.log("Skipping backfill due to budget constraints");
    return;
  }

  // Batch fetch for multiple years
  const requests: BatchRequest<CFBDGame[]>[] = [];
  for (let year = 2014; year <= 2024; year++) {
    requests.push({
      url: `${CFBD_BASE_URL}/games?year=${year}`,
      options: {
        priority: "background",
        timeout: 60000,
        tags: ["backfill", `year-${year}`],
      },
    });
  }

  const results = await batchFetch(requests);

  // Process results
  let successCount = 0;
  let failureCount = 0;

  for (const result of results) {
    if (result.error) {
      console.warn(
        `Backfill failed for ${result.url}: ${result.error.message}`
      );
      failureCount++;
    } else {
      console.log(
        `Backfilled ${(result.data as CFBDGame[]).length} games from ${result.url}`
      );
      successCount++;
    }
  }

  console.log(
    `Backfill complete: ${successCount} successful, ${failureCount} failed`
  );
}

// =============================================================================
// EXAMPLE 11: Testing with Reset
// =============================================================================

/**
 * Reset rate limiter for tests
 */
async function example11_testing(): Promise<void> {
  // In your test setup
  beforeEach(() => {
    resetRateLimiter();
  });

  // Now each test starts with clean state
  it("should fetch teams", async () => {
    const teams = await rateLimitedFetch<CFBDTeam[]>(
      `${CFBD_BASE_URL}/teams`
    );
    expect(teams.length).toBeGreaterThan(0);
  });
}

// =============================================================================
// EXAMPLE 12: Integration with API Routes
// =============================================================================

/**
 * Use rate limiter in Next.js API route
 */
async function example12_apiRoute(): Promise<void> {
  // In src/app/api/teams/route.ts
  import { NextRequest, NextResponse } from "next/server";

  export async function GET(request: NextRequest) {
    try {
      // Check budget and circuit before processing
      const status = getRateLimiterStatus();
      if (status.budget.isCritical) {
        return NextResponse.json(
          { error: "API quota exceeded" },
          { status: 429 }
        );
      }

      // Fetch with rate limiting
      const teams = await rateLimitedFetch<CFBDTeam[]>(
        `${CFBD_BASE_URL}/teams`,
        {
          priority: "normal",
          timeout: 30000,
        }
      );

      return NextResponse.json(teams);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }
  }
}

// =============================================================================
// EXAMPLE 13: Monitoring Dashboard Metrics
// =============================================================================

/**
 * Export metrics for monitoring dashboard
 */
async function example13_metricsExport(): Promise<void> {
  // Could be called by Prometheus or similar
  export function getMetrics() {
    const status = getRateLimiterStatus();
    const budget = getBudgetStatus();

    return {
      // Rate limiting metrics
      "cfbd_available_tokens": status.availableTokens,
      "cfbd_queue_length": status.queueLength,
      "cfbd_circuit_state": status.circuitState,
      "cfbd_inflight_requests": status.inflightRequests,

      // Request metrics
      "cfbd_total_requests": status.totalRequests,
      "cfbd_successful_requests": status.successfulRequests,
      "cfbd_failed_requests": status.failedRequests,
      "cfbd_success_rate":
        status.totalRequests > 0
          ? (status.successfulRequests / status.totalRequests) * 100
          : 0,

      // Budget metrics
      "cfbd_budget_used": budget.used,
      "cfbd_budget_limit": budget.limit,
      "cfbd_budget_remaining": budget.remaining,
      "cfbd_budget_percent_used": budget.percentUsed,
      "cfbd_budget_is_warning": budget.isWarning ? 1 : 0,
      "cfbd_budget_is_critical": budget.isCritical ? 1 : 0,

      // Queue breakdown
      "cfbd_queue_critical": status.queueByPriority.critical,
      "cfbd_queue_high": status.queueByPriority.high,
      "cfbd_queue_normal": status.queueByPriority.normal,
      "cfbd_queue_low": status.queueByPriority.low,
      "cfbd_queue_background": status.queueByPriority.background,
    };
  }
}

// =============================================================================
// NOTES FOR PRODUCTION
// =============================================================================

/**
 * Deployment Checklist:
 *
 * 1. Set environment variables:
 *    - CFBD_API_KEY: Your API key from collegefootballdata.com
 *    - CFBD_MONTHLY_LIMIT: Your tier's limit (1000/25000/75000)
 *
 * 2. Monitor circuit breaker:
 *    - Alert if circuitState === 'OPEN'
 *    - Check last 24h success rate
 *
 * 3. Monitor budget:
 *    - Alert at warning threshold (80%)
 *    - Alert at critical threshold (95%)
 *    - Track reset date alignment
 *
 * 4. Optimize priority levels:
 *    - Ensure critical requests (gameday) get processed first
 *    - Batch background requests during off-peak hours
 *    - Use tags to track feature-specific request patterns
 *
 * 5. Test failure scenarios:
 *    - API 429 responses
 *    - API 5xx errors
 *    - Network timeouts
 *    - Budget exhaustion
 *    - Circuit breaker activation/recovery
 */
