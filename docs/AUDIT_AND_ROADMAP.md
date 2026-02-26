# Gridiron Intel — Full Codebase Audit & World-Class UX Roadmap

> **Date:** February 24, 2026
> **Auditor:** Claude (comprehensive review of every file in the codebase)
> **Purpose:** Give Claude Code a precise, actionable guide to take this project from scaffold to world-class.

---

## TL;DR

The foundation is excellent — the schema, design tokens, and architecture are production-quality. But 17 of 18 pages are empty stubs, there's no navigation, no data in the database, and the GridRank algorithm hasn't been validated. This document tells Claude Code exactly what to build, in what order, and how to make each piece world-class.

---

## PART 1: CRITICAL FIXES (Do These First, Every Session)

### 1.1 Restore Google Fonts in `layout.tsx`

The Google Font imports were removed because they can't be fetched in an offline sandbox. **Restore them immediately** when working in an environment with network access:

```tsx
import { Instrument_Serif, DM_Sans, Courier_Prime } from "next/font/google";
```

Without these, the entire editorial feel of the design system is lost. Instrument Serif for headlines is the single most important visual differentiator.

### 1.2 Remove `ignoreBuildErrors` from `next.config.ts`

Currently set to `true` as a workaround. Fix the actual TypeScript errors instead:

- `src/lib/gridrank/home-field.ts:324` — `stadiumCapacity` doesn't exist on the query result. Add it to the Prisma `select` or use `metadata` field.
- `src/lib/data/team-colors.ts` — duplicate keys were cleaned up, verify no more remain.
- `scripts/compute-gridrank.ts` — multiple type mismatches (Decimal vs number, missing `sportId` on ranking create). These scripts should have their own `tsconfig.scripts.json` with relaxed rules, or fix the types properly.

### 1.3 Re-include `scripts` in `tsconfig.json`

Currently excluded. Better to fix the actual type errors in scripts than hide them.

### 1.4 Fix Duplicate `formatRating()` Function

Exists in both `src/lib/gridrank/engine.ts` and `src/lib/utils/formatting.ts`. Rename one (e.g., `formatGridRating` in engine.ts) to avoid import confusion.

---

## PART 2: NAVIGATION & LAYOUT (The #1 UX Gap)

### The Problem

There is literally no way to navigate the app. The layout.tsx has comments saying "Navbar will be added here" and "Footer will be added here." This is the single biggest blocker to any kind of usable experience.

### What to Build: `src/components/layout/navbar.tsx`

**Design spec:**

- Fixed top nav, dark (`bg-secondary`), 64px height
- Left: "GRIDIRON INTEL" wordmark in Instrument Serif, "GRID" in white, "IRON INTEL" in teal
- Center/Right: Navigation links grouped by category
- Mobile: Hamburger → full-screen overlay with all 18 features organized by category
- Active page indicator: teal bottom border on current route
- Subtle blur backdrop (`backdrop-blur-sm`) when scrolling

**Navigation grouping:**

```
Rankings    | GridRank (/) · GridLegacy (/programs) · The Gauntlet (/gauntlet)
Analysis    | Predictions (/predictions) · Matchup Machine (/matchup) · What If (/whatif)
Intelligence| Coach Intel (/coaches) · Awards (/awards) · Roster Intel (/roster)
Culture     | Chaos Index (/chaos) · The Lab (/lab) · Pulse (/pulse)
Live        | Gameday (/gameday) · The Stack (/stack)
Reference   | Methodology (/methodology) · Conference Pages · Rivalry Pages
```

**Key UX details:**

- Use `"use client"` — needs `usePathname()` for active state
- Dropdown menus on desktop (hover-triggered, 200ms delay before close)
- Search bar (even if it just shows "Coming soon" initially) — users expect this
- Season selector dropdown (top-right) showing "2025 Season"

### What to Build: `src/components/layout/footer.tsx`

- Minimal: Links to Methodology, About, Twitter/X, GitHub
- "Built with obsessive attention to college football" tagline
- "Data from CollegeFootballData.com" attribution (required by their API terms)

### Wire into `layout.tsx`

```tsx
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

// In the body:
<Navbar />
<main className="min-h-screen pt-16">{children}</main>
<Footer />
```

---

## PART 3: DATA SEEDING (Phase 2 — The Gate to Everything)

### Priority Order

