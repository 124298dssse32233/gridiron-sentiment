/**
 * Award Prediction Engine
 * Predicts probabilities for 10 major college football awards using weighted feature scoring.
 *
 * Awards tracked:
 * 1. Heisman Trophy
 * 2. Maxwell Award
 * 3. Walter Camp Award
 * 4. Davey O'Brien Award
 * 5. Doak Walker Award
 * 6. Biletnikoff Award
 * 7. Jim Thorpe Award
 * 8. Outland Trophy
 * 9. Bronko Nagurski Trophy
 * 10. Chuck Bednarik Award
 */

/**
 * Award name type definition
 */
export type AwardName =
  | "heisman"
  | "maxwell"
  | "walter_camp"
  | "davey_obrien"
  | "doak_walker"
  | "biletnikoff"
  | "jim_thorpe"
  | "outland"
  | "nagurski"
  | "bednarik";

/**
 * Player season statistics for award eligibility
 */
export interface PlayerSeasonStats {
  gamesPlayed: number;
  /** Passing yards per season */
  passingYards?: number;
  /** Passing touchdowns */
  passingTDs?: number;
  /** Interceptions thrown */
  interceptions?: number;
  /** Passer rating (0-158.3 scale) */
  passerRating?: number;
  /** Completion percentage */
  completionPct?: number;
  /** Rushing yards */
  rushingYards?: number;
  /** Rushing touchdowns */
  rushingTDs?: number;
  /** Average yards per carry */
  yardsPerCarry?: number;
  /** Fumbles */
  fumbles?: number;
  /** Receiving yards */
  receivingYards?: number;
  /** Receiving touchdowns */
  receivingTDs?: number;
  /** Receptions */
  receptions?: number;
  /** Average yards per catch */
  yardsPerCatch?: number;
  /** Tackle count */
  tackles?: number;
  /** Sacks */
  sacks?: number;
  /** Interceptions (defensive) */
  interceptionsDef?: number;
  /** Tackles for loss */
  tacklesForLoss?: number;
  /** Forced fumbles */
  forcedFumbles?: number;
  /** Passes defended */
  passesDefended?: number;
  /** All-purpose yards (offensive players) */
  allPurposeYards?: number;
  /** Total touchdowns (offensive players) */
  totalTDs?: number;
}

/**
 * Award candidate with all necessary information
 */
export interface AwardCandidate {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  teamSlug: string;
  conference: string;
  level: string; // FBS, FCS, D2, D3, NAIA
  stats: PlayerSeasonStats;
  teamRecord: { wins: number; losses: number };
  teamRank?: number;
}

/**
 * Award prediction result for a single candidate
 */
export interface AwardCandidateResult {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  teamSlug: string;
  probability: number; // 0-1 scale
  rawScore: number;
  rank: number; // 1-indexed
  trend: "rising" | "falling" | "stable";
  keyStats: Array<{ label: string; value: string }>;
  previousProbability?: number;
}

/**
 * Complete award prediction with all candidates
 */
export interface AwardPrediction {
  award: AwardName;
  awardDisplayName: string;
  candidates: AwardCandidateResult[];
  lastUpdated: Date;
  weekNumber?: number;
}

/**
 * Feature weights for each award
 */
interface AwardWeights {
  qb?: Record<string, number>;
  rb?: Record<string, number>;
  wr?: Record<string, number>;
  defensive?: Record<string, number>;
  heisman?: Record<string, number>;
}

/**
 * Award display names mapping
 */
const AWARD_DISPLAY_NAMES: Record<AwardName, string> = {
  heisman: "Heisman Trophy",
  maxwell: "Maxwell Award",
  walter_camp: "Walter Camp Award",
  davey_obrien: "Davey O'Brien Award",
  doak_walker: "Doak Walker Award",
  biletnikoff: "Biletnikoff Award",
  jim_thorpe: "Jim Thorpe Award",
  outland: "Outland Trophy",
  nagurski: "Bronko Nagurski Trophy",
  bednarik: "Chuck Bednalik Award",
};

