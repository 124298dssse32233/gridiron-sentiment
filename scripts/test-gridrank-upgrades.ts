/**
 * GridRank Algorithm Upgrade Sanity Checks
 *
 * Validates all 6 research-backed changes produce expected behavior.
 * Run with: npx tsx scripts/test-gridrank-upgrades.ts
 */

import {
  marginMultiplier,
  getCrossLevelAdjustment,
  getCrossLevelWeight,
  updateRatings,
  adjustRdForConnectivity,
  expectedOutcome,
  type TeamRating,
  type GameResult,
} from "../src/lib/gridrank/engine";

import {
  detectGarbageTime,
  getDivisionGarbageScale,
  getEffectiveThreshold,
  type QuarterScores,
} from "../src/lib/gridrank/garbage-time";

import { getPriorWeight } from "../src/lib/gridrank/preseason";

import {
  computeFiveFactors,
  applyFiveFactorsBlend,
  isSuccessfulPlay,
  type FiveFactorsInput,
} from "../src/lib/gridrank/five-factors";

import { SUB_TIER_PRIORS, POWER_CONFERENCES, TOP_FCS_CONFERENCES } from "../src/lib/utils/constants";

// =============================================================================
// TEST HARNESS
// =============================================================================

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    const msg = detail ? `${testName}: ${detail}` : testName;
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

function approxEqual(a: number, b: number, tolerance: number = 0.01): boolean {
  return Math.abs(a - b) < tolerance;
}

function section(name: string): void {
  console.log(`\n═══ ${name} ═══`);
}

// =============================================================================
// TEST 1: MOV MULTIPLIER
// =============================================================================

section("Change 1: FiveThirtyEight MOV Multiplier");

// 28-pt win by a 300-pt favorite → small update (autocorrelation correction dampens it)
const movFavorite = marginMultiplier(28, 300);
// 28-pt win by equal teams → larger update
const movEqual = marginMultiplier(28, 0);
// 28-pt win by underdog → even larger update (upset with big margin)
const movUnderdog = marginMultiplier(28, -100);

assert(movEqual > movFavorite, "Equal teams win by 28 > favorite wins by 28",
  `equal=${movEqual.toFixed(3)}, fav=${movFavorite.toFixed(3)}`);
// When ratingDiff is negative (underdog won), Math.max(0, ratingDiff) clips to 0,
// so underdog multiplier equals equal-team multiplier. This is correct:
// the autocorrelation correction only dampens expected wins, not upsets.
assert(movUnderdog >= movEqual, "Underdog win by 28 >= equal teams win by 28 (correction only dampens favorites)",
  `underdog=${movUnderdog.toFixed(3)}, equal=${movEqual.toFixed(3)}`);
assert(movFavorite > 0, "Favorite still gets some credit for big win",
  `fav=${movFavorite.toFixed(3)}`);

// Blowout diminishing returns
const mov7 = marginMultiplier(7, 0);
const mov28 = marginMultiplier(28, 0);
const mov56 = marginMultiplier(56, 0);
assert(mov28 / mov7 < 56 / 28, "Diminishing returns on margin (28 vs 7)",
  `ratio=${(mov28 / mov7).toFixed(3)}`);
assert(mov56 / mov28 < 2, "56-pt win not 2x the 28-pt win signal",
  `ratio=${(mov56 / mov28).toFixed(3)}`);

// =============================================================================
// TEST 2: GARBAGE TIME
// =============================================================================

section("Change 2: Tighter Garbage Time Thresholds");

// Q3 with 25-point lead → should now be garbage time (was not under old 28 threshold)
const q3GarbageScores: QuarterScores = {
  homeScores: [14, 14, 7, 7],
  awayScores: [0, 3, 7, 0],
};
const q3Result = detectGarbageTime(q3GarbageScores);
// After Q2: home 28, away 3 → margin 25 → above new Q3 threshold of 22
assert(q3Result.hasGarbageTime, "25-pt lead after Q2 triggers Q3 garbage time (was not under old 28)");
assert(q3Result.reductionFactor < 1, "Reduction factor applied for garbage time",
  `factor=${q3Result.reductionFactor.toFixed(3)}`);

// Division scaling: FCS threshold should be lower
const fbsThreshold = getEffectiveThreshold(3, 'FBS');
const fcsThreshold = getEffectiveThreshold(3, 'FCS');
const d2Threshold = getEffectiveThreshold(3, 'D2');
assert(fcsThreshold < fbsThreshold, "FCS Q3 threshold lower than FBS",
  `FCS=${fcsThreshold.toFixed(1)}, FBS=${fbsThreshold.toFixed(1)}`);
