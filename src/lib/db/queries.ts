/**
 * Gridiron Intel - Unified Data Access Layer
 *
 * This module provides all database queries for the application.
 * Every component should import from this file, NOT from Prisma directly.
 *
 * Features:
 * - Automatic caching with configurable TTLs
 * - Type-safe query results
 * - Efficient pagination and filtering
 * - Tag-based cache invalidation
 * - Graceful error handling
 *
 * @module lib/db/queries
 */

import { prisma } from "./prisma";
import {
  cached,
  cachedBatch,
  CACHE_TTL,
  cacheKeys,
  cacheTags,
} from "./cache";
import { getCurrentSeason } from "@/lib/utils/constants";
import type {
  TeamBase,
  TeamSummary,
  TeamWithRatings,
  TeamFull,
  ConferenceInfo,
  Level,
} from "@/types/team";
import type {
  GameWithStats,
  GameResult,
} from "@/types/game";
import type {
  RankingEntry,
  RankingSnapshot,
  RatingHistory,
  RatingHistoryPoint,
  ProgramRanking,
} from "@/types/ranking";

// ============================================================================
// TYPES FOR QUERY RESULTS
// ============================================================================

/**
 * Options for querying rankings with filtering and pagination
 */
export interface RankingsQueryOptions {
  /** Season year (e.g., 2024) */
  season: number;

  /** Week number (optional, defaults to latest) */
  week?: number;

  /** Filter by division level (FBS, FCS, D2, D3, NAIA, or "all") */
  level?: string;

  /** Filter by conference slug */
  conference?: string;

  /** Search term (matches team name or abbreviation) */
  search?: string;

  /** Page number for pagination (starts at 1) */
  page?: number;

  /** Items per page (default 50) */
  pageSize?: number;

  /** Sort field: rating, rank, change, or name */
  sortBy?: "rating" | "rank" | "change" | "name";

  /** Sort order: ascending or descending */
  sortOrder?: "asc" | "desc";
}

/**
 * Paginated rankings result
 */
export interface RankingsResult {
  /** Array of ranked teams */
  rankings: RankingEntry[];

  /** Total number of teams matching filter */
  total: number;

  /** Current page number */
  page: number;

  /** Page size */
  pageSize: number;

  /** Whether more pages exist */
  hasMore: boolean;

  /** Metadata about the ranking snapshot */
  metadata: {
    season: number;
    week: number | null;
    lastUpdated: Date;
    algorithmVersion: string;
  };
}

/**
 * Ranking comparison between two time points
 */
export interface RankingsComparison {
  /** Previous week's snapshot */
  previous: RankingSnapshot;

  /** Current week's snapshot */
  current: RankingSnapshot;

  /** Teams that moved up significantly */
  topMoversUp: Array<{
    team: TeamSummary;
    previousRank: number | null;
    currentRank: number;
    rankChange: number;
    ratingChange: number;
  }>;

  /** Teams that moved down significantly */
  topMoversDown: Array<{
    team: TeamSummary;
    previousRank: number | null;
    currentRank: number;
    rankChange: number;
    ratingChange: number;
  }>;
}

/**
 * Rating mover (biggest changes this week)
 */
export interface RatingMover {
  team: TeamSummary;
  currentRating: number;
  previousRating: number;
  change: number;
  currentRank: number | null;
  previousRank: number | null;
  rankChange: number | null;
}

/**
 * Conference standings entry
 */
export interface ConferenceStanding {
  team: TeamSummary;
  confWins: number;
  confLosses: number;
  overallWins: number;
  overallLosses: number;
  rating: number;
  rank: number | null;
  pf: number;
  pa: number;
}

/**
 * Conference with all teams
 */
export interface ConferenceWithTeams {
  id: number;
  name: string;
  abbreviation: string | null;
  slug: string;
  level: Level;
  teams: TeamSummary[];
  averageRating: number | null;
}

/**
 * Chaos game result
 */
export interface ChaosGameResult {
  gameId: number;
  season: number;
  week: number | null;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
  homeScore: number | null;
  awayScore: number | null;
  chaosScore: number | null;
  spreadBustFactor: number | null;
  upsetMagnitude: number | null;
  excitementIndex: number | null;
  tags: string[];
  headline: string | null;
  narrative: string | null;
}

/**
 * Coach grade result
 */
export interface CoachGradeResult {
  teamId: number;
  teamName: string;
  teamSlug: string;
  season: number;
  coachName: string | null;
  overallGrade: number | null;
  fourthDownGrade: number | null;
  twoPtGrade: number | null;
  timeoutGrade: number | null;
  totalWpGained: number | null;
  totalWpLost: number | null;
  decisionsCount: number | null;
}

/**
 * Player outlier result
 */
export interface PlayerOutlierResult {
  playerName: string;
  position: string | null;
  teamId: number | null;
  teamName: string | null;
  season: number;
  category: string;
  statLabel: string | null;
  statValue: number | null;
  zscore: number | null;
  percentile: number | null;
  detail: string | null;
}

/**
 * Site-wide statistics
 */
export interface SiteStats {
  totalTeams: number;
  totalConferences: number;
  totalGames: number;
  totalSeasons: number;
  fbs: number;
  fcs: number;
  d2: number;
  d3: number;
  naia: number;
  lastUpdated: string;
}

/**
 * Last updated timestamps for various data types
 */
export interface LastUpdated {
  rankings: Date | null;
  games: Date | null;
  recruiting: Date | null;
  chaos: Date | null;
  coaches: Date | null;
  overallAt: Date;
}

/**
 * Team with stats for current season
 */
export interface TeamWithStats extends TeamWithRatings {
  gamesPlayed: number;
  nextOpponent: TeamSummary | null;
  nextOpponentDate: Date | null;
  recentForm: "↑" | "→" | "↓";
}

// ============================================================================
// TEAM QUERIES
// ============================================================================

/**
 * Get a single team by slug with full details
 * @param slug - Team URL slug (e.g., "alabama", "ohio-state")
 * @returns Complete team data with ratings, conference, recent games
 */