/**
 * Eligible positions for each award
 */
const AWARD_ELIGIBLE_POSITIONS: Record<AwardName, string[]> = {
  heisman: ["QB", "RB", "FB", "WR", "TE"],
  maxwell: ["QB", "RB", "FB", "WR", "TE", "LB", "S", "CB", "DE", "DT", "EDGE"],
  walter_camp: ["QB", "RB", "FB", "WR", "TE", "LB", "S", "CB", "DE", "DT", "EDGE"],
  davey_obrien: ["QB"],
  doak_walker: ["RB", "FB"],
  biletnikoff: ["WR", "TE"],
  jim_thorpe: ["CB", "S"],
  outland: ["OT", "OG", "OC", "DE", "DT"],
  nagurski: ["LB", "DE", "DT", "S", "EDGE"],
  bednarik: ["LB", "DE", "DT", "S", "CB", "EDGE"],
};

/**
 * Feature weights for QB positions across different awards
 */
const QB_FEATURE_WEIGHTS: Record<string, number> = {
  passingYardsPerGame: 0.15,
  passingTDs: 0.2,
  passerRating: 0.2,
  winLossRecord: 0.15,
  teamRank: 0.15,
  signatureMoments: 0.1,
  intPercentage: -0.05,
};

/**
 * Feature weights for RB positions across different awards
 */
const RB_FEATURE_WEIGHTS: Record<string, number> = {
  rushingYardsPerGame: 0.2,
  rushingTDs: 0.2,
  yardsPerCarry: 0.15,
  allPurposeYards: 0.15,
  teamRank: 0.15,
  winLossRecord: 0.1,
  fumbleRate: -0.05,
};

/**
 * Feature weights for WR positions across different awards
 */
const WR_FEATURE_WEIGHTS: Record<string, number> = {
  receivingYardsPerGame: 0.2,
  receivingTDs: 0.2,
  yardsPerCatch: 0.1,
  catchesPerGame: 0.15,
  teamRank: 0.15,
  winLossRecord: 0.1,
  bigPlayRate: 0.1,
};

/**
 * Feature weights for defensive positions across different awards
 */
const DEFENSIVE_FEATURE_WEIGHTS: Record<string, number> = {
  tacklesPerGame: 0.15,
  sacks: 0.15,
  interceptions: 0.2,
  tacklesForLoss: 0.15,
  forcedFumbles: 0.1,
  teamDefenseRank: 0.15,
  teamWinLoss: 0.1,
};

/**
 * Position groupings for quick lookup
 */
const POSITION_GROUPS = {
  QB: ["QB"],
  RB: ["RB", "FB"],
  WR: ["WR", "TE"],
  DL: ["DE", "DT", "EDGE"],
  LB: ["LB"],
  DB: ["CB", "S"],
  OL: ["OT", "OG", "OC"],
};

/**
 * Get display name for an award
 * @param award Award name
 * @returns Human-readable award name
 */
export function getAwardDisplayName(award: AwardName): string {
  return AWARD_DISPLAY_NAMES[award] ?? award;
}

/**
 * Get eligible positions for an award
 * @param award Award name
 * @returns Array of eligible position codes
 */
export function getEligiblePositions(award: AwardName): string[] {
  return AWARD_ELIGIBLE_POSITIONS[award] ?? [];
}

/**
 * Filter candidates by award eligibility
 * @param award Award name
 * @param candidates All candidates to filter
 * @returns Filtered candidates eligible for the award
 */
export function filterCandidatesByAward(
  award: AwardName,
  candidates: AwardCandidate[]
): AwardCandidate[] {
  const eligiblePositions = getEligiblePositions(award);
  return candidates.filter((c) => eligiblePositions.includes(c.position));
}

/**
 * Normalize values to 0-1 range using min-max normalization
 * @param value Value to normalize
 * @param min Minimum value in pool
 * @param max Maximum value in pool
 * @returns Normalized value (0-1)
 */
