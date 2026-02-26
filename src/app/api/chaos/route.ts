/**
 * GET /api/chaos
 *
 * Returns chaos index scores for games in a given week.
 *
 * Query parameters:
 * - season: number (current season if omitted)
 * - week: number (latest week if omitted)
 * - limit: number (default 50, max 200)
 * - offset: number (default 0)
 * - minScore: number (filter games with chaos score >= minScore)
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { cached, CACHE_TTL, cacheKeys } from "@/lib/db/cache";
import type { ChaosGame, GameWithStats } from "@/types";
import {
  errorResponse,
  successResponse,
  getQueryParamInt,
  getCurrentSeasonAndWeek,
} from "../_helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { season: currentSeason, week: currentWeek } =
      getCurrentSeasonAndWeek();
    const season = getQueryParamInt(req, "season", currentSeason);
    const week = getQueryParamInt(req, "week", currentWeek);
    const limit = Math.min(getQueryParamInt(req, "limit", 50), 200);
    const offset = getQueryParamInt(req, "offset", 0);
    const minScore = getQueryParamInt(req, "minScore", 0);

    // Build cache key
    const cacheKey = cacheKeys.chaos(season, week);

    const chaosData = await cached(
      cacheKey,
      async () => {
        // Get season record
        const seasonRec = await prisma.season.findUnique({
          where: { year: season },
          select: { id: true },
        });

        if (!seasonRec) {
          return { games: [], weekScore: 0, weekTier: "unknown" };
        }

        // Fetch chaos games for this week
        const chaosGames = await prisma.chaosGame.findMany({
          where: {
            seasonId: seasonRec.id,
            season: season,
          },
          select: {
            gameId: true,
            chaosScore: true,
            spreadBustFactor: true,
            winProbVolatility: true,
            upsetMagnitude: true,
            excitementIndex: true,
            contextWeight: true,
            postgameWpInversion: true,
            winnerLowestWp: true,
            wpCrosses50: true,
            tags: true,
            headline: true,
            narrative: true,
            game: {
              select: {
                id: true,
                week: true,
                gameDate: true,
                homeTeamId: true,
                awayTeamId: true,
                homeScore: true,
                awayScore: true,
                isNeutralSite: true,
                isConferenceGame: true,
                isPostseason: true,
                homeEpa: true,
                awayEpa: true,
                homeSuccessRate: true,
                awaySuccessRate: true,
                homeExplosiveness: true,
                awayExplosiveness: true,
                homeWinProb: true,
                spread: true,
                overUnder: true,
                excitementIndex: true,
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
            },
          },
          orderBy: { chaosScore: "desc" },
        });

        // Filter by minScore
        const filtered = chaosGames.filter(
          (cg) => !cg.chaosScore || cg.chaosScore >= minScore
        );

        // Transform to ChaosGame format
        const games: ChaosGame[] = filtered
          .slice(offset, offset + limit)
          .map((cg): ChaosGame => {
            const g = cg.game;
            return {
              gameId: g.id,
              game: {
                id: g.id,
                season: season,
                week: g.week,
                gameDate: g.gameDate,
                homeTeamId: g.homeTeamId,
                awayTeamId: g.awayTeamId,
                homeScore: g.homeScore,
                awayScore: g.awayScore,
                isNeutralSite: g.isNeutralSite,
                isConferenceGame: g.isConferenceGame,
                isPostseason: g.isPostseason,
                metadata: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                homeEpa: g.homeEpa ? Number(g.homeEpa) : null,
                awayEpa: g.awayEpa ? Number(g.awayEpa) : null,
                homeSuccessRate: g.homeSuccessRate
                  ? Number(g.homeSuccessRate)
                  : null,
                awaySuccessRate: g.awaySuccessRate
                  ? Number(g.awaySuccessRate)
                  : null,
                homeExplosiveness: g.homeExplosiveness
                  ? Number(g.homeExplosiveness)
                  : null,
                awayExplosiveness: g.awayExplosiveness
                  ? Number(g.awayExplosiveness)
                  : null,
                homeWinProb: g.homeWinProb ? Number(g.homeWinProb) : null,
                spread: g.spread ? Number(g.spread) : null,
                overUnder: g.overUnder ? Number(g.overUnder) : null,
                excitementIndex: g.excitementIndex
                  ? Number(g.excitementIndex)
                  : null,
                homeTeamName: g.homeTeam.name,
                awayTeamName: g.awayTeam.name,
                homeTeamAbbr: g.homeTeam.abbreviation,
                awayTeamAbbr: g.awayTeam.abbreviation,
                homeTeamLogo: g.homeTeam.logoUrl,
                awayTeamLogo: g.awayTeam.logoUrl,
                homeTeamLevel: (g.homeTeam.level.name as any) || "FBS",
                awayTeamLevel: (g.awayTeam.level.name as any) || "FBS",
                margin:
                  g.homeScore !== null && g.awayScore !== null
                    ? g.homeScore - g.awayScore
                    : null,
                wasUpset: null,
                spreadCovered: null,
                overHit: null,
              } as GameWithStats,
              chaosScore: cg.chaosScore ? Number(cg.chaosScore) : null,
              chaosPercentile: null,
              components: {
                spreadBustFactor: cg.spreadBustFactor
                  ? Number(cg.spreadBustFactor)
                  : null,
                wpVolatility: cg.winProbVolatility
                  ? Number(cg.winProbVolatility)
                  : null,
                upsetMagnitude: cg.upsetMagnitude
                  ? Number(cg.upsetMagnitude)
                  : null,
                excitementIndex: cg.excitementIndex
                  ? Number(cg.excitementIndex)
                  : null,
                contextWeight: cg.contextWeight
                  ? Number(cg.contextWeight)
                  : null,
                postgameWpInversion: cg.postgameWpInversion
                  ? Number(cg.postgameWpInversion)
                  : null,
              },
              tags: (cg.tags || []) as any,
              headline: cg.headline,
              narrative: cg.narrative,
              winnerLowestWp: cg.winnerLowestWp
                ? Number(cg.winnerLowestWp)
                : null,
              wpCrosses50: cg.wpCrosses50,
              computedAt: new Date(),
              season,
              week: g.week,
              chaosPlay: null,
            };
          });

        // Calculate week score (average chaos score)
        const weekScore =
          filtered.length > 0
            ? filtered.reduce((sum, cg) => sum + (cg.chaosScore || 0), 0) /
              filtered.length
            : 0;

        // Determine tier
        let weekTier = "Normal";
        if (weekScore > 75) weekTier = "Chaos Reigns";
        else if (weekScore > 60) weekTier = "Mayhem";
        else if (weekScore > 45) weekTier = "Elevated";
        else if (weekScore > 30) weekTier = "Notable";

        return {
          games,
          weekScore: Math.round(weekScore * 10) / 10,
          weekTier,
        };
      },
      CACHE_TTL.CHAOS_INDEX,
      {
        tags: [`season:${season}`, `week:${season}:${week}`],
      }
    );

    const response = {
      games: chaosData.games,
      weekScore: chaosData.weekScore,
      weekTier: chaosData.weekTier,
    };

    const meta = {
      season,
      week,
      returned: chaosData.games.length,
      timestamp: new Date().toISOString(),
    };

    return successResponse(response, meta);
  } catch (error) {
    console.error("[/api/chaos] Error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}
