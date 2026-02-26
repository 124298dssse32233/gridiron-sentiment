/**
 * GET /api/rankings
 *
 * Returns paginated rankings with filtering and sorting.
 *
 * Query parameters:
 * - season: number (current season if omitted)
 * - week: number (latest week if omitted)
 * - level: string (FBS, FCS, D2, D3, NAIA - all if omitted)
 * - conference: string (slug - all if omitted)
 * - limit: number (default 100, max 500)
 * - offset: number (default 0)
 * - sort: string (rating, rank, change, name - default rating)
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { cached, CACHE_TTL, cacheKeys } from "@/lib/db/cache";
import type { RankingEntry } from "@/types";
import {
  errorResponse,
  successResponse,
  getQueryParam,
  getQueryParamInt,
  getCacheHeaders,
  getCurrentSeasonAndWeek,
} from "../_helpers";

export const dynamic = "force-dynamic";

type SortOption = "rating" | "rank" | "change" | "name";

export async function GET(req: NextRequest) {
  try {
    // Parse query parameters
    const { season: querySeason, week: queryWeek } = getCurrentSeasonAndWeek();
    const season = getQueryParamInt(req, "season", querySeason);
    const week = getQueryParamInt(req, "week", queryWeek);
    const level = getQueryParam(req, "level", "ALL");
    const conference = getQueryParam(req, "conference", "");
    const limit = Math.min(getQueryParamInt(req, "limit", 100), 500);
    const offset = getQueryParamInt(req, "offset", 0);
    const sort = (getQueryParam(req, "sort", "rating") as SortOption) || "rating";

    // Build cache key
    const cacheKey = `rankings:${season}:${week}:${level}:${conference}`;

    // Fetch rankings (cached)
    const { entries, total } = await cached(
      cacheKey,
      async () => {
        // Get ranking for this season/week
        // First get the season
        const sport = await prisma.sport.findUnique({
          where: { slug: "college-football" },
          select: { id: true },
        });

        if (!sport) {
          return { entries: [], total: 0 };
        }

        const seasonRecord = await prisma.season.findUnique({
          where: {
            sportId_year: {
              sportId: sport.id,
              year: season,
            },
          },
          select: { id: true },
        });

        if (!seasonRecord) {
          return { entries: [], total: 0 };
        }

        const ranking = await prisma.ranking.findFirst({
          where: {
            seasonId: seasonRecord.id,
            week: week,
          },
          select: {
            id: true,
            week: true,
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
                    level: {
                      select: { name: true },
                    },
                    conference: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        });

        if (!ranking) {
          return { entries: [], total: 0 };
        }

        // Transform to RankingEntry format
        let entries = ranking.teamRankings.map((tr): RankingEntry => ({
          rank: tr.rank ?? 0,
          teamId: tr.team.id,
          teamName: tr.team.name,
          teamAbbr: tr.team.abbreviation,
          logoUrl: tr.team.logoUrl,
          primaryColor: tr.team.primaryColor,
          level: (tr.team.level.name as any) || "FBS",
          conference: tr.team.conference?.name ?? null,
          rating: Number(tr.rating),
          ratingDeviation: 0, // TODO: fetch from team_ratings if available
          wins: tr.recordWins ?? null,
          losses: tr.recordLosses ?? null,
          recordDisplay:
            tr.recordWins !== null && tr.recordLosses !== null
              ? `${tr.recordWins}-${tr.recordLosses}`
              : "0-0",
          rankChange: 0, // TODO: calculate from previous week
          ratingChange: tr.ratingChange ? Number(tr.ratingChange) : null,
          offenseRating: tr.offenseRating ? Number(tr.offenseRating) : null,
          defenseRating: tr.defenseRating ? Number(tr.defenseRating) : null,
          sos: tr.sos ? Number(tr.sos) : null,
          playoffProbability: tr.playoffProbability
            ? Number(tr.playoffProbability)
            : null,
          sparkline: [], // TODO: populate from historical ratings
          trend: "flat" as const,
          percentile: 0, // TODO: calculate
          levelPercentile: 0, // TODO: calculate
          conferencePercentile: null, // TODO: calculate
          avgMarginOfVictory: null, // TODO: calculate from games
          gamesRemaining: 0, // TODO: calculate from schedule
          playoffSeed: null, // TODO: assign from playoff probabilities
        }));

        // Filter by level
        if (level !== "ALL") {
          entries = entries.filter((e) => e.level === level);
        }

        // Filter by conference
        if (conference) {
          entries = entries.filter(
            (e) => e.conference?.toLowerCase().includes(conference.toLowerCase())
          );
        }

        // Sort
        entries.sort((a, b) => {
          switch (sort) {
            case "rank":
              return (a.rank ?? Infinity) - (b.rank ?? Infinity);
            case "change":
              return (b.rankChange ?? 0) - (a.rankChange ?? 0);
            case "name":
              return a.teamName.localeCompare(b.teamName);
            case "rating":
            default:
              return b.rating - a.rating;
          }
        });

        return {
          entries,
          total: entries.length,
        };
      },
      CACHE_TTL.RANKINGS,
      {
        tags: [`season:${season}`, `week:${season}:${week}`],
      }
    );

    // Apply pagination
    const paginatedEntries = entries.slice(offset, offset + limit);
    const page = Math.floor(offset / limit);
    const pageSize = limit;

    const response = {
      rankings: paginatedEntries,
    };

    const meta = {
      total,
      page,
      pageSize,
      offset,
      season,
      week,
      level: level === "ALL" ? null : level,
      conference: conference || null,
      timestamp: new Date().toISOString(),
    };

    const headers = getCacheHeaders(CACHE_TTL.RANKINGS);

    return successResponse(response, meta);
  } catch (error) {
    console.error("[/api/rankings] Error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}
