/**
 * Team Anomaly Detection Engine
 * Statistical identification of anomalous team performance patterns
 * using Pythagorean wins, Five Factors analysis, and K-Means clustering.
 *
 * Detects:
 * - Luck factors (actual vs. expected wins)
 * - Turnover regression candidates
 * - Close game anomalies
 * - Team archetypes (balanced, explosive, defensive, etc.)
 * - Regression/progression opportunities
 *
 * Uses simplified K-Means clustering with k-means++ initialization.
 */

import type { Level } from "@/types/team";

/**
 * Complete team season profile with all relevant statistics
 */
export interface TeamSeasonProfile {
  /** Team ID from database */
  teamId: number;
  /** Team name */
  teamName: string;
  /** Season year (e.g., 2024) */
  season: number;
  /** Regular season wins */
  wins: number;
  /** Regular season losses */
  losses: number;
  /** Total points scored */
  pointsFor: number;
  /** Total points allowed */
  pointsAgainst: number;
  /** Array of game margins (positive = win, negative = loss) */
  gameMargins: number[];
  /** Offensive EPA per play */
  offenseEPA: number;
  /** Defensive EPA per play */
  defenseEPA: number;
  /** Explosiveness score (IsoPPP) */
  explosiveness: number;
  /** Field position factor */
  fieldPosition: number;
  /** Finishing drives factor (points per trip inside 40) */
  finishingDrives: number;
  /** Turnover margin (TO forced - TO committed) */
  turnoverMargin: number;
  /** Record in close games (within 7 points) */
  closeGameRecord: { wins: number; losses: number };
  /** GridRank rating */
  rating: number;
  /** Division level */
  level: Level;
}

/**
 * Luck analysis for a team's record
 */
export interface LuckAnalysis {
  /** Actual wins achieved */
  actualWins: number;
  /** Expected wins (Pythagorean) */
  expectedWins: number;
  /** Difference: actual - expected */
  luckFactor: number;
  /** Percentile of luck (teams luckier than this team) */
  luckPercentile: number;
  /** True if significantly lucky (luck > +1.5 wins) */
  isLucky: boolean;
  /** True if significantly unlucky (luck < -1.5 wins) */
  isUnlucky: boolean;
  /** Predicted win change next season (regression) */
  regressionExpected: number;
}

/**
 * Turnover regression prediction
 */
export interface TurnoverPrediction {
  /** Current turnover margin */
  currentMargin: number;
  /** Expected regression magnitude */
  expectedRegression: number;
  /** Predicted turnover margin next season */
  predictedMargin: number;
  /** Confidence in prediction (0-1) */
  confidence: number;
}

/**
 * Five Factors team profile (SP+ style)
 * Five offensive + five defensive factors = 10 dimensions
 */
export interface FiveFactorsProfile {
  // Offensive factors
  offenseEfficiency: number; // EPA/play
  offenseExplosiveness: number; // IsoPPP
  offenseFieldPosition: number; // Field position factor
  offenseFinishingDrives: number; // Points per trip inside 40
  offenseTurnovers: number; // Turnover margin contribution

  // Defensive factors
  defenseEfficiency: number; // Opponent EPA/play
  defenseExplosiveness: number; // Opponent IsoPPP
  defenseFieldPosition: number; // Field position allowed
  defenseFinishingDrives: number; // Points allowed per trip
  defenseTurnovers: number; // Turnover margin contribution

  // Utility
  vectors: number[]; // All 10 as array for clustering
}

/**
 * Team archetype classification
 */
export type TeamArchetype =
  | "balanced-elite"
  | "offensive-juggernaut"
  | "defensive-fortress"
  | "turnover-lucky"
  | "close-game-warriors"
  | "paper-tigers"
  | "overachievers"
  | "underachievers"
  | "balanced-average"
  | "rebuilding";

/**
 * Anomaly flag for a team
 */
export interface AnomalyFlag {
  /** Type of anomaly */
  type:
    | "luck"
    | "regression"
    | "turnover"
    | "close-games"
    | "explosiveness"
    | "efficiency-mismatch";
  /** Severity level */
  severity: "high" | "medium" | "low";
  /** Human-readable description */
  description: string;
  /** Numeric metric backing the flag */
  metric: number;
}

/**
 * Single team anomaly entry in report
 */
