/**
 * CFBD API Rate Limiter with Request Queue, Circuit Breaker, and Budget Tracking
 *
 * Provides production-grade rate limiting for CollegeFootballData.com API:
 * - Token bucket rate limiting (500ms minimum between requests)
 * - Priority-based request queue (critical → high → normal → low → background)
 * - Circuit breaker pattern (protects API from cascading failures)
 * - Request deduplication (deduplicate simultaneous identical requests)
 * - Exponential backoff on 429/5xx errors
 * - Monthly budget tracking (with warning/critical thresholds)
 * - Metrics and monitoring (status, queue stats, budget usage)
 *
 * Free tier: 1K calls/month
 * Tier 2: 25K calls/month
 * Tier 3: 75K calls/month
 */

import { CFBD_BASE_URL } from "@/lib/utils/constants";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

/** Request priority levels */
export type Priority = "critical" | "high" | "normal" | "low" | "background";

/** Circuit breaker states */
export enum CircuitState {
  CLOSED = "closed", // Normal operation
  OPEN = "open", // Rejecting all requests
  HALF_OPEN = "half-open", // Testing if API is back
}

/**
 * Queued request metadata
 *
 * @template T Return type of the request
 */
interface QueuedRequest<T> {
  /** Unique request identifier */
  id: string;
  /** Priority level */
  priority: Priority;
  /** Function to execute */
  execute: () => Promise<T>;
  /** Resolve promise with result */
  resolve: (value: T) => void;
  /** Reject promise with error */
  reject: (error: Error) => void;
  /** Current retry attempt */
  retries: number;
  /** Maximum retries allowed */
  maxRetries: number;
  /** Timestamp when request was created */
  createdAt: number;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Tags for grouping/filtering requests */
  tags: string[];
  /** Timer ID for request timeout */
  timeoutId?: NodeJS.Timeout;
}

/**
 * Options for rate-limited fetch
 */
export interface RateLimitedFetchOptions {
  /** Priority level (default: 'normal') */
  priority?: Priority;
  /** Maximum retry attempts (default: 5) */
  maxRetries?: number;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Deduplication key (if not provided, URL is used) */
  deduplicateKey?: string;
  /** Tags for grouping/filtering requests */
  tags?: string[];
}

/**
 * Batch request structure
 *
 * @template T Return type after transformation
 */
export interface BatchRequest<T> {
  /** API endpoint URL */
  url: string;
  /** Fetch options */
  options?: RateLimitedFetchOptions;
  /** Optional transformation function on response */
  transform?: (data: unknown) => T;
}

/**
 * Batch result with metadata
 *
 * @template T Result data type
 */
export interface BatchResult<T> {
  /** URL of the request */
  url: string;
  /** Response data (if successful) */
  data?: T;
  /** Error (if failed) */
  error?: Error;
  /** Whether result came from cache */
  fromCache?: boolean;
  /** Request duration in milliseconds */
  duration: number;
}

/**
 * Rate limiter status snapshot
 */
export interface RateLimiterStatus {
  /** Number of available tokens */
  availableTokens: number;
  /** Length of request queue */
  queueLength: number;
  /** Queue breakdown by priority */
  queueByPriority: Record<Priority, number>;
  /** Current circuit breaker state */
  circuitState: CircuitState;
  /** Number of in-flight requests */
  inflightRequests: number;
  /** Budget status */
  budget: BudgetStatus;
  /** Timestamp of last successful request */
  lastSuccessfulRequest: number | null;
  /** Timestamp of last failed request */
  lastFailedRequest: number | null;
  /** Total requests since startup */
  totalRequests: number;
  /** Total successful requests */
  successfulRequests: number;
  /** Total failed requests */
  failedRequests: number;
}

/**
 * Budget tracking information
 */
