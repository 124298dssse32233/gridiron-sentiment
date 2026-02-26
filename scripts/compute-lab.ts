/**
 * The Lab Computation Script
 *
 * Detects player outliers and team anomalies for a given season.
 * Uses statistical Z-score analysis for players and Pythagorean luck analysis for teams.
 *
 * Usage: npx tsx scripts/compute-lab.ts [year]
 *   - year: Season year (default: current year)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  detectPlayerOutliers,
  type PlayerSeasonStats,
} from "@/lib/lab/player-outliers";
import {
  detectTeamAnomalies,
  calculatePythagoreanWins,
  type TeamSeasonProfile,
} from "@/lib/lab/team-anomalies";

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
  verbose?: boolean;
}

// =============================================================================
// MAIN COMPUTATION
// =============================================================================

/**
 * Compute player outliers and team anomalies for a season
 */
async function computeLabForSeason(
  options: ComputationOptions
): Promise<void> {
  const { year, verbose = false } = options;

  console.log(`\n🔬 Computing The Lab Analysis for ${year}...\n`);

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

  // ==========================================================================
  // PLAYER OUTLIERS
  // ==========================================================================

  console.log("📊 Detecting player outliers...");

  // Fetch all players for the season with basic stats
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
        },
      },
    },
  });

  console.log(`  Found ${players.length} players`);

  // Build player season stats (simplified from available data)
  const playerStats: PlayerSeasonStats[] = players.map((p) => ({
    playerId: p.id,
    playerName: p.name,
    team: p.currentTeam?.name ?? "Unknown",
    position: (p.position as any) ?? "OTHER",
    season: year,
    games: p.careerGames ?? 1,
    stats: {
      EPA: p.careerEpa ?? 0,
      "EPA/play": (p.careerEpa ?? 0) / Math.max(1, p.careerSnaps ?? 1),
      snaps: p.careerSnaps ?? 0,
      recruitRating: Number(p.recruitRating ?? 0),
    },
  }));

  // Run outlier detection
  try {
    const outlierReport = detectPlayerOutliers(playerStats, {
      method: "zscore",
      threshold: 2.0,
      minGames: 1,
    });

    console.log(
      `  Found ${outlierReport.outliers.length} player outliers (${outlierReport.elitePerformers.length} elite)`
    );

    // Upsert outliers into database
    for (const outlier of outlierReport.outliers) {
      await prisma.playerOutlier.upsert({
        where: {
          seasonId_playerName_teamId: {
            seasonId: season.id,
            playerName: outlier.player.playerName,
            teamId: outlier.player.playerId,
          },
        },
        update: {
          category: outlier.tier,
          zscore: outlier.compositeZScore,
          percentile: 50 + (outlier.compositeZScore / 4) * 50,
          detail: outlier.narrative,
          computedAt: new Date(),
        },
        create: {
          seasonId: season.id,
          playerName: outlier.player.playerName,
          teamId: outlier.player.playerId,
          position: outlier.player.position,
          category: outlier.tier,
          statLabel: outlier.statOutliers[0]?.stat,
          statValue: outlier.statOutliers[0]?.value,
          zscore: outlier.compositeZScore,
          percentile: 50 + (outlier.compositeZScore / 4) * 50,
          detail: outlier.narrative,
          computedAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.warn("  Warning: Player outlier detection skipped:", error);
  }

  // ==========================================================================
  // TEAM ANOMALIES
  // ==========================================================================

  console.log("\n🎯 Detecting team anomalies...");

  // Fetch all teams with their season records
  const teams = await prisma.team.findMany({
    include: {
      level: true,
      homeGames: {
        where: { seasonId: season.id },
      },
      awayGames: {
        where: { seasonId: season.id },
      },
    },
  });

  console.log(`  Found ${teams.length} teams`);

  // Build team season profiles
  const teamProfiles: TeamSeasonProfile[] = [];

  for (const team of teams) {
    const homeGames = team.homeGames;
    const awayGames = team.awayGames;

    let wins = 0,
      losses = 0;
    let pointsFor = 0,
      pointsAgainst = 0;
    const gameMargins: number[] = [];

    for (const game of homeGames) {
      if (game.homeScore !== null && game.awayScore !== null) {
        pointsFor += game.homeScore;
        pointsAgainst += game.awayScore;
        const margin = game.homeScore - game.awayScore;
        gameMargins.push(margin);
        if (game.homeScore > game.awayScore) wins++;
        else losses++;
      }
    }

    for (const game of awayGames) {
      if (game.homeScore !== null && game.awayScore !== null) {
        pointsFor += game.awayScore;
        pointsAgainst += game.homeScore;
        const margin = game.awayScore - game.homeScore;
        gameMargins.push(margin);
        if (game.awayScore > game.homeScore) wins++;
        else losses++;
      }
    }

    if (wins + losses === 0) continue;

    const closeGames = gameMargins.filter((m) => Math.abs(m) <= 7);
    const closeGameRecord = {
      wins: closeGames.filter((m) => m > 0).length,
      losses: closeGames.filter((m) => m < 0).length,
    };

    const profile: TeamSeasonProfile = {
      teamId: team.id,
      teamName: team.name,
      season: year,
      wins,
      losses,
      pointsFor,
      pointsAgainst,
      gameMargins,
      offenseEPA: pointsFor / Math.max(1, wins + losses) / 7,
      defenseEPA: pointsAgainst / Math.max(1, wins + losses) / 7,
      explosiveness: 0.5,
      fieldPosition: 0.5,
      finishingDrives: 0.5,
      turnoverMargin: 0,
      closeGameRecord,
      rating: 1500,
      level: team.level.name as any,
    };

    teamProfiles.push(profile);
  }

  // Run anomaly detection
  try {
    const anomalyReport = detectTeamAnomalies(teamProfiles);

    console.log(
      `  Found ${anomalyReport.topAnomalies.length} anomalous teams (${anomalyReport.luckyTeams.length} lucky, ${anomalyReport.unlockyTeams.length} unlucky)`
    );

    // Upsert anomalies into database
    for (const anomaly of anomalyReport.teams) {
      for (const flag of anomaly.anomalyFlags) {
        await prisma.teamAnomaly.upsert({
          where: {
            seasonId_teamId_category: {
              seasonId: season.id,
              teamId: anomaly.team.teamId,
              category: flag.type,
            },
          },
          update: {
            label: flag.description,
            description: flag.description,
            computedAt: new Date(),
          },
          create: {
            seasonId: season.id,
            teamId: anomaly.team.teamId,
            category: flag.type,
            label: flag.description,
            description: flag.description,
            computedAt: new Date(),
          },
        });
      }
    }
  } catch (error) {
    console.warn("  Warning: Team anomaly detection skipped:", error);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n✅ Lab analysis complete! Processed in ${elapsed}s`
  );
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  const yearArg = args[0];
  const verbose = args.includes("--verbose") || args.includes("-v");

  const now = new Date();
  const currentSeason = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const year = yearArg ? parseInt(yearArg) : currentSeason;

  if (isNaN(year)) {
    console.error("Invalid year argument");
    process.exit(1);
  }

  await computeLabForSeason({ year, verbose });
}

main()
  .catch((error) => {
    console.error("Error computing lab analysis:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
