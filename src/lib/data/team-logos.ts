/**
 * Team Logo URL Database
 *
 * Logo URLs sourced from the CFBD API, which references ESPN CDN logos.
 * Each team has up to 2 logos:
 *   - Primary logo (index 0): designed for dark backgrounds
 *   - Alternate logo (index 1): designed for light backgrounds
 *
 * Since Gridiron Intel uses a dark theme, we prefer the primary (dark bg) logo.
 *
 * When the database is populated (via seed-teams.ts), logos are stored per-team
 * in the `logoUrl` field and `metadata.logos` array. This file provides:
 *   1. A static fallback for when the DB isn't available
 *   2. A utility to generate ESPN CDN URLs from team IDs
 *   3. A letter-avatar fallback generator
 */

// =============================================================================
// ESPN CDN URL PATTERN
// =============================================================================

/**
 * ESPN CDN base URL for team logos.
 * The CFBD API returns URLs in this format.
 *
 * Pattern: https://a.espncdn.com/i/teamlogos/ncaa/500/{espnId}.png
 * Dark version: https://a.espncdn.com/i/teamlogos/ncaa/500-dark/{espnId}.png
 *
 * The `500` is the size in pixels. Available sizes: 500, 100, 50
 */
const ESPN_LOGO_BASE = "https://a.espncdn.com/i/teamlogos/ncaa";

/**
 * Generate an ESPN CDN logo URL from a team's ESPN ID
 * @param espnId ESPN numeric team ID
 * @param size Logo size in pixels (500, 100, or 50)
 * @param variant "default" for standard, "dark" for dark-background optimized
 */
export function espnLogoUrl(
  espnId: number | string,
  size: 500 | 100 | 50 = 500,
  variant: "default" | "dark" = "dark"
): string {
  const sizeStr = variant === "dark" ? `${size}-dark` : `${size}`;
  return `${ESPN_LOGO_BASE}/${sizeStr}/${espnId}.png`;
}

// =============================================================================
// STATIC LOGO MAP (FBS TEAMS)
// =============================================================================

/**
 * ESPN Team IDs for logo URL generation
 * Maps team name → ESPN numeric ID
 *
 * These IDs are used to construct ESPN CDN URLs. When the database
 * is seeded from CFBD, the actual URLs are stored in metadata.logos.
 * This map serves as a fallback for pre-DB UI development.
 */
