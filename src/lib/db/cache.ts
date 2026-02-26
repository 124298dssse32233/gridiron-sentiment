/**
 * Production-Grade Redis Caching Abstraction for Gridiron Intel
 *
 * Provides:
 * - Smart get-or-compute pattern with automatic memoization
 * - Batch operations for efficient multi-key loading
 * - Tag-based invalidation for grouped cache busting
 * - Stale-while-revalidate pattern for background refresh
 * - Cache warming and statistics tracking
 * - Graceful degradation when Redis is unavailable
 * - Debug mode for development
 *
 * @module lib/db/cache
 */

import { redis } from './redis';

// ============================================================================
// CACHE TTL CONSTANTS
// ============================================================================

/**
 * Cache time-to-live values (in seconds) for different data types.
 * These values balance freshness with database load.
 */
export const CACHE_TTL = {
  /** Live scores during active games (real-time updates) */
  LIVE_SCORES: 30,
  /** Full rankings table (updated hourly) */
  RANKINGS: 3600,
  /** Individual team profile pages (updated every 30 min) */
  TEAM_PROFILE: 1800,
  /** Week-by-week predictions (updated every 2 hours) */
  PREDICTIONS: 7200,
  /** Historical data (rarely changes, cache for 24h) */
  HISTORICAL: 86400,
  /** Chaos Index scores (updated hourly) */
  CHAOS_INDEX: 3600,
  /** Monte Carlo matchup simulations (expensive, cache 10 min) */
  MATCHUP_SIM: 600,
  /** Coach grading and decision analysis */
  COACH_GRADES: 7200,
  /** Award probability predictions */
  AWARDS: 7200,
  /** Search/indexing data */
  SEARCH_INDEX: 43200,
  /** Conference-level rankings and stats */
  CONFERENCE: 3600,
  /** Methodology pages and static content */
  METHODOLOGY: 86400,
  /** Recruiting rankings and portal data */
  RECRUITING: 7200,
  /** Game schedule and results */
  GAMES: 600,
  /** Rivalry history and stats */
  RIVALRY: 7200,
  /** Roster composition and talent data */
  ROSTER: 3600,
  /** SOS and strength calculations */
  SOS: 3600,
} as const;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for controlling cache behavior
 */
export interface CacheOptions {
  /**
   * Force refresh even if cached data exists.
   * Useful for manual invalidation without deleting the key.
   */
  forceRefresh?: boolean;

  /**
   * Custom serializer function (defaults to JSON.stringify)
   */
  serialize?: (data: unknown) => string;

  /**
   * Custom deserializer function (defaults to JSON.parse)
   */
  deserialize?: (data: string) => unknown;

  /**
   * Tags for grouped invalidation. Allows invalidating all caches
   * related to a team, week, or conference with one call.
   * Example: ['team:alabama', 'season:2024']
   */
  tags?: string[];

  /**
   * Use stale-while-revalidate pattern: return stale data immediately
   * while refreshing in the background.
   */
  swr?: boolean;

  /**
   * Window in seconds where data is acceptable as "stale" (only with swr=true).
   * If data is older than this, return stale but trigger background refresh.
   * Default: 300 (5 minutes)
   */
  staleWindow?: number;

  /**
   * Enable debug logging for cache hits, misses, and timing
   */
  debug?: boolean;
}

/**
 * Configuration for warming a cache key
 */
export interface CacheWarmConfig {
  /** Unique key to warm */
  key: string;
  /** Function that computes the value */
  computeFn: () => Promise<unknown>;
  /** TTL in seconds */
  ttl: number;
  /** Optional tags for this cache entry */
  tags?: string[];
}

/**
 * Result of a cache warming operation
 */
export interface WarmResult {
  /** Number of keys successfully warmed */
  warmed: number;
  /** Number of keys that failed to warm */
  failed: number;
  /** Total duration in milliseconds */
  duration: number;
  /** List of failed keys with errors */
  errors: Array<{ key: string; error: string }>;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Hit rate as percentage (0-100) */
  hitRate: number;
  /** Total keys currently in cache */
  totalKeys: number;
  /** Approximate memory usage as formatted string */
  memoryUsage: string;
}

/**
 * Batch compute function return type
 */
type BatchComputeResult<T> = Map<string, T>;

// ============================================================================
// INTERNAL STATE
// ============================================================================

/** Track cache statistics for monitoring */
let cacheStats = {
  hits: 0,
  misses: 0,
};

