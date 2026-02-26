/**
 * GET /api/sentiment/pulse
 *
 * Returns all data needed for the Pulse page:
 * - Sentiment leaderboard (most positive/negative)
 * - Biggest risers/fallers (7-day change)
 * - Media vs fan divergences
 * - Player buzz board
 * - Coach approval ratings
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { cached, cacheKeys, CACHE_TTL } from "@/lib/db/cache";
import {
  errorResponse,
  successResponse,
  getCurrentSeasonAndWeek,
} from "../../_helpers";

export const dynamic = "force-dynamic";

interface PulseData {
  leaderboard: {
    mostPositive: TeamSentimentEntry[];
    mostNegative: TeamSentimentEntry[];
  };
  controversies: TeamSentimentEntry[];
  risers: TeamSentimentEntry[];
  divergences: MediaFanDivergenceEntry[];
  playerBuzz: PlayerBuzzEntry[];
  coachApproval: CoachApprovalEntry[];
  weekStats: {
    avgScore: number;
    totalMentions: number;
    mostDiscussed: string | null;
  };
}

interface TeamSentimentEntry {
  teamId: number;
  name: string;
  abbreviation: string | null;
  slug: string;
  logoUrl: string | null;
  level: string;
  score: number | null;
  trend: string | null;
  buzzVolume: number | null;
  changeFromLastWeek: number | null;
}

interface MediaFanDivergenceEntry extends TeamSentimentEntry {
  mediaScore: number | null;
  fanScore: number | null;
  divergence: number;
}

interface PlayerBuzzEntry {
  playerName: string;
  teamName: string;
  teamSlug: string;
  position: string | null;
  buzzZscore: number | null;
  buzzStatus: string | null;
  mentionCount: number | null;
  sentimentScore: number | null;
}

interface CoachApprovalEntry {
  teamId: number;
  teamName: string;
  teamSlug: string;
  coachName: string;
  approvalScore: number;
  approvalTrend: string | null;
  mentionCount: number;
}

export async function GET(req: NextRequest) {
  try {
    const { season: currentSeason, week: currentWeek } =
      getCurrentSeasonAndWeek();
    const season = getQueryParamInt(req, "season", currentSeason);

    const cacheKey = cacheKeys.pulse(season, currentWeek ?? "latest");

    const data = await cached(
      cacheKey,
      async () => {
        // Get season record
        const seasonRec = await prisma.season.findUnique({
          where: { year: season },
          select: { id: true },
        });

        if (!seasonRec) {
          return {
            leaderboard: { mostPositive: [], mostNegative: [] },
            controversies: [],
            risers: [],
            divergences: [],
            playerBuzz: [],
            coachApproval: [],
            weekStats: { avgScore: 0, totalMentions: 0, mostDiscussed: null },
          };
        }

        // Get recent sentiments (last 7 days approx)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const sentiments = await prisma.teamSentiment.findMany({
          where: {
            seasonId: seasonRec.id,
            measuredAt: { gte: weekAgo },
          },
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
          orderBy: { measuredAt: "desc" },
        });

        // Group by team and get latest
        const latestByTeam = new Map<number, TeamSentimentEntry>();
        for (const s of sentiments) {
          const existing = latestByTeam.get(s.teamId);
          if (!existing) {
            latestByTeam.set(s.teamId, {
              teamId: s.team.id,
              name: s.team.name,
              abbreviation: s.team.abbreviation,
              slug: s.team.slug,
              logoUrl: s.team.logoUrl,
              level: s.team.level?.name ?? "FBS",
              score: s.score,
              trend: s.trend,
              buzzVolume: s.buzzVolume,
              changeFromLastWeek: null, // Would need historical comparison
            });
          }
        }

        const allSentiments = Array.from(latestByTeam.values());

        // Calculate leaderboard
        const withScore = allSentiments.filter((s) => s.score !== null);
        const mostPositive = [...withScore]
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .slice(0, 10);
        const mostNegative = [...withScore]
          .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
          .slice(0, 10);

        // Controversies (biggest drops - negative trend, low score)
        const controversies = allSentiments
          .filter((s) => s.trend === "down" && (s.score ?? 50) < 40)
          .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
          .slice(0, 5);

        // Risers (positive trend)
        const risers = allSentiments
          .filter((s) => s.trend === "up")
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .slice(0, 5);

        // Media vs Fan divergences
        const divergences: MediaFanDivergenceEntry[] = allSentiments
          .filter((s) => s.mediaFanDivergence !== null && Math.abs(s.mediaFanDivergence ?? 0) > 10)
          .map((s) => ({
            ...s,
            mediaScore: s.newsScore ?? null,
            fanScore: s.redditScore ?? null,
            divergence: Math.abs(s.mediaFanDivergence ?? 0),
          }))
          .sort((a, b) => b.divergence - a.divergence)
          .slice(0, 10);

        // Player buzz (from player_sentiment table)
        const playerBuzz = await prisma.playerSentiment.findMany({
          where: { seasonId: seasonRec.id },
          include: {
            team: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { buzzZscore: "desc" },
          take: 15,
        });

        const playerBuzzEntries: PlayerBuzzEntry[] = playerBuzz.map((p) => ({
          playerName: p.playerName,
          teamName: p.team?.name ?? "Unknown",
          teamSlug: p.team?.slug ?? "unknown",
          position: p.position,
          buzzZscore: p.buzzZscore,
          buzzStatus: p.buzzStatus,
          mentionCount: p.mentionCount ?? 0,
          sentimentScore: p.sentimentScore ? Number(p.sentimentScore) : null,
        }));

        // Coach approval
        const coachApprovals = await prisma.coachApproval.findMany({
          where: { season },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { approvalScore: "desc" },
          take: 10,
        });

        const coachApprovalEntries: CoachApprovalEntry[] = coachApprovals.map((c) => ({
          teamId: c.team.id,
          teamName: c.team.name,
          teamSlug: c.team.slug,
          coachName: c.coachName,
          approvalScore: Number(c.approvalScore),
          approvalTrend: c.approvalTrend,
          mentionCount: c.mentionCount,
        }));

        // Week stats
        const totalMentions = allSentiments.reduce(
          (sum, s) => sum + (s.buzzVolume ?? 0),
          0
        );
        const avgScore =
          withScore.length > 0
            ? withScore.reduce((sum, s) => sum + (s.score ?? 0), 0) / withScore.length
            : 50;
        const mostDiscussed =
          allSentiments.length > 0
            ? allSentiments.sort((a, b) => (b.buzzVolume ?? 0) - (a.buzzVolume ?? 0))[0]
                .name
            : null;

        return {
          leaderboard: {
            mostPositive,
            mostNegative,
          },
          controversies,
          risers,
          divergences,
          playerBuzz: playerBuzzEntries,
          coachApproval: coachApprovalEntries,
          weekStats: {
            avgScore: Math.round(avgScore),
            totalMentions,
            mostDiscussed,
          },
        };
      },
      CACHE_TTL.PULSE,
      {
        tags: [`season:${season}`, `pulse:${season}:${currentWeek ?? "latest"}`],
      }
    );

    return successResponse(data as PulseData);
  } catch (error) {
    console.error("[/api/sentiment/pulse] Error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}

function getQueryParamInt(
  req: NextRequest,
  key: string,
  defaultValue: number
): number {
  const value = req.nextUrl.searchParams.get(key);
  return value ? parseInt(value, 10) : defaultValue;
}
