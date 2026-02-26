# Claude Code Roadmap — Exact Steps to Ship Gridiron Intel

> **Context:** Cowork sessions built all computation engines, UI components, utilities, API routes, and scripts. Everything is standalone modules. Your job is to **wire it all together, validate with real data, and build the pages.**
>
> **IMPORTANT:** Before running GridRank, read `docs/ALGORITHM_UPGRADES.md` — it has 6 specific, research-backed improvements to make to the engines (better MOV multiplier, cross-level calibration, tighter garbage time, dynamic HFA, preseason weights, Five Factors). Changes 1-5 take ~2 hours and are high-impact. The full research is in `docs/ALGORITHM_RESEARCH_DEEP_DIVE.md` and `docs/TECHNICAL_FORMULA_REFERENCE.md`.

## What Already Works

### Database (Supabase PostgreSQL — connected)
- 682 teams seeded (FBS, FCS, D2, D3, NAIA)
- 99 conferences seeded
- 14 seasons (2011-2024) structure
- 3,742 games seeded (2024 only)
- 1,767 recruiting players seeded (2024 only)
- **Empty tables:** Ranking, TeamRanking, ChaosGame, CoachGrade, CoachDecision, PlayerOutlier, TeamAnomaly, AwardCandidate

### Computation Engines (all in `src/lib/`)
| Engine | File | Status |
|--------|------|--------|
| GridRank (Glicko-2) | `gridrank/engine.ts` | Built + script exists |
| Preseason Priors | `gridrank/preseason.ts` | Built |
| Home Field Advantage | `gridrank/home-field.ts` | Built |
| Garbage Time Filter | `gridrank/garbage-time.ts` | Built |
| Chaos Score | `chaos/chaos-score.ts` | Built + script exists |
| Monte Carlo Sim | `matchup/monte-carlo.ts` | Built |
| Win Probability | `win-probability/model.ts` | Built |
| Coach 4th Down | `coaches/fourth-down.ts` | Built |
| Coach Grading | `coaches/grading.ts` | Built + script exists |
| Player Outliers | `lab/player-outliers.ts` | Built + script exists |
| Team Anomalies | `lab/team-anomalies.ts` | Built + script exists |
| Award Prediction | `awards/prediction.ts` | Built + script exists |

### Infrastructure (all in `src/lib/`)
| Module | File | What It Does |
|--------|------|-------------|
| Redis Cache | `db/cache.ts` | `cached()`, `cachedBatch()`, SWR, tag invalidation |
| CFBD Rate Limiter | `cfbd/rate-limiter.ts` | Token bucket, circuit breaker, request queue |
| DB Queries | `db/queries.ts` | 20+ cached Prisma query helpers |
| Data Transforms | `data/transforms.ts` | CFBD → Engine, Prisma → Engine, Engine → API |
| Formatting | `utils/formatting.ts` | 40+ functions (ratings, spreads, ordinals, time) |
| Fuzzy Search | `utils/search.ts` | Trigram-indexed team search (<5ms for 1200 teams) |
| Validation | `utils/validation.ts` | Zod schemas for all API inputs |
| Animations | `utils/animations.ts` | Framer Motion presets (50+ variants) |
| OG Images | `utils/og-image.ts` | 6 SVG template generators |
| JSON-LD SEO | `utils/structured-data.ts` | 10 schema.org generators |
| Newsletter | `email/newsletter-template.ts` | "The Stack" HTML template |
| Mock Factories | `test/mock-factories.ts` | Test data generators (30 real teams) |

### UI Components (all in `src/components/`)
| Component | File | What It Does |
|-----------|------|-------------|
| DataTable | `ui/data-table.tsx` | Responsive table, column priorities, keyboard nav, sort, mobile cards |
| Sparkline | `charts/sparkline.tsx` | Inline SVG mini chart (80x24px) |
| WP Chart | `charts/wp-chart.tsx` | Win probability area chart (Recharts) |
| Rating History | `charts/rating-history.tsx` | Rating line chart with confidence band |
| Score Distribution | `charts/score-distribution.tsx` | Monte Carlo histogram |
| Bump Chart | `charts/bump-chart.tsx` | D3 multi-team rank evolution |
| Tooltip | `ui/tooltip.tsx` | Hover tooltip + StatTooltip + InfoTip |
| Skeleton | `ui/skeleton.tsx` | Shimmer skeleton primitives |
| Error State | `ui/error-state.tsx` | Branded error + not-found + network error |
| Team Logo | `ui/team-logo.tsx` | 3-tier fallback (DB → ESPN CDN → letter avatar) |
| Rankings Skeleton | `skeletons/rankings-skeleton.tsx` | Rankings page loading state |
| Team Skeleton | `skeletons/team-skeleton.tsx` | Team page loading state |
| Matchup Skeleton | `skeletons/matchup-skeleton.tsx` | Matchup page loading state |

