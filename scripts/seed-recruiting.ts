/**
 * Seed Recruiting Script
 *
 * Fetches recruiting data from CFBD API and seeds:
 * - Players (recruiting ratings, rankings)
 * - Transfer portal data
 *
 * Usage: npm run seed:recruiting
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  getRecruitingPlayersByTeam,
  getRecruitingTeams,
  getTransferPortal,
  delay,
  type CFBDRecruitingPlayer,
  type CFBDTransfer,
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
 * Map team names to database IDs
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

  return teamMap;
}

/**
 * Get or create a player record
 */
async function getOrCreatePlayer(
  cfbdPlayer: CFBDRecruitingPlayer,
  teamIdMap: Map<string, number>
): Promise<number | null> {
  const teamName = cfbdPlayer.committedTo?.toLowerCase().trim();
  if (!teamName) return null;

  const teamId = teamIdMap.get(teamName);
  if (!teamId) return null;

  // Check for existing player by name + recruiting year
  const existing = await prisma.player.findFirst({
    where: {
      name: cfbdPlayer.name,
      recruitClassYear: cfbdPlayer.year,
    },
  });

  if (existing) {
    // Update existing player
    await prisma.player.update({
      where: { id: existing.id },
      data: {
        currentTeamId: teamId,
        position: cfbdPlayer.position,
        heightInches: Math.round(cfbdPlayer.height),
        weightLbs: cfbdPlayer.weight,
        recruitRating: cfbdPlayer.rating ? Number(cfbdPlayer.rating) : null,
        recruitStars: cfbdPlayer.stars,
        recruitComposite: cfbdPlayer.rating ? Number(cfbdPlayer.rating) : null,
        recruitNationalRank: cfbdPlayer.ranking,
        recruitClassYear: cfbdPlayer.year,
        hometown: `${cfbdPlayer.city}, ${cfbdPlayer.stateProvince}`,
        homeState: cfbdPlayer.stateProvince,
        highSchool: cfbdPlayer.school,
        metadata: {
          cfbd_id: cfbdPlayer.id,
          athlete_id: cfbdPlayer.athleteId,
          recruit_type: cfbdPlayer.recruitType,
          school: cfbdPlayer.school,
          hometown_info: cfbdPlayer.hometownInfo,
        },
      },
    });

    return existing.id;
  }

  // Create new player
  const player = await prisma.player.create({
    data: {
      name: cfbdPlayer.name,
      position: cfbdPlayer.position,
      heightInches: Math.round(cfbdPlayer.height),
      weightLbs: cfbdPlayer.weight,
      recruitRating: cfbdPlayer.rating ? Number(cfbdPlayer.rating) : null,
      recruitStars: cfbdPlayer.stars,
      recruitComposite: cfbdPlayer.rating ? Number(cfbdPlayer.rating) : null,
      recruitNationalRank: cfbdPlayer.ranking,
      recruitClassYear: cfbdPlayer.year,
      hometown: `${cfbdPlayer.city}, ${cfbdPlayer.stateProvince}`,
      homeState: cfbdPlayer.stateProvince,
      highSchool: cfbdPlayer.school,
      currentTeamId: teamId,
      metadata: {
        cfbd_id: cfbdPlayer.id,
        athlete_id: cfbdPlayer.athleteId,
        recruit_type: cfbdPlayer.recruitType,
        school: cfbdPlayer.school,
        hometown_info: cfbdPlayer.hometownInfo,
      },
    },
  });

  return player.id;
}

/**
 * Seed recruiting data for a specific year using team-based fetching
 */
async function seedRecruitingForYear(
  year: number,
  teamNames: string[]
): Promise<{ created: number; updated: number; skipped: number }> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  console.log(`Fetching recruiting data for ${year} across ${teamNames.length} teams...`);

  const teamMap = await getTeamIdMap();
  const processedNames = new Set<string>();
  let totalPlayers = 0;

  for (const teamName of teamNames) {
    try {
      const players = await getRecruitingPlayersByTeam(year, teamName);
      totalPlayers += players.length;

      for (const player of players) {
        const uniqueKey = `${player.name}_${player.year}`;

        if (processedNames.has(uniqueKey)) {
          skipped++;
          continue;
        }
        processedNames.add(uniqueKey);

        try {
          const playerId = await getOrCreatePlayer(player, teamMap);

          if (playerId) {
            // Check if this was a create or update
            const existing = await prisma.player.findUnique({
              where: { id: playerId },
            });

            if (existing && existing.createdAt.getTime() === existing.updatedAt.getTime()) {
              created++;
            } else {
              updated++;
            }
          } else {
            skipped++;
          }
        } catch (error) {
          console.error(`    Error processing player ${player.name}: ${error}`);
          skipped++;
        }
      }

      // Rate limiting - delay between team requests
      await delay(300);

      // Progress indicator
      if ((created + updated) % 500 === 0) {
        console.log(`    Processed ${created + updated} players so far...`);
      }
    } catch (error) {
      console.error(`    Error fetching recruiting data for ${teamName}: ${error}`);
      skipped++;
    }
  }

  console.log(`  Total players processed: ${totalPlayers}`);

  return { created, updated, skipped };
}

/**
 * Seed transfer portal data
 */
