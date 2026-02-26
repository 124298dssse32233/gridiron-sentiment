/**
 * Chaos Score Computation Script
 *
 * Computes chaos scores for all games in a given season/week using the 8-component
 * chaos engine. Stores results in ChaosGame table for display on Chaos Index page.
 *
 * Usage: npx tsx scripts/compute-chaos.ts [year] [week]
 *   - year: Season year (default: current year)
 *   - week: Specific week to compute, or 'all' for full season (default: all)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { calculateChaosScore, type ChaosInput } from "@/lib/chaos/chaos-score";

// Parse DATABASE_URL
const dbUrl = new URL(process.env.DATABASE_URL!);
const poolConfig = {
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 5432,
  database: dbUrl.pathname.slice(1),
  user: dbUrl.username,
  password: dbUrl.password,
};

const pool = new Pool(poolConfig);
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  log: ["error"],
});

// =============================================================================
// TYPES
// =============================================================================

interface ComputationOptions {
  year: number;
  week?: number | "all";
  verbose?: boolean;
}

// =============================================================================
// MAIN COMPUTATION
// =============================================================================

/**
 * Compute chaos scores for a given season/week
 */
async function computeChaosForSeason(
  options: ComputationOptions
): Promise<void> {
  const { year, week, verbose = false } = options;

  console.log(
    `\n🌪️  Computing Chaos Scores for ${year}${
      week !== undefined ? (week === "all" ? " (all weeks)" : ` week ${week}`) : ""
    }...\n`
  );

  const startTime = Date.now();

  // Get season
  const sport = await prisma.sport.findUnique({
    where: { slug: "college-football" },
  });

  if (!sport) {
    throw new Error("College Football sport not found");
  }

  const season = await prisma.season.findFirst({
    where: {
      sportId: sport.id,
      year,
    },
  });

  if (!season) {
    throw new Error(`Season ${year} not found`);
  }

  // Fetch completed games
  const games = await prisma.game.findMany({
    where: {
      seasonId: season.id,
      homeScore: { not: null },
      awayScore: { not: null },
      ...(week !== undefined && week !== "all" ? { week } : {}),
    },
    include: {
      homeTeam: {
        include: {
          level: true,
        },
      },
      awayTeam: {
        include: {
          level: true,
        },
      },
    },
    orderBy: [{ week: "asc" }, { gameDate: "asc" }],
  });

  console.log(`  Found ${games.length} completed games`);

  if (games.length === 0) {
    console.log("  No games to process.");
    return;
  }

  // Fetch team rankings for rating context
  const finalRanking = await prisma.ranking.findFirst({
    where: {
      seasonId: season.id,
      week: null,
    },
    include: {
      teamRankings: true,
    },
  });

  const teamRatings = new Map<
    number,
    { rank?: number; rating: number }
  >();
  if (finalRanking) {
    for (const tr of finalRanking.teamRankings) {
      teamRatings.set(tr.teamId, {
        rank: tr.rank ?? undefined,
        rating: Number(tr.rating),
      });
    }
  }

  // Compute chaos for each game
  let processedCount = 0;
  const chaosGames = [];

  for (const game of games) {
    if (game.homeScore === null || game.awayScore === null) {
      continue;
    }

    const homeRating = teamRatings.get(game.homeTeamId)?.rating ?? 1500;
    const awayRating = teamRatings.get(game.awayTeamId)?.rating ?? 1500;
    const homeRank = teamRatings.get(game.homeTeamId)?.rank;
    const awayRank = teamRatings.get(game.awayTeamId)?.rank;

    const chaosInput: ChaosInput = {
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      homePreGameWP: 0.5 + (homeRating - awayRating) / 1000, // Rough estimate
      homeRating,
      awayRating,
      homeRanked: homeRank !== null && homeRank <= 25,
      awayRanked: awayRank !== null && awayRank <= 25,
      isConferenceGame: game.isConferenceGame,
      isNeutralSite: game.isNeutralSite,
      isPostseason: game.isPostseason,
      // Note: advanced fields (excitement index, lead changes, etc.) would come from
      // play-by-play data if available. For now, using estimates from score/context.
      excitementIndex: undefined,
      wpCrosses50: undefined,
      leadChanges: Math.abs(game.homeScore - game.awayScore) <= 3 ? 2 : 0, // Estimate
      otPeriods: 0, // Would need to detect from metadata
    };

    try {
      const chaosResult = calculateChaosScore(chaosInput);

      chaosGames.push({
        gameId: game.id,
        seasonId: season.id,
        chaosScore: chaosResult.chaosScore,
        spreadBustFactor: chaosResult.components.upsetMagnitude,
        winProbVolatility: chaosResult.components.excitementIndex,
        upsetMagnitude: chaosResult.components.upsetMagnitude,
        excitementIndex: chaosResult.components.excitementIndex,
        contextWeight: chaosResult.components.contextMultiplier,
        postgameWpInversion: 0,
        winnerLowestWp: 0.5,
        wpCrosses50: chaosInput.wpCrosses50 ?? 0,
        tags: chaosResult.tags,
        headline: `${game.homeTeam.name} ${game.homeScore}-${game.awayScore} ${game.awayTeam.name}`,
        narrative: chaosResult.narrative,
        computedAt: new Date(),
      });

      processedCount++;

      if (verbose && (processedCount <= 5 || processedCount % 20 === 0)) {
        console.log(
          `  ${game.homeTeam.abbreviation} ${game.homeScore}-${game.awayScore} ${game.awayTeam.abbreviation}: chaos=${chaosResult.chaosScore.toFixed(1)} (${chaosResult.tier})`
        );
      }
    } catch (error) {
      console.warn(`  Failed to compute chaos for game ${game.id}:`, error);
    }
  }

  // Batch upsert into database
  console.log(`\n💾 Upserting ${chaosGames.length} chaos game records...`);

  for (const chaosGame of chaosGames) {
    await prisma.chaosGame.upsert({
      where: { gameId: chaosGame.gameId },
      update: {
        chaosScore: chaosGame.chaosScore,
        spreadBustFactor: chaosGame.spreadBustFactor,
        winProbVolatility: chaosGame.winProbVolatility,
        upsetMagnitude: chaosGame.upsetMagnitude,
        excitementIndex: chaosGame.excitementIndex,
        contextWeight: chaosGame.contextWeight,
        postgameWpInversion: chaosGame.postgameWpInversion,
        winnerLowestWp: chaosGame.winnerLowestWp,
        wpCrosses50: chaosGame.wpCrosses50,
        tags: chaosGame.tags,
        headline: chaosGame.headline,
        narrative: chaosGame.narrative,
        computedAt: chaosGame.computedAt,
      },
      create: chaosGame,
    });
  }

  // Print top chaotic games
  const topChaotic = chaosGames
    .sort((a, b) => b.chaosScore - a.chaosScore)
    .slice(0, 5);

  console.log("\n🏆 Top 5 Most Chaotic Games:");
  topChaotic.forEach((game, i) => {
    console.log(
      `  ${i + 1}. ${game.headline} (chaos=${game.chaosScore.toFixed(1)})`
    );
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n✅ Chaos computation complete! Processed ${processedCount} games in ${elapsed}s`
  );
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  const yearArg = args[0];
  const weekArg = args[1];
  const verbose = args.includes("--verbose") || args.includes("-v");

  const now = new Date();
  const currentSeason = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const year = yearArg ? parseInt(yearArg) : currentSeason;
  const week = weekArg === "all" ? "all" : weekArg ? parseInt(weekArg) : "all";

  if (isNaN(year)) {
    console.error("Invalid year argument");
    process.exit(1);
  }

  await computeChaosForSeason({ year, week, verbose });
}

main()
  .catch((error) => {
    console.error("Error computing chaos:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
