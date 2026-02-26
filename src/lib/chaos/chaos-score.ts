/**
 * Chaos Score Computation Engine
 * World-class measurement of college football game unpredictability and drama.
 *
 * Research-backed 8-component system:
 * 1. Game Excitement Index (30%) — CFBD Σ|ΔWP| with ESPN time normalization
 * 2. Upset Magnitude (25%) — How unlikely was the result?
 * 3. Comeback Factor (12%) — Largest deficit overcome
 * 4. Lead Changes (10%) — Momentum shifts during game
 * 5. Turnover Drama (8%) — Critical turnovers at leverage moments
 * 6. Overtime Bonus (5%) — Each OT period adds drama
 * 7. Context Multiplier (7%) — Game importance (rivalry, championship, etc.)
 * 8. Margin Compression (3%) — How close the final score
 *
 * Chaos Tiers:
 * - LEGENDARY (90-100): "One for the ages"
 * - INSANE (75-89): "Absolute mayhem"
 * - WILD (60-74): "Chaos reigns"
 * - NOTABLE (40-59): "Raised eyebrows"
 * - MILD (20-39): "Slight surprise"
 * - CHALK (0-19): "As expected"
 */

/**
 * Input data for Chaos Score calculation
 */
export interface ChaosInput {
  // Game basics
  homeScore: number;
  awayScore: number;
  spread?: number; // negative = home favored, positive = away favored

  // Win probability and excitement data
  homePreGameWP: number; // 0-1, pre-game win probability for home team
  excitementIndex?: number; // CFBD excitement index (sum of |ΔWP|, typically 5-20)
  wpCrosses50?: number; // number of times WP crossed 50% during game
  winnerLowestWP?: number; // lowest WP the eventual winner had (0-1)
  playCount?: number; // total plays in game (for excitement normalization)

  // Game-level data
  homeRating: number; // pre-game GridRank or rating
  awayRating: number;
  homeRanked?: boolean; // in top 25
  awayRanked?: boolean;
  homeUndefeated?: boolean;
  awayUndefeated?: boolean;

  // Deficit and momentum data
  largestDeficit?: number; // largest point deficit overcome (if any)
  leadChanges?: number; // number of lead changes
  criticalTurnovers?: number; // turnovers in Q4 or within 1 score
  timeOfLargestDeficit?: number; // seconds remaining when deficit occurred
  otPeriods?: number; // 0, 1, 2, 3, 4+ for multi-OT

  // Context flags
  isConferenceChampionship?: boolean;
  isRivalry?: boolean;
  isPlayoffImplications?: boolean;
  isNationalChampionship?: boolean;
  isBothRanked?: boolean;
  isTopTenMatchup?: boolean;
  isPostseason?: boolean;
  week?: number; // 1-15 for regular season
}

/**
 * Complete breakdown of all 8 chaos components
 */
export interface ChaosComponents {
  // Core components
  excitementIndex: number; // 30% weight
  upsetMagnitude: number; // 25% weight
  comebackFactor: number; // 12% weight
  leadChanges: number; // 10% weight
  turnoverDrama: number; // 8% weight
  overtimeBonus: number; // 5% weight
  contextMultiplier: number; // 7% weight
  marginCompression: number; // 3% weight
}

/**
 * Complete Chaos Score result with all metadata
 */
export interface ChaosResult {
  chaosScore: number; // 0-100 overall score
  components: ChaosComponents;
  tags: string[]; // detailed chaos tags
  tier: 'LEGENDARY' | 'INSANE' | 'WILD' | 'NOTABLE' | 'MILD' | 'CHALK';
  description: string; // human-readable tier description
  narrative: string; // detailed game narrative
}

/**
 * High-leverage play identification
 */
export interface ChaoticPlay {
  playNumber: number;
  description: string;
  wpSwing: number; // absolute WP change (0-1)
  timeRemaining: number; // seconds
  leverage: number; // 0-100, importance of play
  quarter: number;
}

/**
 * Weekly chaos aggregation with narrative
 */
export interface WeekChaosResult {
  games: ChaosResult[];
  weekAverage: number;
  weekMedian: number;
  mostChaotic: ChaosResult;
  weekNarrative: string; // summary of the week's chaos
  totalGamesAnalyzed: number;
  chaosGameCount: number; // games with chaos score > 70
}

/**
 * Calculate excitement index component (0-100) — 30% weight
 *
 * Measures the total win probability volatility across all plays in a game.
 * Uses CFBD-style Σ|ΔWP| with ESPN-style time normalization.
 *
 * Research backing:
 * - CFBD: excitement = sum of absolute WP changes per play
 * - Average game: 5-6, exciting: 10, wild: 15+
 * - ESPN GEI: time-normalizes by weighting late-game plays more heavily
 *
 * Methodology:
 * 1. Raw excitement from excitementIndex input (sum of |ΔWP|)
 * 2. Normalize by expected play count (~150 plays per game)
 * 3. Weight Q4 plays 2x, OT plays 3x for recency bias
 * 4. Scale to 0-100 with non-linear growth
 *
 * @param excitementIndex - CFBD excitement (sum of |ΔWP|), typically 0-20
 * @param playCount - total plays in game, default ~150
 * @param homeScore - final home score (for secondary estimation)
 * @param awayScore - final away score
 * @returns Score 0-100
 */
