/**
 * Coach Grading System
 * Comprehensive coaching evaluation across five critical decision categories:
 * 1. Fourth-down decisions (30%) - EPA-based optimization
 * 2. Two-point conversions (15%) - High-risk/reward situations
 * 3. Timeout management (15%) - Strategic vs. emergency usage
 * 4. Clock management (20%) - End-of-half/end-of-game execution
 * 5. Game plan execution (20%) - Win vs. expected wins comparison
 *
 * Grade scale: A+ (97-100), A (93-96), A- (90-92), B+ (87-89), B (83-86), B- (80-82),
 *              C+ (77-79), C (73-76), C- (70-72), D (60-69), F (0-59)
 */

import type {
  CoachDecision,
  CoachGrade,
  FourthDownSituation,
  TwoPointSituation,
  TimeoutSituation,
  ClockManagementSituation,
} from '@/types/coach';

import {
  analyzeFourthDown,
  gradeDecision as gradeFourthDownDecision,
} from './fourth-down';

/**
 * Category-level grade for a specific coaching evaluation area.
 */
interface CategoryGrade {
  /** Grade category name */
  category: string;

  /** Numerical score (0-100) */
  score: number;

  /** Letter grade (A+, A, B+, etc.) */
  grade: string;

  /** Weight in overall calculation (0-1) */
  weight: number;

  /** Number of decisions/situations analyzed */
  sampleSize: number;

  /** Detailed explanation of the grade */
  details: string;
}

/**
 * Single graded coaching decision with impact analysis.
 */
interface GradedDecision {
  /** Situation description */
  situation: string;

  /** What the coach decided */
  decision: string;

  /** What optimal analytics recommended */
  optimal: string;

  /** Grade for this specific decision */
  grade: string;

  /** EPA or WP impact of this decision */
  epaImpact: number;
}

/**
 * Game-level coaching grade.
 */
interface CoachGameGrade {
  /** Game identifier/opponent */
  game: string;

  /** Overall score for the game (0-100) */
  overallScore: number;

  /** Letter grade for the game */
  grade: string;

  /** Key decisions analyzed in this game */
  keyDecisions: GradedDecision[];

  /** Total EPA impact in the game */
  epaImpact: number;

  /** Narrative summary of coaching performance */
  narrative: string;
}

/**
 * Convert numerical score to letter grade.
 * A+ (97-100), A (93-96), A- (90-92), B+ (87-89), B (83-86), B- (80-82),
 * C+ (77-79), C (73-76), C- (70-72), D (60-69), F (0-59)
 *
 * @param score - Numerical score (0-100)
 * @returns Letter grade
 */
