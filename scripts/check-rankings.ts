/**
 * Quick check script to see if GridRank has been run
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
  console.log("Checking database for existing rankings...\n");

  // Check Ranking table
  const rankingCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Ranking"`;
  console.log("Ranking records:", (rankingCount as any)[0].count);

  // Check TeamRanking table
  const teamRankingCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "TeamRanking"`;
  console.log("TeamRanking records:", (teamRankingCount as any)[0].count);

  // Get latest ranking
  const latest = await prisma.$queryRaw`
    SELECT s.year, r.week, r.computed_at, COUNT(tr.id) as team_count
    FROM "Ranking" r
    JOIN "Season" s ON s.id = r.season_id
    LEFT JOIN "TeamRanking" tr ON tr.ranking_id = r.id
    GROUP BY s.year, r.week, r.computed_at
    ORDER BY r.computed_at DESC
    LIMIT 5
  `;

  console.log("\nLatest rankings:");
  console.table(latest);

  // If we have rankings, show top 10
  if ((teamRankingCount as any)[0].count > 0) {
    const top10 = await prisma.$queryRaw`
      SELECT t.name, t.abbreviation, tr.rank, tr.rating, tr."offenseRating", tr."defenseRating"
      FROM "TeamRanking" tr
      JOIN "Team" t ON t.id = tr.team_id
      JOIN "Ranking" r ON r.id = tr.ranking_id
      WHERE r.week IS NULL
      ORDER BY tr.rating DESC
      LIMIT 10
    `;
    console.log("\nTop 10 teams:");
    console.table(top10);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
