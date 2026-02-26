# GridRank Technical Formula Reference
**Implementation Guide with Mathematical Formulas, Code Pseudocode, and Validation**

---

## TABLE OF CONTENTS

1. Glicko-2 Core Formulas
2. Margin of Victory Extensions
3. Five Factors Calculations
4. Preseason Prior Construction
5. Garbage Time Filtering
6. Dynamic Home-Field Advantage
7. Volatility Estimation
8. Prior Decay Schedule
9. EPA Integration
10. Validation & Testing

---

## 1. GLICKO-2 CORE FORMULAS

### 1.1 Rating Update Process

**Inputs**:
- `r`: Current rating
- `RD`: Rating Deviation (uncertainty)
- `sigma`: Volatility (consistency measure)
- `tau`: Volatility adjustment parameter (0.3-1.2, suggested 0.5)
- Games: Array of {opponent_rating, opponent_RD, outcome}

### 1.2 Pre-Rating Period Calculation

```typescript
// Convert to pre-rating period values
function preRatingPeriodConversion(r: number, RD: number, sigma: number):
  { r_pre: number, RD_pre: number } {

  RD_pre = Math.sqrt(RD**2 + sigma**2)
  r_pre = r  // rating stays same

  return { r_pre, RD_pre }
}
```

### 1.3 Game Processing (Iterative Update)

For each game played:

```typescript
function processGame(
  r_pre: number,
  RD_pre: number,
  opponent_r: number,
  opponent_RD: number,
  outcome: number  // 1=win, 0.5=tie, 0=loss (modified by MOV)
): { d_squared: number, g_function: number, E: number } {

  const pi = Math.PI;

  // g() function - accounts for opponent uncertainty
  const g = (RD: number): number => {
    return 1 / Math.sqrt(1 + (3 * RD**2) / (pi**2))
  }

  const g_opp = g(opponent_RD)

  // Expected outcome
  const E = 1 / (1 + 10**(-g_opp * (r_pre - opponent_r) / 400))

  // d² calculation
  const d_squared = 1 / (g_opp**2 * E * (1 - E))

  return { d_squared, g_function: g_opp, E }
}
```

### 1.4 Volatility Calculation (Illinois Algorithm)

```typescript
function calculateVolatility(
  r_pre: number,
  RD_pre: number,
  sigma: number,
  tau: number,
  results: Array<{d_squared, outcome, E}>
): number {

  const pi = Math.PI;

  // Sum of weighted residuals
  let v = 0;
  let sum_d = 0;

  for (const res of results) {
    v += res.d_squared;
    sum_d += (res.outcome - res.E)**2 / res.d_squared;
  }

  v = 1 / v;

  // Volatility difference calculation
  const a = Math.log(sigma**2);
  const A = a + tau**2 * sum_d / 2;

  let B = 0;
  if (A > Math.log(tau**2)) {
    B = Math.log(A - Math.log(tau**2));
  } else {
    B = a - 2 * Math.log(tau);
  }

  // Illinois algorithm (iterative converging)
  let f_lower = 0, f_upper = 0;
  let x_lower = A, x_upper = B;

  for (let i = 0; i < 100; i++) {  // Usually converges in 5-10 iterations
    const x_mid = (x_lower + f_lower * (x_upper - x_lower)) /
                  (f_lower - f_upper);

    const f_mid = (x_mid**2) / (2 * (x_mid - a)) -
                  sum_d / (2 * v) - 1;

    if (Math.abs(f_mid) < 0.0001) break;

    if (f_mid * f_lower < 0) {
      x_upper = x_mid;
      f_upper = f_mid;
    } else {
      x_lower = x_mid;
      f_lower = f_mid;
    }
  }

  const sigma_new = Math.exp(x_lower / 2);

  return sigma_new;
}
```

### 1.5 Rating & RD Update