export interface TeamAnomalyEntry {
  /** Team season profile */
  team: TeamSeasonProfile;
  /** Pythagorean expected wins */
  pythagoreanWins: number;
  /** Luck factor (actual - expected) */
  luckFactor: number;
  /** Second-order wins (logarithmic margin weighting) */
  secondOrderWins: number;
  /** Turnover luck factor */
  turnoverLuck: number;
  /** Close game luck factor */
  closeGameLuck: number;
  /** Team archetype */
  archetype: TeamArchetype;
  /** Anomaly score (0-100, higher = more anomalous) */
  anomalyScore: number;
  /** Array of anomaly flags */
  anomalyFlags: AnomalyFlag[];
  /** Narrative description */
  narrative: string;
}

/**
 * Team clustering result from K-Means
 */
export interface TeamCluster {
  /** Archetype of cluster */
  archetype: TeamArchetype;
  /** Human-readable description */
  description: string;
  /** Team names in this cluster */
  teams: string[];
  /** PCA centroid coordinates (for visualization) */
  centroid: number[];
  /** Characteristic traits */
  characteristics: string[];
}

/**
 * Regression/progression candidate
 */
export interface RegressionCandidate {
  /** Team season profile */
  team: TeamSeasonProfile;
  /** Expected direction: improvement or decline */
  direction: "positive" | "negative";
  /** Expected magnitude of change (wins) */
  magnitude: number;
  /** Reasons for prediction */
  reasons: string[];
  /** Confidence in prediction (0-100) */
  confidence: number;
}

/**
 * Complete team anomaly report
 */
export interface TeamAnomalyReport {
  /** Season year */
  season: number;
  /** All teams analyzed */
  teams: TeamAnomalyEntry[];
  /** Teams with significant luck (actual >> expected) */
  luckyTeams: TeamAnomalyEntry[];
  /** Teams with significant bad luck (actual << expected) */
  unlockyTeams: TeamAnomalyEntry[];
  /** Teams likely to regress/progress next season */
  regressionCandidates: RegressionCandidate[];
  /** Archetype clusters */
  archetypeClusters: TeamCluster[];
  /** Most anomalous teams (top 10) */
  topAnomalies: TeamAnomalyEntry[];
}

// ============================================================================
// PYTHAGOREAN WINS CALCULATION
// ============================================================================

/**
 * Calculate Pythagorean expected wins using CFB-specific exponent
 * Formula: W = PF^2.37 / (PF^2.37 + PA^2.37) * games
 * Exponent 2.37 is calibrated for college football (NFL uses 2.53)
 * @param pointsFor - Total points scored
 * @param pointsAgainst - Total points allowed
 * @param games - Total games played
 * @param exponent - Pythagorean exponent (default 2.37 for CFB)
 * @returns Expected wins
 */
export function calculatePythagoreanWins(
  pointsFor: number,
  pointsAgainst: number,
  games: number,
  exponent: number = 2.37
): number {
  if (pointsAgainst === 0) return games;

  const pfExp = Math.pow(pointsFor, exponent);
  const paExp = Math.pow(pointsAgainst, exponent);
  const expectedWinPct = pfExp / (pfExp + paExp);

  return expectedWinPct * games;
}

/**
 * Analyze luck factor (actual vs. expected wins)
 * @param actualWins - Actual wins achieved
 * @param pythWins - Pythagorean expected wins
 * @param allTeamsLuck - Luck factors of all teams (for percentile)
 * @returns Luck analysis
 */
export function calculateLuckFactor(
  actualWins: number,
  pythWins: number,
  allTeamsLuck: number[] = []
): LuckAnalysis {
  const luckFactor = actualWins - pythWins;

  // Calculate percentile
  let luckPercentile = 50;
  if (allTeamsLuck.length > 0) {
    const betterLuck = allTeamsLuck.filter((l) => l > luckFactor).length;
    luckPercentile = (betterLuck / allTeamsLuck.length) * 100;
  }

  // Determine if significantly lucky/unlucky
  const isLucky = luckFactor > 1.5;
  const isUnlucky = luckFactor < -1.5;

  // Regression prediction: assume regression toward mean
  // Typical regression is 50-70% of luck factor
  const regressionExpected = luckFactor * -0.6;

  return {
    actualWins,
    expectedWins: pythWins,
    luckFactor,
    luckPercentile,
    isLucky,
    isUnlucky,
    regressionExpected,
  };
}

