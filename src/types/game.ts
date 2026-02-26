/**
 * Game Type Definitions
 * Types for games, scoring, statistics, and gameplay data.
 */

import type { Level } from "./team";

/**
 * Base game information without statistics.
 * Minimal required data for game identification and scheduling.
 */
export interface GameBase {
  /** Primary key from database */
  id: number;

  /** Season year (e.g., 2024) */
  season: number;

  /** Week number (1-15 for regular season, 16-17 for postseason) */
  week: number | null;

  /** Game date and time */
  gameDate: Date | null;

  /** Home team ID foreign key */
  homeTeamId: number;

  /** Away team ID foreign key */
  awayTeamId: number;

  /** Home team final score (null if not played) */
  homeScore: number | null;

  /** Away team final score (null if not played) */
  awayScore: number | null;

  /** Whether game is at neutral site (e.g., bowl game, championship) */
  isNeutralSite: boolean;

  /** Whether game counts toward conference standings */
  isConferenceGame: boolean | null;

  /** Whether game is postseason (bowl, playoff, etc.) */
  isPostseason: boolean;

  /** Raw metadata (referee info, snap counts, etc.) */
  metadata: Record<string, unknown> | null;

  /** Created timestamp */
  createdAt: Date;

  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Game with full statistics and advanced metrics.
 * Extends GameBase with EPA, success rate, predictions, and betting lines.
 * Used for game detail pages, matchup analysis, and rankings calculations.
 */
export interface GameWithStats extends GameBase {
  /** Home team EPA per play */
  homeEpa: number | null;

  /** Away team EPA per play */
  awayEpa: number | null;

  /** Home team success rate (0-1 scale, successful plays / total plays) */
  homeSuccessRate: number | null;

  /** Away team success rate (0-1 scale) */
  awaySuccessRate: number | null;

  /** Home team explosiveness (plays over 8+ yards as % of total) */
  homeExplosiveness: number | null;

  /** Away team explosiveness */
  awayExplosiveness: number | null;

  /** Pre-game home win probability (0-1 scale) */
  homeWinProb: number | null;

  /** Betting line (positive = away team favored by that many points) */
  spread: number | null;

  /** Over/under point total */
  overUnder: number | null;

  /** Game excitement/thriller index (0-100 scale) */
  excitementIndex: number | null;

  /** Home team name (denormalized for convenience) */
  homeTeamName: string;

  /** Away team name (denormalized for convenience) */
  awayTeamName: string;

  /** Home team abbreviation */
  homeTeamAbbr: string | null;

  /** Away team abbreviation */
  awayTeamAbbr: string | null;

  /** Home team logo URL */
  homeTeamLogo: string | null;

  /** Away team logo URL */
  awayTeamLogo: string | null;

  /** Home team division level */
  homeTeamLevel: Level;

  /** Away team division level */
  awayTeamLevel: Level;

  /** Point margin (positive = home team win by that amount) */
  margin: number | null;

  /** Whether the favored team lost (upset indicator) */
  wasUpset: boolean | null;

  /** Whether the spread was covered */
  spreadCovered: boolean | null;

  /** Whether the over/under hit */
  overHit: boolean | null;
}

/**
 * Game result data optimized for rating engine calculations.
 * Flattened, minimal data used by GridRank Glicko-2 algorithm.
 */
export interface GameResult {
  /** Unique identifier */
  gameId: number;

  /** Home team ID */
  homeTeamId: number;

  /** Away team ID */
  awayTeamId: number;

  /** Home team final score */
  homeScore: number;

  /** Away team final score */
  awayScore: number;

  /** Point margin (positive = home win) */
  margin: number;

  /** Whether game was at neutral site (for HFA calculation) */
  isNeutral: boolean;

  /** Game week number (for seasonal decay) */
  week: number;

  /** Game date (for historical context) */
  date: Date;

  /** Whether game occurred (false if cancelled/rescheduled) */
  isOfficial: boolean;

  /** Garbage time filter indicator (margin beyond realistic threshold) */
  hasGarbageTime: boolean;

