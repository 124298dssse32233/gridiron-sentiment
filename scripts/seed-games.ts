/**
 * Seed Games Script
 *
 * Fetches games from CFBD API and seeds the database with:
 * - Games (with scores, dates, venues, advanced stats)
 *
 * Usage: npm run seed:games
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  getGames,
  getAdvancedBoxScore,
  getPreGameWP,
  delay,
  type CFBDGame,
} from "@/lib/cfbd/client";

// Parse DATABASE_URL
const dbUrl = new URL(process.env.DATABASE_URL!);
const poolConfig = {
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 5432,
  database: dbUrl.pathname.slice(1),
  user: dbUrl.username,
  password: dbUrl.password,
};

// Create connection pool for Prisma
const pool = new Pool(poolConfig);

// Create Prisma client with PostgreSQL adapter
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  log: ["error"],
});

/**
 * Map CFBD team names to database team IDs
 */
async function getTeamIdMap(): Promise<Map<string, number>> {
  const teams = await prisma.team.findMany({
    select: { id: true, name: true, abbreviation: true },
  });

  const teamMap = new Map<string, number>();

  for (const team of teams) {
    teamMap.set(team.name.toLowerCase(), team.id);
    if (team.abbreviation) {
      teamMap.set(team.abbreviation.toLowerCase(), team.id);
    }
  }

  // Add common alternative names
  const altNames: Record<string, string> = {
    "miami (fl)": "Miami",
    "miami (oh)": "Miami",
    "ucf": "UCF",
    "usf": "South Florida",
    "southern miss": "Southern Mississippi",
    "ole miss": "Ole Miss",
    "unc": "North Carolina",
    "nc state": "NC State",
    "pitt": "Pitt",
    "texas a&m": "Texas A&M",
    "tcu": "TCU",
    "smu": "SMU",
    "ucla": "UCLA",
    "usc": "Southern California",
    "asu": "Arizona State",
    "uah": "Alabama-Huntsville",
    "utep": "UTEP",
    "umass": "Massachusetts",
    "geo": "Georgia",
    "wvu": "West Virginia",
    "isu": "Iowa State",
    "ksu": "Kansas State",
    "osu": "Ohio State",
    "msu": "Michigan State",
    "niu": "Northern Illinois",
    "usd": "San Diego",
    "sdsu": "San Diego State",
    "ua": "Alabama",
    "au": "Auburn",
    "uab": "UAB",
    "utsa": "UTSA",
    "nav": "Navy",
    "arm": "Army",
    "und": "North Dakota",
    "sdsu": "South Dakota State",
    "niu": "Northern Illinois",
    "uni": "Northern Iowa",
    "nmsu": "New Mexico State",
    "sjsu": "San Jose State",
    "psu": "Penn State",
    "isu": "Illinois State",
    "siu": "Southern Illinois",
  };

  for (const [alt, officialName] of Object.entries(altNames)) {
    const teamId = teamMap.get(officialName.toLowerCase());
    if (teamId) {
      teamMap.set(alt.toLowerCase(), teamId);
    }
  }

  return teamMap;
}

/**
 * Get or create a season record
 */
async function getSeasonId(year: number): Promise<number> {
  // Get the sport first
  const sport = await prisma.sport.findUnique({
    where: { slug: "college-football" },
  });

  if (!sport) {
    throw new Error("College Football sport not found");
  }

  const season = await prisma.season.upsert({
    where: {
      sportId_year: {
        sportId: sport.id,
        year,
      },
    },
    update: {},
    create: {
      sportId: sport.id,
      year,
    },
  });

  return season.id;
}

/**
 * Convert CFBD game to database game format
 */