export const ESPN_TEAM_IDS: Record<string, number> = {
  // SEC
  "Alabama": 333,
  "Arkansas": 8,
  "Auburn": 2,
  "Florida": 57,
  "Georgia": 61,
  "Kentucky": 96,
  "LSU": 99,
  "Mississippi State": 344,
  "Missouri": 142,
  "Ole Miss": 145,
  "South Carolina": 2579,
  "Tennessee": 2633,
  "Texas A&M": 245,
  "Vanderbilt": 238,
  "Oklahoma": 201,
  "Texas": 251,

  // Big Ten
  "Ohio State": 194,
  "Michigan": 130,
  "Penn State": 213,
  "Michigan State": 127,
  "Iowa": 2294,
  "Wisconsin": 275,
  "Illinois": 356,
  "Minnesota": 135,
  "Nebraska": 158,
  "Northwestern": 77,
  "Purdue": 2509,
  "Indiana": 84,
  "Maryland": 120,
  "Rutgers": 164,
  "Oregon": 2483,
  "Southern California": 30,
  "UCLA": 26,
  "Washington": 264,

  // Big 12
  "Arizona": 12,
  "Arizona State": 9,
  "Baylor": 239,
  "BYU": 252,
  "Cincinnati": 2132,
  "Colorado": 38,
  "Houston": 248,
  "Iowa State": 66,
  "Kansas": 2305,
  "Kansas State": 2306,
  "Oklahoma State": 197,
  "TCU": 2628,
  "Texas Tech": 2641,
  "UCF": 2116,
  "West Virginia": 277,
  "Utah": 254,

  // ACC
  "Clemson": 228,
  "Florida State": 52,
  "Miami (FL)": 2390,
  "North Carolina": 153,
  "NC State": 152,
  "Virginia Tech": 259,
  "Duke": 150,
  "Georgia Tech": 59,
  "Wake Forest": 154,
  "Louisville": 97,
  "Virginia": 258,
  "Pitt": 221,
  "Syracuse": 183,
  "Boston College": 103,
  "California": 25,
  "Stanford": 24,
  "SMU": 2567,
  "Notre Dame": 87,

  // AAC
  "Memphis": 235,
  "Tulane": 2655,
  "North Texas": 249,
  "UTSA": 2636,
  "Rice": 242,
  "Tulsa": 202,
  "Charlotte": 2429,
  "East Carolina": 151,
  "Florida Atlantic": 2226,
  "South Florida": 58,
  "Navy": 2426,
  "Army": 349,
  "Temple": 218,

  // Conference USA
  "Jacksonville State": 55,
  "Liberty": 2335,
  "New Mexico State": 166,
  "Louisiana Tech": 2348,
  "Western Kentucky": 98,
  "Middle Tennessee": 2393,
  "UAB": 5,
  "North Alabama": 2453,
  "FIU": 2229,
  "Kennesaw State": 338,
  "Sam Houston": 2534,

  // Sun Belt
  "Arkansas State": 2032,
  "Georgia Southern": 290,
  "Georgia State": 2247,
  "Louisiana": 309,
  "Old Dominion": 295,
  "South Alabama": 6,
  "Texas State": 326,
  "Troy": 2653,
  "Appalachian State": 2026,
  "Coastal Carolina": 324,
  "James Madison": 256,
  "Marshall": 276,
  "Southern Miss": 2572,

  // MAC
  "Ohio": 195,
  "Miami (OH)": 193,
  "Buffalo": 2084,
  "Akron": 2006,
  "Bowling Green": 189,
  "Kent State": 2309,
  "Ball State": 2050,
  "Central Michigan": 2117,
  "Eastern Michigan": 2199,
  "Northern Illinois": 2459,
  "Western Michigan": 2711,
  "Toledo": 2649,

  // Mountain West
  "Boise State": 68,
  "Colorado State": 36,
  "Air Force": 2005,
  "New Mexico": 167,
  "Utah State": 328,
  "Wyoming": 2751,
  "Nevada": 2440,
  "UNLV": 2439,
  "Fresno State": 278,
  "San Diego State": 21,
  "San Jose State": 23,
  "Hawaii": 62,

  // FCS — Big Name Programs
  "North Dakota State": 2449,
  "South Dakota State": 2571,
  "Montana": 149,
  "Montana State": 147,
  "Villanova": 222,
  "Delaware": 48,
  "Harvard": 108,
  "Yale": 43,
  "Princeton": 163,
};

// =============================================================================
// LOGO TYPE & HELPER
// =============================================================================

export interface TeamLogoInfo {
  /** Primary logo URL (for dark backgrounds) */
  primary: string;
  /** Alternate logo URL (for light backgrounds) — may be same as primary */
  alternate: string;
  /** Source of the logo (database, espn, or fallback) */
  source: "database" | "espn" | "fallback";
}

/**
 * Get logo URLs for a team
 *
 * Priority:
 *   1. Database logoUrl / metadata.logos (passed in from server component)
 *   2. ESPN CDN via known team ID
 *   3. Generated letter avatar (handled by TeamLogo component)
 *
 * @param teamName Team display name (e.g., "Ohio State")
 * @param dbLogoUrl Logo URL from database (team.logoUrl)
 * @param dbLogos Full logos array from metadata.logos
 */
export function getTeamLogos(
  teamName: string,
  dbLogoUrl?: string | null,
  dbLogos?: string[] | null
): TeamLogoInfo {
  // 1. Database logos
  if (dbLogos && dbLogos.length > 0) {
    return {
      primary: dbLogos[0],
      alternate: dbLogos[1] ?? dbLogos[0],
      source: "database",
    };
  }

  if (dbLogoUrl) {
    return {
      primary: dbLogoUrl,
      alternate: dbLogoUrl,
      source: "database",
    };
  }

  // 2. ESPN CDN via known ID
  const espnId = ESPN_TEAM_IDS[teamName];
  if (espnId) {
    return {
      primary: espnLogoUrl(espnId, 500, "dark"),
      alternate: espnLogoUrl(espnId, 500, "default"),
      source: "espn",
    };
  }

  // 3. No logo available — component will render letter fallback
  return {
    primary: "",
    alternate: "",
    source: "fallback",
  };
}

// =============================================================================
// TEAM ABBREVIATIONS — Standard abbreviations used in letter avatar fallback
// =============================================================================

