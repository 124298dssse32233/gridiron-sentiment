/**
 * Cache Layer Integration Tests
 *
 * Demonstrates real-world usage patterns and validates cache behavior.
 * Run with: `npm test -- cache.test.ts`
 *
 * @module lib/db/__tests__/cache.test
 */

import {
  cached,
  cachedBatch,
  invalidate,
  invalidatePattern,
  invalidateByTag,
  invalidateAll,
  staleWhileRevalidate,
  warmCache,
  getCacheStats,
  resetStats,
  cacheKeys,
  cacheTags,
  CACHE_TTL,
} from '../cache';

// ============================================================================
// SETUP
// ============================================================================

/** Artificial delay to simulate expensive computation */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Mock compute function */
async function computeTeamData(slug: string): Promise<{ name: string; slug: string }> {
  await delay(100); // Simulate DB query
  return { name: slug.toUpperCase(), slug };
}

/** Mock batch compute function */
async function computeTeamsBatch(
  slugs: string[]
): Promise<Map<string, { name: string; slug: string }>> {
  await delay(150); // Simulate DB query
  const result = new Map();
  for (const slug of slugs) {
    result.set(slug, { name: slug.toUpperCase(), slug });
  }
  return result;
}

/** Mock rankings computation */
async function computeRankings(
  season: number,
  week: number,
  level: string
): Promise<Array<{ rank: number; team: string; rating: number }>> {
  await delay(500); // Expensive computation
  return [
    { rank: 1, team: 'Alabama', rating: 1523 },
    { rank: 2, team: 'Georgia', rating: 1510 },
  ];
}

// ============================================================================
// TESTS
// ============================================================================

