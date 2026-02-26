/**
 * Win Probability Model — Logistic Regression with Game State
 *
 * Estimates P(home_win) during and before games using:
 * - Score differential (most important)
 * - Time remaining
 * - Field position
 * - Down and distance
 * - Timeout counts
 * - Pre-game strength differential
 * - Possession advantage
 *
 * Calibrated for college football with realistic CFB coefficients.
 *
 * Uses:
 * 1. Live in-game WP charts on Gameday Dashboard
 * 2. Pre-game predictions for Predictions page
 * 3. Win Probability Added (WPA) per play for Chaos Index
 */

import type {
  GameState,
  WinProbabilityResult,
  WPFactor,
  WPAResult,
  PregameWP,
  WPChartData,
  PlayState,
} from "./types";

// =============================================================================
// LOGISTIC REGRESSION COEFFICIENTS
// =============================================================================

/**
 * Calibrated logistic regression coefficients for college football.
 * These values are based on published CFB research and adjusted for accuracy.
 *
 * Logit model:
 * log(p / (1-p)) = β₀ + β₁*score_diff + β₂*time_pct + β₃*score_diff*time_pct
 *                + β₄*field_pos + β₅*down + β₆*distance + β₇*timeouts_diff
 *                + β₈*pregame_diff + β₉*possession + β₁₀*score_diff²*time_pct
 */
const COEFFICIENTS = {
  intercept: 0.0, // Neutral at home with even score
  scoreDiff: 0.18, // Each point of lead ≈ +18% log-odds
  timePercent: -0.02, // Time remaining baseline
  scoreTimeInteraction: -0.12, // Leads matter MORE as time decreases
  fieldPosition: 0.02, // Each yard closer to end zone
  down: -0.08, // Later downs slightly worse
  distance: -0.03, // More yards to go slightly worse
  timeoutDiff: 0.15, // Each extra timeout advantage
  pregameDiff: 0.003, // Glicko rating difference (scaled down)
  possession: 0.08, // Having the ball is an advantage
  scoreSquaredTime: 0.005, // Big leads with little time are near-certain
} as const;

// =============================================================================
// CORE WP CALCULATION
// =============================================================================

/**
 * Calculate in-game win probability using logistic regression model
 *
 * @param state Current game state
 * @returns Win probability result with factors
 *
 * @example
 * const state: GameState = {
 *   homeScore: 21,
 *   awayScore: 14,
 *   quarter: 4,
 *   timeRemaining: 300,
 *   possession: "away",
 *   yardLine: 45,
 *   down: 2,
 *   distance: 8,
 *   homeTimeouts: 2,
 *   awayTimeouts: 1,
 *   homeRating: 1523,
 *   awayRating: 1489,
 * };
 *
 * const result = calculateWinProbability(state);
 * console.log("Home WP: " + (result.homeWP * 100).toFixed(1) + "%");
 */
export function calculateWinProbability(
  state: GameState
): WinProbabilityResult {
  // Validate inputs
  if (!isValidGameState(state)) {
    throw new Error("Invalid game state");
  }

  // Calculate features
  const features = extractFeatures(state);
  const logit = computeLogit(features);
  const homeWP = sigmoid(logit);
  const awayWP = 1 - homeWP;

  // Calculate game phase
  const gamePhase = determineGamePhase(state);

  // Extract contributing factors
  const factors = calculateFactors(state, features, homeWP);

  return {
    homeWP,
    awayWP,
    factors,
    gamePhase,
  };
}

/**
 * Calculate pre-game win probability from team ratings
 *
 * Uses Glicko-2 expected outcome formula with uncertainty adjustment.
 *
 * @param homeRating Home team Glicko-2 rating
 * @param awayRating Away team Glicko-2 rating
 * @param homeRD Home team rating deviation
 * @param awayRD Away team rating deviation
 * @param isNeutralSite Whether game is at neutral site (reduces HFA)
 * @returns Pre-game WP and spread equivalent
 *
 * @example
 * const pregame = pregameWinProbability(1523, 1489, 47, 52, false);
 * console.log("Home favored by " + pregame.spreadEquivalent.toFixed(1) + " points");
 */