assert(d2Threshold < fcsThreshold, "D2 Q3 threshold lower than FCS",
  `D2=${d2Threshold.toFixed(1)}, FCS=${fcsThreshold.toFixed(1)}`);

// Division scales
assert(getDivisionGarbageScale('FBS') === 1.0, "FBS scale = 1.0");
assert(getDivisionGarbageScale('FCS') === 0.85, "FCS scale = 0.85");
assert(getDivisionGarbageScale('D3') === 0.70, "D3 scale = 0.70");

// =============================================================================
// TEST 3: PRESEASON PRIOR DECAY
// =============================================================================

section("Change 3: Preseason Prior Decay (SP+-inspired)");

assert(getPriorWeight(0) === 0.70, "Week 0 prior weight = 0.70 (was 0.60)",
  `got=${getPriorWeight(0)}`);
assert(getPriorWeight(5) === 0.10, "Week 5 prior weight = 0.10 (was 0.20)",
  `got=${getPriorWeight(5)}`);
assert(getPriorWeight(6) === 0.03, "Week 6 prior weight = 0.03 (fast decay)",
  `got=${getPriorWeight(6)}`);
assert(getPriorWeight(13) === 0.03, "Week 13 prior weight = 0.03 (plateau)",
  `got=${getPriorWeight(13)}`);

// Prior weight should decrease monotonically
let prevWeight = 1.0;
let monotonic = true;
for (let w = 0; w <= 13; w++) {
  const weight = getPriorWeight(w);
  if (weight > prevWeight) { monotonic = false; break; }
  prevWeight = weight;
}
assert(monotonic, "Prior weights decrease monotonically");

// =============================================================================
// TEST 4: CROSS-LEVEL CALIBRATION
// =============================================================================

section("Change 5: Cross-Level Calibration");

// FBS-FCS game weighted 1.3x
assert(getCrossLevelWeight('FBS', 'FCS') === 1.3, "FBS-FCS game weight = 1.3x",
  `got=${getCrossLevelWeight('FBS', 'FCS')}`);
assert(getCrossLevelWeight('FCS', 'FBS') === 1.3, "FCS-FBS game weight = 1.3x (symmetric)");

// Non-adjacent levels get higher weight
assert(getCrossLevelWeight('FBS', 'D2') === 1.5, "FBS-D2 game weight = 1.5x");
assert(getCrossLevelWeight('FBS', 'NAIA') === 1.5, "FBS-NAIA game weight = 1.5x");

// Same level = 1.0
assert(getCrossLevelWeight('FBS', 'FBS') === 1.0, "Same level weight = 1.0");

// Margin dampening still works
assert(getCrossLevelAdjustment('FBS', 'FCS') === 0.85, "FBS-FCS margin dampened to 85%");
assert(getCrossLevelAdjustment('FBS', 'NAIA') === 0.4, "FBS-NAIA margin dampened to 40%");

// Sub-tier priors
assert(SUB_TIER_PRIORS.FBS_POWER_5.mu === 1580, "Power 5 prior = 1580");
assert(SUB_TIER_PRIORS.FCS_TOP.mu === 1280, "Top FCS prior = 1280");
assert(SUB_TIER_PRIORS.FCS_TOP.mu > SUB_TIER_PRIORS.FBS_BOTTOM.mu - 100,
  "Top FCS overlaps with bottom FBS (within 100 pts)");
assert(SUB_TIER_PRIORS.D3.mu === 850, "D3 prior = 850");

// Connectivity-based RD
const testRating: TeamRating = { teamId: 1, mu: 1500, rd: 200, sigma: 0.06, level: 'FBS' };
const connected = adjustRdForConnectivity(testRating, 3);
const oneGame = adjustRdForConnectivity(testRating, 1);
const noGames = adjustRdForConnectivity(testRating, 0);
assert(connected.rd === 200, "2+ cross-level games: no RD change");
assert(approxEqual(oneGame.rd, 230, 0.01), "1 cross-level game: RD × 1.15",
  `got=${oneGame.rd}`);
assert(noGames.rd === 260, "0 cross-level games: RD × 1.3",
  `got=${noGames.rd}`);

// =============================================================================
// TEST 5: FIVE FACTORS
// =============================================================================

section("Change 6: Five Factors Integration");

// Success rate definition
assert(isSuccessfulPlay(1, 10, 5) === true, "1st down: 5 of 10 yards = success (50%)");
assert(isSuccessfulPlay(1, 10, 4) === false, "1st down: 4 of 10 yards = fail");
assert(isSuccessfulPlay(2, 7, 5) === true, "2nd down: 5 of 7 yards = success (71%)");
assert(isSuccessfulPlay(3, 5, 5) === true, "3rd down: 5 of 5 yards = success (100%)");
assert(isSuccessfulPlay(3, 5, 4) === false, "3rd down: 4 of 5 yards = fail");

