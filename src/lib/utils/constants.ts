/**
 * GridRank Algorithm Constants
 * Core configuration values for the Glicko-2 hybrid ranking system
 */

/** Level-based rating priors for GridRank initialization */
export const LEVEL_PRIORS = {
  FBS: { rating: 1500, rd: 250, volatility: 0.06 },
  FCS: { rating: 1200, rd: 280, volatility: 0.06 },
  D2: { rating: 1000, rd: 300, volatility: 0.06 },
  D3: { rating: 800, rd: 320, volatility: 0.06 },
  NAIA: { rating: 700, rd: 320, volatility: 0.06 },
} as const;

/**
 * Sub-tier priors for more accurate cross-level calibration.
 * Based on SP+ research: top FCS ≈ FBS #69, top D2 ≈ FCS #28.
 *
 * These provide more granular starting points within each division.
 * A team's sub-tier is determined by conference strength + prior year performance.
 */
export const SUB_TIER_PRIORS = {
  FBS_POWER_5:  { mu: 1580, rd: 200, sigma: 0.06 },
  FBS_GROUP_5:  { mu: 1420, rd: 230, sigma: 0.06 },
  FBS_BOTTOM:   { mu: 1350, rd: 250, sigma: 0.06 },
  FCS_TOP:      { mu: 1280, rd: 250, sigma: 0.06 },  // MVFC, CAA, Big Sky leaders
  FCS_MID:      { mu: 1200, rd: 280, sigma: 0.06 },
  FCS_BOTTOM:   { mu: 1100, rd: 300, sigma: 0.06 },
  D2:           { mu: 1000, rd: 300, sigma: 0.06 },
  D3:           { mu: 850,  rd: 320, sigma: 0.06 },
  NAIA:         { mu: 750,  rd: 320, sigma: 0.06 },
} as const;

/**
 * Power 5 conferences (post-2024 realignment).
 * Used to assign sub-tier priors.
 */
export const POWER_CONFERENCES = new Set([
  'SEC', 'Big Ten', 'Big 12', 'ACC',
]);

/**
 * Top FCS conferences (historically competitive, produce FBS-competitive teams).
 */
export const TOP_FCS_CONFERENCES = new Set([
  'Missouri Valley', 'Colonial', 'Big Sky', 'Southland',
]);

/**
 * Game points to rating points conversion factor.
 * 1 game point ≈ 5.6 rating points on the Glicko scale.
 */
export const GAME_POINTS_TO_RATING = 5.6;

/** Level identifiers */
export const LEVELS = {
  FBS: 'FBS',
  FCS: 'FCS',
  D2: 'D2',
  D3: 'D3',
  NAIA: 'NAIA',
} as const;

/** Garbage time thresholds by quarter (tightened per SP+/FPI research) */
export const GARBAGE_TIME_THRESHOLDS = {
  1: Infinity, // No garbage time in Q1
  2: 26,       // Was 38 — starters come out earlier than assumed
  3: 22,       // Was 28
  4: 16,       // Was 22
} as const;

/** Home-field advantage base (points) */
export const BASE_HFA = 2.5;

/** Preseason prior decay: weight per week (index 0 = preseason, SP+-inspired aggressive) */
export const PRIOR_DECAY = [
  0.70, 0.55, 0.40, 0.28, 0.18, 0.10, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03,
] as const;

/** GridRank display: multiply RD by this for 95% confidence interval */
export const CONFIDENCE_MULTIPLIER = 1.96;

/** Chaos Score component weights */
export const CHAOS_WEIGHTS = {
  spreadBustFactor: 0.25,
  winProbVolatility: 0.20,
  upsetMagnitude: 0.20,
  excitementIndex: 0.15,
  contextWeight: 0.10,
  postgameWpInversion: 0.10,
} as const;

/** CFBD API rate limit delay (ms) */
export const API_DELAY_MS = 500;

/** CFBD API v2 base URL */
export const CFBD_BASE_URL = 'https://apinext.collegefootballdata.com';

/** Cache TTLs in seconds */
export const CACHE_TTL = {
  RANKINGS: 3600,      // 1 hour
  TEAM_PAGE: 1800,     // 30 minutes
  GAMES: 600,          // 10 minutes
  PREDICTIONS: 1800,   // 30 minutes
  SENTIMENT: 7200,     // 2 hours
  CHAOS: 3600,         // 1 hour
} as const;

/** Season types for CFBD API */
export const SEASON_TYPES = {
  REGULAR: 'regular',
  POSTSEASON: 'postseason',
  BOWL: 'bowl',
} as const;

/**
 * Month (0-indexed) when the new season starts. August = 7.
 * Before this month, the "current season" is the previous calendar year.
 * Example: Jan 2026 → 2025 season, Aug 2025 → 2025 season.
 */
export const SEASON_START_MONTH = 7; // August (0-indexed)

/**
 * Get the current college football season year.
 *
 * A "season" spans from August of one year through January of the next.
 * The season is identified by the year it starts (the fall year).
 *   - Aug 2025 through Jan 2026 = the "2025 season"
 *   - Feb 2026 through Jul 2026 = offseason (most recent completed season: 2025)
 *
 * @param date Optional date to compute from (defaults to now)
 * @returns The season year (e.g., 2025)
 */
export function getCurrentSeason(date?: Date): number {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed: 0=Jan, 7=Aug
  return month >= SEASON_START_MONTH ? year : year - 1;
}

/**
 * Estimate the current week of the college football season.
 *
 * Regular season runs roughly Aug week 4 (week 0/1) through early Dec (week 14-15).
 * Postseason/bowls run mid-Dec through mid-Jan (week 15-17+).
 *
 * @param date Optional date to compute from (defaults to now)
 * @returns Approximate week number (0 = preseason, 1-15 = regular, 16+ = postseason)
 */
export function getCurrentSeasonWeek(date?: Date): number {
  const d = date ?? new Date();
  const month = d.getMonth(); // 0-indexed
  const day = d.getDate();

  // January: postseason / bowl season (weeks 16-17)
  if (month === 0) {
    return day <= 20 ? 17 : 0; // After Jan 20, season is over → preseason for next
  }

  // February through July: offseason (return 0 = preseason)
  if (month < SEASON_START_MONTH) {
    return 0;
  }

  // August: preseason / week 0-1
  if (month === 7) {
    return day >= 24 ? 1 : 0;
  }

  // September through December: regular season + postseason
  // Sept = weeks 1-4, Oct = 5-8, Nov = 9-13, Dec = 14-16
  const weekOffset = (month - 8) * 4 + Math.floor(day / 7);
  return Math.max(1, Math.min(weekOffset, 17));
}

/** GridLegacy component weights */
export const GRIDLEGACY_WEIGHTS = {
  peakPerformance: 0.25,
  consistency: 0.20,
  postseasonSuccess: 0.20,
  avgRating: 0.15,
  trendScore: 0.10,
  sosPremium: 0.10,
} as const;

/** Award prediction weights */
export const AWARD_WEIGHTS = {
  statistical: 0.40,
  teamSuccess: 0.25,
  narrative: 0.20,
  historical: 0.15,
} as const;

/** MCP (Monte Carlo) simulation settings */
export const MONTE_CARLO = {
  SIMULATIONS: 10_000,
  CONFIDENCE_INTERVAL: 0.8, // 80% confidence interval
} as const;

/** Rivalry significance tiers */
export const RIVALRY_TIERS = {
  LEGENDARY: 1,
  MAJOR: 2,
  NOTABLE: 3,
} as const;