export function pregameWinProbability(
  homeRating: number,
  awayRating: number,
  homeRD: number = 50,
  awayRD: number = 50,
  isNeutralSite: boolean = false
): PregameWP {
  // Home field advantage (base 2.5 points, reduced at neutral)
  const hfa = isNeutralSite ? 0 : 2.5;

  // Rating difference adjusted for HFA
  const ratingDiff = homeRating - awayRating + hfa * 20; // Scale HFA to rating points

  // Glicko-2 expected outcome using logistic function
  // 400-point difference ≈ 90% win probability
  const homeWP = 1 / (1 + Math.pow(10, -ratingDiff / 400));
  const awayWP = 1 - homeWP;

  // Spread equivalent: roughly 1 point per 30 rating points
  const spreadEquivalent = -ratingDiff / 30;

  // Confidence based on rating deviations
  // Lower RDs = more confident
  const avgRD = (homeRD + awayRD) / 2;
  const confidence = Math.max(0.4, 1 - avgRD / 200);

  return {
    homeWP,
    awayWP,
    spreadEquivalent,
    confidence,
  };
}

/**
 * Calculate Win Probability Added (WPA) for a single play
 *
 * WPA = WP_after - WP_before. Positive means helped home team.
 *
 * @param stateBefore Game state before the play
 * @param stateAfter Game state after the play
 * @returns WPA result with context
 *
 * @example
 * const before: GameState = { quarter: 4, timeRemaining: 300 };
 * const after: GameState = { quarter: 4, timeRemaining: 275, homeScore: 24 };
 *
 * const wpa = calculateWPA(before, after);
 * console.log("Play WPA: " + (wpa.wpa * 100).toFixed(2) + "%");
 * console.log("Key play: " + wpa.isKeyPlay);
 */
export function calculateWPA(
  stateBefore: GameState,
  stateAfter: GameState
): WPAResult {
  const wpBefore = calculateWinProbability(stateBefore).homeWP;
  const wpAfter = calculateWinProbability(stateAfter).homeWP;
  const wpa = wpAfter - wpBefore;

  // Leverage index: importance of this moment
  const leverage = calculateLeverageIndex(stateBefore);

  // Key plays are |wpa| > 0.10
  const isKeyPlay = Math.abs(wpa) > 0.1;

  // Momentum shift: either sign flip or large swing
  const isMomentumShift =
    Math.sign(wpBefore - 0.5) !== Math.sign(wpAfter - 0.5) || Math.abs(wpa) > 0.15;

  return {
    wpa,
    wpBefore,
    wpAfter,
    isKeyPlay,
    isMomentumShift,
    leverageIndex: leverage,
  };
}

/**
 * Generate full WP chart data for a game from play-by-play states
 *
 * @param plays Array of play states in chronological order
 * @returns WP chart data with key plays and volatility metrics
 *
 * @example
 * const plays: PlayState[] = [];
 * const chart = generateWPChart(plays);
 * console.log("Game excitement: " + chart.totalVolatility.toFixed(2));
 * console.log("Largest swing: " + (chart.maxSwing * 100).toFixed(1) + "%");
 */