export async function getTeam(slug: string): Promise<TeamFull | null> {
  return cached(
    cacheKeys.team(slug),
    async () => {
      const team = await prisma.team.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          mascot: true,
          abbreviation: true,
          slug: true,
          primaryColor: true,
          secondaryColor: true,
          logoUrl: true,
          city: true,
          state: true,
          stadium: true,
          stadiumCapacity: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          levelId: true,
          conferenceId: true,
          level: {
            select: {
              name: true,
              slug: true,
            },
          },
          conference: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              slug: true,
              levelId: true,
            },
          },
          teamRankings: {
            take: 1,
            orderBy: {
              ranking: {
                computedAt: "desc" as const,
              },
            },
            select: {
              rank: true,
              rating: true,
              previousRank: true,
              ratingChange: true,
              offenseRating: true,
              defenseRating: true,
              sos: true,
              recordWins: true,
              recordLosses: true,
              playoffProbability: true,
            },
          },
          homeGames: {
            where: {
              season: { isCurrent: true },
            },
            orderBy: { gameDate: "desc" as const },
            take: 5,
            select: {
              id: true,
              gameDate: true,
              homeScore: true,
              awayScore: true,
              awayTeam: {
                select: {
                  slug: true,
                  name: true,
                  logoUrl: true,
                  abbreviation: true,
                },
              },
            },
          },
          awayGames: {
            where: {
              season: { isCurrent: true },
            },
            orderBy: { gameDate: "desc" as const },
            take: 5,
            select: {
              id: true,
              gameDate: true,
              homeScore: true,
              awayScore: true,
              homeTeam: {
                select: {
                  slug: true,
                  name: true,
                  logoUrl: true,
                  abbreviation: true,
                },
              },
            },
          },
          players: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!team) return null;

      // Flatten team rating data
      const currentRating = team.teamRankings[0];
      const recentGames = [
        ...team.homeGames.map(g => ({
          gameId: g.id,
          opponent: g.awayTeam.name,
          opponentSlug: g.awayTeam.slug,
          opponentLogo: g.awayTeam.logoUrl,
          score: g.homeScore ?? 0,
          opponentScore: g.awayScore ?? 0,
          date: g.gameDate ?? new Date(),
          isWin: g.homeScore && g.awayScore ? g.homeScore > g.awayScore : false,
          isHome: true,
        })),
        ...team.awayGames.map(g => ({
          gameId: g.id,
          opponent: g.homeTeam.name,
          opponentSlug: g.homeTeam.slug,
          opponentLogo: g.homeTeam.logoUrl,
          score: g.awayScore ?? 0,
          opponentScore: g.homeScore ?? 0,
          date: g.gameDate ?? new Date(),
          isWin: g.awayScore && g.homeScore ? g.awayScore > g.homeScore : false,
          isHome: false,
        })),
      ].sort((a, b) => b.date.getTime() - a.date.getTime());

      // Get conference level info
      const levelData = await prisma.level.findUnique({
        where: { id: team.levelId },
        select: { name: true },
      });

      const result: TeamFull = {
        id: team.id,
        name: team.name,
        mascot: team.mascot,
        abbreviation: team.abbreviation,
        slug: team.slug,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        logoUrl: team.logoUrl,
        city: team.city,
        state: team.state,
        stadium: team.stadium,
        stadiumCapacity: team.stadiumCapacity,
        metadata: team.metadata as Record<string, unknown> | null,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        conferenceId: team.conferenceId,
        level: (levelData?.name as Level) || "FBS",
        rating: currentRating?.rating ? Number(currentRating.rating) : 1500,
        ratingDeviation: 200,
        volatility: 0.06,
        rank: currentRating?.rank,
        previousRank: currentRating?.previousRank,
        ratingChange: currentRating?.ratingChange
          ? Number(currentRating.ratingChange)
          : null,
        offenseRating: currentRating?.offenseRating
          ? Number(currentRating.offenseRating)
          : null,
        defenseRating: currentRating?.defenseRating
          ? Number(currentRating.defenseRating)
          : null,
        sos: currentRating?.sos ? Number(currentRating.sos) : null,
        wins: currentRating?.recordWins,
        losses: currentRating?.recordLosses,
        playoffProbability: currentRating?.playoffProbability
          ? Number(currentRating.playoffProbability)
          : null,
        sparkline: [],
        gamesPlayed: recentGames.length,
        conference: team.conference
          ? {
              id: team.conference.id,
              name: team.conference.name,
              abbreviation: team.conference.abbreviation,
              slug: team.conference.slug,
              level: (levelData?.name as Level) || "FBS",
              teamCount: 0,
              averageRating: null,
              powerRank: null,
            }
          : null,
        recentGames,
        rosterSize: team.players.length,
        starters: Math.floor(team.players.length * 0.3),
        recruitingClassYear: null,
        avgRecruitRating: null,
        fiveStars: null,
        fourStars: null,
        allTimeWins: null,
        allTimeLosses: null,
        bowlAppearances: null,
        nationalChampionships: null,
      };

      return result;
    },
    CACHE_TTL.TEAM_PROFILE,
    {
      tags: [cacheTags.team(slug)],
    }
  );
}

/**
 * Get team with current season stats
 * @param slug - Team URL slug
 * @param season - Season year (optional, defaults to current)
 * @returns Team data with season statistics
 */
export async function getTeamWithStats(
  slug: string,
  season?: number
): Promise<TeamWithStats | null> {
  // Get current season if not specified
  let targetSeason = season;
  if (!targetSeason) {
    const currentSeason = await prisma.season.findFirst({
      where: { isCurrent: true },
      select: { year: true },
    });
    targetSeason = currentSeason?.year || getCurrentSeason();
  }

  return cached(
    `${cacheKeys.team(slug)}:stats:${targetSeason}`,
    async () => {
      const team = await prisma.team.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          mascot: true,
          abbreviation: true,
          slug: true,
          primaryColor: true,
          secondaryColor: true,
          logoUrl: true,
          city: true,
          state: true,
          stadium: true,
          stadiumCapacity: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          levelId: true,
          conferenceId: true,
          level: { select: { name: true } },
          conference: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              slug: true,
            },
          },
          teamRankings: {
            where: {
              ranking: {
                season: { year: targetSeason },
              },
            },
            orderBy: {
              ranking: { computedAt: "desc" as const },
            },
            take: 1,
            select: {
              rank: true,
              rating: true,
              ratingChange: true,
              offenseRating: true,
              defenseRating: true,
              sos: true,
              recordWins: true,
              recordLosses: true,
              playoffProbability: true,
            },
          },
          homeGames: {
            where: { season: { year: targetSeason } },
            select: { id: true },
          },
          awayGames: {
            where: { season: { year: targetSeason } },
            select: { id: true },
          },
        },
      });

      if (!team) return null;

      const currentRating = team.teamRankings[0];
      const totalGamesPlayed =
        team.homeGames.length + team.awayGames.length;

      const result: TeamWithStats = {
        id: team.id,
        name: team.name,
        mascot: team.mascot,
        abbreviation: team.abbreviation,
        slug: team.slug,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        logoUrl: team.logoUrl,
        city: team.city,
        state: team.state,
        stadium: team.stadium,
        stadiumCapacity: team.stadiumCapacity,
        metadata: team.metadata as Record<string, unknown> | null,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        conferenceId: team.conferenceId,
        level: (team.level.name as Level) || "FBS",
        rating: currentRating?.rating ? Number(currentRating.rating) : 1500,
        ratingDeviation: 200,
        volatility: 0.06,
        rank: currentRating?.rank,
        previousRank: null,
        ratingChange: currentRating?.ratingChange
          ? Number(currentRating.ratingChange)
          : null,
        offenseRating: currentRating?.offenseRating
          ? Number(currentRating.offenseRating)
          : null,
        defenseRating: currentRating?.defenseRating
          ? Number(currentRating.defenseRating)
          : null,
        sos: currentRating?.sos ? Number(currentRating.sos) : null,
        wins: currentRating?.recordWins,
        losses: currentRating?.recordLosses,
        playoffProbability: currentRating?.playoffProbability
          ? Number(currentRating.playoffProbability)
          : null,
        sparkline: [],
        gamesPlayed: totalGamesPlayed,
        nextOpponent: null,
        nextOpponentDate: null,
        recentForm: "→",
      };

      return result;
    },
    CACHE_TTL.TEAM_PROFILE,
    {
      tags: [cacheTags.team(slug), cacheTags.season(targetSeason)],
    }
  );
}