/** Map tag names to their associated cache keys */
const tagRegistry = new Map<string, Set<string>>();

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Smart get-or-compute pattern: the most important function.
 *
 * If the key exists in cache, return the cached value. If not, compute the value,
 * cache it with the specified TTL, and return it. Handles Redis failures gracefully
 * by falling through to compute.
 *
 * @template T The type of the cached value
 * @param key - Unique cache key (e.g., "rankings:2024:12:FBS")
 * @param computeFn - Async function that computes the value if not cached
 * @param ttl - Time-to-live in seconds
 * @param options - Optional cache configuration
 * @returns The cached or computed value
 *
 * @example
 * ```typescript
 * const rankings = await cached(
 *   'rankings:2024:12:FBS',
 *   () => computeGridRank(2024, 12, 'FBS'),
 *   CACHE_TTL.RANKINGS,
 *   { tags: ['season:2024', 'week:12'] }
 * );
 * ```
 */
export async function cached<T>(
  key: string,
  computeFn: () => Promise<T>,
  ttl: number,
  options: CacheOptions = {}
): Promise<T> {
  const {
    forceRefresh = false,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    tags = [],
    swr = false,
    staleWindow = 300,
    debug = false,
  } = options;

  const startTime = performance.now();

  try {
    // If force refresh requested, skip cache read
    if (!forceRefresh) {
      const cached = await redis.get<string>(key);
      if (cached !== null) {
        cacheStats.hits++;
        const duration = performance.now() - startTime;
        if (debug) {
          console.log(`[CACHE HIT] ${key} (${duration.toFixed(2)}ms)`);
        }
        return deserialize(cached) as T;
      }
    }

    // Cache miss or force refresh
    cacheStats.misses++;
    if (debug && !forceRefresh) {
      console.log(`[CACHE MISS] ${key}`);
    }

    // Compute the value
    const value = await computeFn();

    // Cache the result
    try {
      const serialized = serialize(value);
      await redis.set(key, serialized, { ex: ttl });

      // Register tags for this key
      if (tags.length > 0) {
        await registerTags(key, tags);
      }
    } catch (error) {
      if (debug) {
        console.warn(`[CACHE WRITE FAILED] ${key}:`, error);
      }
    }

    const duration = performance.now() - startTime;
    if (debug) {
      console.log(`[CACHE COMPUTE] ${key} (${duration.toFixed(2)}ms)`);
    }

    return value;
  } catch (error) {
    // Redis unavailable — fall through to compute
    if (debug) {
      console.warn(`[REDIS ERROR] ${key}:`, error);
    }
    return computeFn();
  }
}

/**
 * Batch get-or-compute: efficiently load multiple items.
 *
 * Fetches all requested keys from cache in one batch. For any missing keys,
 * calls computeFn with the list of missing IDs, then caches all results.
 * More efficient than calling cached() in a loop.
 *
 * @template T The type of cached values
 * @param keyPrefix - Prefix for all keys (e.g., "team:" for "team:alabama", "team:georgia", etc.)
 * @param ids - List of IDs to fetch (e.g., ['alabama', 'georgia', 'ohio-state'])
 * @param computeFn - Function that computes missing items. Receives list of missing IDs.
 * @param ttl - Time-to-live in seconds
 * @param options - Optional cache configuration
 * @returns Map of id => value for all requested IDs
 *
 * @example
 * ```typescript
 * const teamIds = ['alabama', 'georgia', 'ohio-state'];
 * const teams = await cachedBatch(
 *   'team:',
 *   teamIds,
 *   (missing) => db.team.findMany({ where: { slug: { in: missing } } })
 *     .then(items => new Map(items.map(t => [t.slug, t]))),
 *   CACHE_TTL.TEAM_PROFILE,
 *   { tags: ['team'] }
 * );
 * ```
 */