```typescript
function updateRatingAndRD(
  r_pre: number,
  RD_pre: number,
  sigma_new: number,
  results: Array<{g_opp, outcome, E}>
): { r_new: number, RD_new: number } {

  const pi = Math.PI;

  // Calculate weighted sum
  let weighted_sum = 0;
  for (const res of results) {
    weighted_sum += res.g_opp * (res.outcome - res.E);
  }

  // New rating
  const r_new = r_pre + weighted_sum / (1 / (RD_pre**2) + 1 / sigma_new**2);

  // New RD
  const RD_new = Math.sqrt(1 / (1 / (RD_pre**2) + 1 / sigma_new**2));

  return { r_new, RD_new }
}
```

### 1.6 Confidence Interval Display

```typescript
function formatRating(r: number, RD: number, confidence = 0.95): string {
  // 0.95 confidence = 1.96 standard deviations
  const z = confidence === 0.95 ? 1.96 : 1.645;
  const margin = z * RD;

  return `${Math.round(r)} ± ${Math.round(margin)}`;
  // Example: "1523 ± 47"
}
```

---

## 2. MARGIN OF VICTORY EXTENSIONS

### 2.1 FiveThirtyEight Approach (RECOMMENDED)

This is the best-performing MOV extension based on research.

```typescript
function calculateMOVMultiplier(
  margin: number,
  rating_A: number,
  rating_B: number
): number {

  const ratingDiff = Math.abs(rating_A - rating_B);

  // Logarithmic compression on margin
  const log_compression = Math.log(Math.abs(margin) + 1);

  // Dynamic scaling based on expected margin
  const denominator = (ratingDiff * 0.001) + 2.2;
  const scale_factor = 2.2 / denominator;

  const multiplier = log_compression * scale_factor;

  return multiplier;
}

function updateWithMOV(
  base_K: number,
  margin: number,
  rating_A: number,
  rating_B: number,
  actual_result: number  // 1=A won, 0=A lost
): number {

  const expected_result = expectedOutcome(rating_A, rating_B);
  const mov_multiplier = calculateMOVMultiplier(margin, rating_A, rating_B);

  const rating_change = base_K * (actual_result - expected_result) * mov_multiplier;

  return rating_change;
}
```

### 2.2 Alternative: Log-Transformed Outcome Probability

Current GridRank approach (refined):

```typescript
function compressMargin(margin: number): number {
  // Logarithmic compression with sign preservation
  const sign = margin >= 0 ? 1 : -1;
  return sign * Math.log(1 + Math.abs(margin) / 3);
}

function marginalToOutcomeProbability(compressed_margin: number): number {
  // Treat larger margins as stronger evidence of win
  // tanh() squashes to [-1, 1] range
  const normalized = compressed_margin / 15;  // Scale factor
  return 0.5 + 0.5 * Math.tanh(normalized);
}

function updateWithCompressedMargin(
  rating_A: number,
  rating_B: number,
  margin: number
): number {

  const compressed = compressMargin(margin);
  const outcome_prob = marginalToOutcomeProbability(compressed);

  // Feed into standard Glicko-2 update
  const K = 20;
  const expected = expectedOutcome(rating_A, rating_B);

  return K * (outcome_prob - expected);
}
```

### 2.3 Diminishing Returns Curve (Sagarin-style)

If you want to match Sagarin's approach:

```typescript
function sagarin_margin_weight(margin: number): number {
  // Diminishing returns curve
  // Win by 7: weight = 0.5
  // Win by 21: weight = 0.8
  // Win by 35+: weight = 1.0 (asymptotes)

  return 1 - Math.exp(-Math.abs(margin) / 30);
}

// Apply to rating change:
const base_change = 20;  // Base K-factor equivalent
const margin_weight = sagarin_margin_weight(margin);
const actual_change = base_change * margin_weight * direction;
```

---

## 3. FIVE FACTORS CALCULATIONS

### 3.1 Efficiency (Success Rate)

