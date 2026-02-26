import "dotenv/config";
import { updateRatings, expectedOutcome, compressMargin, compressedMarginToOutcome, getCrossLevelAdjustment, calculateGarbageTimeFactor } from "../src/lib/gridrank/engine";
import type { GameResult, TeamRating } from "../src/lib/gridrank/engine";

async function main() {
  // Exact values from test-gridrank6
  const homeRating: TeamRating = {
    teamId: 1,
    mu: 1199.0154264679793,
    rd: 280,
    sigma: 0.06,
    level: "FCS",
  };

  const awayRating: TeamRating = {
    teamId: 3,
    mu: 1199,
    rd: 280,
    sigma: 0.06,
    level: "FCS",
  };

  const gameResult: GameResult = {
    homeRating,
    awayRating,
    homeScore: 22,
    awayScore: 18,
    isNeutralSite: false,
    isPostseason: false,
  };

  // Manual calculation of each step
  console.log("=== Manual Calculation ===");
  console.log(`homeRating.mu = ${homeRating.mu}`);
  console.log(`awayRating.mu = ${awayRating.mu}`);
  console.log(`homeRating.rd = ${homeRating.rd}`);
  console.log(`awayRating.rd = ${awayRating.rd}`);

  const homeFieldAdvantage = 2.5;
  console.log(`\nhomeFieldAdvantage = ${homeFieldAdvantage}`);

  const garbageTimeFactor = calculateGarbageTimeFactor(undefined, undefined);
  console.log(`garbageTimeFactor = ${garbageTimeFactor}`);

  const expected = expectedOutcome(homeRating.mu, awayRating.mu, homeFieldAdvantage);
  console.log(`expected = ${expected}`);

  const mov = 22 - 18;
  console.log(`\nmov = ${mov}`);

  const compressed = compressMargin(mov);
  console.log(`compressed = ${compressed}`);

  const actualOutcome = compressedMarginToOutcome(compressed);
  console.log(`actualOutcome = ${actualOutcome}`);

  const crossLevelFactor = getCrossLevelAdjustment(homeRating.level, awayRating.level);
  console.log(`crossLevelFactor = ${crossLevelFactor}`);

  const adjustedOutcome = 0.5 + (actualOutcome - 0.5) * garbageTimeFactor * crossLevelFactor;
  console.log(`adjustedOutcome = ${adjustedOutcome}`);

  // K factor calculation
  const rdHome = Math.sqrt(homeRating.rd * homeRating.rd + 25);
  const rdAway = Math.sqrt(awayRating.rd * awayRating.rd + 25);
  console.log(`\nrdHome = ${rdHome}`);
  console.log(`rdAway = ${rdAway}`);

  const kHome = 0.35 * rdHome / 83.78;
  const kAway = 0.35 * rdAway / 83.78;
  console.log(`kHome = ${kHome}`);
  console.log(`kAway = ${kAway}`);

  // Rating updates
  const diff1 = adjustedOutcome - expected;
  console.log(`\nadjustedOutcome - expected = ${diff1}`);

  const newHomeMu = homeRating.mu + kHome * diff1;
  console.log(`newHomeMu = ${homeRating.mu} + ${kHome} * ${diff1} = ${newHomeMu}`);
  console.log(`Is NaN? ${isNaN(newHomeMu)}`);

  const diff2 = (1 - adjustedOutcome) - (1 - expected);
  console.log(`\n(1 - adjustedOutcome) - (1 - expected) = ${diff2}`);
  console.log(`Simplifies to: expected - adjustedOutcome = ${expected - adjustedOutcome}`);

  const newAwayMu = awayRating.mu + kAway * diff2;
  console.log(`newAwayMu = ${awayRating.mu} + ${kAway} * ${diff2} = ${newAwayMu}`);
  console.log(`Is NaN? ${isNaN(newAwayMu)}`);

  // Now run the actual function
  console.log("\n=== Actual Function ===");
  const result = updateRatings(homeRating, awayRating, gameResult);
  console.log(`homeRating.mu = ${result.homeRating.mu}, Is NaN? ${isNaN(result.homeRating.mu)}`);
  console.log(`awayRating.mu = ${result.awayRating.mu}, Is NaN? ${isNaN(result.awayRating.mu)}`);
}

main().catch(console.error);
