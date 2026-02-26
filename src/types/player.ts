/**
 * Player Type Definitions
 * Types for players, recruiting, transfers, and roster intelligence.
 */

/**
 * Player position on the field.
 */
export type Position =
  | "QB"
  | "RB"
  | "FB"
  | "WR"
  | "TE"
  | "OT"
  | "OG"
  | "OC"
  | "DE"
  | "DT"
  | "EDGE"
  | "LB"
  | "CB"
  | "S"
  | "ATH"
  | "K"
  | "P"
  | "LS"
  | "OTHER";

/**
 * Academic class year of player.
 */
export type ClassYear = "FR" | "SO" | "JR" | "SR" | "GR";

/**
 * Base player information without career stats.
 */
export interface PlayerBase {
  /** Primary key from database */
  id: number;

  /** CFBD API player ID */
  cfbdId: number | null;

  /** Player name */
  name: string;

  /** Position on field */
  position: Position | null;

  /** Current team ID foreign key */
  currentTeamId: number | null;

  /** Height in inches (e.g., 75 = 6'3") */
  heightInches: number | null;

  /** Weight in pounds */
  weightLbs: number | null;

  /** Academic class (FR, SO, JR, SR, GR) */
  class: ClassYear | null;

  /** Years of eligibility remaining (0-4) */
  eligibilityRemaining: number | null;

  /** Hometown city */
  hometown: string | null;

  /** Hometown state */
  homeState: string | null;

  /** High school name */
  highSchool: string | null;

  /** Created timestamp */
  createdAt: Date;

  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Player with recruiting information.
 * Extends PlayerBase with recruitment evaluation data.
 */
export interface PlayerRecruiting extends PlayerBase {
  /** 247Sports rating (0-1000 scale) */
  recruitRating: number | null;

  /** Star rating (1-5) */
  recruitStars: number | null;

  /** Composite rating across all services (0-1000) */
  recruitComposite: number | null;

  /** National ranking for player's class */
  recruitNationalRank: number | null;

  /** Position ranking within class */
  recruitPositionRank: number | null;

  /** State ranking within class */
  recruitStateRank: number | null;

  /** Year player was recruited (e.g., 2024) */
  recruitClassYear: number | null;

  /** Recruiting class rank nationally */
  classRank: number | null;

  /** Recruiting services that rated this player */
  ratingServices: string[];

  /** Commitment status (committed, signed, enrolled, etc.) */
  commitmentStatus: "committed" | "signed" | "enrolled" | "decommitted" | null;
}

/**
 * Player with career performance data.
 * Extends PlayerRecruiting with statistical accomplishments.
 */
export interface PlayerCareer extends PlayerRecruiting {
  /** Career EPA (Expected Points Added) */
  careerEpa: number | null;

  /** Career snaps played */
  careerSnaps: number | null;

  /** Career games played */
  careerGames: number | null;

  /** Total touchdowns scored */
  totalTouchdowns: number | null;

  /** Draft projection (e.g., "1st Round", "2nd Round", "Undrafted") */
  draftProjection: string | null;

  /** Draft grade (Mel Kiper, etc.) */
  draftGrade: string | null;

  /** NFL team drafted by (if applicable) */
  nflTeam: string | null;

  /** NFL draft pick (if applicable) */
  nflDraftPick: number | null;

  /** NFL draft round (if applicable) */
  nflDraftRound: number | null;

  /** Pro Bowl selections */
  proBowls: number;

  /** All-Pro selections */
  allPros: number;
}

/**
 * Player transfer event.
 * Single instance of a player moving between teams.
 */
export interface PlayerTransfer {
  /** Unique transfer ID */
  transferId: number;

  /** Player ID */
  playerId: number;

  /** Player name */
  playerName: string;

  /** Player position */
  position: Position | null;

  /** Team player transferred from */
  fromTeamId: number | null;

  /** From team name */
  fromTeamName: string | null;

  /** From team logo */
  fromTeamLogo: string | null;

  /** Team player transferred to */
  toTeamId: number | null;

  /** To team name */
  toTeamName: string | null;

  /** To team logo */
  toTeamLogo: string | null;

  /** Year of transfer (e.g., 2024) */
  transferYear: number | null;

  /** Transfer window ("spring" or "fall") */
  transferWindow: "spring" | "fall" | null;

  /** EPA per play before transfer */
  preTransferEpa: number | null;

  /** Snaps before transfer */
  preTransferSnaps: number | null;

  /** EPA per play after transfer */
  postTransferEpa: number | null;

  /** Snaps after transfer */
  postTransferSnaps: number | null;

  /** Change in EPA per play (post - pre) */
  epaDelta: number | null;