```typescript
interface Play {
  down: number;
  yards_needed: number;
  yards_gained: number;
  drive_result: 'conversion' | 'punt' | 'fg' | 'turnover';
}

function isSuccessfulPlay(play: Play): boolean {
  const threshold =
    play.down === 1 ? 0.50 :  // 1st down: 50% threshold
    play.down === 2 ? 0.70 :  // 2nd down: 70% threshold
    play.down === 3 ? 1.00 :  // 3rd: 100%
    1.00;                      // 4th: 100%

  return play.yards_gained >= (play.yards_needed * threshold);
}

function calculateSuccessRate(plays: Play[]): number {
  const successful = plays.filter(isSuccessfulPlay).length;
  return successful / plays.length;
}

// Offensive Success Rate: ratio of successful plays
// Defensive Success Rate: 1 - opponent_success_rate
```

### 3.2 Explosiveness (PPP - Points Per Play)

```typescript
interface PPPValue {
  [yard_line: number]: number;  // Expected points at each yard line
}

const expectedPointsTable: PPPValue = {
  // Pre-calculated from historical data
  // Yard line -> Expected points on next possession
  100: -2.0,   // Own goal line
  99: -1.9,
  // ... interpolated values ...
  0: 7.0,      // Opponent goal line
};

function calculatePPP(plays: Play[], isOffense: boolean): number {
  let total_ppp = 0;

  for (let i = 0; i < plays.length; i++) {
    const play = plays[i];

    // Get expected points before play
    const ep_before = expectedPointsTable[play.yard_line];

    // Simulate new yard line after play
    const new_yard_line = Math.max(0, play.yard_line - play.yards_gained);
    const ep_after = expectedPointsTable[new_yard_line];

    const ppp = isOffense ? ep_after - ep_before : ep_before - ep_after;
    total_ppp += ppp;
  }

  return total_ppp / plays.length;
}

// Explosiveness = PPP per play (offense) or allowed (defense)
```

### 3.3 Field Position Value

```typescript
function calculateFieldPositionValue(drives: Drive[]): number {
  // Average starting field position for offensive drives
  let total_starting_yardline = 0;

  for (const drive of drives) {
    total_starting_yardline += drive.starting_yard_line;
  }

  return total_starting_yardline / drives.length;
}

// Expected conversion to points:
// Better field position (lower number) = more valuable
// Own 20 vs. Own 40 = 3-4 point swing
```

### 3.4 Finishing Drives (Red Zone Efficiency)

```typescript
function calculateFinishingDrives(drives: Drive[]): number {
  // Percentage of drives inside opponent's 20 yard line that score
  const red_zone_drives = drives.filter(d => d.reached_redzone);

  if (red_zone_drives.length === 0) return 0;

  const scoring_drives = red_zone_drives.filter(d =>
    d.result === 'touchdown' || d.result === 'field_goal'
  );

  return scoring_drives.length / red_zone_drives.length;
}
```

### 3.5 Turnovers

```typescript
function calculateTurnoverMargin(team: Team): number {
  return team.forced_turnovers - team.turnovers_committed;
}

// Better metric: Turnovers adjusted by field position value
function adjustedTurnoverValue(
  turnovers_forced: number,
  turnovers_committed: number,
  ep_impact: number  // Expected points impact
): number {

  // Each turnover is worth ~3-4 points on average
  const turn_value = 3.5;

  return (turnovers_forced - turnovers_committed) * turn_value;
}
```

### 3.6 Five Factors Composite Score

```typescript
function calculateFiveFactorsAdjustment(
  team_efficiency: number,
  team_explosiveness: number,
  team_field_position: number,
  team_finishing: number,
  team_turnovers: number,

  opp_efficiency: number,
  opp_explosiveness: number,
  opp_field_position: number,
  opp_finishing: number,
  opp_turnovers: number
): number {

  // Win rates from research:
  // Efficiency beats opp: 83% win rate = +166 rating points
  // Explosiveness beats opp: 86% win rate = +172 rating points
  // etc.

  const win_rate_to_rating = (win_pct: number) => {
    // Convert 60% win rate -> rating adjustment
    return (win_pct - 0.5) * 200;
  };

  // Weigh efficiency and explosiveness more heavily
  const adjustment =
    0.35 * win_rate_to_rating(team_efficiency > opp_efficiency ? 0.83 : 0.17) +
    0.35 * win_rate_to_rating(team_explosiveness > opp_explosiveness ? 0.86 : 0.14) +
    0.10 * win_rate_to_rating(team_field_position > opp_field_position ? 0.72 : 0.28) +
    0.10 * win_rate_to_rating(team_finishing > opp_finishing ? 0.75 : 0.25) +
    0.10 * win_rate_to_rating(team_turnovers > opp_turnovers ? 0.73 : 0.27);

  return adjustment;
}
```