// ============================================================================
// SECOND-ORDER WINS
// ============================================================================

/**
 * Calculate second-order wins (logarithmic margin weighting)
 * Penalizes teams that pad stats in blowouts
 * Margin is compressed: sign(m) * ln(1 + |m|/3)
 * @param gameMargins - Array of game margins (positive = win)
 * @param totalGames - Total games (for handling incomplete seasons)
 * @returns Expected wins based on margin strength
 */
export function calculateSecondOrderWins(
  gameMargins: number[],
  totalGames: number
): number {
  if (gameMargins.length === 0) return 0;

  let winProbabilitySum = 0;

  for (const margin of gameMargins) {
    // Compress margin logarithmically
    const compressedMargin =
      Math.sign(margin) * Math.log(1 + Math.abs(margin) / 3);

    // Convert to win probability using logistic function
    // WP = 1 / (1 + e^(-4*margin/15))
    const winProbability = 1 / (1 + Math.exp(-(4 * compressedMargin) / 15));

    winProbabilitySum += winProbability;
  }

  // Scale to account for incomplete season
  const scaleFactor = gameMargins.length > 0 ? totalGames / gameMargins.length : 1;
  return winProbabilitySum * scaleFactor;
}

// ============================================================================
// TURNOVER REGRESSION
// ============================================================================

/**
 * Predict turnover margin regression
 * Turnover margin has ~1% year-over-year correlation (high variance)
 * @param currentMargin - Current season turnover margin
 * @param gamesPlayed - Games played (fuller season = more certainty)
 * @returns Turnover regression prediction
 */
export function predictTurnoverRegression(
  currentMargin: number,
  gamesPlayed: number
): TurnoverPrediction {
  // Turnover margin has very low persistence
  // Assume 80% regression toward mean (0), adjusted for sample size
  const sampleSizeAdjustment = Math.min(gamesPlayed / 12, 1.0);
  const regressionFactor = 0.8 * sampleSizeAdjustment;

  const expectedRegression = -currentMargin * regressionFactor;
  const predictedMargin = currentMargin + expectedRegression;

  // Confidence: higher with more games played
  const confidence = Math.min(0.95, 0.5 + (gamesPlayed / 12) * 0.45);

  return {
    currentMargin,
    expectedRegression,
    predictedMargin,
    confidence,
  };
}

// ============================================================================
// FIVE FACTORS PROFILE
// ============================================================================

/**
 * Calculate Five Factors profile (offense + defense, 5 dimensions each)
 * SP+-style factors normalized across level
 * @param team - Team season profile
 * @returns Five Factors profile with 10-dimensional vector
 */
export function calculateFiveFactors(
  team: TeamSeasonProfile
): FiveFactorsProfile {
  const vectors: number[] = [];

  // Offensive factors
  vectors.push(team.offenseEPA); // 0: Offensive efficiency
  vectors.push(team.explosiveness); // 1: Offensive explosiveness
  vectors.push(team.fieldPosition); // 2: Offensive field position
  vectors.push(team.finishingDrives); // 3: Offensive finishing drives
  vectors.push(team.turnoverMargin * 0.5); // 4: Offensive turnovers

  // Defensive factors
  vectors.push(-team.defenseEPA); // 5: Defensive efficiency (inverted)
  vectors.push(1 - team.explosiveness); // 6: Defensive explosiveness (inverted)
  vectors.push(1 - team.fieldPosition); // 7: Defensive field position (inverted)
  vectors.push(1 - team.finishingDrives); // 8: Defensive finishing drives (inverted)
  vectors.push(team.turnoverMargin * 0.5); // 9: Defensive turnovers

  // Normalize vectors to 0-1 range (simplified)
  const normalizedVectors = vectors.map((v) => {
    // Sigmoid normalization to 0-1
    return 1 / (1 + Math.exp(-v));
  });

  return {
    offenseEfficiency: normalizedVectors[0],
    offenseExplosiveness: normalizedVectors[1],
    offenseFieldPosition: normalizedVectors[2],
    offenseFinishingDrives: normalizedVectors[3],
    offenseTurnovers: normalizedVectors[4],
    defenseEfficiency: normalizedVectors[5],
    defenseExplosiveness: normalizedVectors[6],
    defenseFieldPosition: normalizedVectors[7],
    defenseFinishingDrives: normalizedVectors[8],
    defenseTurnovers: normalizedVectors[9],
    vectors: normalizedVectors,
  };
}

