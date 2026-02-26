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
  const levels = await prisma.level.findMany();
  console.log("Levels in DB:");
  for (const l of levels) {
    const count = await prisma.team.count({ where: { levelId: l.id } });
    console.log(`  ${l.name}: ${count} teams`);
  }

  // Check a sample team
  const sample = await prisma.team.findFirst({
    include: { level: true },
  });
  console.log(`\nSample team: ${sample?.name}, Level: "${sample?.level.name}"`);

  // Check Arizona specifically
  const arizona = await prisma.team.findFirst({
    where: { abbreviation: "ARIZ" },
    include: { level: true },
  });
  console.log(`\nArizona: ${arizona?.name}, Level: "${arizona?.level.name}"`);

  await prisma.$disconnect();
}

main().catch(console.error);