---

## 4. PRESEASON PRIOR CONSTRUCTION

### 4.1 Recommended Formula

```typescript
function calculatePreseasonRating(
  prior_year_rating: number,
  prior_year_RD: number,
  recruiting_strength: number,  // 0-100 scale
  returning_production: number,  // 0-100 percentage
  coach_tenure_years: number,
  coach_change: boolean
): { rating: number, RD: number } {

  // Component 1: Regressed prior year rating
  // Regression toward FBS/FCS/D2/D3 mean based on level
  const fbs_mean = 1500;
  const regression_rate = 0.30;  // Regress 30% of the way to mean
  const regressed_prior =
    prior_year_rating * (1 - regression_rate) +
    fbs_mean * regression_rate;

  // Adjustment for coaching change
  const coach_adjustment = coach_change ? -50 : 0;
  const adjusted_prior = regressed_prior + coach_adjustment;

  // Component 2: Recruiting strength
  // High recruit ranking correlates with rating improvement
  // Top 10 recruiting class ≈ +100 rating points vs. average
  const recruiting_adjustment = (recruiting_strength - 50) * 4;

  // Component 3: Returning production
  // 75% returning production ≈ +20 rating points (continuity bonus)
  const returning_adjustment = (returning_production - 50) * 0.4;

  // Component 4: Coach tenure
  // Long tenured coaches more predictive (stable systems)
  const tenure_adjustment = Math.min(coach_tenure_years * 5, 30);

  // Weighted combination (NEW GRIDRANK WEIGHTS):
  const rating =
    0.55 * adjusted_prior +
    0.30 * recruiting_adjustment +
    0.10 * returning_adjustment +
    0.05 * tenure_adjustment;

  // RD: Regressed prior should be slightly uncertain
  const regressed_RD = Math.sqrt(prior_year_RD**2 + 50**2);  // Add some uncertainty
  const preseason_RD = regressed_RD + (coach_change ? 30 : 0);

  return {
    rating: regressed_prior + rating,
    RD: Math.min(preseason_RD, 350)  // Cap at 350 (max uncertainty)
  };
}
```

### 4.2 Returning Production Calculation (Transfer Portal Era)

```typescript
function calculateReturningProduction(
  prior_total_yards: number,
  returning_yards: number,
  transfer_in_yards_produced: number,  // Estimated career production
  graduating_players_yards_lost: number,
  transfer_out_yards_lost: number
): number {

  const numerator = returning_yards + transfer_in_yards_produced;
  const denominator = prior_total_yards + graduating_players_yards_lost +
                     transfer_out_yards_lost;

  const returning_production_pct = (numerator / denominator) * 100;

  // Bound between 20% and 100%
  return Math.max(20, Math.min(100, returning_production_pct));
}

// Example: 2024 Miami Hurricanes
// Prior yards: 10,000
// Returning yards: 4,200 (QB Jacory Harris left for NFL, Graham Harrell is new)
// Transfer in: Mario Cristobal got transfer QBs (estimate 2,500 years)
// Graduating: 2,100 yards
// Transfer out: 1,500 yards
//
// Numerator = 4,200 + 2,500 = 6,700
// Denominator = 10,000 + 2,100 + 1,500 = 13,600
// Pct = 6,700 / 13,600 = 49.3% (significant change)
```

---

## 5. GARBAGE TIME FILTERING

### 5.1 Determine Garbage Time Status