// ============================================================================
// TEAM ARCHETYPE IDENTIFICATION
// ============================================================================

/**
 * Identify team archetype from Five Factors profile
 * @param fiveFactors - Five Factors profile
 * @returns Team archetype classification
 */
export function identifyArchetype(fiveFactors: FiveFactorsProfile): TeamArchetype {
  // Calculate offense and defense strength
  const offenseStrength =
    (fiveFactors.offenseEfficiency +
      fiveFactors.offenseExplosiveness +
      fiveFactors.offenseFieldPosition) /
    3;
  const defenseStrength =
    (fiveFactors.defenseEfficiency +
      fiveFactors.defenseExplosiveness +
      fiveFactors.defenseFieldPosition) /
    3;

  const turnoverImpact = fiveFactors.offenseTurnovers; // Positive = good

  // Determine archetype based on factor strengths
  const offenseElite = offenseStrength > 0.65;
  const defenseElite = defenseStrength > 0.65;
  const turnoverLucky = turnoverImpact > 0.65;
  const balanced = Math.abs(offenseStrength - defenseStrength) < 0.1;

  if (offenseElite && defenseElite) {
    return "balanced-elite";
  }

  if (offenseElite && !defenseElite && balanced) {
    return "offensive-juggernaut";
  }

  if (defenseElite && !offenseElite && balanced) {
    return "defensive-fortress";
  }

  if (turnoverLucky && !offenseElite && !defenseElite) {
    return "turnover-lucky";
  }

  if (offenseStrength > 0.55 && defenseStrength > 0.55 && balanced) {
    return "close-game-warriors";
  }

  if (offenseStrength < 0.45 && defenseStrength < 0.45) {
    return "paper-tigers";
  }

  if (offenseStrength > defenseStrength && offenseStrength > 0.6) {
    return "overachievers";
  }

  if (defenseStrength > offenseStrength && defenseStrength > 0.6) {
    return "underachievers";
  }

  return "balanced-average";
}

// ============================================================================
// K-MEANS CLUSTERING (Simplified)
// ============================================================================

/**
 * Euclidean distance between two points
 */
function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

/**
 * Calculate centroid of cluster
 */
function calculateCentroid(points: number[][]): number[] {
  if (points.length === 0) return [];
  const dims = points[0].length;
  const centroid: number[] = Array(dims).fill(0);

  for (const point of points) {
    for (let d = 0; d < dims; d++) {
      centroid[d] += point[d];
    }
  }

  for (let d = 0; d < dims; d++) {
    centroid[d] /= points.length;
  }

  return centroid;
}

/**
 * K-Means++ initialization (smart centroid seeding)
 */
function kmeansInitialize(data: number[][], k: number): number[][] {
  const centroids: number[][] = [];
  const n = data.length;

  if (n === 0) return centroids;

  // Choose first centroid randomly
  centroids.push([...data[Math.floor(Math.random() * n)]]);

  // Choose remaining k-1 centroids
  for (let i = 1; i < k && i < n; i++) {
    const distances = data.map((point) => {
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = euclideanDistance(point, centroid);
        minDist = Math.min(minDist, dist);
      }
      return minDist * minDist; // D(x)^2
    });

    const totalDist = distances.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalDist;

    for (let j = 0; j < n; j++) {
      random -= distances[j];
      if (random <= 0) {
        centroids.push([...data[j]]);
        break;
      }
    }
  }

  return centroids;
}

/**
 * K-Means clustering on Five Factors data
 * Simplified implementation (100 iterations max, 0.001 convergence threshold)
 */