function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 0.5; // Avoid division by zero
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Calculate feature statistics for a pool of candidates
 * @param candidates Candidates to analyze
 * @param featureExtractor Function to extract feature value
 * @returns Object with min, max, mean, and std dev
 */
function calculateFeatureStats(
  candidates: AwardCandidate[],
  featureExtractor: (c: AwardCandidate) => number | undefined
): {
  min: number;
  max: number;
  mean: number;
  stdDev: number;
} {
  const values = candidates
    .map(featureExtractor)
    .filter((v): v is number => v !== undefined && !isNaN(v));

  if (values.length === 0) {
    return { min: 0, max: 1, mean: 0.5, stdDev: 0 };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return { min, max, mean, stdDev };
}

/**
 * Get feature weights based on position
 * @param position Player position
 * @returns Feature weights for the position
 */
function getFeatureWeightsForPosition(
  position: string
): Record<string, number> {
  if (POSITION_GROUPS.QB.includes(position)) {
    return QB_FEATURE_WEIGHTS;
  } else if (POSITION_GROUPS.RB.includes(position)) {
    return RB_FEATURE_WEIGHTS;
  } else if (POSITION_GROUPS.WR.includes(position)) {
    return WR_FEATURE_WEIGHTS;
  } else {
    return DEFENSIVE_FEATURE_WEIGHTS;
  }
}

/**
 * Calculate raw score for a candidate for a specific award
 * @param award Award name
 * @param candidate Candidate to score
 * @param pool All candidates in the pool (for normalization)
 * @returns Raw score (before softmax)
 */
export function calculateRawScore(
  award: AwardName,
  candidate: AwardCandidate,
  pool: AwardCandidate[]
): number {
  const weights = getFeatureWeightsForPosition(candidate.position);
  let score = 0;

  // QB-specific scoring
  if (POSITION_GROUPS.QB.includes(candidate.position)) {
    // Passing yards per game
    if (candidate.stats.passingYards !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => POSITION_GROUPS.QB.includes(c.position)),
        (c) => (c.stats.passingYards ?? 0) / Math.max(1, c.stats.gamesPlayed)
      );
      const yardsPerGame =
        (candidate.stats.passingYards ?? 0) / Math.max(1, candidate.stats.gamesPlayed);
      const normalized = normalizeValue(yardsPerGame, stats.min, stats.max);
      score += (weights.passingYardsPerGame ?? 0) * normalized;
    }

    // Passing TDs
    if (candidate.stats.passingTDs !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => POSITION_GROUPS.QB.includes(c.position)),
        (c) => c.stats.passingTDs ?? 0
      );
      const normalized = normalizeValue(
        candidate.stats.passingTDs,
        stats.min,
        stats.max
      );
      score += (weights.passingTDs ?? 0) * normalized;
    }

    // Passer rating
    if (candidate.stats.passerRating !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => POSITION_GROUPS.QB.includes(c.position)),
        (c) => c.stats.passerRating ?? 0
      );
      const normalized = normalizeValue(
        candidate.stats.passerRating,
        stats.min,
        stats.max
      );
      score += (weights.passerRating ?? 0) * normalized;
    }

    // Win-loss record
    const winPct = candidate.teamRecord.wins /
      (candidate.teamRecord.wins + candidate.teamRecord.losses || 1);
    score += (weights.winLossRecord ?? 0) * winPct;

    // Team rank (higher rank = lower number, so invert)
    if (candidate.teamRank !== undefined) {
      const rankNormalized = 1 - normalizeValue(candidate.teamRank, 1, 130);
      score += (weights.teamRank ?? 0) * rankNormalized;
    }

    // INT percentage (negative weight)
    if (
      candidate.stats.interceptions !== undefined &&
      candidate.stats.passingYards !== undefined
    ) {
      const intPct = candidate.stats.interceptions / Math.max(1, candidate.stats.passingYards) * 100;
      const stats = calculateFeatureStats(
        pool.filter((c) => POSITION_GROUPS.QB.includes(c.position)),
        (c) =>
          (c.stats.interceptions ?? 0) /
          Math.max(1, c.stats.passingYards ?? 1) *
          100
      );
      const normalized = normalizeValue(intPct, stats.min, stats.max);
      score += (weights.intPercentage ?? 0) * normalized;
    }
  }

  // RB-specific scoring
  if (POSITION_GROUPS.RB.includes(candidate.position)) {
    // Rushing yards per game
    if (candidate.stats.rushingYards !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => POSITION_GROUPS.RB.includes(c.position)),
        (c) => (c.stats.rushingYards ?? 0) / Math.max(1, c.stats.gamesPlayed)
      );
      const yardsPerGame =
        (candidate.stats.rushingYards ?? 0) / Math.max(1, candidate.stats.gamesPlayed);
      const normalized = normalizeValue(yardsPerGame, stats.min, stats.max);
      score += (weights.rushingYardsPerGame ?? 0) * normalized;
    }

    // Rushing TDs
    if (candidate.stats.rushingTDs !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => POSITION_GROUPS.RB.includes(c.position)),
        (c) => c.stats.rushingTDs ?? 0
      );
      const normalized = normalizeValue(
        candidate.stats.rushingTDs,
        stats.min,
        stats.max
      );
      score += (weights.rushingTDs ?? 0) * normalized;
    }

    // Yards per carry
    if (candidate.stats.yardsPerCarry !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => POSITION_GROUPS.RB.includes(c.position)),
        (c) => c.stats.yardsPerCarry ?? 0
      );
      const normalized = normalizeValue(
        candidate.stats.yardsPerCarry,
        stats.min,
        stats.max
      );
      score += (weights.yardsPerCarry ?? 0) * normalized;
    }

    // All-purpose yards
    if (candidate.stats.allPurposeYards !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => POSITION_GROUPS.RB.includes(c.position)),
        (c) => c.stats.allPurposeYards ?? 0
      );
      const normalized = normalizeValue(
        candidate.stats.allPurposeYards,
        stats.min,
        stats.max
      );
      score += (weights.allPurposeYards ?? 0) * normalized;
    }

    // Team rank
    if (candidate.teamRank !== undefined) {
      const rankNormalized = 1 - normalizeValue(candidate.teamRank, 1, 130);
      score += (weights.teamRank ?? 0) * rankNormalized;
    }

    // Win-loss record
    const winPct = candidate.teamRecord.wins /
      (candidate.teamRecord.wins + candidate.teamRecord.losses || 1);
    score += (weights.winLossRecord ?? 0) * winPct;

    // Fumble rate (negative weight)
    if (candidate.stats.fumbles !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => POSITION_GROUPS.RB.includes(c.position)),
        (c) => c.stats.fumbles ?? 0
      );
      const normalized = normalizeValue(candidate.stats.fumbles, stats.min, stats.max);
      score += (weights.fumbleRate ?? 0) * normalized;
    }
  }

  // WR-specific scoring
  if (POSITION_GROUPS.WR.includes(candidate.position)) {
    // Receiving yards per game
    if (candidate.stats.receivingYards !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => POSITION_GROUPS.WR.includes(c.position)),
        (c) => (c.stats.receivingYards ?? 0) / Math.max(1, c.stats.gamesPlayed)
      );
      const yardsPerGame =
        (candidate.stats.receivingYards ?? 0) / Math.max(1, candidate.stats.gamesPlayed);
      const normalized = normalizeValue(yardsPerGame, stats.min, stats.max);
      score += (weights.receivingYardsPerGame ?? 0) * normalized;
    }

    // Receiving TDs
    if (candidate.stats.receivingTDs !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => POSITION_GROUPS.WR.includes(c.position)),
        (c) => c.stats.receivingTDs ?? 0
      );
      const normalized = normalizeValue(
        candidate.stats.receivingTDs,
        stats.min,
        stats.max
      );
      score += (weights.receivingTDs ?? 0) * normalized;
    }

    // Yards per catch
    if (candidate.stats.yardsPerCatch !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => POSITION_GROUPS.WR.includes(c.position)),
        (c) => c.stats.yardsPerCatch ?? 0
      );
      const normalized = normalizeValue(
        candidate.stats.yardsPerCatch,
        stats.min,
        stats.max
      );
      score += (weights.yardsPerCatch ?? 0) * normalized;
    }

    // Catches per game
    if (candidate.stats.receptions !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => POSITION_GROUPS.WR.includes(c.position)),
        (c) => (c.stats.receptions ?? 0) / Math.max(1, c.stats.gamesPlayed)
      );
      const catchesPerGame =
        (candidate.stats.receptions ?? 0) / Math.max(1, candidate.stats.gamesPlayed);
      const normalized = normalizeValue(catchesPerGame, stats.min, stats.max);
      score += (weights.catchesPerGame ?? 0) * normalized;
    }

    // Team rank
    if (candidate.teamRank !== undefined) {
      const rankNormalized = 1 - normalizeValue(candidate.teamRank, 1, 130);
      score += (weights.teamRank ?? 0) * rankNormalized;
    }

    // Win-loss record
    const winPct = candidate.teamRecord.wins /
      (candidate.teamRecord.wins + candidate.teamRecord.losses || 1);
    score += (weights.winLossRecord ?? 0) * winPct;
  }

  // Defensive scoring
  if (!POSITION_GROUPS.QB.includes(candidate.position) &&
      !POSITION_GROUPS.RB.includes(candidate.position) &&
      !POSITION_GROUPS.WR.includes(candidate.position)) {
    // Tackles per game
    if (candidate.stats.tackles !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => !POSITION_GROUPS.QB.includes(c.position) &&
                          !POSITION_GROUPS.RB.includes(c.position) &&
                          !POSITION_GROUPS.WR.includes(c.position)),
        (c) => (c.stats.tackles ?? 0) / Math.max(1, c.stats.gamesPlayed)
      );
      const tacklesPerGame =
        (candidate.stats.tackles ?? 0) / Math.max(1, candidate.stats.gamesPlayed);
      const normalized = normalizeValue(tacklesPerGame, stats.min, stats.max);
      score += (weights.tacklesPerGame ?? 0) * normalized;
    }

    // Sacks (primarily for DL/EDGE)
    if (candidate.stats.sacks !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => POSITION_GROUPS.DL.includes(c.position) ||
                          POSITION_GROUPS.LB.includes(c.position)),
        (c) => c.stats.sacks ?? 0
      );
      const normalized = normalizeValue(candidate.stats.sacks, stats.min, stats.max);
      score += (weights.sacks ?? 0) * normalized;
    }

    // Interceptions (primarily for DBs)
    if (candidate.stats.interceptionsDef !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => POSITION_GROUPS.DB.includes(c.position)),
        (c) => c.stats.interceptionsDef ?? 0
      );
      const normalized = normalizeValue(
        candidate.stats.interceptionsDef,
        stats.min,
        stats.max
      );
      score += (weights.interceptions ?? 0) * normalized;
    }

    // Tackles for loss
    if (candidate.stats.tacklesForLoss !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => !POSITION_GROUPS.QB.includes(c.position) &&
                          !POSITION_GROUPS.RB.includes(c.position) &&
                          !POSITION_GROUPS.WR.includes(c.position)),
        (c) => c.stats.tacklesForLoss ?? 0
      );
      const normalized = normalizeValue(
        candidate.stats.tacklesForLoss,
        stats.min,
        stats.max
      );
      score += (weights.tacklesForLoss ?? 0) * normalized;
    }

    // Forced fumbles
    if (candidate.stats.forcedFumbles !== undefined) {
      const stats = calculateFeatureStats(
        pool.filter((c) => !POSITION_GROUPS.QB.includes(c.position) &&
                          !POSITION_GROUPS.RB.includes(c.position) &&
                          !POSITION_GROUPS.WR.includes(c.position)),
        (c) => c.stats.forcedFumbles ?? 0
      );
      const normalized = normalizeValue(
        candidate.stats.forcedFumbles,
        stats.min,
        stats.max
      );
      score += (weights.forcedFumbles ?? 0) * normalized;
    }

    // Team rank
    if (candidate.teamRank !== undefined) {
      const rankNormalized = 1 - normalizeValue(candidate.teamRank, 1, 130);
      score += (weights.teamDefenseRank ?? 0) * rankNormalized;
    }

    // Win-loss record
    const winPct = candidate.teamRecord.wins /
      (candidate.teamRecord.wins + candidate.teamRecord.losses || 1);
    score += (weights.teamWinLoss ?? 0) * winPct;
  }

  // Award-specific adjustments
  if (award === "heisman") {
    // Heisman has historical position bias
    if (POSITION_GROUPS.QB.includes(candidate.position)) {
      score *= 1.15; // QB bias
    } else if (POSITION_GROUPS.RB.includes(candidate.position)) {
      score *= 1.05; // RB slight bonus
    } else if (!POSITION_GROUPS.WR.includes(candidate.position)) {
      score *= 0.9; // Defensive penalty
    }

    // Power 5 bias
    if (["ACC", "Big 10", "Big 12", "Pac-12", "SEC"].includes(candidate.conference)) {
      score *= 1.1;
    }
  }

  return Math.max(0, score);
}