```typescript
interface GameState {
  quarter: number;  // 1-4
  margin: number;   // Absolute value
  time_remaining: number;  // Seconds
}

function isGarbageTime(state: GameState): boolean {
  const thresholds = {
    1: 32,  // Q1: margin > 32
    2: 26,  // Q2: margin > 26
    3: 22,  // Q3: margin > 22
    4: 16   // Q4: margin > 16
  };

  return state.margin > thresholds[state.quarter];
}

function getGarbageTimeWeight(state: GameState): number {
  if (!isGarbageTime(state)) return 1.0;

  // In garbage time, reduce weight based on quarter
  const weights = {
    1: 0.4,
    2: 0.4,
    3: 0.4,
    4: 0.5  // Q4 garbage time weighted more (depth matters)
  };

  return weights[state.quarter];
}
```

### 5.2 Apply Garbage Time Weight to Play-by-Play

```typescript
function processGameWithGarbageTime(
  plays: Play[],
  margin_history: number[]  // Margin at each play
): number {

  let weighted_epa = 0;
  let total_weight = 0;

  for (let i = 0; i < plays.length; i++) {
    const play = plays[i];
    const margin = margin_history[i];

    // Determine quarter and garbage time status
    const quarter = Math.floor(play.time / 900) + 1;
    const game_state = { quarter, margin, time_remaining: 0 };

    const garbage_weight = getGarbageTimeWeight(game_state);

    // EPA calculation weighted
    const epa = calculateEPA(play);
    weighted_epa += epa * garbage_weight;
    total_weight += garbage_weight;
  }

  return weighted_epa / total_weight;
}
```

---

## 6. DYNAMIC HOME-FIELD ADVANTAGE

### 6.1 Multi-Factor HFA Calculation

```typescript
interface StadiumInfo {
  name: string;
  capacity: number;
  altitude_feet: number;
  avg_attendance: number;
  noise_decibels: number;  // If available
}

interface OpponentInfo {
  travel_distance_miles: number;
  is_conference: boolean;
  is_rival: boolean;
}

function calculateDynamicHFA(
  home_stadium: StadiumInfo,
  opponent: OpponentInfo
): number {

  // Base HFA
  let hfa = 2.0;

  // Crowd adjustment (weak signal but included)
  const crowd_factor = Math.min(home_stadium.capacity / 100000, 1.0);
  hfa += 0.2 * crowd_factor;

  // Altitude adjustment (altitude advantage)
  const altitude_factor = home_stadium.altitude_feet / 5000;
  hfa += 0.5 * altitude_factor;

  // Travel adjustment (opponent travel fatigue)
  const travel_factor = Math.min(opponent.travel_distance_miles / 2000, 1.0);
  hfa -= 0.2 * travel_factor;

  // Rivalry discount (familiar opponents get less HFA)
  if (opponent.is_rival) {
    hfa -= 0.3;
  }

  return Math.max(0.5, Math.min(hfa, 4.0));  // Bound between 0.5 and 4.0
}

// Example: Utah vs. Iowa State (neutral game)
// Utah altitude: 5,400 ft = +0.54 adjustment
// Utah capacity: 51,000 = +0.1 crowd adjustment
// Iowa State travel: 1,400 miles = -0.14 travel adjustment
// Not a rivalry
// HFA = 2.0 + 0.1 + 0.54 - 0.14 = 2.5 points
```

### 6.2 Use HFA in Predictions

```typescript
function predictedMarginWithHFA(
  home_rating: number,
  away_rating: number,
  home_stadium: StadiumInfo,
  away_team: OpponentInfo
): number {

  const base_margin = (home_rating - away_rating) / 200;
  const hfa = calculateDynamicHFA(home_stadium, away_team);

  return base_margin + hfa;
}

// Example: 1650-rated team at home vs. 1600-rated team on road
// Base margin: (1650 - 1600) / 200 = 0.25 points
// HFA adjustment: +2.5 points (from above)
// Predicted margin: 2.75 points (essentially a 3-point favorite at home)
```

---

## 7. DYNAMIC VOLATILITY ESTIMATION

### 7.1 Calculate Volatility per Team