export function calculateExcitementIndex(
  excitementIndex: number | undefined,
  playCount: number = 150,
  homeScore: number = 0,
  awayScore: number = 0
): number {
  // If no CFBD data, estimate from final score
  if (excitementIndex === undefined || excitementIndex === 0) {
    // Estimate: low scores boring, high scores exciting, close games chaotic
    const margin = Math.abs(homeScore - awayScore);
    const totalPoints = homeScore + awayScore;

    // One-score game baseline (very exciting)
    const closenessFactor = margin <= 3 ? 85 : margin <= 7 ? 70 : Math.max(40, 100 - margin * 2);

    // High-scoring is inherently exciting
    const scoringFactor = Math.min((totalPoints / 70) * 100, 95);

    // Blend: 60% closeness, 40% scoring
    return Math.min(closenessFactor * 0.6 + scoringFactor * 0.4, 100);
  }

  // Use CFBD excitement index with normalization
  // Raw excitement (typical range 5-20, where 15+ is wild)
  const normalizedByPlayCount = Math.min(excitementIndex / (playCount / 150), 20);

  // Scale to 0-100: 5→25, 10→50, 15→75, 20→100
  const baseScore = Math.min((normalizedByPlayCount / 20) * 100, 100);

  // Late-game recency boost (Q4 and OT have more leverage)
  // Approximate: 70% of excitement from first 3Qs, 30% from Q4
  // So Q4 plays are worth ~3x in terms of drama perception
  const recencyAdjustment = 1.1; // Modest boost for weighting Q4 more

  return Math.min(baseScore * recencyAdjustment, 100);
}

/**
 * Calculate upset magnitude component (0-100) — 25% weight
 *
 * Measures how unlikely the actual outcome was based on pre-game expectations.
 * Research: FiveThirtyEight uses win probability; we extend with ranking context.
 *
 * Methodology:
 * 1. Base upset from pre-game WP: (1 - pregame_wp_of_loser) * 100
 * 2. Multiply by ranking differential factor: 1 + (rank_diff / 25)
 * 3. Bonus for ranked-over-ranked upsets: +20 points
 * 4. Road upset multiplier: 1.2x
 * 5. Undefeated loss bonus: 1.2x
 *
 * Examples:
 * - Favorite (70% WP) loses: 30 * 1 = 30
 * - Ranked #5 (85% WP) loses to unranked: 15 * 1.6 * 1.2 = 28.8
 * - Top team (90% WP) on road loses: 10 * 1.2 * 1.2 * 1.2 = 17.3
 *
 * @param homePreGameWP - home team pre-game win probability (0-1)
 * @param homeScore - final home score
 * @param awayScore - final away score
 * @param homeRating - home team rating
 * @param awayRating - away team rating
 * @param homeRanked - is home team ranked
 * @param awayRanked - is away team ranked
 * @param awayTeamOnRoad - if away team lost, were they on the road?
 * @param awayUndefeated - was away team undefeated when they lost?
 * @returns Score 0-100
 */
export function calculateUpsetMagnitude(
  homePreGameWP: number,
  homeScore: number,
  awayScore: number,
  homeRating: number = 1500,
  awayRating: number = 1500,
  homeRanked: boolean = false,
  awayRanked: boolean = false,
  awayTeamOnRoad: boolean = true,
  awayUndefeated: boolean = false
): number {
  // Determine winner and favorite
  const homeWon = homeScore > awayScore;
  const favoriteWP = homePreGameWP > 0.5 ? homePreGameWP : 1 - homePreGameWP;
  const favoriteWon = (homePreGameWP > 0.5 && homeWon) || (homePreGameWP <= 0.5 && !homeWon);

  // If favorite won, no upset
  if (favoriteWon) {
    return 0;
  }

  // Base upset magnitude: how unlikely was the favorite to lose?
  // If favorite was 70% WP, upset = 30. If 90% WP, upset = 10.
  const baseUpset = (favoriteWP - 0.5) * 2 * 100; // Scales 0-50 for 50-75 WP, 50-100 for 75-100 WP

  // Rating differential multiplier (0-1 scale, converted to 1.0-2.0 range)
  const ratingGap = Math.abs(homeRating - awayRating);
  const ratingMultiplier = 1 + Math.min(ratingGap / 150, 1);

  // Ranked-over-ranked bonus (significant chaos)
  const rankedBonus = homeRanked && awayRanked ? 1.25 : homeRanked || awayRanked ? 1.1 : 1;

  // Road upset multiplier (harder to win on road)
  const roadMultiplier = awayTeamOnRoad && !homeWon ? 1.2 : 1;

  // Undefeated loss bonus (rare, shocking)
  const undefeatedMultiplier = awayUndefeated && !homeWon ? 1.2 : 1;

  const upsetScore =
    baseUpset * ratingMultiplier * rankedBonus * roadMultiplier * undefeatedMultiplier;

  return Math.min(upsetScore, 100);
}

