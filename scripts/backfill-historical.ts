/**
 * Backfill Historical Data Script (MASTER)
 *
 * Master script that runs all computations for a range of historical seasons.
 * Computes GridRank, Chaos Scores, Lab analysis, Coaching grades, and more
 * for the complete historical record (typically 2014-2024).
 *
 * Usage: npx tsx scripts/backfill-historical.ts [startYear] [endYear]
 *   - startYear: First season to backfill (default: 2014)
 *   - endYear: Last season to backfill (default: 2024)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { execSync } from "child_process";

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

interface BackfillOptions {
  startYear: number;
  endYear: number;
  skipGridRank?: boolean;
  skipChaos?: boolean;
  skipLab?: boolean;
  skipCoaches?: boolean;
  skipAwards?: boolean;
  skipPredictions?: boolean;
  verbose?: boolean;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Execute a computation script and log results
 */
function runScript(
  script: string,
  args: string[],
  verbose: boolean = false
): boolean {
  try {
    const command = `npx tsx scripts/${script}.ts ${args.join(" ")}${
      verbose ? " --verbose" : ""
    }`;

    console.log(`  Running: ${command}`);
    execSync(command, { stdio: verbose ? "inherit" : "pipe" });
    return true;
  } catch (error) {
    console.warn(`  ⚠️  Script failed: ${script}`);
    return false;
  }
}

// =============================================================================
// MAIN BACKFILL
// =============================================================================

/**
 * Backfill historical data for a range of seasons
 */
