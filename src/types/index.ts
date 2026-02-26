/**
 * Type Definitions Index
 * Central export point for all Gridiron Intel type definitions.
 * Import from '@/types' for cleaner imports across the codebase.
 */

// Team types
export type { Level } from "./team";
export type {
  TeamBase,
  TeamWithRatings,
  TeamFull,
  ConferenceInfo,
  LevelInfo,
  TeamMetadata,
  TeamSummary,
  TeamComparison,
  TeamTrendPoint,
} from "./team";

// Game types
export type { GameBase, GameWithStats, GameResult, PlayByPlay, PlayType } from "./game";
export type {
  QuarterScore,
  LineScore,
  GamePrediction,
  WinProbabilityPoint,
  WinProbabilityChart,
  UnitStats,
  GameSummary,
} from "./game";

// Ranking types
export type {
  TeamRating,
  RankingEntry,
  RankingSnapshot,
  ProgramRanking,
  RatingHistoryPoint,
  RatingHistory,
  ConferenceRanking,
  LevelRanking,
  PlayoffProbability,
  RankingDelta,
} from "./ranking";

// Chaos types
export type {
  ChaosTag,
  ChaosComponents,
  ChaosGame,
  ChaosWeek,
  ChaosSeason,
  ChaosLeaderboardEntry,
  UpsetAnalysis,
  ComebackAnalysis,
  ThrillerAnalysis,
} from "./chaos";

// Coach types
export type {
  DecisionType,
  FourthDownSituation,
  CoachDecision,
  TwoPointSituation,
  TimeoutSituation,
  ClockManagementSituation,
  CoachGrade,
  CoachComparison,
  DecisionCalculator,
  CoachingStatsSummary,
  CoachLeaderboardEntry,
} from "./coach";

// Player types
export type {
  Position,
  ClassYear,
  PlayerBase,
  PlayerRecruiting,
  PlayerCareer,
  PlayerTransfer,
  PlayerOutlier,
  TeamRosterGrade,
  AwardCandidate,
  RosterComposition,
  PlayerComparison,
  RecruitingClassRanking,
  PortalTarget,
} from "./player";