1. **`scripts/seed-teams.ts`** — Fetch all teams from CFBD, create Level records (FBS/FCS/D2/D3/NAIA), Conference records, and Team records. Map team colors from `src/lib/data/team-colors.ts`.
2. **`scripts/seed-games.ts`** — Fetch game results for 2014–2025 seasons. Store in `Game` table with scores, venue, week, etc.
3. **`scripts/seed-recruiting.ts`** — Fetch recruiting rankings and player ratings. Store in `Player` table.
4. **`scripts/compute-gridrank.ts`** — Run the Glicko-2 hybrid for each season week-by-week. Store results in `Ranking` and `TeamRanking` tables.

### Validation Checkpoint

After computing GridRank for 2024 season, compare top 25 against AP/CFP final rankings. If correlation is < 0.8, the algorithm needs tuning. Specifically check:

- Are FBS teams correctly ranked above FCS?
- Is margin of victory compressing correctly (blowouts shouldn't be worth 3x a close win)?
- Does the preseason prior decay correctly (Week 1 vs Week 12)?
- Are garbage time filters working (check Alabama blowouts — late TDs shouldn't inflate opponents)?

---

## PART 4: PAGE-BY-PAGE UX SPECIFICATIONS

### 4.1 Homepage Rankings (`/`) — Currently Partial, Make World-Class

**What exists:** Hero section, rankings table with team color stripes, sparklines, empty state.

**What's missing for world-class:**

- **Filter bar** above table: Division toggle (FBS / FCS / D2 / D3 / NAIA / All), Conference dropdown, Search by team name
- **Column sorting** — click any header to sort by that column
- **Expandable rows** — click a team row to see: last 5 game results (mini score display), rating history sparkline (full season), strength of schedule rating, next game prediction
- **Pagination or virtual scroll** — showing 1,247 teams needs virtualization (use `react-window` or intersection observer for infinite scroll)
- **"Top Movers" sidebar** — Top 5 risers and fallers this week, shown as a card beside the table on desktop, above on mobile
- **Week selector** — Dropdown or slider to see rankings for any week of the season
- **Animation** — Framer Motion `layout` animation on rows when sorting/filtering changes (rows slide to new positions)

**Sparkline upgrade:**
The current `MiniSparkline` component only shows 2 data points. It needs the full season history (12–15 weeks). Store weekly rating snapshots in the database and pass them as `history` prop. The sparkline should show the full trajectory from Week 1 to current.

### 4.2 Team Pages (`/team/[slug]`) — Currently a Stub

**This is where users will spend 60%+ of their time.** It must be the most polished page.

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  HERO: Team color gradient backdrop             │
│  Team name (Instrument Serif, 4xl)              │
│  Conference · Level · Record (W-L)              │
│  GridRank: #4 (1523 ± 47)  ▲3 from last week   │
│  [Sparkline: full season rating trajectory]     │
└─────────────────────────────────────────────────┘
┌──────────────┬──────────────┬───────────────────┐
│ Rating       │ Offense      │ Defense           │
│ 1523 ± 47   │ 34.2 ppg     │ 18.1 ppg allowed  │
│ #4 overall   │ #12 FBS      │ #7 FBS            │
└──────────────┴──────────────┴───────────────────┘
┌─────────────────────────────────────────────────┐
│  TABS: Schedule │ Stats │ History │ Roster       │
├─────────────────────────────────────────────────┤
│  Schedule tab:                                  │
│  Week 1: vs Oklahoma  W 35-21  (+12.3 rating)  │
│  Week 2: @ Alabama    L 24-28  (-8.7 rating)   │
│  ... color-coded W/L, opponent rank, MOV        │
│  Upcoming: vs Georgia (68% win prob)            │
└─────────────────────────────────────────────────┘
```

**Key UX details:**

- Hero background: Use team `primaryColor` as a gradient (`from-[teamColor]/20 to-bg-primary`)
- Left border accent stripe in team color (3px) on all cards
- Historical chart (D3.js): Rating over time (2014–present) with season boundaries marked
- Opponent logos or abbreviations in schedule view
- Compare button: "Compare with..." opens matchup machine pre-filled

### 4.3 Chaos Index (`/chaos`) — The Fun Page

**Design philosophy:** This should feel chaotic. Use the pink accent color (`accent-chaos`) liberally. This is the page people share on social media.

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  "CHAOS INDEX" in huge Instrument Serif         │
│  Animated chaos score meter (think speedometer) │
│  This week's Chaos Score: 87/100                │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  TOP UPSETS THIS WEEK (cards with glow-chaos)   │
│  ┌────────────────────┐ ┌────────────────────┐  │
│  │ #3 Alabama LOST to │ │ #15 Oregon LOST to │  │
│  │ Vanderbilt 28-40   │ │ Washington 17-20   │  │
│  │ Chaos: 94/100      │ │ Chaos: 78/100      │  │
│  │ 6-component radar  │ │ 6-component radar  │  │
│  └────────────────────┘ └────────────────────┘  │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  CHAOS TIMELINE: D3 heatmap calendar of the     │
│  entire season, colored by chaos score per week  │
└─────────────────────────────────────────────────┘
```

**6-component radar chart** (per game): Rank disparity, spread deviation, comeback magnitude, rivalry intensity, playoff implications, historical rarity. Use D3.js for the radar.

### 4.4 Matchup Machine (`/matchup`) — The Interactive Page

**Layout:**

```
┌────────────────┐   VS   ┌────────────────┐
│ Select Team A  │        │ Select Team B  │
│ [Searchable    │        │ [Searchable    │
│  dropdown]     │        │  dropdown]     │
│                │        │                │
│ Ohio State     │        │ Michigan       │
│ #2 (1547 ± 42) │       │ #7 (1489 ± 51) │
└────────────────┘        └────────────────┘

┌─────────────────────────────────────────────────┐
│ SIMULATE (10,000 runs)                          │
│ ████████████████████░░░░░░░  Ohio State 68.4%   │
│ Predicted Score: 28-21                          │
│ Confidence: 68.4% (±8.2%)                       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Score Distribution Histogram (D3)              │
│  Key Matchup Factors (offense vs defense radar) │
│  Historical H2H record                          │
│  "The Narrative" — AI-generated analysis        │
└─────────────────────────────────────────────────┘
```

**Key UX:** Searchable team selector with typeahead, team logos, instant simulation on selection change (debounced 300ms). The score distribution histogram is the signature visualization — show the full Monte Carlo distribution as a smooth curve.

### 4.5 Methodology (`/methodology`) — The Trust Page

**Two modes:**

1. **Casual mode** (default): 5 simple paragraphs with diagrams explaining GridRank at a high level. Use analogies. "Think of it like a chess rating, but for football teams."
2. **Deep dive mode** (toggle): Full mathematical specification with formulas, LaTeX-rendered equations, code snippets showing the actual algorithm, and interactive sliders where users can adjust parameters and see how rankings change.

**This page is crucial for credibility.** If someone questions the rankings, they should be able to read this page and understand why team X is ranked where they are.

### 4.6 Coach Intelligence (`/coaches`) — The Analytics Page

**Key feature: 4th Down Decision Calculator**

Interactive tool where users input: field position, yards to go, score differential, time remaining. Shows the "correct" decision (go for it / punt / field goal) based on expected points model, then grades the coach's actual decision.

**Coaching grades table:** A-F grades per coach based on: 4th down accuracy, timeout usage, challenge efficiency, clock management score.

### 4.7 All Other Pages

Each stub page needs the same treatment: hero section, data-driven content, proper loading states, error boundaries. Refer to `docs/MASTER_PLAN.md` for the full spec of each feature. The key principle: **every page should have at least one "signature visualization"** — a chart or interactive element that's unique to that feature and worth sharing on social media.

---

## PART 5: COMPONENT LIBRARY GAPS

### Components That Need to Be Built

| Component | Location | Purpose | Complexity |
|-----------|----------|---------|------------|
| `Navbar` | `components/layout/navbar.tsx` | Global navigation | Medium |
| `Footer` | `components/layout/footer.tsx` | Global footer | Low |
| `TeamSelector` | `components/ui/team-selector.tsx` | Searchable team dropdown | Medium |
| `RankingsFilter` | `components/rankings/filter.tsx` | Division/conference/search filters | Medium |
| `ExpandableRow` | `components/rankings/expandable-row.tsx` | Click-to-expand table row | Medium |
| `RadarChart` | `components/charts/radar-chart.tsx` | D3 radar chart (chaos, matchup) | High |
| `RatingChart` | `components/charts/rating-chart.tsx` | D3 line chart for rating history | High |
| `ScoreDistribution` | `components/charts/score-distribution.tsx` | D3 histogram for matchup | High |
| `HeatmapCalendar` | `components/charts/heatmap-calendar.tsx` | D3 calendar heatmap (chaos) | High |
| `WinProbChart` | `components/charts/win-prob-chart.tsx` | Recharts real-time WP line | Medium |
| `GameCard` | `components/ui/game-card.tsx` | Compact game result display | Low |
| `TeamHero` | `components/team/hero.tsx` | Team page hero with colors | Medium |
| `StatGrid` | `components/ui/stat-grid.tsx` | 3-4 column stat display | Low |
| `TabNav` | `components/ui/tab-nav.tsx` | Tab navigation (team page) | Low |
| `Skeleton` | `components/ui/skeleton.tsx` | Loading skeleton primitives | Low |
| `ChaosScoreMeter` | `components/chaos/score-meter.tsx` | Animated gauge visualization | High |
| `CoachGradeCard` | `components/coaches/grade-card.tsx` | Coach grade display (A-F) | Low |
| `UpsetCard` | `components/chaos/upset-card.tsx` | Chaos game highlight card | Medium |
| `WeekSelector` | `components/ui/week-selector.tsx` | Week picker for rankings | Low |
| `SeasonSelector` | `components/ui/season-selector.tsx` | Season picker (2014-2025) | Low |

### Component Design Principles

1. **Server Components by default.** Only add `"use client"` when you need `onClick`, `useState`, or `useEffect`.
2. **Framer Motion everywhere.** Wrap cards in `motion.div` with `initial={{ opacity: 0, y: 20 }}`, `animate={{ opacity: 1, y: 0 }}`, stagger children by 50ms.
3. **Monospace for all numbers.** Use `font-mono` class (maps to Courier Prime) on any numerical data.
4. **Team color accents.** Every component that shows a team should have a subtle color accent — left border stripe, gradient background, or colored dot.
5. **Ambient glow on key data.** Use `glow-teal` class on the most important number on each page (e.g., the GridRank rating on team pages).
6. **No emoji.** Use Lucide icons exclusively.

---

## PART 6: PERFORMANCE & TECHNICAL EXCELLENCE

### Loading States (`loading.tsx`)

Every page needs a `loading.tsx` with skeleton UI that matches the page layout. Use the same card/grid structure as the actual page, but with animated pulse blocks. This makes the perceived load time feel much faster.

```tsx
// Example: src/app/loading.tsx
export default function Loading() {
  return (
    <div className="min-h-screen">
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="h-12 w-48 bg-bg-elevated rounded animate-pulse mb-4" />
        <div className="h-6 w-96 bg-bg-elevated rounded animate-pulse mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-14 bg-bg-card rounded-lg animate-pulse" />
          ))}
        </div>
      </section>
    </div>
  );
}
```

### Error Boundaries (`error.tsx`)

Every page needs an `error.tsx` that:
- Shows a branded error state (not a blank white page)
- Has a "Try Again" button that calls `reset()`
- Logs the error for debugging
- Shows a helpful message ("Rankings are temporarily unavailable")

### ISR Strategy

| Page | Revalidation | Reason |
|------|-------------|--------|
| `/` (Rankings) | 3600s (1 hour) | Rankings update weekly |
| `/team/[slug]` | 3600s | Team data changes weekly |
| `/predictions` | 1800s (30 min) | Predictions may update more frequently |
| `/chaos` | 3600s | Chaos scores update weekly |
| `/gameday` | 60s | Live data during games, SSR during off-season |
| `/methodology` | 86400s (1 day) | Static content |
| All others | 3600s | Reasonable default |

### Database Query Optimization

The preseason calculation in `src/lib/gridrank/preseason.ts` has N+1 query issues. Each team triggers separate queries for recruiting, returning production, and coach history. Refactor to:

1. Batch-fetch all recruiting data for the season in one query
2. Batch-fetch all player stats in one query
3. Use Prisma's `include` and `select` to reduce payload size
4. Cache computed priors in Redis (they don't change within a season)

### CFBD Rate Limiting

The current retry logic in `src/lib/cfbd/client.ts` has no max retry count — it could loop forever if the API keeps returning 429. Add:

```typescript
const MAX_RETRIES = 3;
let retries = 0;

if (response.status === 429) {
  if (retries >= MAX_RETRIES) throw new Error("CFBD rate limit exceeded after retries");
  retries++;
  await new Promise(r => setTimeout(r, 60000 * retries)); // Exponential backoff
  return cfbdFetch<T>(endpoint, params, retries);
}
```

---

## PART 7: ACCESSIBILITY CHECKLIST

Before launch, every page must pass:

- [ ] **Color contrast:** Verify `accent-teal` (#00f5d4) on `bg-primary` (#0a0e17) meets WCAG AA (4.5:1 ratio). It likely does (high luminance teal on dark navy), but verify with a contrast checker.
- [ ] **Keyboard navigation:** All interactive elements reachable via Tab. Focus rings visible (already styled in Button component).
- [ ] **Screen reader support:** Add `aria-label` to icon-only buttons, `role="table"` with proper `scope` on ranking tables, `alt` text on any images/logos.
- [ ] **Reduced motion:** Respect `prefers-reduced-motion` by wrapping Framer Motion animations in a check. Add to globals.css:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
  ```
- [ ] **Semantic HTML:** Use `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>` appropriately. Rankings table should be a real `<table>` (it already is — good).
- [ ] **Skip to content link:** Add a hidden "Skip to main content" link at the top of the layout.

---

## PART 8: MOBILE UX PRIORITIES

College football fans check rankings on their phones constantly. Mobile must be excellent.

- **Rankings table on mobile:** Hide Conference and Trend columns. Show: Rank, Team Name, Rating, Change. Make rows tappable to expand.
- **Swipeable cards** for team pages: Swipe between Schedule, Stats, History tabs.
- **Bottom sheet navigation** instead of dropdown menus on mobile.
- **Touch-friendly tap targets:** Minimum 44x44px for all interactive elements.
- **Offline support (future):** Service worker to cache rankings data so fans can check rankings with no signal at the stadium.

---

## PART 9: RECOMMENDED BUILD ORDER

For Claude Code sessions going forward, tackle these in order:

### Phase 2A: Data Foundation (Next 2-3 sessions)
1. Implement `seed-teams.ts` — Fetch and store all teams from CFBD
2. Implement `seed-games.ts` — Fetch game results 2014–2025
3. Implement `seed-recruiting.ts` — Fetch recruiting data
4. Run `compute-gridrank.ts` and validate output

### Phase 2B: Navigation & Core UI (Next 1-2 sessions)
5. Build Navbar component
6. Build Footer component
7. Wire into layout.tsx
8. Add `loading.tsx` and `error.tsx` to all pages
9. Restore Google Fonts

### Phase 3: Homepage Rankings (Next 1-2 sessions)
10. Rankings filter bar (division, conference, search)
11. Expandable rows with game details
12. Sparklines with full season history
13. Week selector
14. Top Movers sidebar
15. Framer Motion animations on rows

### Phase 4: Team Pages (Next 2-3 sessions)
16. Team hero with dynamic colors
17. Stats grid component
18. Schedule tab with game results
19. Rating history chart (D3)
20. Tab navigation

### Phase 5: Feature Pages (3-5 sessions)
21. Methodology page (both modes)
22. Chaos Index with visualizations
23. Matchup Machine with Monte Carlo
24. Predictions page
25. Conference pages

### Phase 6: Advanced Features (3-5 sessions)
26. Coach Intelligence + 4th Down Calculator
27. Awards Tracker
28. What If Engine
29. Gameday Dashboard
30. Roster Intelligence
31. The Gauntlet (SOS)

### Phase 7: Polish & Launch (2-3 sessions)
32. The Stack (newsletter)
33. Rivalry pages
34. SEO optimization (meta tags, structured data, sitemap)
35. Performance profiling and optimization
36. Accessibility audit
37. Mobile testing and refinement

---

## PART 10: WHAT "WORLD-CLASS" LOOKS LIKE

The goal is "Bloomberg Terminal meets ESPN." That means:

1. **Information density without clutter.** Every pixel should communicate data. But use whitespace, typography hierarchy, and color coding to make it scannable, not overwhelming.

2. **Instant perceived performance.** Skeleton loading states, optimistic updates, ISR for near-instant page loads. The site should feel faster than ESPN.

3. **Signature visualizations.** Each feature page needs one visualization that's unique, beautiful, and worth sharing. The Chaos Index heatmap. The Matchup Machine score distribution. The GridRank sparkline matrix. These are what make people tweet about the site.

4. **Editorial voice.** The typography (Instrument Serif) gives it a New York Times sports section feel. Lean into that. Headlines should feel authoritative. Data should feel precise (monospace numbers, ± confidence intervals).

5. **Delight in details.** Team color accents on every row. Ambient glow on key numbers. Smooth animations on state changes. The teal pulse on the live indicator. These micro-interactions are what separate good from world-class.

6. **Mobile-first thinking.** Test every page at 375px width. If a visualization doesn't work on mobile, replace it with a simplified version, don't just hide it.

7. **Trust through transparency.** The Methodology page is the foundation of credibility. If someone disagrees with a ranking, they should be able to understand exactly why the algorithm ranked their team where it did. Show the math, show the inputs, show the confidence interval.

---

*This document should be referenced at the start of every Claude Code session alongside CLAUDE.md and MASTER_PLAN.md.*