export function generateWPChart(plays: PlayState[]): WPChartData {
  if (plays.length === 0) {
    return {
      plays: [],
      keyPlays: [],
      maxSwing: 0,
      totalVolatility: 0,
    };
  }

  const chartPoints: Array<{
    playNumber: number;
    homeWP: number;
    description?: string;
    wpa?: number;
    isKeyPlay?: boolean;
  }> = [];
  const keyPlays: Array<{
    playNumber: number;
    wpa: number;
    description: string;
  }> = [];

  let maxSwing = 0;
  let totalVolatility = 0;
  let prevWP: number | null = null;

  for (let i = 0; i < plays.length; i++) {
    const play = plays[i];
    const gameState: GameState = {
      homeScore: play.homeScore,
      awayScore: play.awayScore,
      quarter: play.quarter,
      timeRemaining: play.timeRemaining,
      possession: play.possession,
      yardLine: play.yardLine,
      down: play.down,
      distance: play.distance,
      homeTimeouts: play.homeTimeouts,
      awayTimeouts: play.awayTimeouts,
    };

    const wp = calculateWinProbability(gameState).homeWP;
    const wpa = prevWP !== null ? wp - prevWP : 0;

    chartPoints.push({
      playNumber: i,
      homeWP: wp,
      description: play.description,
      wpa: wpa,
      isKeyPlay: Math.abs(wpa) > 0.1,
    });

    if (Math.abs(wpa) > 0.1) {
      keyPlays.push({
        playNumber: i,
        wpa,
        description: play.description || `Play ${i + 1}`,
      });
    }

    maxSwing = Math.max(maxSwing, Math.abs(wpa));
    totalVolatility += Math.abs(wpa);
    prevWP = wp;
  }

  return {
    plays: chartPoints,
    keyPlays,
    maxSwing,
    totalVolatility,
  };
}

/**
 * Calculate leverage index for a game state
 *
 * Leverage measures importance of the current moment.
 * High leverage: close score + little time remaining
 * Low leverage: blowout or very early in game
 *
 * @param state Game state
 * @returns Leverage index (0-1 scale)
 *
 * @example
 * const leverage = calculateLeverageIndex(state);
 * console.log("Moment importance: " + (leverage * 100).toFixed(0) + "%");
 */
export function calculateLeverageIndex(state: GameState): number {
  // Score proximity: max leverage when score is tied or within 7 points
  const scoreDiff = Math.abs(state.homeScore - state.awayScore);
  const scoreProximity = Math.max(0, 1 - scoreDiff / 14);

  // Time factor: leverage peaks in final minutes
  const totalSeconds =
    (state.quarter - 1) * 3600 + (3600 - state.timeRemaining);
  const gameLength = 14400; // 4 quarters
  const timePercent = totalSeconds / gameLength;

  // Leverage is lowest early or in massive blowouts
  let leverage = scoreProximity;

  // Increase leverage as game progresses
  if (timePercent < 0.25) {
    leverage *= 0.4; // Early game
  } else if (timePercent < 0.5) {
    leverage *= 0.7; // Q1-Q2
  } else if (timePercent < 0.75) {
    leverage *= 0.85; // Q2-Q3
  } else {
    leverage *= 1.0; // Q4 - maximum leverage
  }

  // Overtime is always high leverage
  if (state.quarter > 4) {
    leverage = 1.0;
  }

  return Math.max(0, Math.min(1, leverage));
}

/**
 * Calculate expected points from field position and down-distance
 *
 * Simplified EPA model based on yardage to end zone and down/distance.
 * Returns expected points the offense will score on this drive.
 *
 * @param yardLine Yard line (1-99 from own end zone)
 * @param down Current down (1-4)
 * @param distance Yards to go
 * @param timeRemaining Seconds remaining in quarter
 * @returns Expected points (0-7 scale)
 *
 * @example
 * const ep = expectedPointsFromState(32, 1, 10, 1800);
 * console.log("Expected: " + ep.toFixed(2) + " points");
 */
export function expectedPointsFromState(
  yardLine: number,
  down: number,
  distance: number,
  timeRemaining: number
): number {
  // Clamp to reasonable bounds
  const normYardLine = Math.max(1, Math.min(99, yardLine));
  const normDown = Math.max(1, Math.min(4, down));
  const normDistance = Math.max(1, distance);

  // Base EP by field position (closer to end zone = higher EP)
  let ep = 7 - (normYardLine / 100) * 7; // Range: 0-7

  // Adjust for down (earlier downs have more attempts left)
  const downFactor = 1 - (normDown - 1) * 0.15;
  ep *= downFactor;

  // Adjust for distance (more distance = lower EP)
  const distanceFactor = 1 - Math.min(1, normDistance / 20);
  ep *= distanceFactor;

  // Time pressure: less time = lower EP (can't sustain drive)
  const timePercent = Math.max(0, Math.min(1, timeRemaining / 3600));
  const timeFactor = 0.6 + 0.4 * timePercent;
  ep *= timeFactor;

  return Math.max(0, Math.min(7, ep));
}

