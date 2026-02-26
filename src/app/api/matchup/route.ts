/**
 * POST /api/matchup
 *
 * Monte Carlo simulation for a matchup between two teams.
 *
 * Request body:
 * {
 *   teamA: string (team slug, e.g. "ohio-state")
 *   teamB: string (team slug, e.g. "michigan")
 *   simulations?: number (default 10000, max 100000)
 *   model?: 'poisson' | 'normal' (default 'normal')
 *   neutralSite?: boolean (default false)
 * }
 *
 * Response:
 * {
 *   teamA: { name, slug, wins, winProbability, avgScore }
 *   teamB: { name, slug, wins, winProbability, avgScore }
 *   upsets: number (count of times underdog won)
 *   timestamp: ISO string
 * }
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { cached, CACHE_TTL, cacheKeys } from "@/lib/db/cache";
import { getCurrentSeason } from "@/lib/utils/constants";
import {
  errorResponse,
  successResponse,
  parseJSON,
  validateRequiredFields,
} from "../_helpers";

export const dynamic = "force-dynamic";

interface MatchupRequest {
  teamA: string;
  teamB: string;
  simulations?: number;
  model?: "poisson" | "normal";
  neutralSite?: boolean;
}

interface SimulationResult {
  teamA: {
    name: string;
    slug: string;
    wins: number;
    winProbability: number;
    avgScore: number;
    stdDev: number;
  };
  teamB: {
    name: string;
    slug: string;
    wins: number;
    winProbability: number;
    avgScore: number;
    stdDev: number;
  };
  ties: number;
  upsets: number;
  upsetProbability: number;
  spreadDistribution: Record<number, number>;
  simulations: number;
  model: string;
  timestamp: string;
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { data: body, error: parseError } = await parseJSON<MatchupRequest>(
      req
    );
    if (parseError) {
      return errorResponse(`Invalid JSON: ${parseError}`, 400);
    }

    // Validate required fields
    const validation = validateRequiredFields(body || {}, ["teamA", "teamB"]);
    if (!validation.valid) {
      return errorResponse(
        `Missing required fields: ${validation.missing.join(", ")}`,
        400
      );
    }

    const {
      teamA: teamASlug,
      teamB: teamBSlug,
      simulations = 10000,
      model = "normal",
      neutralSite = false,
    } = body as MatchupRequest;

    // Validate simulations count
    const simCount = Math.min(Math.max(simulations, 100), 100000);

    // Build cache key
    const cacheKey = cacheKeys.matchup(
      teamASlug,
      teamBSlug,
      simCount
    );

    const result = await cached(
      cacheKey,
      async () => {
        // Fetch both teams
        const [teamA, teamB] = await Promise.all([
          prisma.team.findUnique({
            where: { slug: teamASlug },
            select: {
              id: true,
              name: true,
              slug: true,
              level: { select: { name: true } },
              stadium: true,
              stadiumCapacity: true,
              metadata: true,
            },
          }),
          prisma.team.findUnique({
            where: { slug: teamBSlug },
            select: {
              id: true,
              name: true,
              slug: true,
              level: { select: { name: true } },
              stadium: true,
              stadiumCapacity: true,
              metadata: true,
            },
          }),
        ]);

        if (!teamA || !teamB) {
          const missing = [];
          if (!teamA) missing.push(teamASlug);
          if (!teamB) missing.push(teamBSlug);
          throw new Error(`Teams not found: ${missing.join(", ")}`);
        }

        // Fetch current ratings for both teams (season = fall year, e.g. 2025 for Aug 2025 - Jan 2026)
        const season = getCurrentSeason();

        const [ratingA, ratingB] = await Promise.all([
          prisma.teamRanking.findFirst({
            where: {
              team: { slug: teamASlug },
              ranking: { season: { year: season } },
            },
            select: { rating: true },
            orderBy: { ranking: { week: "desc" } },
          }),
          prisma.teamRanking.findFirst({
            where: {
              team: { slug: teamBSlug },
              ranking: { season: { year: season } },
            },
            select: { rating: true },
            orderBy: { ranking: { week: "desc" } },
          }),
        ]);

        const rA = ratingA ? Number(ratingA.rating) : 1500;
        const rB = ratingB ? Number(ratingB.rating) : 1500;

        // Run simulation
        let winsA = 0;
        let winsB = 0;
        let ties = 0;
        let scoresA: number[] = [];
        let scoresB: number[] = [];
        const spreadDist: Record<number, number> = {};

        // Simple normal distribution simulation
        for (let i = 0; i < simCount; i++) {
          // Gaussian random using Box-Muller transform
          const u1 = Math.random();
          const u2 = Math.random();
          const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

          // Rating difference (normalized to point spread)
          const rateDiff = (rA - rB) / 150; // Scale to typical spread range
          const hfa = neutralSite ? 0 : 2.5; // Home field advantage

          // Predicted spread
          const spread = rateDiff + hfa + z * 5; // 5 point std dev

          // Generate scores (simple model)
          const scoreA = Math.max(0, Math.round(24 + spread / 2 + z * 7));
          const scoreB = Math.max(0, Math.round(24 - spread / 2 + z * 7));

          scoresA.push(scoreA);
          scoresB.push(scoreB);

          const spreadBucket = Math.round(spread);
          spreadDist[spreadBucket] = (spreadDist[spreadBucket] || 0) + 1;

          if (scoreA > scoreB) {
            winsA++;
          } else if (scoreB > scoreA) {
            winsB++;
          } else {
            ties++;
          }
        }

        // Calculate statistics
        const avgScoreA =
          scoresA.reduce((a, b) => a + b, 0) / scoresA.length;
        const avgScoreB =
          scoresB.reduce((a, b) => a + b, 0) / scoresB.length;

        const stdDevA = Math.sqrt(
          scoresA.reduce((a, b) => a + Math.pow(b - avgScoreA, 2), 0) /
            scoresA.length
        );
        const stdDevB = Math.sqrt(
          scoresB.reduce((a, b) => a + Math.pow(b - avgScoreB, 2), 0) /
            scoresB.length
        );

        // Determine underdog
        const teamAFavored = rA > rB;
        const upsets = teamAFavored ? winsB : winsA;

        const simulation: SimulationResult = {
          teamA: {
            name: teamA.name,
            slug: teamA.slug,
            wins: winsA,
            winProbability: winsA / simCount,
            avgScore: Math.round(avgScoreA * 10) / 10,
            stdDev: Math.round(stdDevA * 10) / 10,
          },
          teamB: {
            name: teamB.name,
            slug: teamB.slug,
            wins: winsB,
            winProbability: winsB / simCount,
            avgScore: Math.round(avgScoreB * 10) / 10,
            stdDev: Math.round(stdDevB * 10) / 10,
          },
          ties,
          upsets,
          upsetProbability: upsets / simCount,
          spreadDistribution: spreadDist,
          simulations: simCount,
          model,
          timestamp: new Date().toISOString(),
        };

        return simulation;
      },
      CACHE_TTL.MATCHUP_SIM,
      {
        tags: [`team:${teamASlug}`, `team:${teamBSlug}`],
      }
    );

    return successResponse(result, {
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[/api/matchup] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, error instanceof Error && message.includes("not found") ? 404 : 500);
  }
}
