/**
 * Mock Data Factory Functions
 * Generates realistic test data for all engines without database dependency.
 * Uses seeded randomness for deterministic, repeatable test data.
 */

import type {
  TeamBase,
  TeamWithRatings,
  TeamFull,
  ConferenceInfo,
  Level,
} from "@/types/team";
import type {
  GameBase,
  GameWithStats,
  GameResult,
  WinProbabilityPoint,
  UnitStats,
} from "@/types/game";
import type {
  TeamRating,
  RankingEntry,
  RankingSnapshot,
  RatingHistoryPoint,
  RatingHistory,
} from "@/types/ranking";
import type {
  ChaosGame,
  ChaosWeek,
  ChaosComponents,
  ChaosTag,
} from "@/types/chaos";
import type {
  CoachDecision,
  CoachGrade,
  DecisionType,
  FourthDownSituation,
} from "@/types/coach";
import type {
  PlayerBase,
  PlayerRecruiting,
  PlayerOutlier,
  Position,
  ClassYear,
} from "@/types/player";
import {
  LEVEL_PRIORS,
  CHAOS_WEIGHTS,
  MONTE_CARLO,
  CONFIDENCE_MULTIPLIER,
} from "@/lib/utils/constants";

// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================

/**
 * Creates a seeded PRNG for deterministic test data.
 * Uses linear congruential generator (same algorithm as Java's Random).
 */
function createSeededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * Creates a global seeded random generator.
 * Default seed is 42 (Hitchhiker's Guide reference).
 */
function getSeededRandom(seed: number = 42) {
  return createSeededRandom(seed);
}

// ============================================================================
// REAL TEAM DATA
// ============================================================================

const REAL_TEAMS: Array<{
  name: string;
  abbreviation: string;
  mascot: string;
  slug: string;
  level: Level;
  conference: string;
  city: string;
  state: string;
  primaryColor: string;
  secondaryColor: string;
  stadium: string;
  stadiumCapacity: number;
}> = [
  // FBS Power 5
  {
    name: "Ohio State University",
    abbreviation: "OSU",
    mascot: "Buckeyes",
    slug: "ohio-state",
    level: "FBS",
    conference: "Big Ten Conference",
    city: "Columbus",
    state: "OH",
    primaryColor: "#c40c0c",
    secondaryColor: "#ffffff",
    stadium: "Ohio Stadium",
    stadiumCapacity: 102780,
  },
  {
    name: "University of Michigan",
    abbreviation: "MICH",
    mascot: "Wolverines",
    slug: "michigan",
    level: "FBS",
    conference: "Big Ten Conference",
    city: "Ann Arbor",
    state: "MI",
    primaryColor: "#00274c",
    secondaryColor: "#ffb81c",
    stadium: "Michigan Stadium",
    stadiumCapacity: 107601,
  },
  {
    name: "University of Alabama",
    abbreviation: "BAMA",
    mascot: "Crimson Tide",
    slug: "alabama",
    level: "FBS",
    conference: "SEC",
    city: "Tuscaloosa",
    state: "AL",
    primaryColor: "#a71930",
    secondaryColor: "#ffffff",
    stadium: "Bryant-Denny Stadium",
    stadiumCapacity: 100077,
  },
  {
    name: "University of Georgia",
    abbreviation: "UGA",
    mascot: "Bulldogs",
    slug: "georgia",
    level: "FBS",
    conference: "SEC",
    city: "Athens",
    state: "GA",
    primaryColor: "#ba0021",
    secondaryColor: "#000000",
    stadium: "Sanford Stadium",
    stadiumCapacity: 92733,
  },
  {
    name: "University of Texas",
    abbreviation: "TX",
    mascot: "Longhorns",
    slug: "texas",
    level: "FBS",
    conference: "SEC",
    city: "Austin",
    state: "TX",
    primaryColor: "#ff6f20",
    secondaryColor: "#ffffff",
    stadium: "Darrell K Royal-Texas Memorial Stadium",
    stadiumCapacity: 100119,
  },
  {
    name: "University of Oregon",
    abbreviation: "ORE",
    mascot: "Ducks",
    slug: "oregon",
    level: "FBS",
    conference: "Big Ten Conference",
    city: "Eugene",
    state: "OR",
    primaryColor: "#154733",
    secondaryColor: "#ffcc00",
    stadium: "Autzen Stadium",
    stadiumCapacity: 54615,
  },
  {
    name: "University of Southern California",
    abbreviation: "USC",
    mascot: "Trojans",
    slug: "usc",
    level: "FBS",
    conference: "Big Ten Conference",
    city: "Los Angeles",
    state: "CA",
    primaryColor: "#990000",
    secondaryColor: "#ffb81c",
    stadium: "United Airlines Field at Los Angeles Memorial Coliseum",
    stadiumCapacity: 77500,
  },
  {
    name: "Clemson University",
    abbreviation: "CLEM",
    mascot: "Tigers",
    slug: "clemson",
    level: "FBS",
    conference: "ACC",
    city: "Clemson",
    state: "SC",
    primaryColor: "#a6192e",
    secondaryColor: "#ffffff",
    stadium: "Memorial Stadium",
    stadiumCapacity: 81500,
  },
  {
    name: "Pennsylvania State University",
    abbreviation: "PSU",
    mascot: "Nittany Lions",
    slug: "penn-state",
    level: "FBS",
    conference: "Big Ten Conference",
    city: "University Park",
    state: "PA",
    primaryColor: "#001f3f",
    secondaryColor: "#ffffff",
    stadium: "Beaver Stadium",
    stadiumCapacity: 106572,
  },
  {
    name: "University of Notre Dame",
    abbreviation: "ND",
    mascot: "Fighting Irish",
    slug: "notre-dame",
    level: "FBS",
    conference: "Independent",
    city: "South Bend",
    state: "IN",
    primaryColor: "#00205b",
    secondaryColor: "#ffb81c",
    stadium: "Notre Dame Stadium",
    stadiumCapacity: 77599,
  },
  {
    name: "University of Tennessee",
    abbreviation: "TENN",
    mascot: "Volunteers",
    slug: "tennessee",
    level: "FBS",
    conference: "SEC",
    city: "Knoxville",
    state: "TN",
    primaryColor: "#ff6600",
    secondaryColor: "#ffffff",
    stadium: "Neyland Stadium",
    stadiumCapacity: 101915,
  },
  {
    name: "Louisiana State University",
    abbreviation: "LSU",
    mascot: "Tigers",
    slug: "lsu",
    level: "FBS",
    conference: "SEC",
    city: "Baton Rouge",
    state: "LA",
    primaryColor: "#461d7c",
    secondaryColor: "#ffb81c",
    stadium: "Tiger Stadium",
    stadiumCapacity: 102733,
  },
  {
    name: "University of Florida",
    abbreviation: "UF",
    mascot: "Gators",
    slug: "florida",
    level: "FBS",
    conference: "SEC",
    city: "Gainesville",
    state: "FL",
    primaryColor: "#003366",
    secondaryColor: "#ff8200",
    stadium: "Ben Hill Griffin Stadium",
    stadiumCapacity: 88619,
  },
  {
    name: "University of Oklahoma",
    abbreviation: "OU",
    mascot: "Sooners",
    slug: "oklahoma",
    level: "FBS",
    conference: "SEC",
    city: "Norman",
    state: "OK",
    primaryColor: "#c60c30",
    secondaryColor: "#ffffff",
    stadium: "Gaylord Family Oklahoma Memorial Stadium",
    stadiumCapacity: 80126,
  },
  {
    name: "University of Wisconsin",
    abbreviation: "WISC",
    mascot: "Badgers",
    slug: "wisconsin",
    level: "FBS",
    conference: "Big Ten Conference",
    city: "Madison",
    state: "WI",
    primaryColor: "#c5050c",
    secondaryColor: "#ffffff",
    stadium: "Camp Randall Stadium",
    stadiumCapacity: 80321,
  },
  {
    name: "University of Miami",
    abbreviation: "MIA",
    mascot: "Hurricanes",
    slug: "miami",
    level: "FBS",
    conference: "ACC",
    city: "Coral Gables",
    state: "FL",
    primaryColor: "#003366",
    secondaryColor: "#ff8c00",
    stadium: "Hard Rock Stadium",
    stadiumCapacity: 64638,
  },
  {
    name: "Florida State University",
    abbreviation: "FSU",
    mascot: "Seminoles",
    slug: "florida-state",
    level: "FBS",
    conference: "ACC",
    city: "Tallahassee",
    state: "FL",
    primaryColor: "#782f40",
    secondaryColor: "#ffb81c",
    stadium: "Doak S. Campbell Stadium",
    stadiumCapacity: 79560,
  },
  {
    name: "Michigan State University",
    abbreviation: "MSU",
    mascot: "Spartans",
    slug: "michigan-state",
    level: "FBS",
    conference: "Big Ten Conference",
    city: "East Lansing",
    state: "MI",
    primaryColor: "#18453b",
    secondaryColor: "#ffffff",
    stadium: "Spartan Stadium",
    stadiumCapacity: 75005,
  },
  {
    name: "Auburn University",
    abbreviation: "AUB",
    mascot: "Tigers",
    slug: "auburn",
    level: "FBS",
    conference: "SEC",
    city: "Auburn",
    state: "AL",
    primaryColor: "#003366",
    secondaryColor: "#ff6600",
    stadium: "Jordan-Hare Stadium",
    stadiumCapacity: 87451,
  },
  {
    name: "University of Mississippi",
    abbreviation: "MISS",
    mascot: "Rebels",
    slug: "ole-miss",
    level: "FBS",
    conference: "SEC",
    city: "Oxford",
    state: "MS",
    primaryColor: "#a50021",
    secondaryColor: "#ffffff",
    stadium: "Vaught-Hemingway Stadium",
    stadiumCapacity: 74218,
  },

  // FCS
  {
    name: "North Dakota State University",
    abbreviation: "NDSU",
    mascot: "Bison",
    slug: "north-dakota-state",
    level: "FCS",
    conference: "Missouri Valley Football Conference",
    city: "Fargo",
    state: "ND",
    primaryColor: "#006645",
    secondaryColor: "#ffb81c",
    stadium: "Scheels Bank FCS Stadium",
    stadiumCapacity: 19287,
  },
  {
    name: "South Dakota State University",
    abbreviation: "SDSU",
    mascot: "Jackrabbits",
    slug: "south-dakota-state",
    level: "FCS",
    conference: "Missouri Valley Football Conference",
    city: "Brookings",
    state: "SD",
    primaryColor: "#ffb81c",
    secondaryColor: "#231f20",
    stadium: "Dana J. Dykehouse Stadium",
    stadiumCapacity: 19650,
  },
  {
    name: "University of Montana",
    abbreviation: "MONT",
    mascot: "Grizzlies",
    slug: "montana",
    level: "FCS",
    conference: "Big Sky Conference",
    city: "Missoula",
    state: "MT",
    primaryColor: "#6b2c3f",
    secondaryColor: "#ffd700",
    stadium: "Washington-Grizzly Stadium",
    stadiumCapacity: 29133,
  },

  // D2
  {
    name: "Northwest Missouri State University",
    abbreviation: "NWMSU",
    mascot: "Bearcats",
    slug: "northwest-missouri-state",
    level: "D2",
    conference: "MIAA",
    city: "Maryville",
    state: "MO",
    primaryColor: "#003d7a",
    secondaryColor: "#ffd700",
    stadium: "Bearcat Stadium",
    stadiumCapacity: 9881,
  },
  {
    name: "Ferris State University",
    abbreviation: "FSU",
    mascot: "Bulldogs",
    slug: "ferris-state",
    level: "D2",
    conference: "GLIAC",
    city: "Big Rapids",
    state: "MI",
    primaryColor: "#231f20",
    secondaryColor: "#ffd700",
    stadium: "Tony Saputo Stadium",
    stadiumCapacity: 8000,
  },

  // D3
  {
    name: "University of Mount Union",
    abbreviation: "MUOH",
    mascot: "Purple Raiders",
    slug: "mount-union",
    level: "D3",
    conference: "Ohio Athletic Conference",
    city: "Alliance",
    state: "OH",
    primaryColor: "#4a148c",
    secondaryColor: "#ffffff",
    stadium: "Witten Field",
    stadiumCapacity: 9000,
  },
  {
    name: "Mary Hardin-Baylor University",
    abbreviation: "MHB",
    mascot: "Crusaders",
    slug: "mary-hardin-baylor",
    level: "D3",
    conference: "ASC",
    city: "Belton",
    state: "TX",
    primaryColor: "#004687",
    secondaryColor: "#ffffff",
    stadium: "Crusader Stadium",
    stadiumCapacity: 5000,
  },

  // NAIA
  {
    name: "Morningside University",
    abbreviation: "MSU",
    mascot: "Mustangs",
    slug: "morningside",
    level: "NAIA",
    conference: "NAIA",
    city: "Sioux City",
    state: "IA",
    primaryColor: "#c60c0c",
    secondaryColor: "#ffffff",
    stadium: "Elwood P. Ploen Family Stadium",
    stadiumCapacity: 6500,
  },
  {
    name: "Marian University",
    abbreviation: "MU",
    mascot: "Knights",
    slug: "marian",
    level: "NAIA",
    conference: "NAIA",
    city: "Indianapolis",
    state: "IN",
    primaryColor: "#003da5",
    secondaryColor: "#ffffff",
    stadium: "Marian University Stadium",
    stadiumCapacity: 3500,
  },
  {
    name: "Grand View University",
    abbreviation: "GVU",
    mascot: "Vikings",
    slug: "grand-view",
    level: "NAIA",
    conference: "NAIA",
    city: "Des Moines",
    state: "IA",
    primaryColor: "#003d5b",
    secondaryColor: "#ffd700",
    stadium: "Grand View University Football Stadium",
    stadiumCapacity: 4000,
  },
];

// ============================================================================
// TEAM FACTORIES
// ============================================================================

/**
 * Creates a mock TeamBase (base info only)
 */
export function createMockTeam(
  overrides?: Partial<TeamBase>,
  seed: number = 42
): TeamBase {
  const rng = getSeededRandom(seed);
  const templateTeam = REAL_TEAMS[Math.floor(rng() * REAL_TEAMS.length)];

  return {
    id: overrides?.id ?? Math.floor(rng() * 10000),
    name: overrides?.name ?? templateTeam.name,
    mascot: overrides?.mascot ?? templateTeam.mascot,
    abbreviation: overrides?.abbreviation ?? templateTeam.abbreviation,
    slug: overrides?.slug ?? templateTeam.slug,
    primaryColor: overrides?.primaryColor ?? templateTeam.primaryColor,
    secondaryColor: overrides?.secondaryColor ?? templateTeam.secondaryColor,
    logoUrl:
      overrides?.logoUrl ??
      `https://logo.clearbit.com/${templateTeam.slug}.com`,
    city: overrides?.city ?? templateTeam.city,
    state: overrides?.state ?? templateTeam.state,
    stadium: overrides?.stadium ?? templateTeam.stadium,
    stadiumCapacity:
      overrides?.stadiumCapacity ?? templateTeam.stadiumCapacity,
    metadata: overrides?.metadata ?? null,
    createdAt: overrides?.createdAt ?? new Date("2024-01-01"),
    updatedAt: overrides?.updatedAt ?? new Date(),
  };
}

/**
 * Creates a mock TeamWithRatings (includes Glicko-2 data)
 */
export function createMockTeamWithRatings(
  overrides?: Partial<TeamWithRatings>,
  seed: number = 42
): TeamWithRatings {
  const rng = getSeededRandom(seed);
  const base = createMockTeam(overrides, seed);
  const templateTeam = REAL_TEAMS.find((t) => t.slug === base.slug);
  const level = (templateTeam?.level ?? "FBS") as Level;
  const prior = LEVEL_PRIORS[level];

  // Generate realistic rating based on level
  const ratingVariance = 150;
  const rating = prior.rating + (rng() - 0.5) * ratingVariance;
  const rd = prior.rd + (rng() - 0.5) * 50;
  const gamesPlayed = Math.floor(rng() * 12) + 1;

  return {
    ...base,
    conferenceId: overrides?.conferenceId ?? Math.floor(rng() * 30),
    level: overrides?.level ?? level,
    rating: overrides?.rating ?? rating,
    ratingDeviation: overrides?.ratingDeviation ?? rd,
    volatility: overrides?.volatility ?? prior.volatility + (rng() - 0.5) * 0.02,
    rank: overrides?.rank ?? Math.floor(rng() * 130) + 1,
    previousRank:
      overrides?.previousRank ??
      (Math.floor(rng() * 130) + 1),
    ratingChange: overrides?.ratingChange ?? (rng() - 0.5) * 50,
    offenseRating: overrides?.offenseRating ?? rating + (rng() - 0.5) * 60,
    defenseRating: overrides?.defenseRating ?? rating + (rng() - 0.5) * 60,
    sos: overrides?.sos ?? 1500 + (rng() - 0.5) * 200,
    wins: overrides?.wins ?? Math.floor(rng() * 12),
    losses: overrides?.losses ?? Math.floor(rng() * 3),
    playoffProbability:
      overrides?.playoffProbability ?? Math.min(rng() * 1.2, 1),
    sparkline:
      overrides?.sparkline ??
      createMockSparklineData(13, "up"),
    gamesPlayed: overrides?.gamesPlayed ?? gamesPlayed,
  };
}

/**
 * Creates a mock TeamFull (complete team data with history and context)
 */
export function createMockTeamPage(
  slug?: string,
  seed: number = 42
): {
  team: TeamFull;
  ratings: TeamRating;
  games: GameWithStats[];
  history: RatingHistory[];
} {
  const rng = getSeededRandom(seed);
  const templateTeam =
    REAL_TEAMS.find((t) => t.slug === slug) || REAL_TEAMS[0];
  const base = createMockTeamWithRatings(
    { slug: templateTeam.slug },
    seed
  );

  const team: TeamFull = {
    ...base,
    conference: {
      id: 1,
      name: templateTeam.conference,
      abbreviation: templateTeam.conference.slice(0, 3),
      slug: templateTeam.conference.toLowerCase().replace(/\s+/g, "-"),
      level: base.level,
      teamCount: Math.floor(rng() * 6) + 8,
      averageRating: base.rating - (rng() - 0.5) * 100,
      powerRank: Math.floor(rng() * 10) + 1,
    },
    recentGames: Array(5)
      .fill(null)
      .map((_, i) => ({
        gameId: Math.floor(rng() * 10000),
        opponent: REAL_TEAMS[Math.floor(rng() * REAL_TEAMS.length)].name,
        opponentSlug: REAL_TEAMS[Math.floor(rng() * REAL_TEAMS.length)].slug,
        opponentLogo: "",
        score: Math.ceil(rng() * 70),
        opponentScore: Math.ceil(rng() * 70),
        date: new Date(Date.now() - i * 604800000),
        isWin: rng() > 0.3,
        isHome: rng() > 0.4,
      })),
    rosterSize: Math.floor(rng() * 30) + 95,
    starters: Math.floor(rng() * 10) + 22,
    recruitingClassYear: 2024,
    avgRecruitRating: 85 + rng() * 20,
    fiveStars: Math.floor(rng() * 5),
    fourStars: Math.floor(rng() * 15),
    allTimeWins: Math.floor(rng() * 500) + 300,
    allTimeLosses: Math.floor(rng() * 300) + 150,
    bowlAppearances: Math.floor(rng() * 30) + 10,
    nationalChampionships: Math.floor(rng() * 3),
  };

  const ratings: TeamRating = {
    rating: base.rating,
    ratingDeviation: base.ratingDeviation,
    volatility: base.volatility,
    effectiveRating:
      base.rating - base.ratingDeviation * CONFIDENCE_MULTIPLIER,
    gamesPlayed: base.gamesPlayed,
    lastUpdated: new Date(),
  };

  const games: GameWithStats[] = Array(6)
    .fill(null)
    .map((_, i) => createMockGameWithStats({ season: 2024, week: i + 1 }, seed + i));

  const history: RatingHistory[] = [
    {
      teamId: base.id,
      teamName: base.name,
      season: 2024,
      history: Array(13)
        .fill(null)
        .map((_, week) => ({
          week,
          season: 2024,
          rating: base.rating + (rng() - 0.5) * 40,
          ratingDeviation: base.ratingDeviation + (rng() - 0.5) * 20,
          rank: Math.floor(rng() * 130) + 1,
          wins: week,
          losses: Math.max(0, week - Math.floor(rng() * 3)),
          date: new Date(Date.now() - (12 - week) * 604800000),
          sparkline: createMockSparklineData(13),
          playoffProbability: Math.min(rng() * 1.2, 1),
        })),
      preseasonRating: base.rating - (rng() - 0.5) * 100,
      peakRating: base.rating + Math.abs(rng() - 0.5) * 60,
      peakRatingWeek: Math.floor(rng() * 13),
      lowestRating: base.rating - Math.abs(rng() - 0.5) * 60,
      lowestRatingWeek: Math.floor(rng() * 13),
      finalRating: base.rating,
      totalRatingChange: (rng() - 0.5) * 100,
      avgVolatility: 0.06,
      madePlayoffs: rng() > 0.5,
      playoffSeed: rng() > 0.5 ? Math.floor(rng() * 4) + 1 : null,
      finalRank: Math.floor(rng() * 130) + 1,
    },
  ];

  return { team, ratings, games, history };
}

// ============================================================================
// RATING FACTORIES
// ============================================================================

/**
 * Creates a mock TeamRating (Glicko-2 components)
 */
export function createMockRating(
  overrides?: Partial<TeamRating>,
  seed: number = 42
): TeamRating {
  const rng = getSeededRandom(seed);
  const rating = overrides?.rating ?? 1500 + (rng() - 0.5) * 300;
  const rd = overrides?.ratingDeviation ?? 100 + rng() * 100;

  return {
    rating,
    ratingDeviation: rd,
    volatility: overrides?.volatility ?? 0.06 + (rng() - 0.5) * 0.03,
    effectiveRating:
      overrides?.effectiveRating ??
      rating - rd * CONFIDENCE_MULTIPLIER,
    gamesPlayed: overrides?.gamesPlayed ?? Math.floor(rng() * 12) + 1,
    lastUpdated: overrides?.lastUpdated ?? new Date(),
  };
}

/**
 * Creates a mock RankingEntry
 */
export function createMockRankingEntry(
  rank: number,
  overrides?: Partial<RankingEntry>,
  seed: number = 42
): RankingEntry {
  const rng = getSeededRandom(seed);
  const templateTeam = REAL_TEAMS[rank % REAL_TEAMS.length];
  const level = (templateTeam.level ?? "FBS") as Level;

  return {
    rank: overrides?.rank ?? rank,
    teamId: overrides?.teamId ?? Math.floor(rng() * 10000),
    teamName: overrides?.teamName ?? templateTeam.name,
    teamAbbr: overrides?.teamAbbr ?? templateTeam.abbreviation,
    logoUrl: overrides?.logoUrl ?? "",
    primaryColor: overrides?.primaryColor ?? templateTeam.primaryColor,
    level: overrides?.level ?? level,
    conference: overrides?.conference ?? templateTeam.conference,
    rating:
      overrides?.rating ??
      LEVEL_PRIORS[level].rating + (rng() - 0.5) * 150 - rank * 5,
    ratingDeviation: overrides?.ratingDeviation ?? 50 + rng() * 50,
    wins: overrides?.wins ?? Math.floor(rng() * 12),
    losses: overrides?.losses ?? Math.floor(rng() * 3),
    recordDisplay: overrides?.recordDisplay ?? `${Math.floor(rng() * 12)}-${Math.floor(rng() * 3)}`,
    rankChange: overrides?.rankChange ?? Math.floor((rng() - 0.5) * 10),
    ratingChange: overrides?.ratingChange ?? (rng() - 0.5) * 50,
    offenseRating:
      overrides?.offenseRating ??
      LEVEL_PRIORS[level].rating + (rng() - 0.5) * 60,
    defenseRating:
      overrides?.defenseRating ??
      LEVEL_PRIORS[level].rating + (rng() - 0.5) * 60,
    sos: overrides?.sos ?? 1500 + (rng() - 0.5) * 200,
    playoffProbability:
      overrides?.playoffProbability ?? Math.min(rng() * (1.5 - rank / 50), 1),
    sparkline: overrides?.sparkline ?? createMockSparklineData(13),
    trend: overrides?.trend ?? (rng() > 0.6 ? "up" : rng() > 0.3 ? "down" : "flat"),
    percentile: overrides?.percentile ?? Math.max(1, 100 - rank),
    levelPercentile:
      overrides?.levelPercentile ?? Math.max(1, 100 - rank / 2),
    conferencePercentile:
      overrides?.conferencePercentile ??
      Math.max(1, 100 - (rank % 14)),
    avgMarginOfVictory:
      overrides?.avgMarginOfVictory ?? (rng() - 0.5) * 30,
    gamesRemaining: overrides?.gamesRemaining ?? Math.max(0, 13 - Math.floor(rng() * 12)),
    playoffSeed: overrides?.playoffSeed ?? (rank <= 4 ? rank : null),
  };
}

/**
 * Creates a mock RankingSnapshot (all teams at a point in time)
 */
export function createMockRankingSnapshot(
  count: number = 130,
  seed: number = 42
): RankingSnapshot {
  const entries: RankingEntry[] = Array(count)
    .fill(null)
    .map((_, i) => createMockRankingEntry(i + 1, undefined, seed + i));

  return {
    rankingId: Math.floor(Math.random() * 100000),
    season: 2024,
    week: 10,
    weekLabel: "Week 10",
    computedAt: new Date(),
    algorithmVersion: "3.0.1",
    entries,
    fbsCount: entries.filter((e) => e.level === "FBS").length,
    fcsCount: entries.filter((e) => e.level === "FCS").length,
    d2Count: entries.filter((e) => e.level === "D2").length,
    d3Count: entries.filter((e) => e.level === "D3").length,
    naiaCount: entries.filter((e) => e.level === "NAIA").length,
    metadata: {
      gamesProcessed: 250,
      averageRating: entries.reduce((sum, e) => sum + e.rating, 0) / entries.length,
      ratingStdDev: 75,
      majorChanges: Math.floor(entries.length * 0.15),
      computationTimeMs: 450,
    },
  };
}

// ============================================================================
// GAME FACTORIES
// ============================================================================

/**
 * Creates a mock GameBase (minimal game info)
 */
export function createMockGame(
  overrides?: Partial<GameBase>,
  seed: number = 42
): GameBase {
  const rng = getSeededRandom(seed);

  return {
    id: overrides?.id ?? Math.floor(rng() * 100000),
    season: overrides?.season ?? 2024,
    week: overrides?.week ?? Math.floor(rng() * 15) + 1,
    gameDate: overrides?.gameDate ?? new Date(Date.now() - Math.floor(rng() * 2592000000)),
    homeTeamId: overrides?.homeTeamId ?? Math.floor(rng() * 10000),
    awayTeamId: overrides?.awayTeamId ?? Math.floor(rng() * 10000),
    homeScore: overrides?.homeScore ?? Math.ceil(rng() * 70),
    awayScore: overrides?.awayScore ?? Math.ceil(rng() * 70),
    isNeutralSite: overrides?.isNeutralSite ?? false,
    isConferenceGame: overrides?.isConferenceGame ?? rng() > 0.3,
    isPostseason: overrides?.isPostseason ?? false,
    metadata: overrides?.metadata ?? null,
    createdAt: overrides?.createdAt ?? new Date(),
    updatedAt: overrides?.updatedAt ?? new Date(),
  };
}

/**
 * Creates a mock GameWithStats (full game data with statistics)
 */
export function createMockGameWithStats(
  overrides?: Partial<GameWithStats>,
  seed: number = 42
): GameWithStats {
  const rng = getSeededRandom(seed);
  const base = createMockGame(overrides, seed);
  const homeScore = base.homeScore ?? Math.ceil(rng() * 70);
  const awayScore = base.awayScore ?? Math.ceil(rng() * 70);
  const margin = homeScore - awayScore;

  return {
    ...base,
    homeEpa: overrides?.homeEpa ?? (rng() - 0.5) * 0.5,
    awayEpa: overrides?.awayEpa ?? (rng() - 0.5) * 0.5,
    homeSuccessRate: overrides?.homeSuccessRate ?? 0.4 + rng() * 0.3,
    awaySuccessRate: overrides?.awaySuccessRate ?? 0.4 + rng() * 0.3,
    homeExplosiveness: overrides?.homeExplosiveness ?? 0.2 + rng() * 0.3,
    awayExplosiveness: overrides?.awayExplosiveness ?? 0.2 + rng() * 0.3,
    homeWinProb: overrides?.homeWinProb ?? (0.5 + margin / 100),
    spread: overrides?.spread ?? (rng() - 0.5) * 20,
    overUnder: overrides?.overUnder ?? homeScore + awayScore + (rng() - 0.5) * 10,
    excitementIndex: overrides?.excitementIndex ?? 30 + rng() * 70,
    homeTeamName: overrides?.homeTeamName ?? REAL_TEAMS[Math.floor(rng() * REAL_TEAMS.length)].name,
    awayTeamName: overrides?.awayTeamName ?? REAL_TEAMS[Math.floor(rng() * REAL_TEAMS.length)].name,
    homeTeamAbbr: overrides?.homeTeamAbbr ?? "HOME",
    awayTeamAbbr: overrides?.awayTeamAbbr ?? "AWAY",
    homeTeamLogo: overrides?.homeTeamLogo ?? "",
    awayTeamLogo: overrides?.awayTeamLogo ?? "",
    homeTeamLevel: overrides?.homeTeamLevel ?? "FBS",
    awayTeamLevel: overrides?.awayTeamLevel ?? "FBS",
    margin: overrides?.margin ?? margin,
    wasUpset: overrides?.wasUpset ?? (margin < 0 && rng() > 0.8),
    spreadCovered: overrides?.spreadCovered ?? rng() > 0.5,
    overHit: overrides?.overHit ?? rng() > 0.5,
  };
}

/**
 * Creates a WP (win probability) chart data
 */
export function createMockWPChartData(
  plays: number = 100,
  seed: number = 42
): WinProbabilityPoint[] {
  const rng = getSeededRandom(seed);
  const points: WinProbabilityPoint[] = [];
  let homeWP = 0.5;

  for (let i = 0; i < plays; i++) {
    const swing = (rng() - 0.5) * 0.15; // ±7.5% swings
    homeWP = Math.max(0.05, Math.min(0.95, homeWP + swing));

    points.push({
      homeWP,
      awayWP: 1 - homeWP,
      secondsRemaining: Math.floor(3600 - (i / plays) * 3600),
      eventId: i,
      label: i % 10 === 0 ? `Play ${i}` : null,
    });
  }

  return points;
}

// ============================================================================
// CHAOS FACTORIES
// ============================================================================

/**
 * Creates mock chaos components
 */
function createMockChaosComponents(
  overrides?: Partial<ChaosComponents>,
  seed: number = 42
): ChaosComponents {
  const rng = getSeededRandom(seed);

  return {
    spreadBustFactor: overrides?.spreadBustFactor ?? rng() * 100,
    wpVolatility: overrides?.wpVolatility ?? rng() * 100,
    upsetMagnitude: overrides?.upsetMagnitude ?? rng() * 100,
    excitementIndex: overrides?.excitementIndex ?? 30 + rng() * 70,
    contextWeight: overrides?.contextWeight ?? 0.8 + rng() * 0.8,
    postgameWpInversion: overrides?.postgameWpInversion ?? (rng() > 0.7 ? 1 : 0),
  };
}

/**
 * Creates a mock ChaosGame
 */
export function createMockChaosGame(
  overrides?: Partial<ChaosGame>,
  seed: number = 42
): ChaosGame {
  const rng = getSeededRandom(seed);
  const game = createMockGameWithStats(undefined, seed);
  const components = createMockChaosComponents(overrides?.components, seed);

  // Calculate chaos score from components
  const baseScore =
    (components.spreadBustFactor ?? 0) * CHAOS_WEIGHTS.spreadBustFactor +
    (components.wpVolatility ?? 0) * CHAOS_WEIGHTS.winProbVolatility +
    (components.upsetMagnitude ?? 0) * CHAOS_WEIGHTS.upsetMagnitude +
    (components.excitementIndex ?? 0) * CHAOS_WEIGHTS.excitementIndex +
    ((components.contextWeight ?? 1) - 1) * 50 * CHAOS_WEIGHTS.contextWeight +
    (components.postgameWpInversion ?? 0) * 100 * CHAOS_WEIGHTS.postgameWpInversion;

  const chaosScore = Math.min(100, Math.max(0, baseScore / 100));
  const tags: ChaosTag[] = [];

  if (chaosScore > 70) tags.push("THRILLER");
  if (Math.abs(game.margin ?? 0) > 20) tags.push("BLOWOUT_REVERSED");
  if (rng() > 0.7) tags.push("UPSET");
  if (rng() > 0.8) tags.push("COMEBACK");

  return {
    gameId: overrides?.gameId ?? game.id,
    game: overrides?.game ?? game,
    chaosScore: overrides?.chaosScore ?? chaosScore,
    chaosPercentile: overrides?.chaosPercentile ?? Math.floor(chaosScore),
    components: overrides?.components ?? components,
    tags: overrides?.tags ?? tags,
    headline: overrides?.headline ?? `Chaotic Battle (Score: ${Math.floor(chaosScore)})`,
    narrative: overrides?.narrative ?? null,
    winnerLowestWp: overrides?.winnerLowestWp ?? rng() * 0.5,
    wpCrosses50: overrides?.wpCrosses50 ?? Math.floor(rng() * 6),
    computedAt: overrides?.computedAt ?? new Date(),
    chaosPlay: overrides?.chaosPlay ?? null,
    season: overrides?.season ?? game.season,
    week: overrides?.week ?? game.week,
  };
}

/**
 * Creates a mock ChaosWeek
 */
export function createMockChaosWeek(
  gameCount: number = 12,
  seed: number = 42
): ChaosWeek {
  const rng = getSeededRandom(seed);
  const games: ChaosGame[] = Array(gameCount)
    .fill(null)
    .map((_, i) => createMockChaosGame(undefined, seed + i));

  const scores = games.map((g) => g.chaosScore ?? 0);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const medianScore = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];

  return {
    season: 2024,
    week: Math.floor(rng() * 15) + 1,
    weekLabel: `Week ${Math.floor(rng() * 15) + 1}`,
    totalGames: gameCount,
    averageChaosScore: avgScore,
    medianChaosScore: medianScore,
    topChaosScore: Math.max(...scores),
    lowestChaosScore: Math.min(...scores),
    topChaosGames: games.filter((g) => (g.chaosScore ?? 0) > 70),
    allTags: ["UPSET", "THRILLER", "COMEBACK"] as ChaosTag[],
    dominantTag: "UPSET" as ChaosTag,
    upsetCount: Math.floor(rng() * 4),
    comebackCount: Math.floor(rng() * 3),
    volatilityCount: Math.floor(rng() * 5),
    averageMargin: (rng() - 0.5) * 40,
    spreadBustGame: games[Math.floor(rng() * games.length)] ?? null,
    mostVolatileGame: games[Math.floor(rng() * games.length)] ?? null,
    weekSummary: null,
    computedAt: new Date(),
  };
}