/**
 * Standard abbreviations for college football teams.
 * These match the common abbreviations used by media, ESPN, and the teams themselves.
 * The CFBD API also stores abbreviations per team — when available from the DB,
 * prefer that over this static map (pass via the `abbreviation` param).
 */
export const TEAM_ABBREVIATIONS: Record<string, string> = {
  // =========================================================================
  // SEC
  // =========================================================================
  "Alabama": "BAMA",
  "Arkansas": "ARK",
  "Auburn": "AUB",
  "Florida": "UF",
  "Georgia": "UGA",
  "Kentucky": "UK",
  "LSU": "LSU",
  "Mississippi State": "MSST",
  "Missouri": "MIZ",
  "Ole Miss": "MISS",
  "South Carolina": "SCAR",
  "Tennessee": "TENN",
  "Texas A&M": "TAMU",
  "Vanderbilt": "VANDY",
  "Oklahoma": "OU",
  "Texas": "TEX",

  // =========================================================================
  // Big Ten
  // =========================================================================
  "Ohio State": "OSU",
  "Michigan": "MICH",
  "Penn State": "PSU",
  "Michigan State": "MSU",
  "Iowa": "IOWA",
  "Wisconsin": "WIS",
  "Illinois": "ILL",
  "Minnesota": "MINN",
  "Nebraska": "NEB",
  "Northwestern": "NW",
  "Purdue": "PUR",
  "Indiana": "IND",
  "Maryland": "MD",
  "Rutgers": "RUTG",
  "Oregon": "ORE",
  "Southern California": "USC",
  "UCLA": "UCLA",
  "Washington": "UW",

  // =========================================================================
  // Big 12
  // =========================================================================
  "Arizona": "ARIZ",
  "Arizona State": "ASU",
  "Baylor": "BAY",
  "BYU": "BYU",
  "Cincinnati": "CIN",
  "Colorado": "COLO",
  "Houston": "HOU",
  "Iowa State": "ISU",
  "Kansas": "KU",
  "Kansas State": "KSU",
  "Oklahoma State": "OKST",
  "TCU": "TCU",
  "Texas Tech": "TTU",
  "UCF": "UCF",
  "West Virginia": "WVU",
  "Utah": "UTAH",

  // =========================================================================
  // ACC
  // =========================================================================
  "Clemson": "CLEM",
  "Florida State": "FSU",
  "Miami (FL)": "MIA",
  "North Carolina": "UNC",
  "NC State": "NCST",
  "Virginia Tech": "VT",
  "Duke": "DUKE",
  "Georgia Tech": "GT",
  "Wake Forest": "WAKE",
  "Louisville": "LOU",
  "Virginia": "UVA",
  "Pitt": "PITT",
  "Syracuse": "SYR",
  "Boston College": "BC",
  "California": "CAL",
  "Stanford": "STAN",
  "SMU": "SMU",
  "Notre Dame": "ND",

  // =========================================================================
  // AAC
  // =========================================================================
  "Memphis": "MEM",
  "Tulane": "TULN",
  "North Texas": "UNT",
  "UTSA": "UTSA",
  "Rice": "RICE",
  "Tulsa": "TLSA",
  "Charlotte": "CLT",
  "East Carolina": "ECU",
  "Florida Atlantic": "FAU",
  "South Florida": "USF",
  "Navy": "NAVY",
  "Army": "ARMY",
  "Temple": "TEM",

  // =========================================================================
  // Conference USA
  // =========================================================================
  "Jacksonville State": "JSU",
  "Liberty": "LIB",
  "New Mexico State": "NMSU",
  "Louisiana Tech": "LT",
  "Western Kentucky": "WKU",
  "Middle Tennessee": "MTSU",
  "UAB": "UAB",
  "North Alabama": "UNA",
  "FIU": "FIU",
  "Kennesaw State": "KSU",
  "Sam Houston": "SHSU",

  // =========================================================================
  // Sun Belt
  // =========================================================================
  "Arkansas State": "ARST",
  "Georgia Southern": "GASO",
  "Georgia State": "GAST",
  "Louisiana": "ULL",
  "Old Dominion": "ODU",
  "South Alabama": "USA",
  "Texas State": "TXST",
  "Troy": "TROY",
  "Appalachian State": "APP",
  "Coastal Carolina": "CCU",
  "James Madison": "JMU",
  "Marshall": "MRSH",
  "Southern Miss": "USM",

  // =========================================================================
  // MAC
  // =========================================================================
  "Ohio": "OHIO",
  "Miami (OH)": "M-OH",
  "Buffalo": "BUFF",
  "Akron": "AKR",
  "Bowling Green": "BGSU",
  "Kent State": "KENT",
  "Ball State": "BALL",
  "Central Michigan": "CMU",
  "Eastern Michigan": "EMU",
  "Northern Illinois": "NIU",
  "Western Michigan": "WMU",
  "Toledo": "TOL",

  // =========================================================================
  // Mountain West
  // =========================================================================
  "Boise State": "BSU",
  "Colorado State": "CSU",
  "Air Force": "AF",
  "New Mexico": "UNM",
  "Utah State": "USU",
  "Wyoming": "WYO",
  "Nevada": "NEV",
  "UNLV": "UNLV",
  "Fresno State": "FRES",
  "San Diego State": "SDSU",
  "San Jose State": "SJSU",
  "Hawaii": "HAW",

  // =========================================================================
  // FCS — Missouri Valley (MVFC)
  // =========================================================================
  "North Dakota State": "NDSU",
  "South Dakota State": "SDSU",
  "North Dakota": "UND",
  "South Dakota": "USD",
  "Northern Iowa": "UNI",
  "Illinois State": "ILST",
  "Indiana State": "INST",
  "Missouri State": "MOST",
  "Youngstown State": "YSU",
  "Southern Illinois": "SIU",

  // =========================================================================
  // FCS — Big Sky
  // =========================================================================
  "Montana": "UM",
  "Montana State": "MTST",
  "Idaho": "IDHO",
  "Eastern Washington": "EWU",
  "Portland State": "PSU",
  "Sacramento State": "SAC",
  "UC Davis": "UCD",
  "Cal Poly": "CP",
  "Northern Arizona": "NAU",
  "Northern Colorado": "UNCO",
  "Southern Utah": "SUU",
  "Weber State": "WSU",
  "Idaho State": "ISU",

  // =========================================================================
  // FCS — CAA
  // =========================================================================
  "Delaware": "DEL",
  "Villanova": "NOVA",
  "William & Mary": "W&M",
  "Richmond": "RICH",
  "Towson": "TOW",
  "New Hampshire": "UNH",
  "Maine": "ME",
  "Rhode Island": "URI",
  "Albany": "ALB",
  "Elon": "ELON",
  "Stony Brook": "STON",
  "Hampton": "HAMP",
  "Campbell": "CAMP",
  "Monmouth": "MON",

  // =========================================================================
  // FCS — SWAC
  // =========================================================================
  "North Carolina A&T": "NCAT",
  "Florida A&M": "FAMU",
  "Jackson State": "JKST",
  "Southern": "SU",
  "Grambling State": "GRAM",
  "Prairie View A&M": "PVAM",
  "Alabama State": "ALST",
  "Alabama A&M": "AAMU",
  "Alcorn State": "ALCN",
  "Bethune-Cookman": "BCU",
  "Mississippi Valley State": "MVSU",
  "Texas Southern": "TXSO",
  "Arkansas-Pine Bluff": "UAPB",

  // =========================================================================
  // FCS — MEAC
  // =========================================================================
  "South Carolina State": "SCST",
  "North Carolina Central": "NCCU",
  "Howard": "HOW",
  "Delaware State": "DSU",
  "Morgan State": "MORG",
  "Norfolk State": "NSU",
  "Coppin State": "COPP",

  // =========================================================================
  // FCS — Patriot League
  // =========================================================================
  "Lehigh": "LEH",
  "Lafayette": "LAF",
  "Colgate": "COLG",
  "Holy Cross": "HC",
  "Bucknell": "BUCK",
  "Fordham": "FOR",
  "Georgetown": "GTWN",

  // =========================================================================
  // FCS — OVC / Big South
  // =========================================================================
  "Tennessee State": "TSU",
  "Tennessee Tech": "TTU",
  "Austin Peay": "APSU",
  "Eastern Kentucky": "EKU",
  "Southeast Missouri": "SEMO",
  "UT Martin": "UTM",
  "Murray State": "MUR",
  "Lindenwood": "LIND",
  "Charleston Southern": "CSU",
  "Gardner-Webb": "GWU",
  "Robert Morris": "RMU",
  "Central Connecticut": "CCSU",

  // =========================================================================
  // FCS — Southland
  // =========================================================================
  "McNeese": "MCN",
  "Nicholls": "NICH",
  "Northwestern State": "NSU",
  "Southeastern Louisiana": "SELA",
  "Houston Christian": "HCU",
  "UIW": "UIW",
  "Lamar": "LAM",
  "East Texas A&M": "ETAM",

  // =========================================================================
  // FCS — NEC
  // =========================================================================
  "Duquesne": "DUQ",
  "St. Francis (PA)": "SFU",
  "Sacred Heart": "SHU",
  "Wagner": "WAG",
  "Long Island": "LIU",
  "Merrimack": "MRMK",

  // =========================================================================
  // FCS — Pioneer League
  // =========================================================================
  "Dayton": "DAY",
  "Drake": "DRKE",
  "Valparaiso": "VALP",
  "Butler": "BUT",
  "Morehead State": "MORE",
  "Presbyterian": "PC",
  "Marist": "MRST",
  "San Diego": "USD",
  "Stetson": "STET",
  "Davidson": "DAV",

  // =========================================================================
  // FCS — Ivy League
  // =========================================================================
  "Harvard": "HARV",
  "Yale": "YALE",
  "Princeton": "PRIN",
  "Dartmouth": "DART",
  "Brown": "BRWN",
  "Cornell": "COR",
  "Columbia": "CU",
  "Penn": "PENN",

  // =========================================================================
  // FCS — Southern Conference / Other
  // =========================================================================
  "Chattanooga": "UTC",
  "Western Carolina": "WCU",
  "The Citadel": "CIT",
  "VMI": "VMI",
  "Furman": "FUR",
  "Wofford": "WOF",
  "Samford": "SAM",
  "Mercer": "MER",
  "ETSU": "ETSU",
  "Tarleton State": "TARS",
  "Stephen F. Austin": "SFA",
  "Abilene Christian": "ACU",
  "Central Arkansas": "UCA",
  "Eastern Illinois": "EIU",
  "Western Illinois": "WIU",

  // =========================================================================
  // D2 — GLIAC
  // =========================================================================
  "Grand Valley State": "GVSU",
  "Ferris State": "FSU",
  "Wayne State (MI)": "WSU",
  "Saginaw Valley State": "SVSU",
  "Michigan Tech": "MTU",
  "Northern Michigan": "NMU",
  "Lake Erie": "LEC",
  "Davenport": "DU",
  "Wisconsin-Parkside": "UWP",

  // =========================================================================
  // D2 — GAC
  // =========================================================================
  "Ouachita Baptist": "OBU",
  "Harding": "HU",
  "Henderson State": "HSU",
  "Arkansas Tech": "ATU",
  "Southeastern Oklahoma": "SOSU",
  "Southern Arkansas": "SAU",
  "Oklahoma Baptist": "OBU",

  // =========================================================================
  // D2 — GNAC
  // =========================================================================
  "Central Washington": "CWU",
  "Western Oregon": "WOU",
  "Azusa Pacific": "APU",
  "Humboldt State": "HSU",
  "Simon Fraser": "SFU",

  // =========================================================================
  // D2 — PSAC
  // =========================================================================
  "Slippery Rock": "SRU",
  "Kutztown": "KU",
  "Indiana (PA)": "IUP",
  "Shepherd": "SU",
  "West Chester": "WCU",
  "California (PA)": "CALU",
  "Shippensburg": "SHIP",
  "Bloomsburg": "BU",
  "Millersville": "MU",
  "Edinboro": "BORO",
  "Clarion": "CUP",
  "Mercyhurst": "MU",

  // =========================================================================
  // D2 — RMAC
  // =========================================================================
  "Colorado Mines": "CSM",
  "Colorado Mesa": "CMU",
  "CSU Pueblo": "CSUP",
  "Western Colorado": "WCU",
  "Black Hills State": "BHSU",
  "Chadron State": "CSC",
  "Fort Lewis": "FLC",
  "New Mexico Highlands": "NMHU",
  "Adams State": "ASU",
  "South Dakota Mines": "SDM",

  // =========================================================================
  // D2 — Lone Star
  // =========================================================================
  "Angelo State": "ASU",
  "Midwestern State": "MSU",
  "Texas A&M-Commerce": "TAMC",
  "West Texas A&M": "WTAM",
  "Texas A&M-Kingsville": "TAMK",
  "Eastern New Mexico": "ENMU",
  "Western New Mexico": "WNMU",
  "UT Permian Basin": "UTPB",

  // =========================================================================
  // D2 — NE-10
  // =========================================================================
  "New Haven": "UNH",
  "Bentley": "BENT",
  "Assumption": "AC",
  "American International": "AIC",
  "Pace": "PACE",
  "Southern Connecticut": "SCSU",
  "Stonehill": "SHC",

  // =========================================================================
  // D2 — NSIC
  // =========================================================================
  "Minnesota State": "MNSU",
  "Augustana (SD)": "AUGIE",
  "Bemidji State": "BSU",
  "Minnesota Duluth": "UMD",
  "Winona State": "WSU",
  "Sioux Falls": "USF",
  "Upper Iowa": "UIU",
  "Wayne State (NE)": "WSC",
  "Concordia-St. Paul": "CSP",
  "Southwest Minnesota State": "SMSU",
  "Northern State": "NSU",
  "MSU Moorhead": "MSUM",

  // =========================================================================
  // D2 — CIAA / SIAC
  // =========================================================================
  "Valdosta State": "VSU",
  "Bowie State": "BSU",
  "Fayetteville State": "FSU",
  "Virginia Union": "VUU",
  "Virginia State": "VSU",
  "Elizabeth City State": "ECSU",
  "Livingstone": "LC",
  "Shaw": "SHAW",
  "Chowan": "CU",
  "Lincoln (PA)": "LU",
  "Tuskegee": "TU",
  "Miles": "MC",
  "Albany State (GA)": "ASU",
  "Fort Valley State": "FVSU",
  "Clark Atlanta": "CAU",
  "Morehouse": "MC",
  "Lane": "LC",
  "Kentucky State": "KYSU",
  "Central State": "CSU",
  "Benedict": "BC",
  "Savannah State": "SSU",
  "Edward Waters": "EWC",

  // =========================================================================
  // D2 — SAC
  // =========================================================================
  "Lenoir-Rhyne": "LR",
  "Wingate": "WU",
  "Mars Hill": "MHU",
  "Catawba": "CAT",
  "Newberry": "NWB",
  "Tusculum": "TU",
  "Carson-Newman": "C-N",
  "UVA Wise": "UVAW",

  // =========================================================================
  // D3 — WIAC
  // =========================================================================
  "Wisconsin-Whitewater": "UWW",
  "Wisconsin-Oshkosh": "UWO",
  "Wisconsin-Platteville": "UWP",
  "Wisconsin-La Crosse": "UWL",
  "Wisconsin-Stevens Point": "UWSP",
  "Wisconsin-Stout": "UWS",
  "Wisconsin-Eau Claire": "UWEC",
  "Wisconsin-River Falls": "UWRF",

  // =========================================================================
  // D3 — OAC
  // =========================================================================
  "Mount Union": "MU",
  "Muskingum": "MUSK",
  "Ohio Northern": "ONU",
  "Heidelberg": "BERG",
  "John Carroll": "JCU",
  "Baldwin Wallace": "BW",
  "Marietta": "MC",
  "Capital": "CAP",
  "Otterbein": "OTT",
  "Wilmington": "WC",

  // =========================================================================
  // D3 — CCIW
  // =========================================================================
  "North Central (IL)": "NCC",
  "Wheaton (IL)": "WHTN",
  "Millikin": "MU",
  "Augustana (IL)": "AUGIE",
  "Carthage": "CART",
  "Elmhurst": "EU",
  "Illinois Wesleyan": "IWU",
  "Washington (MO)": "WUSTL",

  // =========================================================================
  // D3 — MIAC
  // =========================================================================
  "St. John's (MN)": "SJU",
  "Bethel (MN)": "BU",
  "Gustavus Adolphus": "GAC",
  "Concordia (MN)": "CUC",
  "St. Thomas (MN)": "UST",
  "Carleton": "CARL",
  "Macalester": "MAC",
  "Hamline": "HU",
  "St. Olaf": "STO",
  "Augsburg": "AUG",

  // =========================================================================
  // D3 — Centennial
  // =========================================================================
  "Susquehanna": "SU",
  "Johns Hopkins": "JHU",
  "Muhlenberg": "BERG",
  "Dickinson": "DSON",
  "Gettysburg": "BURG",
  "Franklin & Marshall": "F&M",
  "Ursinus": "UC",
  "McDaniel": "MCD",
  "Juniata": "JU",

  // =========================================================================
  // D3 — NESCAC
  // =========================================================================
  "Williams": "WMS",
  "Amherst": "AMHT",
  "Middlebury": "MIDD",
  "Tufts": "TUFT",
  "Trinity (CT)": "TRIN",
  "Wesleyan (CT)": "WES",
  "Bates": "BATS",
  "Bowdoin": "BOW",
  "Colby": "CLBY",
  "Hamilton": "HAM",
  "Conn College": "CC",

  // =========================================================================
  // D3 — Other Notable
  // =========================================================================
  "Mary Hardin-Baylor": "UMHB",
  "Linfield": "LINF",
  "Hardin-Simmons": "HSU",
  "Wesley": "WES",
  "St. Norbert": "SNC",
  "Rensselaer": "RPI",
  "Carnegie Mellon": "CMU",
  "Case Western Reserve": "CWRU",
  "Emory & Henry": "E&H",
  "Wabash": "WAB",
  "DePauw": "DPU",
  "Rose-Hulman": "RHIT",
  "Hobart": "HOB",
  "Union (NY)": "UNION",
  "Cortland": "CORT",
  "Ithaca": "IC",
  "Brockport": "BKPT",

  // =========================================================================
  // NAIA — Major Programs
  // =========================================================================
  "Morningside": "MSIDE",
  "Grand View": "GV",
  "Marian (IN)": "MU",
  "Reinhardt": "RU",
  "Keiser": "KU",
  "Lindsey Wilson": "LWC",
  "Georgetown (KY)": "GC",
  "Saint Xavier": "SXU",
  "Olivet Nazarene": "ONU",
  "Baker": "BU",
  "Benedictine (KS)": "BC",
  "Kansas Wesleyan": "KWU",
  "Bethel (KS)": "BC",
  "Southwestern (KS)": "SC",
  "Cumberlands": "UC",
  "Campbellsville": "CU",
  "Concordia (NE)": "CUNE",
  "Doane": "DU",
  "Hastings": "HC",
  "Midland": "MU",
  "Northwestern (IA)": "NWC",
  "Dordt": "DU",
  "College of Idaho": "COI",
  "Montana Tech": "MTU",
  "Carroll (MT)": "CFSC",
  "Rocky Mountain": "RMC",
  "Southern Oregon": "SOU",
  "Southeastern (FL)": "SEU",
  "Faulkner": "FU",
  "Pikeville": "UPIKE",
  "Bethany (KS)": "BC",
};

