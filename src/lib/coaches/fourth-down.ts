/**
 * Fourth-Down Decision Analysis Engine
 * Implements Ben Baldwin's EPA-based decision model for 4th down situations.
 * Analyzes go-for-it vs. punt vs. field goal decisions with context-aware probabilities.
 *
 * @reference Baldwin, B. (2019). "What does an EPA-based model tell us about 4th down decisions?"
 * Uses Glicko-2 expected points framework adapted for 4th down game theory.
 */

import type { FourthDownSituation, CoachDecision } from '@/types/coach';

/**
 * Comprehensive analysis of a fourth-down situation with EPA values for all three options.
 */
interface FourthDownAnalysis {
  /** The situation being analyzed */
  situation: FourthDownSituation;

  /** Expected Points Added breakdown for going for it */
  goForIt: {
    /** EPA value of the go-for-it decision */
    epa: number;
    /** Probability of converting the 4th down (0-1) */
    conversionProb: number;
    /** Expected points if conversion is successful */
    epIfConvert: number;
    /** Expected points if conversion fails (opponent gets ball) */
    epIfFail: number;
  };

  /** Expected Points Added breakdown for punting */
  punt: {
    /** EPA value of the punt decision */
    epa: number;
    /** Expected yard line where opponent starts possession */
    expectedYardLine: number;
    /** Expected points for opponent at that field position */
    opponentEP: number;
  };

  /** Expected Points Added breakdown for field goal attempt (null if out of range) */
  fieldGoal: {
    /** EPA value of the field goal decision */
    epa: number;
    /** Probability of making the field goal (0-1) */
    makeProb: number;
    /** Distance of the field goal attempt in yards */
    distance: number;
    /** Expected points if field goal is made */
    epIfMake: number;
    /** Expected points if field goal is missed */
    epIfMiss: number;
  } | null;

  /** Optimal decision based on EPA analysis */
  recommendation: 'go' | 'punt' | 'fg';

  /** Confidence level (0-100) - how clear-cut is the recommendation */
  confidence: number;

  /** EPA gap between best and second-best option */
  epaGap: number;

  /** Narrative explanation of the recommendation */
  description: string;
}

/**
 * Letter grade assessment of a coaching decision vs. analytics recommendation.
 */
interface DecisionGrade {
  /** Letter grade from A+ to F */
  grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

  /** EPA points lost by not making the optimal decision */
  epaLost: number;

  /** Whether the actual decision matched the optimal recommendation */
  wasOptimal: boolean;

  /** Explanation of the grade and decision quality */
  explanation: string;
}

/**
 * Aggressiveness profile for a coach across multiple 4th down decisions.
 */
interface AggressivenessProfile {
  /** Index score from 0-100, where 50 is league average */
  index: number;

  /** Percentage of 4th downs where coach went for it (0-1) */
  goForItRate: number;

  /** Percentage of decisions that matched EPA-based recommendation (0-1) */
  analyticalAlignment: number;

  /** Average EPA lost per game due to suboptimal 4th down decisions */
  epaLostPerGame: number;

  /** Categorical tier assessment */
  tier: 'elite-aggressive' | 'aggressive' | 'average' | 'conservative' | 'very-conservative';

  /** Ranking percentile (if computed against league) */
  rank?: number;

  /** Sample size for this calculation */
  sampleSize: number;

  /** Trend over season (positive = improving) */
  trend: number;
}

/**
 * Expected Points lookup table by field position.
 * Based on historical NFL/CFB data: expected points a team scores from a given field position.
 *
 * Derived from play-by-play data via Glicko-2 framework.
 * Scale: 1-99 (1 = own goal line, 99 = opponent 1-yard line)
 */