export interface BudgetStatus {
  /** Calls used this month */
  used: number;
  /** Monthly call limit */
  limit: number;
  /** Remaining calls this month */
  remaining: number;
  /** Percentage of budget used (0-100) */
  percentUsed: number;
  /** Whether usage has reached warning threshold (80%) */
  isWarning: boolean;
  /** Whether usage has reached critical threshold (95%) */
  isCritical: boolean;
  /** ISO date when budget resets */
  resetDate: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Rate limiter configuration constants
 */
const RATE_LIMIT_CONFIG = {
  /** Minimum delay between requests (milliseconds) */
  MIN_DELAY_MS: 500,
  /** Maximum tokens in bucket (allows small bursts) */
  MAX_TOKENS: 10,
  /** Token refill rate (tokens per second) */
  REFILL_RATE: 2, // 1 request per 500ms
  /** Default timeout per request (milliseconds) */
  DEFAULT_TIMEOUT: 30000,
  /** Maximum retry attempts */
  MAX_RETRIES: 5,
  /** Failed requests threshold for circuit breaker */
  CIRCUIT_FAILURE_THRESHOLD: 5,
  /** Time window for circuit failure counting (seconds) */
  CIRCUIT_FAILURE_WINDOW: 60,
  /** Cooldown before trying HALF_OPEN (milliseconds) */
  CIRCUIT_RESET_TIMEOUT: 30000,
  /** Successful requests needed to close circuit from HALF_OPEN */
  CIRCUIT_SUCCESS_THRESHOLD: 2,
  /** Default monthly API call limit (free tier) */
  MONTHLY_LIMIT: 1000,
  /** Warning threshold (80% of limit) */
  WARNING_THRESHOLD: 0.8,
  /** Critical threshold (95% of limit) */
  CRITICAL_THRESHOLD: 0.95,
  /** Maximum queue size before rejecting new requests */
  MAX_QUEUE_SIZE: 500,
  /** Backoff multiplier for exponential backoff */
  BACKOFF_MULTIPLIER: 2,
  /** Initial backoff delay for 429/5xx (milliseconds) */
  INITIAL_BACKOFF_MS: 1000,
} as const;

// =============================================================================
// CFBD RATE LIMITER CLASS
// =============================================================================

/**
 * Token bucket rate limiter with request queue and circuit breaker
 *
 * Ensures:
 * - Compliance with CFBD's 500ms minimum delay between requests
 * - Fair scheduling across priority levels
 * - Graceful degradation when API is experiencing issues
 * - Budget awareness (prevents accidental over-quota usage)
 * - Deduplication of simultaneous identical requests
 */
class CFBDRateLimiter {
  // Token bucket state
  private tokens: number = RATE_LIMIT_CONFIG.MAX_TOKENS;
  private lastRefill: number = Date.now();

  // Request queue
  private requestQueue: QueuedRequest<unknown>[] = [];
  private inflightRequests: Map<string, Promise<unknown>> = new Map();

  // Circuit breaker
  private circuitState: CircuitState = CircuitState.CLOSED;
  private circuitFailures: number = 0;
  private circuitFailureTimestamps: number[] = [];
  private circuitResetTimer: NodeJS.Timeout | null = null;
  private circuitSuccesses: number = 0;

  // Budget tracking
  private budgetUsed: number = 0;
  private budgetLimit: number =
    parseInt(process.env.CFBD_MONTHLY_LIMIT || "1000", 10) ||
    RATE_LIMIT_CONFIG.MONTHLY_LIMIT;
  private budgetResetDate: Date = this.getMonthStart();

  // Metrics
  private totalRequests: number = 0;
  private successfulRequests: number = 0;
  private failedRequests: number = 0;
  private lastSuccessfulRequest: number | null = null;
  private lastFailedRequest: number | null = null;

  // Processing
  private isProcessing: boolean = false;
  private processingTimer: NodeJS.Timeout | null = null;