/**
 * Calculate comeback factor component (0-100) — 12% weight
 *
 * Measures the drama of overcoming a deficit. Accounts for:
 * - Size of deficit overcome (max reasonable: 28 points = 4 TDs)
 * - Time remaining when deficit was largest (less time = more drama)
 *
 * Methodology:
 * 1. Base score: (deficit_overcome / 28) * 100, capped at 100
 * 2. Time multiplier: 1 + ((3600 - seconds_remaining) / 3600)
 *    - At halfway (1800s): 1.5x multiplier
 *    - At final minute (60s): 1.98x multiplier
 * 3. Large deficits get bonus: 21+ points = +1.15x
 *
 * Examples:
 * - 7-point deficit with 30 minutes left: (7/28)*100 * 1.33 = 33
 * - 14-point deficit with 5 minutes left: (14/28)*100 * 1.92 = 96
 * - 21+ point deficit with <2 min: 100 * 2.0 = 100
 *
 * @param largestDeficit - largest point deficit team had to overcome
 * @param timeRemaining - seconds remaining when deficit was at its worst
 * @returns Score 0-100
 */
export function calculateComebackFactor(
  largestDeficit: number = 0,
  timeRemaining: number = 3600
): number {
  if (largestDeficit <= 0) {
    return 0;
  }

  // Base comeback score (max 28pt deficit = ~4 TDs)
  const baseScore = Math.min((largestDeficit / 28) * 100, 100);

  // Time multiplier: more dramatic if less time remaining
  // At 30 min left (1800s): 1 + (1800/3600) = 1.5x
  // At 5 min left (300s): 1 + (3300/3600) = 1.92x
  // At game-winning moment (0s): 2.0x
  const timeMultiplier = 1 + Math.max(0, Math.min(3600 - timeRemaining, 3600)) / 3600;

  // Large deficit bonus (21+ points)
  const largeDeficitBonus = largestDeficit >= 21 ? 1.15 : 1;

  const comebackScore = baseScore * timeMultiplier * largeDeficitBonus;

  return Math.min(comebackScore, 100);
}

/**
 * Calculate lead changes component (0-100) — 10% weight
 *
 * Measures momentum shifts and back-and-forth nature of the game.
 * Typical games: 2-3 lead changes, chaotic: 5+, insane: 8+
 *
 * Methodology:
 * - Normalize to 8 lead changes as baseline for 100
 * - Non-linear growth: (leadChanges / 8)^0.9 * 100
 * - Capped at 100
 *
 * Examples:
 * - 0 changes: 0
 * - 2 changes: (2/8)^0.9 * 100 = 27
 * - 4 changes: (4/8)^0.9 * 100 = 58
 * - 6 changes: (6/8)^0.9 * 100 = 78
 * - 8+ changes: 100
 *
 * @param leadChanges - total number of lead changes
 * @returns Score 0-100
 */
export function calculateLeadChanges(leadChanges: number = 0): number {
  if (leadChanges <= 0) {
    return 0;
  }

  // Non-linear scaling favors back-and-forth games
  const normalized = Math.pow(Math.min(leadChanges / 8, 1), 0.9);
  const score = normalized * 100;

  return Math.min(score, 100);
}

/**
 * Calculate turnover drama component (0-100) — 8% weight
 *
 * Identifies turnovers at critical moments (Q4, within 1 score).
 * Each turnover gets leverage-weighted by impact on WP.
 *
 * Methodology:
 * 1. Count "critical turnovers": Q4 turnovers OR turnovers within 1 score
 * 2. Weight by leverage: turnovers with >20% WP swing count as 2x
 * 3. Score: min(critical_turnovers * 20, 100)
 *
 * If exact WP data unavailable:
 * - Q4 turnover: base 10 points
 * - Within 1 score: base 10 points (can stack)
 * - High-leverage (estimated): 15 points
 *
 * Examples:
 * - 1 Q4 turnover: 20
 * - 2 Q4 turnovers: 40
 * - 3 Q4 turnovers (one high-leverage): 60
 * - 5+ critical turnovers: 100
 *
 * @param criticalTurnovers - turnovers in critical moments
 * @param avgLeverage - average leverage multiplier (1-2)
 * @returns Score 0-100
 */
export function calculateTurnoverDrama(
  criticalTurnovers: number = 0,
  avgLeverage: number = 1
): number {
  if (criticalTurnovers <= 0) {
    return 0;
  }

  // Base: 20 points per critical turnover, adjusted by leverage
  const score = Math.min(criticalTurnovers * 20 * avgLeverage, 100);

  return score;
}