function kmeansCluster(
  data: number[][],
  k: number
): {
  centroids: number[][];
  clusters: number[][];
  iterations: number;
} {
  if (data.length === 0 || k === 0) {
    return { centroids: [], clusters: [], iterations: 0 };
  }

  let centroids = kmeansInitialize(data, Math.min(k, data.length));
  let clusters: number[][] = Array(centroids.length)
    .fill(null)
    .map(() => []);

  let iterations = 0;
  const maxIterations = 100;
  const convergenceThreshold = 0.001;

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign points to nearest centroid
    clusters = Array(centroids.length)
      .fill(null)
      .map(() => []);

    for (let i = 0; i < data.length; i++) {
      let nearestCentroid = 0;
      let nearestDist = Infinity;

      for (let c = 0; c < centroids.length; c++) {
        const dist = euclideanDistance(data[i], centroids[c]);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestCentroid = c;
        }
      }

      clusters[nearestCentroid].push(i);
    }

    // Calculate new centroids
    const newCentroids: number[][] = [];
    for (let c = 0; c < centroids.length; c++) {
      const clusterPoints = clusters[c].map((idx) => data[idx]);
      newCentroids.push(calculateCentroid(clusterPoints));
    }

    // Check convergence
    let maxMovement = 0;
    for (let c = 0; c < centroids.length; c++) {
      const movement = euclideanDistance(centroids[c], newCentroids[c]);
      maxMovement = Math.max(maxMovement, movement);
    }

    centroids = newCentroids;
    iterations = iter + 1;

    if (maxMovement < convergenceThreshold) break;
  }

  return { centroids, clusters, iterations };
}

// ============================================================================
// MAIN ANOMALY DETECTION ENGINE
// ============================================================================

/**
 * Identify regression/progression candidates
 * @param teams - Array of team season profiles
 * @returns Regression candidates
 */
