import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("GridLegacy Top 25 All-Time Programs:\n");

  const topPrograms = await prisma.programRanking.findMany({
    include: { team: true },
    orderBy: { avgRating: "desc" },
    take: 25,
  });

  for (let i = 0; i < topPrograms.length; i++) {
    const p = topPrograms[i];
    const displayAvg = (Number(p.avgRating) * 10).toFixed(2);
    const displayPeak = (Number(p.peakPerformance) * 10).toFixed(0);
    console.log(`${i + 1}. ${p.team.name} - Avg: ${displayAvg}, Peak: ${displayPeak}`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
