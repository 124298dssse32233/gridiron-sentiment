/**
 * Ranking Type Definitions
 * Types for GridRank ratings, rankings, and historical ranking data.
 */

import type { Level } from "./team";

/**
 * Glicko-2 rating components for a single team at a point in time.
 * Core rating parameters used by GridRank algorithm.
 */
export interface TeamRating {
  /** Glicko-2 rating (μ) — team strength on 700-1600 scale depending on level */
  rating: number;

  /** Rating Deviation (RD) — uncertainty in rating (50-350 typical range) */
  ratingDeviation: number;

  /** Volatility (σ) — performance consistency (0.03-0.20 typical range) */
  volatility: number;

  /** Effective rating (rating adjusted for uncertainty) */
  effectiveRating: number;

  /** Number of games used to calculate this rating */
  gamesPlayed: number;

  /** Timestamp of last rating update */
  lastUpdated: Date;
}

/**
 * Single team entry in a power ranking snapshot.
 * Complete ranking data for one team at one point in time.
 * Used for rankings table, historical comparisons, and detailed analysis.
 */
export interface RankingEntry {
  /** Ranking position (1 = best team) */
  rank: number;

  /** Team ID (foreign key) */
  teamId: number;

  /** Team name for display */
  teamName: string;

  /** Team abbreviation */
  teamAbbr: string | null;

  /** Team logo URL */
  logoUrl: string | null;

  /** Team primary color (hex) for visual theming */
  primaryColor: string | null;

  /** Division level (FBS, FCS, D2, D3, NAIA) */
  level: Level;

  /** Conference name */
  conference: string | null;

  /** Current Glicko-2 rating (μ) */
  rating: number;

  /** Rating Deviation (uncertainty) */
  ratingDeviation: number;

  /** Current season wins */
  wins: number | null;

  /** Current season losses */
  losses: number | null;

  /** Record display string (e.g., "12-1") */
  recordDisplay: string;

  /** Rank change from previous week (positive = improved) */
  rankChange: number | null;

  /** Rating change from previous week */
  ratingChange: number | null;

  /** Offensive rating component */
  offenseRating: number | null;

  /** Defensive rating component */
  defenseRating: number | null;

  /** Strength of schedule (remaining or full season) */
  sos: number | null;

  /** Playoff probability (0-1 scale) */
  playoffProbability: number | null;

  /** Recent rating trend (last 13 weeks or weeks played) */
  sparkline: number[];

  /** Direction indicator for trend ("up", "down", "flat") */
  trend: "up" | "down" | "flat";

  /** Percentile ranking within all teams (0-100) */
  percentile: number;

  /** Percentile ranking within division level (0-100) */
  levelPercentile: number;

  /** Percentile ranking within conference (0-100) */
  conferencePercentile: number | null;

  /** Margin of victory (average points won by) */
  avgMarginOfVictory: number | null;

  /** Games remaining in season */
  gamesRemaining: number;

  /** Playoff seeding if applicable */
  playoffSeed: number | null;
}

/**
 * Complete ranking snapshot at a specific time.
 * All teams ranked together for point-in-time comparison.
 * Used for weekly rankings release, historical snapshots, and trend analysis.
 */
export interface RankingSnapshot {
  /** Unique ranking ID */
  rankingId: number;

  /** Season year (e.g., 2024) */
  season: number;

  /** Week number (null for preseason, 1-17 for regular/postseason) */
  week: number | null;

  /** Week label for display ("Preseason", "Week 1", "Playoffs", etc.) */
  weekLabel: string;

  /** Timestamp when ranking was computed */
  computedAt: Date;

  /** Algorithm version used (e.g., "3.0.1") */
  algorithmVersion: string;

  /** All teams ranked, sorted by rank */
  entries: RankingEntry[];

  /** Count of FBS teams in snapshot */
  fbsCount: number;

  /** Count of FCS teams in snapshot */
  fcsCount: number;

  /** Count of D2 teams in snapshot */
  d2Count: number;

  /** Count of D3 teams in snapshot */
  d3Count: number;

  /** Count of NAIA teams in snapshot */
  naiaCount: number;

  /** Metadata about ranking computation */
  metadata: {
    /** Games processed in this update */
    gamesProcessed: number;

    /** Average rating across all teams */
    averageRating: number;

    /** Rating std deviation */
    ratingStdDev: number;

    /** Number of ranking changes > 5 positions */
    majorChanges: number;

    /** Computation time in milliseconds */
    computationTimeMs: number;
  };
}

/**
 * Program all-time ranking (GridLegacy feature).
 * Composite score of program performance over multiple seasons.
 * Used for GridLegacy rankings page.
 */
export interface ProgramRanking {
  /** Team ID foreign key */
  teamId: number;

  /** Overall program ranking (1 = best all-time program) */
  overallRank: number | null;

  /** Overall composite score (0-1000 scale) */
  overallScore: number | null;

  /** Peak performance score (best season average rating) */
  peakPerformance: number | null;

  /** Consistency score (how stable the program is) */
  consistency: number | null;

  /** Postseason success factor (bowl/playoff performance weighted) */
  postseasonSuccess: number | null;

  /** Average rating across all seasons in evaluation period */
  averageRating: number | null;

  /** Trend score (are they improving?) — positive = getting better */
  trendScore: number | null;

  /** Strength of schedule premium (how they perform vs top teams) */
  sosPremium: number | null;

  /** Time period evaluated (e.g., "2014-2024") */
  evaluationPeriod: string;

  /** Timestamp of last computation */
  computedAt: Date;

