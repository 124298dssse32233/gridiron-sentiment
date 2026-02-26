/**
 * Show FCS team rankings to validate cross-level calibration
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const year = 2024;

  const sport = await prisma.sport.findUnique({
    where: { slug: "college-football" },
  });

  if (!sport) {
    process.exit(1);
  }

  const season = await prisma.season.findUnique({
    where: {
      sportId_year: {
        sportId: sport.id,
        year,
      },
    },
  });

  if (!season) {
    process.exit(1);
  }

  const finalRanking = await prisma.ranking.findFirst({
    where: {
      seasonId: season.id,
      week: 16,
    },
    include: {
      teamRankings: {
        include: {
          team: {
            include: {
              level: true,
            },
          },
        },
        orderBy: {
          rank: "asc",
        },
      },
    },
  });

  if (!finalRanking) {
    console.log("No ranking found");
    return;
  }

  console.log("\n" + "=".repeat(80));
  console.log("CROSS-LEVEL CALIBRATION ANALYSIS - 2024 FINAL RANKINGS");
  console.log("=".repeat(80));

  // Filter by level
  const fbsTeams = finalRanking.teamRankings.filter((tr) => tr.team.level.name === "FBS");
  const fcsTeams = finalRanking.teamRankings.filter((tr) => tr.team.level.name === "FCS");
  const d2Teams = finalRanking.teamRankings.filter((tr) => tr.team.level.name === "D2");
  const d3Teams = finalRanking.teamRankings.filter((tr) => tr.team.level.name === "D3");
  const naiaTeams = finalRanking.teamRankings.filter((tr) => tr.team.level.name === "NAIA");

  console.log(`\nTotal Teams by Level:`);
  console.log(`  FBS:  ${fbsTeams.length} teams`);
  console.log(`  FCS:  ${fcsTeams.length} teams`);
  console.log(`  D2:   ${d2Teams.length} teams`);
  console.log(`  D3:   ${d3Teams.length} teams`);
  console.log(`  NAIA: ${naiaTeams.length} teams`);

  // Top FCS teams
  console.log(`\n${"=".repeat(80)}`);
  console.log("TOP 20 FCS TEAMS (with overall rank)");
  console.log("=".repeat(80));
  console.log("OvRank | Team                     | Rating    | Conference");
  console.log("-------|--------------------------|-----------|------------");

  for (const tr of fcsTeams.slice(0, 20)) {
    const rating = Number(tr.rating);
    console.log(
      `${String(tr.rank ?? 0).padStart(6)} | ${tr.team.name.padEnd(24)} | ${rating.toFixed(2).padStart(8)} | ${"N/A".padStart(10)}`
    );
  }

  // Top D2 teams
  console.log(`\n${"=".repeat(80)}`);
  console.log("TOP 10 D2 TEAMS (with overall rank)");
  console.log("=".repeat(80));

  for (const tr of d2Teams.slice(0, 10)) {
    const rating = Number(tr.rating);
    console.log(
      `${String(tr.rank ?? 0).padStart(6)} | ${tr.team.name.padEnd(24)} | ${rating.toFixed(2).padStart(8)}`
    );
  }

  // Find where the first FCS team appears in overall rankings
  const firstFcsRank = fcsTeams.length > 0 ? fcsTeams[0].rank : null;
  const firstD2Rank = d2Teams.length > 0 ? d2Teams[0].rank : null;

  console.log(`\n${"=".repeat(80)}`);
  console.log("CROSS-LEVEL CALIBRATION TARGETS");
  console.log("=".repeat(80));
  console.log(`  First FCS team overall rank: #${firstFcsRank ?? "N/A"} (Target: #60-80)`);
  console.log(`  First D2 team overall rank:  #${firstD2Rank ?? "N/A"} (Target: #120-150)`);

  // Check top FCS teams
  if (fcsTeams.length > 0) {
    const topFcs = fcsTeams[0];
    console.log(`\n  Top FCS Team: ${topFcs.team.name} at #${topFcs.rank} (${Number(topFcs.rating).toFixed(2)})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
