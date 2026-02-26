/**
 * Check Logo & Abbreviation Coverage
 *
 * Queries the database to report how many teams have:
 * - Logo URLs from CFBD
 * - Abbreviations from CFBD
 * - Full logos arrays in metadata
 *
 * Usage: npx tsx scripts/check-logo-coverage.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

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
const prisma = new PrismaClient({ adapter, log: ["error"] });

interface TeamWithLevel {
  id: number;
  name: string;
  abbreviation: string | null;
  logoUrl: string | null;
  metadata: Record<string, unknown> | null;
  level: { name: string };
}

async function main() {
  const teams = (await prisma.team.findMany({
    select: {
      id: true,
      name: true,
      abbreviation: true,
      logoUrl: true,
      metadata: true,
      level: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  })) as unknown as TeamWithLevel[];

  console.log(`\n📊 TEAM COVERAGE REPORT`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Total teams in database: ${teams.length}\n`);

  // Group by level
  const levels = ["FBS", "FCS", "D2", "D3", "NAIA"];
  for (const level of levels) {
    const levelTeams = teams.filter((t) => t.level.name === level);
    const withLogo = levelTeams.filter((t) => t.logoUrl);
    const withAbbr = levelTeams.filter((t) => t.abbreviation);
    const withLogosArray = levelTeams.filter((t) => {
      const meta = t.metadata as Record<string, unknown> | null;
      const logos = meta?.logos as string[] | undefined;
      return logos && logos.length > 0;
    });

    console.log(`${level} (${levelTeams.length} teams):`);
    console.log(`  Logo URL:     ${withLogo.length}/${levelTeams.length} (${Math.round((withLogo.length / levelTeams.length) * 100)}%)`);
    console.log(`  Abbreviation: ${withAbbr.length}/${levelTeams.length} (${Math.round((withAbbr.length / levelTeams.length) * 100)}%)`);
    console.log(`  Logos array:  ${withLogosArray.length}/${levelTeams.length} (${Math.round((withLogosArray.length / levelTeams.length) * 100)}%)`);

    // List teams WITHOUT logos
    const missingLogo = levelTeams.filter((t) => !t.logoUrl);
    if (missingLogo.length > 0 && missingLogo.length <= 20) {
      console.log(`  Missing logos: ${missingLogo.map((t) => t.name).join(", ")}`);
    } else if (missingLogo.length > 20) {
      console.log(`  Missing logos: ${missingLogo.length} teams (too many to list)`);
    }

    // List teams WITHOUT abbreviations
    const missingAbbr = levelTeams.filter((t) => !t.abbreviation);
    if (missingAbbr.length > 0 && missingAbbr.length <= 20) {
      console.log(`  Missing abbr: ${missingAbbr.map((t) => t.name).join(", ")}`);
    }

    console.log("");
  }

  // Overall summary
  const withLogo = teams.filter((t) => t.logoUrl);
  const withAbbr = teams.filter((t) => t.abbreviation);
  console.log(`${"=".repeat(60)}`);
  console.log(`OVERALL:`);
  console.log(`  Logo URL:     ${withLogo.length}/${teams.length} (${Math.round((withLogo.length / teams.length) * 100)}%)`);
  console.log(`  Abbreviation: ${withAbbr.length}/${teams.length} (${Math.round((withAbbr.length / teams.length) * 100)}%)`);

  // Sample some teams to verify logo URLs
  console.log(`\n📷 SAMPLE LOGO URLS:`);
  const samples = ["North Dakota State", "Ohio State", "Grand Valley State", "Mount Union", "Morningside"];
  for (const name of samples) {
    const team = teams.find((t) => t.name === name);
    if (team) {
      const meta = team.metadata as Record<string, unknown> | null;
      const logos = meta?.logos as string[] | undefined;
      console.log(`  ${name}: abbr=${team.abbreviation}, logo=${team.logoUrl ? "✅" : "❌"}, logos=[${logos?.length ?? 0}]`);
    } else {
      console.log(`  ${name}: NOT FOUND in DB`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
