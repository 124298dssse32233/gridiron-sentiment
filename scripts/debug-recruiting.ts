import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

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

async function main() {
  const teams = await prisma.team.findMany({
    where: { level: { name: "FBS" } },
    select: { name: true, abbreviation: true },
    orderBy: { name: "asc" },
    take: 10,
  });
  console.log("Sample teams from DB:");
  teams.forEach((t) => console.log(`  ${t.name} (abbr: ${t.abbreviation})`));

  // Test the API endpoint
  const testPlayers = await fetch(
    "https://api.collegefootballdata.com/recruiting/players?year=2024&team=Alabama",
    {
      headers: {
        Authorization: `Bearer ${process.env.CFBD_API_KEY}`,
      },
    }
  ).then((r) => r.json());

  console.log("\nSample player from API:");
  console.log(`  committed_to: ${testPlayers[0]?.committed_to}`);
  console.log(`  name: ${testPlayers[0]?.name}`);
  console.log(`  stars: ${testPlayers[0]?.stars}`);

  // Check if Alabama exists in team map
  const teamMap = new Map<string, number>();
  const allTeams = await prisma.team.findMany({
    select: { id: true, name: true, abbreviation: true },
  });

  for (const team of allTeams) {
    teamMap.set(team.name.toLowerCase(), team.id);
    if (team.abbreviation) {
      teamMap.set(team.abbreviation.toLowerCase(), team.id);
    }
  }

  console.log("\nTeam map lookups:");
  console.log(`  'alabama': ${teamMap.get("alabama")}`);
  console.log(`  'Alabama': ${teamMap.get("Alabama")}`);
  console.log(`  total keys: ${teamMap.size}`);

  await prisma.$disconnect();
}

main().catch(console.error);