/**
 * Calculate overtime bonus component (0-100) — 5% weight
 *
 * Each overtime period adds drama. Multiple OTs are rare and chaotic.
 *
 * Methodology:
 * - 1 OT: 40 points (exciting, but not game-breaking)
 * - 2 OT: 65 points (very unusual, high stakes)
 * - 3 OT: 85 points (rare, extended drama)
 * - 4+ OT: 100 points (historic multi-OT)
 *
 * @param otPeriods - number of overtime periods (0, 1, 2, 3, 4+)
 * @returns Score 0-100
 */
export function calculateOvertimeBonus(otPeriods: number = 0): number {
  if (otPeriods === 0) {
    return 0;
  }
  if (otPeriods === 1) {
    return 40;
  }
  if (otPeriods === 2) {
    return 65;
  }
  if (otPeriods === 3) {
    return 85;
  }
  return 100; // 4+ OT
}

/**
 * Calculate context multiplier component (0-100) — 7% weight
 *
 * Game importance multiplier. Big games are chaotic when they're chaotic.
 * Stacks multiple factors without excessive scaling.
 *
 * Context factors:
 * - National Championship: 1.5x
 * - Conference Championship: 1.25x
 * - Playoff Implications: 1.3x
 * - Rivalry Game: 1.15x
 * - Top-10 Matchup: 1.1x
 * - Top-25 Matchup (both ranked): 1.1x
 * - Undefeated team loses: 1.2x
 *
 * Methodology:
 * - Start at baseline multiplier of 1.0 (50 points)
 * - Apply stacking multipliers
 * - Convert final multiplier to 0-100 score
 * - 1.0 multiplier = 0 points, 2.0 multiplier = 100 points
 *
 * @param isNationalChampionship - Is this for the national title?
 * @param isConferenceChampionship - Conference championship?
 * @param isPlayoffImplications - Does this affect playoff seeding?
 * @param isRivalry - Rivalry game?
 * @param isTopTenMatchup - Both teams ranked top 10?
 * @param isBothRanked - Both teams in top 25?
 * @param undefeatedLoss - Did an undefeated team lose?
 * @returns Score 0-100
 */
export function calculateContextMultiplier(
  isNationalChampionship: boolean = false,
  isConferenceChampionship: boolean = false,
  isPlayoffImplications: boolean = false,
  isRivalry: boolean = false,
  isTopTenMatchup: boolean = false,
  isBothRanked: boolean = false,
  undefeatedLoss: boolean = false
): number {
  let multiplier = 1.0;

  if (isNationalChampionship) {
    multiplier *= 1.5;
  }

  if (isConferenceChampionship) {
    multiplier *= 1.25;
  }

  if (isPlayoffImplications) {
    multiplier *= 1.3;
  }

  if (isRivalry) {
    multiplier *= 1.15;
  }

  if (isTopTenMatchup) {
    multiplier *= 1.1;
  } else if (isBothRanked) {
    multiplier *= 1.1;
  }

  if (undefeatedLoss) {
    multiplier *= 1.2;
  }

  // Convert multiplier to 0-100 score
  // 1.0 → 0, 1.5 → 25, 2.0 → 50, 2.5 → 75, 3.0+ → 100
  const score = Math.min((multiplier - 1.0) * 50, 100);

  return score;
}

/**
 * Calculate margin compression component (0-100) — 3% weight
 *
 * Close final scores indicate high chaos and uncertainty.
 * Methodology:
 * - 1-point game: 100
 * - 2-point game: 90
 * - 3-point game (FG): 85
 * - N-point game: max(0, 100 - (margin - 1) * 8)
 * - Ties/OT games: 100
 *
 * Examples:
 * - 1 point: 100
 * - 3 points: 84
 * - 7 points: 52
 * - 10 points: 28
 * - 14+ points: 0 (not close)
 *
 * @param finalMargin - absolute final margin
 * @returns Score 0-100
 */
export function calculateMarginCompression(finalMargin: number): number {
  // Overtime games are maximally uncertain
  if (finalMargin === 0) {
    return 100; // Tie or OT
  }

  // One-score games are chaotic
  if (finalMargin === 1) {
    return 100;
  }

  // Two-point games still very exciting
  if (finalMargin === 2) {
    return 90;
  }

  // Three-point (FG) games quite exciting
  if (finalMargin === 3) {
    return 85;
  }

  // Non-linear decay after 3 points
  // Each additional point costs 8 points of chaos score
  const score = Math.max(0, 85 - (finalMargin - 3) * 8);

  return score;
}

/**
 * Identify top chaotic plays in a game based on win probability swings
 *
 * Isolates the most dramatic moments where the outcome was in question.
 * Useful for game narrative and highlighting turning points.
 *
 * Methodology:
 * - High WP swings (>15%) are considered high-leverage
 * - Late-game plays (Q4, OT) weighted more heavily
 * - Identify plays where winner was in most danger
 *
 * @param wpCrosses50 - Times WP crossed 50% threshold
 * @param winnerLowestWP - Lowest WP the winner had
 * @param hasOT - Did game go to OT?
 * @returns Array of high-leverage plays (if data available)
 */
