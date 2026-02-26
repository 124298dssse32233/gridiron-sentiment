import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { updateRatings } from "../src/lib/gridrank/engine";
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
  // Find both Florida A&M games in week 1
  const games = await prisma.game.findMany({
    where: {
      week: 1,
      OR: [
        { homeTeam: { name: { contains: "Florida A&M" } } },
        { awayTeam: { name: { contains: "Florida A&M" } } },
      ],
    },
    include: {
      homeTeam: { include: { level: true } },
      awayTeam: { include: { level: true } },
    },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${games.length} games for Florida A&M in week 1:`);

  // Simulate both games in order
  let famuRating = {
    teamId: 0,
    mu: 1199,
    rd: 280,
    sigma: 0.06,
    level: "FCS" as const,
  };

  const ratings = new Map<number, any>();

  for (const g of games) {
    console.log(`\nGame: ${g.homeTeam.name} ${g.homeScore} - ${g.awayScore} ${g.awayTeam.name}`);

    const isFamuHome = g.homeTeam.name.includes("Florida A&M");
    const opponentName = isFamuHome ? g.awayTeam.name : g.homeTeam.name;

    // Get or create home rating
    let homeRating = ratings.get(g.homeTeamId);
    if (!homeRating) {
      homeRating = {
        teamId: g.homeTeamId,
        mu: g.homeTeam.level.name === "FBS" ? 1499 : g.homeTeam.level.name === "FCS" ? 1199 : 999,
        rd: g.homeTeam.level.name === "FBS" ? 250 : g.homeTeam.level.name === "FCS" ? 280 : 300,
        sigma: 0.06,
        level: g.homeTeam.level.name as "FBS" | "FCS" | "D2" | "D3" | "NAIA",
      };
    }

    // Get or create away rating
    let awayRating = ratings.get(g.awayTeamId);
    if (!awayRating) {
      awayRating = {
        teamId: g.awayTeamId,
        mu: g.awayTeam.level.name === "FBS" ? 1499 : g.awayTeam.level.name === "FCS" ? 1199 : 999,
        rd: g.awayTeam.level.name === "FBS" ? 250 : g.awayTeam.level.name === "FCS" ? 280 : 300,
        sigma: 0.06,
        level: g.awayTeam.level.name as "FBS" | "FCS" | "D2" | "D3" | "NAIA",
      };
    }

    console.log(`  Before: Home mu=${homeRating.mu}, Away mu=${awayRating.mu}`);

    const gameResult: GameResult = {
      homeRating,
      awayRating,
      homeScore: g.homeScore ?? undefined,
      awayScore: g.awayScore ?? undefined,
      isNeutralSite: g.isNeutralSite,
      isPostseason: g.isPostseason,
    };

    const result = updateRatings(homeRating, awayRating, gameResult);

    console.log(`  After: Home mu=${result.homeRating.mu}, Away mu=${result.awayRating.mu}`);
    console.log(`  Is NaN? Home=${isNaN(result.homeRating.mu)}, Away=${isNaN(result.awayRating.mu)}`);

    ratings.set(g.homeTeamId, result.homeRating);
    ratings.set(g.awayTeamId, result.awayRating);

    if (isFamuHome) {
      famuRating = result.homeRating;
    } else {
      famuRating = result.awayRating;
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