/**
 * Softmax function to convert raw scores to probabilities
 * @param scores Array of raw scores
 * @param temperature Controls softmax sharpness (higher = softer distribution)
 * @returns Probabilities that sum to 1
 */
export function softmax(scores: number[], temperature: number = 1): number[] {
  // Avoid numerical overflow by subtracting max
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - max) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/**
 * Get key stats for a candidate for display
 * @param candidate Candidate to extract stats from
 * @param award Award name (for context)
 * @returns Top 3-4 key stats for display
 */
export function getKeyStatsForCandidate(
  candidate: AwardCandidate,
  award: AwardName
): Array<{ label: string; value: string }> {
  const stats: Array<{ label: string; value: string }> = [];

  if (POSITION_GROUPS.QB.includes(candidate.position)) {
    if (candidate.stats.passingYards !== undefined) {
      stats.push({
        label: "Pass Yds",
        value: `${Math.round(candidate.stats.passingYards).toLocaleString()}`,
      });
    }
    if (candidate.stats.passingTDs !== undefined) {
      stats.push({
        label: "Pass TDs",
        value: `${candidate.stats.passingTDs}`,
      });
    }
    if (candidate.stats.passerRating !== undefined) {
      stats.push({
        label: "Rating",
        value: `${candidate.stats.passerRating.toFixed(1)}`,
      });
    }
  } else if (POSITION_GROUPS.RB.includes(candidate.position)) {
    if (candidate.stats.rushingYards !== undefined) {
      stats.push({
        label: "Rush Yds",
        value: `${Math.round(candidate.stats.rushingYards).toLocaleString()}`,
      });
    }
    if (candidate.stats.rushingTDs !== undefined) {
      stats.push({
        label: "Rush TDs",
        value: `${candidate.stats.rushingTDs}`,
      });
    }
    if (candidate.stats.allPurposeYards !== undefined) {
      stats.push({
        label: "All-Purpose Yds",
        value: `${Math.round(candidate.stats.allPurposeYards).toLocaleString()}`,
      });
    }
  } else if (POSITION_GROUPS.WR.includes(candidate.position)) {
    if (candidate.stats.receivingYards !== undefined) {
      stats.push({
        label: "Rec Yds",
        value: `${Math.round(candidate.stats.receivingYards).toLocaleString()}`,
      });
    }
    if (candidate.stats.receivingTDs !== undefined) {
      stats.push({
        label: "Rec TDs",
        value: `${candidate.stats.receivingTDs}`,
      });
    }
    if (candidate.stats.receptions !== undefined) {
      stats.push({
        label: "Receptions",
        value: `${candidate.stats.receptions}`,
      });
    }
  } else {
    // Defensive
    if (candidate.stats.tackles !== undefined) {
      stats.push({
        label: "Tackles",
        value: `${candidate.stats.tackles}`,
      });
    }
    if (candidate.stats.sacks !== undefined) {
      stats.push({
        label: "Sacks",
        value: `${candidate.stats.sacks.toFixed(1)}`,
      });
    }
    if (candidate.stats.interceptionsDef !== undefined) {
      stats.push({
        label: "INTs",
        value: `${candidate.stats.interceptionsDef}`,
      });
    }
  }

  // Team record
  const winPct = (
    (candidate.teamRecord.wins /
      (candidate.teamRecord.wins + candidate.teamRecord.losses)) *
    100
  ).toFixed(1);
  stats.push({
    label: "Team Record",
    value: `${candidate.teamRecord.wins}-${candidate.teamRecord.losses}`,
  });

  return stats.slice(0, 4);
}

