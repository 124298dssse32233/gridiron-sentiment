/**
 * Coach Intelligence Type Definitions
 * Types for coach decision analysis, grading, and evaluations.
 */

/**
 * Type of coaching decision being analyzed.
 */
export type DecisionType =
  | "4th_down"
  | "2pt_conversion"
  | "timeout"
  | "clock_management"
  | "field_goal_vs_go"
  | "personnel"
  | "play_call";

/**
 * Fourth-down decision situation details.
 * Captures all relevant context for evaluating a 4th down decision.
 */
export interface FourthDownSituation {
  /** Game ID */
  gameId: number;

  /** Down (always 4) */
  down: 4;

  /** Yards to first down */
  distance: number;

  /** Yard line of offense (0-100, 0 = own goal line) */
  fieldPosition: number;

  /** Score differential (positive = team ahead) */
  scoreDifferential: number;

  /** Time remaining in quarter (MM:SS format) */
  timeRemaining: string;

  /** Current quarter (1-4) */
  quarter: 1 | 2 | 3 | 4;

  /** Win probability before decision */
  winProbabilityBefore: number;

  /** Expected points value of field goal */
  expectedPointsFieldGoal: number | null;

  /** Expected points value of going for it */
  expectedPointsGoForIt: number | null;

  /** Down and distance as string (e.g., "4-and-3") */
  display: string;
}

/**
 * Single coaching decision with analysis.
 * Individual decision point (4th down, 2pt, timeout, etc.) with evaluation.
 * Used for Coach Intelligence feature and decision grading.
 */
export interface CoachDecision {
  /** Unique decision ID */
  decisionId: number;

  /** Game ID foreign key */
  gameId: number;

  /** Team that made decision */
  teamId: number;

  /** Team name */
  teamName: string;

  /** Team abbreviation */
  teamAbbr: string | null;

  /** Coach name */
  coachName: string | null;

  /** Type of decision */
  decisionType: DecisionType;

  /** Situation context */
  situation: FourthDownSituation | Record<string, unknown>;

  /** What decision was made (e.g., "Go for it", "Punt", "Field goal") */
  decisionMade: string;

  /** What the optimal decision would have been */
  optimalDecision: string;

  /** Confidence that optimal decision is correct (0-1) */
  optimalConfidence: number;

  /** Was the decision optimal? */
  wasOptimal: boolean;

  /** Win probability gained/lost by this decision */
  winProbabilityImpact: number;

  /** Win probability of optimal decision */
  optimalWinProbability: number;

  /** Actual game outcome influenced by this decision */
  outcome: string | null;

  /** Did the decision work out? (independent of optimality) */
  workedOut: boolean | null;

  /** Field position if relevant */
  fieldPosition: number | null;

  /** Point in the game (timestamp) */
  gameTime: Date;

  /** Video/clip URL if available */
  clipUrl: string | null;

  /** Decision narrative explanation */
  narrative: string | null;

  /** Meta: was this decision highlighted as good/bad? */
  highlighted: boolean;

  /** Timestamp of analysis */
  analyzedAt: Date;
}

/**
 * Two-point conversion situation.
 */
export interface TwoPointSituation {
  /** Game ID */
  gameId: number;

  /** Down (1 or 2 for 2pt) */
  down: 1 | 2;

  /** Yard line of offense (0-100) */
  fieldPosition: number;

  /** Score after TD and before decision */
  scoreDifferential: number;

  /** Time remaining (MM:SS) */
  timeRemaining: string;

  /** Quarter */
  quarter: 1 | 2 | 3 | 4 | 5; // 5 for OT

  /** Expected points of 2-point attempt */
  expectedPoints2Pt: number | null;

  /** Expected points of kicking PAT */
  expectedPointsPAT: number;

  /** Probability of converting 2-point */
  conversionProbability: number | null;
}

/**
 * Timeout decision situation.
 */
export interface TimeoutSituation {
  /** Game ID */
  gameId: number;