  /** Home field advantage applied (in points) */
  hfaApplied: number;
}

/**
 * Play-by-play event during a game.
 * Individual offensive action with EPA and situational data.
 */
export interface PlayByPlay {
  /** Primary key */
  id: number;

  /** Game ID foreign key */
  gameId: number;

  /** Play sequence number within game */
  playNumber: number;

  /** Game period/quarter (1-4) */
  period: 1 | 2 | 3 | 4;

  /** Clock time in MM:SS format */
  clock: string;

  /** Minute remaining in period (0-15) */
  minuteRemaining: number;

  /** Possessing team ID */
  possessionTeamId: number;

  /** Down number (1-4, null for kickoff/other) */
  down: 1 | 2 | 3 | 4 | null;

  /** Yards to gain for first down */
  distance: number | null;

  /** Yard line for line of scrimmage (0-100) */
  yardLine: number;

  /** Play description (e.g., "Pass 22 yd to WR") */
  playDescription: string;

  /** Yards gained (negative for loss, null for no play) */
  yardsGained: number | null;

  /** Expected Points Added (EPA) on the play */
  epa: number | null;

  /** Whether play succeeded (converted first down or score) */
  isSuccessful: boolean | null;

  /** Type of play (pass, rush, punt, field_goal, turnover, etc.) */
  playType: PlayType;

  /** Whether play resulted in touchdown */
  isTouchdown: boolean;

  /** Whether play was a turnover */
  isTurnover: boolean;

  /** Yards penalized on the play */
  penaltyYards: number | null;

  /** Flag description if penalty */
  penalty: string | null;

  /** Drive number in game */
  driveNumber: number;

  /** Play timestamp relative to game start */
  timestamp: Date;
}

/**
 * Game play type enumeration.
 */
export type PlayType =
  | "pass"
  | "rush"
  | "kick"
  | "punt"
  | "field_goal"
  | "extra_point"
  | "turnover"
  | "safety"
  | "defensive_play"
  | "timeout"
  | "kneel"
  | "other";

/**
 * Quarter-by-quarter scoring breakdown.
 */
export interface QuarterScore {
  /** Quarter number (1-4, can extend to 5+ for overtime) */
  quarter: number;

  /** Home team points scored in quarter */
  homeScore: number;

  /** Away team points scored in quarter */
  awayScore: number;

  /** Home team cumulative score through quarter */
  homeCumulative: number;

  /** Away team cumulative score through quarter */
  awayCumulative: number;
}

/**
 * Complete scoring timeline for a game.
 */
export interface LineScore {
  /** Game identifier */
  gameId: number;

  /** Array of quarter scores */
  quarters: QuarterScore[];

  /** Final home score */
  homeTotal: number;

  /** Final away score */
  awayTotal: number;

  /** Overtime scores if applicable */
  overtimePeriods: Array<{
    periodNumber: number;
    homeScore: number;
    awayScore: number;
  }>;

  /** Scoring summary with timestamps and descriptions */
  scoringSummary: Array<{
    time: string; // MM:SS format
    quarter: number;
    team: "home" | "away";
    description: string; // "Touchdown pass", "Field goal", etc.
    points: number;
  }>;
}

/**
 * Pre-game prediction for a game.
 * Output from win probability or regression model.
 */
export interface GamePrediction {
  /** Game ID being predicted */
  gameId: number;

  /** Home team win probability (0-1 scale) */
  homeWinProb: number;

  /** Away team win probability (0-1 scale) */
  awayWinProb: number;

  /** Predicted point spread (positive = away favored) */
  predictedSpread: number | null;

  /** Confidence interval lower bound (95%) */
  confidenceIntervalLow: number;

  /** Confidence interval upper bound (95%) */
  confidenceIntervalHigh: number;

  /** Model confidence (0-1, how reliable prediction is) */
  confidence: number;

  /** Whether home team is favored */
  homeFavored: boolean;

  /** Upset alert (home team favored but low win prob, or vice versa) */
  upsetAlert: boolean;