/**
 * Get all teams for a specific level
 * @param level - Division level (FBS, FCS, D2, D3, NAIA)
 * @returns Array of team summaries
 */
export async function getTeamsByLevel(level: string): Promise<TeamSummary[]> {
  return cached(
    `teams:level:${level}`,
    async () => {
      const teams = await prisma.team.findMany({
        where: {
          level: { name: level },
        },
        select: {
          id: true,
          name: true,
          abbreviation: true,
          slug: true,
          logoUrl: true,
          level: { select: { name: true } },
          conference: { select: { name: true } },
          primaryColor: true,
        },
        orderBy: { name: "asc" as const },
      });

      return teams.map(t => ({
        id: t.id,
        name: t.name,
        abbreviation: t.abbreviation,
        slug: t.slug,
        logoUrl: t.logoUrl,
        level: (t.level.name as Level) || "FBS",
        conference: t.conference?.name ?? null,
        primaryColor: t.primaryColor,
      }));
    },
    CACHE_TTL.HISTORICAL,
    {
      tags: ["teams"],
    }
  );
}

/**
 * Get all teams in a conference
 * @param conferenceSlug - Conference URL slug
 * @param season - Season year (optional)
 * @returns Array of team summaries
 */
export async function getTeamsByConference(
  conferenceSlug: string,
  season?: number
): Promise<TeamSummary[]> {
  return cached(
    `${cacheKeys.conference(conferenceSlug)}:teams:${season || "current"}`,
    async () => {
      const conference = await prisma.conference.findUnique({
        where: { slug: conferenceSlug },
        select: {
          id: true,
          teams: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              slug: true,
              logoUrl: true,
              primaryColor: true,
              level: { select: { name: true } },
            },
          },
        },
      });

      if (!conference) return [];

      return conference.teams.map(t => ({
        id: t.id,
        name: t.name,
        abbreviation: t.abbreviation,
        slug: t.slug,
        logoUrl: t.logoUrl,
        level: (t.level.name as Level) || "FBS",
        conference: conferenceSlug,
        primaryColor: t.primaryColor,
      }));
    },
    CACHE_TTL.CONFERENCE,
    {
      tags: [cacheTags.conference(conferenceSlug)],
    }
  );
}

/**
 * Search teams by name or abbreviation
 * @param query - Search term
 * @param limit - Maximum results (default 20)
 * @returns Array of matching team summaries
 */
export async function searchTeams(
  query: string,
  limit: number = 20
): Promise<TeamSummary[]> {
  if (query.length < 2) return [];

  return cached(
    `search:teams:${query}`,
    async () => {
      const teams = await prisma.team.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { abbreviation: { contains: query, mode: "insensitive" } },
            { slug: { contains: query.toLowerCase(), mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          abbreviation: true,
          slug: true,
          logoUrl: true,
          primaryColor: true,
          level: { select: { name: true } },
          conference: { select: { name: true } },
        },
        take: limit,
      });

      return teams.map(t => ({
        id: t.id,
        name: t.name,
        abbreviation: t.abbreviation,
        slug: t.slug,
        logoUrl: t.logoUrl,
        level: (t.level.name as Level) || "FBS",
        conference: t.conference?.name ?? null,
        primaryColor: t.primaryColor,
      }));
    },
    CACHE_TTL.SEARCH_INDEX,
    {
      tags: ["search"],
    }
  );
}

/**
 * Get team's game log for a season
 * @param teamId - Team database ID
 * @param season - Season year (optional, defaults to current)
 * @returns Array of games with statistics
 */
export async function getTeamGames(
  teamId: string,
  season?: number
): Promise<GameWithStats[]> {
  let targetSeason = season;
  if (!targetSeason) {
    const current = await prisma.season.findFirst({
      where: { isCurrent: true },
      select: { year: true },
    });
    targetSeason = current?.year;
  }

  if (!targetSeason) return [];

  return cached(
    `${cacheKeys.teamGames(teamId, targetSeason)}`,
    async () => {
      const games = await prisma.game.findMany({
        where: {
          season: { year: targetSeason },
          OR: [{ homeTeamId: parseInt(teamId) }, { awayTeamId: parseInt(teamId) }],
        },
        select: {
          id: true,
          season: { select: { year: true } },
          week: true,
          gameDate: true,
          homeScore: true,
          awayScore: true,
          isNeutralSite: true,
          isConferenceGame: true,
          isPostseason: true,
          homeWinProb: true,
          spread: true,
          overUnder: true,
          excitementIndex: true,
          homeEpa: true,
          awayEpa: true,
          homeSuccessRate: true,
          awaySuccessRate: true,
          homeExplosiveness: true,
          awayExplosiveness: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          homeTeam: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              slug: true,
              logoUrl: true,
              level: { select: { name: true } },
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              slug: true,
              logoUrl: true,
              level: { select: { name: true } },
            },
          },
        },
        orderBy: { gameDate: "desc" as const },
      });

      return games.map(g => ({
        id: g.id,
        season: g.season.year,
        week: g.week,
        gameDate: g.gameDate ?? new Date(),
        homeTeamId: g.homeTeam.id,
        awayTeamId: g.awayTeam.id,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        isNeutralSite: g.isNeutralSite,
        isConferenceGame: g.isConferenceGame,
        isPostseason: g.isPostseason,
        homeWinProb: g.homeWinProb ? Number(g.homeWinProb) : null,
        excitementIndex: g.excitementIndex ? Number(g.excitementIndex) : null,
        spread: g.spread ? Number(g.spread) : null,
        overUnder: g.overUnder ? Number(g.overUnder) : null,
        homeEpa: g.homeEpa ? Number(g.homeEpa) : null,
        awayEpa: g.awayEpa ? Number(g.awayEpa) : null,
        homeSuccessRate: g.homeSuccessRate ? Number(g.homeSuccessRate) : null,
        awaySuccessRate: g.awaySuccessRate ? Number(g.awaySuccessRate) : null,
        homeExplosiveness: g.homeExplosiveness
          ? Number(g.homeExplosiveness)
          : null,
        awayExplosiveness: g.awayExplosiveness
          ? Number(g.awayExplosiveness)
          : null,
        metadata: g.metadata as Record<string, unknown> | null,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        homeTeamName: g.homeTeam.name,
        awayTeamName: g.awayTeam.name,
        homeTeamAbbr: g.homeTeam.abbreviation,
        awayTeamAbbr: g.awayTeam.abbreviation,
        homeTeamLogo: g.homeTeam.logoUrl,
        awayTeamLogo: g.awayTeam.logoUrl,
        homeTeamLevel: (g.homeTeam.level.name as Level) || "FBS",
        awayTeamLevel: (g.awayTeam.level.name as Level) || "FBS",
        margin:
          g.homeScore && g.awayScore ? g.homeScore - g.awayScore : null,
        wasUpset:
          g.homeScore && g.awayScore && g.spread
            ? (g.spread > 0 && g.homeScore > g.awayScore) ||
              (g.spread <= 0 && g.awayScore > g.homeScore)
            : null,
        spreadCovered:
          g.homeScore && g.awayScore && g.spread
            ? Math.abs(g.homeScore - g.awayScore) > Math.abs(g.spread)
            : null,
        overHit:
          g.homeScore && g.awayScore && g.overUnder
            ? g.homeScore + g.awayScore > g.overUnder
            : null,
      }));
    },
    CACHE_TTL.GAMES,
    {
      tags: [cacheTags.team(teamId), cacheTags.season(targetSeason)],
    }
  );
}

