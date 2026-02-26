/**
 * Seed Teams Script
 *
 * Fetches all teams from CFBD API and seeds the database with:
 * - Teams (with colors, metadata)
 * - Conferences (mapped to levels)
 * - Levels (FBS, FCS, D2, D3, NAIA)
 * - Sport (College Football)
 * - Seasons (2014-present)
 *
 * Usage: npm run db:seed
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  getTeams,
  getConferences,
  getVenues,
  delay,
  type CFBDTeam,
  type CFBDConference,
  type CFBDVenue,
} from "@/lib/cfbd/client";
import { teamSlugify, conferenceSlugify } from "@/lib/utils/slugify";
import { getTeamColors } from "@/lib/data/team-colors";

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

// Level classification mapping from CFBD
// CFBD returns lowercase classifications like "fbs", "fcs", "ii", "iii", "none"
const LEVEL_CLASSIFICATION: Record<string, string> = {
  // Uppercase variants
  FBS: "FBS",
  FCS: "FCS",
  "FBS (FCS)": "FCS",
  "FCS (FBS)": "FBS",
  // Lowercase variants (actual API responses)
  fbs: "FBS",
  fcs: "FCS",
  ii: "D2",
  iii: "D3",
  naia: "NAIA",
  // "none" typically means FCS for smaller schools
  none: "FCS",
};

/**
 * Map CFBD conferences to levels
 */
const CONFERENCE_LEVEL_MAP: Record<string, string> = {
  // FBS
  SEC: "FBS",
  "Big Ten": "FBS",
  "Big 12": "FBS",
  ACC: "FBS",
  "American Athletic": "FBS",
  "Mountain West": "FBS",
  "Conference USA": "FBS",
  "Sun Belt": "FBS",
  Independents: "FBS",
  "FBS Independents": "FBS",
  "FBS Independent": "FBS",

  // FCS
  CAA: "FCS",
  MVFC: "FCS",
  "Big Sky": "FCS",
  "Big South": "FCS",
  Ivy: "FCS",
  MEAC: "FCS",
  NEC: "FCS",
  "Ohio Valley": "FCS",
  Patriot: "FCS",
  "Pioneer (FCS)": "FCS",
  "Southern Conference": "FCS",
  Southland: "FCS",
  SWAC: "FCS",
  "FCS Independents": "FCS",
  "FCS Independent": "FCS",
  Independent: "FCS",

  // D2 (CFBD doesn't fully track these, but we'll add placeholders)
  "Gulf South": "D2",
  "Great Lakes Intercollegiate": "D2",
  "Lone Star": "D2",
  MIAA: "D2",
  NSIC: "D2",
  "Pennsylvania State Athletic": "D2",
  "Rocky Mountain": "D2",
  "South Atlantic": "D2",

  // D3
  "American Football": "D3",
  Centennial: "D3",
  "College Conference of Illinois": "D3",
  "Michigan Intercollegiate": "D3",
  "New England Women's and Men's": "D3",
  "North Coast": "D3",
  "Old Dominion Athletic": "D3",
  "Wisconsin Intercollegiate": "D3",

  // NAIA
  Frontier: "NAIA",
  "Great Plains": "NAIA",
  "Heart of America": "NAIA",
  "Mid-States": "NAIA",
  "Sooner Athletic": "NAIA",
};

/**
 * Base ratings for each level (for GridRank initialization)
 */
const LEVEL_BASE_RATINGS: Record<string, number> = {
  FBS: 1500,
  FCS: 1200,
  D2: 1000,
  D3: 800,
  NAIA: 700,
};

/**
 * Create or get the College Football sport record
 */
async function ensureSport(): Promise<{ id: number }> {
  const sport = await prisma.sport.upsert({
    where: { slug: "college-football" },
    update: {},
    create: {
      name: "College Football",
      slug: "college-football",
    },
  });
  return sport;
}

/**
 * Create or get levels for the sport
 */
async function ensureLevels(sportId: number): Promise<Map<string, number>> {
  const levelMap = new Map<string, number>();

  const levels = ["FBS", "FCS", "D2", "D3", "NAIA"];

  for (const levelName of levels) {
    const level = await prisma.level.upsert({
      where: {
        sportId_slug: {
          sportId,
          slug: levelName.toLowerCase(),
        },
      },
      update: {},
      create: {
        sportId,
        name: levelName,
        slug: levelName.toLowerCase(),
        baseRating: LEVEL_BASE_RATINGS[levelName],
      },
    });
    levelMap.set(levelName, level.id);
  }

  return levelMap;
}