export async function cachedBatch<T>(
  keyPrefix: string,
  ids: string[],
  computeFn: (missingIds: string[]) => Promise<BatchComputeResult<T>>,
  ttl: number,
  options: CacheOptions = {}
): Promise<Map<string, T>> {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    tags = [],
    debug = false,
  } = options;

  try {
    // Build full keys
    const keys = ids.map(id => `${keyPrefix}${id}`);

    // Batch fetch from Redis
    const cachedValues = await redis.mget<(string | null)[]>(...keys);

    const result = new Map<string, T>();
    const missingIds: string[] = [];

    // Separate cache hits from misses
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const cached = cachedValues[i];

      if (cached !== null) {
        cacheStats.hits++;
        result.set(id, deserialize(cached) as T);
        if (debug) {
          console.log(`[BATCH HIT] ${keyPrefix}${id}`);
        }
      } else {
        cacheStats.misses++;
        missingIds.push(id);
        if (debug) {
          console.log(`[BATCH MISS] ${keyPrefix}${id}`);
        }
      }
    }

    // Compute missing values if any
    if (missingIds.length > 0) {
      if (debug) {
        console.log(`[BATCH COMPUTE] Computing ${missingIds.length} missing items`);
      }

      const computed = await computeFn(missingIds);

      // Cache computed values and add to result
      const entries: Array<{ key: string; value: string; ttl: number }> = [];
      for (const [id, value] of computed.entries()) {
        result.set(id, value);
        entries.push({
          key: `${keyPrefix}${id}`,
          value: serialize(value),
          ttl,
        });
      }

      // Batch write to Redis
      if (entries.length > 0) {
        try {
          const pipeline = redis.multi();
          for (const entry of entries) {
            pipeline.set(entry.key, entry.value, { ex: entry.ttl });
          }
          await pipeline.exec();

          // Register tags
          if (tags.length > 0) {
            for (const [id] of computed.entries()) {
              await registerTags(`${keyPrefix}${id}`, tags);
            }
          }
        } catch (error) {
          if (debug) {
            console.warn('[BATCH CACHE WRITE FAILED]:', error);
          }
        }
      }
    }

    return result;
  } catch (error) {
    if (debug) {
      console.warn('[BATCH REDIS ERROR]:', error);
    }
    // Fall through: compute all
    return computeFn(ids);
  }
}

/**
 * Invalidate a single cache key.
 *
 * @param key - The cache key to invalidate
 *
 * @example
 * ```typescript
 * await invalidate('rankings:2024:12:FBS');
 * ```
 */
export async function invalidate(key: string): Promise<void> {
  try {
    await redis.del(key);
    // Remove from all tag registries
    for (const tags of tagRegistry.values()) {
      tags.delete(key);
    }
  } catch (error) {
    console.warn(`[INVALIDATE FAILED] ${key}:`, error);
  }
}

/**
 * Invalidate cache keys matching a pattern (Redis glob syntax).
 *
 * Examples:
 * - `rankings:*` — all rankings
 * - `team:alabama:*` — all caches for Alabama
 * - `rankings:2024:*` — all rankings for 2024
 * - `*chaos*` — all chaos-related caches
 *
 * @param pattern - Redis glob pattern
 *
 * @example
 * ```typescript
 * // Invalidate all team rankings after a team update
 * await invalidatePattern('team:alabama:*');
 *
 * // Invalidate all rankings after a week completes
 * await invalidatePattern('rankings:*');
 * ```
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      // Remove from tag registries
      for (const key of keys) {
        for (const tags of tagRegistry.values()) {
          tags.delete(key);
        }
      }
    }
  } catch (error) {
    console.warn(`[INVALIDATE PATTERN FAILED] ${pattern}:`, error);
  }
}

/**
 * Invalidate all cache keys.
 * Use with caution — this flushes the entire cache.
 *
 * @example
 * ```typescript
 * // After a data import or manual sync
 * await invalidateAll();
 * ```
 */
export async function invalidateAll(): Promise<void> {
  try {
    await redis.flushdb();
    tagRegistry.clear();
  } catch (error) {
    console.warn('[INVALIDATE ALL FAILED]:', error);
  }
}

/**
 * Stale-while-revalidate pattern: serve stale data immediately while
 * refreshing in the background.
 *
 * Benefits:
 * - Instant response times even when data is stale
 * - Background refresh keeps data fresh
 * - Better UX during compute-heavy operations
 *
 * @template T The type of the cached value
 * @param key - Cache key
 * @param computeFn - Async function to compute fresh value
 * @param ttl - TTL for fresh data (in seconds)
 * @param staleWindow - Duration stale data is acceptable (default 300s / 5 min)
 * @param options - Optional cache configuration
 * @returns The cached (stale or fresh) value
 *
 * @example
 * ```typescript
 * // Return stale rankings while refreshing in background
 * const rankings = await staleWhileRevalidate(
 *   'rankings:2024:12:FBS',
 *   () => computeGridRank(2024, 12, 'FBS'),
 *   CACHE_TTL.RANKINGS,
 *   600  // stale for up to 10 minutes
 * );
 * ```
 */
