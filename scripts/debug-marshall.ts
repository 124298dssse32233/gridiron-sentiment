/**
 * Debug Marshall University team
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

  // Find Marshall University (should be in CUSA or similar)
  console.log("\nSearching for Marshall University (Thundering Herd)...\n");

  // Try different approaches
  const marshallVariations = [
    "Marshall",
    "Marshall University",
    "Thundering Herd",
  ];

  for (const variation of marshallVariations) {
    const teams = await prisma.team.findMany({
      where: {
        name: {
          equals: variation,
        },
      },
      include: {
        level: true,
        conference: true,
      },
    });

    if (teams.length > 0) {
      console.log(`Found "${variation}":`);
      for (const team of teams) {
        console.log(`  ID: ${team.id}`);
        console.log(`  Name: ${team.name}`);
        console.log(`  Abbreviation: ${team.abbreviation}`);
        console.log(`  Level: ${team.level.name}`);
        console.log(`  Conference: ${team.conference?.name ?? "None"}`);
      }
    }
  }

  // Also check by abbreviation
  const marshallByAbbr = await prisma.team.findFirst({
    where: {
      abbreviation: "MRSH",
    },
    include: {
      level: true,
      conference: true,
    },
  });

  if (marshallByAbbr) {
    console.log(`\nFound by abbreviation "MRSH":`);
    console.log(`  ID: ${marshallByAbbr.id}`);
    console.log(`  Name: ${marshallByAbbr.name}`);
    console.log(`  Level: ${marshallByAbbr.level.name}`);
    console.log(`  Conference: ${marshallByAbbr.conference?.name ?? "None"}`);

    // Get their games and record
    const marshallGames = await prisma.game.findMany({
      where: {
        seasonId: season.id,
        OR: [
          { homeTeamId: marshallByAbbr.id },
          { awayTeamId: marshallByAbbr.id },
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

    console.log(`\nMarshall (Thundering Herd) 2024 Games (${marshallGames.length} total):`);

    let wins = 0;
    let losses = 0;

    for (const game of marshallGames) {
      const isHome = game.homeTeamId === marshallByAbbr.id;
      const opponent = isHome ? game.awayTeam : game.homeTeam;
      const marshallScore = isHome ? game.homeScore : game.awayScore;
      const opponentScore = isHome ? game.awayScore : game.homeScore;

      if (marshallScore !== null && opponentScore !== null) {
        if (marshallScore > opponentScore) wins++;
        else if (marshallScore < opponentScore) losses++;

        const result = marshallScore > opponentScore ? "W" : "L";
        console.log(`  ${game.week ?? "?"}. ${opponent.name.padEnd(25)} ${marshallScore}-${opponentScore} (${result})`);
      }
    }

    console.log(`\nFinal Record: ${wins}-${losses}`);

    // Get their ranking
    const finalRanking = await prisma.teamRanking.findFirst({
      where: {
        teamId: marshallByAbbr.id,
        ranking: {
          seasonId: season.id,
          week: 16,
        },
      },
    });

    if (finalRanking) {
      console.log(`\nFinal GridRank Ranking: #${finalRanking.rank} (${Number(finalRanking.rating).toFixed(2)})`);
    } else {
      console.log(`\nNo final ranking found`);
    }
  }

  // List all teams with "Marshall" in name
  console.log("\n\nAll teams containing 'Marshall' in name:");
  const allMarshalls = await prisma.team.findMany({
    where: {
      name: {
        contains: "marshall",
        mode: "insensitive",
      },
    },
    include: {
      level: true,
      conference: true,
    },
  });

  for (const team of allMarshalls) {
    const finalRanking = await prisma.teamRanking.findFirst({
      where: {
        teamId: team.id,
        ranking: {
          seasonId: season.id,
          week: 16,
        },
      },
    });

    const rankInfo = finalRanking ? `#${finalRanking.rank}` : "Unranked";
    console.log(`  ${team.name.padEnd(30)} | ${team.level.name.padEnd(5)} | ${team.conference?.name ?? "None".padEnd(20)} | ${rankInfo}`);
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