/**
 * Create or get conferences and map them to levels
 */
async function ensureConferences(
  levelMap: Map<string, number>
): Promise<Map<string, number>> {
  const conferenceMap = new Map<string, number>();

  // First, fetch all conferences from CFBD
  const cfbdConferences = await getConferences();
  console.log(`Found ${cfbdConferences.length} conferences from CFBD`);

  await delay(1000);

  for (const cfbdConf of cfbdConferences) {
    const levelName = CONFERENCE_LEVEL_MAP[cfbdConf.name] || "FCS";
    const levelId = levelMap.get(levelName);

    if (!levelId) {
      console.warn(`No level found for conference: ${cfbdConf.name}`);
      continue;
    }

    const slug = conferenceSlugify(cfbdConf.name);

    const conference = await prisma.conference.upsert({
      where: {
        levelId_slug: {
          levelId,
          slug,
        },
      },
      update: {},
      create: {
        levelId,
        name: cfbdConf.name,
        abbreviation: cfbdConf.abbreviation || cfbdConf.shortName,
        slug,
      },
    });

    conferenceMap.set(cfbdConf.name, conference.id);
  }

  // Add any missing conferences manually
  const additionalConferences = [
    { name: "Independent", abbreviation: "IND", level: "FBS" },
    { name: "FBS Independents", abbreviation: "FBS IND", level: "FBS" },
    { name: "FCS Independents", abbreviation: "FCS IND", level: "FCS" },
  ];

  for (const conf of additionalConferences) {
    if (conferenceMap.has(conf.name)) continue;

    const levelId = levelMap.get(conf.level);
    if (!levelId) continue;

    const slug = conferenceSlugify(conf.name);

    const conference = await prisma.conference.upsert({
      where: {
        levelId_slug: {
          levelId,
          slug,
        },
      },
      update: {},
      create: {
        levelId,
        name: conf.name,
        abbreviation: conf.abbreviation,
        slug,
      },
    });

    conferenceMap.set(conf.name, conference.id);
  }

  return conferenceMap;
}

/**
 * Seed teams from CFBD API
 */
