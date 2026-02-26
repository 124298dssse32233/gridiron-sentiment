/**
 * GET /api/sentiment/[slug]
 *
 * Returns detailed sentiment data for a specific team.
 *
 * Returns:
 * - Current sentiment score and trend
 * - Score over time (last 8 weeks)
 * - Source breakdown (bluesky, reddit, news)
 * - Hot topics
 * - Coach approval
 * - Sample posts
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { cached, cacheKeys, CACHE_TTL } from "@/lib/db/cache";
import { errorResponse, successResponse, getCurrentSeasonAndWeek } from "../../_helpers";

export const dynamic = "force-dynamic";

interface SentimentTimelinePoint {
  measuredAt: Date;
  score: number | null;
  trend: string | null;
  buzzVolume: number | null;
}

interface TeamSentimentDetail {
  team: {
    id: number;
    name: string;
    abbreviation: string | null;
    slug: string;
    logoUrl: string | null;
    level: string | null;
  };
  current: {
    score: number | null;
    trend: string | null;
    buzzVolume: number | null;
    sourceBreakdown: Record<string, number> | null;
    hotTopics: string[] | null;
    coachApproval: number | null;
    mediaFanDivergence: number | null;
    blueskyScore: number | null;
    redditScore: number | null;
    newsScore: number | null;
    measuredAt: Date;
  } | null;
  timeline: SentimentTimelinePoint[];
  summary: {
    avgScore: number;
    maxScore: number;
    minScore: number;
    trendDirection: "up" | "down" | "stable";
  } | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const { season: currentSeason } = getCurrentSeasonAndWeek();
    const seasonParam = req.nextUrl.searchParams.get("season");
    const season = seasonParam ? parseInt(seasonParam) : currentSeason;

    // Get team by slug
    const team = await prisma.team.findUnique({
      where: { slug },
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
    });

    if (!team) {
      return errorResponse("Team not found", 404);
    }

    // Get season record
    const seasonRec = await prisma.season.findUnique({
      where: { year: season },
      select: { id: true },
    });

    if (!seasonRec) {
      return errorResponse("Season not found", 404);
    }

    const cacheKey = cacheKeys.sentimentTeam(slug, season);

    const data = await cached(
      cacheKey,
      async () => {
        // Get all sentiment measurements for this team in the season
        const sentiments = await prisma.teamSentiment.findMany({
          where: {
            teamId: team.id,
            seasonId: seasonRec.id,
          },
          orderBy: { measuredAt: "asc" },
          take: 20, // Last 20 measurements
        });

        if (sentiments.length === 0) {
          return {
            team: {
              id: team.id,
              name: team.name,
              abbreviation: team.abbreviation,
              slug: team.slug,
              logoUrl: team.logoUrl,
              level: team.level?.name ?? "FBS",
            },
            current: null,
            timeline: [],
            summary: null,
          };
        }

        const current = sentiments[sentiments.length - 1];

        // Build timeline
        const timeline: SentimentTimelinePoint[] = sentiments.map((s) => ({
          measuredAt: s.measuredAt,
          score: s.score,
          trend: s.trend,
          buzzVolume: s.buzzVolume,
        }));

        // Calculate summary
        const scores = sentiments
          .map((s) => s.score)
          .filter((s): s is number => s !== null);
        const avgScore =
          scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0;
        const maxScore =
          scores.length > 0 ? Math.max(...scores) : 0;
        const minScore =
          scores.length > 0 ? Math.min(...scores) : 0;

        // Determine trend direction
        const recentScores = scores.slice(-4);
        const olderScores = scores.slice(0, -4);
        const recentAvg =
          recentScores.length > 0
            ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
            : 0;
        const olderAvg =
          olderScores.length > 0
            ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length
            : 0;
        let trendDirection: "up" | "down" | "stable" = "stable";
        if (recentAvg - olderAvg > 5) trendDirection = "up";
        else if (recentAvg - olderAvg < -5) trendDirection = "down";

        return {
          team: {
            id: team.id,
            name: team.name,
            abbreviation: team.abbreviation,
            slug: team.slug,
            logoUrl: team.logoUrl,
            level: team.level?.name ?? "FBS",
          },
          current: {
            score: current.score,
            trend: current.trend,
            buzzVolume: current.buzzVolume,
            sourceBreakdown: current.sourceBreakdown as Record<string, number> | null,
            hotTopics: current.hotTopics as string[] | null,
            coachApproval: current.coachApproval,
            mediaFanDivergence: current.mediaFanDivergence,
            blueskyScore: current.blueskyScore,
            redditScore: current.redditScore,
            newsScore: current.newsScore,
            measuredAt: current.measuredAt,
          },
          timeline,
          summary: {
            avgScore,
            maxScore,
            minScore,
            trendDirection,
          },
        };
      },
      CACHE_TTL.SENTIMENT,
      {
        tags: [`team:${slug}`, `season:${season}`],
      }
    );

    return successResponse(data as TeamSentimentDetail);
  } catch (error) {
    console.error(`[/api/sentiment/${params.slug}] Error:`, error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}
