/**
 * Rivalry Definitions for Gridiron Intel
 *
 * Curated list of major college football rivalries with metadata.
 * Tier 1 = Legendary (nationally significant)
 * Tier 2 = Major (conference-defining)
 * Tier 3 = Notable (regional/historical significance)
 */

export interface RivalryDef {
  slug: string;
  name: string;
  team1: string;
  team2: string;
  trophyName?: string;
  tier: 1 | 2 | 3;
  firstMeeting?: number;
  description: string;
}

export const RIVALRIES: RivalryDef[] = [
  // ===== TIER 1 — LEGENDARY =====
  {
    slug: "the-game",
    name: "The Game",
    team1: "Ohio State",
    team2: "Michigan",
    tier: 1,
    firstMeeting: 1897,
    description:
      "The greatest rivalry in American sports. Conference titles, national championships, and careers are defined by this game.",
  },
  {
    slug: "iron-bowl",
    name: "Iron Bowl",
    team1: "Alabama",
    team2: "Auburn",
    tier: 1,
    firstMeeting: 1893,
    description:
      "The state of Alabama stops for this game. Families divided, friendships tested. The Kick Six lives forever.",
  },
  {
    slug: "red-river-rivalry",
    name: "Red River Rivalry",
    team1: "Texas",
    team2: "Oklahoma",
    trophyName: "Golden Hat",
    tier: 1,
    firstMeeting: 1900,
    description:
      "Played at the Cotton Bowl in Dallas, split down the middle. Now a conference game again in the SEC.",
  },
  {
    slug: "army-navy",
    name: "Army-Navy Game",
    team1: "Army",
    team2: "Navy",
    trophyName: "Commander-in-Chief's Trophy",
    tier: 1,
    firstMeeting: 1890,
    description:
      "More than a game. The entire country watches. Presidents attend. Players go to war.",
  },
  {
    slug: "clean-old-fashioned-hate",
    name: "Clean, Old-Fashioned Hate",
    team1: "Georgia",
    team2: "Georgia Tech",
    tier: 1,
    firstMeeting: 1893,
    description:
      "Atlanta vs. Athens. The state's oldest football rivalry, now an annual non-conference classic.",
  },
  {
    slug: "bedlam",
    name: "Bedlam Series",
    team1: "Oklahoma",
    team2: "Oklahoma State",
    trophyName: "Bedlam Bell",
    tier: 1,
    firstMeeting: 1904,
    description:
      "The battle for Oklahoma. Conference realignment paused this rivalry, but the hatred never died.",
  },
  {
    slug: "world-largest-cocktail-party",
    name: "World's Largest Outdoor Cocktail Party",
    team1: "Georgia",
    team2: "Florida",
    tier: 1,
    firstMeeting: 1915,
    description:
      "Played in Jacksonville, a neutral-site tradition. Tailgates start Wednesday. SEC East supremacy on the line.",
  },

  // ===== TIER 2 — MAJOR =====
  {
    slug: "civil-war-oregon",
    name: "Civil War",
    team1: "Oregon",
    team2: "Oregon State",
    tier: 2,
    firstMeeting: 1894,
    description:
      "The battle for Oregon. From small-time to Nike-fueled powerhouse vs. plucky underdog.",
  },
  {
    slug: "rivalry-on-the-river",
    name: "Third Saturday in October",
    team1: "Alabama",
    team2: "Tennessee",
    tier: 2,
    firstMeeting: 1901,
    description:
      "A rivalry defined by eras of dominance. Neyland vs. Bryant, then decades of Alabama control, and Tennessee's resurgence.",
  },
  {
    slug: "egg-bowl",
    name: "Egg Bowl",
    team1: "Ole Miss",
    team2: "Mississippi State",
    trophyName: "Golden Egg Trophy",
    tier: 2,
    firstMeeting: 1901,
    description:
      "The battle for Mississippi. Pure, unadulterated hate in the Deep South.",
  },
  {
    slug: "apple-cup",
    name: "Apple Cup",
    team1: "Washington",
    team2: "Washington State",
    trophyName: "Apple Cup",
    tier: 2,
    firstMeeting: 1900,
    description:
      "Seattle vs. Pullman. UW joined the Big Ten; Wazzu stayed in the Pac remnants. The rivalry endures.",
  },
  {
    slug: "backyard-brawl",
    name: "Backyard Brawl",
    team1: "Pitt",
    team2: "West Virginia",
    trophyName: "Backyard Brawl Trophy",
    tier: 2,
    firstMeeting: 1895,
    description:
      "Separated by 75 miles of mountain road. Couch fires, bitter hatred, and some of the most heated games in history.",
  },
  {
    slug: "lone-star-showdown",
    name: "Lone Star Showdown",
    team1: "Texas",
    team2: "Texas A&M",
    tier: 2,
    firstMeeting: 1894,
    description:
      "Texas's oldest rivalry, dormant since A&M left for the SEC. Reunited in 2025 and the hatred picked up right where it left off.",
  },
  {
    slug: "holy-war",
    name: "Holy War",
    team1: "BYU",
    team2: "Utah",
    trophyName: "Beehive Boot",
    tier: 2,
    firstMeeting: 1922,
    description:
      "Religious undertones, state pride, and decades of competitive football. The state of Utah takes this personally.",
  },
  {
    slug: "big-game",
    name: "Big Game",
    team1: "California",
    team2: "Stanford",
    trophyName: "Stanford Axe",
    tier: 2,
    firstMeeting: 1892,
    description:
      "The Play. That's all you need to know. Five laterals, the band on the field, the most famous finish in football history.",
  },
  {
    slug: "land-grant-trophy",
    name: "Land Grant Trophy",
    team1: "Penn State",
    team2: "Michigan State",
    trophyName: "Land Grant Trophy",
    tier: 2,
    firstMeeting: 1914,
    description:
      "Two land-grant universities battling for Big Ten supremacy. The trophy is famously ugly. The games are not.",
  },
  {
    slug: "palmetto-bowl",
    name: "Palmetto Bowl",
    team1: "Clemson",
    team2: "South Carolina",
    trophyName: "Palmetto Bowl Trophy",
    tier: 2,
    firstMeeting: 1896,
    description:
      "The battle for South Carolina. Clemson's recent dynasty vs. South Carolina's passionate base.",
  },
  {
    slug: "commander-in-chief",
    name: "Commander-in-Chief's Trophy",
    team1: "Army",
    team2: "Air Force",
    trophyName: "Commander-in-Chief's Trophy",
    tier: 2,
    firstMeeting: 1959,
    description:
      "The three-way service academy rivalry. Army, Navy, and Air Force compete for the Commander-in-Chief's Trophy.",
  },
  {
    slug: "border-war",
    name: "Border War",
    team1: "Kansas",
    team2: "Missouri",
    trophyName: "Indian War Drum",
    tier: 2,
    firstMeeting: 1891,
    description:
      "Rooted in the actual Border War of the 1850s. Conference realignment separated them, but the history runs deep.",
  },
  {
    slug: "paul-bunyan",
    name: "Paul Bunyan Trophy",
    team1: "Michigan",
    team2: "Michigan State",
    trophyName: "Paul Bunyan Trophy",
    tier: 2,
    firstMeeting: 1898,
    description:
      "Little brother vs. big brother. Except little brother has won national titles. The rivalry is vicious.",
  },
  {
    slug: "old-oaken-bucket",
    name: "Old Oaken Bucket",
    team1: "Indiana",
    team2: "Purdue",
    trophyName: "Old Oaken Bucket",
    tier: 2,
    firstMeeting: 1891,
    description:
      "The battle for Indiana bragging rights. The bucket is one of college football's oldest traveling trophies.",
  },

  // ===== TIER 3 — NOTABLE =====
  {
    slug: "brawl-of-the-wild",
    name: "Brawl of the Wild",
    team1: "Montana",
    team2: "Montana State",
    trophyName: "Great Divide Trophy",
    tier: 3,
    firstMeeting: 1897,
    description:
      "FCS's fiercest rivalry. Both programs regularly compete for national championships.",
  },
  {
    slug: "dakota-marker",
    name: "Dakota Marker",
    team1: "North Dakota State",
    team2: "South Dakota State",
    trophyName: "Dakota Marker",
    tier: 3,
    firstMeeting: 1903,
    description:
      "The FCS's marquee rivalry. NDSU's dynasty vs. SDSU's rise to prominence.",
  },
  {
    slug: "battle-of-i-10",
    name: "Battle of I-10",
    team1: "UTSA",
    team2: "UTEP",
    tier: 3,
    firstMeeting: 2012,
    description:
      "A young rivalry along Interstate 10. UTSA vs. UTEP for West Texas and San Antonio bragging rights.",
  },
  {
    slug: "bayou-classic",
    name: "Bayou Classic",
    team1: "Southern",
    team2: "Grambling State",
    tier: 3,
    firstMeeting: 1932,
    description:
      "HBCU football's biggest stage. Played in the Superdome with Battle of the Bands. A cultural event as much as a game.",
  },
  {
    slug: "wagon-wheel",
    name: "Wagon Wheel",
    team1: "Akron",
    team2: "Kent State",
    trophyName: "Wagon Wheel",
    tier: 3,
    firstMeeting: 1923,
    description:
      "Northeast Ohio bragging rights. Only 12 miles apart — the shortest geographic rivalry in FBS.",
  },
];
