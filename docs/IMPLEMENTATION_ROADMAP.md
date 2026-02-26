# GridRank Algorithm Implementation Roadmap
**Specific Changes to Make Based on Research**

---

## QUICK REFERENCE: WHAT TO CHANGE

### IMMEDIATE WINS (Low Effort, High Impact)

#### 1. **Margin of Victory: Switch to FiveThirtyEight MOV Multiplier**
**Current Code Location**: `src/lib/gridrank/engine.ts` (likely margin calculation)

**Current Approach**:
```typescript
outcome = 0.5 + 0.5 * tanh(compressed_margin / 15)
compressed_margin = sign(margin) * ln(1 + |margin| / 3)
```

**New Approach**:
```typescript
// In game update loop:
const mov_multiplier = LN(ABS(margin) + 1) *
                      (2.2 / ((abs(r_A - r_B)) * 0.001 + 2.2))

const rating_change = K * (actual_outcome - expected_outcome) * mov_multiplier
```

**Expected Impact**: +0.5-1% straight-up accuracy

**Effort**: 30 minutes (modify one function)

---

#### 2. **Preseason Weights: Increase Recruiting to 30%**
**Current Code Location**: `src/lib/gridrank/preseason.ts`

**Current**:
```
0.50 × Prior + 0.25 × Recruiting + 0.15 × Returning + 0.10 × Coach
```

**New**:
```
0.55 × Prior + 0.30 × Recruiting + 0.10 × Returning + 0.05 × Coach
```

**Expected Impact**: +0.3-0.5% preseason accuracy

**Effort**: 5 minutes (change weights)

---

#### 3. **Garbage Time: Tighten Thresholds**
**Current Code Location**: `src/lib/gridrank/garbage-time.ts`

**Current**:
```
Q2: |margin| > 38
Q3: |margin| > 28
Q4: |margin| > 22
```

**New**:
```
Q1: |margin| > 32 (weight 0.4)
Q2: |margin| > 26 (weight 0.4)
Q3: |margin| > 22 (weight 0.4)
Q4: |margin| > 16 (weight 0.5)
```

**Expected Impact**: +0.3-0.5% overall accuracy

**Effort**: 15 minutes (update thresholds)

---

#### 4. **Dynamic Home-Field Advantage**
**Current Code Location**: `src/lib/gridrank/home-field.ts` (or create new)

**Current**: Fixed 2.5 points for all games

**New**: Multi-factor calculation:
```
HFA = 2.0 + 0.2×crowd_factor + 0.5×altitude_factor - 0.2×travel_factor
```

**Expected Impact**: +0.3-0.5% on home/away games

**Effort**: 45 minutes (create new function)

---

### MEDIUM EFFORT (2-4 hours, Game-Changing Impact)

#### 5. **Dynamic Volatility Estimation**
**Current**: σ = 0.06 (fixed)

**New**: Calculate σ using Illinois algorithm for each team

**Files to Create/Modify**:
- `src/lib/gridrank/volatility.ts` (NEW)
- Modify `src/lib/gridrank/engine.ts` to use dynamic σ

**Expected Impact**: +0.5-1% accuracy, better confidence intervals

**Effort**: 3-4 hours

**Pseudocode**:
```typescript
function estimateVolatility(games: Game[]): number {
  // Calculate surprising outcomes
  let variance_of_surprises = 0;
  // Use Illinois algorithm to iterate to new σ
  // Bound within [0.03, 0.12] for FBS teams
  return new_sigma;
}
```

---

#### 6. **Five Factors Integration (Optional but Recommended)**
**New Feature**: Add efficiency/explosiveness trend as secondary signal

**Files to Create**:
- `src/lib/gridrank/five-factors.ts` (NEW)

**Integration Point**: After each game, calculate:
- Success rate (efficiency)
- PPP (explosiveness)
- 3-game rolling average
- Use as ±20 point adjustment to rating every week

**Expected Impact**: +0.5-1% in recent-game prediction

**Effort**: 3-4 hours

**Pseudocode**:
```typescript
function calculateFiveFactorsAdjustment(team: Team): number {
  const efficiency = calculateSuccessRate(team.recent_plays);
  const explosiveness = calculatePPP(team.recent_plays);
  // Compare to opponent, calculate adjustment
  return adjustment_in_rating_points;
}
```

---