/**
 * Get team's historical ratings across seasons
 * @param teamId - Team database ID
 * @returns Array of rating history points
 */
export async function getTeamRatingHistory(
  teamId: string
): Promise<RatingHistory[]> {
  return cached(
    `team:${teamId}:ratings:history`,
    async () => {
      const teamRankings = await prisma.teamRanking.findMany({
        where: { teamId: parseInt(teamId) },
        select: {
          week: true,
          rank: true,
          rating: true,
          ratingChange: true,
          recordWins: true,
          recordLosses: true,
          ranking: {
            select: {
              season: { select: { year: true } },
              computedAt: true,
            },
          },
        },
        orderBy: [
          { ranking: { season: { year: "asc" as const } } },
          { ranking: { week: "asc" as const } },
        ],
      });

      // Group by season
      const bySeasonAndWeek: Record<
        number,
        Array<{
          week: number | null;
          rank: number | null;
          rating: number;
          recordWins: number | null;
          recordLosses: number | null;
          date: Date;
        }>
      > = {};

      for (const tr of teamRankings) {
        const season = tr.ranking.season.year;
        if (!bySeasonAndWeek[season]) {
          bySeasonAndWeek[season] = [];
        }
        bySeasonAndWeek[season].push({
          week: tr.week,
          rank: tr.rank,
          rating: Number(tr.rating),
          recordWins: tr.recordWins,
          recordLosses: tr.recordLosses,
          date: tr.ranking.computedAt,
        });
      }

      const histories: RatingHistory[] = Object.entries(bySeasonAndWeek).map(
        ([seasonStr, snapshots]) => {
          const season = parseInt(seasonStr);
          const preseason = snapshots[0];
          const peak = snapshots.reduce((max, s) => (s.rating > max.rating ? s : max));
          const lowest = snapshots.reduce((min, s) => (s.rating < min.rating ? s : min));
          const final = snapshots[snapshots.length - 1];

          return {
            teamId: parseInt(teamId),
            teamName: "", // Would need team lookup
            season,
            history: snapshots.map(s => ({
              week: s.week,
              season,
              rating: s.rating,
              ratingDeviation: 200,
              rank: s.rank,
              wins: s.recordWins,
              losses: s.recordLosses,
              date: s.date,
              sparkline: [],
              playoffProbability: null,
            })),
            preseasonRating: preseason.rating,
            peakRating: peak.rating,
            peakRatingWeek: peak.week,
            lowestRating: lowest.rating,
            lowestRatingWeek: lowest.week,
            finalRating: final.rating,
            totalRatingChange: final.rating - preseason.rating,
            avgVolatility: 0.06,
            madePlayoffs: false,
            playoffSeed: null,
            finalRank: final.rank,
          };
        }
      );

      return histories;
    },
    CACHE_TTL.HISTORICAL,
    {
      tags: [cacheTags.team(teamId)],
    }
  );
}

// ============================================================================
// RANKINGS QUERIES
// ============================================================================

/**
 * Get rankings for a specific week/season with pagination and filtering
 * @param options - Query options
 * @returns Paginated rankings result
 */
export async function getRankings(
  options: RankingsQueryOptions
): Promise<RankingsResult> {
  const {
    season,
    week,
    level = "all",
    conference,
    search,
    page = 1,
    pageSize = 50,
    sortBy = "rank",
    sortOrder = "asc",
  } = options;

  // Validate pagination
  const validPage = Math.max(1, page);
  const validPageSize = Math.min(200, Math.max(1, pageSize));

  const cacheKey = `rankings:${season}:${week}:${level}:${conference}:${search}:${validPage}:${validPageSize}:${sortBy}:${sortOrder}`;

  return cached(
    cacheKey,
    async () => {
      // Get the ranking snapshot
      const ranking = await prisma.ranking.findUnique({
        where: {
          seasonId_week: {
            seasonId: season, // Assuming direct year lookup
            week: week ?? null,
          },
        },
        select: {
          id: true,
          season: { select: { year: true } },
          week: true,
          computedAt: true,
          algorithmVersion: true,
          teamRankings: {
            select: {
              rank: true,
              rating: true,
              ratingChange: true,
              offenseRating: true,
              defenseRating: true,
              sos: true,
              recordWins: true,
              recordLosses: true,
              playoffProbability: true,
              team: {
                select: {
                  id: true,
                  name: true,
                  abbreviation: true,
                  slug: true,
                  logoUrl: true,
                  primaryColor: true,
                  levelId: true,
                  conferenceId: true,
                  level: { select: { name: true } },
                  conference: {
                    select: {
                      id: true,
                      name: true,
                      abbreviation: true,
                      slug: true,
                    },
                  },
                },
              },
            },
            orderBy: { rank: sortOrder === "asc" ? "asc" : "desc" },
          },
        },
      });

      if (!ranking) {
        return {
          rankings: [],
          total: 0,
          page: validPage,
          pageSize: validPageSize,
          hasMore: false,
          metadata: {
            season,
            week: week ?? null,
            lastUpdated: new Date(),
            algorithmVersion: "3.0",
          },
        };
      }

      // Filter team rankings
      let filtered = ranking.teamRankings;

      // Filter by level
      if (level !== "all") {
        filtered = filtered.filter(tr => tr.team.level.name === level);
      }

      // Filter by conference
      if (conference) {
        filtered = filtered.filter(tr => tr.team.conference?.slug === conference);
      }

      // Filter by search
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          tr =>
            tr.team.name.toLowerCase().includes(q) ||
            tr.team.abbreviation?.toLowerCase().includes(q)
        );
      }

      // Apply sorting
      if (sortBy === "rating") {
        filtered.sort((a, b) =>
          sortOrder === "asc"
            ? Number(a.rating) - Number(b.rating)
            : Number(b.rating) - Number(a.rating)
        );
      } else if (sortBy === "change") {
        filtered.sort((a, b) =>
          sortOrder === "asc"
            ? (Number(a.ratingChange) || 0) - (Number(b.ratingChange) || 0)
            : (Number(b.ratingChange) || 0) - (Number(a.ratingChange) || 0)
        );
      } else if (sortBy === "name") {
        filtered.sort((a, b) =>
          sortOrder === "asc"
            ? a.team.name.localeCompare(b.team.name)
            : b.team.name.localeCompare(a.team.name)
        );
      }

      // Paginate
      const skip = (validPage - 1) * validPageSize;
      const paginatedRankings = filtered.slice(
        skip,
        skip + validPageSize
      );

      // Convert to RankingEntry
      const rankings: RankingEntry[] = paginatedRankings.map(tr => ({
        rank: tr.rank || 0,
        teamId: tr.team.id,
        teamName: tr.team.name,
        teamAbbr: tr.team.abbreviation,
        logoUrl: tr.team.logoUrl,
        primaryColor: tr.team.primaryColor,
        level: (tr.team.level.name as Level) || "FBS",
        conference: tr.team.conference?.name ?? null,
        rating: Number(tr.rating),
        ratingDeviation: 200,
        wins: tr.recordWins,
        losses: tr.recordLosses,
        recordDisplay: `${tr.recordWins}-${tr.recordLosses}`,
        rankChange: null,
        ratingChange: tr.ratingChange ? Number(tr.ratingChange) : null,
        offenseRating: tr.offenseRating ? Number(tr.offenseRating) : null,
        defenseRating: tr.defenseRating ? Number(tr.defenseRating) : null,
        sos: tr.sos ? Number(tr.sos) : null,
        playoffProbability: tr.playoffProbability
          ? Number(tr.playoffProbability)
          : null,
        sparkline: [],
        trend: "flat",
        percentile: 50,
        levelPercentile: 50,
        conferencePercentile: null,
        avgMarginOfVictory: null,
        gamesRemaining: 0,
        playoffSeed: null,
      }));

      return {
        rankings,
        total: filtered.length,
        page: validPage,
        pageSize: validPageSize,
        hasMore: skip + validPageSize < filtered.length,
        metadata: {
          season,
          week: week ?? null,
          lastUpdated: ranking.computedAt,
          algorithmVersion: ranking.algorithmVersion || "3.0",
        },
      };
    },
    CACHE_TTL.RANKINGS,
    {
      tags: [cacheTags.rankings(), cacheTags.season(season)],
    }
  );
}

