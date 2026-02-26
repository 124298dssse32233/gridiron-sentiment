import "dotenv/config";
import { updateRatings } from "../src/lib/gridrank/engine";
import type { GameResult, TeamRating } from "../src/lib/gridrank/engine";

async function main() {
  const ratings = new Map<number, TeamRating>();

  // Initialize two teams
  const team1Id = 1;
  const team2Id = 2;
  const team3Id = 3;

  ratings.set(team1Id, {
    teamId: team1Id,
    mu: 1199,
    rd: 280,
    sigma: 0.06,
    level: "FCS",
  });

  ratings.set(team2Id, {
    teamId: team2Id,
    mu: 1199,
    rd: 280,
    sigma: 0.06,
    level: "FCS",
  });

  ratings.set(team3Id, {
    teamId: team3Id,
    mu: 1199,
    rd: 280,
    sigma: 0.06,
    level: "FCS",
  });

  // Game 1: Team 2 (Norfolk State) vs Team 1 (Florida A&M), Team 2 wins 23-24
  console.log("Game 1: Team 2 vs Team 1 (23-24)");
  let game1Home = ratings.get(team2Id)!;
  let game1Away = ratings.get(team1Id)!;

  console.log(`  Before: Home mu=${game1Home.mu}, sigma=${game1Home.sigma}, level=${game1Home.level}`);
  console.log(`  Before: Away mu=${game1Away.mu}, sigma=${game1Away.sigma}, level=${game1Away.level}`);

  const gameResult1: GameResult = {
    homeRating: game1Home,
    awayRating: game1Away,
    homeScore: 23,
    awayScore: 24,
    isNeutralSite: false,
    isPostseason: false,
  };

  const update1 = updateRatings(game1Home, game1Away, gameResult1);

  console.log(`  After: Home mu=${update1.homeRating.mu}, sigma=${update1.homeRating.sigma}, level=${update1.homeRating.level}`);
  console.log(`  After: Away mu=${update1.awayRating.mu}, sigma=${update1.awayRating.sigma}, level=${update1.awayRating.level}`);
  console.log(`  Has all required fields?`, 'teamId' in update1.homeRating && 'mu' in update1.homeRating && 'rd' in update1.homeRating && 'sigma' in update1.homeRating && 'level' in update1.homeRating);

  // Store the updated ratings
  ratings.set(team2Id, update1.homeRating);
  ratings.set(team1Id, update1.awayRating);

  // Game 2: Team 1 (Florida A&M) vs Team 3 (South Carolina State), Team 1 wins 22-18
  console.log("\nGame 2: Team 1 vs Team 3 (22-18)");
  let game2Home = ratings.get(team1Id)!;
  let game2Away = ratings.get(team3Id)!;

  console.log(`  Before: Home mu=${game2Home.mu}, sigma=${game2Home.sigma}, level=${game2Home.level}`);
  console.log(`  Before: Away mu=${game2Away.mu}, sigma=${game2Away.sigma}, level=${game2Away.level}`);

  const gameResult2: GameResult = {
    homeRating: game2Home,
    awayRating: game2Away,
    homeScore: 22,
    awayScore: 18,
    isNeutralSite: false,
    isPostseason: false,
  };

  const update2 = updateRatings(game2Home, game2Away, gameResult2);

  console.log(`  After: Home mu=${update2.homeRating.mu}, sigma=${update2.homeRating.sigma}, level=${update2.homeRating.level}`);
  console.log(`  After: Away mu=${update2.awayRating.mu}, sigma=${update2.awayRating.sigma}, level=${update2.awayRating.level}`);
  console.log(`  Is NaN? Home=${isNaN(update2.homeRating.mu)}, Away=${isNaN(update2.awayRating.mu)}`);
}

main().catch(console.error);