  /** Model name/version used (e.g., "xgboost-v2.1") */
  modelVersion: string;

  /** Prediction timestamp */
  predictedAt: Date;

  /** Detailed prediction rationale (for UI display) */
  narrative: string | null;
}

/**
 * Win probability over time during a game.
 * Point-in-time snapshot of WP evolution.
 */
export interface WinProbabilityPoint {
  /** Home team win probability at this moment */
  homeWP: number;

  /** Away team win probability at this moment */
  awayWP: number;

  /** Game clock (seconds remaining, 0 = end of game) */
  secondsRemaining: number;

  /** Play number or event identifier */
  eventId: number;

  /** Descriptive moment label (e.g., "TD to make it 21-0") */
  label: string | null;
}

/**
 * Complete win probability chart for postgame analysis.
 */
export interface WinProbabilityChart {
  /** Game identifier */
  gameId: number;

  /** Array of WP snapshots throughout game */
  points: WinProbabilityPoint[];

  /** Minimum WP home team reached */
  homeMinWP: number;

  /** Maximum WP home team reached */
  homeMaxWP: number;

  /** Number of times WP crossed 50% */
  wpCrosses: number;

  /** Largest single-play WP swing (absolute value) */
  largestSwing: number;

  /** Time of largest swing */
  largestSwingTime: string;

  /** Thriller score (0-100, based on WP volatility) */
  thrillerScore: number;
}

/**
 * Offensive or defensive unit statistics for a game.
 * Per-team aggregated performance metrics.
 */
export interface UnitStats {
  /** Team ID for these stats */
  teamId: number;

  /** Total plays run */
  plays: number;

  /** Total yards gained */
  totalYards: number;

  /** Passing yards */
  passingYards: number;

  /** Passing attempts */
  passingAttempts: number;

  /** Passing completions */
  passingCompletions: number;

  /** Completion percentage */
  completionPercentage: number;

  /** Rushing yards */
  rushingYards: number;

  /** Rushing attempts */
  rushingAttempts: number;

  /** Turnovers committed */
  turnovers: number;

  /** First downs earned */
  firstDowns: number;

  /** Third down conversions */
  thirdDownConversions: number;

  /** Third down attempts */
  thirdDownAttempts: number;

  /** Fourth down conversions */
  fourthDownConversions: number;

  /** Fourth down attempts */
  fourthDownAttempts: number;

  /** Penalty yards */
  penaltyYards: number;

  /** Penalties committed */
  penalties: number;

  /** Sacks allowed (for offense) / sacks made (for defense) */
  sacks: number;

  /** Time of possession in minutes:seconds */
  timeOfPossession: string;

  /** Redzone attempts (inside opponent 20 yard line) */
  redzoneAttempts: number;

  /** Redzone touchdowns */
  redzoneTouchdowns: number;

  /** EPA per play */
  epaPerPlay: number | null;

  /** Success rate (0-1) */
  successRate: number | null;

  /** Explosiveness (0-1) */
  explosiveness: number | null;
}

/**
 * Comprehensive game summary combining all aspects.
 * Used for game recap pages and detailed analysis.
 */
export interface GameSummary extends GameWithStats {
  /** Line score (quarter-by-quarter) */
  lineScore: LineScore;

  /** Home team unit stats */
  homeStats: UnitStats;

  /** Away team unit stats */
  awayStats: UnitStats;

  /** Win probability chart (postgame) */
  wpChart: WinProbabilityChart | null;

  /** Key plays during the game */
  keyPlays: PlayByPlay[];

  /** Game attendance */
  attendance: number | null;

  /** Game officials (referee names) */
  officials: Array<{
    name: string;
    position: string;
  }> | null;

  /** Weather conditions */
  weather: {
    temperature: number | null;
    windSpeed: number | null;
    windDirection: string | null;
    precipitation: string | null;
  } | null;

  /** Notable milestones achieved in game */
  milestones: string[];

  /** Game recap/summary narrative */
  recap: string | null;

  /** MVP of the game (player name) */
  gameMvp: string | null;
}