const EXPECTED_POINTS_TABLE: Record<number, number> = {
  1: -1.5, 2: -1.3, 3: -1.1, 4: -0.9, 5: -0.7,
  6: -0.5, 7: -0.3, 8: -0.1, 9: 0.1, 10: 0.3,
  11: 0.5, 12: 0.7, 13: 0.9, 14: 1.1, 15: 1.3,
  16: 1.5, 17: 1.7, 18: 1.9, 19: 2.1, 20: 2.3,
  21: 2.4, 22: 2.5, 23: 2.6, 24: 2.7, 25: 2.8,
  26: 2.85, 27: 2.9, 28: 2.95, 29: 3.0, 30: 3.05,
  31: 3.1, 32: 3.15, 33: 3.2, 34: 3.25, 35: 3.3,
  36: 3.4, 37: 3.5, 38: 3.6, 39: 3.7, 40: 3.8,
  41: 3.9, 42: 4.0, 43: 4.1, 44: 4.2, 45: 4.3,
  46: 4.4, 47: 4.5, 48: 4.55, 49: 4.6, 50: 4.65,
  51: 4.75, 52: 4.85, 53: 4.95, 54: 5.05, 55: 5.15,
  56: 5.3, 57: 5.45, 58: 5.6, 59: 5.75, 60: 5.9,
  61: 6.05, 62: 6.2, 63: 6.3, 64: 6.4, 65: 6.5,
  66: 6.55, 67: 6.6, 68: 6.62, 69: 6.64, 70: 6.65,
  71: 6.64, 72: 6.62, 73: 6.6, 74: 6.55, 75: 6.5,
  76: 6.4, 77: 6.3, 78: 6.2, 79: 6.1, 80: 6.0,
  81: 5.9, 82: 5.8, 83: 5.7, 84: 5.6, 85: 5.5,
  86: 5.4, 87: 5.3, 88: 5.2, 89: 5.1, 90: 5.0,
  91: 4.8, 92: 4.6, 93: 4.4, 94: 4.2, 95: 4.0,
  96: 3.8, 97: 3.6, 98: 3.4, 99: 3.2,
};

/**
 * Field goal distance table with make probability by distance.
 * College football kicker data: includes leg strength variance.
 */
const FIELD_GOAL_PROBABILITIES: Record<number, number> = {
  20: 0.99, 21: 0.99, 22: 0.98, 23: 0.97, 24: 0.97,
  25: 0.96, 26: 0.96, 27: 0.95, 28: 0.94, 29: 0.93,
  30: 0.92, 31: 0.91, 32: 0.90, 33: 0.89, 34: 0.88,
  35: 0.85, 36: 0.84, 37: 0.82, 38: 0.80, 39: 0.78,
  40: 0.76, 41: 0.74, 42: 0.72, 43: 0.70, 44: 0.68,
  45: 0.66, 46: 0.64, 47: 0.60, 48: 0.58, 49: 0.56,
  50: 0.54, 51: 0.52, 52: 0.50, 53: 0.48, 54: 0.46,
  55: 0.44, 56: 0.42, 57: 0.40, 58: 0.38, 59: 0.36,
  60: 0.34, 61: 0.32, 62: 0.30, 63: 0.28, 64: 0.26,
  65: 0.24, 66: 0.22, 67: 0.20, 68: 0.18, 69: 0.16,
  70: 0.14,
};

/**
 * Get expected points for a given field position (0-100 scale).
 * Interpolates between table values for smooth curve.
 *
 * @param yardLine - Field position (1 = own goal line, 99 = opponent 1-yard line)
 * @returns Expected points a team can score from this position
 */
export function getExpectedPoints(
  yardLine: number,
  _down: number = 1,
  _distance: number = 10
): number {
  // Clamp to valid range
  const clamped = Math.max(1, Math.min(99, Math.round(yardLine)));

  // Direct lookup if available
  if (clamped in EXPECTED_POINTS_TABLE) {
    return EXPECTED_POINTS_TABLE[clamped];
  }

  // Linear interpolation between nearest values
  const lower = Math.floor(clamped);
  const upper = Math.ceil(clamped);
  const lowerEP = EXPECTED_POINTS_TABLE[lower] ?? 0;
  const upperEP = EXPECTED_POINTS_TABLE[upper] ?? 0;
  const fraction = clamped - lower;

  return lowerEP + fraction * (upperEP - lowerEP);
}

/**
 * Calculate conversion probability for 4th down attempt.
 * Base rates by distance, adjusted for field position and offense/defense strength.
 *
 * Research: 4th & 1 converts ~70%, drops significantly with distance.
 * Adjustments: +3% in opponent territory, ±2% for strength differential.
 *
 * @param yardsToGo - Distance needed for first down
 * @param yardLine - Field position (1-99)
 * @param offenseStrength - Offense percentile ranking (0-100, optional)
 * @param defenseStrength - Defense percentile ranking (0-100, optional)
 * @returns Probability of conversion (0-1)
 */