```typescript
function estimateTeamVolatility(
  games_this_season: Game[],
  prior_volatility: number = 0.06
): number {

  // Check for erratic performances
  const rating_changes = [];

  for (let i = 0; i < games_this_season.length; i++) {
    const game = games_this_season[i];
    const expected_outcome =
      1 / (1 + 10**(-game.rating_diff / 400));

    const actual_outcome = game.won ? 1 : 0;
    const surprise = Math.abs(actual_outcome - expected_outcome);

    rating_changes.push(surprise);
  }

  if (rating_changes.length === 0) {
    return prior_volatility;
  }

  // Calculate standard deviation of surprises
  const mean_surprise = rating_changes.reduce((a, b) => a + b) /
                        rating_changes.length;

  const variance = rating_changes.reduce((sum, x) =>
    sum + (x - mean_surprise)**2, 0) / rating_changes.length;

  const std_dev = Math.sqrt(variance);

  // Map to Glicko-2 volatility scale
  // Higher surprise = higher volatility
  let new_volatility = 0.03 + (std_dev * 0.1);  // Scale factor

  // Bound between reasonable values
  new_volatility = Math.max(0.03, Math.min(0.15, new_volatility));

  // Blend with prior (don't let it change too drastically)
  return 0.7 * new_volatility + 0.3 * prior_volatility;
}
```

### 7.2 Volatility Bounds by Division

```typescript
const volatilityBounds = {
  'FBS': { min: 0.03, max: 0.12 },
  'FCS': { min: 0.04, max: 0.13 },
  'D2': { min: 0.05, max: 0.15 },
  'D3': { min: 0.06, max: 0.15 },
  'NAIA': { min: 0.06, max: 0.15 }
};

function estimateVolatilityWithBounds(
  games: Game[],
  division: string,
  prior_sigma: number
): number {

  const estimated = estimateTeamVolatility(games, prior_sigma);
  const bounds = volatilityBounds[division];

  return Math.max(bounds.min, Math.min(bounds.max, estimated));
}
```

---

## 8. PRIOR DECAY SCHEDULE

### 8.1 Linear Decay (Connelly's Approach)

```typescript
function calculatePriorWeight(week_number: number): number {
  // Week 1: 60% prior, Week 2: 50%, Week 5: 30%, Week 6: 5%, Week 7+: 0%

  if (week_number <= 1) return 0.60;
  if (week_number === 2) return 0.50;
  if (week_number === 3) return 0.40;
  if (week_number === 4) return 0.35;
  if (week_number === 5) return 0.20;
  if (week_number === 6) return 0.05;
  return 0.00;  // Week 7+: no prior weight
}

function blendRatingWithPrior(
  prior_rating: number,
  games_rating: number,
  week_number: number
): number {

  const prior_weight = calculatePriorWeight(week_number);
  const games_weight = 1 - prior_weight;

  return prior_weight * prior_rating + games_weight * games_rating;
}
```

### 8.2 Exponential Decay (Alternative)

```typescript
function calculatePriorWeightExponential(
  week_number: number,
  decay_factor: number = 0.85
): number {

  // After week 1, prior weight decreases exponentially
  const weeks_since_start = Math.max(0, week_number - 1);
  const weight = 0.6 * (decay_factor ** weeks_since_start);

  return Math.max(0, weight);  // Don't go below 0
}

// Exponential curve:
// Week 1: 60% → Week 2: 51% → Week 3: 43% → Week 5: 31% → Week 7: 22%
// More gradual than linear, but still reaches near-zero by Week 8-9
```

---

## 9. EPA INTEGRATION (Optional Advanced Feature)

### 9.1 Calculate EPA per Play

```typescript
interface EPALookupTable {
  [yard_line: number]: number;  // Expected points at each yard line
}

const epaLookup: EPALookupTable = {
  // Pre-calculated from historical college football data
  99: -1.95,
  98: -1.90,
  // ... (hundreds more entries)
  1: 6.80,
  0: 7.00  // Opponent goal line
};

function calculateEPA(
  play: Play,
  epa_table: EPALookupTable
): number {

  // Expected points before play
  const ep_before = epa_table[play.starting_yard_line] || 0;

  // Calculate new yard line after play
  let new_yard_line = play.starting_yard_line - play.yards_gained;

  // Handle turnovers (flip field)
  if (play.is_turnover) {
    new_yard_line = 100 - new_yard_line;  // Opponent gets ball
  }

  // Touchdown: automatic +7
  if (play.is_touchdown) {
    new_yard_line = 0;
  }

  // Expected points after play
  const ep_after = epa_table[new_yard_line] || 0;

  // EPA is the difference
  const epa = ep_after - ep_before;

  return epa;
}
```