  /** Impact rating of transfer (0-100) */
  impactRating: number | null;

  /** Transfer status (enrolled, committed, left program, etc.) */
  status: "enrolled" | "committed" | "left" | "transferred_again" | null;

  /** Reason for transfer (if known) */
  transferReason: string | null;

  /** Narrative/analysis of transfer */
  narrative: string | null;

  /** Timestamp */
  createdAt: Date;
}

/**
 * Player statistical outlier (The Lab).
 * Player identified as exceptional in a statistical category.
 */
export interface PlayerOutlier {
  /** Unique outlier ID */
  outlierId: number;

  /** Season year */
  season: number;

  /** Player name */
  playerName: string;

  /** Player position */
  position: Position | null;

  /** Team ID */
  teamId: number | null;

  /** Team name */
  teamName: string | null;

  /** Outlier category name (e.g., "EPA Monsters", "Surgical Precision") */
  category: string;

  /** Stat label (e.g., "EPA per play", "Comp%", "Yards per attempt") */
  statLabel: string | null;

  /** Actual stat value */
  statValue: number | null;

  /** Z-score (how many std devs from mean) */
  zscore: number | null;

  /** Percentile ranking (0-100) */
  percentile: number | null;

  /** Detailed description of outlier stat */
  detail: string | null;

  /** Why this is notable */
  significance: string | null;

  /** Player photo URL */
  photoUrl: string | null;

  /** Timestamp */
  computedAt: Date;
}

/**
 * Team roster grade for a season.
 * Evaluation of team's talent composition and development.
 */
export interface TeamRosterGrade {
  /** Unique roster grade ID */
  gradeId: number;

  /** Team ID */
  teamId: number;

  /** Season year */
  season: number;

  /** Overall talent composite score (0-1000 scale) */
  overallTalentScore: number | null;

  /** National rank by talent (1 = most talented) */
  talentNationalRank: number | null;

  /** High school recruit talent score */
  hsRecruitTalent: number | null;

  /** Portal-acquired talent score */
  portalAcquiredTalent: number | null;

  /** Homegrown development score */
  homegrownDevScore: number | null;

  /** Transfer portal additions this offseason */
  portalAdditions: number | null;

  /** Transfer portal departures */
  portalLosses: number | null;

  /** Net EPA impact of portal moves */
  portalNetEpa: number | null;

  /** Portal return on investment (impact vs market value) */
  portalRoi: number | null;

  /** Average rating of recruited players */
  avgRecruitRating: number | null;

  /** Number of 5-star recruits on roster */
  fiveStars: number | null;

  /** Number of 4-star recruits on roster */
  fourStars: number | null;

  /** Number of 3-star recruits on roster */
  threeStars: number | null;

  /** Number of 2-star recruits on roster */
  twoStars: number | null;

  /** Blue chip ratio (5 + 4 stars / total recruits) */
  blueChipRatio: number | null;

  /** Recruiting class rank (current cycle, e.g., 2025 class) */
  recruitingClassRank: number | null;

  /** Composite recruiting class score */
  compositeClassScore: number | null;

  /** Development grade (how much overperform/underperform talent) */
  developmentGrade: number | null;

  /** Percent of high stars who became starters */
  starsToStartersRate: number | null;

  /** Number of low-star overperformers */
  lowStarOverperformers: number | null;

  /** Difference between talent ranking and performance ranking */
  talentVsPerformanceDelta: number | null;

  /** Narrative analysis */
  narrative: string | null;

  /** Timestamp */
  computedAt: Date;
}

/**
 * Award candidate for end-of-season honors.
 * Player ranked for major awards (Heisman, Maxwell, etc.).
 */
export interface AwardCandidate {
  /** Unique candidate ID */
  candidateId: number;

  /** Season year */
  season: number;

  /** Award name (e.g., "Heisman", "Maxwell", "Butkus", etc.) */
  awardName: string;

  /** Player ID (if award is for player) */
  playerId: number | null;

  /** Player name */
  playerName: string | null;

  /** Team ID (if award is for team stat) */
  teamId: number | null;

  /** Position of player */
  position: Position | null;

  /** Probability of winning (0-1 scale) */
  probability: number | null;

  /** Previous probability (week-over-week change) */
  previousProbability: number | null;

  /** Probability change */
  probabilityChange: number | null;

  /** Rank among candidates (1 = favorite) */
  rank: number | null;

  /** Total EPA accumulated */
  totalEpa: number | null;

  /** Team success factor (adjusts for strength of team) */
  teamSuccessFactor: number | null;

  /** Narrative strength (media buzz, storyline factor) */
  narrativeScore: number | null;

  /** Statistical dominance score */
  statisticalScore: number | null;

