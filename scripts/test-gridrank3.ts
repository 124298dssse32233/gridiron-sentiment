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
  // Find South Carolina State vs Jackson State game
  const games = await prisma.game.findMany({
    where: {
      week: 1,
      OR: [
        { homeTeam: { name: { contains: "South Carolina State" } } },
        { awayTeam: { name: { contains: "South Carolina State" } } },
      ],
    },
    include: {
      homeTeam: { include: { level: true } },
      awayTeam: { include: { level: true } },
    },
  });

  console.log(`Found ${games.length} games for South Carolina State in week 1:`);
  for (const g of games) {
    console.log(`  ${g.homeTeam.name} ${g.homeScore} - ${g.awayScore} ${g.awayTeam.name}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