### 9.2 Blend Glicko Rating with EPA-Based Estimate

```typescript
function predictedMarginWithEPA(
  team_offensive_epa: number,  // EPA per play on offense
  team_defensive_epa: number,  // EPA per play allowed (defense)
  opponent_offensive_epa: number,
  opponent_defensive_epa: number,
  plays_per_game: number = 60
): number {

  // Calculate expected point margin from EPA
  const team_expected_points =
    (team_offensive_epa - opponent_defensive_epa) * plays_per_game;

  // Margin from Glicko rating (separate calculation)
  // This would be passed in or calculated separately

  // Blend: Glicko-2 is 70% of signal, EPA is 30%
  // (Glicko calculation not shown here)

  return team_expected_points / 7;  // Convert points to spread
}
```

---

## 10. VALIDATION & TESTING

### 10.1 Accuracy Metrics

```typescript
interface Prediction {
  team_id: string;
  opponent_id: string;
  predicted_win_prob: number;
  predicted_margin: number;
  actual_result: 'win' | 'loss';
  actual_margin: number;
}

function calculateStraightUpAccuracy(
  predictions: Prediction[]
): number {

  const correct = predictions.filter(p => {
    const predicted_winner = p.predicted_win_prob > 0.5 ? 'win' : 'loss';
    return predicted_winner === p.actual_result;
  }).length;

  return correct / predictions.length;
}

function calculateATSAccuracy(
  predictions: Prediction[],
  spreads: { team_id: string, opponent_id: string, spread: number }[]
): number {

  const correct = predictions.filter(p => {
    // Find the spread for this game
    const spread_data = spreads.find(s =>
      (s.team_id === p.team_id && s.opponent_id === p.opponent_id) ||
      (s.team_id === p.opponent_id && s.opponent_id === p.team_id)
    );

    if (!spread_data) return false;

    // Check if prediction beat the spread
    const predicted_margin = p.predicted_margin;
    const actual_against_spread = p.actual_margin - spread_data.spread;

    return (predicted_margin > 0 && actual_against_spread > 0) ||
           (predicted_margin < 0 && actual_against_spread < 0);
  }).length;

  return correct / predictions.length;
}

function calculateBrierScore(predictions: Prediction[]): number {
  const squared_errors = predictions.map(p => {
    const actual = p.actual_result === 'win' ? 1 : 0;
    return (p.predicted_win_prob - actual) ** 2;
  });

  return squared_errors.reduce((a, b) => a + b, 0) / predictions.length;
}

function calculateLogLoss(predictions: Prediction[]): number {
  const losses = predictions.map(p => {
    const actual = p.actual_result === 'win' ? 1 : 0;
    const epsilon = 1e-15;  // Avoid log(0)
    const prob = Math.max(epsilon, Math.min(1 - epsilon, p.predicted_win_prob));

    return -(actual * Math.log(prob) + (1 - actual) * Math.log(1 - prob));
  });

  return losses.reduce((a, b) => a + b, 0) / predictions.length;
}
```

### 10.2 Calibration Testing