function cfbdGameToDbGame(
  cfbdGame: CFBDGame,
  seasonId: number,
  homeTeamId: number,
  awayTeamId: number
) {
  const isPostseason = cfbdGame.seasonType === "postseason";

  return {
    seasonId,
    homeTeamId,
    awayTeamId,
    week: cfbdGame.week,
    gameDate: cfbdGame.startDate ? new Date(cfbdGame.startDate) : null,
    homeScore: cfbdGame.homePoints ?? null,
    awayScore: cfbdGame.awayPoints ?? null,
    isNeutralSite: cfbdGame.neutralSite ?? false,
    isConferenceGame: cfbdGame.conferenceGame ?? null,
    isPostseason,
    excitementIndex: cfbdGame.exciteIndex ? Number(cfbdGame.exciteIndex) : null,
    spread: cfbdGame.spread ? Number(cfbdGame.spread) : null,
    metadata: {
      venue: cfbdGame.venue,
      venue_id: cfbdGame.venueId,
      attendance: cfbdGame.attendance,
      highlights: cfbdGame.highlights,
      notes: cfbdGame.notes,
      home_line_scores: cfbdGame.homeLineScores,
      away_line_scores: cfbdGame.awayLineScores,
      home_pregame_elo: cfbdGame.homePregameElo,
      away_pregame_elo: cfbdGame.awayPregameElo,
      home_postgame_elo: cfbdGame.homePostgameElo,
      away_postgame_elo: cfbdGame.awayPostgameElo,
    } as Record<string, unknown>,
  };
}

/**
 * Seed games for a specific year and season type
 */
async function seedGamesForYear(
  year: number,
  teamMap: Map<string, number>
): Promise<{ created: number; updated: number; skipped: number }> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const seasonId = await getSeasonId(year);

  // Get regular season games
  console.log(`Fetching ${year} regular season games...`);
  const regularGames = await getGames(year, undefined, "regular");
  console.log(`  Found ${regularGames.length} regular season games`);
  await delay(1000);

  // Get postseason games
  console.log(`Fetching ${year} postseason games...`);
  const postGames = await getGames(year, undefined, "postseason");
  console.log(`  Found ${postGames.length} postseason games`);
  await delay(1000);

  const allGames = [...regularGames, ...postGames];
  console.log(`  Total games: ${allGames.length}`);

  // Debug first game
  if (allGames.length > 0) {
    const firstGame = allGames[0];
    console.log(`    First CFBD game:`, JSON.stringify(firstGame, null, 2).substring(0, 500));
  }

  // Process games in batches
  const batchSize = 50;
  let processedFirst = 0;

  for (let i = 0; i < allGames.length; i++) {
    const cfbdGame = allGames[i];

    const homeTeamName = cfbdGame.homeTeam?.toLowerCase().trim();
    const awayTeamName = cfbdGame.awayTeam?.toLowerCase().trim();

    if (!homeTeamName || !awayTeamName) {
      skipped++;
      continue;
    }

    const homeTeamId = teamMap.get(homeTeamName);
    const awayTeamId = teamMap.get(awayTeamName);

    if (!homeTeamId || !awayTeamId) {
      skipped++;
      if (processedFirst < 5) {
        console.log(`    Skipping: ${cfbdGame.homeTeam} vs ${cfbdGame.awayTeam} (teams not found)`);
        processedFirst++;
      }
      continue;
    }

    const gameData = cfbdGameToDbGame(cfbdGame, seasonId, homeTeamId, awayTeamId);

    try {
      // Debug: log first game
      if (processedFirst === 0) {
        console.log(`    First game: ${cfbdGame.homeTeam} vs ${cfbdGame.awayTeam}, week: ${gameData.week}, gameDate: ${gameData.gameDate}`);
        console.log(`    homeTeamId: ${homeTeamId}, awayTeamId: ${awayTeamId}, seasonId: ${seasonId}`);
        processedFirst++;
      }

      // Check if game exists by season + teams + week
      const existing = await prisma.game.findFirst({
        where: {
          seasonId,
          homeTeamId,
          awayTeamId,
          week: gameData.week,
        },
      });

      if (existing) {
        // Update existing game
        await prisma.game.update({
          where: { id: existing.id },
          data: {
            ...gameData,
            metadata: {
              ...(existing.metadata as Record<string, unknown>),
              ...gameData.metadata,
            },
          },
        });
        updated++;
      } else {
        // Create new game
        await prisma.game.create({
          data: gameData,
        });
        created++;

        // Log first created game
        if (created === 1) {
          console.log(`    Created first game: ${cfbdGame.homeTeam} vs ${cfbdGame.awayTeam}`);
        }
      }
    } catch (error) {
      console.error(`    Error saving game ${cfbdGame.homeTeam} vs ${cfbdGame.awayTeam}:`, error);
      skipped++;
    }

    // Progress indicator
    if ((i + 1) % batchSize === 0) {
      console.log(`    Processed ${i + 1}/${allGames.length} games... (created: ${created}, updated: ${updated}, skipped: ${skipped})`);
      await delay(500);
    }
  }

  console.log(`  Final: ${created} created, ${updated} updated, ${skipped} skipped`);

  return { created, updated, skipped };
}

