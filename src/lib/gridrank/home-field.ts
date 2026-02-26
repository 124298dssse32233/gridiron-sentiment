/**
 * Dynamic Home Field Advantage Calculator
 *
 * Calculates HFA for each game based on:
 * - Base HFA (2.5 points)
 * - Travel distance
 * - Altitude difference
 * - Stadium capacity (crowd noise)
 * - Dome/indoor reduction
 * - Postseason reduction
 * - Team-specific HFA from historical data
 */

import { type PrismaClient } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface HomeFieldAdvantageInput {
  /** Is this at a neutral site? */
  isNeutralSite: boolean;
  /** Is this a postseason game? */
  isPostseason: boolean;
  /** Distance traveled by away team (miles) */
  travelDistance?: number;
  /** Stadium elevation (feet) */
  stadiumElevation?: number;
  /** Away team's home elevation (feet) */
  awayElevation?: number;
  /** Stadium capacity */
  stadiumCapacity?: number;
  /** Is it a dome/indoor stadium? */
  isDome?: boolean;
  /** Home team's historical HFA modifier */
  teamHfaModifier?: number;
  /** Actual game attendance (for fill rate calculation) */
  attendance?: number;
  /** Home team's division level (for division scaling) */
  level?: string;
}

export interface HomeFieldAdvantageResult {
  /** HFA in rating points */
  hfa: number;
  /** Breakdown of components */
  breakdown: {
    base: number;
    travel: number;
    altitude: number;
    crowd: number;
    dome: number;
    team: number;
    postseason: number;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Base home field advantage in rating points.
 * Conversion: 1 game point ≈ 5.6 rating points
 * FBS average HFA has declined: ~4.0 pts (2005) → ~2.5 pts (2024)
 * 2.5 game points × 5.6 = 14 rating points
 */
const BASE_HFA = 14;

/**
 * Game points to rating points conversion factor.
 * Used to maintain consistency between constants.ts (game points)
 * and engine calculations (rating points).
 */
export const GAME_POINTS_TO_RATING = 5.6;

/**
 * Maximum additional HFA from travel (for ~2000+ mile travel)
 */
const MAX_TRAVEL_BONUS = 20;

/**
 * Maximum additional HFA from altitude (for 5000+ ft difference)
 */
const MAX_ALTITUDE_BONUS = 15;

/**
 * Maximum additional HFA from crowd size
 */
const MAX_CROWD_BONUS = 10;

/**
 * Teams with historically high home field advantage
 * (based on win rate at home vs away)
 */
const TEAM_HFA_MODIFIERS: Record<string, number> = {
  // Very strong home field
  "Oregon": 5,
  "Ohio State": 5,
  "Texas A&M": 5,
  "Penn State": 4,
  "Clemson": 4,
  "Alabama": 3,
  "LSU": 3,
  "Ole Miss": 3,
  "Washington": 3,
  "Oklahoma": 3,

  // Weak home field (NFL venues, etc.)
  "Temple": -3,
  "Rutgers": -2,
  "UAB": -2,
  "Georgia State": -2,
};

// =============================================================================
// CALCULATIONS
// =============================================================================

/**
 * Calculate travel bonus for HFA
 * @param travelDistance Distance in miles (or undefined if unknown)
 * @returns Travel bonus in rating points
 */
export function calculateTravelBonus(travelDistance?: number): number {
  if (!travelDistance || travelDistance < 200) {
    return 0;
  }

  // Scale bonus from 0 to MAX_TRAVEL_BONUS
  // 200 miles = 0 bonus
  // 2000+ miles = MAX_TRAVEL_BONUS
  const excessMiles = Math.min(1800, travelDistance - 200);
  return (excessMiles / 1800) * MAX_TRAVEL_BONUS;
}

/**
 * Calculate altitude bonus for HFA
 * @param stadiumElevation Home stadium elevation in feet
 * @param awayElevation Away team's home elevation (for acclimation)
 * @returns Altitude bonus in rating points
 */
export function calculateAltitudeBonus(
  stadiumElevation?: number,
  awayElevation?: number
): number {
  if (!stadiumElevation || stadiumElevation < 1000) {
    return 0;
  }

  // If away team is also at high altitude, reduce the bonus
  // (they're acclimated)
  let effectiveElevation = stadiumElevation;
  if (awayElevation && awayElevation > 3000) {
    effectiveElevation -= awayElevation * 0.7;
  }

  // Significant elevation starts at 2000 feet
  if (effectiveElevation < 2000) {
    return 0;
  }

  // Scale bonus from 0 to MAX_ALTITUDE_BONUS
  // 2000 ft = 0 bonus
  // 7000+ ft = MAX_ALTITUDE_BONUS (like Boise, Air Force)
  const excessFeet = Math.min(5000, effectiveElevation - 2000);
  return (excessFeet / 5000) * MAX_ALTITUDE_BONUS;
}

/**
 * Calculate crowd noise bonus for HFA
 * Now uses fill rate (attendance/capacity) when available,
 * falls back to capacity-only estimation.
 *
 * @param capacity Stadium capacity
 * @param attendance Actual game attendance (optional)
 * @returns Crowd bonus in rating points
 */
export function calculateCrowdBonus(capacity?: number, attendance?: number): number {
  if (!capacity) {
    return 0;
  }

  // If we have attendance data, use fill rate (more accurate)
  if (attendance && attendance > 0) {
    const fillRate = attendance / capacity;

    if (fillRate > 0.95) return MAX_CROWD_BONUS;         // Packed house
    if (fillRate > 0.80) return MAX_CROWD_BONUS * 0.6;   // Strong crowd
    if (fillRate > 0.60) return MAX_CROWD_BONUS * 0.3;   // Decent crowd
    if (fillRate < 0.30) return -3;                       // Empty — negative HFA
    if (fillRate < 0.50) return -1;                       // Sparse
    return 0; // 50-60% — neutral
  }

  // Fallback: estimate from capacity alone
  if (capacity < 40000) {
    return 0;
  }

  const excessCapacity = Math.min(60000, capacity - 40000);
  return (excessCapacity / 60000) * MAX_CROWD_BONUS;
}

/**
 * Calculate dome/indoor reduction
 * @param isDome Is the stadium indoors?
 * @returns Reduction factor (0-1, where 1 = no reduction)
 */
export function calculateDomeFactor(isDome?: boolean): number {
  return isDome ? 0.7 : 1;
}

/**
 * Division-specific HFA scaling.
 * Smaller venues and less intense atmospheres at lower levels.
 */
export function getDivisionHfaScale(level?: string): number {
  switch (level) {
    case 'FBS': return 1.0;
    case 'FCS': return 0.85;
    case 'D2':  return 0.70;
    case 'D3':  return 0.60;
    case 'NAIA': return 0.60;
    default:    return 1.0;
  }
}

/**
 * Get team-specific HFA modifier
 * @param teamName Team name
 * @returns Modifier in rating points
 */
export function getTeamHfaModifier(teamName: string): number {
  return TEAM_HFA_MODIFIERS[teamName] ?? 0;
}

/**
 * Calculate total home field advantage for a game
 */
export function calculateHomeFieldAdvantage(
  input: HomeFieldAdvantageInput
): HomeFieldAdvantageResult {
  // Neutral site = no HFA
  if (input.isNeutralSite) {
    return {
      hfa: 0,
      breakdown: {
        base: BASE_HFA,
        travel: 0,
        altitude: 0,
        crowd: 0,
        dome: 0,
        team: input.teamHfaModifier ?? 0,
        postseason: 0,
      },
    };
  }

  // Calculate components
  const base = BASE_HFA;
  const travel = calculateTravelBonus(input.travelDistance);
  const altitude = calculateAltitudeBonus(
    input.stadiumElevation,
    input.awayElevation
  );
  const crowd = calculateCrowdBonus(input.stadiumCapacity, input.attendance);
  const domeFactor = calculateDomeFactor(input.isDome);

  // Apply dome factor to base + crowd (noise is dampened indoors)
  const baseAndCrowd = (base + crowd) * domeFactor;

  // Team-specific modifier
  const team = input.teamHfaModifier ?? 0;

  // Division scaling (smaller venues = less HFA at lower levels)
  const divisionScale = getDivisionHfaScale(input.level);

  // Cross-conference travel: visiting teams from different conferences face extra unfamiliarity
  // This is captured implicitly through travel distance, but we add a small fixed bonus
  // (0.3 game pts ≈ 1.7 rating pts) for any non-conference away game
  // Note: This would need conference data passed in; for now it's in the travel bonus

  // Postseason reduction (playoff games are more neutral)
  const postseasonFactor = input.isPostseason ? 0.5 : 1;

  // Calculate total
  const beforePostseason = (baseAndCrowd + travel + altitude + team) * divisionScale;
  const hfa = beforePostseason * postseasonFactor;

  return {
    hfa: Math.max(0, hfa), // HFA cannot be negative
    breakdown: {
      base: BASE_HFA * domeFactor * postseasonFactor,
      travel: travel * postseasonFactor,
      altitude: altitude * postseasonFactor,
      crowd: crowd * domeFactor * postseasonFactor,
      dome: (base + crowd) * (1 - domeFactor) * postseasonFactor,
      team: team * postseasonFactor,
      postseason: beforePostseason * (1 - postseasonFactor),
    },
  };
}

/**
 * Fetch team elevation data from database
 */
export async function getTeamElevations(
  prisma: PrismaClient
): Promise<Map<number, number>> {
  const teams = await prisma.team.findMany({
    select: {
      id: true,
      metadata: true,
    },
  });

  const elevations = new Map<number, number>();

  for (const team of teams) {
    const metadata = team.metadata as Record<string, unknown> | null;
    const venue = metadata?.venue as Record<string, unknown> | null;
    const elevation = venue?.elevation as number | null;

    if (elevation) {
      elevations.set(team.id, elevation);
    }
  }

  return elevations;
}

/**
 * Batch calculate HFA for all games in a season
 */
export async function calculateSeasonHfa(
  prisma: PrismaClient,
  seasonId: number
): Promise<Map<number, number>> {
  const hfaMap = new Map<number, number>();

  const games = await prisma.game.findMany({
    where: { seasonId },
    include: {
      homeTeam: {
        select: {
          id: true,
          name: true,
          stadiumCapacity: true,
          metadata: true,
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
          metadata: true,
        },
      },
    },
  });

  const elevations = await getTeamElevations(prisma);

  for (const game of games) {
    const homeMetadata = game.homeTeam.metadata as Record<string, unknown> | null;
    const homeVenue = homeMetadata?.venue as Record<string, unknown> | null;

    const input: HomeFieldAdvantageInput = {
      isNeutralSite: game.isNeutralSite,
      isPostseason: game.isPostseason,
      stadiumElevation: homeVenue?.elevation as number | null ?? undefined,
      awayElevation: elevations.get(game.awayTeam.id),
      stadiumCapacity: game.homeTeam.stadiumCapacity ?? undefined,
      isDome: homeVenue?.dome as boolean | null ?? undefined,
      teamHfaModifier: getTeamHfaModifier(game.homeTeam.name),
    };

    const result = calculateHomeFieldAdvantage(input);
    hfaMap.set(game.id, result.hfa);
  }

  return hfaMap;
}