### API Routes (all in `src/app/api/`)
| Route | Method | Status |
|-------|--------|--------|
| `/api/rankings` | GET | Built — reads from TeamRanking table |
| `/api/teams` | GET | Built — search teams |
| `/api/teams/[slug]` | GET | Built — team detail with ratings, games, history |
| `/api/matchup` | POST | Built — runs Monte Carlo sim |
| `/api/chaos` | GET | Built — reads from ChaosGame table |
| `/api/predictions` | GET | Built — reads predictions from games |
| `/api/health` | GET | Built — DB + Redis + CFBD status |

### Pages with Content
| Page | Status |
|------|--------|
| `/` (homepage) | Has full UI but uses mock data |
| `/methodology` | Has real content (methodology-content.tsx) |
| All 18 pages | Placeholder shells (17-27 lines each) |
| `error.tsx` | Built (branded error boundary) |
| `loading.tsx` | Built (rankings skeleton) |
| `not-found.tsx` | Built (branded 404) |

---

## Phase 3: Validate GridRank (START HERE)

**Goal:** Run GridRank on 2024 data, verify output is sane.

### Step 1: Fix TypeScript errors
There are 3 pre-existing TS errors to fix before anything runs:
```
src/lib/gridrank/home-field.ts — `stadiumCapacity` not in Prisma Team type
prisma.config.ts — `directUrl` not in type
pg module — no declaration file (install @types/pg)
```
Run `npx tsc --noEmit` and fix all errors.

### Step 2: Run GridRank for 2024
```bash
npx tsx scripts/compute-gridrank.ts 2024
```
This should:
- Initialize all 682 teams at their level priors
- Process 3,742 games week by week
- Write ratings to the Ranking + TeamRanking tables

**Validation:** Query the top 25. For 2024, the top 10 should roughly be:
Ohio State, Oregon, Texas, Penn State, Notre Dame, Georgia, Tennessee, Boise State, Indiana, SMU
(based on actual CFP results). If a D3 team is #1, something is wrong.

### Step 3: Verify the API returns real data
```bash
curl http://localhost:3000/api/rankings?season=2024&limit=25
curl http://localhost:3000/api/teams/ohio-state
```

---

## Phase 4: Seed Historical Data + Backfill

**Goal:** Get 2014-2024 fully computed.

### Step 1: Seed games for 2014-2023
The `seed-games.ts` script works but was only run for 2024. Run it for each year:
```bash
for year in $(seq 2014 2023); do npx tsx scripts/seed-games.ts $year; done
```
**Note:** CFBD API rate limits — 500ms between calls. Use the rate limiter if hitting 429s.

### Step 2: Seed recruiting for all years
```bash
for year in $(seq 2014 2023); do npx tsx scripts/seed-recruiting.ts $year; done
```

### Step 3: Run the master backfill
```bash
npx tsx scripts/backfill-historical.ts 2014 2024
```
This runs GridRank → Chaos → Lab → Coaches → Awards for each season.

### Step 4: Compute program rankings (GridLegacy)
After backfill, aggregate ratings across all years for the `/programs` page.
Store in `ProgramRanking` table: average rating, peak rating, total weeks ranked, etc.

---

## Phase 5: Homepage Rankings (World-Class UI)

**Goal:** Replace mock data on homepage with real database results.

### What exists:
- `src/app/page.tsx` — 487 lines, full UI with mock data
- `src/lib/data/mock-rankings.ts` — 50 mock teams
- `src/components/ui/data-table.tsx` — responsive table component
- `src/components/charts/sparkline.tsx` — inline trend charts
- `src/components/ui/team-logo.tsx` — logo with fallback
- `src/lib/db/queries.ts` — `getRankings()` cached query helper

### Steps:
1. Replace mock data imports with server-side Prisma queries (use `queries.ts`)
2. Wire `DataTable` component into the rankings page
3. Add `Sparkline` component to each row (use rating history from TeamRanking)
4. Add filters: Level dropdown (FBS/FCS/D2/D3/NAIA/All), Conference dropdown, Search
5. Add sort toggles on column headers (rank, rating, change, conference)
6. Wire `TeamLogo` component with real DB logos/colors
7. Make each row clickable → navigate to `/team/[slug]`
8. Test mobile: should switch to card mode below 640px
9. Run Lighthouse — target 90+ performance score

