/**
 * Debug specific team rankings and game results
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

  // Debug Alabama
  console.log("\n" + "=".repeat(70));
  console.log("ALABAMA INVESTIGATION");
  console.log("=".repeat(70));

  const alabama = await prisma.team.findFirst({
    where: {
      name: {
        contains: "alabama",
        mode: "insensitive",
      },
    },
  });

  if (alabama) {
    console.log(`\nAlabama Team Info:`);
    console.log(`  ID: ${alabama.id}`);
    console.log(`  Name: ${alabama.name}`);
    console.log(`  Abbreviation: ${alabama.abbreviation}`);
    console.log(`  Level: ${alabama.levelId}`);
    console.log(`  Stadium: ${alabama.stadium}`);
    console.log(`  Stadium Capacity: ${alabama.stadiumCapacity}`);

    // Get Alabama's 2024 games
    const alabamaGames = await prisma.game.findMany({
      where: {
        seasonId: season.id,
        OR: [
          { homeTeamId: alabama.id },
          { awayTeamId: alabama.id },
        ],
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: {
        week: "asc",
      },
    });

    console.log(`\nAlabama 2024 Games (${alabamaGames.length} total):`);
    console.log("Week | Home Team            | Score | Away Team            | Score | Result");
    console.log("-----|---------------------|-------|---------------------|-------|-------");

    let wins = 0;
    let losses = 0;

    for (const game of alabamaGames) {
      const isHome = game.homeTeamId === alabama.id;
      const opponent = isHome ? game.awayTeam : game.homeTeam;
      const alabamaScore = isHome ? game.homeScore : game.awayScore;
      const opponentScore = isHome ? game.awayScore : game.homeScore;

      let result = "?";
      if (alabamaScore !== null && opponentScore !== null) {
        if (alabamaScore > opponentScore) {
          result = "W";
          wins++;
        } else if (alabamaScore < opponentScore) {
          result = "L";
          losses++;
        } else {
          result = "T";
        }
      }

      const homeName = game.homeTeam.name.padEnd(21);
      const awayName = game.awayTeam.name.padEnd(21);
      const homeScore = game.homeScore ?? "null";
      const awayScore = game.awayScore ?? "null";

      console.log(
        `${String(game.week ?? 0).padStart(4)} | ${homeName} | ${String(homeScore).padStart(5)} | ${awayName} | ${String(awayScore).padStart(5)} | ${result}`
      );
    }

    console.log(`\nRecord: ${wins}-${losses}`);
  }

  // Debug "Ohio" - there could be Ohio University and Ohio State
  console.log("\n" + "=".repeat(70));
  console.log("OHIO TEAM INVESTIGATION");
  console.log("=".repeat(70));

  const ohioTeams = await prisma.team.findMany({
    where: {
      name: {
        contains: "ohio",
        mode: "insensitive",
      },
    },
    include: {
      level: true,
    },
  });

  console.log(`\nFound ${ohioTeams.length} teams with "Ohio" in name:`);
  for (const team of ohioTeams) {
    console.log(`  ID: ${team.id} | Name: ${team.name.padEnd(30)} | Abbr: ${team.abbreviation ?? "N/A".padEnd(6)} | Level: ${team.level.name}`);

    // Get their final ranking
    const finalRanking = await prisma.teamRanking.findFirst({
      where: {
        teamId: team.id,
        ranking: {
          seasonId: season.id,
          week: 16,
        },
      },
      include: {
        ranking: true,
      },
    });

    if (finalRanking) {
      console.log(`    Final Ranking: #${finalRanking.rank} | Rating: ${Number(finalRanking.rating).toFixed(2)}`);
    }
  }

  // Check Marshall
  console.log("\n" + "=".repeat(70));
  console.log("MARSHALL INVESTIGATION");
  console.log("=".repeat(70));

  const marshall = await prisma.team.findFirst({
    where: {
      name: {
        contains: "marshall",
        mode: "insensitive",
      },
    },
  });

  if (marshall) {
    console.log(`\nMarshall Team Info:`);
    console.log(`  Name: ${marshall.name}`);
    console.log(`  Abbreviation: ${marshall.abbreviation}`);

    const marshallGames = await prisma.game.findMany({
      where: {
        seasonId: season.id,
        OR: [
          { homeTeamId: marshall.id },
          { awayTeamId: marshall.id },
        ],
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: {
        week: "asc",
      },
    });

    console.log(`\nMarshall 2024 Games (${marshallGames.length} total):`);

    let wins = 0;
    let losses = 0;

    for (const game of marshallGames) {
      const isHome = game.homeTeamId === marshall.id;
      const opponent = isHome ? game.awayTeam : game.homeTeam;
      const marshallScore = isHome ? game.homeScore : game.awayScore;
      const opponentScore = isHome ? game.awayScore : game.homeScore;

      if (marshallScore !== null && opponentScore !== null) {
        if (marshallScore > opponentScore) wins++;
        else if (marshallScore < opponentScore) losses++;

        if (wins + losses <= 5 || opponent.name.includes("Ohio State") || opponent.name.includes("Notre Dame")) {
          const result = marshallScore > opponentScore ? "W" : "L";
          console.log(`  ${game.week ?? "?"}. ${opponent.name.padEnd(25)} ${marshallScore}-${opponentScore} (${result})`);
        }
      }
    }

    console.log(`\nFinal Record: ${wins}-${losses}`);
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
