/**
 * Game Predictions Computation Script
 *
 * Generates pre-game win probability predictions for upcoming games
 * using GridRank ratings and the logistic regression WP model.
 *
 * Usage: npx tsx scripts/compute-predictions.ts [year] [week]
 *   - year: Season year (default: current year)
 *   - week: Specific week to predict (default: next unplayed week)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { pregameWinProbability } from "@/lib/win-probability/model";

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
  week?: number;
  verbose?: boolean;
}

// =============================================================================
// MAIN COMPUTATION
// =============================================================================

/**
 * Compute game predictions for a season/week
 */
async function computePredictionsForWeek(
  options: ComputationOptions
): Promise<void> {
  const { year, week, verbose = false } = options;

  console.log(
    `\n🔮 Computing Game Predictions for ${year}${week ? ` (Week ${week})` : ""}...\n`
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

  // Determine which week to predict
  let targetWeek = week;

  if (!targetWeek) {
    // Find first week with unplayed games
    const unplayedGames = await prisma.game.findFirst({
      where: {
        seasonId: season.id,
        homeScore: null,
        awayScore: null,
      },
      orderBy: { week: "asc" },
    });

    if (unplayedGames) {
      targetWeek = unplayedGames.week ?? 1;
    } else {
      console.log("  All games have been played.");
      return;
    }
  }

  // Fetch unplayed games for the target week
  const games = await prisma.game.findMany({
    where: {
      seasonId: season.id,
      week: targetWeek,
      homeScore: null,
      awayScore: null,
    },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  console.log(`  Found ${games.length} unplayed games in week ${targetWeek}`);

  if (games.length === 0) {
    console.log("  No unplayed games for this week.");
    return;
  }

  // Get latest ranking for both teams
  const latestRanking = await prisma.ranking.findFirst({
    where: {
      seasonId: season.id,
      week: null,
    },
    include: {
      teamRankings: true,
    },
  });

  const teamRatings = new Map<number, { rating: number; rd: number }>();
  if (latestRanking) {
    for (const tr of latestRanking.teamRankings) {
      teamRatings.set(tr.teamId, {
        rating: Number(tr.rating),
        rd: 50, // Default RD
      });
    }
  }

  // Compute predictions
  let processedCount = 0;
  const predictions: Array<{
    gameId: number;
    homeWP: number;
    awayWP: number;
    spread: number;
  }> = [];

  for (const game of games) {
    const homeRating = teamRatings.get(game.homeTeamId)?.rating ?? 1500;
    const awayRating = teamRatings.get(game.awayTeamId)?.rating ?? 1500;
    const homeRD = teamRatings.get(game.homeTeamId)?.rd ?? 50;
    const awayRD = teamRatings.get(game.awayTeamId)?.rd ?? 50;

    const wpResult = pregameWinProbability(
      homeRating,
      awayRating,
      homeRD,
      awayRD,
      game.isNeutralSite
    );

    predictions.push({
      gameId: game.id,
      homeWP: wpResult.homeWP,
      awayWP: wpResult.awayWP,
      spread: wpResult.spreadEquivalent,
    });

    processedCount++;

    if (verbose) {
      console.log(
        `  ${game.homeTeam.abbreviation} vs ${game.awayTeam.abbreviation}: ` +
        `Home WP=${(wpResult.homeWP * 100).toFixed(1)}% (spread=${wpResult.spreadEquivalent.toFixed(1)})`
      );
    }
  }

  // Store predictions in game metadata
  console.log(`\n💾 Storing ${predictions.length} predictions...`);

  for (const prediction of predictions) {
    await prisma.game.update({
      where: { id: prediction.gameId },
      data: {
        homeWinProb: prediction.homeWP,
        spread: prediction.spread,
      },
    });
  }

  // Identify interesting matchups
  console.log("\n⚡ Interesting Matchups:");

  const tossups = predictions.filter(
    (p) => Math.abs(p.homeWP - 0.5) < 0.05
  );
  if (tossups.length > 0) {
    for (const tossup of tossups.slice(0, 3)) {
      const game = games.find((g) => g.id === tossup.gameId);
      if (game) {
        console.log(
          `  TOSSUP: ${game.homeTeam.abbreviation} vs ${game.awayTeam.abbreviation} (${(tossup.homeWP * 100).toFixed(1)}%)`
        );
      }
    }
  }

  const largeUpsets = predictions.filter(
    (p) => p.homeWP < 0.3 || p.homeWP > 0.7
  );
  if (largeUpsets.length > 0) {
    const biggest = largeUpsets.reduce((prev, current) =>
      Math.abs(current.homeWP - 0.5) > Math.abs(prev.homeWP - 0.5)
        ? current
        : prev
    );
    const game = games.find((g) => g.id === biggest.gameId);
    if (game) {
      const favored = biggest.homeWP > 0.5 ? "Home" : "Away";
      const odds = (
        biggest.homeWP > 0.5 ? biggest.homeWP : 1 - biggest.homeWP
      ) * 100;
      console.log(
        `  BIGGEST MISMATCH: ${game.homeTeam.abbreviation} vs ${game.awayTeam.abbreviation} ` +
        `(${favored} favored ${odds.toFixed(0)}%)`
      );
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n✅ Predictions complete! Processed ${processedCount} games in ${elapsed}s`
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
  const weekNum = weekArg ? parseInt(weekArg) : undefined;

  if (isNaN(year)) {
    console.error("Invalid year argument");
    process.exit(1);
  }

  await computePredictionsForWeek({ year, week: weekNum, verbose });
}

main()
  .catch((error) => {
    console.error("Error computing predictions:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
