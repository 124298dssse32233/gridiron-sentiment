import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { updateRatings, initializeRating } from "../src/lib/gridrank/engine";
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
  // Get a sample game
  const game = await prisma.game.findFirst({
    where: {
      homeScore: { not: null },
      awayScore: { not: null },
    },
    include: {
      homeTeam: { include: { level: true } },
      awayTeam: { include: { level: true } },
    },
  });

  if (!game) {
    console.log("No games found");
    await prisma.$disconnect();
    return;
  }

  console.log(`Game: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
  console.log(`  Home: ${game.homeTeam.name}, Level: ${game.homeTeam.level.name}`);
  console.log(`  Away: ${game.awayTeam.name}, Level: ${game.awayTeam.level.name}`);
  console.log(`  Score: ${game.homeScore} - ${game.awayScore}`);

  const homeRating = {
    teamId: game.homeTeamId,
    mu: 1500,
    rd: 250,
    sigma: 0.06,
    level: game.homeTeam.level.name as "FBS" | "FCS" | "D2" | "D3" | "NAIA",
  };

  const awayRating = {
    teamId: game.awayTeamId,
    mu: 1500,
    rd: 250,
    sigma: 0.06,
    level: game.awayTeam.level.name as "FBS" | "FCS" | "D2" | "D3" | "NAIA",
  };

  const gameResult: GameResult = {
    homeRating,
    awayRating,
    homeScore: game.homeScore ?? undefined,
    awayScore: game.awayScore ?? undefined,
    isNeutralSite: game.isNeutralSite,
    isPostseason: game.isPostseason,
  };

  console.log(`\nBefore update:`);
  console.log(`  Home mu: ${homeRating.mu}`);
  console.log(`  Away mu: ${awayRating.mu}`);

  const result = updateRatings(homeRating, awayRating, gameResult);

  console.log(`\nAfter update:`);
  console.log(`  Home mu: ${result.homeRating.mu}`);
  console.log(`  Away mu: ${result.awayRating.mu}`);
  console.log(`  Expected: ${result.expectedOutcome}`);
  console.log(`  Actual: ${result.actualOutcome}`);
  console.log(`  HFA: ${result.homeFieldAdvantage}`);

  await prisma.$disconnect();
}

main().catch(console.error);
