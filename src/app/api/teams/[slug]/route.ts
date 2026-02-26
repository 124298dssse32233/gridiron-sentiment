/**
 * GET /api/teams/[slug]
 *
 * Returns detailed information about a single team including current rating,
 * recent games, and historical rating data.
 *
 * Path parameters:
 * - slug: string (team slug, e.g. "ohio-state")
 *
 * Query parameters:
 * - season: number (current season if omitted)
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { cached, CACHE_TTL, cacheKeys } from "@/lib/db/cache";
import type { TeamFull, RatingHistory, RatingHistoryPoint } from "@/types";
import {
  errorResponse,
  successResponse,
  getQueryParamInt,
  getCurrentSeasonAndWeek,
} from "../../_helpers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug.toLowerCase();
    const { season: currentSeason } = getCurrentSeasonAndWeek();
    const season = getQueryParamInt(req, "season", currentSeason);

    const cacheKey = cacheKeys.team(slug);

    const teamData = await cached(
      cacheKey,
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
            conferenceId: true,
            levelId: true,
            level: {
              select: { name: true },
            },
            conference: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
                slug: true,
                level: { select: { name: true } },
              },
            },
            homeGames: {
              where: {
                season: { year: season },
              },
              select: {
                id: true,
                awayTeam: { select: { name: true, slug: true, logoUrl: true } },
                homeScore: true,
                awayScore: true,
                gameDate: true,
              },
              orderBy: { gameDate: "desc" },
              take: 10,
            },
            awayGames: {
              where: {
                season: { year: season },
              },
              select: {
                id: true,
                homeTeam: { select: { name: true, slug: true, logoUrl: true } },
                homeScore: true,
                awayScore: true,
                gameDate: true,
              },
              orderBy: { gameDate: "desc" },
              take: 10,
            },
            teamRankings: {
              where: {
                ranking: {
                  season: { year: season },
                },
              },
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
              orderBy: {
                ranking: { week: "desc" },
              },
              take: 1,
            },
          },
        });

        if (!team) {
          return null;
        }

        // Get current rating
        const latestRanking = team.teamRankings[0];

        // Combine games (home and away) and sort
        const allGames = [
          ...team.homeGames.map((g) => ({
            gameId: g.id,
            opponent: g.awayTeam.name,
            opponentSlug: g.awayTeam.slug,
            opponentLogo: g.awayTeam.logoUrl,
            score: g.homeScore || 0,
            opponentScore: g.awayScore || 0,
            date: g.gameDate,
            isWin: (g.homeScore || 0) > (g.awayScore || 0),
            isHome: true,
          })),
          ...team.awayGames.map((g) => ({
            gameId: g.id,
            opponent: g.homeTeam.name,
            opponentSlug: g.homeTeam.slug,
            opponentLogo: g.homeTeam.logoUrl,
            score: g.awayScore || 0,
            opponentScore: g.homeScore || 0,
            date: g.gameDate,
            isWin: (g.awayScore || 0) > (g.homeScore || 0),
            isHome: false,
          })),
        ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

        const teamFull: TeamFull = {
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
          metadata: team.metadata,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
          conferenceId: team.conferenceId,
          level: (team.level.name as any) || "FBS",
          rating: latestRanking ? Number(latestRanking.rating) : 0,
          ratingDeviation: 0, // TODO: fetch
          volatility: 0, // TODO: fetch
          rank: latestRanking?.rank ?? null,
          previousRank: null, // TODO: fetch from previous week
          ratingChange: latestRanking?.ratingChange
            ? Number(latestRanking.ratingChange)
            : null,
          offenseRating: latestRanking?.offenseRating
            ? Number(latestRanking.offenseRating)
            : null,
          defenseRating: latestRanking?.defenseRating
            ? Number(latestRanking.defenseRating)
            : null,
          sos: latestRanking?.sos ? Number(latestRanking.sos) : null,
          wins: latestRanking?.recordWins ?? null,
          losses: latestRanking?.recordLosses ?? null,
          playoffProbability: latestRanking?.playoffProbability
            ? Number(latestRanking.playoffProbability)
            : null,
          sparkline: [], // TODO: populate
          gamesPlayed: allGames.length,
          conference: team.conference
            ? {
                id: team.conference.id,
                name: team.conference.name,
                abbreviation: team.conference.abbreviation,
                slug: team.conference.slug,
                level: (team.conference.level.name as any) || "FBS",
                teamCount: 0, // TODO: calculate
                averageRating: null, // TODO: calculate
                powerRank: null, // TODO: calculate
              }
            : null,
          recentGames: allGames,
          rosterSize: 0, // TODO: count players
          starters: 0, // TODO: count
          recruitingClassYear: null,
          avgRecruitRating: null,
          fiveStars: null,
          fourStars: null,
          allTimeWins: null,
          allTimeLosses: null,
          bowlAppearances: null,
          nationalChampionships: null,
        };

        return teamFull;
      },
      CACHE_TTL.TEAM_PROFILE,
      {
        tags: [`team:${slug}`, `season:${season}`],
      }
    );

    if (!teamData) {
      return errorResponse(`Team not found: ${slug}`, 404);
    }

    // Fetch historical rating data
    const ratingHistory = await cached(
      `${cacheKeys.team(slug)}:history:${season}`,
      async () => {
        const rankings = await prisma.ranking.findMany({
          where: {
            season: { year: season },
          },
          select: {
            week: true,
            computedAt: true,
            teamRankings: {
              where: { team: { slug } },
              select: {
                rating: true,
                ratingChange: true,
                rank: true,
                recordWins: true,
                recordLosses: true,
              },
            },
          },
          orderBy: { week: "asc" },
        });

        const history: RatingHistoryPoint[] = rankings
          .filter((r) => r.teamRankings.length > 0)
          .map((r) => {
            const tr = r.teamRankings[0];
            return {
              week: r.week,
              season: season,
              rating: Number(tr.rating),
              ratingDeviation: 0, // TODO: fetch
              rank: tr.rank,
              wins: tr.recordWins,
              losses: tr.recordLosses,
              date: r.computedAt,
              sparkline: [], // TODO: calculate
              playoffProbability: null, // TODO: fetch
            };
          });

        const preseason = history[0];
        const peak = history.reduce((a, b) =>
          a.rating > b.rating ? a : b
        );
        const lowest = history.reduce((a, b) =>
          a.rating < b.rating ? a : b
        );
        const final = history[history.length - 1];

        const result: RatingHistory = {
          teamId: teamData.id,
          teamName: teamData.name,
          season,
          history,
          preseasonRating: preseason?.rating ?? 0,
          peakRating: peak?.rating ?? 0,
          peakRatingWeek: peak?.week ?? null,
          lowestRating: lowest?.rating ?? 0,
          lowestRatingWeek: lowest?.week ?? null,
          finalRating: final?.rating ?? 0,
          totalRatingChange: final ? final.rating - (preseason?.rating ?? 0) : 0,
          avgVolatility: 0, // TODO: calculate
          madePlayoffs: false, // TODO: check
          playoffSeed: null,
          finalRank: final?.rank ?? null,
        };

        return result;
      },
      CACHE_TTL.HISTORICAL,
      {
        tags: [`team:${slug}`, `season:${season}`],
      }
    );

    const response = {
      team: teamData,
      history: ratingHistory,
    };

    return successResponse(response, {
      season,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[/api/teams/[${params.slug}]] Error:`, error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}
