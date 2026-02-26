/**
 * GET /api/predictions
 *
 * Returns game predictions for upcoming games in a given week.
 *
 * Query parameters:
 * - season: number (current season if omitted)
 * - week: number (current/upcoming week if omitted)
 * - limit: number (default 50, max 200)
 * - offset: number (default 0)
 * - minConfidence: number (0-1, filter by confidence level)
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { cached, CACHE_TTL, cacheKeys } from "@/lib/db/cache";
import type { GamePrediction } from "@/types";
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

    // Parse minConfidence as float
    const minConfidenceStr = new URL(req.url).searchParams.get("minConfidence");
    const minConfidence = minConfidenceStr
      ? Math.max(0, Math.min(1, parseFloat(minConfidenceStr)))
      : 0.0;

    // Build cache key
    const cacheKey = cacheKeys.predictions(season, week);

    const predictions = await cached(
      cacheKey,
      async () => {
        // Get season record
        const seasonRec = await prisma.season.findUnique({
          where: { year: season },
          select: { id: true },
        });

        if (!seasonRec) {
          return { predictions: [], accuracy: { ytd: 0, lastWeek: 0 } };
        }

        // Fetch games for this week
        const games = await prisma.game.findMany({
          where: {
            seasonId: seasonRec.id,
            week: week,
          },
          select: {
            id: true,
            gameDate: true,
            homeTeamId: true,
            awayTeamId: true,
            homeScore: true,
            awayScore: true,
            homeWinProb: true,
            spread: true,
            overUnder: true,
            homeTeam: {
              select: {
                name: true,
                abbreviation: true,
                slug: true,
                logoUrl: true,
              },
            },
            awayTeam: {
              select: {
                name: true,
                abbreviation: true,
                slug: true,
                logoUrl: true,
              },
            },
            homeTeam_ratings: {
              select: { rating: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            awayTeam_ratings: {
              select: { rating: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: { gameDate: "asc" },
        });

        const gamePredictions: GamePrediction[] = games.map((g) => {
          // Get team ratings
          const homeRating = g.homeTeam_ratings[0]?.rating
            ? Number(g.homeTeam_ratings[0].rating)
            : 1500;
          const awayRating = g.awayTeam_ratings[0]?.rating
            ? Number(g.awayTeam_ratings[0].rating)
            : 1500;

          // Calculate win probability from rating difference
          // Simple logistic function: WP = 1 / (1 + 10^(-ratingDiff/400))
          const ratingDiff = (homeRating - awayRating) / 400;
          const homeWP = 1 / (1 + Math.pow(10, -ratingDiff));
          const awayWP = 1 - homeWP;

          // Predicted spread (roughly: ratingDiff * 0.05 + 2.5 HFA)
          const predictedSpread =
            (awayRating - homeRating) / 30 + 2.5; // Positive = away favored

          // Confidence is higher when rating difference is larger
          const confidence = Math.min(
            0.95,
            0.5 + Math.abs(ratingDiff) * 0.15
          );

          // Confidence interval (95%)
          const ciWidth = (1 - confidence) * 20; // Wider when less confident
          const ciLow = Math.max(
            0,
            homeWP - ciWidth
          );
          const ciHigh = Math.min(
            1,
            homeWP + ciWidth
          );

          return {
            gameId: g.id,
            homeWinProb: homeWP,
            awayWinProb: awayWP,
            predictedSpread,
            confidenceIntervalLow: ciLow,
            confidenceIntervalHigh: ciHigh,
            confidence,
            homeFavored: homeWP > 0.5,
            upsetAlert: false, // TODO: check vs Vegas line
            modelVersion: "gridrank-v3.0",
            predictedAt: new Date(),
            narrative: null,
          };
        });

        // Filter by min confidence
        const filtered = gamePredictions.filter((p) => p.confidence >= minConfidence);

        // Calculate accuracy (for past weeks)
        let ytdAccuracy = 0;
        let lastWeekAccuracy = 0;
        // TODO: Compare predictions to actual results from previous weeks

        return {
          predictions: filtered,
          accuracy: { ytd: ytdAccuracy, lastWeek: lastWeekAccuracy },
        };
      },
      CACHE_TTL.PREDICTIONS,
      {
        tags: [`season:${season}`, `week:${season}:${week}`],
      }
    );

    const paginatedPredictions = predictions.predictions.slice(
      offset,
      offset + limit
    );

    const response = {
      predictions: paginatedPredictions,
    };

    const meta = {
      season,
      week,
      returned: paginatedPredictions.length,
      total: predictions.predictions.length,
      accuracy: predictions.accuracy,
      timestamp: new Date().toISOString(),
    };

    return successResponse(response, meta);
  } catch (error) {
    console.error("[/api/predictions] Error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}