export async function staleWhileRevalidate<T>(
  key: string,
  computeFn: () => Promise<T>,
  ttl: number,
  staleWindow: number = 300,
  options: CacheOptions = {}
): Promise<T> {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    tags = [],
    debug = false,
  } = options;

  try {
    // Try to get cached value
    const cached = await redis.get<string>(key);
    if (cached !== null) {
      cacheStats.hits++;
      if (debug) {
        console.log(`[SWR HIT] ${key}`);
      }

      const value = deserialize(cached) as T;

      // Get TTL to check if stale
      const ttlRemaining = await redis.ttl(key);
      const isStale = ttlRemaining < 0 || (ttl - ttlRemaining) > staleWindow;

      if (isStale && debug) {
        console.log(`[SWR REFRESH TRIGGERED] ${key} (TTL: ${ttlRemaining}s)`);
      }

      // Non-blocking refresh if stale
      if (isStale) {
        computeFn()
          .then(fresh => {
            return redis.set(key, serialize(fresh), { ex: ttl });
          })
          .catch(error => {
            if (debug) {
              console.warn(`[SWR BACKGROUND REFRESH FAILED] ${key}:`, error);
            }
          });
      }

      return value;
    }

    // Cache miss
    cacheStats.misses++;
    if (debug) {
      console.log(`[SWR MISS] ${key}`);
    }

    const value = await computeFn();
    try {
      await redis.set(key, serialize(value), { ex: ttl });
      if (tags.length > 0) {
        await registerTags(key, tags);
      }
    } catch (error) {
      if (debug) {
        console.warn(`[SWR CACHE WRITE FAILED] ${key}:`, error);
      }
    }

    return value;
  } catch (error) {
    if (debug) {
      console.warn(`[SWR REDIS ERROR] ${key}:`, error);
    }
    return computeFn();
  }
}

/**
 * Tag-based cache invalidation: invalidate all keys associated with a tag.
 *
 * Tags enable grouped invalidation. For example:
 * - Tag "team:alabama" on all Alabama-related caches
 * - Tag "season:2024" on all 2024-season caches
 * - When Alabama's roster changes, invalidate "team:alabama" tag
 * - All related caches are invalidated automatically
 *
 * @param tag - The tag to invalidate (e.g., "team:alabama", "season:2024")
 *
 * @example
 * ```typescript
 * // When Alabama's roster is updated
 * await invalidateByTag('team:alabama');
 *
 * // When a week completes
 * await invalidateByTag('week:2024:12');
 *
 * // When the season starts
 * await invalidateByTag('season:2024');
 * ```
 */
export async function invalidateByTag(tag: string): Promise<void> {
  try {
    const keys = tagRegistry.get(tag);
    if (keys && keys.size > 0) {
      await redis.del(...Array.from(keys));
      tagRegistry.delete(tag);
    }
  } catch (error) {
    console.warn(`[INVALIDATE BY TAG FAILED] ${tag}:`, error);
  }
}

/**
 * Warm (preload) a set of cache keys to avoid stampedes and reduce latency.
 *
 * Useful during deployment or after data updates to preload frequently
 * accessed items like rankings, methodology, or team pages.
 *
 * @param configs - Array of cache warming configurations
 * @returns Warming result with success/failure counts
 *
 * @example
 * ```typescript
 * const result = await warmCache([
 *   {
 *     key: 'rankings:2024:12:FBS',
 *     computeFn: () => computeGridRank(2024, 12, 'FBS'),
 *     ttl: CACHE_TTL.RANKINGS,
 *     tags: ['season:2024', 'week:12'],
 *   },
 *   {
 *     key: 'methodology:current',
 *     computeFn: () => generateMethodology(),
 *     ttl: CACHE_TTL.METHODOLOGY,
 *   },
 * ]);
 *
 * console.log(`Warmed ${result.warmed} keys in ${result.duration}ms`);
 * if (result.errors.length > 0) {
 *   console.error('Failed keys:', result.errors);
 * }
 * ```
 */
export async function warmCache(configs: CacheWarmConfig[]): Promise<WarmResult> {
  const startTime = performance.now();
  const result: WarmResult = {
    warmed: 0,
    failed: 0,
    duration: 0,
    errors: [],
  };

  for (const config of configs) {
    try {
      const value = await config.computeFn();
      await redis.set(config.key, JSON.stringify(value), { ex: config.ttl });

      if (config.tags && config.tags.length > 0) {
        await registerTags(config.key, config.tags);
      }

      result.warmed++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        key: config.key,
        error: error instanceof Error ? error.message : String(error),
      });
      console.warn(`[CACHE WARM FAILED] ${config.key}:`, error);
    }
  }

  result.duration = performance.now() - startTime;
  return result;
}