  /**
   * Calculate the start of the current month
   */
  private getMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Calculate the start of next month
   */
  private getMonthEnd(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  /**
   * Check if budget period has reset
   */
  private checkBudgetReset(): void {
    const now = new Date();
    if (now >= this.getMonthEnd()) {
      this.budgetResetDate = this.getMonthStart();
      this.budgetUsed = 0;
      console.log("[CFBDRateLimiter] Monthly budget reset");
    }
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    const elapsedSeconds = elapsedMs / 1000;
    const tokensToAdd =
      elapsedSeconds * RATE_LIMIT_CONFIG.REFILL_RATE;

    if (tokensToAdd > 0) {
      this.tokens = Math.min(
        RATE_LIMIT_CONFIG.MAX_TOKENS,
        this.tokens + tokensToAdd
      );
      this.lastRefill = now;
    }
  }

  /**
   * Check if we can make a request given budget constraints
   */
  private canMakeRequestByBudget(): boolean {
    this.checkBudgetReset();

    // In critical state, only allow critical/high priority
    if (this.budgetUsed / this.budgetLimit >= RATE_LIMIT_CONFIG.CRITICAL_THRESHOLD) {
      return false;
    }

    return this.budgetUsed < this.budgetLimit;
  }

  /**
   * Get the maximum priority level allowed by budget
   */
  private getMaxAllowedPriority(): Priority {
    this.checkBudgetReset();
    const usage = this.budgetUsed / this.budgetLimit;

    if (usage >= RATE_LIMIT_CONFIG.CRITICAL_THRESHOLD) {
      return "critical";
    }
    if (usage >= RATE_LIMIT_CONFIG.WARNING_THRESHOLD) {
      return "high";
    }
    return "background";
  }

  /**
   * Wait for a token to become available
   */
  private async waitForToken(): Promise<void> {
    while (true) {
      this.refillTokens();

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }

      // Calculate wait time until next token
      const timeUntilNextToken =
        (1 - this.tokens) / RATE_LIMIT_CONFIG.REFILL_RATE / 1000 * 500;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(10, timeUntilNextToken))
      );
    }
  }

  /**
   * Process circuit breaker logic
   */
  private updateCircuitBreaker(success: boolean): void {
    const now = Date.now();
    const windowStartTime = now - RATE_LIMIT_CONFIG.CIRCUIT_FAILURE_WINDOW * 1000;

    // Clean up old timestamps
    this.circuitFailureTimestamps = this.circuitFailureTimestamps.filter(
      (ts) => ts > windowStartTime
    );

    if (success) {
      if (this.circuitState === CircuitState.HALF_OPEN) {
        this.circuitSuccesses += 1;

        if (this.circuitSuccesses >= RATE_LIMIT_CONFIG.CIRCUIT_SUCCESS_THRESHOLD) {
          this.circuitState = CircuitState.CLOSED;
          this.circuitFailures = 0;
          this.circuitSuccesses = 0;
          console.log("[CFBDRateLimiter] Circuit breaker CLOSED (API recovered)");

          if (this.circuitResetTimer) {
            clearTimeout(this.circuitResetTimer);
            this.circuitResetTimer = null;
          }
        }
      }
    } else {
      this.circuitFailureTimestamps.push(now);
      this.circuitFailures = this.circuitFailureTimestamps.length;

      if (
        this.circuitState === CircuitState.CLOSED &&
        this.circuitFailures >= RATE_LIMIT_CONFIG.CIRCUIT_FAILURE_THRESHOLD
      ) {
        this.circuitState = CircuitState.OPEN;
        console.warn(
          `[CFBDRateLimiter] Circuit breaker OPEN (${this.circuitFailures} failures in ${RATE_LIMIT_CONFIG.CIRCUIT_FAILURE_WINDOW}s)`
        );

        // Schedule transition to HALF_OPEN
        if (this.circuitResetTimer) {
          clearTimeout(this.circuitResetTimer);
        }
        this.circuitResetTimer = setTimeout(
          () => {
            this.circuitState = CircuitState.HALF_OPEN;
            this.circuitSuccesses = 0;
            console.log("[CFBDRateLimiter] Circuit breaker HALF_OPEN (testing recovery)");
          },
          RATE_LIMIT_CONFIG.CIRCUIT_RESET_TIMEOUT
        );
      } else if (this.circuitState === CircuitState.HALF_OPEN) {
        // One failure in HALF_OPEN state opens the circuit again
        this.circuitState = CircuitState.OPEN;
        this.circuitSuccesses = 0;
        console.warn("[CFBDRateLimiter] Circuit breaker OPEN (failed recovery attempt)");

        if (this.circuitResetTimer) {
          clearTimeout(this.circuitResetTimer);
        }
        this.circuitResetTimer = setTimeout(
          () => {
            this.circuitState = CircuitState.HALF_OPEN;
            this.circuitSuccesses = 0;
            console.log("[CFBDRateLimiter] Circuit breaker HALF_OPEN (testing recovery)");
          },
          RATE_LIMIT_CONFIG.CIRCUIT_RESET_TIMEOUT
        );
      }
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private getBackoffDelay(attempt: number): number {
    const delayMs =
      RATE_LIMIT_CONFIG.INITIAL_BACKOFF_MS *
      Math.pow(RATE_LIMIT_CONFIG.BACKOFF_MULTIPLIER, attempt - 1);
    // Add jitter: ±10%
    const jitter = delayMs * 0.1 * (Math.random() - 0.5) * 2;
    return Math.ceil(delayMs + jitter);
  }

  /**
   * Process the next request in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.requestQueue.length > 0) {
        // Check circuit breaker
        if (this.circuitState === CircuitState.OPEN) {
          // Reject all queued requests
          const request = this.requestQueue.shift();
          if (request) {
            request.reject(
              new Error(
                "Circuit breaker is OPEN: API is experiencing issues. Please try again later."
              )
            );
          }
          continue;
        }

        // Check budget constraints
        const maxAllowedPriority = this.getMaxAllowedPriority();
        const request = this.requestQueue.find(
          (req) =>
            (["critical", "high", "normal", "low", "background"] as const).indexOf(
              req.priority
            ) <=
            (["critical", "high", "normal", "low", "background"] as const).indexOf(
              maxAllowedPriority
            )
        );

        if (!request) {
          // No eligible request by budget, wait a bit
          await new Promise((resolve) => setTimeout(resolve, 100));
          continue;
        }

        // Remove from queue
        const index = this.requestQueue.indexOf(request);
        this.requestQueue.splice(index, 1);

        // Wait for token
        await this.waitForToken();

        // Execute request with retry logic
        await this.executeRequest(request);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single request with retry logic
   */
  private async executeRequest<T>(
    request: QueuedRequest<T>
  ): Promise<void> {
    try {
      const startTime = Date.now();

      // Set timeout
      const timeoutPromise = new Promise<T>((_, reject) => {
        request.timeoutId = setTimeout(() => {
          reject(new Error(`Request timeout after ${request.timeout}ms`));
        }, request.timeout);
      });

      // Execute with timeout
      const result = await Promise.race([
        request.execute(),
        timeoutPromise,
      ]);

      // Clear timeout
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }

      const duration = Date.now() - startTime;

      this.totalRequests += 1;
      this.successfulRequests += 1;
      this.lastSuccessfulRequest = Date.now();
      this.budgetUsed += 1;

      this.updateCircuitBreaker(true);
      request.resolve(result);
    } catch (error) {
      const isRetryable = this.isRetryableError(error);
      const shouldRetry =
        isRetryable && request.retries < request.maxRetries;

      if (shouldRetry) {
        // Calculate backoff and re-queue
        const backoffMs = this.getBackoffDelay(request.retries + 1);
        request.retries += 1;

        console.warn(
          `[CFBDRateLimiter] Retrying request (attempt ${request.retries}/${request.maxRetries}) after ${backoffMs}ms: ${error}`
        );

        this.totalRequests += 1;

        // Re-queue with delay
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        this.requestQueue.push(request);

        // Process queue again
        this.processQueue().catch(console.error);
      } else {
        // Final failure
        if (request.timeoutId) {
          clearTimeout(request.timeoutId);
        }

        this.totalRequests += 1;
        this.failedRequests += 1;
        this.lastFailedRequest = Date.now();

        // Check if this is a 429 or 5xx error
        if (
          error instanceof Error &&
          (error.message.includes("429") || error.message.includes("5"))
        ) {
          this.updateCircuitBreaker(false);
        }

        const finalError =
          error instanceof Error
            ? error
            : new Error(String(error));
        request.reject(finalError);
      }
    }
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    // Retryable: 429 (rate limit), 5xx (server error), timeout
    const message = error.message;
    return (
      message.includes("429") ||
      message.includes("5") ||
      message.includes("timeout") ||
      message.includes("ECONNRESET") ||
      message.includes("ECONNREFUSED")
    );
  }

  /**
   * Queue a request
   */
  private queueRequest<T>(
    id: string,
    priority: Priority,
    execute: () => Promise<T>,
    options: RateLimitedFetchOptions
  ): Promise<T> {
    if (this.requestQueue.length >= RATE_LIMIT_CONFIG.MAX_QUEUE_SIZE) {
      return Promise.reject(
        new Error(
          `Request queue is full (${RATE_LIMIT_CONFIG.MAX_QUEUE_SIZE} requests). Please try again later.`
        )
      );
    }

    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id,
        priority,
        execute,
        resolve,
        reject,
        retries: 0,
        maxRetries: options.maxRetries ?? RATE_LIMIT_CONFIG.MAX_RETRIES,
        createdAt: Date.now(),
        timeout: options.timeout ?? RATE_LIMIT_CONFIG.DEFAULT_TIMEOUT,
        tags: options.tags ?? [],
      };

      // Sort into queue by priority
      let inserted = false;
      const priorityOrder: Priority[] = [
        "critical",
        "high",
        "normal",
        "low",
        "background",
      ];
      const priorityIndex = priorityOrder.indexOf(priority);

      for (let i = 0; i < this.requestQueue.length; i++) {
        const queuedPriority = this.requestQueue[i].priority;
        const queuedPriorityIndex = priorityOrder.indexOf(queuedPriority);

        if (priorityIndex < queuedPriorityIndex) {
          this.requestQueue.splice(i, 0, request);
          inserted = true;
          break;
        }
      }

      if (!inserted) {
        this.requestQueue.push(request);
      }

      // Kick off processing
      this.processQueue().catch(console.error);
    });
  }

  /**
   * Make a rate-limited API request
   *
   * @template T Return type
   * @param url Full URL to fetch
   * @param options Rate limiting and retry options
   * @returns Response data
   * @throws Error if request fails after retries or if circuit is open
   */
  async fetch<T>(url: string, options?: RateLimitedFetchOptions): Promise<T> {
    const dedupeKey = options?.deduplicateKey ?? url;
    const priority = options?.priority ?? "normal";

    // Check for in-flight request (deduplication)
    if (this.inflightRequests.has(dedupeKey)) {
      console.log(`[CFBDRateLimiter] Deduplicating request: ${dedupeKey}`);
      return this.inflightRequests.get(dedupeKey) as Promise<T>;
    }

    // Create the request promise
    const requestPromise = this.queueRequest<T>(
      `${Date.now()}-${Math.random()}`,
      priority,
      async () => {
        try {
          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${process.env.CFBD_API_KEY}`,
              Accept: "application/json",
            },
          });

          if (response.status === 429) {
            throw new Error(`429: Rate limited by CFBD API`);
          }

          if (!response.ok) {
            throw new Error(
              `${response.status}: ${response.statusText} from ${url}`
            );
          }

          return response.json() as Promise<T>;
        } catch (error) {
          throw error;
        }
      },
      options ?? {}
    );

    // Track in-flight request
    this.inflightRequests.set(dedupeKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Remove from in-flight tracking
      this.inflightRequests.delete(dedupeKey);
    }
  }

  /**
   * Get current status snapshot
   */
  getStatus(): RateLimiterStatus {
    const queueByPriority: Record<Priority, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
      background: 0,
    };

    for (const request of this.requestQueue) {
      queueByPriority[request.priority] += 1;
    }

    return {
      availableTokens: Math.floor(this.tokens * 100) / 100, // Round to 2 decimals
      queueLength: this.requestQueue.length,
      queueByPriority,
      circuitState: this.circuitState,
      inflightRequests: this.inflightRequests.size,
      budget: this.getBudgetStatus(),
      lastSuccessfulRequest: this.lastSuccessfulRequest,
      lastFailedRequest: this.lastFailedRequest,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
    };
  }

  /**
   * Get budget status
   */
  getBudgetStatus(): BudgetStatus {
    this.checkBudgetReset();
    const remaining = Math.max(0, this.budgetLimit - this.budgetUsed);
    const percentUsed = (this.budgetUsed / this.budgetLimit) * 100;

    return {
      used: this.budgetUsed,
      limit: this.budgetLimit,
      remaining,
      percentUsed: Math.round(percentUsed * 10) / 10,
      isWarning:
        percentUsed >= RATE_LIMIT_CONFIG.WARNING_THRESHOLD * 100,
      isCritical:
        percentUsed >= RATE_LIMIT_CONFIG.CRITICAL_THRESHOLD * 100,
      resetDate: this.getMonthEnd().toISOString(),
    };
  }

  /**
   * Reset the rate limiter (for testing only)
   */
  reset(): void {
    this.tokens = RATE_LIMIT_CONFIG.MAX_TOKENS;
    this.lastRefill = Date.now();
    this.requestQueue = [];
    this.inflightRequests.clear();
    this.circuitState = CircuitState.CLOSED;
    this.circuitFailures = 0;
    this.circuitFailureTimestamps = [];
    this.circuitSuccesses = 0;
    this.budgetUsed = 0;
    this.budgetResetDate = this.getMonthStart();
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.lastSuccessfulRequest = null;
    this.lastFailedRequest = null;
    this.isProcessing = false;

    if (this.circuitResetTimer) {
      clearTimeout(this.circuitResetTimer);
      this.circuitResetTimer = null;
    }
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }

    console.log("[CFBDRateLimiter] Reset to initial state");
  }
}

// =============================================================================
// SINGLETON & EXPORTS
// =============================================================================

/** Global rate limiter instance */
let rateLimiterInstance: CFBDRateLimiter | null = null;

/**
 * Get or create the singleton rate limiter instance
 */
function getRateLimiterInstance(): CFBDRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new CFBDRateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Make a rate-limited fetch request to the CFBD API
 *
 * Automatically handles:
 * - Token bucket rate limiting (500ms minimum delay)
 * - Priority-based queuing
 * - Request deduplication
 * - Exponential backoff on 429/5xx errors
 * - Circuit breaker on repeated failures
 * - Budget tracking against monthly limits
 *
 * @template T Return type
 * @param url Full CFBD API URL
 * @param options Rate limiting options
 * @returns Parsed JSON response
 * @throws Error if request fails, queue is full, or circuit is open
 *
 * @example
 * ```typescript
 * const teams = await rateLimitedFetch<CFBDTeam[]>(
 *   'https://apinext.collegefootballdata.com/teams',
 *   { priority: 'high' }
 * );
 * ```
 */
export async function rateLimitedFetch<T>(
  url: string,
  options?: RateLimitedFetchOptions
): Promise<T> {
  const limiter = getRateLimiterInstance();
  return limiter.fetch<T>(url, options);
}

/**
 * Queue a batch of API calls with smart scheduling
 *
 * Automatically:
 * - Schedules requests by priority
 * - Applies rate limiting across the entire batch
 * - Shares results for duplicate requests
 * - Tracks timing for each request
 *
 * @template T Result data type
 * @param requests Array of batch requests
 * @returns Array of results in same order as requests
 *
 * @example
 * ```typescript
 * const results = await batchFetch([
 *   { url: 'https://apinext.collegefootballdata.com/teams' },
 *   { url: 'https://apinext.collegefootballdata.com/games?year=2024' },
 * ]);
 * ```
 */
export async function batchFetch<T>(
  requests: BatchRequest<T>[]
): Promise<BatchResult<T>[]> {
  const results: BatchResult<T>[] = [];

  for (const request of requests) {
    const startTime = Date.now();
    try {
      const data = await rateLimitedFetch<unknown>(
        request.url,
        request.options
      );
      const transformed = request.transform ? request.transform(data) : (data as T);
      results.push({
        url: request.url,
        data: transformed,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      results.push({
        url: request.url,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      });
    }
  }

  return results;
}

/**
 * Get current rate limiter status
 *
 * Returns comprehensive snapshot including:
 * - Available tokens and queue length
 * - Circuit breaker state
 * - Budget usage
 * - Request metrics
 *
 * @returns Status snapshot
 *
 * @example
 * ```typescript
 * const status = getRateLimiterStatus();
 * console.log(`Queue: ${status.queueLength}, Circuit: ${status.circuitState}`);
 * console.log(`Budget: ${status.budget.percentUsed}% used`);
 * ```
 */
export function getRateLimiterStatus(): RateLimiterStatus {
  const limiter = getRateLimiterInstance();
  return limiter.getStatus();
}

/**
 * Get budget status
 *
 * Useful for checking approaching monthly limits
 *
 * @returns Budget information including warning/critical flags
 *
 * @example
 * ```typescript
 * const budget = getBudgetStatus();
 * if (budget.isCritical) {
 *   console.warn('API budget is nearly exhausted!');
 * }
 * ```
 */
export function getBudgetStatus(): BudgetStatus {
  const limiter = getRateLimiterInstance();
  return limiter.getBudgetStatus();
}

/**
 * Reset the rate limiter to initial state
 *
 * WARNING: Only for testing. Resets all state:
 * - Clears request queue
 * - Closes any open connections
 * - Resets circuit breaker
 * - Resets metrics
 * - Resets budget counters
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   resetRateLimiter();
 * });
 * ```
 */
export function resetRateLimiter(): void {
  const limiter = getRateLimiterInstance();
  limiter.reset();
}

/**
 * Export the rate limiter singleton
 * @internal For testing and advanced usage only
 */
export const cfbdRateLimiter: CFBDRateLimiter = getRateLimiterInstance();
