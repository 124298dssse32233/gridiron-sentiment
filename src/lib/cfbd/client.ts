/**
 * CollegeFootballData.com API v2 Client
 * Docs: https://apinext.collegefootballdata.com
 *
 * IMPORTANT: v2 has strict rate limits.
 * Free tier = 1,000 calls/month. Add delays between requests.
 * Tier 2 = 25,000 calls/month ($5/mo Patreon)
 * Tier 3 = 75,000 calls/month + GraphQL ($10/mo Patreon)
 */

import { CFBD_BASE_URL, API_DELAY_MS } from "@/lib/utils/constants";

/** Generic fetch wrapper for CFBD API */
async function cfbdFetch<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = new URL(`${CFBD_BASE_URL}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.CFBD_API_KEY}`,
      Accept: "application/json",
    },
  });

  if (response.status === 429) {
    // Rate limited — wait and retry once
    console.warn("CFBD rate limited. Waiting 60 seconds...");
    await new Promise((r) => setTimeout(r, 60000));
    return cfbdFetch<T>(endpoint, params);
  }

  if (!response.ok) {
    throw new Error(
      `CFBD API error: ${response.status} ${response.statusText} on ${endpoint}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Delay helper for respecting rate limits
 * Call this between API requests in loops
 */
export async function delay(ms: number = API_DELAY_MS): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// =============================================================================
// TEAMS & CONFERENCES
// =============================================================================

export interface CFBDTeam {
  id: string;
  school: string;
  mascot: string;
  abbreviation: string;
  altName1?: string;
  altName2?: string;
  altName3?: string;
  classification: string; // "FBS" or "FCS"
  conference: string;
  color?: string;           // Primary color (hex without #)
  alternateColor?: string;  // Secondary color (hex without #)
  logos?: string[];          // Logo image URLs (typically 2: dark bg, light bg)
  twitter?: string;
  location?: {
    venueId?: number;
    name?: string;
    city?: string;
    state?: string;
    zip?: string;
    countryCode?: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
    elevation?: number;
    capacity?: number;
    yearConstructed?: number;
    grass?: boolean;
    dome?: boolean;
  };
}

export async function getTeams(year?: number): Promise<CFBDTeam[]> {
  return cfbdFetch<CFBDTeam[]>("/teams", { year });
}

export interface CFBDConference {
  id: string;
  name: string;
  abbreviation: string;
  shortName: string;
  classification?: string;
}

export async function getConferences(): Promise<CFBDConference[]> {
  return cfbdFetch<CFBDConference[]>("/conferences");
}

// =============================================================================
// GAMES
// =============================================================================

export interface CFBDGame {
  id: string;
  season: number;
  week?: number;
  seasonType: "regular" | "postseason" | "both";
  startDate: string;
  startTimeTBD?: boolean;
  completed?: boolean;
  neutralSite: boolean;
  conferenceGame?: boolean;
  attendance?: number;
  venueId?: string;
  venue?: string;
  homeId?: number;
  homeTeam: string;
  homeClassification?: string;
  homeConference?: string;
  homePoints?: number;
  homeLineScores?: number[];
  awayId?: number;
  awayTeam: string;
  awayClassification?: string;
  awayConference?: string;
  awayPoints?: number;
  awayLineScores?: number[];
  exciteIndex?: number;
  highlights?: string;
  notes?: string;
  spread?: number;
  overUnder?: number;
  homePregameElo?: number;
  awayPregameElo?: number;
  homePostgameElo?: number;
  awayPostgameElo?: number;
}

export async function getGames(
  year: number,
  week?: number,
  seasonType?: string
): Promise<CFBDGame[]> {
  return cfbdFetch<CFBDGame[]>("/games", { year, week, seasonType });
}

export async function getGameTeamStats(
  year: number,
  week?: number,
  team?: string
): Promise<unknown[]> {
  return cfbdFetch<unknown[]>("/games/teams", { year, week, team });
}

// =============================================================================
// PLAY-BY-PLAY
// =============================================================================

export interface CFBDPlay {
  id: string;
  game_id: string;
  drive_index: number;
  play_number: number;
  period: number;
  clock?: string;
  team?: string;
  offense?: string;
  defense?: string;
  down?: number;
  distance?: number;
  yards_to_go?: number;
  yards_from_goal?: number;
  home_score?: number;
  away_score?: number;
  play_type?: string;
  yards_gained?: number;
  scoring?: boolean;
}

export async function getPlayByPlay(gameId: number): Promise<CFBDPlay[]> {
  return cfbdFetch<CFBDPlay[]>("/plays", { gameId });
}

// =============================================================================
// RATINGS
// =============================================================================

export interface CFBDRating {
  year: number;
  team: string;
  conference: string;
  rating: number;
  rank?: number;
}

export async function getRatingsSP(year?: number): Promise<CFBDRating[]> {
  return cfbdFetch<CFBDRating[]>("/ratings/sp", { year });
}

export async function getRatingsElo(year?: number): Promise<CFBDRating[]> {
  return cfbdFetch<CFBDRating[]>("/ratings/elo", { year });
}

// =============================================================================
// RECRUITING
// =============================================================================

export interface CFBDRecruitingTeam {
  year: number;
  team: string;
  ranking: number;
  "recruiting_points"?: number;
  "average_rating"?: number;
  "composite_score"?: number;
}

export async function getRecruitingTeams(year: number): Promise<CFBDRecruitingTeam[]> {
  return cfbdFetch<CFBDRecruitingTeam[]>("/recruiting/teams", { year });
}

export interface CFBDRecruitingPlayer {
  id: string;
  athleteId: string;
  recruitType: string;
  year: number;
  ranking: number;
  name: string;
  school: string;
  committedTo: string;
  position: string;
  height: number;
  weight: number;
  stars: number;
  rating: number;
  city: string;
  stateProvince: string;
  country?: string;
  hometownInfo?: {
    latitude?: number;
    longitude?: number;
    fipsCode?: string;
  };
}

export async function getRecruitingPlayers(
  year: number,
  playerType?: "HighSchool" | "JUCO" | "PrepSchool"
): Promise<CFBDRecruitingPlayer[]> {
  return cfbdFetch<CFBDRecruitingPlayer[]>("/recruiting/players", {
    year,
    classification: playerType,
  });
}

/**
 * Get recruiting players by team
 * @param year Recruiting class year
 * @param team School name (e.g., "Alabama", "Ohio State")
 */
export async function getRecruitingPlayersByTeam(
  year: number,
  team: string
): Promise<CFBDRecruitingPlayer[]> {
  return cfbdFetch<CFBDRecruitingPlayer[]>("/recruiting/players", {
    year,
    team,
  });
}

// =============================================================================
// TRANSFER PORTAL
// =============================================================================

export interface CFBDTransfer {
  id: string;
  season: number;
  name: string;
  position: string;
  "home_state"?: string;
  "incoming_team": string;
  "incoming_conference"?: string;
  "outgoing_team": string;
  "outgoing_conference"?: string;
  "rating_type"?: string;
  "rating_num"?: number;
  "rating_str"?: string;
}

export async function getTransferPortal(year: number): Promise<CFBDTransfer[]> {
  return cfbdFetch<CFBDTransfer[]>("/player/portal", { year });
}

// =============================================================================
// RETURNING PRODUCTION
// =============================================================================

export interface CFBDReturningProduction {
  year: number;
  team: string;
  conference: string;
  "percent_returning"?: number;
  "pp Returning"?: number;
  "returning_production"?: {
    total?: number;
    offense?: number;
    defense?: number;
    special_teams?: number;
  };
}

export async function getReturningProduction(year?: number): Promise<CFBDReturningProduction[]> {
  return cfbdFetch<CFBDReturningProduction[]>("/player/returning", { year });
}

// =============================================================================
// BETTING LINES
// =============================================================================

export interface CFBDBettingLine {
  id: string;
  season: number;
  week?: number;
  "season_type": string;
  start_date: string;
  "home_team": string;
  "away_team": string;
  "home_score"?: number;
  "away_score"?: number;
  "lines"?: Array<{
    provider?: string;
    spread?: number;
    "spread_short"?: string;
    "over_under"?: number;
    "home_moneyline"?: number;
    "away_moneyline"?: number;
  }>;
}

export async function getBettingLines(
  year: number,
  week?: number
): Promise<CFBDBettingLine[]> {
  return cfbdFetch<CFBDBettingLine[]>("/lines", { year, week });
}

// =============================================================================
// ADVANCED STATS
// =============================================================================

export interface CFBDAdvancedBoxScore {
  game_id: string;
  season: number;
  week?: number;
  "start_date"?: string;
  "home_team"?: string;
  "away_team"?: string;
  "home_team_conference"?: string;
  "away_team_conference"?: string;
  "home_points"?: number;
  "away_points"?: number;
  "home_ppa"?: {
    offense: number;
    defense: number;
    special_teams: number;
  };
  "away_ppa"?: {
    offense: number;
    defense: number;
    special_teams: number;
  };
  "home_success_rate"?: {
    offense: number;
    defense: number;
    special_teams: number;
  };
  "away_success_rate"?: {
    offense: number;
    defense: number;
    special_teams: number;
  };
  "home_explosiveness"?: {
    offense: number;
    defense: number;
  };
  "away_explosiveness"?: {
    offense: number;
    defense: number;
  };
  "home_power_success"?: {
    success_rate: number;
    "ppa_per_play": number;
  };
  "away_power_success"?: {
    success_rate: number;
    "ppa_per_play": number;
  };
  "home_stuff_rate"?: {
    stuff_rate: number;
    "ppa_per_stuff": number;
  };
  "away_stuff_rate"?: {
    stuff_rate: number;
    "ppa_per_stuff": number;
  };
}

export async function getAdvancedBoxScore(gameId: number): Promise<CFBDAdvancedBoxScore> {
  return cfbdFetch<CFBDAdvancedBoxScore>("/game/box/advanced", { gameId });
}

export interface CFBDSeasonStats {
  team: string;
  conference: string;
  season: number;
  "games"?: number;
  "total_ppa"?: {
    offense: number;
    defense: number;
    special_teams: number;
  };
  "offense_ppa"?: {
    total: number;
    passing: number;
    rushing: number;
    "first_down": number;
    "second_down": number;
    "third_down": number;
  };
  "defense_ppa"?: {
    total: number;
    passing: number;
    rushing: number;
    "first_down": number;
    "second_down": number;
    "third_down": number;
  };
  "success_rate"?: {
    offense: number;
    defense: number;
  };
  "explosiveness"?: {
    offense: number;
    defense: number;
  };
  "power_success"?: {
    success_rate: number;
    "ppa_per_play": number;
  };
  "stuff_rate"?: {
    stuff_rate: number;
    "ppa_per_stuff": number;
  };
}

export async function getTeamSeasonStats(
  year: number,
  team?: string
): Promise<CFBDSeasonStats[]> {
  return cfbdFetch<CFBDSeasonStats[]>("/stats/season", { year, team });
}

// =============================================================================
// COACHES
// =============================================================================

export interface CFBDCoach {
  uuid: string;
  first_name: string;
  last_name: string;
  season: number;
  team: string;
  conference?: string;
  "hired_date"?: string;
  "fired_date"?: string;
  "notes"?: string;
}

export async function getCoaches(team?: string, year?: number): Promise<CFBDCoach[]> {
  return cfbdFetch<CFBDCoach[]>("/coaches", { team, year });
}

// =============================================================================
// VENUES
// =============================================================================

export interface CFBDVenue {
  id: string;
  name: string;
  city: string;
  state: string;
  zip?: string;
  country?: string;
  capacity?: number;
  "grass"?: boolean;
  dome?: boolean;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  year_constructed?: number;
  "alt_name_1"?: string;
  "alt_name_2"?: string;
}

export async function getVenues(): Promise<CFBDVenue[]> {
  return cfbdFetch<CFBDVenue[]>("/venues");
}

// =============================================================================
// WEPA (Weighted EPA)
// =============================================================================

export interface CFBDWepaTeamSeason {
  year: number;
  team: string;
  conference: string;
  "offense_wepa"?: number;
  "defense_wepa"?: number;
  "special_teams_wepa"?: number;
  "total_wepa"?: number;
}

export async function getWepaTeamSeason(year: number): Promise<CFBDWepaTeamSeason[]> {
  return cfbdFetch<CFBDWepaTeamSeason[]>("/wepa/team/season", { year });
}

// =============================================================================
// WIN PROBABILITY
// =============================================================================

export interface CFBDPreGameWP {
  id: string;
  season: number;
  week?: number;
  "season_type": string;
  "start_date": string;
  "home_team": string;
  "away_team": string;
  "home_wp": number;
  "away_wp": number;
}

export async function getPreGameWP(year: number, week?: number): Promise<CFBDPreGameWP[]> {
  return cfbdFetch<CFBDPreGameWP[]>("/metrics/wp/pregame", { year, week });
}