/**
 * Get a ranking comparison between two time points
 * @param season - Season year
 * @param week - Week number
 * @returns Comparison data with top movers
 */
export async function getRankingsComparison(
  season: number,
  week: number
): Promise<RankingsComparison> {
  return cached(
    `rankings:comparison:${season}:${week}`,
    async () => {
      // Stub implementation - would need full ranking snapshots
      return {
        previous: {
          rankingId: 0,
          season,
          week: week - 1,
          weekLabel: `Week ${week - 1}`,
          computedAt: new Date(),
          algorithmVersion: "3.0",
          entries: [],
          fbsCount: 0,
          fcsCount: 0,
          d2Count: 0,
          d3Count: 0,
          naiaCount: 0,
          metadata: {
            gamesProcessed: 0,
            averageRating: 0,
            ratingStdDev: 0,
            majorChanges: 0,
            computationTimeMs: 0,
          },
        },
        current: {
          rankingId: 0,
          season,
          week,
          weekLabel: `Week ${week}`,
          computedAt: new Date(),
          algorithmVersion: "3.0",
          entries: [],
          fbsCount: 0,
          fcsCount: 0,
          d2Count: 0,
          d3Count: 0,
          naiaCount: 0,
          metadata: {
            gamesProcessed: 0,
            averageRating: 0,
            ratingStdDev: 0,
            majorChanges: 0,
            computationTimeMs: 0,
          },
        },
        topMoversUp: [],
        topMoversDown: [],
      };
    },
    CACHE_TTL.RANKINGS,
    {
      tags: [cacheTags.rankings(), cacheTags.season(season)],
    }
  );
}

/**
 * Get top movers (biggest rating changes this week)
 * @param season - Season year
 * @param week - Week number
 * @param limit - Maximum results (default 25)
 * @returns Array of top movers
 */
export async function getTopMovers(
  season: number,
  week: number,
  limit: number = 25
): Promise<RatingMover[]> {
  return cached(
    `rankings:movers:${season}:${week}:${limit}`,
    async () => {
      const teamRankings = await prisma.teamRanking.findMany({
        where: {
          ranking: {
            season: { year: season },
            week,
          },
        },
        select: {
          rank: true,
          rating: true,
          ratingChange: true,
          previousRank: true,
          team: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              slug: true,
              logoUrl: true,
              level: { select: { name: true } },
              conference: { select: { name: true } },
              primaryColor: true,
            },
          },
        },
        orderBy: {
          ratingChange: "desc" as const,
        },
        take: limit * 2, // Get more to sort through
      });

      const movers = teamRankings
        .filter(tr => Math.abs(Number(tr.ratingChange || 0)) > 1)
        .slice(0, limit)
        .map(tr => ({
          team: {
            id: tr.team.id,
            name: tr.team.name,
            abbreviation: tr.team.abbreviation,
            slug: tr.team.slug,
            logoUrl: tr.team.logoUrl,
            level: (tr.team.level.name as Level) || "FBS",
            conference: tr.team.conference?.name ?? null,
            primaryColor: tr.team.primaryColor,
          },
          currentRating: Number(tr.rating),
          previousRating:
            Number(tr.rating) - Number(tr.ratingChange || 0),
          change: Number(tr.ratingChange || 0),
          currentRank: tr.rank,
          previousRank: tr.previousRank,
          rankChange: tr.rank && tr.previousRank ? tr.rank - tr.previousRank : null,
        }));

      return movers;
    },
    CACHE_TTL.RANKINGS,
    {
      tags: [cacheTags.rankings(), cacheTags.season(season)],
    }
  );
}

// ============================================================================
// GAME QUERIES
// ============================================================================

/**
 * Get games for a specific week
 * @param season - Season year
 * @param week - Week number
 * @returns Array of games with statistics
 */