async function seedTransfersForYear(
  year: number
): Promise<{ created: number; updated: number; skipped: number }> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  console.log(`\nFetching transfer portal data for ${year}...`);

  const transfers = await getTransferPortal(year);
  console.log(`  Found ${transfers.length} transfers`);

  const teamMap = await getTeamIdMap();

  for (const transfer of transfers) {
    const fromTeamName = transfer.outgoing_team?.toLowerCase().trim();
    const toTeamName = transfer.incoming_team?.toLowerCase().trim();

    if (!fromTeamName || !toTeamName) {
      skipped++;
      continue;
    }

    const fromTeamId = teamMap.get(fromTeamName);
    const toTeamId = teamMap.get(toTeamName);

    if (!fromTeamId || !toTeamId) {
      skipped++;
      continue;
    }

    try {
      // Find existing player or create placeholder
      let player = await prisma.player.findFirst({
        where: {
          name: transfer.name,
        },
      });

      if (!player) {
        // Create placeholder player
        player = await prisma.player.create({
          data: {
            name: transfer.name,
            position: transfer.position,
            hometown: transfer.home_state,
            homeState: transfer.home_state,
            currentTeamId: toTeamId,
            metadata: {
              transfer_entry: true,
            },
          },
        });
      }

      // Check for existing transfer record
      const existingTransfer = await prisma.playerTransfer.findFirst({
        where: {
          playerId: player.id,
          fromTeamId,
          toTeamId,
          transferYear: year,
        },
      });

      if (existingTransfer) {
        // Update
        await prisma.playerTransfer.update({
          where: { id: existingTransfer.id },
          data: {
            previousEpa: null, // Would need play-by-play data
            previousSnaps: null,
            postTransferEpa: null,
            postTransferSnaps: null,
            status: "enrolled",
            metadata: {
              rating_type: transfer.rating_type,
              rating_num: transfer.rating_num,
              rating_str: transfer.rating_str,
              incoming_conference: transfer.incoming_conference,
              outgoing_conference: transfer.outgoing_conference,
            },
          },
        });
        updated++;
      } else {
        // Create
        await prisma.playerTransfer.create({
          data: {
            playerId: player.id,
            fromTeamId,
            toTeamId,
            transferYear: year,
            status: "enrolled",
            metadata: {
              rating_type: transfer.rating_type,
              rating_num: transfer.rating_num,
              rating_str: transfer.rating_str,
              incoming_conference: transfer.incoming_conference,
              outgoing_conference: transfer.outgoing_conference,
            },
          },
        });
        created++;
      }
    } catch (error) {
      console.error(`    Error processing transfer ${transfer.name}: ${error}`);
      skipped++;
    }

    // Rate limiting
    if ((created + updated) % 50 === 0) {
      await delay(500);
    }
  }

  return { created, updated, skipped };
}

/**
 * Main seeding function
 */
async function main() {
  const args = process.argv.slice(2);
  const startYear = args[0] ? parseInt(args[0]) : 2024;
  const endYear = args[1] ? parseInt(args[1]) : startYear;
  const includeFCS = args.includes("--fcs");
  const includeTransfers = args.includes("--transfers");
  const limitTeams = args.includes("--limit");

  console.log("🏈 Starting recruiting data seeding...");
  console.log(`   Years: ${startYear} - ${endYear}`);
  console.log(`   Include FCS: ${includeFCS ? "Yes" : "No"}`);
  console.log(`   Include Transfers: ${includeTransfers ? "Yes" : "No"}`);
  console.log(`   Limit Teams: ${limitTeams ? "Yes (top 50)" : "No"}`);

  try {
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    // Get list of teams to fetch recruiting data for
    const teams = await prisma.team.findMany({
      where: includeFCS ? {} : {
        level: {
          name: "FBS",
        },
      },
      select: {
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const teamNames = teams.map((t) => t.name);

    // Limit to first 50 teams for testing if --limit flag is set
    const teamsToFetch = limitTeams ? teamNames.slice(0, 50) : teamNames;

    console.log(`   Found ${teamNames.length} teams, fetching recruiting data for ${teamsToFetch.length} teams`);

    // Seed recruiting data
    for (let year = startYear; year <= endYear; year++) {
      console.log(`\n${"=".repeat(50)}`);
      console.log(`Processing ${year} recruiting class`);
      console.log(`${"=".repeat(50)}`);

      const recruitingResult = await seedRecruitingForYear(year, teamsToFetch);
      totalCreated += recruitingResult.created;
      totalUpdated += recruitingResult.updated;
      totalSkipped += recruitingResult.skipped;

      console.log(`  ${year}: ${recruitingResult.created} created, ${recruitingResult.updated} updated, ${recruitingResult.skipped} skipped`);
      await delay(1000);

      // Transfer portal (if requested)
      if (includeTransfers) {
        const transferResult = await seedTransfersForYear(year);
        totalCreated += transferResult.created;
        totalUpdated += transferResult.updated;
        totalSkipped += transferResult.skipped;

        console.log(`  Transfers: ${transferResult.created} created, ${transferResult.updated} updated, ${transferResult.skipped} skipped`);
        await delay(1000);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ Recruiting seeding complete!");
    console.log(`   Total: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped`);
  } catch (error) {
    console.error("Error during recruiting seeding:", error);
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
