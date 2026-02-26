/**
 * Five Factors Integration — Bill Connelly's SP+ Factors
 *
 * The Five Factors are the most predictive team-level stats in college football:
 * 1. Efficiency (Success Rate) — 83% of teams with higher SR win
 * 2. Explosiveness (Isolated PPP) — 86% correlation with wins
 * 3. Field Position — Average starting yard line, 72% correlation
 * 4. Finishing Drives — Points per trip inside opponent's 40, 75% correlation
 * 5. Turnovers — Net turnovers, 73% correlation (BUT least stable, R²≈0.01)
 *
 * This module computes z-scores for each factor, creates a composite,
 * and blends it with Glicko-2 ratings as the season progresses.
 *
 * CONDITIONAL: Only works if CFBD API provides play-level or drive-level data.
 * Check homeEpa, awayEpa, homeSuccessRate, awaySuccessRate fields in Game table.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface FiveFactorsInput {
  /** Offensive success rate (0-1) */
  offSuccessRate: number;
  /** Defensive success rate allowed (0-1, lower is better) */
  defSuccessRate: number;
  /** Offensive explosiveness (IsoPPP — isolated points per play) */
  offExplosiveness: number;
  /** Defensive explosiveness allowed */
  defExplosiveness: number;
  /** Average starting field position (yard line, 0-100) */
  avgFieldPosition: number;
  /** Points per trip inside opponent's 40 */
  finishingDrives: number;
  /** Net turnovers (positive = more takeaways than giveaways) */
  netTurnovers: number;
  /** Games played (for reliability weighting) */
  gamesPlayed: number;
}

export interface FiveFactorsResult {
  /** Composite z-score (positive = above average) */
  compositeZScore: number;
  /** Rating point adjustment (±30 max) */
  ratingAdjustment: number;
  /** Individual factor z-scores */
  factors: {
    efficiency: number;
    explosiveness: number;
    fieldPosition: number;
    finishingDrives: number;
    turnovers: number;
  };
  /** Blend weight for this week (0-0.20) */
  blendWeight: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Factor weights in the composite score.
 * Based on correlation with winning and predictive stability.
 */
const FACTOR_WEIGHTS = {
  efficiency: 0.35,      // Most predictive + most stable
  explosiveness: 0.25,   // Highly correlated with wins
  finishingDrives: 0.15, // Important but noisier
  fieldPosition: 0.15,   // Solid correlation
  turnovers: 0.10,       // Least stable year-to-year (R²≈0.01)
} as const;

/**
 * FBS averages for z-score calculation (approximate 2024 values).
 * These should ideally be computed from the season's data.
 */
const FBS_AVERAGES = {
  successRate: { mean: 0.42, stdDev: 0.05 },
  explosiveness: { mean: 1.30, stdDev: 0.15 },
  fieldPosition: { mean: 30, stdDev: 4 },
  finishingDrives: { mean: 4.5, stdDev: 1.2 },
  netTurnovers: { mean: 0, stdDev: 5 },
} as const;

/**
 * Maximum rating point adjustment from Five Factors.
 * Prevents wild swings from this secondary signal.
 */
const MAX_ADJUSTMENT = 30;

/**
 * Maximum blend weight (reached by week 13).
 * Five Factors never dominate — they're a secondary refinement.
 */
const MAX_BLEND_WEIGHT = 0.20;

// =============================================================================
// SUCCESS RATE DEFINITION
// =============================================================================

/**
 * Determine if a play is "successful" per SP+ definition.
 *
 * A play is successful if it gains:
 * - 1st down: ≥50% of needed yards
 * - 2nd down: ≥70% of needed yards
 * - 3rd/4th down: ≥100% of needed yards (first down or TD)
 *
 * @param down Current down (1-4)
 * @param distance Yards to go
 * @param yardsGained Yards gained on the play
 * @returns Whether the play was successful
 */
export function isSuccessfulPlay(
  down: number,
  distance: number,
  yardsGained: number
): boolean {
  switch (down) {
    case 1: return yardsGained >= distance * 0.50;
    case 2: return yardsGained >= distance * 0.70;
    case 3:
    case 4: return yardsGained >= distance;
    default: return false;
  }
}

// =============================================================================
// Z-SCORE CALCULATIONS
// =============================================================================

/**
 * Calculate z-score for a stat relative to FBS averages.
 */
function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Calculate efficiency z-score (offense minus defense).
 * Higher offensive SR and lower defensive SR = better.
 */
function efficiencyZScore(offSR: number, defSR: number): number {
  const offZ = zScore(offSR, FBS_AVERAGES.successRate.mean, FBS_AVERAGES.successRate.stdDev);
  const defZ = zScore(defSR, FBS_AVERAGES.successRate.mean, FBS_AVERAGES.successRate.stdDev);
  // Offense above average = good, defense below average = good
  return offZ - defZ;
}

/**
 * Calculate explosiveness z-score (offense minus defense).
 */
function explosivenessZScore(offExp: number, defExp: number): number {
  const offZ = zScore(offExp, FBS_AVERAGES.explosiveness.mean, FBS_AVERAGES.explosiveness.stdDev);
  const defZ = zScore(defExp, FBS_AVERAGES.explosiveness.mean, FBS_AVERAGES.explosiveness.stdDev);
  return offZ - defZ;
}

/**
 * Calculate field position z-score.
 * Higher average starting position = better.
 */
function fieldPositionZScore(avgFP: number): number {
  return zScore(avgFP, FBS_AVERAGES.fieldPosition.mean, FBS_AVERAGES.fieldPosition.stdDev);
}

/**
 * Calculate finishing drives z-score.
 * More points per trip inside 40 = better.
 */
function finishingDrivesZScore(ppTrip: number): number {
  return zScore(ppTrip, FBS_AVERAGES.finishingDrives.mean, FBS_AVERAGES.finishingDrives.stdDev);
}

/**
 * Calculate turnover z-score.
 * More net turnovers (takeaways > giveaways) = better.
 */
function turnoverZScore(netTO: number): number {
  return zScore(netTO, FBS_AVERAGES.netTurnovers.mean, FBS_AVERAGES.netTurnovers.stdDev);
}

// =============================================================================
// COMPOSITE & BLEND
// =============================================================================

/**
 * Compute Five Factors composite and rating adjustment.
 *
 * @param input Five factor statistics for a team
 * @param week Current week of the season
 * @returns Composite result with rating adjustment
 */
export function computeFiveFactors(
  input: FiveFactorsInput,
  week: number
): FiveFactorsResult {
  // Calculate individual factor z-scores
  const efficiency = efficiencyZScore(input.offSuccessRate, input.defSuccessRate);
  const explosiveness = explosivenessZScore(input.offExplosiveness, input.defExplosiveness);
  const fieldPosition = fieldPositionZScore(input.avgFieldPosition);
  const finishingDrives = finishingDrivesZScore(input.finishingDrives);
  const turnovers = turnoverZScore(input.netTurnovers);

  // Weighted composite z-score
  const compositeZScore =
    efficiency * FACTOR_WEIGHTS.efficiency +
    explosiveness * FACTOR_WEIGHTS.explosiveness +
    fieldPosition * FACTOR_WEIGHTS.fieldPosition +
    finishingDrives * FACTOR_WEIGHTS.finishingDrives +
    turnovers * FACTOR_WEIGHTS.turnovers;

  // Scale composite to rating point adjustment (capped at ±MAX_ADJUSTMENT)
  // A composite z-score of ±2 maps to ±MAX_ADJUSTMENT
  const rawAdjustment = compositeZScore * (MAX_ADJUSTMENT / 2);
  const ratingAdjustment = Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, rawAdjustment));

  // Blend weight increases through the season (more data = more trust)
  // 0% at week 0 → 20% by week 13
  const blendWeight = Math.min(MAX_BLEND_WEIGHT, week * 0.015);

  // Reliability discount: fewer games = less trust
  const reliabilityFactor = Math.min(1, input.gamesPlayed / 6);

  return {
    compositeZScore,
    ratingAdjustment: ratingAdjustment * reliabilityFactor,
    factors: {
      efficiency,
      explosiveness,
      fieldPosition,
      finishingDrives,
      turnovers,
    },
    blendWeight,
  };
}