export async function getGamesByWeek(
  season: number,
  week: number
): Promise<GameWithStats[]> {
  return cached(
    `games:${season}:${week}`,
    async () => {
      const games = await prisma.game.findMany({
        where: {
          season: { year: season },
          week,
        },
        select: {
          id: true,
          season: { select: { year: true } },
          week: true,
          gameDate: true,
          homeScore: true,
          awayScore: true,
          isNeutralSite: true,
          isConferenceGame: true,
          isPostseason: true,
          homeWinProb: true,
          spread: true,
          overUnder: true,
          excitementIndex: true,
          homeEpa: true,
          awayEpa: true,
          homeSuccessRate: true,
          awaySuccessRate: true,
          homeExplosiveness: true,
          awayExplosiveness: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          homeTeam: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              slug: true,
              logoUrl: true,
              level: { select: { name: true } },
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              slug: true,
              logoUrl: true,
              level: { select: { name: true } },
            },
          },
        },
        orderBy: { gameDate: "desc" as const },
      });

      return games.map(g => ({
        id: g.id,
        season: g.season.year,
        week: g.week,
        gameDate: g.gameDate ?? new Date(),
        homeTeamId: g.homeTeam.id,
        awayTeamId: g.awayTeam.id,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        isNeutralSite: g.isNeutralSite,
        isConferenceGame: g.isConferenceGame,
        isPostseason: g.isPostseason,
        homeWinProb: g.homeWinProb ? Number(g.homeWinProb) : null,
        excitementIndex: g.excitementIndex ? Number(g.excitementIndex) : null,
        spread: g.spread ? Number(g.spread) : null,
        overUnder: g.overUnder ? Number(g.overUnder) : null,
        homeEpa: g.homeEpa ? Number(g.homeEpa) : null,
        awayEpa: g.awayEpa ? Number(g.awayEpa) : null,
        homeSuccessRate: g.homeSuccessRate ? Number(g.homeSuccessRate) : null,
        awaySuccessRate: g.awaySuccessRate ? Number(g.awaySuccessRate) : null,
        homeExplosiveness: g.homeExplosiveness
          ? Number(g.homeExplosiveness)
          : null,
        awayExplosiveness: g.awayExplosiveness
          ? Number(g.awayExplosiveness)
          : null,
        metadata: g.metadata as Record<string, unknown> | null,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        homeTeamName: g.homeTeam.name,
        awayTeamName: g.awayTeam.name,
        homeTeamAbbr: g.homeTeam.abbreviation,
        awayTeamAbbr: g.awayTeam.abbreviation,
        homeTeamLogo: g.homeTeam.logoUrl,
        awayTeamLogo: g.awayTeam.logoUrl,
        homeTeamLevel: (g.homeTeam.level.name as Level) || "FBS",
        awayTeamLevel: (g.awayTeam.level.name as Level) || "FBS",
        margin:
          g.homeScore && g.awayScore ? g.homeScore - g.awayScore : null,
        wasUpset:
          g.homeScore && g.awayScore && g.spread
            ? (g.spread > 0 && g.homeScore > g.awayScore) ||
              (g.spread <= 0 && g.awayScore > g.homeScore)
            : null,
        spreadCovered:
          g.homeScore && g.awayScore && g.spread
            ? Math.abs(g.homeScore - g.awayScore) > Math.abs(g.spread)
            : null,
        overHit:
          g.homeScore && g.awayScore && g.overUnder
            ? g.homeScore + g.awayScore > g.overUnder
            : null,
      }));
    },
    CACHE_TTL.GAMES,
    {
      tags: [cacheTags.season(season), `tag:week:${season}:${week}`],
    }
  );
}

/**
 * Get a specific game with full details
 * @param gameId - Game database ID
 * @returns Game with all statistics and details
 */
export async function getGame(gameId: string): Promise<GameWithStats | null> {
  return cached(
    `game:${gameId}`,
    async () => {
      const game = await prisma.game.findUnique({
        where: { id: parseInt(gameId) },
        select: {
          id: true,
          season: { select: { year: true } },
          week: true,
          gameDate: true,
          homeScore: true,
          awayScore: true,
          isNeutralSite: true,
          isConferenceGame: true,
          isPostseason: true,
          homeWinProb: true,
          spread: true,
          overUnder: true,
          excitementIndex: true,
          homeEpa: true,
          awayEpa: true,
          homeSuccessRate: true,
          awaySuccessRate: true,
          homeExplosiveness: true,
          awayExplosiveness: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          homeTeam: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              slug: true,
              logoUrl: true,
              level: { select: { name: true } },
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              slug: true,
              logoUrl: true,
              level: { select: { name: true } },
            },
          },
        },
      });

      if (!game) return null;

      return {
        id: game.id,
        season: game.season.year,
        week: game.week,
        gameDate: game.gameDate ?? new Date(),
        homeTeamId: game.homeTeam.id,
        awayTeamId: game.awayTeam.id,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        isNeutralSite: game.isNeutralSite,
        isConferenceGame: game.isConferenceGame,
        isPostseason: game.isPostseason,
        homeWinProb: game.homeWinProb ? Number(game.homeWinProb) : null,
        excitementIndex: game.excitementIndex ? Number(game.excitementIndex) : null,
        spread: game.spread ? Number(game.spread) : null,
        overUnder: game.overUnder ? Number(game.overUnder) : null,
        homeEpa: game.homeEpa ? Number(game.homeEpa) : null,
        awayEpa: game.awayEpa ? Number(game.awayEpa) : null,
        homeSuccessRate: game.homeSuccessRate
          ? Number(game.homeSuccessRate)
          : null,
        awaySuccessRate: game.awaySuccessRate
          ? Number(game.awaySuccessRate)
          : null,
        homeExplosiveness: game.homeExplosiveness
          ? Number(game.homeExplosiveness)
          : null,
        awayExplosiveness: game.awayExplosiveness
          ? Number(game.awayExplosiveness)
          : null,
        metadata: game.metadata as Record<string, unknown> | null,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
        homeTeamName: game.homeTeam.name,
        awayTeamName: game.awayTeam.name,
        homeTeamAbbr: game.homeTeam.abbreviation,
        awayTeamAbbr: game.awayTeam.abbreviation,
        homeTeamLogo: game.homeTeam.logoUrl,
        awayTeamLogo: game.awayTeam.logoUrl,
        homeTeamLevel: (game.homeTeam.level.name as Level) || "FBS",
        awayTeamLevel: (game.awayTeam.level.name as Level) || "FBS",
        margin:
          game.homeScore && game.awayScore
            ? game.homeScore - game.awayScore
            : null,
        wasUpset:
          game.homeScore && game.awayScore && game.spread
            ? (game.spread > 0 && game.homeScore > game.awayScore) ||
              (game.spread <= 0 && game.awayScore > game.homeScore)
            : null,
        spreadCovered:
          game.homeScore && game.awayScore && game.spread
            ? Math.abs(game.homeScore - game.awayScore) > Math.abs(game.spread)
            : null,
        overHit:
          game.homeScore && game.awayScore && game.overUnder
            ? game.homeScore + game.awayScore > game.overUnder
            : null,
      };
    },
    CACHE_TTL.GAMES,
    {
      tags: ["games"],
    }
  );
}

/**
 * Get head-to-head history between two teams
 * @param teamAId - First team ID
 * @param teamBId - Second team ID
 * @param limit - Maximum results (default 25)
 * @returns Array of games between the two teams
 */