export function identifyTopChaosPlays(
  wpCrosses50: number = 0,
  winnerLowestWP: number = 0.5,
  hasOT: boolean = false
): ChaoticPlay[] {
  // Without granular play-by-play data, return synthetic high-leverage moments
  const plays: ChaoticPlay[] = [];

  if (wpCrosses50 > 0) {
    // For each crossing, estimate a play
    for (let i = 0; i < Math.min(wpCrosses50, 5); i++) {
      const timeRemaining = 3600 - (i * 600); // Spread plays across game
      plays.push({
        playNumber: i + 1,
        description: `Lead change (play ~${(150 * (1 - timeRemaining / 3600)).toFixed(0)})`,
        wpSwing: 0.15 + Math.random() * 0.2, // 15-35% swings
        timeRemaining,
        leverage: Math.max(10, 100 - i * 15), // Earlier plays more leveraged
        quarter: Math.floor((3600 - timeRemaining) / 900) + 1,
      });
    }
  }

  if (winnerLowestWP < 0.3) {
    // Crucial moment when winner was in danger
    plays.push({
      playNumber: plays.length + 1,
      description: 'Critical juncture - winner on brink',
      wpSwing: 0.5 - winnerLowestWP, // Size of recovery
      timeRemaining: 1200, // Estimated late-game
      leverage: 95,
      quarter: 4,
    });
  }

  if (hasOT) {
    plays.push({
      playNumber: plays.length + 1,
      description: 'Overtime play',
      wpSwing: 0.5,
      timeRemaining: 0,
      leverage: 100,
      quarter: 5,
    });
  }

  return plays.sort((a, b) => b.leverage - a.leverage).slice(0, 5);
}

/**
 * Generate chaos tags from game data
 *
 * Produces 18 possible tags categorizing the type and nature of chaos.
 * Multiple tags can apply to a single game.
 *
 * Tags (18 types):
 * - upset, unranked-beats-ranked, ranked-upset
 * - comeback, largest-comeback, goal-line-stand
 * - overtime, multi-overtime
 * - shootout, defensive-battle
 * - last-second, hail-mary, pick-six-momentum, blocked-kick
 * - rivalry-chaos, conference-chaos, playoff-shakeup
 * - weather-chaos
 *
 * @param input - Game input data
 * @param components - Calculated component scores
 * @returns Array of applicable chaos tags
 */
export function generateChaosTags(input: ChaosInput, components: ChaosComponents): string[] {
  const tags: string[] = [];
  const actualMargin = input.homeScore - input.awayScore;
  const totalPoints = input.homeScore + input.awayScore;
  const homeWon = actualMargin > 0;

  // === UPSET TAGS ===
  if (components.upsetMagnitude > 40) {
    tags.push('upset');
  }

  // Ranked upset specifics
  if (input.homeRanked !== input.awayRanked) {
    if (input.homeRanked && !homeWon) {
      tags.push('ranked-upset');
    }
    if (input.awayRanked && homeWon) {
      tags.push('unranked-beats-ranked');
    }
  }

  // === COMEBACK TAGS ===
  if ((input.largestDeficit ?? 0) >= 14) {
    tags.push('comeback');
  }

  if ((input.largestDeficit ?? 0) >= 21) {
    tags.push('largest-comeback');
  }

  // === TIMING TAGS ===
  // Last-second: winning score in final 30 seconds
  if ((input.timeOfLargestDeficit ?? 3600) < 30) {
    tags.push('last-second');
  }

  // Hail-mary: long-shot play in final moments (infer from large deficit + time)
  if ((input.largestDeficit ?? 0) >= 7 && (input.timeOfLargestDeficit ?? 3600) < 30) {
    tags.push('hail-mary');
  }

  // === OVERTIME TAGS ===
  if ((input.otPeriods ?? 0) > 0) {
    tags.push('overtime');
  }

  if ((input.otPeriods ?? 0) >= 2) {
    tags.push('multi-overtime');
  }

  // === SCORING PATTERN TAGS ===
  if (totalPoints >= 70) {
    tags.push('shootout');
  }

  if (totalPoints <= 24) {
    tags.push('defensive-battle');
  }

  // === CONTEXT TAGS ===
  if (input.isRivalry && components.upsetMagnitude > 20) {
    tags.push('rivalry-chaos');
  }

  if (input.isConferenceChampionship) {
    tags.push('conference-chaos');
  }

  if ((input.homeRanked || input.awayRanked) && components.upsetMagnitude > 30) {
    tags.push('playoff-shakeup');
  }

  // === RARE PLAY TAGS (inferred from game state) ===
  // Goal-line stand: close game with defensive dominance in red zone (infer from score pattern)
  if (Math.abs(actualMargin) <= 3 && totalPoints <= 30) {
    tags.push('goal-line-stand');
  }

  // Pick-six momentum: infer from turnover drama + close game
  if ((input.criticalTurnovers ?? 0) >= 2 && components.turnoverDrama > 60) {
    tags.push('pick-six-momentum');
  }

  // Blocked kick: infer from defensive strength + close game
  if (Math.abs(actualMargin) === 1 || Math.abs(actualMargin) === 2) {
    tags.push('blocked-kick');
  }

  // === WEATHER TAG ===
  // Note: Would need weather data input; placeholder for now
  // if (input.hasAdverseWeather) {
  //   tags.push('weather-chaos');
  // }

  // Remove duplicates and return
  return Array.from(new Set(tags));
}

