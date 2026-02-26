import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getTeams } from "../src/lib/cfbd/client";

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
  // Get teams from CFBD
  const teams = await getTeams();

  // Group by classification
  const byClassification = new Map<string, string[]>();

  for (const t of teams) {
    const classification = t.classification || "none";
    if (!byClassification.has(classification)) {
      byClassification.set(classification, []);
    }
    byClassification.get(classification)!.push(t.school);
  }

  console.log("Classifications from CFBD:");
  for (const [classification, schools] of byClassification.entries()) {
    console.log(`  "${classification}": ${schools.length} teams`);
    if (schools.length <= 10) {
      console.log(`    Examples: ${schools.slice(0, 5).join(", ")}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
