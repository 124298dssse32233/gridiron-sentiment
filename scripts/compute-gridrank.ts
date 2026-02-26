/**
 * GridRank Computation Script
 *
 * Computes GridRank ratings for a given season using:
 * 1. Preseason priors (from previous year, recruiting, returning production)
 * 2. Game-by-game updates using Glicko-2 hybrid with MOV
 * 3. Dynamic home field advantage
 * 4. Garbage time filtering
 * 5. Cross-level adjustments
 *
 * Usage: npm run compute:gridrank [year] [week]
 *   - year: Season year (default: current year)
 *   - week: Specific week to compute, or 'all' for full season (default: all)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  updateRatings,
  initializeRating,
  formatRating,
  type TeamRating,
  type GameResult,
} from "@/lib/gridrank/engine";
import { calculatePreseasonPriors, getPriorWeight } from "@/lib/gridrank/preseason";
import {
  calculateHomeFieldAdvantage,
  getTeamElevations,
} from "@/lib/gridrank/home-field";
import {
  detectGarbageTime,
  type QuarterScores,
} from "@/lib/gridrank/garbage-time";

// Parse DATABASE_URL
const dbUrl = new URL(process.env.DATABASE_URL!);
const poolConfig = {
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 5432,
  database: dbUrl.pathname.slice(1),
  user: dbUrl.username,
  password: dbUrl.password,
};

// Create connection pool for Prisma
const pool = new Pool(poolConfig);

// Create Prisma client with PostgreSQL adapter
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
  recomputePriors?: boolean;
  verbose?: boolean;
}

interface RatingSnapshot {
  teamId: number;
  week: number;
  rating: number;
  rd: number;
  rank?: number;
  previousRank?: number;
  ratingChange?: number;
}

// =============================================================================
// MAIN COMPUTATION
// =============================================================================

/**
 * Compute GridRank for a single season
 */