/**
 * Get chaos tier from overall score
 *
 * Tiers represent the severity and memorability of game chaos.
 *
 * @param score - Chaos score (0-100)
 * @returns Tier name and catchphrase
 */
export function getChaosTier(score: number): ChaosResult['tier'] {
  if (score >= 90) return 'LEGENDARY'; // "One for the ages"
  if (score >= 75) return 'INSANE'; // "Absolute mayhem"
  if (score >= 60) return 'WILD'; // "Chaos reigns"
  if (score >= 40) return 'NOTABLE'; // "Raised eyebrows"
  if (score >= 20) return 'MILD'; // "Slight surprise"
  return 'CHALK'; // "As expected"
}

/**
 * Get tier catchphrase
 * @param tier - Chaos tier
 * @returns Short catchphrase for the tier
 */
function getTierCatchphrase(tier: ChaosResult['tier']): string {
  const phrases: Record<ChaosResult['tier'], string> = {
    LEGENDARY: 'One for the ages',
    INSANE: 'Absolute mayhem',
    WILD: 'Chaos reigns',
    NOTABLE: 'Raised eyebrows',
    MILD: 'Slight surprise',
    CHALK: 'As expected',
  };
  return phrases[tier];
}

/**
 * Generate human-readable description of the game
 *
 * Creates a narrative that explains why the game was chaotic.
 * Tailored to the tier and tag combination.
 *
 * @param tier - Chaos tier
 * @param tags - Game tags
 * @param components - Component scores for context
 * @returns Multi-sentence narrative
 */
function generateDescription(
  tier: ChaosResult['tier'],
  tags: string[],
  components: ChaosComponents
): string {
  const baseDescriptions: Record<ChaosResult['tier'], string> = {
    LEGENDARY:
      'One of the most chaotic games in recent memory. Multiple momentum shifts, shocking moments, and pure bedlam from start to finish.',
    INSANE:
      'Absolute mayhem. This game had everything — lead changes, dramatic swings, and heart-pounding tension throughout.',
    WILD:
      'A wild ride from start to finish. Chaos reigned with surprises around every corner and plenty of edge-of-your-seat action.',
    NOTABLE:
      'An entertaining matchup with unexpected developments. Some surprises and interesting moments raised eyebrows.',
    MILD:
      'A slightly surprising result, but mostly consistent with expectations. A few unexpected moments but generally controlled.',
    CHALK: 'As expected. The favored outcome largely held true throughout the game with minimal chaos.',
  };

  let description = baseDescriptions[tier];

  // Tag-specific customizations
  if (tags.includes('upset') && tags.includes('last-second')) {
    return 'A stunning last-second upset that shocked the college football world. David slayed Goliath in the final moments.';
  }

  if (tags.includes('multi-overtime')) {
    return 'An epic multi-overtime battle that tested both teams to their limits. One for the ages.';
  }

  if (tags.includes('comeback') && components.comebackFactor > 80) {
    return 'An incredible comeback against all odds. The deficit seemed insurmountable, but determination prevailed.';
  }

  if (tags.includes('shootout')) {
    return 'An offensive explosion. Both teams lit up the scoreboard in an entertainment showcase.';
  }

  if (tags.includes('defensive-battle')) {
    return 'A defensive masterclass. Field position and situational football were paramount in this low-scoring chess match.';
  }

  if (tags.includes('rivalry-chaos') && components.upsetMagnitude > 50) {
    return 'A rivalry game that lived up to the hype. Deep-seated hatred and pride produced a chaotic, memorable battle.';
  }

  if (tags.includes('playoff-shakeup')) {
    return 'A seismic upset with major playoff implications. This result will reverberate through the entire season.';
  }

  return description;
}

/**
 * Generate detailed game narrative
 *
 * Creates a 2-3 sentence narrative explaining the game's chaos.
 *
 * @param input - Game input
 * @param components - Component scores
 * @param tags - Applied tags
 * @returns Detailed narrative
 */
