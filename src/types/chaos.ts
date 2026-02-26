/**
 * Chaos Index Type Definitions
 * Types for the Chaos Score system that measures game unpredictability and excitement.
 */

import type { GameWithStats } from "./game";

/**
 * Tag categorizing type of chaos in a game.
 * Multiple tags can apply to a single game.
 */
export type ChaosTag =
  | "UPSET"
  | "COMEBACK"
  | "THRILLER"
  | "BLOWOUT_REVERSED"
  | "RIVALRY_CHAOS"
  | "UNRANKED_CHAOS"
  | "PLAYOFF_IMPLICATIONS"
  | "WP_SWINGS"
  | "WEATHER_IMPACT"
  | "OFFENSIVE_SHOOTOUT"
  | "DEFENSIVE_MASTERCLASS"
  | "TURNOVER_FEAST"
  | "CONTROVERSIAL_ENDING"
  | "HISTORIC_PERFORMANCE"
  | "CINDERELLA_RUN"
  | "TOURNAMENT_SHOCK"
  | "TEAM_IMPLODES"
  | "LAST_SECOND_HEROICS";

/**
 * Individual component scores for the Chaos Index.
 * Each dimension contributes to overall chaos score.
 * Values are typically 0-100 or percentiles.
 */
export interface ChaosComponents {
  /**
   * Spread bust factor.
   * Measures how badly the game deviated from Vegas expectations.
   * 0 = close to prediction, 100 = massive upset/deviation
   */
  spreadBustFactor: number | null;

  /**
   * Win probability volatility.
   * How much win probability fluctuated during the game.
   * 0 = one team dominated, 100 = constant momentum swings
   */
  wpVolatility: number | null;

  /**
   * Upset magnitude.
   * How surprising the outcome was based on preseason/ratings.
   * 0 = chalk result, 100 = massive upset
   */
  upsetMagnitude: number | null;

  /**
   * Excitement index.
   * Subjective measure based on pace, scoring, momentum.
   * Provided by CFBD API or computed from play frequency.
   */
  excitementIndex: number | null;

  /**
   * Context weight.
   * Importance boost for rivalry games, rivalry implications, season-defining moments.
   * 1.0 = normal, 1.5+ = high-stakes
   */
  contextWeight: number | null;

  /**
   * Win probability inversion.
   * Did winner ever have <25% WP during the game?
   * Measures how dramatic the late comeback was.
   * 0 = no, 1 = yes, >1 = multiple WP inversions
   */
  postgameWpInversion: number | null;
}

/**
 * Single game with chaos analysis data.
 * Complete game information with chaos scoring components.
 * Used for Chaos Index rankings, weekly recaps, and game analysis.
 */
export interface ChaosGame {
  /** Game ID (foreign key) */
  gameId: number;

  /** Game data */
  game: GameWithStats;

  /** Overall chaos score (0-100 scale) */
  chaosScore: number | null;

  /** Percentile ranking among all games (0-100) */
  chaosPercentile: number | null;

  /** Component scores breakdown */
  components: ChaosComponents;

  /** Tags describing type of chaos */
  tags: ChaosTag[];

  /** Short headline for the chaos (e.g., "Unranked Shocker") */
  headline: string | null;

  /** Longer narrative explaining the chaos */
  narrative: string | null;

  /** Lowest win probability the winner reached during game */
  winnerLowestWp: number | null;

  /** Number of times win probability crossed 50% mark */
  wpCrosses50: number | null;

  /** Timestamp of chaos computation */
  computedAt: Date;

  /** Most chaotic play description */
  chaosPlay: {
    playNumber: number;
    description: string;
    wpSwing: number;
    secondsRemaining: number;
  } | null;

  /** Season context */
  season: number;

  /** Week context */
  week: number | null;
}

/**
 * Chaos summary for a single week.
 * Aggregated chaos data for all games in a week.
 * Used for weekly digests and season tracking.
 */
export interface ChaosWeek {
  /** Season year */
  season: number;

  /** Week number */
  week: number;

  /** Week label for display */
  weekLabel: string;

  /** Number of games played this week */
  totalGames: number;

  /** Average chaos score across all games */
  averageChaosScore: number;

  /** Median chaos score */
  medianChaosScore: number;

  /** Highest chaos score game */
  topChaosScore: number | null;

  /** Lowest chaos score game */
  lowestChaosScore: number | null;

  /** Games above 75th percentile chaos */
  topChaosGames: ChaosGame[];

  /** All chaos tags present in the week */
  allTags: ChaosTag[];

  /** Most common chaos tag */
  dominantTag: ChaosTag | null;

  /** Number of upsets this week */
  upsetCount: number;

  /** Number of comeback victories */
  comebackCount: number;

  /** Number of games with WP volatility */
  volatilityCount: number;

  /** Average margin of victory */
  averageMargin: number;

  /** Game with biggest spread bust */
  spreadBustGame: ChaosGame | null;

  /** Game with most WP swings */
  mostVolatileGame: ChaosGame | null;

  /** Week narrative/summary */
  weekSummary: string | null;

  /** Timestamp of chaos computation for week */
  computedAt: Date;
}

/**
 * Chaos summary for entire season.
 * Aggregate metrics and rankings across season.
 * Used for season recaps and historical comparison.
 */
export interface ChaosSeason {
  /** Season year */
  season: number;

  /** Total games analyzed */
  totalGames: number;

  /** Average chaos score for season */
  averageChaosScore: number;

  /** Standard deviation of chaos scores */
  chaosStdDev: number;

  /** Median chaos score */
  medianChaosScore: number;

  /** Most chaotic week */
  mostChaosWeek: ChaosWeek | null;

  /** Least chaotic week */
  leastChaosWeek: ChaosWeek | null;