---

## Phase 6: Team Pages + Conference Pages

### Team Page (`/team/[slug]`)
**Components to use:**
- `TeamLogo` for hero
- `RatingHistory` chart for rating over time
- `Sparkline` for inline trend
- `DataTable` for game log
- `StatTooltip` / `InfoTip` for stat explanations
- `Badge` for conference, level, record

**Data from:** `getTeamBySlug()`, `getTeamGames()`, `getTeamRatingHistory()` (all in `queries.ts`)

### Conference Page (`/conference/[slug]`)
- Power rankings table (teams in that conference, sorted by rating)
- Conference heatmap (win-loss matrix)
- Cross-conference performance stats

---

## Phase 7: Historical + GridLegacy + Methodology

### GridLegacy (`/programs`)
- Read from `ProgramRanking` table (computed in Phase 4)
- Use `DataTable` with columns: All-time rank, Team, Average Rating, Peak Rating, Seasons, Best Season
- Use `BumpChart` to show top 10 programs' rankings over the years

### Methodology (`/methodology`)
- Content already exists in `methodology-content.tsx`
- Just needs proper layout and the interactive formula visualizations

---

## Phase 8: Predictions + Matchup Machine + What If

### Predictions (`/predictions`)
- Run `compute-predictions.ts` for the current/upcoming week
- Display using `DataTable` with columns: Away team, Home team, Win Prob bar, Predicted Spread, Confidence
- Color-code by confidence level

### Matchup Machine (`/matchup`)
- Two team selector dropdowns (use `search.ts` fuzzy search)
- "Simulate" button → calls `/api/matchup` POST
- Display results using: `ScoreDistribution` chart, win probability bar, narrative text
- Use `MatchupSkeleton` while loading

### What If Engine (`/whatif`)
- Pick a completed game → toggle the winner
- Re-run GridRank with modified outcome → show ripple effects on rankings
- This requires calling `engine.ts` client-side or via API with modified game data

---

## Phase 9-14: Feature Pages

Each of these pages follows the same pattern:
1. Run the corresponding compute script to populate the DB table
2. Build the page using existing components (DataTable, charts, tooltips)
3. Call `queries.ts` helpers or API routes for data

| Phase | Page | DB Table | Compute Script | Key Components |
|-------|------|----------|---------------|----------------|
| 9 | `/pulse` | TeamSentiment | (needs Python service) | — |
| 10 | `/chaos` | ChaosGame | `compute-chaos.ts` | DataTable, Badge |
| 10 | `/lab` | PlayerOutlier, TeamAnomaly | `compute-lab.ts` | DataTable, charts |
| 11 | `/coaches` | CoachGrade, CoachDecision | `compute-coaches.ts` | DataTable, StatTooltip |
| 11 | `/awards` | AwardCandidate | `compute-awards.ts` | DataTable, Sparkline |
| 12 | `/roster` | Player, PlayerTransfer | (seed scripts exist) | DataTable |
| 13 | `/gauntlet` | (computed from games) | — | BumpChart, DataTable |
| 13 | `/rivalry/[slug]` | Rivalry, RivalryStat | — | RatingHistory |
| 13 | `/gameday` | (live from CFBD) | — | WPChart |
| 14 | `/stack` | WeeklyDigest | — | Newsletter template |

---

## Known Issues to Fix

1. **esbuild platform mismatch** — `node_modules` were installed on Windows. If running in a different OS, delete `node_modules` and `npm install` fresh.

2. **Prisma type errors:**
   - `home-field.ts` references `stadiumCapacity` which isn't on the Team model → add to schema or remove
   - `prisma.config.ts` has `directUrl` that may not be in the Prisma 7 type → check docs
   - `pg` module needs `@types/pg` → `npm install -D @types/pg`

3. **Supabase connection:** Must use session pooler (port 5432), NOT direct connection (port 6543). The direct connection resolves to IPv6 which may not work on all networks. Connection string format:
   ```
   postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```

4. **CFBD API limits:** Free tier = 1,000 calls/month. Seeding 10 years of games = ~100+ calls. Budget carefully or upgrade to Tier 2 ($5/mo, 25K calls).