/**
 * Calculate overtime win probability
 *
 * In college overtime, first possession has ~52% win probability advantage
 * in a tied game due to rule changes (2-point conversions).
 *
 * @param teamRating Possessing team's rating
 * @param oppRating Opponent team's rating
 * @param hasFirstPossession Whether team has first possession
 * @returns Win probability for the possessing team
 *
 * @example
 * const otWP = overtimeWinProbability(1523, 1489, true);
 * console.log("OT WP with possession: " + (otWP * 100).toFixed(1) + "%");
 */
export function overtimeWinProbability(
  teamRating: number,
  oppRating: number,
  hasFirstPossession: boolean
): number {
  // Base WP from pre-game ratings
  const baseWP = 1 / (1 + Math.pow(10, -(teamRating - oppRating) / 400));

  // Possession advantage in overtime (~2-3 percentage points)
  const possessionBonus = hasFirstPossession ? 0.025 : -0.025;

  return Math.max(0, Math.min(1, baseWP + possessionBonus));
}

// =============================================================================
// INTERNAL HELPER FUNCTIONS
// =============================================================================

/**
 * Validate game state input
 */
function isValidGameState(state: GameState): boolean {
  return (
    state.quarter >= 1 &&
    state.timeRemaining >= 0 &&
    state.timeRemaining <= 3600 &&
    state.yardLine >= 1 &&
    state.yardLine <= 99 &&
    state.down >= 1 &&
    state.down <= 4 &&
    state.distance >= 1 &&
    state.homeTimeouts >= 0 &&
    state.homeTimeouts <= 3 &&
    state.awayTimeouts >= 0 &&
    state.awayTimeouts <= 3 &&
    (state.possession === "home" || state.possession === "away")
  );
}

/**
 * Extract features from game state for logistic regression
 */
interface Features {
  scoreDiff: number;
  timePercent: number;
  fieldPos: number; // Distance from end zone (0-100)
  down: number;
  distance: number;
  timeoutsDiff: number;
  pregameDiff: number;
  possession: number; // +1 for home, -1 for away
  scoreTimeInteraction: number;
  scoreSquaredTime: number;
}

function extractFeatures(state: GameState): Features {
  const scoreDiff = state.homeScore - state.awayScore;
  const totalSeconds =
    (state.quarter - 1) * 3600 + (3600 - state.timeRemaining);
  const gameLength = state.quarter > 4 ? 14400 + (state.quarter - 4) * 600 : 14400;
  const timePercent = Math.max(0, Math.min(1, totalSeconds / gameLength));

  // Field position: normalized distance to opponent's end zone
  const fieldPos = (100 - state.yardLine) / 100;

  // Possession boost
  const possessionBoost = state.possession === "home" ? 1 : -1;

  // Timeout differential
  const timeoutsDiff = state.homeTimeouts - state.awayTimeouts;

  // Pre-game rating difference (if available)
  const pregameDiff =
    state.homeRating && state.awayRating
      ? (state.homeRating - state.awayRating) / 100
      : 0;

  return {
    scoreDiff,
    timePercent,
    fieldPos,
    down: state.down,
    distance: state.distance,
    timeoutsDiff,
    pregameDiff,
    possession: possessionBoost,
    scoreTimeInteraction: scoreDiff * (1 - timePercent),
    scoreSquaredTime: scoreDiff * scoreDiff * (1 - timePercent),
  };
}

/**
 * Compute logit (log-odds) from features
 */
