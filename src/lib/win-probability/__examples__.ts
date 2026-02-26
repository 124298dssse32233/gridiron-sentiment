/**
 * Win Probability Model Usage Examples
 *
 * Demonstrates all functions and typical usage patterns for the
 * Win Probability module across GridRank features.
 */

import {
  calculateWinProbability,
  pregameWinProbability,
  calculateWPA,
  generateWPChart,
  calculateLeverageIndex,
  expectedPointsFromState,
  overtimeWinProbability,
  type GameState,
  type PlayState,
} from "./index";

// =============================================================================
// EXAMPLE 1: In-Game Win Probability
// =============================================================================

/**
 * Calculate win probability at a specific moment during a game.
 * Used for: Gameday Dashboard live WP chart
 */
export function exampleInGameWP(): void {
  const gameState: GameState = {
    homeScore: 21,
    awayScore: 14,
    quarter: 4,
    timeRemaining: 300, // 5 minutes left
    possession: "away", // Away team has the ball
    yardLine: 45, // At midfield
    down: 2,
    distance: 8,
    homeTimeouts: 2,
    awayTimeouts: 1,
    homeRating: 1523, // Optional: for pregame weighting
    awayRating: 1489,
  };

  const result = calculateWinProbability(gameState);

  console.log("=== IN-GAME WIN PROBABILITY ===");
  console.log(`Home WP: ${(result.homeWP * 100).toFixed(1)}%`);
  console.log(`Away WP: ${(result.awayWP * 100).toFixed(1)}%`);
  console.log(`Game Phase: ${result.gamePhase}`);
  console.log(`Contributing Factors:`);
  result.factors.forEach((factor) => {
    const impact = factor.impact > 0 ? "+" : "";
    console.log(`  - ${factor.name}: ${impact}${(factor.impact * 100).toFixed(1)}%`);
    console.log(`    ${factor.description}`);
  });
}

// =============================================================================
// EXAMPLE 2: Pre-Game Win Probability
// =============================================================================

/**
 * Calculate pre-game win probability from team ratings.
 * Used for: Predictions page, spread estimation
 */
export function examplePregameWP(): void {
  // Home team: 1523 rating, 47 RD (confident)
  // Away team: 1489 rating, 52 RD (slightly less confident)
  const pregame = pregameWinProbability(
    1523, // homeRating
    1489, // awayRating
    47, // homeRD
    52, // awayRD
    false // not neutral site
  );

  console.log("=== PRE-GAME WIN PROBABILITY ===");
  console.log(`Home WP: ${(pregame.homeWP * 100).toFixed(1)}%`);
  console.log(`Away WP: ${(pregame.awayWP * 100).toFixed(1)}%`);
  console.log(
    `Spread Equivalent: ${pregame.spreadEquivalent > 0 ? "-" : "+"}${Math.abs(pregame.spreadEquivalent).toFixed(1)}` +
      ` points`
  );
  console.log(`Prediction Confidence: ${(pregame.confidence * 100).toFixed(0)}%`);
}

// =============================================================================
// EXAMPLE 3: Win Probability Added (WPA)
// =============================================================================

/**
 * Calculate WPA for a single play.
 * Used for: Chaos Index, key play identification
 */
export function exampleWPA(): void {
  // Game state before the play
  const stateBefore: GameState = {
    homeScore: 14,
    awayScore: 21,
    quarter: 4,
    timeRemaining: 300,
    possession: "home", // Home team has ball
    yardLine: 20, // In the red zone
    down: 1,
    distance: 10,
    homeTimeouts: 2,
    awayTimeouts: 1,
  };

  // After a home touchdown
  const stateAfter: GameState = {
    ...stateBefore,
    homeScore: 21, // Home scores TD
    possession: "away", // Away gets ball
    yardLine: 20, // Reset to own 20
    down: 1,
    distance: 10,
  };

  const wpa = calculateWPA(stateBefore, stateAfter);

  console.log("=== WIN PROBABILITY ADDED ===");
  console.log(`WP Before: ${(wpa.wpBefore * 100).toFixed(1)}%`);
  console.log(`WP After: ${(wpa.wpAfter * 100).toFixed(1)}%`);
  console.log(`WPA (Home): ${(wpa.wpa * 100).toFixed(2)}%`);
  console.log(`Key Play: ${wpa.isKeyPlay}`);
  console.log(`Momentum Shift: ${wpa.isMomentumShift}`);
  console.log(`Leverage Index: ${(wpa.leverageIndex * 100).toFixed(0)}%`);
}

