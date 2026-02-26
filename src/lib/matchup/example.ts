/**
 * Monte Carlo Matchup Engine — Usage Examples
 *
 * This file demonstrates how to use the simulateMatchup() function
 * in the Matchup Machine feature.
 */

import {
  simulateMatchup,
  calculateWinProbability,
  generateNarrative,
  type MatchupInput,
  type MatchupResult,
} from "./monte-carlo";

// =============================================================================
// EXAMPLE 1: Basic Matchup Simulation
// =============================================================================

/**
 * Simulate a neutral-site matchup between Ohio State and Michigan
 */
export function exampleBasicMatchup() {
  const input: MatchupInput = {
    team1: {
      name: "Ohio State",
      rating: 1796,
      rd: 32,
      level: "FBS",
      offenseRating: 1850,
      defenseRating: 1740,
    },
    team2: {
      name: "Michigan",
      rating: 1742,
      rd: 38,
      level: "FBS",
      offenseRating: 1800,
      defenseRating: 1680,
    },
    location: "neutral",
    simulations: 10000,
  };

  const result = simulateMatchup(input);

  console.log("Basic Matchup Results:");
  console.log(`Win Probability: ${(result.team1WinProbability * 100).toFixed(1)}%`);
  console.log(`Predicted Spread: ${result.predictedSpread.toFixed(1)} points`);
  console.log(`Confidence Interval: ${result.spreadConfidenceInterval[0].toFixed(1)} to ${result.spreadConfidenceInterval[1].toFixed(1)}`);
  console.log(`Avg Total Score: ${result.averageTotal.toFixed(1)}`);
  console.log(`Close Game Prob: ${(result.closeGameProbability * 100).toFixed(1)}%`);
  console.log(`Blowout Prob: ${(result.blowoutProbability * 100).toFixed(1)}%`);
  console.log(`Execution Time: ${result.metadata.executionTimeMs}ms`);
  console.log();

  return result;
}

// =============================================================================
// EXAMPLE 2: Home Game Advantage
// =============================================================================

/**
 * Compare neutral site vs. home-field advantage
 */
export function exampleHomeFieldAdvantage() {
  const baseInput: MatchupInput = {
    team1: {
      name: "Alabama",
      rating: 1750,
      rd: 40,
      level: "FBS",
    },
    team2: {
      name: "Tennessee",
      rating: 1680,
      rd: 45,
      level: "FBS",
    },
    simulations: 5000,
  };

  // Neutral site
  const neutralResult = simulateMatchup({
    ...baseInput,
    location: "neutral",
  });

  // Alabama home
  const alabamaHomeResult = simulateMatchup({
    ...baseInput,
    location: "team1_home",
  });

  // Tennessee home
  const tennesseeHomeResult = simulateMatchup({
    ...baseInput,
    location: "team2_home",
  });

  console.log("Home Field Advantage Example:");
  console.log(
    `Neutral Site:       ${(neutralResult.team1WinProbability * 100).toFixed(1)}% for Alabama`
  );
  console.log(
    `Alabama Home:       ${(alabamaHomeResult.team1WinProbability * 100).toFixed(1)}% for Alabama`
  );
  console.log(
    `Tennessee Home:     ${(tennesseeHomeResult.team1WinProbability * 100).toFixed(1)}% for Alabama`
  );
  console.log();

  return { neutralResult, alabamaHomeResult, tennesseeHomeResult };
}

// =============================================================================
// EXAMPLE 3: Cross-Level Matchup
// =============================================================================

/**
 * Simulate FBS team vs. lower-tier team (e.g., FCS)
 */
export function exampleCrossLevelMatchup() {
  const input: MatchupInput = {
    team1: {
      name: "Texas",
      rating: 1800,
      rd: 30,
      level: "FBS",
    },
    team2: {
      name: "Samford",
      rating: 1100, // FCS team
      rd: 60,
      level: "FCS",
    },
    location: "team1_home",
    simulations: 10000,
  };

  const result = simulateMatchup(input);

  console.log("Cross-Level Matchup (FBS vs. FCS):");
  console.log(`${input.team1.name} (FBS) WP: ${(result.team1WinProbability * 100).toFixed(1)}%`);
  console.log(`${input.team2.name} (FCS) WP: ${(result.team2WinProbability * 100).toFixed(1)}%`);
  console.log(`Predicted Spread: ${result.predictedSpread.toFixed(1)}`);
  console.log(`Close Game (within 7): ${(result.closeGameProbability * 100).toFixed(1)}%`);
  console.log(`Blowout (21+): ${(result.blowoutProbability * 100).toFixed(1)}%`);
  console.log();

  return result;
}