5. **Extra doc files to clean up:** Several `.md` and `.txt` files in the project root created by subagents:
   - `MONTE_CARLO_QUICK_REFERENCE.md`, `ASSET_QUICK_REFERENCE.md`, `FAVICON_AND_OG_IMAGES.md`, `STRUCTURED_DATA_README.md`
   - Various docs in `src/lib/` subdirectories (README.md, GUIDE.md, etc.)
   - These are internal reference only — feel free to delete or move to `docs/`.

---

## File Map — Quick Reference

```
ENGINES:
  src/lib/gridrank/engine.ts          ← Glicko-2 hybrid rating system
  src/lib/gridrank/preseason.ts       ← Preseason prior computation
  src/lib/gridrank/home-field.ts      ← Dynamic HFA calculator
  src/lib/gridrank/garbage-time.ts    ← Garbage time filter
  src/lib/chaos/chaos-score.ts        ← 8-component chaos scoring
  src/lib/matchup/monte-carlo.ts      ← Dual-model Monte Carlo sim
  src/lib/win-probability/model.ts    ← Logistic regression WP model
  src/lib/coaches/fourth-down.ts      ← 4th-down EPA decision model
  src/lib/coaches/grading.ts          ← 5-category coach grading
  src/lib/lab/player-outliers.ts      ← Z-score outlier detection
  src/lib/lab/team-anomalies.ts       ← PCA/K-Means clustering
  src/lib/awards/prediction.ts        ← 10-award probability model

DATA LAYER:
  src/lib/db/cache.ts                 ← Redis caching abstraction
  src/lib/db/queries.ts               ← Cached Prisma query helpers
  src/lib/db/prisma.ts                ← Prisma client singleton
  src/lib/db/redis.ts                 ← Upstash Redis client
  src/lib/cfbd/client.ts              ← CFBD API v2 typed client
  src/lib/cfbd/rate-limiter.ts        ← Rate limiter + circuit breaker
  src/lib/data/transforms.ts          ← Raw → Engine → API transforms

UI COMPONENTS:
  src/components/ui/data-table.tsx     ← Responsive table (use this for ALL tables)
  src/components/ui/team-logo.tsx      ← Logo component with 3-tier fallback
  src/components/ui/tooltip.tsx        ← Tooltip + StatTooltip + InfoTip
  src/components/ui/skeleton.tsx       ← Shimmer skeleton primitives
  src/components/ui/error-state.tsx    ← Error states
  src/components/charts/sparkline.tsx  ← Inline SVG sparkline (rankings rows)
  src/components/charts/wp-chart.tsx   ← Win probability chart (gameday)
  src/components/charts/rating-history.tsx ← Rating over time (team pages)
  src/components/charts/score-distribution.tsx ← MC histogram (matchup)
  src/components/charts/bump-chart.tsx ← Rank evolution (programs/gauntlet)

UTILITIES:
  src/lib/utils/formatting.ts         ← formatRating(), formatSpread(), formatOrdinal(), etc.
  src/lib/utils/search.ts             ← createSearchIndex(), searchTeams()
  src/lib/utils/validation.ts         ← Zod schemas for API inputs
  src/lib/utils/animations.ts         ← Framer Motion presets
  src/lib/utils/og-image.ts           ← OG image SVG generators
  src/lib/utils/structured-data.ts    ← JSON-LD for SEO

SCRIPTS:
  scripts/seed-teams.ts               ← CFBD → teams table (RUN FIRST)
  scripts/seed-games.ts               ← CFBD → games table (per year)
  scripts/seed-recruiting.ts          ← CFBD → players table (per year)
  scripts/compute-gridrank.ts         ← Run GridRank for a season
  scripts/compute-chaos.ts            ← Run Chaos Score for a season
  scripts/compute-coaches.ts          ← Run coach grading for a season
  scripts/compute-lab.ts              ← Run outlier/anomaly detection
  scripts/compute-awards.ts           ← Run award predictions
  scripts/compute-predictions.ts      ← Run game predictions
  scripts/backfill-historical.ts      ← Master script: runs everything 2014-2024
```

---

## Priority Order

If you can only do a few things, do them in this order:

1. **Fix TS errors** → `npx tsc --noEmit` should pass
2. **Run GridRank 2024** → `npx tsx scripts/compute-gridrank.ts 2024`
3. **Verify top 25 makes sense** → query DB, check rankings
4. **Wire homepage to real data** → replace mock imports with queries.ts
5. **Build team page** → most linked-to page, highest value
6. **Seed + backfill historical** → enables GridLegacy, trends, sparklines
7. **Build remaining feature pages** → one at a time, each is self-contained