/**
 * Apply Five Factors adjustment to a Glicko-2 rating.
 *
 * @param glickoRating Current Glicko-2 rating (μ)
 * @param fiveFactors Five Factors computation result
 * @returns Adjusted rating blending Glicko-2 with Five Factors
 */
export function applyFiveFactorsBlend(
  glickoRating: number,
  fiveFactors: FiveFactorsResult
): number {
  const w = fiveFactors.blendWeight;

  // Blend: (1-w) * pure Glicko + w * (Glicko + Five Factors adjustment)
  // This keeps Glicko as the foundation and uses Five Factors as a refinement
  return glickoRating * (1 - w) + (glickoRating + fiveFactors.ratingAdjustment) * w;
}

/**
 * Compute dynamic FBS averages from actual season data.
 * Call this at the start of each week's computation to update baselines.
 *
 * @param teamStats Array of all teams' five factor stats
 * @returns Updated averages for z-score computation
 */
export function computeSeasonAverages(
  teamStats: FiveFactorsInput[]
): { [K in keyof typeof FBS_AVERAGES]: { mean: number; stdDev: number } } {
  if (teamStats.length === 0) return FBS_AVERAGES;

  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const stdDev = (arr: number[], m: number) =>
    Math.sqrt(arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length) || 1;

  const srs = teamStats.map(t => (t.offSuccessRate + (1 - t.defSuccessRate)) / 2);
  const exps = teamStats.map(t => t.offExplosiveness - t.defExplosiveness);
  const fps = teamStats.map(t => t.avgFieldPosition);
  const fds = teamStats.map(t => t.finishingDrives);
  const tos = teamStats.map(t => t.netTurnovers);

  const srMean = mean(srs);
  const expMean = mean(exps);
  const fpMean = mean(fps);
  const fdMean = mean(fds);
  const toMean = mean(tos);

  return {
    successRate: { mean: srMean, stdDev: stdDev(srs, srMean) },
    explosiveness: { mean: expMean, stdDev: stdDev(exps, expMean) },
    fieldPosition: { mean: fpMean, stdDev: stdDev(fps, fpMean) },
    finishingDrives: { mean: fdMean, stdDev: stdDev(fds, fdMean) },
    netTurnovers: { mean: toMean, stdDev: stdDev(tos, toMean) },
  };
}