// =============================================================================
// EXAMPLE 4: Narrative Generation
// =============================================================================

/**
 * Generate scouting-style narrative for a matchup
 */
export function exampleNarrative() {
  const input: MatchupInput = {
    team1: {
      name: "Ohio State",
      rating: 1796,
      rd: 32,
      level: "FBS",
    },
    team2: {
      name: "Michigan",
      rating: 1742,
      rd: 38,
      level: "FBS",
    },
    location: "team1_home",
    simulations: 10000,
  };

  const result = simulateMatchup(input);
  const narrative = generateNarrative(result, input);

  console.log("Generated Narrative:");
  console.log(narrative);
  console.log();

  return narrative;
}

// =============================================================================
// EXAMPLE 5: Score Distribution Analysis
// =============================================================================

/**
 * Analyze score distributions and probabilities
 */
export function exampleScoreDistributions() {
  const input: MatchupInput = {
    team1: {
      name: "Kansas State",
      rating: 1680,
      rd: 50,
      level: "FBS",
    },
    team2: {
      name: "Baylor",
      rating: 1650,
      rd: 55,
      level: "FBS",
    },
    location: "neutral",
    simulations: 10000,
  };

  const result = simulateMatchup(input);

  console.log("Score Distribution Analysis:");
  console.log("\nTeam 1 (Kansas State):");
  console.log(`  Mean: ${result.team1ScoreDistribution.mean.toFixed(1)}`);
  console.log(`  Median: ${result.team1ScoreDistribution.median.toFixed(1)}`);
  console.log(`  Range: ${result.team1ScoreDistribution.min}-${result.team1ScoreDistribution.max}`);
  console.log(`  StdDev: ${result.team1ScoreDistribution.stdDev.toFixed(1)}`);

  console.log("\nTeam 2 (Baylor):");
  console.log(`  Mean: ${result.team2ScoreDistribution.mean.toFixed(1)}`);
  console.log(`  Median: ${result.team2ScoreDistribution.median.toFixed(1)}`);
  console.log(`  Range: ${result.team2ScoreDistribution.min}-${result.team2ScoreDistribution.max}`);
  console.log(`  StdDev: ${result.team2ScoreDistribution.stdDev.toFixed(1)}`);

  console.log("\nMargin Distribution:");
  result.marginDistribution.buckets.forEach((bucket) => {
    console.log(`  ${bucket.range}: ${bucket.percentage.toFixed(1)}%`);
  });

  console.log("\nScenario Probabilities:");
  console.log(`  Close Game (≤7): ${(result.closeGameProbability * 100).toFixed(1)}%`);
  console.log(`  Overtime (≤3): ${(result.overtimeProbability * 100).toFixed(1)}%`);
  console.log(`  Blowout (≥21): ${(result.blowoutProbability * 100).toFixed(1)}%`);
  console.log();

  return result;
}

// =============================================================================
// EXAMPLE 6: Win Probability Sensitivity
// =============================================================================

/**
 * Analyze how win probability changes with rating differential
 */
export function exampleWinProbabilitySensitivity() {
  console.log("Win Probability Sensitivity (Team 1):");
  console.log("Rating Diff | No HFA | +2.5 HFA | +5 HFA");
  console.log("------------|--------|----------|--------");

  const ratingDiffs = [-100, -50, 0, 50, 100, 150];

  for (const diff of ratingDiffs) {
    const team1Rating = 1600 + diff / 2;
    const team2Rating = 1600 - diff / 2;

    const noHfa = calculateWinProbability(team1Rating, 50, team2Rating, 50, 0);
    const hfa25 = calculateWinProbability(team1Rating, 50, team2Rating, 50, 2.5);
    const hfa50 = calculateWinProbability(team1Rating, 50, team2Rating, 50, 5);

    console.log(
      `${diff.toString().padStart(11)} | ${(noHfa * 100).toFixed(1).padStart(6)}% | ` +
        `${(hfa25 * 100).toFixed(1).padStart(7)}% | ${(hfa50 * 100).toFixed(1).padStart(6)}%`
    );
  }
  console.log();
}

// =============================================================================
// MAIN: Run all examples (if executed directly)
// =============================================================================

if (require.main === module) {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  Monte Carlo Matchup Engine — Usage Examples              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  exampleBasicMatchup();
  exampleHomeFieldAdvantage();
  exampleCrossLevelMatchup();
  exampleNarrative();
  exampleScoreDistributions();
  exampleWinProbabilitySensitivity();

  console.log("✓ All examples completed");
}