describe('Cache Layer', () => {
  beforeEach(() => resetStats());

  describe('cached()', () => {
    it('should cache and return computed value on first call', async () => {
      const key = cacheKeys.team('alabama');
      let callCount = 0;

      const result = await cached(
        key,
        async () => {
          callCount++;
          return computeTeamData('alabama');
        },
        CACHE_TTL.TEAM_PROFILE
      );

      expect(callCount).toBe(1);
      expect(result.slug).toBe('alabama');
    });

    it('should return cached value on subsequent calls', async () => {
      const key = cacheKeys.team('georgia');
      let callCount = 0;

      const result1 = await cached(
        key,
        async () => {
          callCount++;
          return computeTeamData('georgia');
        },
        CACHE_TTL.TEAM_PROFILE
      );

      const result2 = await cached(
        key,
        async () => {
          callCount++;
          return computeTeamData('georgia');
        },
        CACHE_TTL.TEAM_PROFILE
      );

      expect(callCount).toBe(1); // Computed only once
      expect(result1).toEqual(result2);
    });

    it('should record cache hits and misses', async () => {
      const key = cacheKeys.team('ohio-state');

      await cached(
        key,
        async () => computeTeamData('ohio-state'),
        CACHE_TTL.TEAM_PROFILE
      );

      const stats1 = await getCacheStats();
      expect(stats1.misses).toBe(1);
      expect(stats1.hits).toBe(0);

      await cached(
        key,
        async () => computeTeamData('ohio-state'),
        CACHE_TTL.TEAM_PROFILE
      );

      const stats2 = await getCacheStats();
      expect(stats2.hits).toBe(1);
      expect(stats2.hitRate).toBe(50); // 1 hit, 1 miss
    });

    it('should support force refresh', async () => {
      const key = cacheKeys.team('alabama');
      let callCount = 0;

      await cached(
        key,
        async () => {
          callCount++;
          return computeTeamData('alabama');
        },
        CACHE_TTL.TEAM_PROFILE
      );

      const stats1 = await getCacheStats();
      expect(stats1.hits).toBe(0);

      // Force refresh should bypass cache and recompute
      await cached(
        key,
        async () => {
          callCount++;
          return computeTeamData('alabama');
        },
        CACHE_TTL.TEAM_PROFILE,
        { forceRefresh: true }
      );

      expect(callCount).toBe(2); // Recomputed
      const stats2 = await getCacheStats();
      expect(stats2.misses).toBe(2); // Both treated as misses
    });

    it('should support custom serialization', async () => {
      const key = 'custom-serialization';
      const obj = { nested: { value: 42 } };

      const result = await cached(
        key,
        async () => obj,
        CACHE_TTL.TEAM_PROFILE,
        {
          serialize: (data) => JSON.stringify(data),
          deserialize: (str) => {
            const parsed = JSON.parse(str);
            // Add deserialization logic if needed
            return parsed;
          },
        }
      );

      expect(result).toEqual(obj);

      // Second call should use cached value
      const result2 = await cached(
        key,
        async () => ({ nested: { value: 99 } }),
        CACHE_TTL.TEAM_PROFILE,
        {
          serialize: (data) => JSON.stringify(data),
          deserialize: (str) => JSON.parse(str),
        }
      );

      expect(result2.nested.value).toBe(42); // Still cached
    });

    it('should support tags for grouped invalidation', async () => {
      const key = cacheKeys.rankings(2024, 12, 'FBS');
      let callCount = 0;

      await cached(
        key,
        async () => {
          callCount++;
          return computeRankings(2024, 12, 'FBS');
        },
        CACHE_TTL.RANKINGS,
        {
          tags: [cacheTags.season(2024), cacheTags.week(2024, 12)],
        }
      );

      expect(callCount).toBe(1);

      // Cache hit
      await cached(
        key,
        async () => {
          callCount++;
          return computeRankings(2024, 12, 'FBS');
        },
        CACHE_TTL.RANKINGS,
        {
          tags: [cacheTags.season(2024), cacheTags.week(2024, 12)],
        }
      );

      expect(callCount).toBe(1); // Cached

      // Invalidate by tag
      await invalidateByTag(cacheTags.week(2024, 12));

      // Should recompute
      await cached(
        key,
        async () => {
          callCount++;
          return computeRankings(2024, 12, 'FBS');
        },
        CACHE_TTL.RANKINGS,
        {
          tags: [cacheTags.season(2024), cacheTags.week(2024, 12)],
        }
      );

      expect(callCount).toBe(2); // Recomputed after invalidation
    });

    it('should enable debug mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const key = 'debug-key';

      await cached(
        key,
        async () => ({ value: 1 }),
        CACHE_TTL.TEAM_PROFILE,
        { debug: true }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CACHE MISS]')
      );

      await cached(
        key,
        async () => ({ value: 1 }),
        CACHE_TTL.TEAM_PROFILE,
        { debug: true }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CACHE HIT]')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('cachedBatch()', () => {
    it('should cache multiple items', async () => {
      const ids = ['alabama', 'georgia', 'ohio-state'];
      let computeCallCount = 0;

      const result = await cachedBatch(
        'team:',
        ids,
        async (missing) => {
          computeCallCount++;
          return computeTeamsBatch(missing);
        },
        CACHE_TTL.TEAM_PROFILE
      );

      expect(computeCallCount).toBe(1);
      expect(result.size).toBe(3);
      expect(result.get('alabama')?.name).toBe('ALABAMA');
    });

    it('should hit cache on second call', async () => {
      const ids = ['alabama', 'georgia'];
      let computeCallCount = 0;

      await cachedBatch(
        'team:',
        ids,
        async (missing) => {
          computeCallCount++;
          return computeTeamsBatch(missing);
        },
        CACHE_TTL.TEAM_PROFILE
      );

      const result = await cachedBatch(
        'team:',
        ids,
        async (missing) => {
          computeCallCount++;
          return computeTeamsBatch(missing);
        },
        CACHE_TTL.TEAM_PROFILE
      );

      expect(computeCallCount).toBe(1); // Cached
      expect(result.size).toBe(2);
    });

    it('should compute only missing items', async () => {
      let computeCalls: string[][] = [];

      // First call: compute all
      await cachedBatch(
        'team:',
        ['alabama', 'georgia'],
        async (missing) => {
          computeCalls.push(missing);
          return computeTeamsBatch(missing);
        },
        CACHE_TTL.TEAM_PROFILE
      );

      // Second call: add new items
      await cachedBatch(
        'team:',
        ['alabama', 'georgia', 'ohio-state', 'texas'],
        async (missing) => {
          computeCalls.push(missing);
          return computeTeamsBatch(missing);
        },
        CACHE_TTL.TEAM_PROFILE
      );

      expect(computeCalls[0]).toEqual(['alabama', 'georgia']);
      expect(computeCalls[1]).toEqual(['ohio-state', 'texas']);
    });

    it('should track batch stats', async () => {
      const ids = ['a', 'b', 'c'];

      await cachedBatch(
        'item:',
        ids,
        async (missing) => computeTeamsBatch(missing),
        CACHE_TTL.TEAM_PROFILE
      );

      const stats1 = await getCacheStats();
      expect(stats1.misses).toBe(3);

      await cachedBatch(
        'item:',
        ids,
        async (missing) => computeTeamsBatch(missing),
        CACHE_TTL.TEAM_PROFILE
      );

      const stats2 = await getCacheStats();
      expect(stats2.hits).toBe(3);
    });
  });

  describe('invalidate()', () => {
    it('should remove single key', async () => {
      const key = cacheKeys.team('alabama');

      await cached(
        key,
        async () => computeTeamData('alabama'),
        CACHE_TTL.TEAM_PROFILE
      );

      const stats1 = await getCacheStats();
      expect(stats1.totalKeys).toBeGreaterThan(0);

      await invalidate(key);

      // Should recompute on next call
      let callCount = 0;
      await cached(
        key,
        async () => {
          callCount++;
          return computeTeamData('alabama');
        },
        CACHE_TTL.TEAM_PROFILE
      );

      expect(callCount).toBe(1); // Recomputed
    });
  });

  describe('invalidatePattern()', () => {
    it('should remove keys matching pattern', async () => {
      // Cache multiple team keys
      await cached(
        cacheKeys.team('alabama'),
        async () => computeTeamData('alabama'),
        CACHE_TTL.TEAM_PROFILE
      );

      await cached(
        cacheKeys.team('georgia'),
        async () => computeTeamData('georgia'),
        CACHE_TTL.TEAM_PROFILE
      );

      // Invalidate all team keys
      await invalidatePattern('team:*');

      // Both should recompute
      let callCount = 0;

      await cached(
        cacheKeys.team('alabama'),
        async () => {
          callCount++;
          return computeTeamData('alabama');
        },
        CACHE_TTL.TEAM_PROFILE
      );

      await cached(
        cacheKeys.team('georgia'),
        async () => {
          callCount++;
          return computeTeamData('georgia');
        },
        CACHE_TTL.TEAM_PROFILE
      );

      expect(callCount).toBe(2); // Both recomputed
    });
  });

  describe('invalidateByTag()', () => {
    it('should invalidate all keys with a tag', async () => {
      const tag = cacheTags.team('alabama');

      // Cache some keys with the tag
      await cached(
        cacheKeys.team('alabama'),
        async () => computeTeamData('alabama'),
        CACHE_TTL.TEAM_PROFILE,
        { tags: [tag] }
      );

      await cached(
        cacheKeys.teamGames('alabama', 2024),
        async () => [],
        CACHE_TTL.GAMES,
        { tags: [tag] }
      );

      // Invalidate by tag
      await invalidateByTag(tag);

      // Should recompute
      let callCount = 0;

      await cached(
        cacheKeys.team('alabama'),
        async () => {
          callCount++;
          return computeTeamData('alabama');
        },
        CACHE_TTL.TEAM_PROFILE,
        { tags: [tag] }
      );

      expect(callCount).toBe(1); // Recomputed
    });
  });

  describe('invalidateAll()', () => {
    it('should clear entire cache', async () => {
      // Populate cache
      await cached(
        'key1',
        async () => ({ v: 1 }),
        CACHE_TTL.TEAM_PROFILE
      );

      await cached(
        'key2',
        async () => ({ v: 2 }),
        CACHE_TTL.TEAM_PROFILE
      );

      // Clear all
      await invalidateAll();

      // Should recompute
      let callCount = 0;

      await cached(
        'key1',
        async () => {
          callCount++;
          return { v: 1 };
        },
        CACHE_TTL.TEAM_PROFILE
      );

      expect(callCount).toBe(1);
    });
  });

  describe('staleWhileRevalidate()', () => {
    it('should return cached value immediately', async () => {
      const key = 'expensive-sim';
      let callCount = 0;

      // Populate cache
      await staleWhileRevalidate(
        key,
        async () => {
          callCount++;
          await delay(200);
          return { simulationId: 1 };
        },
        CACHE_TTL.MATCHUP_SIM
      );

      expect(callCount).toBe(1);

      // Second call should be instant
      const start = Date.now();
      const result = await staleWhileRevalidate(
        key,
        async () => {
          callCount++;
          await delay(200);
          return { simulationId: 2 };
        },
        CACHE_TTL.MATCHUP_SIM,
        300
      );

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100); // Much faster than 200ms computation
      expect(result.simulationId).toBe(1); // Old value
    });

    it('should trigger background refresh for stale data', async () => {
      const key = 'stale-data';
      let values = [1, 2];
      let callCount = 0;

      // Cache initial value
      const result1 = await staleWhileRevalidate(
        key,
        async () => values[callCount++],
        100, // Very short TTL
        5 // Stale immediately
      );

      expect(result1).toBe(1);
      expect(callCount).toBe(1);

      // Wait for stale window to pass
      await delay(150);

      // Second call should return stale value and trigger refresh
      const result2 = await staleWhileRevalidate(
        key,
        async () => values[callCount++],
        100,
        5
      );

      expect(result2).toBe(1); // Still stale value
      expect(callCount).toBe(2); // Background refresh triggered

      // Wait for background refresh to complete
      await delay(100);

      // Third call should have fresh value
      const result3 = await staleWhileRevalidate(
        key,
        async () => values[callCount++],
        100,
        5
      );

      expect(result3).toBe(2); // Fresh value
    });
  });

  describe('warmCache()', () => {
    it('should preload multiple keys', async () => {
      const result = await warmCache([
        {
          key: cacheKeys.rankings(2024, 12, 'FBS'),
          computeFn: () => computeRankings(2024, 12, 'FBS'),
          ttl: CACHE_TTL.RANKINGS,
        },
        {
          key: cacheKeys.rankings(2024, 12, 'FCS'),
          computeFn: () => computeRankings(2024, 12, 'FCS'),
          ttl: CACHE_TTL.RANKINGS,
        },
      ]);

      expect(result.warmed).toBe(2);
      expect(result.failed).toBe(0);

      // Verify items are cached
      const stats = await getCacheStats();
      expect(stats.totalKeys).toBeGreaterThanOrEqual(2);
    });

    it('should measure warm duration', async () => {
      const result = await warmCache([
        {
          key: 'key1',
          computeFn: async () => {
            await delay(100);
            return { v: 1 };
          },
          ttl: CACHE_TTL.TEAM_PROFILE,
        },
      ]);

      expect(result.duration).toBeGreaterThanOrEqual(100);
    });

    it('should handle failures gracefully', async () => {
      const result = await warmCache([
        {
          key: 'good-key',
          computeFn: async () => ({ v: 1 }),
          ttl: CACHE_TTL.TEAM_PROFILE,
        },
        {
          key: 'bad-key',
          computeFn: async () => {
            throw new Error('Computation failed');
          },
          ttl: CACHE_TTL.TEAM_PROFILE,
        },
      ]);

      expect(result.warmed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].key).toBe('bad-key');
    });
  });

  describe('getCacheStats()', () => {
    it('should report hit rate', async () => {
      const key = 'stat-test';

      // 3 misses
      await cached(key, async () => 1, CACHE_TTL.TEAM_PROFILE, { forceRefresh: true });
      await cached(key, async () => 1, CACHE_TTL.TEAM_PROFILE, { forceRefresh: true });
      await cached(key, async () => 1, CACHE_TTL.TEAM_PROFILE, { forceRefresh: true });

      // 2 hits
      await cached(key, async () => 1, CACHE_TTL.TEAM_PROFILE);
      await cached(key, async () => 1, CACHE_TTL.TEAM_PROFILE);

      const stats = await getCacheStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(3);
      expect(stats.hitRate).toBe(40); // 2 / 5
    });

    it('should report memory usage', async () => {
      const stats = await getCacheStats();
      expect(stats.memoryUsage).toBeDefined();
      expect(typeof stats.memoryUsage).toBe('string');
    });
  });

  describe('Cache Key Utilities', () => {
    it('should generate consistent keys', () => {
      expect(cacheKeys.rankings(2024, 12, 'FBS')).toBe('rankings:2024:12:FBS');
      expect(cacheKeys.team('alabama')).toBe('team:alabama');
      expect(cacheKeys.teamGames('georgia', 2024)).toBe('team:georgia:games:2024');
      expect(cacheKeys.matchup('alabama', 'georgia', 10000)).toBe('matchup:alabama:georgia:10000');
      expect(cacheKeys.chaos(2024, 12)).toBe('chaos:2024:12');
    });

    it('should generate consistent tags', () => {
      expect(cacheTags.team('alabama')).toBe('tag:team:alabama');
      expect(cacheTags.season(2024)).toBe('tag:season:2024');
      expect(cacheTags.week(2024, 12)).toBe('tag:week:2024:12');
      expect(cacheTags.conference('sec')).toBe('tag:conference:sec');
      expect(cacheTags.live()).toBe('tag:live');
    });
  });
});
