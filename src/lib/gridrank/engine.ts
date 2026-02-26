/**
 * GridRank Engine — Glicko-2 Hybrid with Margin of Victory
 *
 * Based on the Glicko-2 rating system with extensions:
 * - Margin of Victory multiplier
 * - Home field advantage
 * - Garbage time filtering
 * - Cross-level adjustments
 *
 * References:
 * - Glickman, M. (2013). "Glicko-2 Rating System"
 * - Pomeroy, K. "Efficiency Margin" concepts
 */

import { type PrismaClient } from "@prisma/client";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface TeamRating {
  /** Team database ID */
  teamId: number;
  /** Current rating (μ) - team strength on FBS ~1500 scale */
  mu: number;
  /** Rating deviation (RD) - uncertainty in rating */
  rd: number;
  /** Volatility (σ) - performance consistency */
  sigma: number;
  /** Level for cross-level adjustments */
  level: "FBS" | "FCS" | "D2" | "D3" | "NAIA";
}

export interface GameResult {
  /** Home team rating */
  homeRating: TeamRating;
  /** Away team rating */
  awayRating: TeamRating;
  /** Home score (null if not played) */
  homeScore: number | null;
  /** Away score (null if not played) */
  awayScore: number | null;
  /** Whether game was at neutral site */
  isNeutralSite: boolean;
  /** Is this a postseason game? */
  isPostseason: boolean;
  /** Quarter-by-quarter scores for garbage time detection */
  homeLineScores?: number[];
  awayLineScores?: number[];
  /** Stadium metadata for HFA calculation */
  stadium?: {
    elevation?: number;
    capacity?: number;
    dome?: boolean;
  };
  /** Distance traveled (miles) - for HFA calculation */
  travelDistance?: number;
}

