/**
 * Win Probability Module
 *
 * Public API for win probability calculations across GridRank.
 *
 * Exports:
 * - calculateWinProbability: In-game WP from game state
 * - pregameWinProbability: Pre-game WP from team ratings
 * - calculateWPA: Win Probability Added per play
 * - generateWPChart: Full game WP chart for visualization
 * - calculateLeverageIndex: Importance of current moment
 * - expectedPointsFromState: EPA calculation from game state
 * - overtimeWinProbability: Overtime-specific WP calculation
 *
 * All functions are fully typed with no `any` types.
 */

export type {
  GameState,
  WinProbabilityResult,
  WPFactor,
  WPAResult,
  PregameWP,
  WPChartData,
  PlayState,
} from "./types";

export {
  calculateWinProbability,
  pregameWinProbability,
  calculateWPA,
  generateWPChart,
  calculateLeverageIndex,
  expectedPointsFromState,
  overtimeWinProbability,
} from "./model";
