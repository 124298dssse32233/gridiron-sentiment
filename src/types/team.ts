/**
 * Team Type Definitions
 * Core types for teams, conferences, and football levels across all divisions.
 */

/**
 * College football division levels.
 * Maps to: FBS (Power 5 + G5), FCS (I-AA), D2, D3, NAIA
 */
export type Level = "FBS" | "FCS" | "D2" | "D3" | "NAIA";

/**
 * Represents a team without ranking data (base info only).
 * Used for team lookups, API responses, and team selectors.
 */
export interface TeamBase {
  /** Primary key from database */
  id: number;

  /** Full team name (e.g., "Ohio State University") */
  name: string;

  /** Team mascot name (e.g., "Buckeyes") */
  mascot: string | null;

  /** Team abbreviation (e.g., "OSU") */
  abbreviation: string | null;

  /** URL-safe slug for routes (e.g., "ohio-state") */
  slug: string;

  /** Primary brand color (hex code, e.g., "#cc0000") */
  primaryColor: string | null;

  /** Secondary brand color (hex code, e.g., "#ffffff") */
  secondaryColor: string | null;

  /** URL to team logo */
  logoUrl: string | null;

  /** City where team is located */
  city: string | null;

  /** State abbreviation (e.g., "OH") */
  state: string | null;

  /** Football stadium/venue name */
  stadium: string | null;

  /** Stadium seating capacity */
  stadiumCapacity: number | null;

  /** School location metadata (latitude, longitude, elevation, etc.) */
  metadata: Record<string, unknown> | null;

  /** Created timestamp */
  createdAt: Date;

  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Team with current season ranking and rating information.
 * Extends TeamBase with Glicko-2 rating components and ranking metadata.
 * Used for rankings table, home page, and team cards.
 */
export interface TeamWithRatings extends TeamBase {
  /** Conference ID foreign key */
  conferenceId: number | null;

  /** Division level (FBS, FCS, D2, D3, NAIA) */
  level: Level;

  /** Glicko-2 rating (team strength) — typically 700-1600 scale */
  rating: number;

  /** Rating Deviation — uncertainty in rating (higher = less reliable) */
  ratingDeviation: number;

  /** Volatility — performance consistency (Glicko-2 volatility parameter) */
  volatility: number;

  /** Current season ranking (1-N across all divisions) */
  rank: number | null;

  /** Previous ranking for comparison (week-to-week delta) */
  previousRank: number | null;

  /** Change in rating from previous week */
  ratingChange: number | null;

  /** Offensive rating component (Glicko-2 derived) */
  offenseRating: number | null;

  /** Defensive rating component (Glicko-2 derived) */
  defenseRating: number | null;

  /** Strength of Schedule (pre-computed or projected) */
  sos: number | null;

  /** Current season wins */
  wins: number | null;

  /** Current season losses */
  losses: number | null;

  /** Playoff probability (0-1 scale) */
  playoffProbability: number | null;

  /** Array of recent rating changes (sparkline data) — last 13 weeks */
  sparkline: number[];

  /** Number of games played this season */
  gamesPlayed: number;
}

/**
 * Complete team data with full context.
 * Extends TeamWithRatings with related conference, roster, and schedule info.
 * Used for team detail pages and comprehensive API responses.
 */
export interface TeamFull extends TeamWithRatings {
  /** Conference information (nested) */
  conference: ConferenceInfo | null;

  /** Array of recent game results (this season) */
  recentGames: Array<{
    gameId: number;
    opponent: string;
    opponentSlug: string;
    opponentLogo: string | null;
    score: number;
    opponentScore: number;
    date: Date;
    isWin: boolean;
    isHome: boolean;
  }>;

  /** Total roster size */
  rosterSize: number;

  /** Number of key starters */
  starters: number;

  /** Recruiting class year (e.g., 2024) */
  recruitingClassYear: number | null;

  /** Average recruit rating for incoming class */
  avgRecruitRating: number | null;

  /** Total 5-star recruits in current roster */
  fiveStars: number | null;

  /** Total 4-star recruits in current roster */
  fourStars: number | null;