/**
 * Get cache statistics for monitoring and debugging.
 *
 * @returns Cache hit/miss stats and memory information
 *
 * @example
 * ```typescript
 * const stats = await getCacheStats();
 * console.log(`Cache hit rate: ${stats.hitRate.toFixed(2)}%`);
 * console.log(`Memory usage: ${stats.memoryUsage}`);
 * ```
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const info = await redis.info();
    const usedMemory = info?.used_memory_human ?? 'unknown';

    const total = cacheStats.hits + cacheStats.misses;
    const hitRate = total > 0 ? (cacheStats.hits / total) * 100 : 0;

    const dbSize = await redis.dbsize();

    return {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalKeys: dbSize,
      memoryUsage: String(usedMemory),
    };
  } catch (error) {
    console.warn('[GET CACHE STATS FAILED]:', error);
    return {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: 0,
      totalKeys: 0,
      memoryUsage: 'unavailable',
    };
  }
}

/**
 * Reset cache statistics (for testing or metrics reset)
 *
 * @internal
 */
export function resetStats(): void {
  cacheStats = { hits: 0, misses: 0 };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Register cache keys with their associated tags for grouped invalidation.
 *
 * @internal
 */
async function registerTags(key: string, tags: string[]): Promise<void> {
  for (const tag of tags) {
    if (!tagRegistry.has(tag)) {
      tagRegistry.set(tag, new Set());
    }
    tagRegistry.get(tag)!.add(key);
  }
}

// ============================================================================
// CACHE KEY NAMING UTILITIES
// ============================================================================

/**
 * Utility functions for generating consistent cache key names.
 * Using these functions reduces the risk of key collisions and typos.
 */
export const cacheKeys = {
  /**
   * Rankings cache key
   *
   * @example
   * ```typescript
   * const key = cacheKeys.rankings(2024, 12, 'FBS');
   * // => "rankings:2024:12:FBS"
   * ```
   */
  rankings: (season: number, week: number, level: string): string =>
    `rankings:${season}:${week}:${level}`,

  /**
   * Team profile cache key
   *
   * @example
   * ```typescript
   * const key = cacheKeys.team('alabama');
   * // => "team:alabama"
   * ```
   */
  team: (slug: string): string => `team:${slug}`,

  /**
   * Team games cache key
   */
  teamGames: (slug: string, season: number): string => `team:${slug}:games:${season}`,

  /**
   * Matchup simulation cache key
   */
  matchup: (teamA: string, teamB: string, simCount: number): string =>
    `matchup:${teamA}:${teamB}:${simCount}`,

  /**
   * Chaos Index cache key
   */
  chaos: (season: number, week: number): string => `chaos:${season}:${week}`,

  /**
   * Coach grades cache key
   */
  coach: (coachId: string, season: number): string => `coach:${coachId}:${season}`,

  /**
   * Predictions cache key
   */
  predictions: (season: number, week: number): string =>
    `predictions:${season}:${week}`,

  /**
   * Awards tracker cache key
   */
  awards: (season: number, awardType: string): string =>
    `awards:${season}:${awardType}`,

  /**
   * Search index cache key
   */
  searchIndex: (): string => 'search:index',

  /**
   * Conference rankings cache key
   */
  conference: (slug: string): string => `conference:${slug}`,

  /**
   * Methodology cache key
   */
  methodology: (): string => 'methodology',

  /**
   * Rivalry head-to-head cache key
   */
  rivalry: (teamA: string, teamB: string): string =>
    `rivalry:${teamA}:${teamB}`,

  /**
   * Recruiting rankings cache key
   */
  recruiting: (season: number, position?: string): string =>
    position ? `recruiting:${season}:${position}` : `recruiting:${season}`,

  /**
   * Roster composition cache key
   */
  roster: (slug: string): string => `roster:${slug}`,

  /**
   * Strength of schedule cache key
   */
  sos: (slug: string, season: number): string => `sos:${slug}:${season}`,
} as const;

/**
 * Utility functions for generating consistent tag names.
 * Tags enable grouped invalidation across related caches.
 */
export const cacheTags = {
  /**
   * Tag for all caches related to a specific team
   *
   * @example
   * ```typescript
   * const tag = cacheTags.team('alabama');
   * // => "tag:team:alabama"
   * ```
   */
  team: (slug: string): string => `tag:team:${slug}`,

  /**
   * Tag for all caches related to a specific season
   */
  season: (year: number): string => `tag:season:${year}`,

  /**
   * Tag for all caches related to a specific week
   */
  week: (year: number, week: number): string => `tag:week:${year}:${week}`,

  /**
   * Tag for all caches related to a specific conference
   */
  conference: (slug: string): string => `tag:conference:${slug}`,

  /**
   * Tag for all real-time/live data caches
   */
  live: (): string => 'tag:live',

  /**
   * Tag for all rankings-related caches
   */
  rankings: (): string => 'tag:rankings',
} as const;
