/**
 * Award Prediction Computation Script
 *
 * Predicts award probabilities for all major college football awards
 * (Heisman, Maxwell, O'Brien, etc.) based on player stats and team success.
 *
 * Usage: npx tsx scripts/compute-awards.ts [year] [week]
 *   - year: Season year (default: current year)
 *   - week: Specific week for predictoin (default: final week)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  predictAllAwards,
  type AwardCandidate,
} from "@/lib/awards/prediction";

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
 * Compute award predictions for a given season/week
 */
async function computeAwardsForSeason(
  options: ComputationOptions
): Promise<void> {
  const { year, week, verbose = false } = options;

  console.log(
    `\n🏆 Computing Award Predictions for ${year}${week ? ` (Week ${week})` : ""}...\n`
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

  // Fetch all players with their teams and stats
  const players = await prisma.player.findMany({
    where: {
      currentTeam: {
        isNot: null,
      },
    },
    include: {
      currentTeam: {
        include: {
          level: true,
          conference: true,
          homeGames: {
            where: { seasonId: season.id },
          },
          awayGames: {
            where: { seasonId: season.id },
          },
        },
      },
    },
  });

  console.log(`  Found ${players.length} players`);

  // Build award candidates
  const candidates: AwardCandidate[] = [];

  for (const player of players) {
    if (!player.currentTeam) continue;

    // Calculate team record
    const homeGames = player.currentTeam.homeGames;
    const awayGames = player.currentTeam.awayGames;

    let wins = 0,
      losses = 0;

    for (const game of homeGames) {
      if (game.homeScore !== null && game.awayScore !== null) {
        if (game.homeScore > game.awayScore) wins++;
        else if (game.awayScore > game.homeScore) losses++;
      }
    }

    for (const game of awayGames) {
      if (game.homeScore !== null && game.awayScore !== null) {
        if (game.awayScore > game.homeScore) wins++;
        else if (game.homeScore > game.awayScore) losses++;
      }
    }

    // Get team ranking
    const teamRanking = await prisma.teamRanking.findFirst({
      where: {
        teamId: player.currentTeamId!,
        ranking: {
          seasonId: season.id,
          week: null,
        },
      },
      include: {
        ranking: true,
      },
    });

    const candidate: AwardCandidate = {
      playerId: String(player.id),
      playerName: player.name,
      position: player.position ?? "OTHER",
      team: player.currentTeam.name,
      teamSlug: player.currentTeam.slug,
      conference: player.currentTeam.conference?.name ?? "Independent",
      level: player.currentTeam.level.name,
      stats: {
        gamesPlayed: player.careerGames ?? 0,
        passingYards: undefined, // Would need detailed stats
        passingTDs: undefined,
        interceptions: undefined,
        passerRating: undefined,
        completionPct: undefined,
        rushingYards: undefined,
        rushingTDs: undefined,
        yardsPerCarry: undefined,
        fumbles: undefined,
        receivingYards: undefined,
        receivingTDs: undefined,
        receptions: undefined,
        yardsPerCatch: undefined,
        tackles: undefined,
        sacks: undefined,
        interceptionsDef: undefined,
        tacklesForLoss: undefined,
        forcedFumbles: undefined,
        passesDefended: undefined,
        allPurposeYards: undefined,
        totalTDs: undefined,
      },
      teamRecord: { wins, losses },
      teamRank: teamRanking?.rank ?? undefined,
    };

    candidates.push(candidate);
  }

  console.log(`  Built ${candidates.length} award candidates`);

  if (candidates.length === 0) {
    console.log("  No candidates to evaluate.");
    return;
  }

  // Predict all awards
  const predictions = predictAllAwards(candidates);

  console.log(`  Predicted all 10 awards\n`);

  // Upsert predictions into database
  let upsertedCount = 0;

  for (const prediction of predictions) {
    for (const candidate of prediction.candidates) {
      await prisma.awardCandidate.upsert({
        where: {
          seasonId_awardName_playerId: {
            seasonId: season.id,
            awardName: prediction.award,
            playerId: parseInt(candidate.playerId) || 0,
          },
        },
        update: {
          probability: candidate.probability,
          rank: candidate.rank,
          statisticalScore: candidate.probability * 100,
          computedAt: new Date(),
        },
        create: {
          seasonId: season.id,
          awardName: prediction.award,
          playerId: parseInt(candidate.playerId) || 0,
          teamId: undefined,
          probability: candidate.probability,
          rank: candidate.rank,
          statisticalScore: candidate.probability * 100,
          computedAt: new Date(),
        },
      });
      upsertedCount++;
    }
  }

  // Print leaders for major awards
  console.log("🏅 Award Leaders:");
  const heisman = predictions.find((p) => p.award === "heisman");
  if (heisman && heisman.candidates.length > 0) {
    const leader = heisman.candidates[0];
    console.log(
      `  Heisman: ${leader.playerName} (${(leader.probability * 100).toFixed(1)}%)`
    );
  }

  const maxwell = predictions.find((p) => p.award === "maxwell");
  if (maxwell && maxwell.candidates.length > 0) {
    const leader = maxwell.candidates[0];
    console.log(
      `  Maxwell: ${leader.playerName} (${(leader.probability * 100).toFixed(1)}%)`
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n✅ Award predictions complete! Upserted ${upsertedCount} records in ${elapsed}s`
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

  await computeAwardsForSeason({ year, week: weekNum, verbose });
}

main()
  .catch((error) => {
    console.error("Error computing awards:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