  /** Who called timeout */
  callingTeamId: number;

  /** Timeouts remaining for team */
  timeoutsRemaining: number;

  /** Time on clock (MM:SS) */
  timeRemaining: string;

  /** Quarter */
  quarter: 1 | 2 | 3 | 4;

  /** Down and distance if on offense */
  down: 1 | 2 | 3 | 4 | null;

  distance: number | null;

  /** Score differential */
  scoreDifferential: number;

  /** Whether timeout could prevent game-ending play */
  couldSaveGame: boolean;

  /** Whether timeout is strategic vs. emergency */
  isStrategic: boolean;
}

/**
 * Clock management decision situation.
 */
export interface ClockManagementSituation {
  /** Game ID */
  gameId: number;

  /** Team managing clock */
  teamId: number;

  /** Are they ahead or behind? */
  scenarioType: "trailing" | "leading";

  /** Time remaining */
  timeRemaining: string;

  /** Quarter */
  quarter: 1 | 2 | 3 | 4;

  /** Down and distance */
  down: 1 | 2 | 3 | 4;

  distance: number;

  /** Score differential */
  scoreDifferential: number;

  /** Timeouts remaining */
  timeoutsRemaining: number;

  /** Is this a critical possession? */
  isCritical: boolean;

  /** Optimal play call in situation */
  optimalPlayType: "run" | "pass" | "kneel" | "spike" | "punt" | "fg";
}

/**
 * Coach grading for a season.
 * Comprehensive coaching evaluation across all decision types.
 * Used for Coach Intelligence rankings and analysis.
 */
export interface CoachGrade {
  /** Unique grade ID */
  gradeId: number;

  /** Season year */
  season: number;

  /** Team ID */
  teamId: number;

  /** Team name */
  teamName: string;

  /** Coach name */
  coachName: string | null;

  /** Overall coaching grade (0-100 scale, or A-F letter) */
  overallGrade: number | null;

  /** Overall grade letter */
  overallGradeLetter: "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F" | null;

  /** 4th down decision grade */
  fourthDownGrade: number | null;

  /** 4th down aggressiveness (0-1, is coach too conservative or too aggressive) */
  fourthDownAggressiveness: number | null;

  /** 4th down accuracy (% of 4th downs called optimally) */
  fourthDownAccuracy: number | null;

  /** 2-point conversion grade */
  twoPtGrade: number | null;

  /** 2-pt accuracy (% called optimally) */
  twoPtAccuracy: number | null;

  /** Timeout management grade */
  timeoutGrade: number | null;

  /** Clock management grade */
  clockManagementGrade: number | null;

  /** Personnel decisions grade (playcalling, formations, adjustments) */
  personnelGrade: number | null;

  /** Total win probability gained through good decisions */
  totalWpGained: number | null;

  /** Total win probability lost through bad decisions */
  totalWpLost: number | null;

  /** Net win probability impact (gained - lost) */
  netWpImpact: number | null;

  /** Total decisions analyzed */
  decisionsCount: number;

  /** Decisions that were optimal */
  optimalDecisions: number;

  /** Percentage of decisions that were optimal */
  optimalDecisionPercentage: number | null;

  /** Number of 4th down calls */
  fourthDownCalls: number;

  /** Number of 2-pt calls */
  twoPtCalls: number;

  /** Number of timeouts called strategically */
  strategicTimeouts: number;

  /** Team win-loss record */
  teamRecord: string;

  /** Did team make playoffs */
  madePlayoffs: boolean;

  /** Biggest good decision */
  bestDecision: CoachDecision | null;

  /** Biggest bad decision */
  worstDecision: CoachDecision | null;

  /** Trend vs last season (higher is better) */
  trendVsLastSeason: number | null;

  /** Coach tenure */
  tenure: number;

  /** Career grade if multi-season */
  careerGrade: number | null;

  /** Grade narrative/summary */
  narrative: string | null;

  /** Timestamp of grade computation */
  computedAt: Date;
}