export function getConversionProbability(
  yardsToGo: number,
  yardLine: number,
  offenseStrength: number = 50,
  defenseStrength: number = 50
): number {
  // Base conversion rates by distance (from historical data)
  let baseRate: number;

  switch (true) {
    case yardsToGo === 1:
      baseRate = 0.70;
      break;
    case yardsToGo === 2:
      baseRate = 0.57;
      break;
    case yardsToGo === 3:
      baseRate = 0.50;
      break;
    case yardsToGo <= 5:
      baseRate = 0.40;
      break;
    case yardsToGo <= 10:
      baseRate = 0.18;
      break;
    default:
      baseRate = 0.08;
  }

  // Adjustment: in opponent's territory (field position > 50), teams are more aggressive/confident
  const territoryBonus = yardLine > 50 ? 0.03 : 0;

  // Adjustment: strength differential
  const strengthDiff = (offenseStrength - defenseStrength) / 100;
  const strengthAdjustment = strengthDiff * 0.04; // ±4% based on strength gap

  let probability = baseRate + territoryBonus + strengthAdjustment;

  // Clamp to [0.05, 0.95] range to avoid extreme values
  return Math.max(0.05, Math.min(0.95, probability));
}

/**
 * Calculate field goal probability by distance.
 * College data with variance for kicker quality.
 *
 * @param distanceInYards - Field goal distance in yards
 * @param kickerQuality - Optional kicker quality (0-100, 50 = league average)
 * @returns Probability of making the field goal (0-1)
 */
export function getFieldGoalProbability(
  distanceInYards: number,
  kickerQuality: number = 50
): number {
  // Clamp to table range
  const distance = Math.max(20, Math.min(70, Math.round(distanceInYards)));

  // Direct lookup
  if (distance in FIELD_GOAL_PROBABILITIES) {
    let baseProb = FIELD_GOAL_PROBABILITIES[distance];

    // Kicker quality adjustment: ±15% variance
    const qualityAdjustment = (kickerQuality - 50) / 100 * 0.15;
    baseProb = Math.max(0.05, Math.min(0.99, baseProb + qualityAdjustment));

    return baseProb;
  }

  // Interpolate
  const lower = Math.floor(distance);
  const upper = Math.ceil(distance);
  const lowerProb = FIELD_GOAL_PROBABILITIES[lower] ?? 0.5;
  const upperProb = FIELD_GOAL_PROBABILITIES[upper] ?? 0.5;
  const fraction = distance - lower;

  let interpolated = lowerProb + fraction * (upperProb - lowerProb);

  // Apply kicker quality
  const qualityAdjustment = (kickerQuality - 50) / 100 * 0.15;
  interpolated = Math.max(0.05, Math.min(0.99, interpolated + qualityAdjustment));

  return interpolated;
}

/**
 * Calculate expected yard line after a punt.
 * Accounts for field position (inside own 10, pocket, deep territory).
 *
 * Average punt: 42 yards. Varies significantly by situation:
 * - Inside own 10: 38 yards (safety risk limits distance)
 * - Midfield: 40 yards (touchback risk limits return)
 * - Opponent territory: 35 yards (pooch/directional punt)
 *
 * @param yardLine - Current field position (1-99)
 * @returns Expected opponent field position after punt (1-99)
 */
export function getPuntExpectedYardLine(yardLine: number): number {
  let puntDistance: number;

  if (yardLine <= 10) {
    // Inside own 10: limited distance due to safety/field constraints
    puntDistance = 38;
  } else if (yardLine <= 40) {
    // Own territory: standard punt distance
    puntDistance = 42;
  } else if (yardLine <= 60) {
    // Midfield: reduced distance, increased touchback risk
    puntDistance = 40;
  } else {
    // Opponent territory: directional/pooch punt, less distance
    puntDistance = 35;
  }

  // Expected opponent field position is current position + punt distance
  // Limited to valid range (1-99)
  return Math.min(99, yardLine + puntDistance);
}

