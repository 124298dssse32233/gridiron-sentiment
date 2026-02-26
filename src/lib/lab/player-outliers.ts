/**
 * Player Outlier Detection Engine
 * Statistical identification of exceptional individual player performances
 * across all positions and divisions.
 *
 * Uses Z-score and IQR methods to detect statistical anomalies:
 * - Outliers: |z| > 2.0 (top/bottom ~2.3%)
 * - Elite: |z| > 2.5 (top/bottom ~0.6%)
 * - Historic: |z| > 3.0 (top/bottom ~0.1%)
 *
 * Position-specific composite scores weight key stats appropriately.
 * Breakout detection identifies year-over-year improvements.
 */

import type { Position } from "@/types/player";

/**
 * Base player season statistics interface
 */
export interface PlayerSeasonStats {
  /** Player ID from database */
  playerId: number;
  /** Player name */
  playerName: string;
  /** Team name */
  team: string;
  /** Position on field */
  position: Position;
  /** Season year (e.g., 2024) */
  season: number;
  /** Games played */
  games: number;
  /** Flexible stat map for any available statistic */
  stats: Record<string, number>;
}

/**
 * Options for outlier detection algorithm
 */
export interface OutlierOptions {
  /** Detection method: z-score, IQR, or both */
  method?: "zscore" | "iqr" | "both";
  /** Z-score threshold for outliers (default 2.0) */
  threshold?: number;
  /** Minimum games played to qualify */
  minGames?: number;
  /** Filter by specific positions */
  positions?: Position[];
  /** Filter by division level */
  level?: string;
}

/**
 * Statistical breakdown of a single stat for a player
 */
export interface StatOutlier {
  /** Stat name (e.g., "EPA per play") */
  stat: string;
  /** Actual value of the stat */
  value: number;
  /** Z-score (standard deviations from mean) */
  zScore: number;
  /** Percentile ranking (0-100) */
  percentile: number;
  /** True if above mean (positive outlier) */
  isPositiveOutlier: boolean;
}

/**
 * Composite score breakdown with weighted components
 */
export interface CompositeScore {
  /** Overall composite score */
  score: number;
  /** Breakdown of each weighted component */
  breakdown: Array<{
    /** Stat name */
    stat: string;
    /** Raw value */
    value: number;
    /** Weight in composite (0-1) */
    weight: number;
    /** Z-score of this component */
    zScore: number;
  }>;
}

/**
 * Year-over-year breakout analysis
 */
export interface BreakoutAnalysis {
  /** Current season stats */
  player: PlayerSeasonStats;
  /** Previous season composite score */
  previousComposite: number;
  /** Current season composite score */
  currentComposite: number;
  /** Improvement as percentage */
  improvement: number;
  /** True if improvement > 30% */
  isBreakout: boolean;
  /** Key stats that improved */
  keyImprovements: string[];
}

/**
 * Statistical distribution profile for historical comparison
 */
export interface StatDistribution {
  /** Stat name */
  stat: string;
  /** Mean value */
  mean: number;
  /** Standard deviation */
  stddev: number;
  /** Median value */
  median: number;
  /** 25th percentile */
  q1: number;
  /** 75th percentile */
  q3: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Sample size */
  n: number;
}

/**
 * Historical comparison results
 */
export interface HistoricalComparison {
  /** Current season value */
  currentValue: number;
  /** Historical mean */
  historicalMean: number;
  /** Historical z-score */
  historicalZScore: number;
  /** How many players in history had this value or better */
  historicalRank: number;
  /** Percentile in historical distribution */
  historicalPercentile: number;
  /** Whether this is historically exceptional */
  isHistoricPerformance: boolean;
}

/**
 * Position-specific outlier summary
 */
export interface PositionOutlierSummary {
  /** Position abbreviation */
  position: Position;
  /** Total players at position */
  totalPlayers: number;
  /** Players identified as outliers */
  outlierCount: number;
  /** Elite-tier players (|z| > 2.5) */
  eliteCount: number;
  /** Historic-tier players (|z| > 3.0) */
  historicCount: number;
  /** Key outlier names */
  topOutliers: string[];
}

/**
 * Single player outlier entry in report
 */