function computeLogit(features: Features): number {
  const logit =
    COEFFICIENTS.intercept +
    COEFFICIENTS.scoreDiff * features.scoreDiff +
    COEFFICIENTS.timePercent * features.timePercent +
    COEFFICIENTS.scoreTimeInteraction * features.scoreTimeInteraction +
    COEFFICIENTS.fieldPosition * features.fieldPos +
    COEFFICIENTS.down * features.down +
    COEFFICIENTS.distance * features.distance +
    COEFFICIENTS.timeoutDiff * features.timeoutsDiff +
    COEFFICIENTS.pregameDiff * features.pregameDiff +
    COEFFICIENTS.possession * features.possession +
    COEFFICIENTS.scoreSquaredTime * features.scoreSquaredTime;

  // Clamp logit to prevent numerical overflow
  return Math.max(-10, Math.min(10, logit));
}

/**
 * Sigmoid function (logistic function) to convert logit to probability
 */
function sigmoid(logit: number): number {
  return 1 / (1 + Math.exp(-logit));
}

/**
 * Determine game phase for contextual interpretation
 */
function determineGamePhase(
  state: GameState
): "early" | "mid" | "late" | "crunch-time" | "overtime" {
  if (state.quarter > 4) {
    return "overtime";
  }

  const totalSeconds =
    (state.quarter - 1) * 3600 + (3600 - state.timeRemaining);
  const gameLength = 14400;
  const timePercent = totalSeconds / gameLength;

  if (timePercent < 0.25) return "early";
  if (timePercent < 0.5) return "mid";
  if (timePercent < 0.85) return "late";
  return "crunch-time";
}

/**
 * Calculate individual factors contributing to WP
 */
function calculateFactors(
  state: GameState,
  features: Features,
  homeWP: number
): WPFactor[] {
  const factors: WPFactor[] = [];

  // Score differential (most important)
  if (features.scoreDiff !== 0) {
    const impact =
      (Math.sign(features.scoreDiff) *
        Math.min(Math.abs(features.scoreDiff) / 21, 1)) /
      2;
    factors.push({
      name: "Score Differential",
      impact,
      description:
        features.scoreDiff > 0
          ? `Home team leading by ${features.scoreDiff}`
          : `Away team leading by ${Math.abs(features.scoreDiff)}`,
    });
  }

  // Time remaining
  const gamePercent =
    ((state.quarter - 1) * 3600 + (3600 - state.timeRemaining)) / 14400;
  if (gamePercent > 0.85) {
    const impact = (gamePercent - 0.85) / 0.15;
    factors.push({
      name: "Time Remaining",
      impact: homeWP > 0.5 ? impact * 0.3 : -impact * 0.3,
      description: `${Math.round(state.timeRemaining / 60)} minutes left`,
    });
  }

  // Field position
  if (state.possession === "home" && features.fieldPos > 0.5) {
    const impact = Math.min((features.fieldPos - 0.5) / 0.5, 1) * 0.15;
    factors.push({
      name: "Field Position (Home)",
      impact,
      description: `Home ball at ${Math.round(state.yardLine)} yard line`,
    });
  } else if (state.possession === "away" && features.fieldPos > 0.5) {
    const impact = Math.min((features.fieldPos - 0.5) / 0.5, 1) * 0.15;
    factors.push({
      name: "Field Position (Away)",
      impact: -impact,
      description: `Away ball at ${Math.round(state.yardLine)} yard line`,
    });
  }

  // Possession advantage
  factors.push({
    name: "Possession",
    impact: state.possession === "home" ? 0.04 : -0.04,
    description: `${state.possession === "home" ? "Home" : "Away"} team has the ball`,
  });

  // Down and distance
  if (state.down >= 3 && state.distance > 5) {
    const impact = (state.possession === "home" ? -1 : 1) * 0.05;
    factors.push({
      name: "Down and Distance",
      impact,
      description: `${state.down}${state.down === 1 ? "st" : state.down === 2 ? "nd" : state.down === 3 ? "rd" : "th"} and ${state.distance}`,
    });
  }

  // Timeout advantage
  if (features.timeoutsDiff !== 0) {
    const impact = (Math.sign(features.timeoutsDiff) * 0.02) / 3;
    factors.push({
      name: "Timeout Advantage",
      impact,
      description: `Home ${state.homeTimeouts} vs Away ${state.awayTimeouts}`,
    });
  }

  return factors;
}