  /** Top 10 most chaotic games of season */
  topChaosGames: ChaosGame[];

  /** All chaos tags used this season */
  allTags: ChaosTag[];

  /** Frequency of each tag */
  tagFrequencies: Record<ChaosTag, number>;

  /** Most common chaos pattern */
  dominantChaosPattern: ChaosTag | null;

  /** Total upsets in season */
  totalUpsets: number;

  /** Total comeback wins */
  totalCombacks: number;

  /** Total games decided by single possession */
  closeGamesCount: number;

  /** Total games with double-digit margins */
  blowoutCount: number;

  /** Game with highest spread bust of season */
  biggestSpreadBust: ChaosGame | null;

  /** Highest chaos score achieved */
  highestChaosScore: number | null;

  /** Game with highest chaos score */
  topChaosGame: ChaosGame | null;

  /** Team that appeared in most chaotic games */
  chaosTeam: {
    teamId: number;
    teamName: string;
    appearances: number;
  } | null;

  /** Season chaos narrative */
  seasonNarrative: string | null;

  /** Timestamp of computation */
  computedAt: Date;
}

/**
 * Chaos leaderboard entry (teams ranked by chaos involvement).
 * Shows which teams are most involved in chaotic games.
 */
export interface ChaosLeaderboardEntry {
  /** Team ID */
  teamId: number;

  /** Team name */
  teamName: string;

  /** Team abbreviation */
  abbreviation: string | null;

  /** Team logo */
  logoUrl: string | null;

  /** Times appearing in chaotic games (chaos score > 70) */
  chaosAppearances: number;

  /** Wins in chaotic games */
  chaosWins: number;

  /** Losses in chaotic games */
  chaosLosses: number;

  /** Average chaos score in their games */
  averageChaosScore: number;

  /** Record in chaos games */
  chaosRecord: string;

  /** Percentage of team's games that were chaotic */
  chaosGamePercentage: number;

  /** Primary chaos tag for this team */
  primaryChaosTag: ChaosTag | null;

  /** Rank among all teams */
  rank: number;
}

/**
 * Upset analysis for a single game.
 * Detailed data for upset categorization.
 */
export interface UpsetAnalysis {
  /** Game ID */
  gameId: number;

  /** Expected winner team ID (favored team) */
  expectedWinnerId: number;

  /** Expected winner name */
  expectedWinnerName: string;

  /** Expected loser team ID (underdog) */
  expectedLoserId: number;

  /** Expected loser name */
  expectedLoserName: string;

  /** Preseason rating of favored team */
  favoritesPreseasonRating: number;

  /** Preseason rating of underdog */
  underdogPreseasonRating: number;

  /** Rating differential at game time */
  ratingDifferential: number;

  /** Vegas spread (positive = underdog favored) */
  vegasSpread: number | null;

  /** Win probability of favorite */
  favoriteWinProb: number | null;

  /** Upset magnitude score (0-100) */
  upsetMagnitude: number;

  /** Type of upset */
  upsetType: "ranked_vs_unranked" | "top_10" | "top_25" | "minor_upset";

  /** Is this an upset? */
  isUpset: boolean;

  /** Chaos involved in upset */
  chaosComponents: ChaosComponents;

  /** Key turning point */
  turningPoint: string | null;

  /** Upset narrative */
  narrative: string | null;
}

/**
 * Comeback analysis for a single game.
 * Tracks deficit, momentum, and comeback story.
 */
export interface ComebackAnalysis {
  /** Game ID */
  gameId: number;

  /** Team that came back (now winner) */
  comebackTeamId: number;

  /** Comeback team name */
  comebackTeamName: string;

  /** Team that blew lead (now loser) */
  blowLeadTeamId: number;

  /** Blow lead team name */
  blowLeadTeamName: string;

  /** Largest deficit overcome */
  largestDeficit: number;

  /** Quarter of largest deficit */
  deficitQuarter: 1 | 2 | 3 | 4;

  /** Time remaining when largest deficit existed */
  timeRemainingAtDeficit: string;

  /** Final margin of victory */
  finalMargin: number;

  /** Was this a game-winning drive */
  gameWinningDrive: boolean;

  /** Seconds remaining for game winner */
  secondsRemaining: number | null;

  /** Win probability of comeback team at nadir */
  lowestWP: number;

  /** Win probability at end */
  finalWP: number;

  /** WP swing from lowest to final */
  wpSwing: number;

  /** Key plays in comeback */
  keyPlays: Array<{
    description: string;
    time: string;
    wpGain: number;
  }>;

  /** Comeback narrative */
  narrative: string | null;

  /** Comeback drama score (0-100) */
  dramaDcore: number;
}

/**
 * Thriller game analysis.
 * Measures games that were close and uncertain throughout.
 */
export interface ThrillerAnalysis {
  /** Game ID */
  gameId: number;

  /** Home team ID */
  homeTeamId: number;

  /** Home team name */
  homeTeamName: string;

  /** Away team ID */
  awayTeamId: number;

  /** Away team name */
  awayTeamName: string;

  /** Final margin (how close was it) */
  finalMargin: number;

  /** Number of lead changes */
  leadChanges: number;

  /** Number of ties in the game */
  timesTied: number;

  /** Win probability volatility (0-1, higher = more swings) */
  wpVolatility: number;

  /** Average absolute WP deviation from 50% */
  avgWPDeviation: number;

  /** Whether game was decided by single possession (FG) */
  singlePossessionDecision: boolean;

  /** Thriller score (0-100) */
  thrillerScore: number;

  /** Time of game — was it close in 4th quarter? */
  fourth_quarter_margin_range: number;

  /** Largest lead by winner */
  largestLeadByWinner: number | null;

  /** When largest lead occurred */
  largestLeadTime: string | null;

  /** Narrative */
  narrative: string | null;
}
