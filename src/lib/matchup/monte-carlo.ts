/**
 * Monte Carlo Matchup Simulation Engine
 *
 * Powers the Matchup Machine feature where users pick any 2 teams and get
 * rich simulated predictions using Glicko-2 ratings.
 *
 * Algorithm:
 * 1. Calculate expected win probability using Glicko-2 expected score function
 * 2. Apply home field advantage adjustment (if applicable)
 * 3. For each simulation:
 *    - Draw outcome (win/loss) based on Glicko-2 probabilities
 *    - Generate scores using Poisson mixture model (TDs + FGs + Safeties)
 *    - Simulate overtime if game ends in tie
 * 4. Aggregate results: win prob, spreads, score distributions, scenario probabilities
 * 5. Generate ESPN-style narrative with key insights
 *
 * References:
 * - Glickman, M. (2013). "Glicko-2 Rating System"
 * - Box-Muller transform for normal distribution sampling
 * - Poisson distribution for scoring events
 */

import { MONTE_CARLO, BASE_HFA } from "@/lib/utils/constants";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface MatchupTeam {
  /** Team name */
  name: string;
  /** Glicko-2 rating (μ) - team strength */
  rating: number;
  /** Rating deviation (RD) - uncertainty in rating */
  rd: number;
  /** Team level (FBS, FCS, D2, D3, NAIA) */
  level: "FBS" | "FCS" | "D2" | "D3" | "NAIA";
  /** Offensive rating (optional, for narrative analysis) */
  offenseRating?: number;
  /** Defensive rating (optional, for narrative analysis) */
  defenseRating?: number;
}

export interface MatchupInput {
  /** Team A details */
  teamA: MatchupTeam;
  /** Team B details */
  teamB: MatchupTeam;
  /** Game location context */
  location: "teamA_home" | "teamB_home" | "neutral";
  /** Home field advantage in points (default: BASE_HFA = 2.75) */
  hfaPoints?: number;
  /** Number of Monte Carlo simulations (default: 10000) */
  simulations?: number;
  /** Score distribution model: "poisson" (default) or "normal" */
  model?: "poisson" | "normal";
}

/** Single game simulation result */
interface GameSimulation {
  scoreA: number;
  scoreB: number;
  margin: number;
  aWon: boolean;
  overtime: boolean;
}

/** Score frequency in simulations */
export interface ScoreFrequency {
  scoreA: number;
  scoreB: number;
  count: number;
  percentage: number;
}

/** Spread distribution bucket */
export interface SpreadBucket {
  range: string;
  count: number;
  percentage: number;
}