// =============================================================================
// EXAMPLE 4: Win Probability Chart
// =============================================================================

/**
 * Generate full WP chart from play-by-play data.
 * Used for: Postgame game recaps, WP visualization
 */
export function exampleWPChart(): void {
  // Simulated play-by-play sequence
  const plays: PlayState[] = [
    {
      homeScore: 0,
      awayScore: 7,
      quarter: 1,
      timeRemaining: 3600,
      possession: "home",
      yardLine: 20,
      down: 1,
      distance: 10,
      homeTimeouts: 3,
      awayTimeouts: 3,
      description: "Opening kickoff",
    },
    {
      homeScore: 7,
      awayScore: 7,
      quarter: 2,
      timeRemaining: 600,
      possession: "away",
      yardLine: 50,
      down: 1,
      distance: 10,
      homeTimeouts: 3,
      awayTimeouts: 2,
      description: "Home TD - tied 7-7",
    },
    {
      homeScore: 14,
      awayScore: 7,
      quarter: 3,
      timeRemaining: 1800,
      possession: "home",
      yardLine: 20,
      down: 1,
      distance: 10,
      homeTimeouts: 2,
      awayTimeouts: 3,
      description: "Home FG - led 10-7",
    },
    {
      homeScore: 14,
      awayScore: 14,
      quarter: 4,
      timeRemaining: 300,
      possession: "away",
      yardLine: 30,
      down: 1,
      distance: 10,
      homeTimeouts: 2,
      awayTimeouts: 1,
      description: "Away TD - tied 14-14",
    },
    {
      homeScore: 21,
      awayScore: 14,
      quarter: 4,
      timeRemaining: 0,
      possession: "away",
      yardLine: 20,
      down: 1,
      distance: 10,
      homeTimeouts: 1,
      awayTimeouts: 1,
      description: "Home TD - final",
    },
  ];

  const chart = generateWPChart(plays);

  console.log("=== WIN PROBABILITY CHART ===");
  console.log(`Plays analyzed: ${chart.plays.length}`);
  console.log(`Largest single-play swing: ${(chart.maxSwing * 100).toFixed(2)}%`);
  console.log(
    `Total volatility (sum of |WPA|): ${chart.totalVolatility.toFixed(2)} (excitement index)`
  );
  console.log(`Key moments:`);
  chart.keyPlays.forEach((play) => {
    const direction = play.wpa > 0 ? "+" : "";
    console.log(
      `  - Play ${play.playNumber + 1}: ${direction}${(play.wpa * 100).toFixed(2)}% - ${play.description}`
    );
  });
}

// =============================================================================
// EXAMPLE 5: Leverage Index
// =============================================================================

/**
 * Calculate leverage (importance of current moment).
 * Used for: Identifying high-stress situations, emotional context
 */
export function exampleLeverage(): void {
  const states: GameState[] = [
    {
      homeScore: 21,
      awayScore: 14,
      quarter: 1,
      timeRemaining: 3000,
      possession: "home",
      yardLine: 50,
      down: 1,
      distance: 10,
      homeTimeouts: 3,
      awayTimeouts: 3,
    },
    {
      homeScore: 21,
      awayScore: 14,
      quarter: 4,
      timeRemaining: 60,
      possession: "away",
      yardLine: 40,
      down: 3,
      distance: 6,
      homeTimeouts: 1,
      awayTimeouts: 0,
    },
    {
      homeScore: 14,
      awayScore: 14,
      quarter: 4,
      timeRemaining: 30,
      possession: "home",
      yardLine: 35,
      down: 4,
      distance: 2,
      homeTimeouts: 0,
      awayTimeouts: 0,
    },
  ];

  console.log("=== LEVERAGE INDEX ===");
  states.forEach((state, i) => {
    const leverage = calculateLeverageIndex(state);
    const phase =
      state.quarter > 4
        ? "OT"
        : state.quarter === 4
          ? "Q4"
          : `Q${state.quarter}`;
    console.log(
      `Game ${i + 1} (${phase}, ${state.timeRemaining}s remaining): ${(leverage * 100).toFixed(0)}%`
    );
  });
}