export async function getHeadToHead(
  teamAId: string,
  teamBId: string,
  limit: number = 25
): Promise<GameWithStats[]> {
  const tId1 = parseInt(teamAId);
  const tId2 = parseInt(teamBId);

  return cached(
    cacheKeys.rivalry(teamAId, teamBId),
    async () => {
      const games = await prisma.game.findMany({
        where: {
          OR: [
            { homeTeamId: tId1, awayTeamId: tId2 },
            { homeTeamId: tId2, awayTeamId: tId1 },
          ],
        },
        select: {
          id: true,
          season: { select: { year: true } },
          week: true,
          gameDate: true,
          homeScore: true,
          awayScore: true,
          isNeutralSite: true,
          isConferenceGame: true,
          isPostseason: true,
          homeWinProb: true,
          spread: true,
          overUnder: true,
          excitementIndex: true,
          homeEpa: true,
          awayEpa: true,
          homeSuccessRate: true,
          awaySuccessRate: true,
          homeExplosiveness: true,
          awayExplosiveness: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          homeTeam: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              slug: true,
              logoUrl: true,
              level: { select: { name: true } },
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              slug: true,
              logoUrl: true,
              level: { select: { name: true } },
            },
          },
        },
        orderBy: { gameDate: "desc" as const },
        take: limit,
      });

      return games.map(g => ({
        id: g.id,
        season: g.season.year,
        week: g.week,
        gameDate: g.gameDate ?? new Date(),
        homeTeamId: g.homeTeam.id,
        awayTeamId: g.awayTeam.id,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        isNeutralSite: g.isNeutralSite,
        isConferenceGame: g.isConferenceGame,
        isPostseason: g.isPostseason,
        homeWinProb: g.homeWinProb ? Number(g.homeWinProb) : null,
        excitementIndex: g.excitementIndex ? Number(g.excitementIndex) : null,
        spread: g.spread ? Number(g.spread) : null,
        overUnder: g.overUnder ? Number(g.overUnder) : null,
        homeEpa: g.homeEpa ? Number(g.homeEpa) : null,
        awayEpa: g.awayEpa ? Number(g.awayEpa) : null,
        homeSuccessRate: g.homeSuccessRate ? Number(g.homeSuccessRate) : null,
        awaySuccessRate: g.awaySuccessRate ? Number(g.awaySuccessRate) : null,
        homeExplosiveness: g.homeExplosiveness
          ? Number(g.homeExplosiveness)
          : null,
        awayExplosiveness: g.awayExplosiveness
          ? Number(g.awayExplosiveness)
          : null,
        metadata: g.metadata as Record<string, unknown> | null,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        homeTeamName: g.homeTeam.name,
        awayTeamName: g.awayTeam.name,
        homeTeamAbbr: g.homeTeam.abbreviation,
        awayTeamAbbr: g.awayTeam.abbreviation,
        homeTeamLogo: g.homeTeam.logoUrl,
        awayTeamLogo: g.awayTeam.logoUrl,
        homeTeamLevel: (g.homeTeam.level.name as Level) || "FBS",
        awayTeamLevel: (g.awayTeam.level.name as Level) || "FBS",
        margin:
          g.homeScore && g.awayScore ? g.homeScore - g.awayScore : null,
        wasUpset:
          g.homeScore && g.awayScore && g.spread
            ? (g.spread > 0 && g.homeScore > g.awayScore) ||
              (g.spread <= 0 && g.awayScore > g.homeScore)
            : null,
        spreadCovered:
          g.homeScore && g.awayScore && g.spread
            ? Math.abs(g.homeScore - g.awayScore) > Math.abs(g.spread)
            : null,
        overHit:
          g.homeScore && g.awayScore && g.overUnder
            ? g.homeScore + g.awayScore > g.overUnder
            : null,
      }));
    },
    CACHE_TTL.RIVALRY,
    {
      tags: [`tag:rivalry:${teamAId}:${teamBId}`],
    }
  );
}

// ============================================================================
// CONFERENCE QUERIES
// ============================================================================

/**
 * Get all conferences with team counts
 * @returns Array of conferences with teams
 */
export async function getConferences(): Promise<ConferenceWithTeams[]> {
  return cached(
    "conferences:all",
    async () => {
      const conferences = await prisma.conference.findMany({
        select: {
          id: true,
          name: true,
          abbreviation: true,
          slug: true,
          level: { select: { name: true } },
          teams: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              slug: true,
              logoUrl: true,
              primaryColor: true,
            },
          },
        },
        orderBy: { name: "asc" as const },
      });

      return conferences.map(c => ({
        id: c.id,
        name: c.name,
        abbreviation: c.abbreviation,
        slug: c.slug,
        level: (c.level.name as Level) || "FBS",
        teams: c.teams.map(t => ({
          id: t.id,
          name: t.name,
          abbreviation: t.abbreviation,
          slug: t.slug,
          logoUrl: t.logoUrl,
          level: (c.level.name as Level) || "FBS",
          conference: c.name,
          primaryColor: t.primaryColor,
        })),
        averageRating: null,
      }));
    },
    CACHE_TTL.CONFERENCE,
    {
      tags: ["conferences"],
    }
  );
}

/**
 * Get conference standings for a season
 * @param conferenceSlug - Conference URL slug
 * @param season - Season year
 * @returns Array of conference standings
 */
export async function getConferenceStandings(
  conferenceSlug: string,
  season: number
): Promise<ConferenceStanding[]> {
  return cached(
    `${cacheKeys.conference(conferenceSlug)}:standings:${season}`,
    async () => {
      // Stub - would need full conference game/record data
      return [];
    },
    CACHE_TTL.CONFERENCE,
    {
      tags: [cacheTags.conference(conferenceSlug), cacheTags.season(season)],
    }
  );
}

// ============================================================================
// CHAOS / LAB / COACH QUERIES
// ============================================================================

/**
 * Get most chaotic games for a week
 * @param season - Season year
 * @param week - Week number (optional, defaults to all weeks)
 * @param limit - Maximum results (default 25)
 * @returns Array of chaotic games
 */