  /** All-time wins (program history) */
  allTimeWins: number | null;

  /** All-time losses (program history) */
  allTimeLosses: number | null;

  /** All-time bowl game appearances */
  bowlAppearances: number | null;

  /** National championships in history */
  nationalChampionships: number | null;
}

/**
 * Conference information (nested in TeamWithRatings).
 * Represents the athletic conference a team belongs to.
 */
export interface ConferenceInfo {
  /** Primary key */
  id: number;

  /** Full conference name (e.g., "Big Ten Conference") */
  name: string;

  /** Conference abbreviation (e.g., "BIG") */
  abbreviation: string | null;

  /** URL-safe slug for routes (e.g., "big-ten") */
  slug: string;

  /** Conference level (FBS, FCS, D2, D3, NAIA) */
  level: Level;

  /** Number of teams in conference */
  teamCount: number;

  /** Average rating of all teams in conference */
  averageRating: number | null;

  /** Conference power ranking (1-N among conferences at same level) */
  powerRank: number | null;
}

/**
 * Level information (division/classification data).
 * Represents a football level and its baseline stats.
 */
export interface LevelInfo {
  /** Primary key */
  id: number;

  /** Level name (FBS, FCS, D2, D3, NAIA) */
  name: Level;

  /** URL-safe slug */
  slug: string;

  /** Base rating for new teams (prior assumption) */
  baseRating: number;

  /** Number of active teams at this level */
  teamCount: number;

  /** Average rating across all teams at this level */
  averageRating: number | null;

  /** Power factor for Glicko-2 calculations */
  powerFactor: number;
}

/**
 * Team metadata and extended information.
 * Flattened data from Team.metadata JSON field for easier access.
 */
export interface TeamMetadata {
  /** CFBD API team ID (for data lookups) */
  cfbdId: number | null;

  /** Array of alternate team names (e.g., "Tarheels", "UNC Tar Heels") */
  alternateNames: string[];

  /** Array of logo URLs (different versions/years) */
  logos: string[];

  /** Twitter/X handle (without @) */
  twitterHandle: string | null;

  /** Wikipedia URL */
  wikipediaUrl: string | null;

  /** Official athletics website URL */
  athleticsUrl: string | null;

  /** Stadium latitude */
  latitude: number | null;

  /** Stadium longitude */
  longitude: number | null;

  /** Stadium elevation in feet */
  elevation: number | null;

  /** Stadium surface type (grass, turf, artificial, etc.) */
  stadiumSurface: string | null;

  /** Founded year of university */
  founded: number | null;

  /** Color scheme type (for UI theming) */
  colorScheme: "primary" | "secondary" | null;

  /** Stadium opening year */
  stadiumOpened: number | null;

  /** All-time home record */
  homeFieldAdvantage: number | null;

  /** Recruiting national rank (current cycle) */
  recruitingNationalRank: number | null;
}

/**
 * Light team summary for lists, cards, and selectors.
 * Minimal data for fast rendering in dropdowns, etc.
 */
export interface TeamSummary {
  id: number;
  name: string;
  abbreviation: string | null;
  slug: string;
  logoUrl: string | null;
  level: Level;
  conference: string | null;
  primaryColor: string | null;
}

/**
 * Team comparison data for matchup visualizations.
 * Flattened data from TeamWithRatings optimized for side-by-side display.
 */
export interface TeamComparison {
  team: TeamWithRatings;
  record: `${number}-${number}`;
  ratingDisplay: string; // e.g., "1523 ± 47"
  ratingPercentile: number; // 0-100
  sosPercentile: number; // 0-100
  offensePercentile: number; // 0-100
  defensePercentile: number; // 0-100
  recentForm: "↑" | "→" | "↓"; // visual trend indicator
}

/**
 * Team trend data for historical visualization.
 * Single time point of team data.
 */
export interface TeamTrendPoint {
  week: number;
  date: Date;
  rating: number;
  rank: number | null;
  wins: number;
  losses: number;
  offenseRating: number | null;
  defenseRating: number | null;
  sos: number | null;
}
