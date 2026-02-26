/**
 * GET /api/teams
 *
 * Returns list of teams with search and filtering.
 *
 * Query parameters:
 * - q: string (search by name, abbreviation, slug)
 * - level: string (FBS, FCS, D2, D3, NAIA)
 * - conference: string (filter by conference slug)
 * - limit: number (default 50, max 200)
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { cached, CACHE_TTL } from "@/lib/db/cache";
import type { TeamSummary } from "@/types";
import {
  errorResponse,
  successResponse,
  getQueryParam,
  getQueryParamInt,
} from "../_helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = getQueryParam(req, "q", "").toLowerCase();
    const level = getQueryParam(req, "level", "");
    const conference = getQueryParam(req, "conference", "");
    const limit = Math.min(getQueryParamInt(req, "limit", 50), 200);

    // Build cache key
    const cacheKey = `teams:search:${q}:${level}:${conference}:${limit}`;

    const { teams, total } = await cached(
      cacheKey,
      async () => {
        const where: Record<string, any> = {};

        // Search query
        if (q) {
          where.OR = [
            { name: { contains: q, mode: "insensitive" } },
            { abbreviation: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { mascot: { contains: q, mode: "insensitive" } },
          ];
        }

        // Level filter
        if (level) {
          const levelRecord = await prisma.level.findFirst({
            where: { name: level },
            select: { id: true },
          });
          if (levelRecord) {
            where.levelId = levelRecord.id;
          }
        }

        // Conference filter
        if (conference) {
          const confRecord = await prisma.conference.findFirst({
            where: { slug: conference },
            select: { id: true },
          });
          if (confRecord) {
            where.conferenceId = confRecord.id;
          }
        }

        const [teams, total] = await Promise.all([
          prisma.team.findMany({
            where,
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
            take: limit,
            orderBy: { name: "asc" },
          }),
          prisma.team.count({ where }),
        ]);

        const summaries: TeamSummary[] = teams.map((t) => ({
          id: t.id,
          name: t.name,
          abbreviation: t.abbreviation,
          slug: t.slug,
          logoUrl: t.logoUrl,
          level: (t.level.name as any) || "FBS",
          conference: t.conference?.name ?? null,
          primaryColor: t.primaryColor,
        }));

        return { teams: summaries, total };
      },
      CACHE_TTL.SEARCH_INDEX,
      {
        tags: ["team"],
      }
    );

    const response = {
      teams,
    };

    const meta = {
      total,
      returned: teams.length,
      query: q || null,
      timestamp: new Date().toISOString(),
    };

    return successResponse(response, meta);
  } catch (error) {
    console.error("[/api/teams] Error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}
