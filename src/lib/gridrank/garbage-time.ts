/**
 * Garbage Time Filter
 *
 * Detects garbage time in games and reduces the weight of
 * margin of victory in rating calculations.
 *
 * Garbage time thresholds (research-backed, tighter than original):
 * Q2: |margin| > 26 points (was 38)
 * Q3: |margin| > 22 points (was 28)
 * Q4: |margin| > 16 points (was 22)
 * Q4 Late (<5 min): |margin| > 12 points (NEW)
 *
 * Division scaling (lower divisions have lower scoring):
 * FBS: 1.0x, FCS: 0.85x, D2: 0.75x, D3/NAIA: 0.70x
 */

// =============================================================================
// TYPES
// =============================================================================

export interface QuarterScores {
  homeScores: number[];
  awayScores: number[];
}

export interface GarbageTimeResult {
  /** Whether garbage time was detected */
  hasGarbageTime: boolean;
  /** Reduction factor (0.3 = heavily reduced, 1.0 = no reduction) */
  reductionFactor: number;
  /** Quarter-by-quarter analysis */
  quarterAnalysis: {
    quarter: number;
    homeScore: number;
    awayScore: number;
    margin: number;
    threshold: number;
    isGarbageTime: boolean;
  }[];
  /** Total points scored in garbage time */
  garbageTimePoints: {
    home: number;
    away: number;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Garbage time thresholds by quarter (tightened per SP+/FPI research).
 * Starters typically come out earlier than previously assumed.
 */
export const GARBAGE_TIME_THRESHOLDS: Record<number, { margin: number; weight: number }> = {
  1: { margin: Infinity, weight: 1.0 },     // No garbage time in Q1
  2: { margin: 26, weight: 0.25 },          // Was 38
  3: { margin: 22, weight: 0.20 },          // Was 28
  4: { margin: 16, weight: 0.15 },          // Was 22
};

/**
 * Q4 Late threshold: under 5 minutes remaining with a 12+ point lead.
 * At this point, outcomes are essentially random.
 */
export const Q4_LATE_THRESHOLD = { margin: 12, weight: 0.10 };

/**
 * Division-specific scaling for garbage time thresholds.
 * Lower divisions have lower scoring environments, so garbage time starts earlier.
 */
export function getDivisionGarbageScale(level: string): number {
  switch (level) {
    case 'FBS': return 1.0;
    case 'FCS': return 0.85;
    case 'D2':  return 0.75;
    default:    return 0.70; // D3, NAIA
  }
}

/**
 * Get the effective garbage time margin threshold for a quarter and division.
 */
export function getEffectiveThreshold(quarter: number, level: string = 'FBS'): number {
  const base = GARBAGE_TIME_THRESHOLDS[quarter];
  if (!base) return Infinity;
  return base.margin * getDivisionGarbageScale(level);
}

/**
 * More aggressive minimum (minimum weight)
 */
const MIN_REDUCTION_FACTOR = 0.10;

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect garbage time in a game
 * @param scores Quarter scores for both teams
 * @param level Division level for threshold scaling (default: FBS)
 * @returns Garbage time analysis
 */
export function detectGarbageTime(scores: QuarterScores, level: string = 'FBS'): GarbageTimeResult {
  const quarterAnalysis: GarbageTimeResult["quarterAnalysis"] = [];
  let totalWeight = 0;
  let garbageWeight = 0;
  let garbageTimeHomePoints = 0;
  let garbageTimeAwayPoints = 0;

  let homeRunning = 0;
  let awayRunning = 0;

  const numQuarters = Math.min(
    4,
    Math.max(scores.homeScores.length, scores.awayScores.length)
  );

  const divScale = getDivisionGarbageScale(level);

  for (let q = 1; q <= numQuarters; q++) {
    const homePoints = scores.homeScores[q - 1] ?? 0;
    const awayPoints = scores.awayScores[q - 1] ?? 0;

    homeRunning += homePoints;
    awayRunning += awayPoints;

    const margin = Math.abs(homeRunning - awayRunning);
    const thresholdEntry = GARBAGE_TIME_THRESHOLDS[q];
    const effectiveMargin = thresholdEntry.margin * divScale;
    const isGarbageTime = margin > effectiveMargin;

    totalWeight += 1;

    if (isGarbageTime) {
      garbageWeight += (1 - thresholdEntry.weight); // How much to reduce
      garbageTimeHomePoints += homePoints;
      garbageTimeAwayPoints += awayPoints;
    }

    quarterAnalysis.push({
      quarter: q,
      homeScore: homeRunning,
      awayScore: awayRunning,
      margin,
      threshold: effectiveMargin,
      isGarbageTime,
    });
  }

  // Calculate reduction factor based on weighted garbage time
  const garbageRatio = totalWeight > 0 ? garbageWeight / totalWeight : 0;
  const reductionFactor = Math.max(MIN_REDUCTION_FACTOR, 1 - garbageRatio);

  return {
    hasGarbageTime: garbageWeight > 0,
    reductionFactor,
    quarterAnalysis,
    garbageTimePoints: {
      home: garbageTimeHomePoints,
      away: garbageTimeAwayPoints,
    },
  };
}

/**
 * Estimate garbage time from final score only
 * Less accurate than quarter-by-quarter but useful when quarter data unavailable
 * @param finalHomeScore Final home score
 * @param finalAwayScore Final away score
 * @returns Estimated reduction factor
 */
export function estimateGarbageTimeFromFinal(
  finalHomeScore: number,
  finalAwayScore: number
): number {
  const margin = Math.abs(finalHomeScore - finalAwayScore);

  // Tighter thresholds matching our research-backed Q4 values
  if (margin > 35) {
    return 0.15; // Extreme blowout — almost all garbage time
  } else if (margin > 26) {
    return 0.25; // Heavy garbage time
  } else if (margin > 16) {
    return 0.50; // Moderate garbage time
  } else if (margin > 10) {
    return 0.75; // Light garbage time possible
  }

  return 1.0; // No reduction
}

/**
 * Calculate effective margin after garbage time reduction
 * @param homeScore Final home score
 * @param awayScore Final away score
 * @param reductionFactor Garbage time reduction factor
 * @returns Effective margin (home - away)
 */
export function calculateEffectiveMargin(
  homeScore: number,
  awayScore: number,
  reductionFactor: number
): number {
  const actualMargin = homeScore - awayScore;

  // Reduce margin towards 0 based on reduction factor
  // If factor is 0.5 and margin is 30, effective margin is 15
  return actualMargin * reductionFactor;
}

/**
 * Apply garbage time filter to margin of victory
 * @param margin Original margin of victory
 * @param scores Quarter scores (if available)
 * @returns Adjusted margin after garbage time filter
 */
export function applyGarbageTimeFilter(
  margin: number,
  scores?: QuarterScores
): number {
  if (scores) {
    const result = detectGarbageTime(scores);
    return calculateEffectiveMargin(
      margin > 0 ? margin + Math.abs(margin) : margin - Math.abs(margin),
      margin > 0 ? margin - Math.abs(margin) : 0,
      result.reductionFactor
    );
  }

  // Fallback to estimation
  const homeScore = margin > 0 ? margin + 50 : 50;
  const awayScore = margin > 0 ? 50 : 50 - margin;
  const reductionFactor = estimateGarbageTimeFromFinal(homeScore, awayScore);

  return margin * reductionFactor;
}

/**
 * Check if a game was dominated (one-sided throughout)
 * @param scores Quarter scores
 * @returns True if winning team led all 4 quarters
 */
export function isDominantWin(scores: QuarterScores): boolean {
  if (scores.homeScores.length < 4 || scores.awayScores.length < 4) {
    return false;
  }

  let homeLedAll = true;
  let awayLedAll = true;

  let homeRunning = 0;
  let awayRunning = 0;

  for (let q = 0; q < 4; q++) {
    homeRunning += scores.homeScores[q] ?? 0;
    awayRunning += scores.awayScores[q] ?? 0;

    if (homeRunning <= awayRunning) homeLedAll = false;
    if (awayRunning <= homeRunning) awayLedAll = false;
  }

  return homeLedAll || awayLedAll;
}

/**
 * Calculate comeback score
 * @param scores Quarter scores
 * @returns Comeback score (0-100, higher = bigger comeback)
 */
export function calculateComebackScore(scores: QuarterScores): number {
  if (scores.homeScores.length < 4 || scores.awayScores.length < 4) {
    return 0;
  }

  let homeRunning = 0;
  let awayRunning = 0;

  let maxHomeDeficit = 0;
  let maxAwayDeficit = 0;

  for (let q = 0; q < 4; q++) {
    const prevHome = homeRunning;
    const prevAway = awayRunning;

    homeRunning += scores.homeScores[q] ?? 0;
    awayRunning += scores.awayScores[q] ?? 0;

    const homeDeficit = prevAway - prevHome;
    const awayDeficit = prevHome - prevAway;

    if (homeDeficit > maxHomeDeficit) maxHomeDeficit = homeDeficit;
    if (awayDeficit > maxAwayDeficit) maxAwayDeficit = awayDeficit;
  }

  const winnerCameBack =
    homeRunning > awayRunning
      ? maxHomeDeficit
      : maxAwayDeficit;

  if (winnerCameBack <= 0) return 0;

  // Score based on deficit overcome (20+ point comeback = 100)
  return Math.min(100, (winnerCameBack / 20) * 100);
}

/**
 * Format garbage time result for display
 */
export function formatGarbageTimeResult(
  result: GarbageTimeResult
): string {
  if (!result.hasGarbageTime) {
    return "No garbage time";
  }

  const percentage = Math.round((1 - result.reductionFactor) * 100);
  return `${percentage}% garbage time (${result.garbageTimePoints.home + result.garbageTimePoints.away} pts)`;
}