// ============================================================================
// COACH FACTORIES
// ============================================================================

/**
 * Creates a mock CoachDecision
 */
export function createMockCoachDecision(
  overrides?: Partial<CoachDecision>,
  seed: number = 42
): CoachDecision {
  const rng = getSeededRandom(seed);

  const situation: FourthDownSituation = {
    gameId: Math.floor(rng() * 100000),
    down: 4,
    distance: Math.floor(rng() * 10) + 1,
    fieldPosition: Math.floor(rng() * 100),
    scoreDifferential: (rng() - 0.5) * 30,
    timeRemaining: `${Math.floor(rng() * 15)}:${Math.floor(rng() * 60).toString().padStart(2, '0')}`,
    quarter: (Math.floor(rng() * 4) + 1) as 1 | 2 | 3 | 4,
    winProbabilityBefore: rng(),
    expectedPointsFieldGoal: 3,
    expectedPointsGoForIt: 5,
    display: `4-and-${Math.floor(rng() * 10) + 1}`,
  };

  const wasOptimal = rng() > 0.4;

  return {
    decisionId: overrides?.decisionId ?? Math.floor(rng() * 100000),
    gameId: overrides?.gameId ?? Math.floor(rng() * 100000),
    teamId: overrides?.teamId ?? Math.floor(rng() * 10000),
    teamName: overrides?.teamName ?? REAL_TEAMS[Math.floor(rng() * REAL_TEAMS.length)].name,
    teamAbbr: overrides?.teamAbbr ?? "TEAM",
    coachName: overrides?.coachName ?? "Coach Smith",
    decisionType: overrides?.decisionType ?? ("4th_down" as DecisionType),
    situation: overrides?.situation ?? situation,
    decisionMade: overrides?.decisionMade ?? "Go for it",
    optimalDecision: overrides?.optimalDecision ?? "Punt",
    optimalConfidence: overrides?.optimalConfidence ?? 0.75,
    wasOptimal: overrides?.wasOptimal ?? wasOptimal,
    winProbabilityImpact: overrides?.winProbabilityImpact ?? (rng() - 0.5) * 0.2,
    optimalWinProbability: overrides?.optimalWinProbability ?? rng(),
    outcome: overrides?.outcome ?? (rng() > 0.5 ? "First down" : "Turnover"),
    workedOut: overrides?.workedOut ?? wasOptimal,
    fieldPosition: overrides?.fieldPosition ?? Math.floor(rng() * 100),
    gameTime: overrides?.gameTime ?? new Date(),
    clipUrl: overrides?.clipUrl ?? null,
    narrative: overrides?.narrative ?? null,
    highlighted: overrides?.highlighted ?? !wasOptimal,
    analyzedAt: overrides?.analyzedAt ?? new Date(),
  };
}