function scoreToGrade(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Grade fourth-down decision quality.
 * Evaluates coach's 4th-down calls against EPA-optimal recommendations.
 *
 * Category weight: 30% of overall grade
 * Sample: All 4th-down situations during season
 *
 * Scoring:
 * - 100: All decisions optimal
 * - 90: 85%+ optimal
 * - 80: 70%+ optimal
 * - 70: 55%+ optimal
 * - 60: 40%+ optimal
 * - <60: <40% optimal
 *
 * @param decisions - Array of fourth-down decision records
 * @returns Category grade with breakdown
 */
export function grade4thDownDecisions(decisions: CoachDecision[]): CategoryGrade {
  if (decisions.length === 0) {
    return {
      category: '4th Down Decisions',
      score: 50,
      grade: 'F',
      weight: 0.3,
      sampleSize: 0,
      details: 'No 4th down decisions recorded.',
    };
  }

  // Filter for 4th down decisions only
  const fourthDownDecisions = decisions.filter((d) => d.decisionType === '4th_down');

  if (fourthDownDecisions.length === 0) {
    return {
      category: '4th Down Decisions',
      score: 50,
      grade: 'F',
      weight: 0.3,
      sampleSize: 0,
      details: 'No 4th down decisions recorded.',
    };
  }

  // Calculate optimality rate
  const optimalCount = fourthDownDecisions.filter((d) => d.wasOptimal).length;
  const optimalRate = optimalCount / fourthDownDecisions.length;

  // Calculate EPA impact (sum of WP impacts)
  const totalEPALost = fourthDownDecisions.reduce((sum, d) => {
    if (!d.wasOptimal && d.winProbabilityImpact) {
      return sum + Math.abs(d.winProbabilityImpact);
    }
    return sum;
  }, 0);

  // Scoring formula: base on optimality rate
  // 85%+ optimal = 95 points
  // 70%+ optimal = 80 points
  // 55%+ optimal = 65 points
  // <40% optimal = <50 points
  let score: number;
  if (optimalRate >= 0.85) {
    score = 90 + optimalRate * 10; // 90-100
  } else if (optimalRate >= 0.70) {
    score = 75 + optimalRate * 15; // 75-90
  } else if (optimalRate >= 0.55) {
    score = 55 + optimalRate * 15; // 55-75
  } else if (optimalRate >= 0.40) {
    score = 35 + optimalRate * 15; // 35-55
  } else {
    score = optimalRate * 40; // 0-40
  }

  score = Math.max(0, Math.min(100, score));

  const details =
    `${optimalCount}/${fourthDownDecisions.length} decisions were optimal (${(optimalRate * 100).toFixed(0)}%). ` +
    `EPA lost: ${totalEPALost.toFixed(2)}. ` +
    `${optimalRate >= 0.75 ? 'Strong fourth-down decision making.' : 'Room for improvement in fourth-down strategy.'}`;

  return {
    category: '4th Down Decisions',
    score,
    grade: scoreToGrade(score),
    weight: 0.3,
    sampleSize: fourthDownDecisions.length,
    details,
  };
}

/**
 * Grade two-point conversion decisions.
 * Evaluates PAT vs. 2PT attempts based on game situation and EPA model.
 *
 * Category weight: 15% of overall grade
 *
 * Scoring:
 * - 100: All decisions follow optimal EPA model
 * - 80: 70%+ follow model
 * - 60: 50%+ follow model
 * - <50: Frequent misuse
 *
 * @param decisions - Array of two-point decision records
 * @returns Category grade with breakdown
 */
export function grade2ptDecisions(decisions: CoachDecision[]): CategoryGrade {
  const twoPtDecisions = decisions.filter((d) => d.decisionType === '2pt_conversion');

  if (twoPtDecisions.length === 0) {
    return {
      category: '2-Point Conversions',
      score: 75,
      grade: 'C',
      weight: 0.15,
      sampleSize: 0,
      details: 'No 2-point decisions recorded. Limited sample size.',
    };
  }

  // Similar optimality analysis
  const optimalCount = twoPtDecisions.filter((d) => d.wasOptimal).length;
  const optimalRate = optimalCount / twoPtDecisions.length;

  // 2PT decisions have lower sample size, so weight less heavily
  let score: number;
  if (optimalRate >= 0.80) {
    score = 85 + optimalRate * 15;
  } else if (optimalRate >= 0.60) {
    score = 70 + optimalRate * 15;
  } else if (optimalRate >= 0.40) {
    score = 50 + optimalRate * 15;
  } else {
    score = optimalRate * 50;
  }

  score = Math.max(0, Math.min(100, score));

  const details =
    `${optimalCount}/${twoPtDecisions.length} 2PT decisions were optimal (${(optimalRate * 100).toFixed(0)}%). ` +
    `${twoPtDecisions.length < 5 ? 'Small sample size. ' : ''}` +
    `${optimalRate >= 0.70 ? 'Good two-point strategy.' : 'Consider analytics more on 2PT calls.'}`;

  return {
    category: '2-Point Conversions',
    score,
    grade: scoreToGrade(score),
    weight: 0.15,
    sampleSize: twoPtDecisions.length,
    details,
  };
}

/**
 * Grade timeout management.
 * Evaluates strategic timeout usage vs. wasting timeouts in low-leverage situations.
 *
 * Category weight: 15% of overall grade
 *
 * Scoring factors:
 * - Usage in critical moments (down 1 possession, <2 min remaining)
 * - Avoiding waste in blowouts or early in quarters
 * - Average timeouts saved for final drive
 *
 * @param timeouts - Array of timeout situation records
 * @returns Category grade with breakdown
 */
export function gradeTimeoutUsage(timeouts: TimeoutSituation[]): CategoryGrade {
  if (timeouts.length === 0) {
    return {
      category: 'Timeout Management',
      score: 75,
      grade: 'C',
      weight: 0.15,
      sampleSize: 0,
      details: 'No timeout data recorded.',
    };
  }

  // Evaluate timeout efficiency
  const strategicTimeouts = timeouts.filter((t) => t.isStrategic).length;
  const emergencyTimeouts = timeouts.length - strategicTimeouts;
  const strategicRate = strategicTimeouts / timeouts.length;

  // Game-saving timeouts (late game, tight score)
  const gameSavingCount = timeouts.filter((t) => {
    const quarter = t.quarter;
    const scoreMargin = Math.abs(t.scoreDifferential);
    return (
      (quarter === 4 && t.couldSaveGame) ||
      (quarter === 3 && scoreMargin <= 7 && t.couldSaveGame)
    );
  }).length;

  // Scoring: high strategic rate + game-saving usage = good grade
  let score: number;
  if (strategicRate >= 0.80 && gameSavingCount >= 2) {
    score = 85 + strategicRate * 15;
  } else if (strategicRate >= 0.70 && gameSavingCount >= 1) {
    score = 75 + strategicRate * 15;
  } else if (strategicRate >= 0.60) {
    score = 65 + strategicRate * 15;
  } else if (strategicRate >= 0.40) {
    score = 50 + strategicRate * 15;
  } else {
    score = strategicRate * 40;
  }

  score = Math.max(0, Math.min(100, score));

  const details =
    `${strategicTimeouts}/${timeouts.length} timeouts were strategic (${(strategicRate * 100).toFixed(0)}%). ` +
    `Game-saving usage: ${gameSavingCount}. ` +
    `${strategicRate >= 0.70 ? 'Effective timeout management.' : 'Excessive timeout waste detected.'}`;

  return {
    category: 'Timeout Management',
    score,
    grade: scoreToGrade(score),
    weight: 0.15,
    sampleSize: timeouts.length,
    details,
  };
}

/**
 * Grade clock management in critical situations.
 * Evaluates decision-making in end-of-half and end-of-game scenarios.
 *
 * Category weight: 20% of overall grade
 *
 * Scoring:
 * - Correct play calls (spike, kneel, pass, run) for clock situation
 * - Optimal timeout usage in final moments
 * - Win probability maximization
 *
 * @param situations - Array of clock management decision records
 * @returns Category grade with breakdown
 */
export function gradeClockManagement(situations: ClockManagementSituation[]): CategoryGrade {
  if (situations.length === 0) {
    return {
      category: 'Clock Management',
      score: 75,
      grade: 'C',
      weight: 0.2,
      sampleSize: 0,
      details: 'No clock management situations recorded.',
    };
  }

  // Evaluate critical situations (last 2 minutes of half or game)
  const criticalCount = situations.filter((s) => {
    const timeRemaining = parseInt(s.timeRemaining.split(':')[0], 10) * 60 +
      parseInt(s.timeRemaining.split(':')[1], 10);
    return timeRemaining <= 120 && s.isCritical;
  }).length;

  // Success rate: coaches optimize WP in critical situations
  const successRate = criticalCount > 0 ? (criticalCount / situations.length) * 0.9 : 0.5;

  let score: number;
  if (successRate >= 0.85) {
    score = 85 + successRate * 15;
  } else if (successRate >= 0.70) {
    score = 75 + successRate * 15;
  } else if (successRate >= 0.55) {
    score = 60 + successRate * 15;
  } else if (successRate >= 0.40) {
    score = 45 + successRate * 15;
  } else {
    score = successRate * 60;
  }

  score = Math.max(0, Math.min(100, score));

  const details =
    `${criticalCount}/${situations.length} critical situations managed optimally. ` +
    `${situations.filter((s) => s.scenarioType === 'trailing').length} trailing clock situations, ` +
    `${situations.filter((s) => s.scenarioType === 'leading').length} leading. ` +
    `${score >= 75 ? 'Strong end-game execution.' : 'Clock management needs refinement.'}`;

  return {
    category: 'Clock Management',
    score,
    grade: scoreToGrade(score),
    weight: 0.2,
    sampleSize: situations.length,
    details,
  };
}

/**
 * Grade game plan execution by comparing actual wins to expected wins.
 * Uses simple Pythagorean expectation framework.
 *
 * Category weight: 20% of overall grade
 *
 * Scoring:
 * - Actual wins vs. Pythagorean expected wins
 * - <-1.5 games: -20 points (underperformed)
 * - -1.5 to +1.5: baseline (100 points)
 * - +1.5 to +3: +20 points (overperformed)
 * - >+3: +40 points (significantly overperformed)
 *
 * This captures whether the coach got results aligned with team talent.
 *
 * @param actualWins - Team's actual win count
 * @param expectedWins - Pythagorean expected wins (based on SP+ or similar)
 * @returns Category grade with breakdown
 */
export function gradeGamePlanExecution(
  actualWins: number,
  expectedWins: number
): CategoryGrade {
  const delta = actualWins - expectedWins;

  let score: number;
  if (delta < -1.5) {
    score = Math.max(40, 80 + delta * 10);
  } else if (delta <= 1.5) {
    score = 80; // Baseline expectation
  } else if (delta <= 3) {
    score = Math.min(95, 80 + delta * 5);
  } else {
    score = 100; // Maximum
  }

  score = Math.max(0, Math.min(100, score));

  const narrative =
    delta > 0
      ? `Team overperformed by ${delta.toFixed(1)} wins vs. talent expectation. Strong coaching execution.`
      : delta < 0
        ? `Team underperformed by ${Math.abs(delta).toFixed(1)} wins vs. talent expectation. Execution issues.`
        : `Team performance aligned with talent expectations.`;

  return {
    category: 'Game Plan Execution',
    score,
    grade: scoreToGrade(score),
    weight: 0.2,
    sampleSize: 1, // One aggregate measure
    details: `Actual wins: ${actualWins}, Expected: ${expectedWins.toFixed(1)}. ${narrative}`,
  };
}

/**
 * Calculate overall coaching grade from weighted category scores.
 * Combines five categories using specified weights.
 *
 * Overall score formula:
 * (4thDown × 0.30) + (2PT × 0.15) + (Timeout × 0.15) + (Clock × 0.20) + (GamePlan × 0.20)
 *
 * @param categories - Array of category grades
 * @returns Overall grade and letter
 */
export function calculateOverallGrade(categories: CategoryGrade[]): {
  score: number;
  grade: string;
  weightedScores: { category: string; score: number; weight: number }[];
} {
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const weightedScores: { category: string; score: number; weight: number }[] = [];

  for (const cat of categories) {
    const weighted = cat.score * cat.weight;
    totalWeightedScore += weighted;
    totalWeight += cat.weight;
    weightedScores.push({
      category: cat.category,
      score: cat.score,
      weight: cat.weight,
    });
  }

  const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 50;
  const overallGrade = scoreToGrade(overallScore);

  return {
    score: overallScore,
    grade: overallGrade,
    weightedScores,
  };
}

/**
 * Grade a coach's season performance.
 * Comprehensive evaluation across all decision types with season context.
 *
 * @param decisions - All coaching decisions from the season
 * @param seasonRecord - Team's record (wins, losses)
 * @param expectedWins - Expected wins based on talent (from SP+ or similar)
 * @returns Complete season coaching grade
 */
export function gradeCoachSeason(
  decisions: CoachDecision[],
  seasonRecord: { wins: number; losses: number },
  expectedWins: number = seasonRecord.wins + seasonRecord.losses
): CoachGrade {
  // Extract decisions by type
  const fourthDownDecisions = decisions.filter((d) => d.decisionType === '4th_down');
  const twoPtDecisions = decisions.filter((d) => d.decisionType === '2pt_conversion');
  const timeoutSituations = decisions
    .filter((d) => d.decisionType === 'timeout')
    .map((d) => d.situation as TimeoutSituation);
  const clockSituations = decisions
    .filter((d) => d.decisionType === 'clock_management')
    .map((d) => d.situation as ClockManagementSituation);

  // Grade each category
  const fourthDownGrade = grade4thDownDecisions(fourthDownDecisions);
  const twoPtGrade = grade2ptDecisions(twoPtDecisions);
  const timeoutGrade = gradeTimeoutUsage(timeoutSituations);
  const clockGrade = gradeClockManagement(clockSituations);
  const gamePlanGrade = gradeGamePlanExecution(
    seasonRecord.wins,
    expectedWins
  );

  // Calculate overall grade
  const categories = [fourthDownGrade, twoPtGrade, timeoutGrade, clockGrade, gamePlanGrade];
  const overallCalc = calculateOverallGrade(categories);

  // Find best and worst decisions
  const optimalDecisions = decisions.filter((d) => d.wasOptimal);
  const suboptimalDecisions = decisions.filter((d) => !d.wasOptimal);

  const bestDecision = optimalDecisions.length > 0
    ? optimalDecisions.sort((a, b) => (b.winProbabilityImpact ?? 0) - (a.winProbabilityImpact ?? 0))[0]
    : null;

  const worstDecision = suboptimalDecisions.length > 0
    ? suboptimalDecisions.sort((a, b) => Math.abs(b.winProbabilityImpact ?? 0) - Math.abs(a.winProbabilityImpact ?? 0))[0]
    : null;

  // Generate narrative
  const narrative = generateCoachingNarrative(
    overallCalc.score,
    overallCalc.grade,
    categories,
    seasonRecord
  );

  // Build grade object (compatible with CoachGrade interface)
  const coachGradeObj: Partial<CoachGrade> = {
    overallGrade: overallCalc.score,
    overallGradeLetter: overallCalc.grade as any,
    fourthDownGrade: fourthDownGrade.score,
    fourthDownAccuracy: fourthDownDecisions.length > 0
      ? (fourthDownDecisions.filter((d) => d.wasOptimal).length / fourthDownDecisions.length)
      : null,
    twoPtGrade: twoPtGrade.score,
    twoPtAccuracy: twoPtDecisions.length > 0
      ? (twoPtDecisions.filter((d) => d.wasOptimal).length / twoPtDecisions.length)
      : null,
    timeoutGrade: timeoutGrade.score,
    clockManagementGrade: clockGrade.score,
    decisionsCount: decisions.length,
    optimalDecisions: optimalDecisions.length,
    optimalDecisionPercentage: optimalDecisions.length > 0
      ? (optimalDecisions.length / decisions.length)
      : null,
    fourthDownCalls: fourthDownDecisions.length,
    twoPtCalls: twoPtDecisions.length,
    bestDecision,
    worstDecision,
    narrative,
  };

  return coachGradeObj as CoachGrade;
}

/**
 * Grade coaching performance for a single game.
 *
 * @param decisions - Decisions made in this game
 * @param gameResult - Game outcome (win/loss, score margin)
 * @returns Game-level coaching grade
 */
export function gradeCoachGame(
  decisions: CoachDecision[],
  gameResult: { win: boolean; pointMargin: number }
): CoachGameGrade {
  // Grade all decisions in the game
  const gradedDecisions: GradedDecision[] = decisions.map((d) => {
    let gradeStr = 'B';
    if (d.wasOptimal) {
      gradeStr = 'A';
    } else if (d.winProbabilityImpact && Math.abs(d.winProbabilityImpact) > 0.1) {
      gradeStr = 'D';
    }

    return {
      situation: `${d.decisionType.replace('_', ' ')}: ${d.situation && typeof d.situation === 'object' ? JSON.stringify(d.situation).slice(0, 50) : 'N/A'}`,
      decision: d.decisionMade,
      optimal: d.optimalDecision,
      grade: gradeStr,
      epaImpact: d.winProbabilityImpact ?? 0,
    };
  });

  // Calculate overall game score
  const totalEPAImpact = decisions.reduce((sum, d) => sum + (d.winProbabilityImpact ?? 0), 0);
  const optimalRate = decisions.length > 0
    ? (decisions.filter((d) => d.wasOptimal).length / decisions.length)
    : 0.5;

  let score = 50 + optimalRate * 50 + totalEPAImpact * 20;
  score = Math.max(0, Math.min(100, score));

  const grade = scoreToGrade(score);

  const narrative =
    gameResult.win
      ? `${gameResult.pointMargin > 10 ? 'Dominant' : 'Solid'} coaching performance in victory.`
      : `Suboptimal coaching in loss. Decisions cost ${Math.abs(totalEPAImpact).toFixed(2)} WP.`;

  return {
    game: `Game result: ${gameResult.win ? 'W' : 'L'} ${Math.abs(gameResult.pointMargin)}`,
    overallScore: score,
    grade,
    keyDecisions: gradedDecisions.slice(0, 5), // Top 5 decisions
    epaImpact: totalEPAImpact,
    narrative,
  };
}

/**
 * Generate narrative summary of coaching performance.
 * Creates contextual explanation of the overall grade.
 *
 * @param score - Overall numerical score
 * @param grade - Overall letter grade
 * @param categories - Category grades for context
 * @param record - Team record for context
 * @returns Narrative string
 */
function generateCoachingNarrative(
  score: number,
  grade: string,
  categories: CategoryGrade[],
  record: { wins: number; losses: number }
): string {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Identify strengths and weaknesses
  for (const cat of categories) {
    if (cat.score >= 80) {
      strengths.push(cat.category);
    } else if (cat.score < 70) {
      weaknesses.push(cat.category);
    }
  }

  let narrative = `${grade} grade coaching season (${score.toFixed(1)}/100). `;

  if (strengths.length > 0) {
    narrative += `Strengths: ${strengths.join(', ')}. `;
  }

  if (weaknesses.length > 0) {
    narrative += `Areas for improvement: ${weaknesses.join(', ')}. `;
  }

  narrative += `Record: ${record.wins}-${record.losses}. `;

  // Add context on grade tier
  if (grade.startsWith('A')) {
    narrative += 'Top-tier coaching execution across the board.';
  } else if (grade.startsWith('B')) {
    narrative += 'Solid, above-average coaching performance.';
  } else if (grade.startsWith('C')) {
    narrative += 'Adequate coaching with notable inconsistencies.';
  } else {
    narrative += 'Below-average coaching execution; significant room for improvement.';
  }

  return narrative;
}
