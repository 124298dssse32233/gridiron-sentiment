/**
 * Data Transformation Pipeline
 *
 * Transforms raw CFBD API responses and Prisma query results into the shapes
 * our engines and API responses expect.
 *
 * Responsibilities:
 * - API response → engine input (null safety, type narrowing)
 * - Prisma query results → engine input
 * - Engine output → API response format
 * - Batch transformations with error handling
 */

import type {
  CFBDGame,
  CFBDTeam,
  CFBDRecruitingPlayer,
  CFBDPlay,
  CFBDAdvancedBoxScore,
} from "./client";
import type {
  GameBase,
  GameWithStats,
  GameResult,
  TeamBase,
  TeamWithRatings,
  Level,
} from "@/types/team";
import type { RankingEntry, RankingSnapshot } from "@/types/ranking";
import type { ChaosGame, ChaosComponents } from "@/types/chaos";
import type { Game as PrismaGame } from "@prisma/client";

// =============================================================================
// TYPE DEFINITIONS FOR PRISMA SHAPES
// =============================================================================

/**
 * Expected shape from Prisma Game query with stats and related data
 */
interface PrismaGameWithStats extends PrismaGame {
  homeTeam: {
    id: number;
    name: string;
    abbreviation: string | null;
    logoUrl: string | null;
    level: { name: Level };
  };
  awayTeam: {
    id: number;
    name: string;
    abbreviation: string | null;
    logoUrl: string | null;
    level: { name: Level };
  };
}

/**
 * Expected shape from Prisma Team query with ratings
 */
interface PrismaTeamWithRatings {
  id: number;
  name: string;
  mascot: string | null;
  abbreviation: string | null;
  slug: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoUrl: string | null;
  city: string | null;
  state: string | null;
  stadium: string | null;
  stadiumCapacity: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  levelId: number;
  conferenceId: number | null;
  level: { name: Level };
  conference: { name: string; abbreviation: string | null } | null;
}

// =============================================================================
// CFBD API → ENGINE INPUT
// =============================================================================

/**
 * Transform raw CFBD Game API response to GameBase
 * Handles null safety and date string conversions
 */