/**
 * Creates a mock CoachGrade
 */
export function createMockCoachGrade(
  overrides?: Partial<CoachGrade>,
  seed: number = 42
): CoachGrade {
  const rng = getSeededRandom(seed);
  const overallGrade = 65 + rng() * 35;

  const gradeLetterMap: Record<string, "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F"> = {
    "90": "A+",
    "85": "A",
    "80": "A-",
    "75": "B+",
    "70": "B",
    "65": "B-",
    "60": "C+",
    "55": "C",
    "50": "C-",
    "40": "D",
    "0": "F",
  };

  const gradeBucket = Math.floor(overallGrade / 5) * 5;
  const gradeLetter = gradeLetterMap[Math.min(gradeBucket, 90).toString()] || "B";

  return {
    gradeId: overrides?.gradeId ?? Math.floor(rng() * 100000),
    season: overrides?.season ?? 2024,
    teamId: overrides?.teamId ?? Math.floor(rng() * 10000),
    teamName: overrides?.teamName ?? REAL_TEAMS[Math.floor(rng() * REAL_TEAMS.length)].name,
    coachName: overrides?.coachName ?? "Coach Name",
    overallGrade: overrides?.overallGrade ?? overallGrade,
    overallGradeLetter: overrides?.overallGradeLetter ?? gradeLetter,
    fourthDownGrade: overrides?.fourthDownGrade ?? 60 + rng() * 40,
    fourthDownAggressiveness: overrides?.fourthDownAggressiveness ?? rng(),
    fourthDownAccuracy: overrides?.fourthDownAccuracy ?? 0.5 + rng() * 0.4,
    twoPtGrade: overrides?.twoPtGrade ?? 60 + rng() * 40,
    twoPtAccuracy: overrides?.twoPtAccuracy ?? 0.5 + rng() * 0.4,
    timeoutGrade: overrides?.timeoutGrade ?? 60 + rng() * 40,
    clockManagementGrade: overrides?.clockManagementGrade ?? 60 + rng() * 40,
    personnelGrade: overrides?.personnelGrade ?? 60 + rng() * 40,
    totalWpGained: overrides?.totalWpGained ?? rng() * 0.5,
    totalWpLost: overrides?.totalWpLost ?? rng() * 0.3,
    netWpImpact: overrides?.netWpImpact ?? (rng() - 0.5) * 0.4,
    decisionsCount: overrides?.decisionsCount ?? Math.floor(rng() * 30) + 10,
    optimalDecisions: overrides?.optimalDecisions ?? Math.floor(rng() * 20) + 5,
    optimalDecisionPercentage: overrides?.optimalDecisionPercentage ?? 0.5 + rng() * 0.4,
    fourthDownCalls: overrides?.fourthDownCalls ?? Math.floor(rng() * 8) + 2,
    twoPtCalls: overrides?.twoPtCalls ?? Math.floor(rng() * 4) + 1,
    strategicTimeouts: overrides?.strategicTimeouts ?? Math.floor(rng() * 4) + 1,
    teamRecord: overrides?.teamRecord ?? `${Math.floor(rng() * 12)}-${Math.floor(rng() * 3)}`,
    madePlayoffs: overrides?.madePlayoffs ?? rng() > 0.4,
    bestDecision: overrides?.bestDecision ?? null,
    worstDecision: overrides?.worstDecision ?? null,
    trendVsLastSeason: overrides?.trendVsLastSeason ?? (rng() - 0.5) * 20,
    tenure: overrides?.tenure ?? Math.floor(rng() * 10) + 1,
    careerGrade: overrides?.careerGrade ?? 60 + rng() * 40,
    narrative: overrides?.narrative ?? null,
    computedAt: overrides?.computedAt ?? new Date(),
  };
}