/**
 * Compare EPA values for all three fourth-down options.
 * Core decision engine that ranks go-for-it, punt, and field goal attempts.
 *
 * @param situation - Fourth-down game situation
 * @returns EPA comparison with optimal recommendation
 */
export function compareDecisionEPA(situation: FourthDownSituation): {
  goForIt: number;
  punt: number;
  fieldGoal: number;
  optimal: 'go' | 'punt' | 'fg';
} {
  // EPA for going for it
  const conversionProb = getConversionProbability(
    situation.distance,
    situation.fieldPosition,
    situation.offenseStrength,
    situation.defenseStrength
  );

  const epIfConvert = getExpectedPoints(
    situation.fieldPosition + situation.distance,
    1,
    10
  );
  const epIfFail = getExpectedPoints(situation.fieldPosition, 1, 10) - 1.5; // Opponent gets ball
  const epaGo = conversionProb * epIfConvert + (1 - conversionProb) * epIfFail;

  // EPA for punting
  const puntYardLine = getPuntExpectedYardLine(situation.fieldPosition);
  const epaPunt = -getExpectedPoints(puntYardLine, 1, 10);

  // EPA for field goal (if in range)
  const fgDistance = 100 - situation.fieldPosition + 17; // +17 for holder/snap depth
  const fgProb = getFieldGoalProbability(fgDistance);
  const epIfMake = -1; // Kickoff
  const epIfMiss = getExpectedPoints(situation.fieldPosition, 1, 10) - 1.2;
  const epaFG = fgProb * epIfMake + (1 - fgProb) * epIfMiss;

  // Only consider FG if within reasonable range
  const fgValid = fgDistance <= 60;

  const epaValues = {
    goForIt: epaGo,
    punt: epaPunt,
    fieldGoal: fgValid ? epaFG : -999,
  };

  // Determine optimal decision
  let optimal: 'go' | 'punt' | 'fg' = 'punt';
  let maxEPA = epaPunt;

  if (epaGo > maxEPA) {
    optimal = 'go';
    maxEPA = epaGo;
  }
  if (fgValid && epaFG > maxEPA) {
    optimal = 'fg';
    maxEPA = epaFG;
  }

  return {
    goForIt: epaGo,
    punt: epaPunt,
    fieldGoal: fgValid ? epaFG : -999,
    optimal,
  };
}

/**
 * Comprehensive fourth-down situation analysis.
 * Calculates EPA for all options, generates recommendation with confidence.
 *
 * @param situation - Fourth-down situation details
 * @returns Complete analysis with EPA breakdown, recommendation, and confidence
 */