  /** Number of seasons included in calculation */
  seasonsEvaluated: number;

  /** Top season in evaluation period */
  topSeason: {
    year: number;
    rating: number;
    rank: number | null;
    record: string;
  } | null;

  /** National championships won in evaluation period */
  nationalChampionships: number;

  /** Playoff appearances in evaluation period */
  playoffAppearances: number;

  /** Bowl appearances in evaluation period */
  bowlAppearances: number;
}

/**
 * Team rating at a single point in history.
 * Used for trend charts and historical analysis.
 */
export interface RatingHistoryPoint {
  /** Week number */
  week: number | null;

  /** Season year */
  season: number;

  /** Team rating at this time */
  rating: number;

  /** Rating deviation at this time */
  ratingDeviation: number;

  /** Team ranking at this time (1-N) */
  rank: number | null;

  /** Wins at this time */
  wins: number | null;

  /** Losses at this time */
  losses: number | null;

  /** Date of this snapshot */
  date: Date;

  /** Recent sparkline for this point */
  sparkline: number[];

  /** Playoff probability at this point */
  playoffProbability: number | null;
}

/**
 * Complete historical rating data for a team.
 * Used for team detail pages and trend visualization.
 */
export interface RatingHistory {
  /** Team ID */
  teamId: number;

  /** Team name */
  teamName: string;

  /** Season year */
  season: number;

  /** Chronological array of rating snapshots */
  history: RatingHistoryPoint[];

  /** Preseason rating */
  preseasonRating: number;

  /** Peak rating in season */
  peakRating: number;

  /** Week peak rating occurred */
  peakRatingWeek: number | null;

  /** Lowest rating in season */
  lowestRating: number;

  /** Week lowest rating occurred */
  lowestRatingWeek: number | null;

  /** Final rating (end of season) */
  finalRating: number;

  /** Total rating change from preseason to final */
  totalRatingChange: number;

  /** Average volatility throughout season */
  avgVolatility: number;

  /** Whether this team made playoffs */
  madePlayoffs: boolean;

  /** Playoff seed if applicable */
  playoffSeed: number | null;

  /** Final ranking if season ended */
  finalRank: number | null;
}

/**
 * Conference power ranking snapshot.
 * All teams in a conference ranked together.
 */
export interface ConferenceRanking {
  /** Conference ID */
  conferenceId: number;

  /** Conference name */
  conferenceName: string;

  /** Season year */
  season: number;

  /** Week number */
  week: number | null;

  /** Number of teams in conference */
  teamCount: number;

  /** Average rating of all teams */
  averageRating: number;

  /** Ranked teams in conference (best to worst) */
  teams: RankingEntry[];

  /** Conference strength indicator (power factor) */
  conferenceStrength: number;

  /** Conference ranking vs other conferences (1 = best) */
  powerRank: number | null;

  /** Number of teams making playoffs (estimate) */
  playoffTeams: number | null;

  /** Teams with >50% playoff probability */
  playoffContenders: number;
}

/**
 * Level-wide ranking snapshot (all teams in one division).
 * All FBS, or all FCS, etc. ranked together.
 */
export interface LevelRanking {
  /** Division level (FBS, FCS, D2, D3, NAIA) */
  level: Level;

  /** Season year */
  season: number;

  /** Week number */
  week: number | null;

  /** Total teams at this level */
  teamCount: number;

  /** Ranked entries for all teams */
  entries: RankingEntry[];

  /** Average rating at this level */
  averageRating: number;

  /** Rating standard deviation */
  ratingStdDev: number;

  /** Top team in level */
  topTeam: RankingEntry | null;

  /** Bottom team in level */
  bottomTeam: RankingEntry | null;

  /** Teams in playoff contention */
  playoffTeams: number;
}

/**
 * Playoff probability data for a team.
 * Used for playoff tracker and predictions.
 */
export interface PlayoffProbability {
  /** Team ID */
  teamId: number;

  /** Team name */
  teamName: string;

  /** Overall playoff probability (0-1) */
  probability: number;

  /** FBS Playoff probability (if FBS) */
  fbs4ProbSeedOne: number | null;

  fbs4ProbSeedTwo: number | null;

  fbs4ProbSeedThree: number | null;

  fbs4ProbSeedFour: number | null;

  /** National championship probability (0-1) */
  nationalChampionshipProb: number;

  /** Rank within playoff contenders */
  rank: number | null;

  /** Games remaining to affect playoff probability */
  gamesRemaining: number;

  /** Vegas-implied playoff probability (from odds) */
  vegasImpliedProb: number | null;

  /** Model confidence in prediction (0-1) */
  modelConfidence: number;

  /** Most likely playoff seed */
  mostLikelySeed: number | null;

  /** Probability by seed (if FBS) */
  seedProbabilities: Record<number, number> | null;

  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Ranking change summary between two time points.
 */
export interface RankingDelta {
  /** Team ID */
  teamId: number;

  /** Team name */
  teamName: string;

  /** Previous rank */
  previousRank: number | null;

  /** Current rank */
  currentRank: number | null;

  /** Rank change (positive = improved) */
  rankChange: number;

  /** Previous rating */
  previousRating: number;

  /** Current rating */
  currentRating: number;

  /** Rating change (positive = improved) */
  ratingChange: number;

  /** Change in playoff probability */
  playoffProbChange: number;

  /** Was this a "mover" (significant rank change) */
  isMover: boolean;

  /** Direction of movement */
  direction: "up" | "down" | "stable";

  /** Reason for change (for narrative) */
  reason: string | null;
}