export interface RatingUpdateResult {
  /** Updated home team rating */
  homeRating: TeamRating;
  /** Updated away team rating */
  awayRating: TeamRating;
  /** Expected outcome (0-1, where 0.5 = even matchup) */
  expectedOutcome: number;
  /** Actual outcome after MOV compression */
  actualOutcome: number;
  /** Garbage time reduction factor (0-1) */
  garbageTimeFactor: number;
  /** Home field advantage applied */
  homeFieldAdvantage: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Initial rating parameters by level
 */
export const INITIAL_RATINGS: Record<
  string,
  { mu: number; rd: number; sigma: number }
> = {
  FBS: { mu: 1500, rd: 250, sigma: 0.06 },
  FCS: { mu: 1200, rd: 280, sigma: 0.06 },
  D2: { mu: 1000, rd: 300, sigma: 0.06 },
  D3: { mu: 800, rd: 320, sigma: 0.06 },
  NAIA: { mu: 700, rd: 320, sigma: 0.06 },
};

/**
 * Glicko-2 system constants
 */
const GLICKO2 = {
  // Convergence tolerance
  TOLERANCE: 0.0001,
  // Volatility change limit
  VOLATILITY_CHANGE_LIMIT: 0.5,
  // Initial sigma
  INITIAL_SIGMA: 0.06,
  // System constant controlling sigma changes
  TAU: 0.5,
} as const;

/**
 * Garbage time thresholds by quarter (absolute margin)
 */
const GARBAGE_TIME_THRESHOLDS = [0, 38, 28, 22] as const; // [Q1, Q2, Q3, Q4]

/**
 * Cross-level margin dampening factors
 * Reduces blowout margin signal for mismatched levels (FBS beating NAIA by 70 shouldn't move ratings much)
 */
const CROSS_LEVEL_MARGIN_DAMPENING: Record<string, number> = {
  // Keys are sorted alphabetically (as produced by .sort().join("-"))
  "D2-FBS": 0.7,     // FBS vs D2
  "D3-FBS": 0.5,     // FBS vs D3
  "FBS-NAIA": 0.4,   // FBS vs NAIA
  "FBS-FCS": 0.85,   // FBS vs FCS
  "D2-FCS": 0.85,    // FCS vs D2
  "D3-FCS": 0.7,     // FCS vs D3
  "FCS-NAIA": 0.6,   // FCS vs NAIA
  "D2-D3": 0.85,     // D2 vs D3
  "D2-NAIA": 0.7,    // D2 vs NAIA
  "D3-NAIA": 0.85,   // D3 vs NAIA
};

/**
 * Cross-level game weight multipliers
 * These games are our ONLY calibration bridges between divisions.
 * Adjacent levels get 1.3x weight, non-adjacent get 1.5x.
 */
const CROSS_LEVEL_WEIGHT: Record<string, number> = {
  // Keys are sorted alphabetically (as produced by .sort().join("-"))
  "FBS-FCS": 1.3,    // Adjacent: FBS-FCS
  "D2-FBS": 1.5,     // Non-adjacent: FBS-D2
  "D3-FBS": 1.5,     // Non-adjacent: FBS-D3
  "FBS-NAIA": 1.5,   // Non-adjacent: FBS-NAIA
  "D2-FCS": 1.3,     // Adjacent: FCS-D2
  "D3-FCS": 1.5,     // Non-adjacent: FCS-D3
  "FCS-NAIA": 1.5,   // Non-adjacent: FCS-NAIA
  "D2-D3": 1.3,      // Adjacent: D2-D3
  "D2-NAIA": 1.5,    // Non-adjacent: D2-NAIA
  "D3-NAIA": 1.3,    // Adjacent: D3-NAIA
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate expected outcome using logistic function
 * @param rating1 Home team rating
 * @param rating2 Away team rating
 * @param homeFieldAdvantage Points to add to home team
 * @returns Expected score for home team (0-1)
 */
export function expectedOutcome(
  rating1: number,
  rating2: number,
  homeFieldAdvantage: number = 0
): number {
  // Convert rating difference to expected outcome
  // Rating difference of ~400 points = 90% win probability
  const adjustedDiff = rating1 + homeFieldAdvantage - rating2;
  return 1 / (1 + Math.exp(-adjustedDiff / 173.7178));
}

/**
 * FiveThirtyEight-style margin multiplier with autocorrelation correction.
 *
 * The key insight: if a team rated 300 points higher wins by 21, that's EXPECTED.
 * Only margin BEYOND what ratings predict should update ratings significantly.
 * Without this correction, strong teams get over-rewarded for beating weak teams.
 *
 * @param margin Absolute point margin
 * @param ratingDiff Winner's rating minus loser's rating (can be negative if underdog won)
 * @returns Multiplier for the K-factor (typically 0.5 to 2.5)
 */
export function marginMultiplier(margin: number, ratingDiff: number): number {
  // Log compression of margin (diminishing returns for blowouts)
  const logMargin = Math.log(Math.abs(margin) + 1);

  // Autocorrelation correction: expected margin dampens the multiplier
  // If ratingDiff predicts a 20-point win and you win by 20, multiplier ≈ 1.0
  // If you win by 40 (20 more than expected), multiplier > 1.0
  // The 2.2 constant controls how quickly the correction kicks in
  const correction = 2.2 / (Math.max(0, ratingDiff) * 0.001 + 2.2);

  return logMargin * correction;
}

/**
 * @deprecated Use marginMultiplier() instead. Kept for backward compatibility.
 */
export function compressMargin(margin: number): number {
  const sign = Math.sign(margin) || 1;
  const absMargin = Math.abs(margin);
  return sign * Math.log(1 + absMargin / 3);
}

/**
 * @deprecated Use marginMultiplier() instead. Kept for backward compatibility.
 */
export function compressedMarginToOutcome(compressedMargin: number): number {
  return 0.5 + 0.5 * Math.tanh(compressedMargin / 15);
}

/**
 * Detect garbage time and calculate reduction factor
 * @param homeLineScores Home team quarter scores
 * @param awayLineScores Away team quarter scores
 * @returns Reduction factor (1 = no garbage time, 0.3 = significant garbage time)
 */
export function calculateGarbageTimeFactor(
  homeLineScores: number[] | undefined,
  awayLineScores: number[] | undefined
): number {
  if (!homeLineScores || !awayLineScores || homeLineScores.length < 4) {
    return 1; // No quarter-by-quarter data
  }

  let garbageTimePlays = 0;
  let totalPlays = 0;

  let homeRunning = 0;
  let awayRunning = 0;

  for (let quarter = 0; quarter < 4; quarter++) {
    homeRunning += homeLineScores[quarter] || 0;
    awayRunning += awayLineScores[quarter] || 0;

    const margin = Math.abs(homeRunning - awayRunning);
    const threshold = GARBAGE_TIME_THRESHOLDS[quarter];

    totalPlays++;

    if (margin > threshold) {
      garbageTimePlays++;
    }
  }

  if (totalPlays === 0) return 1;

  // Garbage time factor: reduce weight by proportion of game in garbage time
  // Minimum 0.3, maximum 1.0
  const garbageRatio = garbageTimePlays / totalPlays;
  return Math.max(0.3, 1 - 0.7 * garbageRatio);
}

/**
 * Calculate dynamic home field advantage
 * Base 2.5 points plus modifiers for:
 * - Travel distance
 * - Altitude difference
 * - Stadium capacity (crowd noise)
 * - Dome/indoor
 *
 * @param game Game result data
 * @returns Home field advantage in rating points
 */
export function calculateHomeFieldAdvantage(game: GameResult): number {
  let hfa = 2.5; // Base HFA

  if (game.isNeutralSite) {
    return 0;
  }

  // Travel distance factor (up to +3 points for long travel)
  if (game.travelDistance && game.travelDistance > 200) {
    const travelBonus = Math.min(3, (game.travelDistance - 200) / 500);
    hfa += travelBonus;
  }

  // Altitude factor (up to +2 points for significant elevation)
  if (game.stadium?.elevation && game.stadium.elevation > 2000) {
    const altitudeBonus = Math.min(2, (game.stadium.elevation - 2000) / 2000);
    hfa += altitudeBonus;
  }

  // Dome factor (reduces HFA)
  if (game.stadium?.dome) {
    hfa *= 0.7;
  }

  // Stadium capacity (larger crowd = more HFA, up to +1.5 points)
  if (game.stadium?.capacity && game.stadium.capacity > 50000) {
    const crowdBonus = Math.min(1.5, (game.stadium.capacity - 50000) / 50000);
    hfa += crowdBonus;
  }

  // Postseason games have reduced HFA (neutral-ish)
  if (game.isPostseason) {
    hfa *= 0.5;
  }

  return hfa;
}

/**
 * Get cross-level margin dampening factor
 * @param level1 Home team level
 * @param level2 Away team level
 * @returns Dampening factor (0-1, lower = more dampening)
 */
export function getCrossLevelAdjustment(
  level1: string,
  level2: string
): number {
  if (level1 === level2) return 1;
  const key = [level1, level2].sort().join("-");
  return CROSS_LEVEL_MARGIN_DAMPENING[key] ?? 1;
}

/**
 * Get cross-level game weight multiplier
 * Cross-level games are calibration bridges and get higher weight.
 * @param level1 Home team level
 * @param level2 Away team level
 * @returns Weight multiplier (1.0 for same level, 1.3-1.5 for cross-level)
 */
export function getCrossLevelWeight(
  level1: string,
  level2: string
): number {
  if (level1 === level2) return 1;
  const key = [level1, level2].sort().join("-");
  return CROSS_LEVEL_WEIGHT[key] ?? 1;
}

// =============================================================================
// GLICKO-2 CORE FUNCTIONS
// =============================================================================

/**
 * Convert rating to Glicko-2 scale
 */
function toGlicko2Scale(mu: number, rd: number): { phi: number; mu: number } {
  return {
    phi: rd / 173.7178,
    mu: (mu - 1500) / 173.7178,
  };
}

/**
 * Convert from Glicko-2 scale
 */
function fromGlicko2Scale(phi: number, mu: number): { rd: number; mu: number } {
  return {
    rd: phi * 173.7178,
    mu: mu * 173.7178 + 1500,
  };
}

/**
 * Compute v (variance) for a single game
 */
function computeV(
  mu: number,
  phi: number,
  opponentMu: number,
  opponentPhi: number,
  outcome: number
): number {
  const expected = expectedOutcome(
    mu * 173.7178 + 1500,
    opponentMu * 173.7178 + 1500
  );
  const g = 1 / Math.sqrt(1 + 3 * expected * (1 - expected) * phi * phi / (Math.PI * Math.PI));
  return g * g * expected * (1 - expected);
}

/**
 * Update ratings using Glicko-2 algorithm with FiveThirtyEight MOV extension
 */
export function updateRatings(
  homeRating: TeamRating,
  awayRating: TeamRating,
  game: GameResult
): RatingUpdateResult {
  // Calculate home field advantage
  const homeFieldAdvantage = calculateHomeFieldAdvantage(game);

  // Calculate garbage time factor
  const garbageTimeFactor = calculateGarbageTimeFactor(
    game.homeLineScores,
    game.awayLineScores
  );

  // Get expected outcome
  const expected = expectedOutcome(
    homeRating.mu,
    awayRating.mu,
    homeFieldAdvantage
  );

  // Determine actual outcome and margin
  let actualOutcome = 0.5;
  let movMultiplier = 1.0;

  if (game.homeScore !== null && game.awayScore !== null) {
    const margin = game.homeScore - game.awayScore;
    actualOutcome = margin > 0 ? 1.0 : margin < 0 ? 0.0 : 0.5;

    // FiveThirtyEight-style MOV multiplier with autocorrelation correction
    const winnerRating = margin > 0 ? homeRating.mu : awayRating.mu;
    const loserRating = margin > 0 ? awayRating.mu : homeRating.mu;
    movMultiplier = marginMultiplier(margin, winnerRating - loserRating);
  }

  // Apply cross-level margin dampening
  const crossLevelDampening = getCrossLevelAdjustment(
    homeRating.level,
    awayRating.level
  );

  // Apply cross-level game weight (calibration bridge bonus)
  const crossLevelWeight = getCrossLevelWeight(
    homeRating.level,
    awayRating.level
  );

  // Increase RD before the game to account for uncertainty
  const rdHome = Math.sqrt(homeRating.rd * homeRating.rd + 25);
  const rdAway = Math.sqrt(awayRating.rd * awayRating.rd + 25);

  // K factor based on RD (more uncertain ratings move more)
  const kHome = Math.max(20, Math.min(50, rdHome * 0.15));
  const kAway = Math.max(20, Math.min(50, rdAway * 0.15));

  // Scale K-factor by MOV multiplier, garbage time, cross-level factors
  const effectiveKHome = kHome * movMultiplier * garbageTimeFactor * crossLevelDampening * crossLevelWeight;
  const effectiveKAway = kAway * movMultiplier * garbageTimeFactor * crossLevelDampening * crossLevelWeight;

  // Update ratings (pure win/loss outcome, scaled by effective K)
  const newHomeMu = homeRating.mu + effectiveKHome * (actualOutcome - expected);
  const newAwayMu = awayRating.mu + effectiveKAway * ((1 - actualOutcome) - (1 - expected));

  // Update RD (decrease when playing, but bounded)
  const rdDecreaseFactor = 1 - Math.abs(actualOutcome - expected) * 0.5;
  const newHomeRd = Math.max(50, homeRating.rd * rdDecreaseFactor);
  const newAwayRd = Math.max(50, awayRating.rd * rdDecreaseFactor);

  return {
    homeRating: {
      ...homeRating,
      mu: newHomeMu,
      rd: newHomeRd,
    },
    awayRating: {
      ...awayRating,
      mu: newAwayMu,
      rd: newAwayRd,
    },
    expectedOutcome: expected,
    actualOutcome,
    garbageTimeFactor,
    homeFieldAdvantage,
  };
}

/**
 * Initialize a new rating for a team
 */
export function initializeRating(
  level: "FBS" | "FCS" | "D2" | "D3" | "NAIA"
): Omit<TeamRating, "teamId"> {
  const initial = INITIAL_RATINGS[level] || INITIAL_RATINGS.FCS;
  return {
    mu: initial.mu,
    rd: initial.rd,
    sigma: initial.sigma,
    level,
  };
}

/**
 * Adjust RD based on cross-level game connectivity.
 * Teams with zero cross-level games have more uncertainty about their
 * position in the unified ranking.
 *
 * @param rating Team rating
 * @param crossLevelGamesPlayed Number of cross-level games this season
 * @returns Adjusted rating with modified RD
 */
export function adjustRdForConnectivity(
  rating: TeamRating,
  crossLevelGamesPlayed: number
): TeamRating {
  if (crossLevelGamesPlayed >= 2) {
    return rating; // Well-connected, no adjustment
  }

  // 0 cross-level games: 30% more uncertain
  // 1 cross-level game: 15% more uncertain
  const uncertaintyMultiplier = crossLevelGamesPlayed === 0 ? 1.3 : 1.15;

  return {
    ...rating,
    rd: Math.min(350, rating.rd * uncertaintyMultiplier),
  };
}

/**
 * Get rating confidence interval for display
 * @param rating Team rating
 * @returns Rating with 95% confidence interval (e.g., "1523 ± 47")
 */
export function formatRating(rating: TeamRating): string {
  const ci = rating.rd * 1.96;
  return `${Math.round(rating.mu)} ± ${Math.round(ci)}`;
}

/**
 * Calculate rating percentile (for cross-level comparison)
 * @param rating Team rating
 * @param level Team's level
 * @returns Percentile (0-100)
 */
export function calculatePercentile(
  rating: TeamRating,
  level: string
): number {
  const initial = INITIAL_RATINGS[level] || INITIAL_RATINGS.FCS;
  const diff = rating.mu - initial.mu;
  // Approximate: 1 SD = 200 rating points
  const percentile = 50 + (diff / 200) * 34;
  return Math.max(0, Math.min(100, percentile));
}