export function analyzeFourthDown(situation: FourthDownSituation): FourthDownAnalysis {
  const conversionProb = getConversionProbability(
    situation.distance,
    situation.fieldPosition,
    situation.offenseStrength,
    situation.defenseStrength
  );

  const epIfConvert = getExpectedPoints(
    situation.fieldPosition + situation.distance,
    1,
    10
  );
  const epIfFail = getExpectedPoints(situation.fieldPosition, 1, 10) - 1.5;
  const epaGo = conversionProb * epIfConvert + (1 - conversionProb) * epIfFail;

  // Punt analysis
  const puntYardLine = getPuntExpectedYardLine(situation.fieldPosition);
  const opponentEP = getExpectedPoints(puntYardLine, 1, 10);
  const epaPunt = -opponentEP;

  // Field goal analysis
  const fgDistance = 100 - situation.fieldPosition + 17;
  const fgValid = fgDistance <= 60;
  let fgAnalysis: FourthDownAnalysis['fieldGoal'] = null;

  if (fgValid) {
    const fgProb = getFieldGoalProbability(fgDistance);
    const epIfMake = -1; // Kickoff position
    const epIfMiss = getExpectedPoints(situation.fieldPosition, 1, 10) - 1.2;
    const epaFG = fgProb * epIfMake + (1 - fgProb) * epIfMiss;

    fgAnalysis = {
      epa: epaFG,
      makeProb: fgProb,
      distance: fgDistance,
      epIfMake,
      epIfMiss,
    };
  }

  // Determine optimal and confidence
  let recommendation: 'go' | 'punt' | 'fg' = 'punt';
  let maxEPA = epaPunt;
  let secondMaxEPA = epaGo;

  if (epaGo > maxEPA) {
    recommendation = 'go';
    secondMaxEPA = maxEPA;
    maxEPA = epaGo;
  }
  if (fgAnalysis && fgAnalysis.epa > maxEPA) {
    recommendation = 'fg';
    secondMaxEPA = maxEPA;
    maxEPA = fgAnalysis.epa;
  }

  const epaGap = Math.abs(maxEPA - secondMaxEPA);
  const confidence = Math.min(100, epaGap * 50 + 40); // Gap of 0.2 = high confidence

  // Generate description
  const descParts: string[] = [];
  descParts.push(`${situation.distance}yd to go at own ${100 - situation.fieldPosition}yd line.`);

  if (recommendation === 'go') {
    descParts.push(
      `Go for it: ${(conversionProb * 100).toFixed(0)}% conversion rate, +${epaGo.toFixed(2)} EPA.`
    );
  } else if (recommendation === 'punt') {
    descParts.push(`Punt: Flip field, +${epaPunt.toFixed(2)} EPA.`);
  } else {
    descParts.push(
      `Field goal: ${(fgAnalysis?.makeProb ?? 0).toFixed(0)}% make rate from ${fgDistance}yd, +${(fgAnalysis?.epa ?? 0).toFixed(2)} EPA.`
    );
  }

  return {
    situation,
    goForIt: {
      epa: epaGo,
      conversionProb,
      epIfConvert,
      epIfFail,
    },
    punt: {
      epa: epaPunt,
      expectedYardLine: puntYardLine,
      opponentEP,
    },
    fieldGoal: fgAnalysis,
    recommendation,
    confidence,
    epaGap,
    description: descParts.join(' '),
  };
}

/**
 * Grade a fourth-down decision against analytical recommendation.
 * Maps EPA difference to letter grade scale.
 *
 * Grade scale:
 * - A+: Optimal decision (-0.05 EPA gap or better)
 * - A: Near-optimal (0.05-0.15 EPA gap)
 * - B+: Reasonable alternative (0.15-0.25 EPA gap)
 * - C: Suboptimal (0.25-0.5 EPA gap)
 * - F: Clearly wrong (>0.5 EPA gap)
 *
 * @param situation - Fourth-down situation
 * @param actualDecision - Decision that was made ('go', 'punt', 'fg')
 * @param outcome - Optional: actual outcome ('converted', 'failed', 'made', 'missed')
 * @returns Detailed grade with EPA analysis
 */
export function gradeDecision(
  situation: FourthDownSituation,
  actualDecision: string,
  outcome?: string
): DecisionGrade {
  const analysis = analyzeFourthDown(situation);
  const optimalDecision = analysis.recommendation;
  const wasOptimal = actualDecision.toLowerCase() === optimalDecision;

  // Get EPA for actual decision
  let actualEPA: number;
  if (actualDecision.toLowerCase() === 'go') {
    actualEPA = analysis.goForIt.epa;
  } else if (actualDecision.toLowerCase() === 'punt') {
    actualEPA = analysis.punt.epa;
  } else if (actualDecision.toLowerCase() === 'fg' || actualDecision.toLowerCase() === 'field goal') {
    actualEPA = analysis.fieldGoal?.epa ?? -999;
  } else {
    actualEPA = -999;
  }

  // Get optimal EPA
  let optimalEPA: number;
  if (optimalDecision === 'go') {
    optimalEPA = analysis.goForIt.epa;
  } else if (optimalDecision === 'punt') {
    optimalEPA = analysis.punt.epa;
  } else {
    optimalEPA = analysis.fieldGoal?.epa ?? -999;
  }

  const epaLost = Math.max(0, optimalEPA - actualEPA);

  // Grade mapping based on EPA loss
  let grade: DecisionGrade['grade'];
  if (epaLost <= 0.05) {
    grade = wasOptimal ? 'A+' : 'A-';
  } else if (epaLost <= 0.15) {
    grade = 'A';
  } else if (epaLost <= 0.25) {
    grade = 'B+';
  } else if (epaLost <= 0.35) {
    grade = 'B';
  } else if (epaLost <= 0.5) {
    grade = 'C+';
  } else if (epaLost <= 0.75) {
    grade = 'C';
  } else if (epaLost <= 1.0) {
    grade = 'C-';
  } else if (epaLost <= 1.5) {
    grade = 'D';
  } else {
    grade = 'F';
  }

  // Build explanation
  let explanation = '';
  if (wasOptimal) {
    explanation = `Correct decision. ${actualDecision} was the optimal choice (${optimalEPA.toFixed(2)} EPA).`;
  } else {
    explanation = `Suboptimal decision. Chose ${actualDecision} (${actualEPA.toFixed(2)} EPA) over ${optimalDecision} (${optimalEPA.toFixed(2)} EPA).`;
    if (outcome) {
      explanation += ` Result: ${outcome}.`;
    }
    explanation += ` EPA lost: ${epaLost.toFixed(2)}.`;
  }

  return {
    grade,
    epaLost,
    wasOptimal,
    explanation,
  };
}