async function computeGridRankForSeason(
  options: ComputationOptions
): Promise<void> {
  const { year, week, recomputePriors = false, verbose = false } = options;

  console.log(`🏈 Computing GridRank for ${year}${week !== undefined ? (week === "all" ? " (all weeks)" : ` week ${week}`) : ""}`);

  // Get or create season
  const sport = await prisma.sport.findUnique({
    where: { slug: "college-football" },
  });

  if (!sport) {
    throw new Error("College Football sport not found");
  }

  const season = await prisma.season.upsert({
    where: {
      sportId_year: {
        sportId: sport.id,
        year,
      },
    },
    update: {},
    create: {
      sportId: sport.id,
      year,
    },
  });

  const seasonId = season.id;

  // Get all teams with their levels
  const teams = await prisma.team.findMany({
    include: {
      level: true,
    },
  });

  console.log(`  Found ${teams.length} teams`);

  // Initialize or load ratings
  const ratings = new Map<number, TeamRating>();

  // Get previous season's final ratings for continuity
  const previousSeason = await prisma.season.findFirst({
    where: {
      sportId: sport.id,
      year: year - 1,
    },
  });

  let previousFinalRatings = new Map<number, { rating: number; rd: number }>();

  if (previousSeason && !recomputePriors) {
    const finalRankings = await prisma.ranking.findFirst({
      where: {
        seasonId: previousSeason.id,
        week: null,
      },
      include: {
        teamRankings: {
          include: {
            team: true,
          },
        },
      },
    });

    if (finalRankings) {
      for (const tr of finalRankings.teamRankings) {
        previousFinalRatings.set(tr.teamId, {
          rating: Number(tr.rating),
          rd: 100, // Carryover RD is lower (more certain)
        });
      }

      if (verbose) {
        console.log(`  Loaded ${previousFinalRatings.size} ratings from ${year - 1}`);
      }
    }
  }

  // Calculate preseason priors
  console.log("\n📊 Calculating preseason priors...");
  const priors = await calculatePreseasonPriors(prisma, year);

  // Initialize ratings with priors
  for (const team of teams) {
    const prior = priors.get(team.id);
    const previous = previousFinalRatings.get(team.id);
    const initial = initializeRating(
      team.level.name as "FBS" | "FCS" | "D2" | "D3" | "NAIA"
    );

    if (previous) {
      // Use previous season's rating with regression
      ratings.set(team.id, {
        teamId: team.id,
        mu: previous.rating * 0.7 + initial.mu * 0.3,
        rd: initial.rd * 0.8, // Reduce uncertainty for returning teams
        sigma: initial.sigma,
        level: team.level.name as "FBS" | "FCS" | "D2" | "D3" | "NAIA",
      });
    } else if (prior) {
      // Use calculated preseason prior
      ratings.set(team.id, {
        teamId: team.id,
        mu: prior.priorRating,
        rd: prior.priorRD,
        sigma: 0.06,
        level: team.level.name as "FBS" | "FCS" | "D2" | "D3" | "NAIA",
      });
    } else {
      // New team - use level initial
      ratings.set(team.id, { ...initial, teamId: team.id });
    }
  }

  // Get games for the season
  const games = await prisma.game.findMany({
    where: {
      seasonId,
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
    orderBy: [
      { week: "asc" },
      { gameDate: "asc" },
    ],
  });

  console.log(`  Found ${games.length} games`);

  if (games.length === 0) {
    console.log("  No games to process. Saving initial ratings...");

    // Save preseason rankings
    await saveRankings(
      prisma,
      sport.id,
      seasonId,
      0,
      ratings,
      new Map<number, RatingSnapshot>()
    );

    return;
  }

  // Get team elevations for HFA calculation
  const elevations = await getTeamElevations(prisma);

  // Track ratings by week for historical comparison
  const weeklySnapshots = new Map<number, Map<number, RatingSnapshot>>();

  // Process games week by week
  let currentWeek = 0;
  const gamesByWeek = new Map<number, typeof games>();

  for (const game of games) {
    const w = game.week ?? 0;
    if (!gamesByWeek.has(w)) {
      gamesByWeek.set(w, []);
    }
    gamesByWeek.get(w)!.push(game);
  }

  for (const [weekNum, weekGames] of gamesByWeek.entries()) {
    console.log(`\n📅 Week ${weekNum} (${weekGames.length} games)`);

    const priorWeight = getPriorWeight(weekNum);

    for (const game of weekGames) {
      const homeRating = ratings.get(game.homeTeamId);
      const awayRating = ratings.get(game.awayTeamId);

      if (!homeRating || !awayRating) {
        if (verbose) {
          console.log(`  ⚠️  Missing rating for game ${game.id}`);
        }
        continue;
      }

      // Only process played games
      if (game.homeScore === null || game.awayScore === null) {
        if (verbose) {
          console.log(`  ⏭️  Skipping unplayed game: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
        }
        continue;
      }

      // Build game result
      const gameResult: GameResult = {
        homeRating,
        awayRating,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        isNeutralSite: game.isNeutralSite,
        isPostseason: game.isPostseason,
        homeLineScores: (game.metadata as { home_line_scores?: number[] })?.home_line_scores,
        awayLineScores: (game.metadata as { away_line_scores?: number[] })?.away_line_scores,
        stadium: {
          elevation: elevations.get(game.homeTeamId),
          capacity: game.homeTeam.stadiumCapacity ?? undefined,
          dome: (game.homeTeam.metadata as { venue?: { dome?: boolean } })?.venue?.dome,
        },
      };

      // Update ratings
      const update = updateRatings(homeRating, awayRating, gameResult);

      // Apply prior weight (blend with preseason)
      const homePrior = priors.get(game.homeTeamId);
      const awayPrior = priors.get(game.awayTeamId);

      if (homePrior && weekNum <= 12) {
        const blendedMu =
          update.homeRating.mu * (1 - priorWeight) +
          homePrior.priorRating * priorWeight;
        update.homeRating.mu = blendedMu;
      }

      if (awayPrior && weekNum <= 12) {
        const blendedMu =
          update.awayRating.mu * (1 - priorWeight) +
          awayPrior.priorRating * priorWeight;
        update.awayRating.mu = blendedMu;
      }

      // Save updated ratings
      ratings.set(game.homeTeamId, update.homeRating);
      ratings.set(game.awayTeamId, update.awayRating);

      if (verbose && (weekNum <= 3 || game.id % 50 === 0)) {
        console.log(
          `  ${game.homeTeam.name} ${game.homeScore} - ${game.awayScore} ${game.awayTeam.name} ` +
          `(${homeRating.mu.toFixed(0)} → ${update.homeRating.mu.toFixed(0)})`
        );
      }
    }

    // Save weekly snapshot
    const snapshot = new Map<number, RatingSnapshot>();
    for (const [teamId, rating] of ratings.entries()) {
      snapshot.set(teamId, {
        teamId,
        week: weekNum,
        rating: rating.mu,
        rd: rating.rd,
      });
    }
    weeklySnapshots.set(weekNum, snapshot);

    // Calculate and print top 10 for the week
    const sorted = Array.from(ratings.entries())
      .map(([teamId, rating]) => ({ teamId, rating }))
      .sort((a, b) => b.rating.mu - a.rating.mu);

    console.log(
      `  Top 5: ${sorted.slice(0, 5).map((s, i) => {
        const team = teams.find((t) => t.id === s.teamId);
        return `${i + 1}. ${team?.abbreviation ?? "?"} (${s.rating.mu.toFixed(0)})`;
      }).join(", ")}`
    );

    currentWeek = weekNum;
  }

  // Save all weekly rankings
  console.log("\n💾 Saving rankings to database...");

  for (const [weekNum, snapshot] of weeklySnapshots) {
    await saveRankings(prisma, sport.id, seasonId, weekNum, ratings, snapshot);
  }

  // Also save final ranking (week = null)
  await saveRankings(prisma, sport.id, seasonId, null, ratings, new Map());

  console.log("\n✅ GridRank computation complete!");
  console.log(`   Processed ${games.length} games across ${gamesByWeek.size} weeks`);
  console.log(`   Generated ${weeklySnapshots.size + 1} ranking snapshots`);
}

/**
 * Save rankings to database
 */
async function saveRankings(
  prisma: PrismaClient,
  sportId: number,
  seasonId: number,
  week: number | null,
  currentRatings: Map<number, TeamRating>,
  previousSnapshot: Map<number, RatingSnapshot>
): Promise<void> {
  // Get or create ranking record
  const ranking = await prisma.ranking.upsert({
    where: {
      seasonId_week: {
        seasonId,
        week: week ?? 0,
      },
    },
    update: {
      computedAt: new Date(),
    },
    create: {
      sportId,
      seasonId,
      week: week ?? 0,
      computedAt: new Date(),
    },
  });

  // Sort teams by rating
  const sorted = Array.from(currentRatings.entries())
    .map(([teamId, rating]) => ({ teamId, rating }))
    .sort((a, b) => b.rating.mu - a.rating.mu);

  // Assign ranks
  const ranks = new Map<number, number>();
  sorted.forEach(({ teamId }, index) => {
    ranks.set(teamId, index + 1);
  });

  // Upsert team rankings
  for (const { teamId, rating } of sorted) {
    const previous = previousSnapshot.get(teamId);
    const rank = ranks.get(teamId)!;
    const previousRank = previous?.rank;
    const ratingChange = previous ? rating.mu - previous.rating : 0;

    await prisma.teamRanking.upsert({
      where: {
        rankingId_teamId: {
          rankingId: ranking.id,
          teamId,
        },
      },
      update: {
        rank,
        rating: rating.mu,
        ratingChange,
        previousRank,
        offenseRating: rating.mu,
        defenseRating: 1500 - (rating.mu - 1500), // Symmetric defense rating
      },
      create: {
        rankingId: ranking.id,
        teamId,
        rank,
        rating: rating.mu,
        ratingChange,
        previousRank,
        offenseRating: rating.mu,
        defenseRating: 1500 - (rating.mu - 1500),
      },
    });
  }
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  const yearArg = args[0];
  const weekArg = args[1];
  const recomputePriors = args.includes("--recompute-priors");
  const verbose = args.includes("--verbose") || args.includes("-v");

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Default to current season if after July, otherwise previous year
  const defaultYear = currentMonth >= 7 ? currentYear : currentYear - 1;

  const year = yearArg ? parseInt(yearArg) : defaultYear;
  const week = weekArg === "all" ? "all" : weekArg ? parseInt(weekArg) : "all";

  if (isNaN(year)) {
    console.error("Invalid year argument");
    process.exit(1);
  }

  const options: ComputationOptions = {
    year,
    week,
    recomputePriors,
    verbose,
  };

  await computeGridRankForSeason(options);
}

main()
  .catch((error) => {
    console.error("Error computing GridRank:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