// =============================================================================
// EXAMPLE 6: Expected Points
// =============================================================================

/**
 * Calculate expected points from field position.
 * Used for: EPA calculations, offensive efficiency metrics
 */
export function exampleExpectedPoints(): void {
  const situations = [
    { yardLine: 99, down: 1, distance: 10, timeRemaining: 3600, desc: "Own 1 yard line, 1Q" },
    { yardLine: 50, down: 1, distance: 10, timeRemaining: 3600, desc: "Midfield, 1Q" },
    { yardLine: 20, down: 1, distance: 10, timeRemaining: 3600, desc: "Red zone, 1Q" },
    { yardLine: 5, down: 1, distance: 10, timeRemaining: 3600, desc: "Goal line, 1Q" },
    { yardLine: 5, down: 4, distance: 1, timeRemaining: 60, desc: "Goal line, 4Q, 1 minute" },
  ];

  console.log("=== EXPECTED POINTS ===");
  situations.forEach((sit) => {
    const ep = expectedPointsFromState(sit.yardLine, sit.down, sit.distance, sit.timeRemaining);
    console.log(`${sit.desc}: ${ep.toFixed(2)} points`);
  });
}

// =============================================================================
// EXAMPLE 7: Overtime Win Probability
// =============================================================================

/**
 * Calculate OT win probability with possession advantage.
 * Used for: Playoff overtime scenarios, OT simulations
 */
export function exampleOvertimeWP(): void {
  const teamRating = 1523;
  const oppRating = 1489;

  const wpWithPossession = overtimeWinProbability(teamRating, oppRating, true);
  const wpWithoutPossession = overtimeWinProbability(teamRating, oppRating, false);

  console.log("=== OVERTIME WIN PROBABILITY ===");
  console.log(`Team rating: ${teamRating}`);
  console.log(`Opponent rating: ${oppRating}`);
  console.log(`With first possession: ${(wpWithPossession * 100).toFixed(1)}%`);
  console.log(`Without first possession: ${(wpWithoutPossession * 100).toFixed(1)}%`);
  console.log(`Possession advantage: ${((wpWithPossession - wpWithoutPossession) * 100).toFixed(1)}%`);
}

// =============================================================================
// EXAMPLE 8: Real Game Scenario
// =============================================================================

/**
 * Complete scenario: Track WP changes throughout a close game
 */
export function exampleRealGameScenario(): void {
  console.log("=== REAL GAME SCENARIO: CLOSE FOURTH QUARTER ===");

  // Scenario: Away team trailing 21-14 with 5 min, 4th quarter
  // Away team drives down and scores TD to tie, but need FG/TD for win

  const stateWorthiness: GameState[] = [
    {
      homeScore: 21,
      awayScore: 14,
      quarter: 4,
      timeRemaining: 300,
      possession: "away",
      yardLine: 70,
      down: 1,
      distance: 10,
      homeTimeouts: 2,
      awayTimeouts: 2,
    },
    {
      homeScore: 21,
      awayScore: 14,
      quarter: 4,
      timeRemaining: 180,
      possession: "away",
      yardLine: 20,
      down: 1,
      distance: 10,
      homeTimeouts: 2,
      awayTimeouts: 1,
    },
    {
      homeScore: 21,
      awayScore: 21,
      quarter: 4,
      timeRemaining: 120,
      possession: "home",
      yardLine: 20,
      down: 1,
      distance: 10,
      homeTimeouts: 1,
      awayTimeouts: 1,
    },
    {
      homeScore: 28,
      awayScore: 21,
      quarter: 4,
      timeRemaining: 60,
      possession: "away",
      yardLine: 20,
      down: 1,
      distance: 10,
      homeTimeouts: 1,
      awayTimeouts: 1,
    },
  ];

  stateWorthiness.forEach((state, idx) => {
    const wp = calculateWinProbability(state);
    const topFactor = wp.factors[0];
    console.log(
      `Play ${idx + 1} (Score: ${state.homeScore}-${state.awayScore}, ${state.quarter}Q ${Math.floor(state.timeRemaining / 60)}:${String(state.timeRemaining % 60).padStart(2, "0")})`
    );
    console.log(`  Home WP: ${(wp.homeWP * 100).toFixed(1)}%`);
    console.log(`  Top factor: ${topFactor?.name} (${(topFactor?.impact! * 100).toFixed(1)}%)`);
  });
}
