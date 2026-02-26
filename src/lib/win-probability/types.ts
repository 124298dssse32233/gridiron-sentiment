/**
 * Win Probability Type Definitions
 *
 * Shared types for the win probability module, exported from model.ts
 * but defined separately for clean imports.
 */

/**
 * Input for in-game win probability calculation
 */
export interface GameState {
  /** Home team final score (or current if in progress) */
  homeScore: number;

  /** Away team final score (or current if in progress) */
  awayScore: number;

  /** Quarter number (1-4, 5+ for overtime) */
  quarter: number;

  /** Seconds remaining in current quarter (0-3600) */
  timeRemaining: number;

  /** Which team has the ball */
  possession: "home" | "away";

  /** Yard line for line of scrimmage (1-99 from own end zone) */
  yardLine: number;

  /** Current down (1-4) */
  down: number;

  /** Yards to go for first down */
  distance: number;

  /** Home team timeouts remaining (0-3) */
  homeTimeouts: number;

  /** Away team timeouts remaining (0-3) */
  awayTimeouts: number;

  /** Home team Glicko-2 rating (optional, for pregame) */
  homeRating?: number;

  /** Away team Glicko-2 rating (optional, for pregame) */
  awayRating?: number;

  /** Home team rating deviation (optional) */
  homeRD?: number;

  /** Away team rating deviation (optional) */
  awayRD?: number;

  /** Whether game is at neutral site (affects HFA) */
  isNeutralSite?: boolean;
}

/**
 * Output from win probability calculation
 */
export interface WinProbabilityResult {
  /** Home team win probability (0-1) */
  homeWP: number;

  /** Away team win probability (0-1) */
  awayWP: number;

  /** Contributing factors and their impact */
  factors: WPFactor[];

  /** Game phase for contextual interpretation */
  gamePhase: "early" | "mid" | "late" | "crunch-time" | "overtime";
}

/**
 * Factor contributing to WP calculation
 */
export interface WPFactor {
  /** Name of the factor (e.g., "Score Differential") */
  name: string;

  /** Impact on home win probability (-1 to +1) */
  impact: number;

  /** Human-readable description */
  description: string;
}

/**
 * Win Probability Added (WPA) result for a single play
 */
export interface WPAResult {
  /** WPA for home team (positive = helped home) */
  wpa: number;

  /** Home WP before the play (0-1) */
  wpBefore: number;

  /** Home WP after the play (0-1) */
  wpAfter: number;

  /** Whether this is a "key play" (|wpa| > 0.10) */
  isKeyPlay: boolean;

  /** Whether this is a momentum shift (sign change or |wpa| > 0.15) */
  isMomentumShift: boolean;

  /** Leverage index (importance of the moment, 0-1) */
  leverageIndex: number;
}

/**
 * Pre-game win probability from ratings
 */
export interface PregameWP {
  /** Home team win probability (0-1) */
  homeWP: number;

  /** Away team win probability (0-1) */
  awayWP: number;

  /** Expected point spread from model (positive = away favored) */
  spreadEquivalent: number;

  /** Confidence in prediction based on rating deviations (0-1) */
  confidence: number;
}

/**
 * Win probability chart data for postgame visualization
 */
export interface WPChartData {
  /** Array of WP snapshots throughout game */
  plays: Array<{
    playNumber: number;
    homeWP: number;
    description?: string;
    wpa?: number;
    isKeyPlay?: boolean;
  }>;

  /** Key moments that swung the game */
  keyPlays: Array<{
    playNumber: number;
    wpa: number;
    description: string;
  }>;

  /** Largest single-play WPA (absolute value) */
  maxSwing: number;

  /** Sum of |WPA| across all plays (excitement index) */
  totalVolatility: number;
}

/**
 * Play-by-play state for WP charting
 */
export interface PlayState {
  homeScore: number;
  awayScore: number;
  quarter: number;
  timeRemaining: number;
  possession: "home" | "away";
  yardLine: number;
  down: number;
  distance: number;
  homeTimeouts: number;
  awayTimeouts: number;
  description?: string;
}