export function transformCFBDGame(raw: CFBDGame): GameBase {
  // Calculate final scores from line scores if not directly provided
  const homeScore = raw.homePoints ?? calculateScoreFromLineScores(raw.homeLineScores);
  const awayScore = raw.awayPoints ?? calculateScoreFromLineScores(raw.awayLineScores);

  // Infer week from seasonType if not provided
  const week = raw.week ?? inferWeekFromSeasonType(raw.seasonType);

  return {
    id: parseInt(raw.id, 10),
    season: raw.season,
    week,
    gameDate: raw.startDate ? new Date(raw.startDate) : null,
    homeTeamId: raw.homeId ?? 0,
    awayTeamId: raw.awayId ?? 0,
    homeScore: homeScore ?? null,
    awayScore: awayScore ?? null,
    isNeutralSite: raw.neutralSite ?? false,
    isConferenceGame: raw.conferenceGame ?? null,
    isPostseason: raw.seasonType === "postseason",
    metadata: {
      cfbdId: raw.id,
      venue: raw.venue,
      venueId: raw.venueId,
      attendance: raw.attendance,
      notes: raw.notes,
      highlights: raw.highlights,
      homeLineScores: raw.homeLineScores,
      awayLineScores: raw.awayLineScores,
      homePregameElo: raw.homePregameElo,
      awayPregameElo: raw.awayPregameElo,
      homePostgameElo: raw.homePostgameElo,
      awayPostgameElo: raw.awayPostgameElo,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Transform raw CFBD Team API response to TeamBase
 * Normalizes team data for database ingestion
 */
export function transformCFBDTeam(raw: CFBDTeam): TeamBase {
  // Map CFBD classification to our Level type
  const levelMap: Record<string, Level> = {
    FBS: "FBS",
    FCS: "FCS",
    "fbs-2024": "FBS",
    "fcs-2024": "FCS",
  };
  const level = levelMap[raw.classification] ?? "FBS";

  // Convert hex color strings (CFBD may or may not include #)
  const primaryColor = raw.color ? (raw.color.startsWith("#") ? raw.color : `#${raw.color}`) : null;
  const secondaryColor = raw.alternateColor
    ? raw.alternateColor.startsWith("#")
      ? raw.alternateColor
      : `#${raw.alternateColor}`
    : null;

  // Create URL-safe slug from school name
  const slug = raw.school
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    id: parseInt(raw.id, 10),
    name: raw.school,
    mascot: raw.mascot ?? null,
    abbreviation: raw.abbreviation ?? null,
    slug,
    primaryColor,
    secondaryColor,
    logoUrl: raw.logos?.[0] ?? null,
    city: raw.location?.city ?? null,
    state: raw.location?.state ?? null,
    stadium: raw.location?.name ?? null,
    stadiumCapacity: raw.location?.capacity ?? null,
    metadata: {
      cfbdId: raw.id,
      alternateNames: [raw.altName1, raw.altName2, raw.altName3].filter(Boolean),
      logos: raw.logos ?? [],
      twitterHandle: raw.twitter ?? null,
      latitude: raw.location?.latitude ?? null,
      longitude: raw.location?.longitude ?? null,
      elevation: raw.location?.elevation ?? null,
      stadiumSurface: raw.location?.grass ? "grass" : null,
      stadiumOpened: raw.location?.yearConstructed ?? null,
      dome: raw.location?.dome ?? false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Transform raw CFBD Recruiting Player to minimal player shape
 * Used for roster intelligence seeding
 */
export function transformCFBDRecruit(raw: CFBDRecruitingPlayer): {
  cfbdId: string;
  name: string;
  position: string;
  team: string;
  stars: number;
  rating: number;
  height: number;
  weight: number;
  city: string;
  state: string;
  year: number;
} {
  return {
    cfbdId: raw.athleteId,
    name: raw.name,
    position: raw.position,
    team: raw.committedTo,
    stars: raw.stars,
    rating: raw.rating,
    height: raw.height,
    weight: raw.weight,
    city: raw.city,
    state: raw.stateProvince,
    year: raw.year,
  };
}

// =============================================================================
// PRISMA → ENGINE INPUT
// =============================================================================

/**
 * Transform Prisma Team query result to TeamWithRatings
 * Assumes the query includes ratings data
 */
export function transformPrismaTeamToRating(
  dbTeam: PrismaTeamWithRatings & { ratings?: { rating: number; ratingDeviation: number }[] }
): TeamWithRatings {
  const latestRating = dbTeam.ratings?.[0];

  return {
    id: dbTeam.id,
    name: dbTeam.name,
    mascot: dbTeam.mascot,
    abbreviation: dbTeam.abbreviation,
    slug: dbTeam.slug,
    primaryColor: dbTeam.primaryColor,
    secondaryColor: dbTeam.secondaryColor,
    logoUrl: dbTeam.logoUrl,
    city: dbTeam.city,
    state: dbTeam.state,
    stadium: dbTeam.stadium,
    stadiumCapacity: dbTeam.stadiumCapacity,
    metadata: dbTeam.metadata,
    createdAt: dbTeam.createdAt,
    updatedAt: dbTeam.updatedAt,
    conferenceId: dbTeam.conferenceId,
    level: dbTeam.level.name,
    rating: latestRating?.rating ?? 1500,
    ratingDeviation: latestRating?.ratingDeviation ?? 250,
    volatility: 0.06,
    rank: null,
    previousRank: null,
    ratingChange: null,
    offenseRating: null,
    defenseRating: null,
    sos: null,
    wins: null,
    losses: null,
    playoffProbability: null,
    sparkline: [],
    gamesPlayed: 0,
  };
}

/**
 * Transform Prisma Game to GameBase for engine processing
 */
export function transformPrismaGameToEngine(dbGame: PrismaGameWithStats): GameBase {
  return {
    id: dbGame.id,
    season: dbGame.seasonId,
    week: dbGame.week,
    gameDate: dbGame.gameDate,
    homeTeamId: dbGame.homeTeamId,
    awayTeamId: dbGame.awayTeamId,
    homeScore: dbGame.homeScore,
    awayScore: dbGame.awayScore,
    isNeutralSite: dbGame.isNeutralSite,
    isConferenceGame: dbGame.isConferenceGame,
    isPostseason: dbGame.isPostseason,
    metadata: dbGame.metadata,
    createdAt: dbGame.createdAt,
    updatedAt: dbGame.updatedAt,
  };
}

/**
 * Transform Prisma Game with advanced box score data to GameWithStats
 */
export function transformPrismaGameToStats(
  dbGame: PrismaGameWithStats,
  boxScore?: CFBDAdvancedBoxScore
): GameWithStats {
  const base = transformPrismaGameToEngine(dbGame);
  const margin = dbGame.homeScore && dbGame.awayScore ? dbGame.homeScore - dbGame.awayScore : null;

  return {
    ...base,
    homeEpa: dbGame.homeEpa ? Number(dbGame.homeEpa) : boxScore?.home_ppa?.offense ?? null,
    awayEpa: dbGame.awayEpa ? Number(dbGame.awayEpa) : boxScore?.away_ppa?.offense ?? null,
    homeSuccessRate: dbGame.homeSuccessRate ? Number(dbGame.homeSuccessRate) : null,
    awaySuccessRate: dbGame.awaySuccessRate ? Number(dbGame.awaySuccessRate) : null,
    homeExplosiveness: dbGame.homeExplosiveness ? Number(dbGame.homeExplosiveness) : null,
    awayExplosiveness: dbGame.awayExplosiveness ? Number(dbGame.awayExplosiveness) : null,
    homeWinProb: dbGame.homeWinProb ? Number(dbGame.homeWinProb) : null,
    spread: dbGame.spread ? Number(dbGame.spread) : null,
    overUnder: dbGame.overUnder ? Number(dbGame.overUnder) : null,
    excitementIndex: dbGame.excitementIndex ? Number(dbGame.excitementIndex) : null,
    homeTeamName: dbGame.homeTeam.name,
    awayTeamName: dbGame.awayTeam.name,
    homeTeamAbbr: dbGame.homeTeam.abbreviation,
    awayTeamAbbr: dbGame.awayTeam.abbreviation,
    homeTeamLogo: dbGame.homeTeam.logoUrl,
    awayTeamLogo: dbGame.awayTeam.logoUrl,
    homeTeamLevel: dbGame.homeTeam.level.name,
    awayTeamLevel: dbGame.awayTeam.level.name,
    margin,
    wasUpset: null,
    spreadCovered: null,
    overHit: null,
  };
}

/**
 * Transform Prisma Game to chaos engine input
 * Requires play-by-play data if available
 */
export function transformPrismaGameToChaosInput(
  dbGame: PrismaGameWithStats,
  advancedStats?: CFBDAdvancedBoxScore
): {
  gameId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  spread: number | null;
  homeWinProb: number | null;
  excitementIndex: number | null;
  isNeutralSite: boolean;
  homeSuccessRate: number | null;
  awaySuccessRate: number | null;
} {
  return {
    gameId: dbGame.id,
    homeTeamId: dbGame.homeTeamId,
    awayTeamId: dbGame.awayTeamId,
    homeScore: dbGame.homeScore ?? 0,
    awayScore: dbGame.awayScore ?? 0,
    spread: dbGame.spread ? Number(dbGame.spread) : null,
    homeWinProb: dbGame.homeWinProb ? Number(dbGame.homeWinProb) : null,
    excitementIndex: dbGame.excitementIndex ? Number(dbGame.excitementIndex) : null,
    isNeutralSite: dbGame.isNeutralSite,
    homeSuccessRate: dbGame.homeSuccessRate ? Number(dbGame.homeSuccessRate) : null,
    awaySuccessRate: dbGame.awaySuccessRate ? Number(dbGame.awaySuccessRate) : null,
  };
}

// =============================================================================
// ENGINE OUTPUT → API RESPONSE
// =============================================================================

/**
 * Transform Glicko-2 rating and team data to RankingEntry (API response format)
 */
export function transformRatingToResponse(
  teamId: number,
  rating: number,
  ratingDeviation: number,
  team: {
    name: string;
    abbreviation: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
    level: Level;
    conference: { name: string } | null;
  },
  context: {
    rank: number;
    previousRank?: number | null;
    wins?: number | null;
    losses?: number | null;
    ratingChange?: number | null;
    offenseRating?: number | null;
    defenseRating?: number | null;
    sos?: number | null;
    playoffProbability?: number | null;
    sparkline?: number[];
  }
): RankingEntry {
  const wins = context.wins ?? 0;
  const losses = context.losses ?? 0;
  const sparkline = context.sparkline ?? [];

  // Calculate trend from sparkline
  let trend: "up" | "down" | "flat" = "flat";
  if (sparkline.length >= 2) {
    const recent = sparkline.slice(-5);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const firstHalf = recent.slice(0, Math.ceil(recent.length / 2)).reduce((a, b) => a + b, 0);
    const secondHalf = recent.slice(Math.ceil(recent.length / 2)).reduce((a, b) => a + b, 0);
    if (secondHalf > firstHalf) trend = "up";
    else if (secondHalf < firstHalf) trend = "down";
  }

  return {
    rank: context.rank,
    teamId,
    teamName: team.name,
    teamAbbr: team.abbreviation,
    logoUrl: team.logoUrl,
    primaryColor: team.primaryColor,
    level: team.level,
    conference: team.conference?.name ?? null,
    rating,
    ratingDeviation,
    wins,
    losses,
    recordDisplay: `${wins}-${losses}`,
    rankChange: context.previousRank ? context.previousRank - context.rank : null,
    ratingChange: context.ratingChange ?? null,
    offenseRating: context.offenseRating ?? null,
    defenseRating: context.defenseRating ?? null,
    sos: context.sos ?? null,
    playoffProbability: context.playoffProbability ?? null,
    sparkline,
    trend,
    percentile: 50,
    levelPercentile: 50,
    conferencePercentile: null,
    avgMarginOfVictory: null,
    gamesRemaining: 0,
    playoffSeed: null,
  };
}

/**
 * Transform chaos engine output to API response shape
 */
export function transformChaosToResponse(
  gameId: number,
  chaosScore: number,
  components: Partial<ChaosComponents>,
  game: {
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number;
    awayScore: number;
    gameDate: Date | null;
    week: number | null;
    season: number;
  },
  tags: string[] = []
): ChaosGame {
  return {
    gameId,
    game: {
      id: gameId,
      season: game.season,
      week: game.week,
      gameDate: game.gameDate,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      isNeutralSite: false,
      isConferenceGame: null,
      isPostseason: false,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      homeEpa: null,
      awayEpa: null,
      homeSuccessRate: null,
      awaySuccessRate: null,
      homeExplosiveness: null,
      awayExplosiveness: null,
      homeWinProb: null,
      spread: null,
      overUnder: null,
      excitementIndex: null,
      homeTeamName: "",
      awayTeamName: "",
      homeTeamAbbr: null,
      awayTeamAbbr: null,
      homeTeamLogo: null,
      awayTeamLogo: null,
      homeTeamLevel: "FBS",
      awayTeamLevel: "FBS",
      margin: game.homeScore - game.awayScore,
      wasUpset: null,
      spreadCovered: null,
      overHit: null,
    },
    chaosScore,
    chaosPercentile: null,
    components: {
      spreadBustFactor: components.spreadBustFactor ?? null,
      wpVolatility: components.wpVolatility ?? null,
      upsetMagnitude: components.upsetMagnitude ?? null,
      excitementIndex: components.excitementIndex ?? null,
      contextWeight: components.contextWeight ?? null,
      postgameWpInversion: components.postgameWpInversion ?? null,
    },
    tags: tags.filter((t) => t.length > 0),
    headline: null,
    narrative: null,
    winnerLowestWp: null,
    wpCrosses50: null,
    computedAt: new Date(),
    season: game.season,
    week: game.week,
  };
}

/**
 * Transform matchup simulation output to API response
 */
export function transformMatchupToResponse(
  teamAId: number,
  teamBId: number,
  homeTeamWinProb: number,
  simulations: number,
  teamA: { name: string; abbreviation: string | null },
  teamB: { name: string; abbreviation: string | null }
): {
  teamAId: number;
  teamBId: number;
  teamAWinProb: number;
  teamBWinProb: number;
  teamAWins: number;
  teamBWins: number;
  simulations: number;
  teamAName: string;
  teamBName: string;
} {
  const teamAWins = Math.round(homeTeamWinProb * simulations);
  const teamBWins = simulations - teamAWins;

  return {
    teamAId,
    teamBId,
    teamAWinProb: homeTeamWinProb,
    teamBWinProb: 1 - homeTeamWinProb,
    teamAWins,
    teamBWins,
    simulations,
    teamAName: teamA.name,
    teamBName: teamB.name,
  };
}

// =============================================================================
// BATCH TRANSFORMS
// =============================================================================

/**
 * Transform array of CFBD games for batch processing
 */
export function transformGamesForSeason(games: CFBDGame[]): GameBase[] {
  return games
    .map((game) => {
      try {
        return transformCFBDGame(game);
      } catch (err) {
        console.error(`Failed to transform game ${game.id}:`, err);
        return null;
      }
    })
    .filter((g): g is GameBase => g !== null);
}

/**
 * Transform Glicko-2 ratings snapshot to RankingSnapshot
 */
export function transformRatingsSnapshot(
  ratings: Map<
    number,
    { rating: number; ratingDeviation: number; rank: number; team: { name: string } }
  >,
  season: number,
  week: number | null
): RankingSnapshot {
  const entries: RankingEntry[] = Array.from(ratings.values())
    .sort((a, b) => a.rank - b.rank)
    .map((r) =>
      transformRatingToResponse(0, r.rating, r.ratingDeviation, {
        name: r.team.name,
        abbreviation: null,
        logoUrl: null,
        primaryColor: null,
        level: "FBS",
        conference: null,
      })
    );

  const fbsCount = entries.filter((e) => e.level === "FBS").length;
  const fcsCount = entries.filter((e) => e.level === "FCS").length;
  const d2Count = entries.filter((e) => e.level === "D2").length;
  const d3Count = entries.filter((e) => e.level === "D3").length;
  const naiaCount = entries.filter((e) => e.level === "NAIA").length;

  return {
    rankingId: 0,
    season,
    week,
    weekLabel: week ? `Week ${week}` : "Preseason",
    computedAt: new Date(),
    algorithmVersion: "3.0",
    entries,
    fbsCount,
    fcsCount,
    d2Count,
    d3Count,
    naiaCount,
    metadata: {
      gamesProcessed: 0,
      averageRating: entries.reduce((sum, e) => sum + e.rating, 0) / entries.length,
      ratingStdDev: 0,
      majorChanges: 0,
      computationTimeMs: 0,
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate final score from quarter-by-quarter line scores
 * Fallback if homePoints/awayPoints not provided
 */
function calculateScoreFromLineScores(lineScores?: number[]): number | null {
  if (!lineScores || lineScores.length === 0) return null;
  return lineScores.reduce((sum, score) => sum + (score ?? 0), 0);
}

/**
 * Infer week number from season type for games without explicit week
 * Used when CFBD API doesn't provide week field
 */
function inferWeekFromSeasonType(seasonType: string): number | null {
  if (seasonType === "postseason") return null;
  if (seasonType === "regular") return 1; // Conservative default
  return null;
}
