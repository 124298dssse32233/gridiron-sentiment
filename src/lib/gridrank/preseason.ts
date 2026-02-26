/**
 * Preseason Prior Calculator
 *
 * Calculates preseason GridRank ratings using (transfer portal era weights):
 * - Regressed prior year rating (45%)
 * - Recruiting composite incl. portal (30%)
 * - Returning production (18%)
 * - Coach quality (7%)
 *
 * Prior decay is aggressive: SP+ drops priors to near-zero by week 6.
 */

import { type PrismaClient } from "@prisma/client";
import { INITIAL_RATINGS } from "./engine";

// =============================================================================
// TYPES
// =============================================================================

export interface PreseasonPriorInput {
  teamId: number;
  level: "FBS" | "FCS" | "D2" | "D3" | "NAIA";
  previousRating?: number;
  previousRank?: number;
  recruitingScore?: number;
  recruitingRank?: number;
  returningProduction?: number;
  returningProductionRank?: number;
  coachYears?: number;
  coachWins?: number;
  coachLosses?: number;
  transferNetRating?: number;
}

export interface PreseasonPriorResult {
  teamId: number;
  priorRating: number;
  priorRD: number;
  confidence: "high" | "medium" | "low";
  breakdown: {
    regressedPrior: number;
    recruitingComponent: number;
    returningComponent: number;
    coachComponent: number;
    transferAdjustment: number;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Prior weight decay by week (SP+-inspired aggressive decay).
 * Priors drop to near-zero by week 6 — by then we have enough game data.
 * [week, prior_weight]
 */
const PRIOR_DECAY: ReadonlyArray<number[]> = [
  [0, 0.70],  // Preseason — trust priors more at start (was 0.60)
  [1, 0.55],  // Week 1 (was 0.50)
  [2, 0.40],  // Week 2 (unchanged)
  [3, 0.28],  // Week 3 (was 0.30)
  [4, 0.18],  // Week 4 (was 0.25)
  [5, 0.10],  // Week 5 (was 0.20) — big drop
  [6, 0.03],  // Week 6+ (was 0.15) — near zero
  [7, 0.03],
  [8, 0.03],
  [9, 0.03],
  [10, 0.03],
  [11, 0.03],
  [12, 0.03],
  [13, 0.03],
] as const;

/**
 * Recruiting score normalization by level
 */
const RECRUITING_SCALE: Record<string, { max: number; base: number }> = {
  FBS: { max: 350, base: 1200 },
  FCS: { max: 250, base: 950 },
  D2: { max: 200, base: 750 },
  D3: { max: 150, base: 600 },
  NAIA: { max: 150, base: 500 },
};

/**
 * Returning production scale (percent returning)
 */
const RETURNING_SCALE: Record<string, { max: number; weight: number }> = {
  FBS: { max: 80, weight: 150 },
  FCS: { max: 75, weight: 125 },
  D2: { max: 70, weight: 100 },
  D3: { max: 65, weight: 80 },
  NAIA: { max: 60, weight: 80 },
};

/**
 * Coach stability adjustment
 */
const COACH_STABILITY_BONUS: ReadonlyArray<number[]> = [
  [0, 0],     // New coach
  [1, -20],   // 1 year (slight penalty for uncertainty)
  [2, 0],     // 2 years
  [3, 10],    // 3 years (stability bonus)
  [4, 15],
  [5, 20],
  [6, 25],
  [7, 25],    // Max bonus at 7+ years
] as const;

// =============================================================================
// PRIOR CALCULATION
// =============================================================================

/**
 * Get prior weight for a given week.
 * SP+-inspired: aggressive decay, near-zero by week 6.
 */
export function getPriorWeight(week: number): number {
  if (week < 0) return 0.70;
  for (const [w, weight] of PRIOR_DECAY) {
    if (week <= w) return weight;
  }
  return 0.03; // Minimum prior weight (was 0.02)
}

/**
 * Regress previous season rating toward the mean
 * Reduces extreme ratings and accounts for roster turnover
 */
export function regressPreviousRating(
  previousRating: number,
  previousRD: number,
  level: string
): number {
  const initial = INITIAL_RATINGS[level] || INITIAL_RATINGS.FBS;
  const levelMean = initial.mu;

  // Regression toward mean based on uncertainty
  // Higher RD = more regression
  const regressionFactor = Math.min(0.5, previousRD / 500);

  return previousRating * (1 - regressionFactor) + levelMean * regressionFactor;
}

/**
 * Convert recruiting score to rating component
 */
export function recruitingToRating(
  recruitingScore: number | undefined,
  recruitingRank: number | undefined,
  level: string
): number {
  if (recruitingScore === undefined || recruitingScore === null) {
    return 0; // No data = neutral component
  }

  const scale = RECRUITING_SCALE[level] || RECRUITING_SCALE.FBS;
  const normalized = recruitingScore / scale.max;

  // Convert to rating points (max 150 points above base)
  return normalized * 150;
}

/**
 * Convert returning production to rating component
 */
export function returningProductionToRating(
  returningProduction: number | undefined,
  level: string
): number {
  if (returningProduction === undefined || returningProduction === null) {
    return 0;
  }

  const scale = RETURNING_SCALE[level] || RETURNING_SCALE.FBS;
  const normalized = Math.min(1, returningProduction / scale.max);

  return normalized * scale.weight;
}

/**
 * Calculate coach stability component
 */
export function coachStabilityToRating(
  years: number | undefined,
  wins: number | undefined,
  losses: number | undefined
): number {
  if (years === undefined || years === null) {
    return -10; // Assume new coach penalty if unknown
  }

  // Find bonus for years of experience
  let bonus = 0;
  for (const [y, b] of COACH_STABILITY_BONUS) {
    if (years >= y) bonus = b;
  }

  // Adjust for win-loss record
  if (wins !== undefined && losses !== undefined && wins + losses > 0) {
    const winPct = wins / (wins + losses);
    if (winPct > 0.6) {
      bonus += 15;
    } else if (winPct > 0.5) {
      bonus += 5;
    } else if (winPct < 0.4) {
      bonus -= 10;
    }
  }

  return bonus;
}

/**
 * Calculate transfer portal adjustment
 * Positive = good transfers in, Negative = talent loss
 */
export function calculateTransferAdjustment(
  netRating: number | undefined
): number {
  if (netRating === undefined || netRating === null) {
    return 0;
  }

  // Net EPA from transfers (scaled)
  // Max +50 points for great portal class, max -50 for mass exodus
  return Math.max(-50, Math.min(50, netRating / 10));
}

/**
 * Calculate recruiting composite that includes transfer portal (post-2021 era).
 * High school recruiting is still the foundation, but the portal makes talent
 * more fluid year-to-year.
 *
 * @param highSchoolScore Normalized high school recruiting score (0-1)
 * @param transferPortalNet Net star rating of transfers in minus out
 * @returns Combined recruiting composite score
 */
export function calculateRecruitingComposite(
  highSchoolScore: number,
  transferPortalNet: number = 0
): number {
  // Post-2021: portal matters significantly
  // 70% high school recruiting + 30% portal activity
  return 0.70 * highSchoolScore + 0.30 * Math.max(-1, Math.min(1, transferPortalNet));
}

/**
 * Calculate preseason prior for a single team
 */
export function calculatePreseasonPrior(
  input: PreseasonPriorInput
): PreseasonPriorResult {
  const initial = INITIAL_RATINGS[input.level] || INITIAL_RATINGS.FCS;

  // Component 1: Regressed prior (45% weight when previous rating exists)
  // For teams with no previous rating, use full initial rating
  const regressedPrior = input.previousRating
    ? regressPreviousRating(
        input.previousRating,
        150, // Assume moderate RD for regression
        input.level
      )
    : initial.mu;

  // When there's no previous rating, don't apply the 45% weight reduction
  const regressedComponent = input.previousRating
    ? regressedPrior * 0.45
    : regressedPrior; // Full initial rating for new teams

  // Component 2: Recruiting composite incl. portal (30% weight, up from 25%)
  const baseRecruiting = recruitingToRating(
    input.recruitingScore,
    input.recruitingRank,
    input.level
  );
  const recruitingComposite = input.transferNetRating !== undefined
    ? calculateRecruitingComposite(baseRecruiting / 150, input.transferNetRating / 50) * 150
    : baseRecruiting;
  const recruitingComponent = recruitingComposite * 0.30;

  // Component 3: Returning production (18% weight, up from 15%)
  const returningComponent = returningProductionToRating(
    input.returningProduction,
    input.level
  ) * 0.18;

  // Component 4: Coach quality (7% weight, down from 10% — renamed from "stability")
  const coachComponent = coachStabilityToRating(
    input.coachYears,
    input.coachWins,
    input.coachLosses
  ) * 0.07;

  // Bonus: Transfer portal adjustment (not a weighted component, just an adder)
  const transferAdjustment = calculateTransferAdjustment(
    input.transferNetRating
  );

  // Calculate final prior
  const priorRating =
    regressedComponent +
    recruitingComponent +
    returningComponent +
    coachComponent +
    transferAdjustment;

  // Calculate RD based on data availability
  const hasPrevious = input.previousRating !== undefined;
  const hasRecruiting = input.recruitingScore !== undefined;
  const hasReturning = input.returningProduction !== undefined;

  const dataPoints = [hasPrevious, hasRecruiting, hasReturning].filter(Boolean).length;
  const baseRD = initial.rd;

  // More data = lower uncertainty
  const priorRD = baseRD * (1 - dataPoints * 0.2);

  // Determine confidence level
  let confidence: "high" | "medium" | "low" = "low";
  if (dataPoints >= 3) confidence = "high";
  else if (dataPoints >= 2) confidence = "medium";

  return {
    teamId: input.teamId,
    priorRating,
    priorRD,
    confidence,
    breakdown: {
      regressedPrior: regressedComponent,
      recruitingComponent,
      returningComponent,
      coachComponent,
      transferAdjustment,
    },
  };
}

/**
 * Batch calculate preseason priors for multiple teams
 */
export async function calculatePreseasonPriors(
  prisma: PrismaClient,
  year: number
): Promise<Map<number, PreseasonPriorResult>> {
  const results = new Map<number, PreseasonPriorResult>();

  // Get all teams with their previous year's final ratings
  const previousYear = year - 1;

  // Get teams with last ranking from previous year
  const previousRankings = await prisma.teamRanking.findMany({
    where: {
      ranking: {
        season: { year: previousYear },
      },
    },
    orderBy: {
      rank: "asc",
    },
    take: 200, // Top 200 from previous year
    include: {
      team: {
        include: {
          level: true,
        },
      },
    },
  });

  // Get previous season's final ranking record
  const finalRankings = await prisma.ranking.findMany({
    where: {
      season: { year: previousYear },
      week: null, // Final ranking has null week
    },
  });

  const finalRankingIds = new Set(finalRankings.map((r) => r.id));

  // Build map of team -> previous rating
  const teamPreviousRatings = new Map<number, { rating: number; rank: number }>();
  for (const tr of previousRankings) {
    if (finalRankingIds.has(tr.rankingId)) {
      teamPreviousRatings.set(tr.teamId, {
        rating: Number(tr.rating),
        rank: tr.rank ?? 150,
      });
    }
  }

  // Get all teams
  const teams = await prisma.team.findMany({
    include: {
      level: true,
    },
  });

  // Get recruiting data
  const recruitingTeams = await prisma.player.groupBy({
    by: ["currentTeamId"],
    where: {
      recruitClassYear: year,
      recruitStars: { gte: 3 },
    },
    _avg: {
      recruitRating: true,
    },
    _count: {
      recruitStars: true,
    },
  });

  const recruitingMap = new Map<
    number,
    { score: number; rank: number }
  >();
  for (const rt of recruitingTeams) {
    if (rt.currentTeamId) {
      const score = (rt._avg.recruitRating?.toNumber() ?? 0) * (rt._count.recruitStars ?? 0);
      recruitingMap.set(rt.currentTeamId, { score, rank: 0 });
    }
  }

  // Sort recruiting by score to assign ranks
  const sortedRecruiting = Array.from(recruitingMap.entries())
    .sort(([, a], [, b]) => b.score - a.score);
  sortedRecruiting.forEach(([teamId], idx) => {
    recruitingMap.get(teamId)!.rank = idx + 1;
  });

  // Calculate priors for each team
  for (const team of teams) {
    const previous = teamPreviousRatings.get(team.id);
    const recruiting = recruitingMap.get(team.id);

    const input: PreseasonPriorInput = {
      teamId: team.id,
      level: team.level.name as "FBS" | "FCS" | "D2" | "D3" | "NAIA",
      previousRating: previous?.rating,
      previousRank: previous?.rank,
      recruitingScore: recruiting?.score,
      recruitingRank: recruiting?.rank,
      // TODO: Add returning production and coach data when available
    };

    const result = calculatePreseasonPrior(input);
    results.set(team.id, result);
  }

  return results;
}

/**
 * Get rating components for display
 */
export function formatPriorBreakdown(
  result: PreseasonPriorResult
): string {
  const b = result.breakdown;
  const parts = [
    `Prior: ${b.regressedPrior.toFixed(0)}`,
    b.recruitingComponent !== 0 ? `Recruiting: ${b.recruitingComponent > 0 ? "+" : ""}${b.recruitingComponent.toFixed(0)}` : null,
    b.returningComponent !== 0 ? `Returning: ${b.returningComponent > 0 ? "+" : ""}${b.returningComponent.toFixed(0)}` : null,
    b.coachComponent !== 0 ? `Coach: ${b.coachComponent > 0 ? "+" : ""}${b.coachComponent.toFixed(0)}` : null,
    b.transferAdjustment !== 0 ? `Transfers: ${b.transferAdjustment > 0 ? "+" : ""}${b.transferAdjustment.toFixed(0)}` : null,
  ].filter(Boolean) as string[];

  return parts.join(" | ");
}