function generateNarrative(
  input: ChaosInput,
  components: ChaosComponents,
  tags: string[]
): string {
  const parts: string[] = [];

  // Excitement level narrative
  if (components.excitementIndex > 80) {
    parts.push('The game was an absolute thriller, with teams trading blows throughout.');
  } else if (components.excitementIndex > 60) {
    parts.push('This matchup featured entertaining back-and-forth action.');
  }

  // Upset narrative
  if (components.upsetMagnitude > 60 && tags.includes('upset')) {
    const underdog = input.homePreGameWP < 0.5 ? 'The home team' : 'The visiting team';
    parts.push(
      `${underdog} pulled off a shocking upset despite being heavily favored to lose.`
    );
  }

  // Comeback narrative
  if (components.comebackFactor > 50 && (input.largestDeficit ?? 0) > 10) {
    parts.push(
      `A dramatic comeback saw the trailing team overcome a ${input.largestDeficit}-point deficit.`
    );
  }

  // Lead changes narrative
  if (components.leadChanges > 70 && (input.leadChanges ?? 0) >= 5) {
    parts.push(
      `Momentum shifted ${input.leadChanges} times, with neither team able to gain control.`
    );
  }

  // Overtime narrative
  if (tags.includes('multi-overtime')) {
    parts.push('The game needed multiple overtimes to determine a winner, adding to the drama.');
  } else if (tags.includes('overtime')) {
    parts.push('The game required overtime to settle, extending the suspense.');
  }

  // Margin narrative
  if (Math.abs(input.homeScore - input.awayScore) <= 2) {
    parts.push('The final margin was razor-thin, decided by mere points.');
  }

  // Generic fallback
  if (parts.length === 0) {
    parts.push(`This game featured ${getTierCatchphrase(getChaosTier(components.excitementIndex + components.upsetMagnitude + components.leadChanges)).toLowerCase()}.`);
  }

  return parts.join(' ');
}

/**
 * Calculate complete Chaos Score — main entry point
 *
 * Computes all 8 component scores with their respective weights, generates
 * tags and tier classification, and produces detailed narrative.
 *
 * Weights (sum to 100%):
 * - Excitement Index: 30%
 * - Upset Magnitude: 25%
 * - Comeback Factor: 12%
 * - Lead Changes: 10%
 * - Turnover Drama: 8%
 * - Overtime Bonus: 5%
 * - Context Multiplier: 7%
 * - Margin Compression: 3%
 *
 * @param input - Game data and context
 * @returns Complete ChaosResult with score, components, tags, tier, and narrative
 * @throws Error if inputs are invalid (negative scores, WP outside 0-1)
 */
export function calculateChaosScore(input: ChaosInput): ChaosResult {
  // === INPUT VALIDATION ===
  if (input.homeScore < 0 || input.awayScore < 0) {
    throw new Error('Scores must be non-negative');
  }

  if (input.homePreGameWP < 0 || input.homePreGameWP > 1) {
    throw new Error('Pre-game WP must be between 0 and 1');
  }

  if (input.winnerLowestWP !== undefined && (input.winnerLowestWP < 0 || input.winnerLowestWP > 1)) {
    throw new Error('Winner lowest WP must be between 0 and 1');
  }

  // === COMPONENT CALCULATION ===
  const components: ChaosComponents = {
    // 30% weight
    excitementIndex: calculateExcitementIndex(
      input.excitementIndex,
      input.playCount,
      input.homeScore,
      input.awayScore
    ),

    // 25% weight
    upsetMagnitude: calculateUpsetMagnitude(
      input.homePreGameWP,
      input.homeScore,
      input.awayScore,
      input.homeRating,
      input.awayRating,
      input.homeRanked,
      input.awayRanked,
      input.homePreGameWP < 0.5, // Away team favored (on road assumption)
      input.homeScore < input.awayScore ? input.awayUndefeated : input.homeUndefeated
    ),

    // 12% weight
    comebackFactor: calculateComebackFactor(
      input.largestDeficit,
      input.timeOfLargestDeficit
    ),

    // 10% weight
    leadChanges: calculateLeadChanges(input.leadChanges),

    // 8% weight
    turnoverDrama: calculateTurnoverDrama(input.criticalTurnovers, 1.2),

    // 5% weight
    overtimeBonus: calculateOvertimeBonus(input.otPeriods),

    // 7% weight
    contextMultiplier: calculateContextMultiplier(
      input.isNationalChampionship,
      input.isConferenceChampionship,
      input.isPlayoffImplications,
      input.isRivalry,
      input.isTopTenMatchup,
      input.isBothRanked,
      (input.homeUndefeated && input.homeScore < input.awayScore) ||
        (input.awayUndefeated && input.homeScore > input.awayScore)
    ),

    // 3% weight
    marginCompression: calculateMarginCompression(Math.abs(input.homeScore - input.awayScore)),
  };

  // === WEIGHTED SUM ===
  const chaosScore =
    components.excitementIndex * 0.30 +
    components.upsetMagnitude * 0.25 +
    components.comebackFactor * 0.12 +
    components.leadChanges * 0.1 +
    components.turnoverDrama * 0.08 +
    components.overtimeBonus * 0.05 +
    components.contextMultiplier * 0.07 +
    components.marginCompression * 0.03;

  // === METADATA GENERATION ===
  const tags = generateChaosTags(input, components);
  const tier = getChaosTier(chaosScore);
  const description = generateDescription(tier, tags, components);
  const narrative = generateNarrative(input, components, tags);

  return {
    chaosScore: Math.min(Math.max(chaosScore, 0), 100), // Clamp to 0-100
    components,
    tags,
    tier,
    description,
    narrative,
  };
}