  /** Historical comparison (e.g., "like 2012 Johnny Manziel") */
  historicalComp: string | null;

  /** Key stats/accomplishments */
  keyStats: Array<{
    label: string;
    value: string;
    rank: string; // e.g., "1st in FBS"
  }>;

  /** Media consensus (aggregated opinion) */
  mediaConsensus: "frontrunner" | "contender" | "longshot" | "outsider" | null;

  /** Award odds (Vegas if available) */
  odds: number | null;

  /** Narrative/analysis */
  narrative: string | null;

  /** Timestamp */
  computedAt: Date;
}

/**
 * Roster composition snapshot.
 * Summary of team's roster makeup by position and star rating.
 */
export interface RosterComposition {
  /** Team ID */
  teamId: number;

  /** Season year */
  season: number;

  /** Total roster size */
  totalPlayers: number;

  /** Players by position */
  byPosition: Record<Position, {
    count: number;
    starAverage: number | null;
    epaLeader: {
      name: string;
      epa: number | null;
    } | null;
  }>;

  /** Players by class year */
  byClass: Record<ClassYear, {
    count: number;
    avgEpa: number | null;
    stars: Record<number, number>; // { 5: 2, 4: 5, 3: 10 }
  }>;

  /** Players by star rating */
  byStars: Record<number, number>; // { 5: 3, 4: 12, 3: 35, 2: 50 }

  /** Portal transfers on roster this year */
  portalPlayers: number;

  /** Percentage of roster from portal */
  portalPercentage: number;

  /** Returning production (players with previous snaps) */
  returningProduction: number;

  /** Percentage of roster with game experience */
  returningPercentage: number;

  /** Depth chart starters (approximate) */
  estimatedStarters: number;

  /** Backup quality rating (0-1) */
  backupQuality: number | null;
}

/**
 * Player comparison for head-to-head analysis.
 */
export interface PlayerComparison {
  /** Player 1 data */
  player1: {
    id: number;
    name: string;
    position: Position | null;
    team: string;
    class: ClassYear | null;
    stars: number | null;
    epa: number | null;
    stats: Record<string, number | null>;
  };

  /** Player 2 data */
  player2: {
    id: number;
    name: string;
    position: Position | null;
    team: string;
    class: ClassYear | null;
    stars: number | null;
    epa: number | null;
    stats: Record<string, number | null>;
  };

  /** Performance comparison */
  comparison: {
    epaAdvantage: "p1" | "p2" | "tie";
    statComparisons: Array<{
      stat: string;
      p1Value: number | null;
      p2Value: number | null;
      p1Percentile: number | null;
      p2Percentile: number | null;
    }>;
  };

  /** Narrative */
  narrative: string | null;
}

/**
 * Recruiting cycle projection/ranking.
 */
export interface RecruitingClassRanking {
  /** Team ID */
  teamId: number;

  /** Team name */
  teamName: string;

  /** Recruiting class year (e.g., 2025) */
  classYear: number;

  /** Current class rank nationally */
  nationalRank: number | null;

  /** Composite class score */
  compositeScore: number | null;

  /** Number of commits/signees */
  commits: number;

  /** Average recruit rating */
  avgRating: number | null;

  /** 5-star commits */
  fiveStars: number;

  /** 4-star commits */
  fourStars: number;

  /** 3-star commits */
  threeStars: number;

  /** Ranking momentum (improving/declining) */
  momentum: "↑" | "→" | "↓";

  /** Commits still expected */
  openScholarships: number;

  /** Players to focus on (top targets) */
  topTargets: Array<{
    name: string;
    position: Position | null;
    rating: number | null;
    hometown: string | null;
  }>;

  /** Narrative/analysis */
  narrative: string | null;

  /** Last updated */
  updatedAt: Date;
}

/**
 * Portal transfer target/war room player.
 */
export interface PortalTarget {
  /** Player name */
  playerName: string;

  /** Position */
  position: Position | null;

  /** Current team (if still in portal) */
  currentTeam: string | null;

  /** Prior team */
  priorTeam: string;

  /** Class year */
  class: ClassYear | null;

  /** EPA at prior school */
  priorEpa: number | null;

  /** Star rating */
  stars: number | null;

  /** Teams interested (tracking) */
  interestedTeams: string[];

  /** Target team (for perspective of one team) */
  targetTeamInterest: "high" | "medium" | "low" | null;

  /** Likelihood to transfer to target team (0-1) */
  transferProbability: number | null;

  /** Impact rating if transferred (0-100) */
  potentialImpact: number | null;

  /** Salary/NIL estimate if known */
  estimatedNil: number | null;

  /** Last updated */
  updatedAt: Date;
}