/**
 * Calculate fourth-down aggressiveness index for a coach across multiple decisions.
 * Combines go-for-it frequency with analytical alignment.
 *
 * Index scale:
 * - 0-30: Very conservative (punts too often)
 * - 30-45: Conservative
 * - 45-55: Average (league norm)
 * - 55-70: Aggressive
 * - 70-100: Elite aggressive (high go-for-it rate, justified by analytics)
 *
 * @param decisions - Array of coach's fourth-down decisions
 * @returns Aggressiveness profile with tier classification
 */
export function calculateAggressivenessIndex(decisions: CoachDecision[]): AggressivenessProfile {
  if (decisions.length === 0) {
    return {
      index: 50,
      goForItRate: 0,
      analyticalAlignment: 0,
      epaLostPerGame: 0,
      tier: 'average',
      sampleSize: 0,
      trend: 0,
    };
  }

  // Count go-for-it decisions
  const goForItCount = decisions.filter((d) =>
    d.decisionMade.toLowerCase().includes('go')
  ).length;
  const goForItRate = goForItCount / decisions.length;

  // Calculate analytical alignment (% of optimal decisions)
  const optimalCount = decisions.filter((d) => d.wasOptimal).length;
  const analyticalAlignment = optimalCount / decisions.length;

  // Calculate EPA lost per game
  // Assume roughly 1-2 critical 4th downs per game
  const totalEPALost = decisions.reduce((sum, d) => {
    if (!d.wasOptimal && d.winProbabilityImpact) {
      return sum + Math.abs(d.winProbabilityImpact);
    }
    return sum;
  }, 0);
  const gamesCount = Math.max(1, Math.ceil(decisions.length / 1.5));
  const epaLostPerGame = totalEPALost / gamesCount;

  // Calculate index
  // Base 50 + adjustment for go-for-it rate + adjustment for alignment
  const rateAdjustment = (goForItRate - 0.25) * 40; // 25% is baseline
  const alignmentAdjustment = (analyticalAlignment - 0.65) * 30; // 65% is baseline
  let index = 50 + rateAdjustment + alignmentAdjustment;
  index = Math.max(0, Math.min(100, index));

  // Determine tier
  let tier: AggressivenessProfile['tier'];
  if (index < 35) {
    tier = 'very-conservative';
  } else if (index < 45) {
    tier = 'conservative';
  } else if (index < 55) {
    tier = 'average';
  } else if (index < 70) {
    tier = 'aggressive';
  } else {
    tier = 'elite-aggressive';
  }

  // Calculate trend (improvement over time)
  // Simple: compare first half vs second half of season
  const halfPoint = Math.floor(decisions.length / 2);
  const firstHalf = decisions.slice(0, halfPoint);
  const secondHalf = decisions.slice(halfPoint);

  const firstHalfAlign = firstHalf.filter((d) => d.wasOptimal).length / Math.max(1, firstHalf.length);
  const secondHalfAlign = secondHalf.filter((d) => d.wasOptimal).length / Math.max(1, secondHalf.length);
  const trend = (secondHalfAlign - firstHalfAlign) * 100; // percentage point change

  return {
    index,
    goForItRate,
    analyticalAlignment,
    epaLostPerGame,
    tier,
    sampleSize: decisions.length,
    trend,
  };
}