// Five Factors composite
const goodTeam: FiveFactorsInput = {
  offSuccessRate: 0.50, defSuccessRate: 0.35,
  offExplosiveness: 1.50, defExplosiveness: 1.10,
  avgFieldPosition: 35, finishingDrives: 5.5,
  netTurnovers: 5, gamesPlayed: 10,
};
const badTeam: FiveFactorsInput = {
  offSuccessRate: 0.35, defSuccessRate: 0.50,
  offExplosiveness: 1.10, defExplosiveness: 1.50,
  avgFieldPosition: 25, finishingDrives: 3.0,
  netTurnovers: -5, gamesPlayed: 10,
};

const goodResult = computeFiveFactors(goodTeam, 10);
const badResult = computeFiveFactors(badTeam, 10);

assert(goodResult.ratingAdjustment > 0, "Good team gets positive rating adjustment",
  `adj=${goodResult.ratingAdjustment.toFixed(1)}`);
assert(badResult.ratingAdjustment < 0, "Bad team gets negative rating adjustment",
  `adj=${badResult.ratingAdjustment.toFixed(1)}`);
assert(Math.abs(goodResult.ratingAdjustment) <= 30, "Adjustment capped at ±30",
  `adj=${goodResult.ratingAdjustment.toFixed(1)}`);

// Blend weight increases with weeks
const earlyResult = computeFiveFactors(goodTeam, 2);
const lateResult = computeFiveFactors(goodTeam, 12);
assert(lateResult.blendWeight > earlyResult.blendWeight,
  "Blend weight increases through season",
  `early=${earlyResult.blendWeight.toFixed(3)}, late=${lateResult.blendWeight.toFixed(3)}`);
assert(lateResult.blendWeight <= 0.20, "Max blend weight ≤ 20%",
  `got=${lateResult.blendWeight.toFixed(3)}`);

// Blend application
const baseRating = 1500;
const blended = applyFiveFactorsBlend(baseRating, goodResult);
assert(blended > baseRating, "Good Five Factors raises rating");
assert(blended < baseRating + 30, "Adjustment bounded");

// =============================================================================
// TEST 6: INTEGRATED UPDATE
// =============================================================================

section("Integrated: Rating Update Behavior");

const homeTeam: TeamRating = { teamId: 1, mu: 1500, rd: 200, sigma: 0.06, level: 'FBS' };
const awayTeam: TeamRating = { teamId: 2, mu: 1500, rd: 200, sigma: 0.06, level: 'FBS' };

// Close game: home wins by 3
const closeGame: GameResult = {
  homeRating: homeTeam,
  awayRating: awayTeam,
  homeScore: 24,
  awayScore: 21,
  isNeutralSite: true,
  isPostseason: false,
};

const closeResult = updateRatings(homeTeam, awayTeam, closeGame);
assert(closeResult.homeRating.mu > 1500, "Home team rating increases after close win");
assert(closeResult.awayRating.mu < 1500, "Away team rating decreases after close loss");

// Blowout: home wins by 35
const blowoutGame: GameResult = {
  ...closeGame,
  homeScore: 49,
  awayScore: 14,
};

const blowoutResult = updateRatings(homeTeam, awayTeam, blowoutGame);
const closeMovement = closeResult.homeRating.mu - 1500;
const blowoutMovement = blowoutResult.homeRating.mu - 1500;
assert(blowoutMovement > closeMovement, "Blowout win moves rating more than close win",
  `blowout=${blowoutMovement.toFixed(1)}, close=${closeMovement.toFixed(1)}`);

// Cross-level: FBS vs FCS
const fcsTeam: TeamRating = { teamId: 3, mu: 1200, rd: 280, sigma: 0.06, level: 'FCS' };
const crossLevelGame: GameResult = {
  homeRating: homeTeam,
  awayRating: fcsTeam,
  homeScore: 45,
  awayScore: 10,
  isNeutralSite: true,
  isPostseason: false,
};

const crossResult = updateRatings(homeTeam, fcsTeam, crossLevelGame);
// FBS team shouldn't gain much from expected blowout vs FCS
assert(crossResult.homeRating.mu - 1500 < blowoutMovement,
  "FBS blowout of FCS produces less movement than FBS blowout of FBS (autocorrelation)",
  `cross=${(crossResult.homeRating.mu - 1500).toFixed(1)}, sameLvl=${blowoutMovement.toFixed(1)}`);

// =============================================================================
// SUMMARY
// =============================================================================

console.log("\n═══════════════════════════════════════════");
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log("\nFailures:");
  failures.forEach(f => console.log(`  - ${f}`));
}
console.log("═══════════════════════════════════════════");

process.exit(failed > 0 ? 1 : 0);
