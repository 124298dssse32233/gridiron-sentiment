/**
 * Query and display final GridRank rankings for 2024
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

  // Get the 2024 season
  const sport = await prisma.sport.findUnique({
    where: { slug: "college-football" },
  });

  if (!sport) {
    console.error("Sport not found");
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
    console.error("Season not found");
    process.exit(1);
  }

  // First check what rankings exist
  const allRankings = await prisma.ranking.findMany({
    where: {
      seasonId: season.id,
    },
    orderBy: {
      week: "asc",
    },
  });

  console.log(`Found ${allRankings.length} rankings for ${year}:`);
  console.log(allRankings.map((r) => `Week: ${r.week}`).join(", "));

  // Get the last ranking (highest week number)
  const finalRanking = await prisma.ranking.findFirst({
    where: {
      seasonId: season.id,
      week: allRankings.length > 0 ? allRankings[allRankings.length - 1].week : undefined,
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
        take: 50,
      },
    },
  });

  if (!finalRanking) {
    console.error("No ranking found");
    process.exit(1);
  }

  console.log(`\n🏈 GridRank Top 50 - ${year} (Week ${finalRanking.week})\n`);
  console.log("Rank | Team                     | Level | Rating    | RD  | Record    ");
  console.log("-----|--------------------------|-------|-----------|-----|----------");

  for (const tr of finalRanking.teamRankings) {
    const rating = Number(tr.rating);
    const rd = Math.round((rating - (tr.offenseRating ? Number(tr.offenseRating) : rating)) * 1.96);
    const record = `${tr.recordWins ?? "?"}-${tr.recordLosses ?? "?"}`;

    console.log(
      `${String(tr.rank ?? 0).padStart(4)} | ${tr.team.name.padEnd(24)} | ${tr.team.level.name.padEnd(5)} | ${rating.toFixed(2).padStart(8)} | ${String(Math.abs(rd)).padStart(3)} | ${record.padStart(8)}`
    );
  }

  // Get top FCS teams
  console.log(`\n\n🏈 Top 10 FCS Teams - ${year}\n`);
  const fcsTeams = finalRanking.teamRankings
    .filter((tr) => tr.team.level.name === "FCS")
    .slice(0, 10);

  console.log("Rank | Team                     | Rating    | Overall Rank");
  console.log("-----|--------------------------|-----------|-------------");

  for (const tr of fcsTeams) {
    const rating = Number(tr.rating);
    console.log(
      `${String(tr.rank ?? 0).padStart(4)} | ${tr.team.name.padEnd(24)} | ${rating.toFixed(2).padStart(8)} | ${String(tr.rank ?? 0)}`
    );
  }

  // Get top FBS teams for comparison
  console.log(`\n\n🏈 Top 25 FBS Teams - ${year}\n`);
  const fbsTeams = finalRanking.teamRankings
    .filter((tr) => tr.team.level.name === "FBS")
    .slice(0, 25);

  console.log("Rank | Team                     | Rating    | Confidence Interval");
  console.log("-----|--------------------------|-----------|---------------------");

  for (const tr of fbsTeams) {
    const rating = Number(tr.rating);
    const rd = Math.round((rating - (tr.offenseRating ? Number(tr.offenseRating) : rating)) * 1.96);
    const confidenceInterval = `${Math.round(rating)} ± ${Math.abs(rd)}`;
    console.log(
      `${String(tr.rank ?? 0).padStart(4)} | ${tr.team.name.padEnd(24)} | ${rating.toFixed(2).padStart(8)} | ${confidenceInterval.padStart(19)}`
    );
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