export function identifyRegressionCandidates(
  teams: TeamSeasonProfile[]
): RegressionCandidate[] {
  const candidates: RegressionCandidate[] = [];

  for (const team of teams) {
    const luck = calculateLuckFactor(team.wins,
      calculatePythagoreanWins(team.pointsFor, team.pointsAgainst, team.wins + team.losses));
    const turnoverPred = predictTurnoverRegression(team.turnoverMargin, team.wins + team.losses);

    let direction: "positive" | "negative" = "negative";
    let magnitude = 0;
    const reasons: string[] = [];
    let confidence = 0;

    if (luck.isLucky) {
      direction = "negative";
      magnitude = Math.abs(luck.regressionExpected);
      reasons.push(`Lucky +${luck.luckFactor.toFixed(1)} win overperformance`);
      confidence += 40;
    }

    if (luck.isUnlucky) {
      direction = "positive";
      magnitude = Math.abs(luck.regressionExpected);
      reasons.push(`Unlucky ${luck.luckFactor.toFixed(1)} win underperformance`);
      confidence += 40;
    }

    if (Math.abs(turnoverPred.expectedRegression) > 1) {
      if (turnoverPred.expectedRegression > 0) {
        reasons.push("Positive turnover regression expected");
      } else {
        reasons.push("Negative turnover regression expected");
      }
      confidence += 30;
    }

    if (reasons.length > 0) {
      candidates.push({
        team,
        direction,
        magnitude: Math.round(magnitude * 10) / 10,
        reasons,
        confidence: Math.min(confidence, 100),
      });
    }
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Main team anomaly detection function
 * Analyzes team season profiles for statistical anomalies
 * @param teams - Array of team season profiles
 * @returns Complete anomaly report
 */
export function detectTeamAnomalies(
  teams: TeamSeasonProfile[]
): TeamAnomalyReport {
  const anomalyEntries: TeamAnomalyEntry[] = [];

  // Pre-calculate all luck factors for percentile calculation
  const allLuckFactors: number[] = [];

  for (const team of teams) {
    const games = team.wins + team.losses;
    const pythWins = calculatePythagoreanWins(
      team.pointsFor,
      team.pointsAgainst,
      games
    );
    const luckFactor = team.wins - pythWins;
    allLuckFactors.push(luckFactor);
  }

  // Process each team
  for (const team of teams) {
    const games = team.wins + team.losses;

    // Calculate metrics
    const pythWins = calculatePythagoreanWins(
      team.pointsFor,
      team.pointsAgainst,
      games
    );
    const luck = calculateLuckFactor(team.wins, pythWins, allLuckFactors);
    const secondOrderWins = calculateSecondOrderWins(team.gameMargins, games);
    const turnoverPred = predictTurnoverRegression(team.turnoverMargin, games);
    const fiveFactors = calculateFiveFactors(team);
    const archetype = identifyArchetype(fiveFactors);

    // Calculate close game luck (win % in close games vs. expected)
    const closeGames = team.closeGameRecord.wins + team.closeGameRecord.losses;
    const closeGameWinPct =
      closeGames > 0 ? team.closeGameRecord.wins / closeGames : 0.5;
    const closeGameLuck = closeGameWinPct > 0.6 ? closeGameWinPct - 0.5 : 0; // Positive if winning close games at high rate

    // Build anomaly flags
    const anomalyFlags: AnomalyFlag[] = [];
    let anomalyScore = 0;

    if (luck.isLucky) {
      anomalyFlags.push({
        type: "luck",
        severity: "high",
        description: `Significantly outperformed Pythagorean expectation (${luck.luckFactor.toFixed(1)} wins)`,
        metric: luck.luckFactor,
      });
      anomalyScore += 25;
    }

    if (luck.isUnlucky) {
      anomalyFlags.push({
        type: "luck",
        severity: "high",
        description: `Significantly underperformed Pythagorean expectation (${luck.luckFactor.toFixed(1)} wins)`,
        metric: luck.luckFactor,
      });
      anomalyScore += 25;
    }

    if (Math.abs(turnoverPred.expectedRegression) > 1) {
      anomalyFlags.push({
        type: "turnover",
        severity: "medium",
        description: `Extreme turnover margin (${team.turnoverMargin}) likely to regress`,
        metric: team.turnoverMargin,
      });
      anomalyScore += 20;
    }

    if (closeGameLuck > 0.08) {
      anomalyFlags.push({
        type: "close-games",
        severity: "medium",
        description: `Winning ${(closeGameWinPct * 100).toFixed(0)}% of close games`,
        metric: closeGameWinPct,
      });
      anomalyScore += 15;
    }

    if (team.explosiveness > 0.6 && team.offenseEPA < 0.1) {
      anomalyFlags.push({
        type: "explosiveness",
        severity: "medium",
        description: "High explosiveness but low overall efficiency",
        metric: team.explosiveness,
      });
      anomalyScore += 10;
    }

    if (team.offenseEPA > 0.2 && team.defenseEPA > 0.1) {
      anomalyFlags.push({
        type: "efficiency-mismatch",
        severity: "low",
        description: "Efficiency metrics don't align with win-loss record",
        metric: team.offenseEPA - team.defenseEPA,
      });
      anomalyScore += 5;
    }

    // Generate narrative
    const narrative = generateTeamNarrative(team, archetype, luck, anomalyFlags);

    anomalyEntries.push({
      team,
      pythagoreanWins: Math.round(pythWins * 10) / 10,
      luckFactor: Math.round(luck.luckFactor * 10) / 10,
      secondOrderWins: Math.round(secondOrderWins * 10) / 10,
      turnoverLuck: team.turnoverMargin,
      closeGameLuck,
      archetype,
      anomalyScore: Math.min(anomalyScore, 100),
      anomalyFlags,
      narrative,
    });
  }

  // Separate lucky and unlucky teams
  const luckyTeams = anomalyEntries
    .filter((e) => e.luckFactor > 1.5)
    .sort((a, b) => b.luckFactor - a.luckFactor);

  const unlockyTeams = anomalyEntries
    .filter((e) => e.luckFactor < -1.5)
    .sort((a, b) => a.luckFactor - b.luckFactor);

  // Get regression candidates
  const regressionCandidates = identifyRegressionCandidates(teams);

  // Cluster teams by archetype
  const fiveFactorsData = anomalyEntries.map((e) =>
    calculateFiveFactors(e.team).vectors
  );

  const archetypeClusters = clusterTeams(anomalyEntries);

  // Top anomalies (highest anomaly score)
  const topAnomalies = anomalyEntries
    .sort((a, b) => b.anomalyScore - a.anomalyScore)
    .slice(0, 10);

  return {
    season: teams[0]?.season || (new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1),
    teams: anomalyEntries.sort(
      (a, b) => b.anomalyScore - a.anomalyScore
    ),
    luckyTeams,
    unlockyTeams,
    regressionCandidates,
    archetypeClusters,
    topAnomalies,
  };
}

/**
 * Cluster teams by archetype using simplified K-Means
 */
function clusterTeams(anomalyEntries: TeamAnomalyEntry[]): TeamCluster[] {
  const clusters: TeamCluster[] = [];
  const archetypeMap: Record<TeamArchetype, TeamAnomalyEntry[]> = {} as Record<
    TeamArchetype,
    TeamAnomalyEntry[]
  >;

  // Group by archetype
  for (const entry of anomalyEntries) {
    if (!archetypeMap[entry.archetype]) {
      archetypeMap[entry.archetype] = [];
    }
    archetypeMap[entry.archetype].push(entry);
  }

  // Create cluster for each archetype
  const archetypeDescriptions: Record<TeamArchetype, string> = {
    "balanced-elite": "Elite teams with balanced offense and defense",
    "offensive-juggernaut": "Teams relying on explosive offensive play",
    "defensive-fortress": "Teams built on dominant defensive performance",
    "turnover-lucky": "Teams with exceptional turnover margins",
    "close-game-warriors": "Teams that perform well in tight contests",
    "paper-tigers": "Teams with weak metrics across the board",
    overachievers: "Teams outperforming their talent level",
    underachievers: "Teams underperforming relative to their skill",
    "balanced-average": "Teams with average performance across factors",
    rebuilding: "Teams in transition with mixed metrics",
  };

  for (const [archetype, teams] of Object.entries(archetypeMap)) {
    const teamNames = teams.map((e) => e.team.teamName);
    const centroid = teams.length > 0
      ? calculateFiveFactorsCentroid(
          teams.map((e) => calculateFiveFactors(e.team).vectors)
        )
      : [];

    clusters.push({
      archetype: archetype as TeamArchetype,
      description:
        archetypeDescriptions[archetype as TeamArchetype] || "Unknown archetype",
      teams: teamNames,
      centroid,
      characteristics: getArchetypeCharacteristics(archetype as TeamArchetype),
    });
  }

  return clusters;
}

/**
 * Calculate centroid of Five Factors vectors
 */
function calculateFiveFactorsCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dims = vectors[0].length;
  const centroid: number[] = Array(dims).fill(0);

  for (const vector of vectors) {
    for (let d = 0; d < dims; d++) {
      centroid[d] += vector[d];
    }
  }

  for (let d = 0; d < dims; d++) {
    centroid[d] /= vectors.length;
  }

  return centroid;
}

/**
 * Get characteristic traits of an archetype
 */
function getArchetypeCharacteristics(archetype: TeamArchetype): string[] {
  const characteristics: Record<TeamArchetype, string[]> = {
    "balanced-elite": [
      "Top-10 offense",
      "Top-10 defense",
      "Consistent performance",
    ],
    "offensive-juggernaut": [
      "Explosive passing game",
      "High scoring",
      "Weak defense",
    ],
    "defensive-fortress": [
      "Lockdown defense",
      "Low scoring allowed",
      "Offensive struggles",
    ],
    "turnover-lucky": [
      "Positive TO margin",
      "Turnover dependent",
      "Regression risk",
    ],
    "close-game-warriors": [
      "Competitive in tight games",
      "Clutch performance",
      "Could be lucky or skilled",
    ],
    "paper-tigers": [
      "Poor efficiency",
      "Weak both ways",
      "Likely basement dweller",
    ],
    overachievers: [
      "Outperforming talent",
      "Good coaching impact",
      "Difficult to repeat",
    ],
    underachievers: [
      "Underperforming talent",
      "Execution issues",
      "Upside potential",
    ],
    "balanced-average": [
      "Middle-of-road offense",
      "Middle-of-road defense",
      "Median performance",
    ],
    rebuilding: [
      "Inconsistent metrics",
      "Talent transitioning",
      "Hard to predict",
    ],
  };

  return characteristics[archetype] || ["Unknown characteristics"];
}

/**
 * Generate narrative for team anomaly
 */
function generateTeamNarrative(
  team: TeamSeasonProfile,
  archetype: TeamArchetype,
  luck: LuckAnalysis,
  flags: AnomalyFlag[]
): string {
  let narrative = `${team.teamName} (${team.wins}-${team.losses}) is a ${archetype} team`;

  if (luck.isLucky) {
    narrative += ` that has overperformed its Pythagorean expectation`;
  } else if (luck.isUnlucky) {
    narrative += ` that has underperformed its Pythagorean expectation`;
  }

  if (flags.length > 0) {
    const topFlag = flags[0];
    narrative += `. Key anomaly: ${topFlag.description.toLowerCase()}`;
  }

  narrative += `.`;

  return narrative;
}