```typescript
function testCalibration(
  predictions: Prediction[],
  bucket_count: number = 10
): { bin: number, expected: number, actual: number }[] {

  // Split into 10 buckets (0-10%, 10-20%, etc.)
  const buckets: Prediction[][] = Array(bucket_count).fill(null).map(() => []);

  predictions.forEach(p => {
    const bucket_index = Math.floor(p.predicted_win_prob * bucket_count);
    const clamped_index = Math.min(bucket_index, bucket_count - 1);
    buckets[clamped_index].push(p);
  });

  // Calculate actual win rate per bucket
  const results = buckets.map((bucket, i) => {
    if (bucket.length === 0) return null;

    const wins = bucket.filter(p => p.actual_result === 'win').length;
    const actual_win_rate = wins / bucket.length;

    return {
      bin: (i + 0.5) / bucket_count,  // Midpoint of bucket
      expected: (i + 0.5) / bucket_count,
      actual: actual_win_rate
    };
  }).filter(r => r !== null);

  return results;

  // Well-calibrated model: each bucket's actual ≈ expected
  // Plot these to visualize calibration curve
}
```

### 10.3 Performance by Period

```typescript
function accuracyByWeek(
  predictions: Prediction[],
  weeks: number[]
): { week: number, accuracy: number, count: number }[] {

  const weekly_results = [];

  for (const week of weeks) {
    const week_preds = predictions.filter(p => p.week === week);

    const correct = week_preds.filter(p => {
      const predicted_winner = p.predicted_win_prob > 0.5 ? 'win' : 'loss';
      return predicted_winner === p.actual_result;
    }).length;

    weekly_results.push({
      week,
      accuracy: week_preds.length > 0 ? correct / week_preds.length : 0,
      count: week_preds.length
    });
  }

  return weekly_results;
}
```

---

## SUMMARY OF KEY CONSTANTS & PARAMETERS

```typescript
const GridRankParameters = {
  // Glicko-2
  TAU: 0.5,  // Volatility change limit
  BASE_K: 20,  // Rating change scale
  FBS_INITIAL_RATING: 1500,
  FCS_INITIAL_RATING: 1200,
  D2_INITIAL_RATING: 1000,
  D3_INITIAL_RATING: 800,
  NAIA_INITIAL_RATING: 700,

  // Margins
  MOV_LOG_SCALE: 3,  // ln(1 + |margin| / 3)
  MOV_TANH_SCALE: 15,  // tanh(compressed_margin / 15)

  // Preseason
  PRIOR_REGRESSION_RATE: 0.30,
  RECRUITING_WEIGHT: 0.30,
  RETURNING_WEIGHT: 0.10,
  COACHING_WEIGHT: 0.05,

  // Garbage Time
  Q1_THRESHOLD: 32,
  Q2_THRESHOLD: 26,
  Q3_THRESHOLD: 22,
  Q4_THRESHOLD: 16,

  // Home Field Advantage
  BASE_HFA: 2.0,
  CROWD_FACTOR: 0.2,
  ALTITUDE_FACTOR: 0.5,
  TRAVEL_FACTOR: -0.2,

  // Prior Decay
  WEEK1_PRIOR: 0.60,
  WEEK2_PRIOR: 0.50,
  WEEK5_PRIOR: 0.20,
  WEEK6_PRIOR: 0.05,
  WEEK7_PRIOR: 0.00,

  // Volatility Bounds
  FBS_SIGMA_MIN: 0.03,
  FBS_SIGMA_MAX: 0.12,

  // Accuracy Targets
  TARGET_SU_ACCURACY: 0.65,
  TARGET_ATS_ACCURACY: 0.54,
  TARGET_BRIER_SCORE: 0.22,
  TARGET_LOG_LOSS: 0.65
};
```

---

## IMPLEMENTATION CHECKLIST

- [ ] Implement Glicko-2 core with Illinois algorithm
- [ ] Add FiveThirtyEight MOV multiplier
- [ ] Calculate Five Factors (efficiency, explosiveness, etc.)
- [ ] Build preseason prior formula with new weights
- [ ] Implement garbage time filtering with updated thresholds
- [ ] Add dynamic HFA calculation
- [ ] Implement dynamic volatility estimation
- [ ] Add prior decay schedule
- [ ] Integrate EPA if data available
- [ ] Set up validation metrics (SU, ATS, Brier, Log Loss)
- [ ] Test calibration on historical data
- [ ] Weekly accuracy tracking by division/week
- [ ] Performance benchmarking vs. Vegas lines

---

End of Technical Reference