async function seedTeams(
  levelMap: Map<string, number>,
  conferenceMap: Map<string, number>
): Promise<void> {
  console.log("Fetching teams from CFBD...");

  // Get teams across multiple years to ensure we catch all programs
  const years = [2024, 2023, 2022, 2021, 2020];
  const allTeams = new Map<string, CFBDTeam>();

  for (const year of years) {
    const teams = await getTeams(year);
    console.log(`Found ${teams.length} teams in ${year}`);

    for (const team of teams) {
      const key = `${team.school}_${team.classification}`;
      if (!allTeams.has(key)) {
        allTeams.set(key, team);
      }
    }

    await delay(1000);
  }

  console.log(`Total unique teams: ${allTeams.size}`);

  // Get venues for stadium information
  console.log("Fetching venues from CFBD...");
  const venues = await getVenues();
  const venueMap = new Map<string, CFBDVenue>();

  for (const venue of venues) {
    venueMap.set(venue.name, venue);
  }

  console.log(`Found ${venues.length} venues`);

  // Seed teams
  let created = 0;
  let updated = 0;

  for (const [key, cfbdTeam] of allTeams.entries()) {
    // Determine level
    let levelName = LEVEL_CLASSIFICATION[cfbdTeam.classification] || "FCS";

    // Special handling for teams that move between levels
    if (cfbdTeam.classification === "FBS (FCS)") {
      levelName = "FCS";
    } else if (cfbdTeam.classification === "FCS (FBS)") {
      levelName = "FBS";
    }

    const levelId = levelMap.get(levelName);
    if (!levelId) {
      console.warn(`No level found for team: ${cfbdTeam.school} (${cfbdTeam.classification})`);
      continue;
    }

    // Get conference
    const conferenceName = cfbdTeam.conference || "Independent";
    let conferenceId = conferenceMap.get(conferenceName);

    // Fallback to independent if no conference
    if (!conferenceId) {
      conferenceId = conferenceMap.get("Independent");
    }

    // Get team colors — prefer CFBD API colors, fall back to our curated database
    const curatedColors = getTeamColors(cfbdTeam.school);
    const primaryColor = cfbdTeam.color
      ? (cfbdTeam.color.startsWith("#") ? cfbdTeam.color : `#${cfbdTeam.color}`)
      : curatedColors.primary;
    const secondaryColor = cfbdTeam.alternateColor
      ? (cfbdTeam.alternateColor.startsWith("#") ? cfbdTeam.alternateColor : `#${cfbdTeam.alternateColor}`)
      : curatedColors.secondary;

    // Logo URLs from CFBD (typically [darkBgLogo, lightBgLogo])
    const logoUrl = cfbdTeam.logos?.[0] ?? undefined;

    // Generate slug
    const slug = teamSlugify(cfbdTeam.school);

    // Get venue info — try CFBD location first, then venue map
    const venue = venueMap.get(cfbdTeam.abbreviation);
    const metadata: Record<string, unknown> = {
      cfbd_id: cfbdTeam.id,
      alt_names: [cfbdTeam.altName1, cfbdTeam.altName2, cfbdTeam.altName3].filter(Boolean),
      logos: cfbdTeam.logos ?? [],
      twitter: cfbdTeam.twitter,
    };

    if (venue) {
      metadata.venue = {
        id: venue.id,
        elevation: venue.elevation,
        grass: venue.grass,
        dome: venue.dome,
        capacity: venue.capacity,
        year_constructed: venue.year_constructed,
      };
    }

    // Derive city/state from CFBD location or venue map
    const teamCity = cfbdTeam.location?.city ?? venue?.city;
    const teamState = cfbdTeam.location?.state ?? venue?.state;
    const teamStadium = cfbdTeam.location?.name ?? venue?.name ?? cfbdTeam.school + " Stadium";
    const teamCapacity = cfbdTeam.location?.capacity ?? venue?.capacity;

    // Upsert team
    try {
      const team = await prisma.team.upsert({
        where: { slug },
        update: {
          name: cfbdTeam.school,
          mascot: cfbdTeam.mascot,
          abbreviation: cfbdTeam.abbreviation,
          conferenceId,
          levelId,
          primaryColor,
          secondaryColor,
          logoUrl,
          city: teamCity,
          state: teamState,
          stadium: teamStadium,
          stadiumCapacity: teamCapacity,
          metadata,
        },
        create: {
          name: cfbdTeam.school,
          mascot: cfbdTeam.mascot,
          abbreviation: cfbdTeam.abbreviation,
          slug,
          conferenceId,
          levelId,
          primaryColor,
          secondaryColor,
          logoUrl,
          city: teamCity,
          state: teamState,
          stadium: teamStadium,
          stadiumCapacity: teamCapacity,
          metadata,
        },
      });

      if (team.createdAt.getTime() === team.updatedAt.getTime()) {
        created++;
      } else {
        updated++;
      }
    } catch (error) {
      console.error(`Error seeding team ${cfbdTeam.school}:`, error);
    }

    // Delay to avoid rate limiting
    if (created + updated % 50 === 0) {
      await delay(500);
    }
  }

  console.log(`Teams seeded: ${created} created, ${updated} updated`);
}

/**
 * Create seasons from 2014 to present
 */
async function seedSeasons(sportId: number): Promise<void> {
  const currentYear = new Date().getFullYear();
  const startYear = 2014;

  console.log(`Seeding seasons from ${startYear} to ${currentYear + 1}...`);

  for (let year = startYear; year <= currentYear + 1; year++) {
    try {
      await prisma.season.upsert({
        where: {
          sportId_year: {
            sportId,
            year,
          },
        },
        update: {
          isCurrent: year === currentYear,
        },
        create: {
          sportId,
          year,
          isCurrent: year === currentYear,
        },
      });
    } catch (error) {
      console.error(`Error creating season ${year}:`, error);
    }
  }

  console.log("Seasons seeded");
}

/**
 * Main seeding function
 */
async function main() {
  console.log("🏈 Starting team seeding...");

  try {
    // Ensure sport exists
    const sport = await ensureSport();
    console.log(`Sport: ${sport.name} (ID: ${sport.id})`);

    // Ensure levels exist
    const levelMap = await ensureLevels(sport.id);
    console.log(`Levels: ${Array.from(levelMap.keys()).join(", ")}`);

    // Ensure conferences exist
    const conferenceMap = await ensureConferences(levelMap);
    console.log(`Conferences: ${conferenceMap.size} total`);

    // Seed teams
    await seedTeams(levelMap, conferenceMap);

    // Seed seasons
    await seedSeasons(sport.id);

    // Print summary
    const teamCount = await prisma.team.count();
    const conferenceCount = await prisma.conference.count();
    const seasonCount = await prisma.season.count();

    console.log("\n✅ Seeding complete!");
    console.log(`   Teams: ${teamCount}`);
    console.log(`   Conferences: ${conferenceCount}`);
    console.log(`   Seasons: ${seasonCount}`);
  } catch (error) {
    console.error("Error during seeding:", error);
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
