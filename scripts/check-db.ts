import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

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
  // Check total games
  const totalGames = await prisma.game.count();
  console.log(`Total games in DB: ${totalGames}`);

  // Check games by each season
  const allSeasons = await prisma.season.findMany({
    orderBy: { year: "desc" },
    take: 10,
  });

  for (const s of allSeasons) {
    const c = await prisma.game.count({ where: { seasonId: s.id } });
    console.log(`  Season ${s.year} (ID ${s.id}): ${c} games`);
  }

  // Check first few games if any exist
  const firstGame = await prisma.game.findFirst({
    include: { homeTeam: true, awayTeam: true, season: true },
  });
  console.log("First game:", firstGame ? `${firstGame.season.year}: ${firstGame.homeTeam?.name} vs ${firstGame.awayTeam?.name}` : "none");

  await prisma.$disconnect();
}

main().catch(console.error);