/**
 * Head-to-head coach comparison.
 */
export interface CoachComparison {
  /** Coach 1 data */
  coach1: {
    coachName: string;
    teamName: string;
    teamId: number;
    grade: number | null;
    netWp: number | null;
    fourthDownGrade: number | null;
    record: string;
  };

  /** Coach 2 data */
  coach2: {
    coachName: string;
    teamName: string;
    teamId: number;
    grade: number | null;
    netWp: number | null;
    fourthDownGrade: number | null;
    record: string;
  };

  /** Difference in overall grade */
  gradeDifference: number | null;

  /** Difference in net WP */
  wpDifference: number | null;

  /** Head-to-head record */
  headToHeadRecord: {
    coach1Wins: number;
    coach2Wins: number;
    ties: number;
  } | null;

  /** Narrative comparison */
  narrative: string | null;
}

/**
 * Coach decision calculator for hypothetical situations.
 * Suggests optimal decisions for a given situation.
 */
export interface DecisionCalculator {
  /** Input situation (4th and 3, down 4, etc.) */
  situation: FourthDownSituation | TwoPointSituation | ClockManagementSituation;

  /** Recommended decision */
  recommendation: string;

  /** Expected points value of recommended decision */
  recommendedEP: number | null;

  /** Expected points value of alternative 1 */
  alternative1: {
    decision: string;
    expectedPoints: number | null;
  };

  /** Expected points value of alternative 2 */
  alternative2: {
    decision: string;
    expectedPoints: number | null;
  };

  /** Win probability delta of recommendation vs status quo */
  wpDelta: number | null;

  /** Confidence in recommendation (0-1) */
  confidence: number;

  /** Why this decision is recommended */
  rationale: string;

  /** Historical data point (how often do good teams do this?) */
  historicalFrequency: number | null;

  /** Success rate of similar decisions */
  successRate: number | null;
}

/**
 * Season coaching statistics summary.
 * Aggregate statistics for a coach's season.
 */
export interface CoachingStatsSummary {
  /** Coach name */
  coachName: string;

  /** Team name */
  teamName: string;

  /** Season year */
  season: number;

  /** Win-loss record */
  record: string;

  /** Number of decisions analyzed */
  totalDecisions: number;

  /** Percent optimal */
  optimalPercentage: number | null;

  /** Net win probability impact */
  netWp: number | null;

  /** 4th down calls and accuracy */
  fourthDownStats: {
    calls: number;
    optimal: number;
    accuracy: number | null;
    wpGained: number | null;
  };

  /** 2-pt calls and accuracy */
  twoPtStats: {
    calls: number;
    optimal: number;
    accuracy: number | null;
    wpGained: number | null;
  };

  /** Timeout usage */
  timeoutStats: {
    called: number;
    strategicCalls: number;
    emergencyCalls: number;
  };

  /** Biggest win */
  biggestWin: {
    opponent: string;
    margin: number;
  } | null;

  /** Most impressive coaching performance */
  mostImpressiveGame: {
    opponent: string;
    netWp: number;
  } | null;

  /** Worst coaching performance */
    worstGame: {
    opponent: string;
    netWp: number;
  } | null;
}

/**
 * Coach leaderboard entry for rankings.
 */
export interface CoachLeaderboardEntry {
  /** Rank among all coaches */
  rank: number;

  /** Coach name */
  coachName: string;

  /** Team name */
  teamName: string;

  /** Team logo */
  teamLogo: string | null;

  /** Overall grade */
  grade: number | null;

  /** Grade letter */
  gradeLetter: string | null;

  /** Net WP impact */
  netWp: number | null;

  /** Win-loss record */
  record: string;

  /** Decision accuracy percentage */
  accuracy: number | null;

  /** Tenure at school (years) */
  tenure: number;

  /** Career grade if multi-season */
  careerGrade: number | null;

  /** Trend (up/down) */
  trend: "↑" | "→" | "↓";
}
