/**
 * Upstash Redis Client
 * Provides caching and memoization for expensive computations
 */

import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

/**
 * Get cached value or compute and cache it.
 *
 * @param key - Cache key
 * @param ttl - Time to live in seconds
 * @param compute - Function to compute value if not cached
 *
 * @example
 * const teams = await cached("teams:all", 3600, () => fetchTeams());
 */
export async function cached<T>(
  key: string,
  ttl: number,
  compute: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get<T>(key);
    if (cached !== null) {
      return cached;
    }
  } catch (error) {
    // Redis unavailable — fall through to compute
    console.warn("Redis get failed:", error);
  }

  const value = await compute();

  try {
    await redis.set(key, value, { ex: ttl });
  } catch (error) {
    // Redis unavailable — just return computed value
    console.warn("Redis set failed:", error);
  }

  return value;
}

/**
 * Invalidate a cache key
 */
export async function invalidate(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.warn("Redis del failed:", error);
  }
}

/**
 * Invalidate multiple cache keys by pattern
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.warn("Redis pattern invalidate failed:", error);
  }
}

/**
 * Get multiple keys at once
 */
export async function getMany<T>(keys: string[]): Promise<(T | null)[]> {
  try {
    return await redis.mget<T[]>(...keys);
  } catch (error) {
    console.warn("Redis mget failed:", error);
    return keys.map(() => null);
  }
}

/**
 * Set multiple key-value pairs at once
 */
export async function setMany(
  entries: Array<{ key: string; value: unknown; ttl?: number }>
): Promise<void> {
  try {
    const pipeline = redis.multi();
    for (const entry of entries) {
      if (entry.ttl !== undefined) {
        pipeline.set(entry.key, entry.value, { ex: entry.ttl });
      } else {
        pipeline.set(entry.key, entry.value);
      }
    }
    await pipeline.exec();
  } catch (error) {
    console.warn("Redis mset failed:", error);
  }
}

export { redis };