export interface PlayerOutlierEntry {
  /** Player season data */
  player: PlayerSeasonStats;
  /** Composite score (weighted average z-score) */
  compositeScore: number;
  /** Z-score of composite score */
  compositeZScore: number;
  /** Tier classification */
  tier: "historic" | "elite" | "outlier" | "above-average" | "average";
  /** Individual stat outliers */
  statOutliers: StatOutlier[];
  /** Narrative description */
  narrative: string;
}

/**
 * Complete outlier detection report for a season
 */
export interface PlayerOutlierReport {
  /** Season year */
  season: number;
  /** Total players analyzed */
  totalPlayers: number;
  /** All outlier-tier players */
  outliers: PlayerOutlierEntry[];
  /** Elite performers (|z| > 2.5) */
  elitePerformers: PlayerOutlierEntry[];
  /** Historic performers (|z| > 3.0) */
  historicPerformers: PlayerOutlierEntry[];
  /** Breakout players from previous season */
  breakoutPlayers: BreakoutAnalysis[];
  /** Summary by position */
  positionSummary: Record<Position, PositionOutlierSummary>;
}

// ============================================================================
// CORE STATISTICAL FUNCTIONS
// ============================================================================

/**
 * Calculate z-score for a single value
 * @param value - The value to score
 * @param mean - Population mean
 * @param stddev - Population standard deviation
 * @returns Standard deviation units from mean (-inf to +inf)
 */
export function calculateZScore(
  value: number,
  mean: number,
  stddev: number
): number {
  if (stddev === 0) return 0;
  return (value - mean) / stddev;
}

/**
 * Calculate percentile rank from distribution
 * Uses linear interpolation between sorted values
 * @param value - Value to rank
 * @param distribution - Sorted array of all values
 * @returns Percentile (0-100)
 */
export function percentileRank(
  value: number,
  distribution: number[]
): number {
  if (distribution.length === 0) return 50;

  const sorted = [...distribution].sort((a, b) => a - b);
  let count = 0;

  for (const v of sorted) {
    if (v < value) count++;
  }

  return (count / sorted.length) * 100;
}

/**
 * Calculate mean and standard deviation of numeric array
 * @param values - Array of numbers
 * @returns Object with mean and stddev
 */