/** Score distribution statistics */
export interface ScoreDistribution {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

/** Key matchup factor analysis */
export interface MatchupFactor {
  factor: string;
  advantage: "A" | "B" | "even";
  magnitude: number; // 0-100 scale
  description: string;
}

/** Rich narrative summary */
export interface MatchupNarrative {
  headline: string;
  summary: string;
  keyInsight: string;
  upsetScenario: string | null;
  confidenceLevel: "very high" | "high" | "moderate" | "low" | "toss-up";
}

export interface MatchupResult {
  /** Win probability for team A (0-1) */
  teamAWinProbability: number;
  /** Win probability for team B (0-1) */
  teamBWinProbability: number;
  /** Predicted spread (positive = team A favored) */
  predictedSpread: number;
  /** 90% confidence interval on spread */
  spreadConfidenceInterval: { low: number; high: number };
  /** Average margin of victory (positive = team A favored) */
  averageMargin: number;
  /** Median margin */
  medianMargin: number;
  /** Average combined score */
  averageTotal: number;
  /** Team A score distribution */
  teamAScoreDistribution: ScoreDistribution;
  /** Team B score distribution */
  teamBScoreDistribution: ScoreDistribution;
  /** Spread distribution histogram */
  spreadDistribution: SpreadBucket[];
  /** Most common final scores */
  mostLikelyScores: ScoreFrequency[];
  /** Probability of close game (within 7 points) */
  closeGameProbability: number;
  /** Probability of blowout (margin > 21) */
  blowoutProbability: number;
  /** Probability of overtime-eligible game (within 3 points) */
  overtimeProbability: number;
  /** Actual overtime rate from simulations */
  overtimeRate: number;
  /** Probability of upset (underdog wins) */
  upsetRate: number;
  /** First 100 sample results for visualization */
  sampleResults: GameSimulation[];
  /** Key matchup factors */
  matchupFactors: MatchupFactor[];
  /** Rich narrative analysis */
  narrative: MatchupNarrative;
  /** Metadata about the simulation */
  metadata: {
    simulations: number;
    executionTimeMs: number;
    hfaApplied: number;
    ratingDifferential: number;
    modelUsed: "poisson" | "normal";
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** League average score per team */
const LEAGUE_AVG_SCORE = 26.5;

/** Score standard deviation (college football empirical ~13.86 pts) */
const SCORE_STDDEV = 13.86;

/** Base home field advantage in points */
const HFA_POINTS = 2.75;

/** Poisson model: average TDs per team */
const TD_LAMBDA_BASE = 3.5;

/** Poisson model: average FGs per team */
const FG_LAMBDA_BASE = 1.2;

/** Poisson model: safety probability per game */
const SAFETY_PROB = 0.02;

/** Poisson model: points for touchdown */
const TD_POINTS = 7;

/** Poisson model: points for field goal */
const FG_POINTS = 3;

/** Poisson model: points for safety */
const SAFETY_POINTS = 2;

/** OT possession probability of scoring */
const OT_SCORE_PROB = 0.60;

/** Spread buckets: 3-point increments */
const SPREAD_BUCKETS_CONFIG = [
  { label: "A by 21+", min: 21, max: Infinity },
  { label: "A by 18-20", min: 18, max: 20 },
  { label: "A by 15-17", min: 15, max: 17 },
  { label: "A by 12-14", min: 12, max: 14 },
  { label: "A by 9-11", min: 9, max: 11 },
  { label: "A by 6-8", min: 6, max: 8 },
  { label: "A by 3-5", min: 3, max: 5 },
  { label: "A by 1-2", min: 1, max: 2 },
  { label: "Pick", min: -0.5, max: 0.5 },
  { label: "B by 1-2", min: -2, max: -1 },
  { label: "B by 3-5", min: -5, max: -3 },
  { label: "B by 6-8", min: -8, max: -6 },
  { label: "B by 9-11", min: -11, max: -9 },
  { label: "B by 12-14", min: -14, max: -12 },
  { label: "B by 15-17", min: -17, max: -15 },
  { label: "B by 18-20", min: -20, max: -18 },
  { label: "B by 21+", min: -Infinity, max: -21 },
] as const;

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Simulate a matchup between two teams using Monte Carlo methods.
 *
 * Generates 10,000 simulated games with realistic scoring distributions,
 * and aggregates results into win probabilities, spreads, and scenario probabilities.
 *
 * @param input - Matchup configuration with team ratings and location
 * @returns Complete simulation results with probability distributions and narrative
 *
 * @example
 * const result = simulateMatchup({
 *   teamA: { name: "Ohio State", rating: 1796, rd: 32, level: "FBS" },
 *   teamB: { name: "Michigan", rating: 1742, rd: 38, level: "FBS" },
 *   location: "teamA_home",
 *   simulations: 10000,
 *   model: "poisson",
 * });
 */
export function simulateMatchup(input: MatchupInput): MatchupResult {
  const startTime = performance.now();

  const {
    teamA,
    teamB,
    location,
    hfaPoints = HFA_POINTS,
    simulations = MONTE_CARLO.SIMULATIONS,
    model = "poisson",
  } = input;

  // Calculate home field advantage to apply
  const hfaApplied = calculateHFA(location, hfaPoints);

  // Calculate win probability using Glicko-2 expected score
  const aWinProb = calculateWinProbability(
    teamA.rating,
    teamA.rd,
    teamB.rating,
    teamB.rd,
    hfaApplied
  );
  const bWinProb = 1 - aWinProb;

  // Run Monte Carlo simulations
  const simResults: GameSimulation[] = [];
  for (let i = 0; i < simulations; i++) {
    simResults.push(simulateSingleGame(teamA, teamB, hfaApplied, model));
  }

  // Extract data from results
  const scoresA = simResults.map((r) => r.scoreA);
  const scoresB = simResults.map((r) => r.scoreB);
  const margins = simResults.map((r) => r.margin);
  const totals = simResults.map((r) => r.scoreA + r.scoreB);

  // Calculate score distributions
  const distA = calculateScoreDistribution(scoresA);
  const distB = calculateScoreDistribution(scoresB);

  // Calculate scenario probabilities
  const closeProbability = simResults.filter((r) => Math.abs(r.margin) <= 7).length / simulations;
  const blowoutProbability = simResults.filter((r) => Math.abs(r.margin) > 21).length / simulations;
  const otProbability = simResults.filter((r) => Math.abs(r.margin) <= 3).length / simulations;
  const otActualRate = simResults.filter((r) => r.overtime).length / simulations;
  const upsetProbability = aWinProb > 0.5
    ? simResults.filter((r) => r.aWon === false).length / simulations
    : simResults.filter((r) => r.aWon === true).length / simulations;

  // Calculate spread statistics
  const sortedMargins = [...margins].sort((a, b) => a - b);
  const medianIdx = Math.floor(simulations / 2);
  const spreadCI = {
    low: sortedMargins[Math.floor(simulations * 0.05)],
    high: sortedMargins[Math.ceil(simulations * 0.95)],
  };

  // Calculate predicted spread (mean margin, A perspective)
  const predictedSpread = margins.reduce((a, b) => a + b, 0) / simulations;
  const medianMargin = sortedMargins[medianIdx];
  const averageTotal = totals.reduce((a, b) => a + b, 0) / simulations;

  // Build spread distribution histogram
  const spreadDist = buildSpreadDistribution(margins);

  // Find most likely scores
  const likelyScores = findMostLikelyScores(simResults);

  // Calculate matchup factors
  const factors = calculateMatchupFactors(teamA, teamB, hfaApplied, aWinProb);

  // Generate narrative
  const narrative = generateNarrative({
    teamA,
    teamB,
    aWinProb,
    bWinProb,
    predictedSpread,
    averageTotal,
    closeProbability,
    blowoutProbability,
    upsetProbability,
    hfaAdjustment: hfaApplied,
    factors,
  });

  const executionTime = performance.now() - startTime;

  return {
    teamAWinProbability: aWinProb,
    teamBWinProbability: bWinProb,
    predictedSpread,
    spreadConfidenceInterval: spreadCI,
    averageMargin: predictedSpread,
    medianMargin,
    averageTotal,
    teamAScoreDistribution: distA,
    teamBScoreDistribution: distB,
    spreadDistribution: spreadDist,
    mostLikelyScores: likelyScores,
    closeGameProbability: closeProbability,
    blowoutProbability: blowoutProbability,
    overtimeProbability: otProbability,
    overtimeRate: otActualRate,
    upsetRate: upsetProbability,
    sampleResults: simResults.slice(0, 100),
    matchupFactors: factors,
    narrative,
    metadata: {
      simulations,
      executionTimeMs: Math.round(executionTime),
      hfaApplied,
      ratingDifferential: teamA.rating - teamB.rating,
      modelUsed: model,
    },
  };
}

/**
 * Simulate a single game between two teams.
 *
 * Generates realistic scoring outcomes using either Poisson mixture or normal distribution,
 * and simulates overtime if the game ends tied.
 *
 * @param teamA - Team A details
 * @param teamB - Team B details
 * @param hfaAdjustment - Home field advantage applied (in rating points)
 * @param model - Scoring model: "poisson" (default) or "normal"
 * @returns Single game simulation result with scores and outcome
 */
export function simulateSingleGame(
  teamA: MatchupTeam,
  teamB: MatchupTeam,
  hfaAdjustment: number,
  model: "poisson" | "normal" = "poisson"
): GameSimulation {
  let scoreA: number;
  let scoreB: number;

  if (model === "poisson") {
    scoreA = poissonScoreModel(teamA.rating, teamB.rating, true, hfaAdjustment);
    scoreB = poissonScoreModel(teamB.rating, teamA.rating, false, -hfaAdjustment);
  } else {
    scoreA = normalScoreModel(teamA.rating, teamB.rating, true, hfaAdjustment);
    scoreB = normalScoreModel(teamB.rating, teamA.rating, false, -hfaAdjustment);
  }

  // Handle overtime if tied
  let overtime = false;
  if (scoreA === scoreB) {
    overtime = true;
    const otResult = simulateOvertime(teamA, teamB, hfaAdjustment);
    scoreA += otResult.scoreA;
    scoreB += otResult.scoreB;
  }

  return {
    scoreA: Math.max(0, Math.round(scoreA)),
    scoreB: Math.max(0, Math.round(scoreB)),
    margin: Math.round(scoreA - scoreB),
    aWon: scoreA > scoreB,
    overtime,
  };
}

/**
 * Generate score using Poisson mixture model (TDs + FGs + Safeties).
 *
 * Realistic college football scoring distribution based on:
 * - Touchdowns: Poisson(λ_td) derived from rating difference
 * - Field Goals: Poisson(λ_fg)
 * - Safeties: Bernoulli(0.02)
 * - Two-point conversions applied to TDs
 *
 * @param ownRating - Team's Glicko-2 rating
 * @param oppRating - Opponent's rating
 * @param isHome - Whether this is the home team
 * @param hfaAdjustment - Home field advantage in points
 * @returns Team's simulated score
 */
export function poissonScoreModel(
  ownRating: number,
  oppRating: number,
  isHome: boolean,
  hfaAdjustment: number
): number {
  const ratingDiff = ownRating - oppRating;
  const ratioAdjustment = (ratingDiff + (isHome ? hfaAdjustment : 0)) / 300;

  // Poisson lambdas scale with rating difference
  const tdLambda = Math.max(1, TD_LAMBDA_BASE * (1 + ratioAdjustment * 0.3));
  const fgLambda = Math.max(0.3, FG_LAMBDA_BASE * (1 + ratioAdjustment * 0.2));

  // Draw scoring events
  const tds = poissonSample(tdLambda);
  const fgs = poissonSample(fgLambda);
  const safeties = Math.random() < SAFETY_PROB ? 1 : 0;

  // Two-point conversions: assume ~45% success rate on TDs
  const conversions = Math.floor(tds * 0.45);
  const extraPoints = (tds - conversions) * 1; // PATs

  return tds * TD_POINTS + (extraPoints - conversions) + fgs * FG_POINTS + safeties * SAFETY_POINTS;
}

/**
 * Generate score using normal distribution model.
 *
 * Simpler model using normal distribution centered on expected margin.
 * Good for computational efficiency or when you don't need extreme realism.
 *
 * @param ownRating - Team's rating
 * @param oppRating - Opponent's rating
 * @param isHome - Whether home team
 * @param hfaAdjustment - Home field advantage in points
 * @returns Team's simulated score
 */
export function normalScoreModel(
  ownRating: number,
  oppRating: number,
  isHome: boolean,
  hfaAdjustment: number
): number {
  // Calculate expected margin using logistic function
  const adjustedRating = ownRating + (isHome ? hfaAdjustment : 0);
  const ratingDiff = adjustedRating - oppRating;
  const expectedMargin = (ratingDiff / 300) * 20; // Rough conversion to points

  // Generate margin with noise
  const noiseMargin = expectedMargin + gaussianRandom() * 14;

  // Generate total score
  const totalScore = LEAGUE_AVG_SCORE * 2 + gaussianRandom() * 10;

  // Derive team score from margin and total
  const score = (totalScore + noiseMargin) / 2;
  return Math.max(0, score);
}

/**
 * Simulate CFB overtime (each team gets possession from 25-yard line).
 *
 * Models CFB 2OT+ rules where both teams run plays until one scores more.
 * Starting 2024: 2-point conversions after 2nd OT.
 *
 * @param teamA - Team A
 * @param teamB - Team B
 * @param hfaAdjustment - Home field advantage
 * @returns OT scores for each team
 */
export function simulateOvertime(
  teamA: MatchupTeam,
  teamB: MatchupTeam,
  hfaAdjustment: number
): { scoreA: number; scoreB: number } {
  let scoreA = 0;
  let scoreB = 0;
  let otPeriod = 1;

  while (scoreA === scoreB) {
    // Team A possession (25-yard line)
    const aScores = Math.random() < OT_SCORE_PROB;
    if (aScores) {
      scoreA += otPeriod === 1 ? 7 : 6; // 2pt conversion after 1st OT
    }

    // Team B possession
    const bScores = Math.random() < OT_SCORE_PROB;
    if (bScores) {
      scoreB += otPeriod === 1 ? 7 : 6;
    }

    // If neither scores, continue; if both score, continue to next OT
    if (!aScores && !bScores) {
      break; // Both punt (rare but possible)
    }

    otPeriod++;
    if (otPeriod > 5) break; // Safety break (5+ OTs are extremely rare)
  }

  return { scoreA, scoreB };
}

/**
 * Calculate win probability for team A using Glicko-2 expected score.
 *
 * Incorporates rating uncertainty (RD) into win probability calculation.
 * Uses the expected outcome formula:
 * E = 1 / (1 + 10^(-(μ_a - μ_b) / (400 * sqrt(1 + 3*(RD_a² + RD_b²) / π²))))
 *
 * @param ratingA - Team A Glicko-2 rating (μ)
 * @param rdA - Team A rating deviation
 * @param ratingB - Team B rating
 * @param rdB - Team B rating deviation
 * @param hfaAdjustment - Home field advantage in rating points
 * @returns Win probability for team A (0-1)
 */
export function calculateWinProbability(
  ratingA: number,
  rdA: number,
  ratingB: number,
  rdB: number,
  hfaAdjustment: number = 0
): number {
  // Adjust team A rating for home field advantage
  // ~2.5 HFA points ≈ 12.5 rating points (173.7178 scale)
  const adjustedRatingA = ratingA + (hfaAdjustment * 173.7178) / 2.5;

  // Glicko-2 g(RD) function: accounts for rating uncertainty
  const PI = Math.PI;
  const gRdA = 1 / Math.sqrt(1 + (3 * rdA * rdA) / (PI * PI));
  const gRdB = 1 / Math.sqrt(1 + (3 * rdB * rdB) / (PI * PI));

  // Combined effective RD
  const effectiveRd = Math.sqrt(gRdA * gRdA + gRdB * gRdB);

  // Expected outcome using logistic function
  const ratingDiff = adjustedRatingA - ratingB;
  const exponent = -(effectiveRd * ratingDiff) / 400;
  const expectedOutcome = 1 / (1 + Math.pow(10, exponent));

  return Math.max(0.001, Math.min(0.999, expectedOutcome));
}

/**
 * Calculate matchup factors (for narrative generation).
 *
 * Analyzes key aspects of the matchup to highlight in narrative.
 *
 * @param teamA - Team A
 * @param teamB - Team B
 * @param hfaAdjustment - Home field advantage applied
 * @param aWinProb - Team A win probability
 * @returns Array of matchup factors with advantage assignments
 */
function calculateMatchupFactors(
  teamA: MatchupTeam,
  teamB: MatchupTeam,
  hfaAdjustment: number,
  aWinProb: number
): MatchupFactor[] {
  const factors: MatchupFactor[] = [];

  // Overall strength
  const ratingDiff = teamA.rating - teamB.rating;
  const absRatingDiff = Math.abs(ratingDiff);
  factors.push({
    factor: "Overall Strength",
    advantage: ratingDiff > 0 ? "A" : ratingDiff < 0 ? "B" : "even",
    magnitude: Math.min(100, (absRatingDiff / 200) * 100),
    description:
      ratingDiff > 0
        ? `Team A leads by ${Math.round(absRatingDiff)} rating points`
        : ratingDiff < 0
          ? `Team B leads by ${Math.round(absRatingDiff)} rating points`
          : "Teams are evenly matched",
  });

  // Rating consistency (lower RD = more reliable)
  const rdDiff = teamB.rd - teamA.rd; // Positive = A is more consistent
  factors.push({
    factor: "Rating Consistency",
    advantage: Math.abs(rdDiff) > 10 ? (rdDiff > 0 ? "A" : "B") : "even",
    magnitude: Math.min(100, (Math.abs(rdDiff) / 100) * 100),
    description:
      Math.abs(rdDiff) > 10
        ? `${rdDiff > 0 ? "Team A" : "Team B"} has more reliable performance (lower uncertainty)`
        : "Both teams show similar consistency",
  });

  // Home field advantage
  if (hfaAdjustment !== 0) {
    factors.push({
      factor: "Home Field Advantage",
      advantage: hfaAdjustment > 0 ? "A" : "B",
      magnitude: Math.min(100, (Math.abs(hfaAdjustment) / 5) * 100),
      description: `${hfaAdjustment > 0 ? "Team A" : "Team B"} benefits from home field (${Math.abs(hfaAdjustment).toFixed(1)} pts)`,
    });
  }

  // Offensive advantage (if provided)
  if (teamA.offenseRating !== undefined && teamB.offenseRating !== undefined) {
    const offDiff = teamA.offenseRating - teamB.offenseRating;
    factors.push({
      factor: "Offensive Strength",
      advantage: offDiff > 0 ? "A" : offDiff < 0 ? "B" : "even",
      magnitude: Math.min(100, (Math.abs(offDiff) / 100) * 100),
      description:
        Math.abs(offDiff) > 20
          ? `${offDiff > 0 ? "Team A" : "Team B"} has superior offensive efficiency`
          : "Offensive efficiency is comparable",
    });
  }

  // Defensive advantage (if provided)
  if (teamA.defenseRating !== undefined && teamB.defenseRating !== undefined) {
    const defDiff = teamA.defenseRating - teamB.defenseRating;
    factors.push({
      factor: "Defensive Strength",
      advantage: defDiff > 0 ? "A" : defDiff < 0 ? "B" : "even",
      magnitude: Math.min(100, (Math.abs(defDiff) / 100) * 100),
      description:
        Math.abs(defDiff) > 20
          ? `${defDiff > 0 ? "Team A" : "Team B"} has superior defensive efficiency`
          : "Defensive efficiency is comparable",
    });
  }

  return factors;
}

/**
 * Generate rich narrative for matchup result.
 *
 * Creates ESPN-style copy with headline, summary, and key insights.
 */
function generateNarrative(params: {
  teamA: MatchupTeam;
  teamB: MatchupTeam;
  aWinProb: number;
  bWinProb: number;
  predictedSpread: number;
  averageTotal: number;
  closeProbability: number;
  blowoutProbability: number;
  upsetProbability: number;
  hfaAdjustment: number;
  factors: MatchupFactor[];
}): MatchupNarrative {
  const {
    teamA,
    teamB,
    aWinProb,
    bWinProb,
    predictedSpread,
    averageTotal,
    closeProbability,
    blowoutProbability,
    upsetProbability,
    factors,
  } = params;

  const isFavorite = aWinProb > 0.5;
  const favoriteTeam = isFavorite ? teamA : teamB;
  const underdogTeam = isFavorite ? teamB : teamA;
  const favoriteProb = Math.max(aWinProb, bWinProb) * 100;

  // Confidence level assessment
  let confidenceLevel: "very high" | "high" | "moderate" | "low" | "toss-up";
  if (favoriteProb > 85) {
    confidenceLevel = "very high";
  } else if (favoriteProb > 70) {
    confidenceLevel = "high";
  } else if (favoriteProb > 60) {
    confidenceLevel = "moderate";
  } else if (favoriteProb > 52) {
    confidenceLevel = "low";
  } else {
    confidenceLevel = "toss-up";
  }

  // Build headline
  let headline = "";
  if (confidenceLevel === "very high") {
    headline = `${favoriteTeam.name} Dominates`;
  } else if (confidenceLevel === "high") {
    headline = `${favoriteTeam.name} Expected to Win Convincingly`;
  } else if (confidenceLevel === "moderate") {
    headline = `${favoriteTeam.name} Favored in Close Contest`;
  } else if (confidenceLevel === "low") {
    headline = `Tightly Matched Showdown`;
  } else {
    headline = `Dead Even Battle`;
  }

  // Build summary
  const spreadStr = Math.abs(predictedSpread).toFixed(1);
  const totalStr = Math.round(averageTotal);
  const lines: string[] = [];

  lines.push(
    `${favoriteTeam.name} enters with a commanding ${favoriteProb.toFixed(0)}% win probability ` +
      `(${favoriteTeam.rating.toFixed(0)} ± ${(1.96 * favoriteTeam.rd).toFixed(0)}) over ` +
      `${underdogTeam.name} (${underdogTeam.rating.toFixed(0)} ± ${(1.96 * underdogTeam.rd).toFixed(0)}).`
  );

  lines.push(
    `The Monte Carlo simulation projects a ${spreadStr}-point spread with an expected total around ${totalStr} points. ` +
      `There's a ${closeProbability.toFixed(0)}% chance of a tight finish (within 7 points) and ` +
      `only a ${blowoutProbability.toFixed(0)}% probability of a blowout.`
  );

  // Key insight
  let keyInsight = "";
  if (upsetProbability > 0.35) {
    keyInsight =
      `The upset potential is meaningful here — ${underdogTeam.name} has a ` +
      `${(upsetProbability * 100).toFixed(0)}% chance to pull off the upset based on rating distribution.`;
  } else if (closeProbability > 0.5) {
    keyInsight =
      `Expect a tight contest: over half of simulations end with a 7-point margin or less, ` +
      `suggesting the rating gap doesn't guarantee a runaway victory.`;
  } else {
    keyInsight =
      `${favoriteTeam.name}'s advantage is substantial, but nothing is guaranteed in college football — ` +
      `see the spread distribution for complete outlook.`;
  }

  // Upset scenario (if applicable)
  let upsetScenario: string | null = null;
  if (upsetProbability > 0.2) {
    upsetScenario =
      `${underdogTeam.name}'s path to victory: Control the line of scrimmage on both sides, ` +
      `control the clock, and avoid turnovers. If they can keep the game close into the fourth quarter, ` +
      `they'll have momentum on their side.`;
  }

  return {
    headline,
    summary: lines.join(" "),
    keyInsight,
    upsetScenario,
    confidenceLevel,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate home field advantage based on location.
 *
 * @param location - Game location ("teamA_home", "teamB_home", "neutral")
 * @param hfaPoints - HFA in points
 * @returns HFA adjustment in rating points (positive = team A advantage)
 */
function calculateHFA(
  location: "teamA_home" | "teamB_home" | "neutral",
  hfaPoints: number
): number {
  switch (location) {
    case "teamA_home":
      return hfaPoints;
    case "teamB_home":
      return -hfaPoints;
    case "neutral":
      return 0;
  }
}

/**
 * Calculate statistical distribution of scores.
 *
 * @param values - Array of numeric scores
 * @returns Distribution with mean, median, stddev, percentiles
 */
function calculateScoreDistribution(values: number[]): ScoreDistribution {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      percentiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  const getPercentile = (p: number): number => {
    const idx = Math.ceil((p / 100) * n) - 1;
    return sorted[Math.max(0, idx)];
  };

  return {
    mean,
    median,
    stdDev,
    min: sorted[0],
    max: sorted[n - 1],
    percentiles: {
      p10: getPercentile(10),
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90),
    },
  };
}

/**
 * Build spread distribution histogram from margins.
 *
 * Creates 3-point increment buckets for intuitive visualization.
 *
 * @param margins - Array of margin values (team A perspective)
 * @returns Spread distribution buckets
 */
function buildSpreadDistribution(margins: number[]): SpreadBucket[] {
  return SPREAD_BUCKETS_CONFIG.map(({ label, min, max }) => {
    const count = margins.filter((m) => m >= min && m <= max).length;
    return {
      range: label,
      count,
      percentage: (count / margins.length) * 100,
    };
  });
}

/**
 * Find 10 most common final scores from simulations.
 *
 * @param simulations - Array of game simulations
 * @returns Top 10 most likely final scores
 */
function findMostLikelyScores(simulations: GameSimulation[]): ScoreFrequency[] {
  // Round scores to nearest realistic football score (multiples of 3-7)
  const scoreMap = new Map<string, number>();

  for (const sim of simulations) {
    const key = `${sim.scoreA}-${sim.scoreB}`;
    scoreMap.set(key, (scoreMap.get(key) ?? 0) + 1);
  }

  // Convert to array and sort by frequency
  const scores = Array.from(scoreMap.entries())
    .map(([key, count]) => {
      const [aStr, bStr] = key.split("-");
      return {
        scoreA: parseInt(aStr, 10),
        scoreB: parseInt(bStr, 10),
        count,
        percentage: (count / simulations.length) * 100,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return scores;
}

/**
 * Sample from Poisson distribution using inverse CDF method.
 *
 * @param lambda - Mean of Poisson distribution
 * @returns Random sample from Poisson(lambda)
 */
function poissonSample(lambda: number): number {
  if (lambda < 0.01) return 0;

  const L = Math.exp(-lambda);
  let p = 1;
  let k = 0;

  do {
    k++;
    p *= Math.random();
  } while (p > L);

  return k - 1;
}

/**
 * Generate a random number from standard normal distribution.
 *
 * Uses Box-Muller transform for efficiency.
 * Caches second value to use in next call.
 *
 * @returns Random number from N(0,1)
 */
const gaussianState = { hasSpare: false, spare: 0 };

function gaussianRandom(): number {
  if (gaussianState.hasSpare) {
    gaussianState.hasSpare = false;
    return gaussianState.spare;
  }

  gaussianState.hasSpare = true;

  const u1 = Math.random();
  const u2 = Math.random();
  const mag = Math.sqrt(-2.0 * Math.log(u1));
  const z0 = mag * Math.cos(2.0 * Math.PI * u2);

  gaussianState.spare = mag * Math.sin(2.0 * Math.PI * u2);

  return z0;
}