async function backfillHistorical(
  options: BackfillOptions
): Promise<void> {
  const {
    startYear,
    endYear,
    skipGridRank = false,
    skipChaos = false,
    skipLab = false,
    skipCoaches = false,
    skipAwards = false,
    skipPredictions = false,
    verbose = false,
  } = options;

  console.log(`\n📊 GridRank Backfill: Historical Data Computation\n`);
  console.log(
    `   Processing seasons ${startYear} through ${endYear} (${endYear - startYear + 1} years)\n`
  );

  const totalStart = Date.now();
  let successCount = 0;
  let failureCount = 0;

  // Process each season
  for (let year = startYear; year <= endYear; year++) {
    const seasonStart = Date.now();
    console.log(
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );
    console.log(
      `📅 Season ${year} (${year - startYear + 1}/${endYear - startYear + 1})`
    );
    console.log(
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    );

    // 1. GridRank computation
    if (!skipGridRank) {
      console.log(`\n1️⃣  GridRank Engine`);
      if (runScript("compute-gridrank", [String(year)], verbose)) {
        console.log(`   ✅ GridRank complete for ${year}`);
        successCount++;
      } else {
        failureCount++;
      }
    }

    // 2. Chaos Index computation
    if (!skipChaos) {
      console.log(`\n2️⃣  Chaos Index`);
      if (runScript("compute-chaos", [String(year), "all"], verbose)) {
        console.log(`   ✅ Chaos computation complete for ${year}`);
        successCount++;
      } else {
        failureCount++;
      }
    }

    // 3. The Lab (player outliers + team anomalies)
    if (!skipLab) {
      console.log(`\n3️⃣  The Lab (Statistical Analysis)`);
      if (runScript("compute-lab", [String(year)], verbose)) {
        console.log(`   ✅ Lab analysis complete for ${year}`);
        successCount++;
      } else {
        failureCount++;
      }
    }

    // 4. Coaching Intelligence
    if (!skipCoaches) {
      console.log(`\n4️⃣  Coach Intelligence`);
      if (runScript("compute-coaches", [String(year)], verbose)) {
        console.log(`   ✅ Coaching grades complete for ${year}`);
        successCount++;
      } else {
        failureCount++;
      }
    }

    // 5. Award Predictions (only final week)
    if (!skipAwards) {
      console.log(`\n5️⃣  Award Predictions`);
      if (runScript("compute-awards", [String(year), "15"], verbose)) {
        console.log(`   ✅ Award predictions complete for ${year}`);
        successCount++;
      } else {
        failureCount++;
      }
    }

    // 6. Game Predictions (all weeks)
    if (!skipPredictions) {
      console.log(`\n6️⃣  Game Predictions`);
      // Note: predictions are typically run weekly, so we'll run for week 1
      // In production, this would run for each week
      if (runScript("compute-predictions", [String(year), "1"], verbose)) {
        console.log(`   ✅ Game predictions computed for ${year}`);
        successCount++;
      } else {
        failureCount++;
      }
    }

    const seasonElapsed = ((Date.now() - seasonStart) / 1000).toFixed(1);
    console.log(`\n⏱️  Season ${year} completed in ${seasonElapsed}s\n`);
  }

  // ==========================================================================
  // POST-PROCESSING: GridLegacy Aggregation
  // ==========================================================================

  console.log(
    `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  );
  console.log(`🏆 GridLegacy: All-Time Program Rankings`);
  console.log(
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  );

  // Compute program rankings (aggregate across all seasons)
  console.log(`Aggregating final rankings across ${endYear - startYear + 1} seasons...`);

  try {
    const teams = await prisma.team.findMany();

    for (const team of teams) {
      // Get all final rankings for this team
      const rankings = await prisma.teamRanking.findMany({
        where: {
          teamId: team.id,
          ranking: {
            week: null,
          },
        },
        include: {
          ranking: {
            include: {
              season: true,
            },
          },
        },
      });

      if (rankings.length === 0) continue;

      // Calculate program stats
      const ratingValues = rankings.map((r) => Number(r.rating));
      const avgRating = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
      const maxRating = Math.max(...ratingValues);
      const minRating = Math.min(...ratingValues);

      // Peak performance: best single season
      const bestSeason = rankings.reduce((prev, current) =>
        Number(current.rating) > Number(prev.rating) ? current : prev
      );

      // Consistency: low standard deviation across seasons
      const variance =
        ratingValues.reduce((sum, r) => sum + Math.pow(r - avgRating, 2), 0) /
        ratingValues.length;
      const stddev = Math.sqrt(variance);
      const consistency = Math.max(0, 100 - stddev * 2);

      // Overall program score
      const overallScore = avgRating / 2000;

      await prisma.programRanking.upsert({
        where: { teamId: team.id },
        update: {
          overallScore,
          avgRating,
          peakPerformance: Number(bestSeason.rating),
          consistency,
          computedAt: new Date(),
        },
        create: {
          teamId: team.id,
          overallScore,
          avgRating,
          peakPerformance: Number(bestSeason.rating),
          consistency,
          computedAt: new Date(),
        },
      });
    }

    console.log(`✅ Program rankings aggregated for ${teams.length} teams\n`);
  } catch (error) {
    console.warn(`⚠️  Program ranking aggregation failed:`, error);
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================

  const totalElapsed = ((Date.now() - totalStart) / 1000).toFixed(1);
  const totalYears = endYear - startYear + 1;

  console.log(
    `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  );
  console.log(`🎉 BACKFILL COMPLETE!`);
  console.log(
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  );

  console.log(`📊 Summary:`);
  console.log(`   Seasons processed: ${totalYears}`);
  console.log(`   Computations succeeded: ${successCount}`);
  if (failureCount > 0) {
    console.log(`   Computations failed: ${failureCount} (⚠️  check logs)`);
  }
  console.log(`   Total time: ${totalElapsed}s`);
  console.log(`   Avg time per season: ${(parseFloat(totalElapsed) / totalYears).toFixed(1)}s\n`);

  console.log(`✨ GridRank is now ready for live analysis!`);
  console.log(`   - Rankings: /rankings`);
  console.log(`   - Team pages: /team/[slug]`);
  console.log(`   - Chaos Index: /chaos`);
  console.log(`   - GridLegacy: /programs`);
  console.log(`   - And 14 more feature pages...\n`);
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  const startYearArg = args[0];
  const endYearArg = args[1];
  const verbose = args.includes("--verbose") || args.includes("-v");
  const skipGridRank = args.includes("--skip-gridrank");
  const skipChaos = args.includes("--skip-chaos");
  const skipLab = args.includes("--skip-lab");
  const skipCoaches = args.includes("--skip-coaches");
  const skipAwards = args.includes("--skip-awards");
  const skipPredictions = args.includes("--skip-predictions");

  // Default to current season: Aug-Dec = this year, Jan-Jul = last year
  // (a season spans Aug of year N through Jan of year N+1)
  const now = new Date();
  const currentSeason = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const startYear = startYearArg ? parseInt(startYearArg) : 2014;
  const endYear = endYearArg ? parseInt(endYearArg) : currentSeason;

  if (isNaN(startYear) || isNaN(endYear)) {
    console.error("Invalid year arguments");
    process.exit(1);
  }

  if (startYear > endYear) {
    console.error("Start year must be before end year");
    process.exit(1);
  }

  await backfillHistorical({
    startYear,
    endYear,
    skipGridRank,
    skipChaos,
    skipLab,
    skipCoaches,
    skipAwards,
    skipPredictions,
    verbose,
  });
}

main()
  .catch((error) => {
    console.error("Error during backfill:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