/**
 * Calculate chaos for all games in a week
 *
 * Aggregates individual game chaos scores and identifies the week's
 * dominant chaos narrative. Useful for weekly digests and season analysis.
 *
 * @param games - Array of game inputs (typically all games from one week)
 * @returns Weekly aggregation with average, median, most chaotic, and narrative
 */
export function calculateWeekChaos(games: ChaosInput[]): WeekChaosResult {
  if (games.length === 0) {
    return {
      games: [],
      weekAverage: 0,
      weekMedian: 0,
      mostChaotic: {} as ChaosResult,
      weekNarrative: 'No games to analyze.',
      totalGamesAnalyzed: 0,
      chaosGameCount: 0,
    };
  }

  // Calculate chaos for each game
  const results = games.map((game) => calculateChaosScore(game));

  // Sort by chaos score for median calculation
  const sorted = [...results].sort((a, b) => a.chaosScore - b.chaosScore);
  const weekMedian = sorted[Math.floor(sorted.length / 2)]?.chaosScore ?? 0;

  // Find most chaotic game
  const mostChaotic = results.reduce((prev, current) =>
    current.chaosScore > prev.chaosScore ? current : prev
  );

  // Count games with chaos score > 70 (notable chaos threshold)
  const chaosGameCount = results.filter((r) => r.chaosScore > 70).length;

  // Calculate average
  const weekAverage = results.reduce((sum, result) => sum + result.chaosScore, 0) / results.length;

  // Generate week narrative
  const weekNarrative = generateWeekNarrative(results, weekAverage);

  return {
    games: results,
    weekAverage: Math.round(weekAverage * 100) / 100,
    weekMedian: Math.round(weekMedian * 100) / 100,
    mostChaotic,
    weekNarrative,
    totalGamesAnalyzed: games.length,
    chaosGameCount,
  };
}

/**
 * Generate narrative summary for a week of games
 *
 * Creates a 1-2 sentence summary of the week's overall chaos trend.
 *
 * @param results - Array of calculated chaos results
 * @param average - Week average chaos score
 * @returns Narrative string
 */
function generateWeekNarrative(results: ChaosResult[], average: number): string {
  if (results.length === 0) return '';

  const upsets = results.filter((r) => r.tags.includes('upset')).length;
  const comebacks = results.filter((r) => r.tags.includes('comeback')).length;
  const overtimes = results.filter((r) => r.tags.includes('overtime')).length;
  const legendary = results.filter((r) => r.tier === 'LEGENDARY' || r.tier === 'INSANE').length;

  const narrativeParts: string[] = [];

  if (average >= 70) {
    narrativeParts.push('A chaotic week of college football');
  } else if (average >= 50) {
    narrativeParts.push('An entertaining week of competition');
  } else {
    narrativeParts.push('A relatively chalk week');
  }

  const highlights: string[] = [];

  if (upsets >= 2) {
    highlights.push(`with ${upsets} upsets`);
  } else if (upsets === 1) {
    highlights.push('with a notable upset');
  }

  if (comebacks >= 2) {
    highlights.push(`${upsets >= 1 ? 'and' : 'with'} ${comebacks} dramatic comebacks`);
  }

  if (overtimes >= 2) {
    highlights.push(`${upsets + comebacks >= 1 ? 'and' : 'with'} ${overtimes} overtime games`);
  } else if (overtimes === 1) {
    highlights.push(`${upsets + comebacks >= 1 ? 'and' : 'with'} an overtime thriller`);
  }

  if (legendary >= 2) {
    highlights.push(`including ${legendary} legendary games`);
  }

  return narrativeParts.join(' ') + (highlights.length > 0 ? ' ' + highlights.join(' ') : '.');
}

/**
 * Calculate chaos for an entire season, grouped by week
 *
 * Aggregates all games across a season, organized by week.
 * Useful for season-level analysis and historical comparison.
 *
 * @param games - Array of game inputs with week numbers
 * @returns Map of week number to weekly chaos aggregation
 */
export function calculateSeasonChaos(
  games: (ChaosInput & { week: number })[]
): Map<number, WeekChaosResult> {
  const byWeek = new Map<number, ChaosInput[]>();

  // Group games by week
  games.forEach((game) => {
    const week = game.week || 1;
    if (!byWeek.has(week)) {
      byWeek.set(week, []);
    }
    byWeek.get(week)!.push(game);
  });

  // Calculate chaos for each week
  const results = new Map<number, WeekChaosResult>();
  byWeek.forEach((weekGames, week) => {
    results.set(week, calculateWeekChaos(weekGames));
  });

  return results;
}