/**
 * Enrich games with advanced stats (optional, expensive on API calls)
 */
async function enrichGamesWithAdvancedStats(
  year: number,
  maxGames: number = 100
): Promise<void> {
  console.log(`\nEnriching games with advanced stats (limited to ${maxGames} games)...`);

  const seasonId = await getSeasonId(year);

  // Get games without advanced stats
  const games = await prisma.game.findMany({
    where: {
      seasonId,
      homeEpa: null,
    },
    take: maxGames,
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  console.log(`  Found ${games.length} games to enrich`);

  for (const game of games) {
    try {
      // Try to get advanced box score
      const cfbdId = (game.metadata as { cfbd_id?: string })?.cfbd_id;
      if (!cfbdId) continue;

      const advanced = await getAdvancedBoxScore(parseInt(cfbdId));

      await prisma.game.update({
        where: { id: game.id },
        data: {
          homeEpa: advanced.home_ppa?.offense ?? null,
          awayEpa: advanced.away_ppa?.offense ?? null,
          homeSuccessRate: advanced.home_success_rate?.offense ?? null,
          awaySuccessRate: advanced.away_success_rate?.offense ?? null,
          homeExplosiveness: advanced.home_explosiveness?.offense ?? null,
          awayExplosiveness: advanced.away_explosiveness?.offense ?? null,
        },
      });

      await delay(500);
    } catch (error) {
      console.error(`    Error enriching game ${game.id}: ${error}`);
    }
  }
}

/**
 * Seed games across multiple years
 */
async function main() {
  const args = process.argv.slice(2);
  const startYear = args[0] ? parseInt(args[0]) : 2024;
  const endYear = args[1] ? parseInt(args[1]) : startYear;
  const enrich = args.includes("--enrich");

  console.log("🏈 Starting games seeding...");
  console.log(`   Years: ${startYear} - ${endYear}`);
  console.log(`   Enrich: ${enrich ? "Yes" : "No"}`);

  try {
    // Build team map
    console.log("\nBuilding team ID map...");
    const teamMap = await getTeamIdMap();
    console.log(`   Loaded ${teamMap.size} team mappings`);

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    // Seed games for each year
    for (let year = startYear; year <= endYear; year++) {
      console.log(`\n${"=".repeat(50)}`);
      console.log(`Processing ${year} season`);
      console.log(`${"=".repeat(50)}`);

      const { created, updated, skipped } = await seedGamesForYear(year, teamMap);

      totalCreated += created;
      totalUpdated += updated;
      totalSkipped += skipped;

      console.log(`  ${year}: ${created} created, ${updated} updated, ${skipped} skipped`);

      // Optional: Enrich with advanced stats
      if (enrich) {
        await enrichGamesWithAdvancedStats(year, 50);
      }

      // Longer delay between years
      await delay(2000);
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ Games seeding complete!");
    console.log(`   Total: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped`);
  } catch (error) {
    console.error("Error during games seeding:", error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
