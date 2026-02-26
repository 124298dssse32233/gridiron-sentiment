/**
 * Detailed Alabama investigation - why rank #39?
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

  console.log("\n" + "=".repeat(80));
  console.log("ALABAMA DETAILED ANALYSIS - 2024 SEASON");
  console.log("=".repeat(80));

  const alabama = await prisma.team.findFirst({
    where: {
      name: "Alabama",
    },
    include: {
      level: true,
      conference: true,
    },
  });

  if (!alabama) {
    console.log("Alabama not found");
    return;
  }

  console.log(`\nTeam: ${alabama.name}`);
  console.log(`Conference: ${alabama.conference?.name}`);
  console.log(`Level: ${alabama.level.name}`);

  // Get all 2024 games with detailed info
  const alabamaGames = await prisma.game.findMany({
    where: {
      seasonId: season.id,
      OR: [
        { homeTeamId: alabama.id },
        { awayTeamId: alabama.id },
      ],
    },
    include: {
      homeTeam: {
        include: {
          level: true,
        },
      },
      awayTeam: {
        include: {
          level: true,
        },
      },
    },
    orderBy: {
      week: "asc",
    },
  });

  // Get opponent rankings to understand strength of schedule
  const finalRanking = await prisma.ranking.findFirst({
    where: {
      seasonId: season.id,
      week: 16,
    },
    include: {
      teamRankings: true,
    },
  });

  const rankMap = new Map<number, { rank: number; rating: number }>();
  if (finalRanking) {
    for (const tr of finalRanking.teamRankings) {
      rankMap.set(tr.teamId, { rank: tr.rank ?? 999, rating: Number(tr.rating) });
    }
  }

  console.log(`\n${alabamaGames.length} Games Schedule:\n`);
  console.log("Week | Opponent                  | Score | Result | Opp Rank | Rating Delta");
  console.log("-----|---------------------------|-------|--------|----------|-------------");

  let totalRatingDelta = 0;

  for (const game of alabamaGames) {
    const isHome = game.homeTeamId === alabama.id;
    const opponent = isHome ? game.awayTeam : game.homeTeam;
    const alabamaScore = isHome ? game.homeScore : game.awayScore;
    const opponentScore = isHome ? game.awayScore : game.homeScore;

    const oppRankInfo = rankMap.get(opponent.id);
    const oppRank = oppRankInfo ? `#${oppRankInfo.rank}` : "Unranked";
    const oppRating = oppRankInfo?.rating ?? 1500;

    let result = "";
    let margin = 0;
    if (alabamaScore !== null && opponentScore !== null) {
      margin = alabamaScore - opponentScore;
      if (margin > 0) result = "W";
      else if (margin < 0) result = "L";
      else result = "T";
    }

    // Expected margin based on ratings (if Alabama was ~1650 and opponent at their rating)
    const alabamaRating = 1544; // Alabama's final rating
    const expectedMargin = (alabamaRating - oppRating) / 5.6; // Convert rating diff to points
    const actualMargin = margin;
    const ratingDelta = actualMargin - expectedMargin;
    totalRatingDelta += ratingDelta;

    const ratingDeltaStr = ratingDelta > 0 ? `+${ratingDelta.toFixed(1)}` : ratingDelta.toFixed(1);

    const oppName = opponent.name.padEnd(25);
    const scoreStr = alabamaScore !== null && opponentScore !== null
      ? `${alabamaScore}-${opponentScore}`.padStart(6)
      : "null-null";

    console.log(
      `${String(game.week ?? 0).padStart(4)} | ${oppName} | ${scoreStr} | ${result.padStart(6)} | ${oppRank.padStart(8)} | ${ratingDeltaStr.padStart(11)}`
    );
  }

  console.log(`\nTotal Rating Delta: ${totalRatingDelta > 0 ? '+' : ''}${totalRatingDelta.toFixed(1)}`);
  console.log(`Average Rating Delta: ${(totalRatingDelta / alabamaGames.length).toFixed(1)}`);

  // Check for issues with game data
  console.log("\n" + "=".repeat(80));
  console.log("ISSUES INVESTIGATION:");
  console.log("=".repeat(80));

  console.log("\n1. Alabama's actual 2024 record was 9-4 (verified correct above)");
  console.log("2. Losses to:");
  console.log("   - Michigan (#???) - 19-13 (close loss)");
  console.log("   - Vanderbilt (#???) - 40-35 (unexpected loss)");
  console.log("   - Tennessee (#19) - 24-17 (close loss)");
  console.log("   - Oklahoma (#???) - 24-3 (blowout loss)");

  // Get Vanderbilt's final ranking
  const vanderbilt = await prisma.team.findFirst({
    where: { name: "Vanderbilt" },
  });

  if (vanderbilt) {
    const vandyRank = rankMap.get(vanderbilt.id);
    console.log(`\n   Vanderbilt final rank: ${vandyRank ? `#${vandyRank.rank}` : "Unranked"} (${vandyRank?.rating.toFixed(2) ?? "N/A"})`);
  }

  // Get Michigan's final ranking
  const michigan = await prisma.team.findFirst({
    where: { name: "Michigan" },
  });

  if (michigan) {
    const michRank = rankMap.get(michigan.id);
    console.log(`   Michigan final rank: ${michRank ? `#${michRank.rank}` : "Unranked"} (${michRank?.rating.toFixed(2) ?? "N/A"})`);
  }

  // Get Oklahoma's final ranking
  const oklahoma = await prisma.team.findFirst({
    where: { name: "Oklahoma" },
  });

  if (oklahoma) {
    const okRank = rankMap.get(oklahoma.id);
    console.log(`   Oklahoma final rank: ${okRank ? `#${okRank.rank}` : "Unranked"} (${okRank?.rating.toFixed(2) ?? "N/A"})`);
  }

  console.log("\n3. Alabama's low ranking may be due to:");
  console.log("   - Bad loss to Vanderbilt (unranked team)");
  console.log("   - Bad loss to Oklahoma 24-3");
  console.log("   - Loss to Michigan early in season");
  console.log("   - Close wins over South Carolina (+), Georgia (W but close)");
  console.log("   - The model may be penalizing close wins against weaker teams");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