/**
 * Predict award probabilities for a specific award
 * @param award Award name
 * @param candidates All eligible candidates
 * @param previousProbabilities Optional previous probabilities for trend calculation
 * @returns Award prediction with all candidates ranked
 */
export function predictAward(
  award: AwardName,
  candidates: AwardCandidate[],
  previousProbabilities?: Record<string, number>
): AwardPrediction {
  // Filter by eligibility
  const eligible = filterCandidatesByAward(award, candidates);

  if (eligible.length === 0) {
    return {
      award,
      awardDisplayName: getAwardDisplayName(award),
      candidates: [],
      lastUpdated: new Date(),
    };
  }

  // Calculate raw scores
  const rawScores = eligible.map((c) => calculateRawScore(award, c, eligible));

  // Convert to probabilities using softmax
  const probabilities = softmax(rawScores, 1.5); // Higher temperature for softer distribution

  // Create result objects with ranking
  const results = eligible
    .map((candidate, index) => ({
      playerId: candidate.playerId,
      playerName: candidate.playerName,
      position: candidate.position,
      team: candidate.team,
      teamSlug: candidate.teamSlug,
      probability: probabilities[index],
      rawScore: rawScores[index],
      keyStats: getKeyStatsForCandidate(candidate, award),
      previousProbability: previousProbabilities?.[candidate.playerId],
    }))
    .sort((a, b) => b.probability - a.probability)
    .map((result, index) => {
      // Calculate trend
      let trend: "rising" | "falling" | "stable" = "stable";
      if (result.previousProbability !== undefined) {
        const change = result.probability - result.previousProbability;
        if (change > 0.01) {
          trend = "rising";
        } else if (change < -0.01) {
          trend = "falling";
        }
      }

      return {
        ...result,
        rank: index + 1,
        trend,
      };
    });

  return {
    award,
    awardDisplayName: getAwardDisplayName(award),
    candidates: results,
    lastUpdated: new Date(),
  };
}

/**
 * Predict all 10 awards for a candidate pool
 * @param candidates All eligible candidates
 * @param previousProbabilities Optional previous probabilities by award
 * @returns Array of award predictions
 */
export function predictAllAwards(
  candidates: AwardCandidate[],
  previousProbabilities?: Record<AwardName, Record<string, number>>
): AwardPrediction[] {
  const awards: AwardName[] = [
    "heisman",
    "maxwell",
    "walter_camp",
    "davey_obrien",
    "doak_walker",
    "biletnikoff",
    "jim_thorpe",
    "outland",
    "nagurski",
    "bednarik",
  ];

  return awards.map((award) =>
    predictAward(award, candidates, previousProbabilities?.[award])
  );
}
