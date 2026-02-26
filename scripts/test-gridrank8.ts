import "dotenv/config";
import { updateRatings } from "../src/lib/gridrank/engine";
import type { GameResult, TeamRating } from "../src/lib/gridrank/engine";

async function main() {
  const ratings = new Map<number, TeamRating>();

  // After game 1, Florida A&M's rating (from away position)
  const famuRating: TeamRating = {
    teamId: 1,
    mu: 1199.0154264679793,
    rd: 280.04463929880893,  // Note: This is the updated rd from the first game!
    sigma: 0.06,
    level: "FCS",
  };

  const scsrRating: TeamRating = {
    teamId: 3,
    mu: 1199,
    rd: 280,
    sigma: 0.06,
    level: "FCS",
  };

  console.log("Before game 2:");
  console.log(`  Florida A&M: mu=${famuRating.mu}, rd=${famuRating.rd}, sigma=${famuRating.sigma}, level=${famuRating.level}`);
  console.log(`  SC State: mu=${scsrRating.mu}, rd=${scsrRating.rd}, sigma=${scsrRating.sigma}, level=${scsrRating.level}`);

  const gameResult: GameResult = {
    homeRating: famuRating,
    awayRating: scsrRating,
    homeScore: 22,
    awayScore: 18,
    isNeutralSite: false,
    isPostseason: false,
  };

  const result = updateRatings(famuRating, scsrRating, gameResult);

  console.log("\nAfter game 2:");
  console.log(`  Florida A&M: mu=${result.homeRating.mu}, Is NaN? ${isNaN(result.homeRating.mu)}`);
  console.log(`  SC State: mu=${result.awayRating.mu}, Is NaN? ${isNaN(result.awayRating.mu)}`);
  console.log(`  Florida A&M rd: ${result.homeRating.rd}`);
  console.log(`  SC State rd: ${result.awayRating.rd}`);
}

main().catch(console.error);