export async function getChaosGames(
  season: number,
  week?: number,
  limit: number = 25
): Promise<ChaosGameResult[]> {
  return cached(
    week ? cacheKeys.chaos(season, week) : `chaos:${season}:all`,
    async () => {
      const chaosGames = await prisma.chaosGame.findMany({
        where: {
          season: { year: season },
          ...(week && { seasonId: season, game: { week } }),
        },
        select: {
          gameId: true,
          chaosScore: true,
          spreadBustFactor: true,
          upsetMagnitude: true,
          excitementIndex: true,
          tags: true,
          headline: true,
          narrative: true,
          game: {
            select: {
              id: true,
              week: true,
              homeScore: true,
              awayScore: true,
              homeTeam: {
                select: {
                  id: true,
                  name: true,
                  abbreviation: true,
                  slug: true,
                  logoUrl: true,
                  primaryColor: true,
                  level: { select: { name: true } },
                },
              },
              awayTeam: {
                select: {
                  id: true,
                  name: true,
                  abbreviation: true,
                  slug: true,
                  logoUrl: true,
                  primaryColor: true,
                  level: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { chaosScore: "desc" as const },
        take: limit,
      });

      return chaosGames.map(cg => ({
        gameId: cg.gameId,
        season,
        week: cg.game.week,
        homeTeam: {
          id: cg.game.homeTeam.id,
          name: cg.game.homeTeam.name,
          abbreviation: cg.game.homeTeam.abbreviation,
          slug: cg.game.homeTeam.slug,
          logoUrl: cg.game.homeTeam.logoUrl,
          level: (cg.game.homeTeam.level.name as Level) || "FBS",
          conference: null,
          primaryColor: cg.game.homeTeam.primaryColor,
        },
        awayTeam: {
          id: cg.game.awayTeam.id,
          name: cg.game.awayTeam.name,
          abbreviation: cg.game.awayTeam.abbreviation,
          slug: cg.game.awayTeam.slug,
          logoUrl: cg.game.awayTeam.logoUrl,
          level: (cg.game.awayTeam.level.name as Level) || "FBS",
          conference: null,
          primaryColor: cg.game.awayTeam.primaryColor,
        },
        homeScore: cg.game.homeScore,
        awayScore: cg.game.awayScore,
        chaosScore: cg.chaosScore ? Number(cg.chaosScore) : null,
        spreadBustFactor: cg.spreadBustFactor
          ? Number(cg.spreadBustFactor)
          : null,
        upsetMagnitude: cg.upsetMagnitude ? Number(cg.upsetMagnitude) : null,
        excitementIndex: cg.excitementIndex ? Number(cg.excitementIndex) : null,
        tags: cg.tags,
        headline: cg.headline,
        narrative: cg.narrative,
      }));
    },
    CACHE_TTL.CHAOS_INDEX,
    {
      tags: [cacheTags.season(season), ...(week ? [`tag:week:${season}:${week}`] : [])],
    }
  );
}

/**
 * Get coach grades for a season
 * @param season - Season year
 * @returns Array of coach grades
 */
export async function getCoachGrades(
  season: number
): Promise<CoachGradeResult[]> {
  return cached(
    `coaches:grades:${season}`,
    async () => {
      const grades = await prisma.coachGrade.findMany({
        where: { season: { year: season } },
        select: {
          teamId: true,
          coachName: true,
          overallGrade: true,
          fourthDownGrade: true,
          twoPtGrade: true,
          timeoutGrade: true,
          totalWpGained: true,
          totalWpLost: true,
          decisionsCount: true,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { overallGrade: "desc" as const },
      });

      return grades.map(g => ({
        teamId: g.teamId,
        teamName: g.team.name,
        teamSlug: g.team.slug,
        season,
        coachName: g.coachName,
        overallGrade: g.overallGrade ? Number(g.overallGrade) : null,
        fourthDownGrade: g.fourthDownGrade ? Number(g.fourthDownGrade) : null,
        twoPtGrade: g.twoPtGrade ? Number(g.twoPtGrade) : null,
        timeoutGrade: g.timeoutGrade ? Number(g.timeoutGrade) : null,
        totalWpGained: g.totalWpGained ? Number(g.totalWpGained) : null,
        totalWpLost: g.totalWpLost ? Number(g.totalWpLost) : null,
        decisionsCount: g.decisionsCount,
      }));
    },
    CACHE_TTL.COACH_GRADES,
    {
      tags: [cacheTags.season(season)],
    }
  );
}

/**
 * Get player outliers for a season
 * @param season - Season year
 * @param position - Position filter (optional)
 * @returns Array of player outliers
 */
export async function getPlayerOutliers(
  season: number,
  position?: string
): Promise<PlayerOutlierResult[]> {
  return cached(
    position
      ? `outliers:${season}:${position}`
      : `outliers:${season}`,
    async () => {
      const outliers = await prisma.playerOutlier.findMany({
        where: {
          season: { year: season },
          ...(position && { position }),
        },
        select: {
          playerName: true,
          position: true,
          teamId: true,
          season: { select: { year: true } },
          category: true,
          statLabel: true,
          statValue: true,
          zscore: true,
          percentile: true,
          detail: true,
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { zscore: "desc" as const },
      });

      return outliers.map(o => ({
        playerName: o.playerName,
        position: o.position,
        teamId: o.teamId,
        teamName: o.team?.name ?? null,
        season: o.season.year,
        category: o.category,
        statLabel: o.statLabel,
        statValue: o.statValue ? Number(o.statValue) : null,
        zscore: o.zscore ? Number(o.zscore) : null,
        percentile: o.percentile ? Number(o.percentile) : null,
        detail: o.detail,
      }));
    },
    CACHE_TTL.HISTORICAL,
    {
      tags: [cacheTags.season(season)],
    }
  );
}

// ============================================================================
// STATS / AGGREGATION QUERIES
// ============================================================================

/**
 * Get site-wide statistics
 * @returns Site statistics
 */
export async function getSiteStats(): Promise<SiteStats> {
  return cached(
    "site:stats",
    async () => {
      const [
        totalTeams,
        totalConferences,
        totalGames,
        totalSeasons,
        fbsTeams,
        fcsTeams,
        d2Teams,
        d3Teams,
        naiaTeams,
      ] = await Promise.all([
        prisma.team.count(),
        prisma.conference.count(),
        prisma.game.count(),
        prisma.season.count(),
        prisma.team.count({ where: { level: { name: "FBS" } } }),
        prisma.team.count({ where: { level: { name: "FCS" } } }),
        prisma.team.count({ where: { level: { name: "D2" } } }),
        prisma.team.count({ where: { level: { name: "D3" } } }),
        prisma.team.count({ where: { level: { name: "NAIA" } } }),
      ]);

      return {
        totalTeams,
        totalConferences,
        totalGames,
        totalSeasons,
        fbs: fbsTeams,
        fcs: fcsTeams,
        d2: d2Teams,
        d3: d3Teams,
        naia: naiaTeams,
        lastUpdated: new Date().toISOString(),
      };
    },
    CACHE_TTL.HISTORICAL
  );
}

/**
 * Get last updated timestamps
 * @returns Last update information
 */
export async function getLastUpdated(): Promise<LastUpdated> {
  return cached(
    "metadata:last-updated",
    async () => {
      const [latestRanking, latestGame] = await Promise.all([
        prisma.ranking.findFirst({
          orderBy: { computedAt: "desc" as const },
          select: { computedAt: true },
        }),
        prisma.game.findFirst({
          orderBy: { updatedAt: "desc" as const },
          select: { updatedAt: true },
        }),
      ]);

      return {
        rankings: latestRanking?.computedAt ?? null,
        games: latestGame?.updatedAt ?? null,
        recruiting: null,
        chaos: null,
        coaches: null,
        overallAt: new Date(),
      };
    },
    CACHE_TTL.HISTORICAL
  );
}
