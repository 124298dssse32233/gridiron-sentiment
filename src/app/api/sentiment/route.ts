/**
 * GET /api/sentiment
 *
 * Returns all team sentiment scores for a given season/week.
 *
 * Query parameters:
 * - season: number (current season if omitted)
 * - week: number (optional - if omitted, returns latest week)
 * - limit: number (default 130, max 300)
 * - sort: "score" | "buzz" | "change" (default "score")
 * - order: "asc" | "desc" (default "desc")
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { cached, cacheKeys, CACHE_TTL } from "@/lib/db/cache";
import {
  errorResponse,
  successResponse,
  getQueryParamInt,
  getCurrentSeasonAndWeek,
} from "../_helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { season: currentSeason } = getCurrentSeasonAndWeek();
    const season = getQueryParamInt(req, "season", currentSeason);
    const weekParam = req.nextUrl.searchParams.get("week");
    const limit = Math.min(getQueryParamInt(req, "limit", 130), 300);
    const sort = req.nextUrl.searchParams.get("sort") || "score";
    const order = req.nextUrl.searchParams.get("order") || "desc";

    // Get season record
    const seasonRec = await prisma.season.findUnique({
      where: { year: season },
      select: { id: true },
    });

    if (!seasonRec) {
      return errorResponse("Season not found", 404);
    }

    // Build cache key
    const cacheKey = cacheKeys.sentiment(season, weekParam ?? "latest");

    const data = await cached(
      cacheKey,
      async () => {
        // Build query
        const where: any = { seasonId: seasonRec.id };

        // If week specified, filter by it (approximately - within 7 days)
        if (weekParam) {
          const weekNum = parseInt(weekParam);
          // Simple approximation: filter by measuredAt in a range
          // Week 1 ≈ late Aug, Week 16 ≈ early Dec
          const weekStart = new Date(`${season}-08-01`);
          weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          where.measuredAt = {
            gte: weekStart,
            lt: weekEnd,
          };
        }

        // Get the latest sentiment measurement for each team
        const sentiments = await prisma.teamSentiment.findMany({
          where,
          include: {
            team: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
                slug: true,
                logoUrl: true,
                level: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy:
            sort === "buzz"
              ? [{ buzzVolume: order === "desc" ? "desc" : "asc" }]
              : [{ score: order === "desc" ? "desc" : "asc" }],
          take: limit,
        });

        // Group by team and keep only the latest measurement per team
        const latestByTeam = new Map();
        for (const sentiment of sentiments) {
          const existing = latestByTeam.get(sentiment.teamId);
          if (
            !existing ||
            sentiment.measuredAt > existing.measuredAt
          ) {
            latestByTeam.set(sentiment.teamId, sentiment);
          }
        }

        // Convert to array and sort
        let result = Array.from(latestByTeam.values());

        // Re-sort by the requested field
        result.sort((a, b) => {
          if (sort === "score") {
            const aScore = a.score ?? 0;
            const bScore = b.score ?? 0;
            return order === "desc" ? bScore - aScore : aScore - bScore;
          }
          if (sort === "buzz") {
            const aBuzz = a.buzzVolume ?? 0;
            const bBuzz = b.buzzVolume ?? 0;
            return order === "desc" ? bBuzz - aBuzz : aBuzz - bBuzz;
          }
          return 0;
        });

        // Apply limit after grouping
        result = result.slice(0, limit);

        return result.map((s) => ({
          teamId: s.team.id,
          team: {
            id: s.team.id,
            name: s.team.name,
            abbreviation: s.team.abbreviation,
            slug: s.team.slug,
            logoUrl: s.team.logoUrl,
            level: s.team.level?.name ?? "FBS",
          },
          score: s.score,
          trend: s.trend,
          buzzVolume: s.buzzVolume,
          sourceBreakdown: s.sourceBreakdown,
          hotTopics: s.hotTopics,
          coachApproval: s.coachApproval,
          mediaFanDivergence: s.mediaFanDivergence,
          blueskyScore: s.blueskyScore,
          redditScore: s.redditScore,
          newsScore: s.newsScore,
          measuredAt: s.measuredAt,
        }));
      },
      CACHE_TTL.SENTIMENT,
      {
        tags: [`season:${season}`, weekParam ? `week:${season}:${weekParam}` : `season:${season}`],
      }
    );

    return successResponse({ sentiments: data });
  } catch (error) {
    console.error("[/api/sentiment] Error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}