/**
 * Get the standard abbreviation for a team name (used in letter avatar fallback).
 *
 * Priority:
 *   1. Explicit `abbreviation` from database (CFBD API field)
 *   2. Static TEAM_ABBREVIATIONS map
 *   3. Smart fallback: first letters of significant words
 *
 * @param teamName Team display name (e.g., "North Dakota State")
 * @param abbreviation Optional abbreviation from database (team.abbreviation)
 */
export function getTeamInitials(
  teamName: string,
  abbreviation?: string | null
): string {
  // 1. Database abbreviation (from CFBD API)
  if (abbreviation) {
    return abbreviation;
  }

  // 2. Static abbreviation map
  const mapped = TEAM_ABBREVIATIONS[teamName];
  if (mapped) {
    return mapped;
  }

  // 3. Handle abbreviation-style names (already uppercase short strings)
  if (teamName === teamName.toUpperCase() && teamName.length <= 4) {
    return teamName;
  }

  // 4. Smart fallback — generate from team name
  // Handle parenthetical names like "Miami (FL)"
  const cleanName = teamName.replace(/\s*\(.*?\)\s*/g, "").trim();
  const words = cleanName.split(/\s+/);

  // For short names (1-2 words), use all first letters
  if (words.length <= 2) {
    return words.map((w) => w[0]).join("").toUpperCase();
  }

  // For longer names, skip common words
  const skip = new Set(["of", "the", "and", "at", "&"]);
  const initials = words
    .filter((w) => !skip.has(w.toLowerCase()))
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  // Cap at 4 characters
  return initials.slice(0, 4);
}