function calculateStats(values: number[]): {
  mean: number;
  stddev: number;
  median: number;
} {
  if (values.length === 0) {
    return { mean: 0, stddev: 0, median: 0 };
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  const stddev = Math.sqrt(variance);

  const sorted = [...values].sort((a, b) => a - b);
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

  return { mean, stddev, median };
}

/**
 * Find quartiles and IQR bounds for outlier detection
 * @param values - Array of numeric values
 * @returns Q1, Q3, IQR, and outlier bounds
 */
function calculateQuartiles(values: number[]): {
  q1: number;
  q3: number;
  iqr: number;
  lowerBound: number;
  upperBound: number;
  farLowerBound: number;
  farUpperBound: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;

  return {
    q1,
    q3,
    iqr,
    lowerBound: q1 - 1.5 * iqr,
    upperBound: q3 + 1.5 * iqr,
    farLowerBound: q1 - 3 * iqr,
    farUpperBound: q3 + 3 * iqr,
  };
}

/**
 * Find outliers in a single statistic using z-score or IQR method
 * @param values - Array of numeric values
 * @param method - Detection method (default "zscore")
 * @returns Outlier indices and values
 */
export function findStatOutliers(
  values: number[],
  method: "zscore" | "iqr" = "zscore"
): {
  outlierIndices: number[];
  threshold: number;
  method: string;
} {
  if (values.length === 0) return { outlierIndices: [], threshold: 0, method };

  if (method === "iqr") {
    const { lowerBound, upperBound } = calculateQuartiles(values);
    const outlierIndices = values
      .map((v, i) => (v < lowerBound || v > upperBound ? i : -1))
      .filter((i) => i !== -1);

    return {
      outlierIndices,
      threshold: Math.max(Math.abs(lowerBound), Math.abs(upperBound)),
      method: "iqr",
    };
  }

  // Z-score method (default)
  const { mean, stddev } = calculateStats(values);
  const threshold = 2.0;
  const outlierIndices = values
    .map((v, i) => {
      const z = calculateZScore(v, mean, stddev);
      return Math.abs(z) > threshold ? i : -1;
    })
    .filter((i) => i !== -1);

  return { outlierIndices, threshold, method: "zscore" };
}

// ============================================================================
// POSITION-SPECIFIC COMPOSITE SCORING
// ============================================================================

/**
 * Minimum games played to qualify for outlier detection by position
 */
const MIN_GAMES_BY_POSITION: Record<Position, number> = {
  QB: 6, // 1/2 season as starter
  RB: 5,
  FB: 4,
  WR: 5,
  TE: 5,
  OT: 4,
  OG: 4,
  OC: 4,
  DE: 4,
  DT: 4,
  EDGE: 4,
  LB: 4,
  CB: 4,
  S: 4,
  ATH: 4,
  K: 3,
  P: 3,
  LS: 3,
  OTHER: 3,
};

/**
 * Calculate position-specific composite score with appropriate weightings
 * @param stats - Player season statistics
 * @param position - Player position
 * @returns Composite score breakdown
 */
export function calculateCompositeScore(
  stats: PlayerSeasonStats,
  position: Position = stats.position
): CompositeScore {
  const breakdown: CompositeScore["breakdown"] = [];
  let compositeZ = 0;
  let weightSum = 0;

  // Position-specific stat weights and calculations
  switch (position) {
    case "QB": {
      // EPA/play (35%), Completion % over expected (25%), Yards/attempt (20%),
      // TD% (10%), INT% (10%)
      const epa = stats.stats["EPA/play"] ?? 0;
      const cpoe = stats.stats["CPOE"] ?? 0;
      const ypa = stats.stats["yards/attempt"] ?? 0;
      const tdPct = stats.stats["TD%"] ?? 0;
      const intPct = stats.stats["INT%"] ?? 0;

      const weights = [0.35, 0.25, 0.2, 0.1, 0.1];
      const zScores = [epa, cpoe, ypa, tdPct, intPct];
      const labels = ["EPA/play", "CPOE", "Yards/attempt", "TD%", "INT%"];

      for (let i = 0; i < labels.length; i++) {
        breakdown.push({
          stat: labels[i],
          value: zScores[i],
          weight: weights[i],
          zScore: zScores[i],
        });
        compositeZ += zScores[i] * weights[i];
        weightSum += weights[i];
      }
      break;
    }

    case "RB": {
      // EPA/carry (35%), YAC/carry (25%), Breakaway rate (20%),
      // Success rate (10%), Receiving EPA (10%)
      const epa = stats.stats["EPA/carry"] ?? 0;
      const yac = stats.stats["YAC/carry"] ?? 0;
      const breakaway = stats.stats["breakaway_rate"] ?? 0;
      const success = stats.stats["success_rate"] ?? 0;
      const recEpa = stats.stats["receiving_EPA"] ?? 0;

      const weights = [0.35, 0.25, 0.2, 0.1, 0.1];
      const zScores = [epa, yac, breakaway, success, recEpa];
      const labels = [
        "EPA/carry",
        "YAC/carry",
        "Breakaway rate",
        "Success rate",
        "Receiving EPA",
      ];

      for (let i = 0; i < labels.length; i++) {
        breakdown.push({
          stat: labels[i],
          value: zScores[i],
          weight: weights[i],
          zScore: zScores[i],
        });
        compositeZ += zScores[i] * weights[i];
        weightSum += weights[i];
      }
      break;
    }

    case "WR":
    case "TE": {
      // Receiving EPA/target (30%), Yards per route run (25%),
      // Contested catch rate (20%), Separation (15%), YAC (10%)
      const epa = stats.stats["receiving_EPA/target"] ?? 0;
      const yprr = stats.stats["YPRR"] ?? 0;
      const contested = stats.stats["contested_catch_rate"] ?? 0;
      const separation = stats.stats["separation"] ?? 0;
      const yac = stats.stats["YAC/reception"] ?? 0;

      const weights = [0.3, 0.25, 0.2, 0.15, 0.1];
      const zScores = [epa, yprr, contested, separation, yac];
      const labels = [
        "EPA/target",
        "YPRR",
        "Contested catch %",
        "Separation",
        "YAC/rec",
      ];

      for (let i = 0; i < labels.length; i++) {
        breakdown.push({
          stat: labels[i],
          value: zScores[i],
          weight: weights[i],
          zScore: zScores[i],
        });
        compositeZ += zScores[i] * weights[i];
        weightSum += weights[i];
      }
      break;
    }

    case "DE":
    case "DT":
    case "EDGE": {
      // Pressure rate (30%), Tackle for loss rate (25%), Sack rate (25%),
      // Forced turnovers (15%), Coverage EPA allowed (5%)
      const pressureRate = stats.stats["pressure_rate"] ?? 0;
      const tflRate = stats.stats["TFL_rate"] ?? 0;
      const sackRate = stats.stats["sack_rate"] ?? 0;
      const forcedTurnovers = stats.stats["forced_turnovers"] ?? 0;
      const coverageEpa = stats.stats["coverage_EPA"] ?? 0;

      const weights = [0.3, 0.25, 0.25, 0.15, 0.05];
      const zScores = [pressureRate, tflRate, sackRate, forcedTurnovers, coverageEpa];
      const labels = [
        "Pressure rate",
        "TFL rate",
        "Sack rate",
        "Forced turnovers",
        "Coverage EPA",
      ];

      for (let i = 0; i < labels.length; i++) {
        breakdown.push({
          stat: labels[i],
          value: zScores[i],
          weight: weights[i],
          zScore: zScores[i],
        });
        compositeZ += zScores[i] * weights[i];
        weightSum += weights[i];
      }
      break;
    }

    case "LB": {
      // Tackle rate (30%), TFL rate (25%), Pass breakup rate (20%),
      // Pressure rate (15%), Coverage EPA allowed (10%)
      const tackles = stats.stats["tackle_rate"] ?? 0;
      const tflRate = stats.stats["TFL_rate"] ?? 0;
      const pbRate = stats.stats["PB_rate"] ?? 0;
      const pressureRate = stats.stats["pressure_rate"] ?? 0;
      const coverageEpa = stats.stats["coverage_EPA"] ?? 0;

      const weights = [0.3, 0.25, 0.2, 0.15, 0.1];
      const zScores = [tackles, tflRate, pbRate, pressureRate, coverageEpa];
      const labels = [
        "Tackle rate",
        "TFL rate",
        "PB rate",
        "Pressure rate",
        "Coverage EPA",
      ];

      for (let i = 0; i < labels.length; i++) {
        breakdown.push({
          stat: labels[i],
          value: zScores[i],
          weight: weights[i],
          zScore: zScores[i],
        });
        compositeZ += zScores[i] * weights[i];
        weightSum += weights[i];
      }
      break;
    }

    case "CB":
    case "S": {
      // Coverage EPA allowed (35%), Interception rate (25%),
      // Pass breakup rate (20%), Tackle rate (15%), Pressure rate (5%)
      const coverageEpa = stats.stats["coverage_EPA"] ?? 0;
      const intRate = stats.stats["INT_rate"] ?? 0;
      const pbRate = stats.stats["PB_rate"] ?? 0;
      const tackles = stats.stats["tackle_rate"] ?? 0;
      const pressureRate = stats.stats["pressure_rate"] ?? 0;

      const weights = [0.35, 0.25, 0.2, 0.15, 0.05];
      const zScores = [coverageEpa, intRate, pbRate, tackles, pressureRate];
      const labels = [
        "Coverage EPA",
        "INT rate",
        "PB rate",
        "Tackle rate",
        "Pressure rate",
      ];

      for (let i = 0; i < labels.length; i++) {
        breakdown.push({
          stat: labels[i],
          value: zScores[i],
          weight: weights[i],
          zScore: zScores[i],
        });
        compositeZ += zScores[i] * weights[i];
        weightSum += weights[i];
      }
      break;
    }

    default: {
      // Fallback: use EPA if available
      const epa = stats.stats["EPA"] ?? 0;
      breakdown.push({
        stat: "EPA",
        value: epa,
        weight: 1.0,
        zScore: epa,
      });
      compositeZ = epa;
      weightSum = 1.0;
    }
  }

  const finalScore = weightSum > 0 ? compositeZ / weightSum : 0;

  return {
    score: finalScore,
    breakdown,
  };
}

// ============================================================================
// HISTORICAL COMPARISON
// ============================================================================

/**
 * Compare current player stat to historical distribution
 * @param player - Current player season stats
 * @param historicalDistribution - Historical stat distribution
 * @returns Historical comparison results
 */
export function compareToHistorical(
  player: PlayerSeasonStats,
  historicalDistribution: StatDistribution
): HistoricalComparison {
  const currentValue = player.stats[historicalDistribution.stat] ?? 0;
  const historicalMean = historicalDistribution.mean;
  const historicalStddev = historicalDistribution.stddev;

  const zScore = calculateZScore(currentValue, historicalMean, historicalStddev);
  const percentile = percentileRank(
    currentValue,
    Array(100)
      .fill(0)
      .map((_, i) => {
        // Create distribution array from z-scores
        return historicalMean + (i - 50) * (historicalStddev / 10);
      })
  );

  // Estimate historical rank (number of players better)
  const historicalRank = Math.max(
    1,
    Math.floor((1 - percentile / 100) * historicalDistribution.n)
  );

  return {
    currentValue,
    historicalMean,
    historicalZScore: zScore,
    historicalRank,
    historicalPercentile: percentile,
    isHistoricPerformance: Math.abs(zScore) > 3.0,
  };
}

// ============================================================================
// BREAKOUT DETECTION
// ============================================================================

/**
 * Detect year-over-year breakout performances
 * @param currentStats - Current season statistics
 * @param previousStats - Previous season statistics
 * @returns Breakout analysis
 */
export function detectBreakout(
  currentStats: PlayerSeasonStats,
  previousStats: PlayerSeasonStats
): BreakoutAnalysis {
  const currentComposite = calculateCompositeScore(currentStats).score;
  const previousComposite = calculateCompositeScore(previousStats).score;

  const improvement =
    previousComposite !== 0
      ? ((currentComposite - previousComposite) / Math.abs(previousComposite)) *
        100
      : currentComposite * 100;

  const isBreakout = improvement > 30;

  // Identify key improvements
  const keyImprovements: string[] = [];

  // Check a few key stats for improvement
  const keyStats = Object.keys(currentStats.stats).slice(0, 5); // top 5 stats
  for (const stat of keyStats) {
    const current = currentStats.stats[stat] ?? 0;
    const previous = previousStats.stats[stat] ?? 0;

    if (previous !== 0) {
      const statImprovement = ((current - previous) / Math.abs(previous)) * 100;
      if (statImprovement > 20) {
        keyImprovements.push(`${stat} (+${statImprovement.toFixed(1)}%)`);
      }
    }
  }

  return {
    player: currentStats,
    previousComposite,
    currentComposite,
    improvement,
    isBreakout,
    keyImprovements,
  };
}

// ============================================================================
// MAIN OUTLIER DETECTION ENGINE
// ============================================================================

/**
 * Main player outlier detection function
 * Identifies exceptional statistical performances across all positions
 * @param players - Array of player season statistics
 * @param options - Detection options (method, threshold, filters)
 * @returns Complete outlier report
 */
export function detectPlayerOutliers(
  players: PlayerSeasonStats[],
  options?: OutlierOptions
): PlayerOutlierReport {
  const {
    method = "zscore",
    threshold = 2.0,
    minGames = 3,
    positions = [
      "QB",
      "RB",
      "WR",
      "TE",
      "DE",
      "DT",
      "EDGE",
      "LB",
      "CB",
      "S",
    ] as Position[],
    level,
  } = options || {};

  // Filter players by criteria
  const filtered = players.filter((p) => {
    const minForPosition = MIN_GAMES_BY_POSITION[p.position] || 3;
    return p.games >= Math.max(minGames, minForPosition);
  });

  // Group by position for stat calculations
  const playersByPosition: Record<Position, PlayerSeasonStats[]> = {} as Record<
    Position,
    PlayerSeasonStats[]
  >;

  for (const player of filtered) {
    if (!playersByPosition[player.position]) {
      playersByPosition[player.position] = [];
    }
    playersByPosition[player.position].push(player);
  }

  // Calculate composite scores and outlier status
  const outlierEntries: PlayerOutlierEntry[] = [];

  for (const player of filtered) {
    if (!positions.includes(player.position)) continue;

    const composite = calculateCompositeScore(player);
    const playerGroupComposites = playersByPosition[player.position]
      .map((p) => calculateCompositeScore(p).score)
      .filter((score) => !isNaN(score) && isFinite(score));

    if (playerGroupComposites.length === 0) continue;

    const { mean, stddev } = calculateStats(playerGroupComposites);
    const compositeZScore = calculateZScore(
      composite.score,
      mean,
      stddev
    );

    // Only include if outlier at z >= threshold
    if (Math.abs(compositeZScore) < threshold) continue;

    // Determine tier
    let tier: "historic" | "elite" | "outlier" | "above-average" | "average" =
      "average";
    if (Math.abs(compositeZScore) >= 3.0) {
      tier = "historic";
    } else if (Math.abs(compositeZScore) >= 2.5) {
      tier = "elite";
    } else if (Math.abs(compositeZScore) >= threshold) {
      tier = "outlier";
    } else if (Math.abs(compositeZScore) >= 1.0) {
      tier = "above-average";
    }

    // Identify which individual stats are outliers
    const statOutliers: StatOutlier[] = [];
    for (const [statName, statValue] of Object.entries(player.stats)) {
      const positionStats = playersByPosition[player.position]
        .map((p) => p.stats[statName])
        .filter((v) => v !== undefined && !isNaN(v)) as number[];

      if (positionStats.length < 2) continue;

      const { mean: statMean, stddev: statStddev } = calculateStats(positionStats);
      const statZScore = calculateZScore(statValue, statMean, statStddev);

      if (Math.abs(statZScore) > threshold) {
        const percentile = percentileRank(statValue, positionStats);
        statOutliers.push({
          stat: statName,
          value: statValue,
          zScore: statZScore,
          percentile,
          isPositiveOutlier: statZScore > 0,
        });
      }
    }

    // Generate narrative
    const narrative = generatePlayerNarrative(
      player,
      tier,
      compositeZScore,
      statOutliers
    );

    outlierEntries.push({
      player,
      compositeScore: composite.score,
      compositeZScore,
      tier,
      statOutliers: statOutliers.sort(
        (a, b) => Math.abs(b.zScore) - Math.abs(a.zScore)
      ),
      narrative,
    });
  }

  // Separate by tier
  const elitePerformers = outlierEntries.filter(
    (e) => e.tier === "elite" || e.tier === "historic"
  );
  const historicPerformers = outlierEntries.filter((e) => e.tier === "historic");

  // Build position summary
  const positionSummary: Record<Position, PositionOutlierSummary> = {} as Record<
    Position,
    PositionOutlierSummary
  >;

  for (const pos of positions) {
    const posPlayers = outlierEntries.filter((e) => e.player.position === pos);
    positionSummary[pos] = {
      position: pos,
      totalPlayers: playersByPosition[pos]?.length || 0,
      outlierCount: posPlayers.length,
      eliteCount: posPlayers.filter((e) => e.tier === "elite").length,
      historicCount: posPlayers.filter((e) => e.tier === "historic").length,
      topOutliers: posPlayers
        .slice(0, 3)
        .map((e) => e.player.playerName),
    };
  }

  return {
    season: filtered[0]?.season || (new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1),
    totalPlayers: filtered.length,
    outliers: outlierEntries.sort(
      (a, b) => Math.abs(b.compositeZScore) - Math.abs(a.compositeZScore)
    ),
    elitePerformers,
    historicPerformers,
    breakoutPlayers: [], // Would be populated by comparing to previous season
    positionSummary,
  };
}

// ============================================================================
// NARRATIVE GENERATION
// ============================================================================

/**
 * Generate human-readable narrative for a player outlier
 */
function generatePlayerNarrative(
  player: PlayerSeasonStats,
  tier: string,
  zScore: number,
  statOutliers: StatOutlier[]
): string {
  const tierDescriptions: Record<string, string> = {
    historic: "historically exceptional",
    elite: "elite-level",
    outlier: "statistical outlier",
    "above-average": "above average",
    average: "average",
  };

  const description = tierDescriptions[tier] || "statistical standout";
  const direction = zScore > 0 ? "elite" : "poor";

  let narrative = `${player.playerName} is a ${description} performer at ${player.position}`;

  if (statOutliers.length > 0) {
    const topStats = statOutliers.slice(0, 2).map((s) => s.stat).join(" and ");
    narrative += `, particularly in ${topStats}`;
  }

  narrative += `.`;

  return narrative;
}