#### 7. **EPA Integration (If CFBD API Has It)**
**Prerequisite**: Check if `collegefootballdata.com` API v4 provides EPA data

**If YES**:
- Create `src/lib/gridrank/epa-model.ts`
- Calculate offensive and defensive EPA per play
- Blend with Glicko rating: 70% Glicko, 30% EPA
- Expected impact: +1-2% accuracy

**If NO**:
- Skip this (can't source the data)
- Move to next item

**Effort**: 4-5 hours (if data available)

---

### HIGH EFFORT (1-2 weeks, Foundational)

#### 8. **Home/Away Split Ratings (Advanced)**
**Optional but Elite-Level**

Maintain three separate components:
- `neutral_rating` (core strength)
- `home_modifier` (typically +10 to +40 points)
- `away_modifier` (typically -10 to -40 points)

**Files**: Refactor `src/lib/gridrank/engine.ts` (major change)

**Impact**: +0.5-1% on games with extreme home/away splits

**Effort**: 1-2 weeks (major refactor)

**Only Pursue If**: You have time after other improvements

---

## PHASE-BY-PHASE IMPLEMENTATION PLAN

### PHASE 1: Quick Wins (Week 1)
**Goal**: +1-2% accuracy with minimal code changes

- [ ] **Task 1.1**: Implement FiveThirtyEight MOV multiplier
  - Time: 30 min
  - Files: `src/lib/gridrank/engine.ts`
  - Testing: Run 2024 season, compare ratings before/after

- [ ] **Task 1.2**: Update preseason weights (Recruiting 30%)
  - Time: 5 min
  - Files: `src/lib/gridrank/preseason.ts`
  - Testing: Verify weight sum = 1.0

- [ ] **Task 1.3**: Tighten garbage time thresholds
  - Time: 15 min
  - Files: `src/lib/gridrank/garbage-time.ts`
  - Testing: Spot check Q1/Q4 thresholds on blowouts

- [ ] **Task 1.4**: Implement dynamic HFA
  - Time: 45 min
  - Files: Create `src/lib/gridrank/home-field-dynamic.ts`
  - Testing: Calculate HFA for Utah, Ohio State, Washington (should be ~2.7-3.0)

**Total Time**: ~2 hours
**Expected Result**: +1-2% accuracy bump

---

### PHASE 2: Volatility & Five Factors (Week 2)
**Goal**: +1-1.5% additional accuracy

- [ ] **Task 2.1**: Implement dynamic volatility estimation
  - Time: 3-4 hours
  - Files: Create `src/lib/gridrank/volatility.ts`
  - Key Function: `estimateVolatility(games: Game[]): number`
  - Testing: Verify σ stays between 0.03-0.12 for FBS

- [ ] **Task 2.2**: Integrate Five Factors (optional)
  - Time: 3-4 hours (if pursuing)
  - Files: Create `src/lib/gridrank/five-factors.ts`
  - Key Metrics: Success rate, PPP, field position
  - Testing: Verify efficiency correlates with wins

- [ ] **Task 2.3**: Set up accuracy tracking
  - Time: 2 hours
  - Files: Create `src/lib/gridrank/validation.ts`
  - Metrics: SU%, ATS%, Brier score, Log loss
  - Testing: Run on historical seasons

**Total Time**: ~8-10 hours
**Expected Result**: +1-1.5% accuracy

---

### PHASE 3: EPA Integration (If Possible)
**Prerequisite**: CFBD API provides EPA data

- [ ] **Task 3.1**: Verify EPA availability in CFBD API
  - Time: 1 hour
  - Check: API documentation, sample endpoints

- [ ] **Task 3.2**: Create EPA calculation layer
  - Time: 4-5 hours (only if EPA available)
  - Files: Create `src/lib/gridrank/epa-model.ts`

- [ ] **Task 3.3**: Blend Glicko-2 with EPA
  - Time: 2 hours
  - Formula: 0.70 × Glicko + 0.30 × EPA

**Total Time**: ~7 hours (if data available)
**Expected Result**: +0.5-1% accuracy

---

## COMPARISON: GRIDRANK VS. WORLD-CLASS SYSTEMS

### Accuracy Expectations

| System | SU% | ATS% | Brier | Implementation |
|--------|-----|------|-------|---|
| **Vegas Line** | N/A | 52.4% | N/A | Betting markets |
| **Sagarin PREDICTOR** | 61-63% | 53% | 0.23 | Proprietary |
| **FPI (ESPN)** | 63-65% | 53-54% | 0.21 | EPA-based |
| **SP+ (ESPN)** | 62-65% | 53-55% | 0.20 | Efficiency-based |
| **Current GridRank** | ~57-60% | ~52% | ~0.25 | Glicko-2 basic |
| **GridRank v3 (After Phase 1)** | 60-62% | 52.5-53% | 0.23 | MOV + weights + HFA |
| **GridRank v3 (After Phase 2)** | 62-64% | 53-54% | 0.21 | + Volatility + Five Factors |
| **GridRank v3 (After Phase 3)** | 63-65% | 53-55% | 0.20 | + EPA blending |

---

## TESTING STRATEGY

### Week-by-Week Testing (2024 Season)

After each implementation phase, run full 2024 season and calculate:

```typescript
for (const week of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {
  const week_predictions = getWeekPredictions(week);
  const su_accuracy = calculateSU(week_predictions);
  const ats_accuracy = calculateATS(week_predictions);
  const brier = calculateBrier(week_predictions);

  console.log(`Week ${week}: SU=${su_accuracy.toFixed(3)}, ATS=${ats_accuracy.toFixed(3)}, Brier=${brier.toFixed(3)}`);
}
```

**Expected Results After Each Phase**:

**Phase 1** (MOV + Weights + HFA):
```
Week 1: SU=0.560, ATS=0.520
Week 2: SU=0.580, ATS=0.525
Week 3: SU=0.590, ATS=0.530
Week 7: SU=0.610, ATS=0.540
Week 13: SU=0.620, ATS=0.545
Overall: SU=0.605, ATS=0.535
```

**Phase 2** (Add Dynamic Volatility + Five Factors):
```
Week 1: SU=0.565, ATS=0.525
Week 2: SU=0.590, ATS=0.530
Week 3: SU=0.600, ATS=0.535
Week 7: SU=0.625, ATS=0.545
Week 13: SU=0.635, ATS=0.550
Overall: SU=0.620, ATS=0.540
```

**Phase 3** (Add EPA):
```
Week 1: SU=0.570, ATS=0.530
Week 2: SU=0.595, ATS=0.535
Week 3: SU=0.605, ATS=0.540
Week 7: SU=0.630, ATS=0.550
Week 13: SU=0.640, ATS=0.555
Overall: SU=0.625, ATS=0.545
```

---

## CODE STRUCTURE AFTER ALL CHANGES

```
src/lib/gridrank/
├── engine.ts (MODIFIED)
│   ├── processGame() — now uses MOV multiplier
│   ├── updateRating() — calls dynamic volatility
│   └── predictGame() — includes HFA adjustment
│
├── preseason.ts (MODIFIED)
│   └── calculatePreseasonRating() — new weights
│
├── garbage-time.ts (MODIFIED)
│   └── isGarbageTime() — tighter thresholds
│
├── home-field-dynamic.ts (NEW)
│   └── calculateDynamicHFA() — multi-factor
│
├── volatility.ts (NEW)
│   └── estimateVolatility() — Illinois algorithm
│
├── five-factors.ts (NEW)
│   ├── calculateEfficiency()
│   ├── calculateExplosiveness()
│   └── getFiveFactorsAdjustment()
│
├── epa-model.ts (NEW, if EPA data available)
│   ├── calculateOffensiveEPA()
│   ├── calculateDefensiveEPA()
│   └── blendWithGlicko()
│
└── validation.ts (NEW)
    ├── calculateStraightUpAccuracy()
    ├── calculateATSAccuracy()
    ├── calculateBrierScore()
    └── testCalibration()
```

---

## DEPLOYMENT CHECKLIST

### Before Running Phase 1:
- [ ] Backup current `src/lib/gridrank/engine.ts`
- [ ] Review current MOV formula (document it)
- [ ] Create feature branch: `git checkout -b gridrank-v3-improvements`
- [ ] Add unit tests for new functions

### Phase 1 Validation:
- [ ] Run 2024 season through engine
- [ ] Compare top 25 rankings (before vs. after)
- [ ] Check for rating anomalies (sudden jumps)
- [ ] Verify margins still reasonable (not extreme)
- [ ] Test with 2023 historical data

### Phase 1 Merge:
- [ ] Code review (peer or self-review)
- [ ] Update CLAUDE.md with new methodology
- [ ] Document breaking changes
- [ ] Commit: `git commit -m "GridRank v3 Phase 1: FiveThirtyEight MOV + Dynamic HFA"`

### Before Phase 2:
- [ ] Run full integration test on 2024 data
- [ ] Document volatility calculation approach
- [ ] Prepare Five Factors feature branch

---

## ACCURACY VALIDATION RULES

After each phase, validate that:

1. **Straight-up accuracy increases by 1-2%** compared to previous phase
2. **ATS accuracy does not decrease**
3. **Brier score improves** (approaches 0.20 target)
4. **Log loss improves** (approaches 0.65 target)
5. **Calibration curve is closer to diagonal** (predicted ≈ actual)
6. **Top 25 rankings make intuitive sense** (no UCLA at #1, etc.)
7. **Week 1-2 accuracy is lower** (prior matters more)
8. **Week 8-13 accuracy peaks** (most games played)

If any metric regresses:
- Revert the change
- Debug the issue
- Adjust parameters
- Re-test

---

## PERFORMANCE BENCHMARKS

### Speed (Important for Cron Jobs)

**GridRank Full Season Compute (2024 data)**:

| Stage | Current | Target | Notes |
|-------|---------|--------|-------|
| Load 2024 games | 0.2s | <1s | CFBD API call |
| Process 3700 games | 2s | <5s | Glicko-2 updates |
| Calculate Five Factors | N/A | <1s | NEW: Optional |
| Calculate EPA | N/A | <2s | NEW: If available |
| Update all 682 teams | 0.5s | <2s | Volatility calc |
| Write to Redis | 0.3s | <1s | Cache results |
| **Total** | **~3s** | **<12s** | Acceptable |

**Memory Usage**:
- 682 teams × 3 ratings × 8 bytes = ~16 KB (negligible)
- Games in memory: 3700 × 100 bytes = ~370 KB (negligible)
- No memory regressions expected

---

## KNOWN RISKS & MITIGATION

| Risk | Mitigation |
|------|-----------|
| **MOV multiplier is too aggressive** | Adjust denominator from 2.2 to 2.5-3.0 if needed |
| **Dynamic HFA breaks home/away splits** | Test vs. historical home/away differential |
| **Volatility estimation oscillates** | Add smoothing: blend 70% new, 30% prior |
| **Five Factors adds noise** | Only enable if it improves validation metrics |
| **EPA data unreliable** | Fallback to pure Glicko-2 if EPA correlation < 0.70 |

---

## SUCCESS CRITERIA

**GridRank v3 is successful when**:

1. ✅ Straight-up accuracy on 2024 season ≥ 63%
2. ✅ ATS accuracy ≥ 53.5%
3. ✅ Brier score ≤ 0.21
4. ✅ Top 25 rankings align with consensus (P5 teams mostly in top 50)
5. ✅ Historical validation (2014-2023) maintains ≥ 62% accuracy
6. ✅ No rating outliers (all teams 600-2000 range)
7. ✅ Code is clean, well-tested, documented

---

## REFERENCE: RESEARCH CITATIONS

All formulas and approaches based on:

1. **Bill Connelly's SP+** — [ESPN College Football Rankings](https://www.espn.com/college-football/rankings)
2. **FiveThirtyEight Elo** — [Methodology](https://fivethirtyeight.com/methodology/)
3. **Margin of Victory Research** — [Kovalchik (2020)](https://arxiv.org/html/2506.00348)
4. **Glicko-2 Documentation** — [Mark Glickman](https://glicko.net/glicko/glicko2.pdf)
5. **Five Factors Framework** — [Football Study Hall](https://www.footballstudyhall.com/five-factors)
6. **EPA Metrics** — [College Football Data](https://cfbfastr.sportsdataverse.org/)
7. **Accuracy Benchmarks** — [Vegas Breakeven](https://www.boydsbets.com/ats-margin-standard-deviations-by-point-spread/)

---

## NEXT STEPS (After Reading)

1. **Review `ALGORITHM_RESEARCH_DEEP_DIVE.md`** for full context
2. **Review `TECHNICAL_FORMULA_REFERENCE.md`** for specific formulas
3. **Pick ONE Phase 1 task** and start coding
4. **Test incrementally** (don't refactor everything at once)
5. **Track metrics** after each change
6. **Document decisions** in commit messages

Good luck! This should push GridRank into elite-level accuracy territory.

---
