import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { updateRatings, expectedOutcome, compressMargin, compressedMarginToOutcome, getCrossLevelAdjustment } from "../src/lib/gridrank/engine";
import type { GameResult } from "../src/lib/gridrank/engine";

const dbUrl = new URL(process.env.DATABASE_URL!);
const pool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 5432,
  database: dbUrl.pathname.slice(1),
  user: dbUrl.username,
  password: dbUrl.password,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Recreate the problematic scenario
  const homeRating = {
    teamId: 1,
    mu: 1199.011217427007,
    rd: 280,
    sigma: 0.06,
    level: "FCS" as const,
  };

  const awayRating = {
    teamId: 2,
    mu: 1199,
    rd: 280,
    sigma: 0.06,
    level: "FCS" as const,
  };

  const gameResult: GameResult = {
    homeRating,
    awayRating,
    homeScore: 22,
    awayScore: 18,
    isNeutralSite: false,
    isPostseason: false,
  };

  console.log("Input ratings:");
  console.log(`  Home: mu=${homeRating.mu}, rd=${homeRating.rd}, level=${homeRating.level}`);
  console.log(`  Away: mu=${awayRating.mu}, rd=${awayRating.rd}, level=${awayRating.level}`);

  // Manual calculation
  const hfa = 2.5;
  const expected = expectedOutcome(homeRating.mu, awayRating.mu, hfa);
  console.log(`\nExpected outcome: ${expected}`);

  const mov = 22 - 18;
  const compressed = compressMargin(mov);
  console.log(`MOV: ${mov}, Compressed: ${compressed}`);

  const actualOutcome = compressedMarginToOutcome(compressed);
  console.log(`Actual outcome: ${actualOutcome}`);

  const crossLevelFactor = getCrossLevelAdjustment(homeRating.level, awayRating.level);
  console.log(`Cross-level factor: ${crossLevelFactor}`);

  const adjustedOutcome = 0.5 + (actualOutcome - 0.5) * 1 * crossLevelFactor;
  console.log(`Adjusted outcome: ${adjustedOutcome}`);

  // Now run the actual function
  const result = updateRatings(homeRating, awayRating, gameResult);

  console.log(`\nResult:`);
  console.log(`  Home mu: ${result.homeRating.mu} (NaN: ${isNaN(result.homeRating.mu)})`);
  console.log(`  Away mu: ${result.awayRating.mu} (NaN: ${isNaN(result.awayRating.mu)})`);

  await prisma.$disconnect();
}

main().catch(console.error);