// ============================================================================
// PLAYER FACTORIES
// ============================================================================

/**
 * Creates a mock PlayerBase
 */
export function createMockPlayer(
  overrides?: Partial<PlayerBase>,
  seed: number = 42
): PlayerBase {
  const rng = getSeededRandom(seed);
  const positions: Position[] = [
    "QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"
  ] as Position[];
  const firstNames = ["James", "John", "Michael", "David", "Robert"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones"];

  return {
    id: overrides?.id ?? Math.floor(rng() * 100000),
    cfbdId: overrides?.cfbdId ?? Math.floor(rng() * 100000),
    name: overrides?.name ?? `${firstNames[Math.floor(rng() * firstNames.length)]} ${lastNames[Math.floor(rng() * lastNames.length)]}`,
    position: overrides?.position ?? positions[Math.floor(rng() * positions.length)],
    currentTeamId: overrides?.currentTeamId ?? Math.floor(rng() * 10000),
    heightInches: overrides?.heightInches ?? 70 + Math.floor(rng() * 6),
    weightLbs: overrides?.weightLbs ?? 200 + Math.floor(rng() * 100),
    class: overrides?.class ?? (["FR", "SO", "JR", "SR"] as ClassYear[])[Math.floor(rng() * 4)],
    eligibilityRemaining: overrides?.eligibilityRemaining ?? Math.floor(rng() * 4),
    hometown: overrides?.hometown ?? "Hometown, USA",
    homeState: overrides?.homeState ?? "TX",
    highSchool: overrides?.highSchool ?? "High School",
    createdAt: overrides?.createdAt ?? new Date(),
    updatedAt: overrides?.updatedAt ?? new Date(),
  };
}

/**
 * Creates a mock PlayerRecruiting
 */
export function createMockRecruit(
  overrides?: Partial<PlayerRecruiting>,
  seed: number = 42
): PlayerRecruiting {
  const rng = getSeededRandom(seed);
  const base = createMockPlayer(overrides, seed);

  return {
    ...base,
    recruitRating: overrides?.recruitRating ?? 800 + rng() * 200,
    recruitStars: overrides?.recruitStars ?? Math.ceil(rng() * 5),
    recruitComposite: overrides?.recruitComposite ?? 800 + rng() * 200,
    recruitNationalRank: overrides?.recruitNationalRank ?? Math.floor(rng() * 2000),
    recruitPositionRank: overrides?.recruitPositionRank ?? Math.floor(rng() * 100),
    recruitStateRank: overrides?.recruitStateRank ?? Math.floor(rng() * 200),
    recruitClassYear: overrides?.recruitClassYear ?? 2024,
    classRank: overrides?.classRank ?? Math.floor(rng() * 30),
    ratingServices: overrides?.ratingServices ?? ["247Sports", "Rivals"],
    commitmentStatus: overrides?.commitmentStatus ?? "committed" as const,
  };
}

/**
 * Creates a mock PlayerOutlier
 */
export function createMockOutlier(
  overrides?: Partial<PlayerOutlier>,
  seed: number = 42
): PlayerOutlier {
  const rng = getSeededRandom(seed);
  const categories = [
    "EPA Monsters",
    "Surgical Precision",
    "Coverage Safeties",
    "Turnover Generators",
  ];

  return {
    outlierId: overrides?.outlierId ?? Math.floor(rng() * 100000),
    season: overrides?.season ?? 2024,
    playerName: overrides?.playerName ?? "Player Name",
    position: overrides?.position ?? "QB",
    teamId: overrides?.teamId ?? Math.floor(rng() * 10000),
    teamName: overrides?.teamName ?? REAL_TEAMS[Math.floor(rng() * REAL_TEAMS.length)].name,
    category: overrides?.category ?? categories[Math.floor(rng() * categories.length)],
    statLabel: overrides?.statLabel ?? "EPA per play",
    statValue: overrides?.statValue ?? (rng() - 0.5) * 1,
    zscore: overrides?.zscore ?? 2 + rng() * 4,
    percentile: overrides?.percentile ?? 90 + rng() * 10,
    detail: overrides?.detail ?? "Top 1% in EPA",
    significance: overrides?.significance ?? "Exceptional performance",
    photoUrl: overrides?.photoUrl ?? null,
    computedAt: overrides?.computedAt ?? new Date(),
  };
}

// ============================================================================
// UTILITY FACTORIES
// ============================================================================

/**
 * Creates sparkline data (trend line)
 */
export function createMockSparklineData(
  points: number = 13,
  trend: "up" | "down" | "flat" = "flat",
  seed: number = 42
): number[] {
  const rng = getSeededRandom(seed);
  const data: number[] = [];
  let value = 1500;

  for (let i = 0; i < points; i++) {
    const variance = (rng() - 0.5) * 40; // ±20 rating points
    let trendComponent = 0;

    if (trend === "up") {
      trendComponent = (i / points) * 60;
    } else if (trend === "down") {
      trendComponent = -(i / points) * 60;
    }

    value += variance + trendComponent;
    data.push(Math.round(value));
  }

  return data;
}

// ============================================================================
// COMPOSITE PAGE FACTORIES
// ============================================================================

/**
 * Creates mock rankings page data
 */
export function createMockRankingsPage(options?: {
  count?: number;
  level?: Level;
}): {
  rankings: RankingEntry[];
  meta: { season: number; week: number; total: number };
} {
  const count = options?.count ?? 130;
  const snapshot = createMockRankingSnapshot(count);

  let rankings = snapshot.entries;
  if (options?.level) {
    rankings = rankings.filter((e) => e.level === options.level);
  }

  return {
    rankings,
    meta: {
      season: snapshot.season,
      week: snapshot.week ?? 0,
      total: rankings.length,
    },
  };
}

/**
 * Creates mock matchup simulation result
 */
export function createMockMatchupResult(
  teamA?: string,
  teamB?: string,
  seed: number = 42
): {
  teamA: { name: string; winProbability: number; wins: number };
  teamB: { name: string; winProbability: number; wins: number };
  simulations: number;
  spread: number;
} {
  const rng = getSeededRandom(seed);

  const teamAWins = Math.floor(rng() * MONTE_CARLO.SIMULATIONS);
  const teamBWins = MONTE_CARLO.SIMULATIONS - teamAWins;

  return {
    teamA: {
      name: teamA ?? REAL_TEAMS[0].name,
      winProbability: teamAWins / MONTE_CARLO.SIMULATIONS,
      wins: teamAWins,
    },
    teamB: {
      name: teamB ?? REAL_TEAMS[1].name,
      winProbability: teamBWins / MONTE_CARLO.SIMULATIONS,
      wins: teamBWins,
    },
    simulations: MONTE_CARLO.SIMULATIONS,
    spread: (teamAWins - teamBWins) / MONTE_CARLO.SIMULATIONS * 28,
  };
}

/**
 * Creates mock chaos page data
 */
export function createMockChaosPage(options?: {
  season?: number;
  week?: number;
}): {
  games: ChaosGame[];
  weekScore: number;
  weekTier: string;
} {
  const week = createMockChaosWeek(12);
  const avgScore = week.averageChaosScore;
  let tier = "Moderate";

  if (avgScore > 60) tier = "Chaotic";
  if (avgScore > 75) tier = "Extremely Chaotic";
  if (avgScore < 30) tier = "Chalk";

  return {
    games: week.topChaosGames,
    weekScore: avgScore,
    weekTier: tier,
  };
}

/**
 * Creates mock gameday data
 */
export function createMockGamedayData(
  seed: number = 42
): {
  games: Array<{
    gameId: number;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    quarter: number;
    timeRemaining: string;
    homeWP: number;
  }>;
  upsetAlerts: Array<{ gameId: number; description: string }>;
} {
  const rng = getSeededRandom(seed);

  const games = Array(8)
    .fill(null)
    .map(() => {
      const homeWP = rng();
      return {
        gameId: Math.floor(rng() * 100000),
        homeTeam: REAL_TEAMS[Math.floor(rng() * REAL_TEAMS.length)].name,
        awayTeam: REAL_TEAMS[Math.floor(rng() * REAL_TEAMS.length)].name,
        homeScore: Math.ceil(rng() * 70),
        awayScore: Math.ceil(rng() * 70),
        quarter: Math.floor(rng() * 4) + 1,
        timeRemaining: `${Math.floor(rng() * 15)}:${Math.floor(rng() * 60).toString().padStart(2, '0')}`,
        homeWP,
      };
    });

  const upsetAlerts = games
    .filter(
      (g) =>
        (g.homeWP < 0.35 && g.homeScore > g.awayScore) ||
        (g.homeWP > 0.65 && g.homeScore < g.awayScore)
    )
    .map((g) => ({
      gameId: g.gameId,
      description: `${g.awayTeam} stunning upset in progress`,
    }));

  return { games, upsetAlerts };
}

/**
 * Creates mock season data (teams, games, rankings)
 */
export function createMockSeason(
  season: number,
  seed: number = 42
): {
  teams: TeamBase[];
  games: GameBase[];
  rankings: RankingSnapshot[];
} {
  const teams = createMockTeams(130, seed);

  const games: GameBase[] = Array(250)
    .fill(null)
    .map((_, i) =>
      createMockGame(
        { season, week: Math.floor(i / 15) + 1 },
        seed + i
      )
    );

  const rankings: RankingSnapshot[] = Array(15)
    .fill(null)
    .map((_, i) =>
      createMockRankingSnapshot(130, seed + i)
    );

  return { teams, games, rankings };
}

/**
 * Creates multiple mock teams
 */
export function createMockTeams(
  count: number,
  seed: number = 42
): TeamBase[] {
  return Array(Math.min(count, REAL_TEAMS.length))
    .fill(null)
    .map((_, i) => createMockTeam({ slug: REAL_TEAMS[i].slug }, seed + i));
}
