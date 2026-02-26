# Gridiron Intel Chart Components

Reusable, high-performance chart wrapper components for Gridiron Intel. All components integrate the brand design system (dark theme, Courier Prime typography, teal/purple/chaos accents) and are optimized for performance.

## Components Overview

### 1. Sparkline (SVG-based, ultra-lightweight)

**Use Case:** Inline trend charts in rankings tables, team cards (renders 100+ times).

**Features:**
- Ultra-lightweight SVG rendering
- Auto-trend detection (green ↑ / red ↓ / teal →)
- Optional area fill under line
- Optional end-point dot
- Default size: 80x24px (customizable)

**Example:**

```tsx
import { Sparkline } from "@/components/charts";

export function RankingRow({ team }) {
  return (
    <tr>
      <td>{team.name}</td>
      <td>
        <Sparkline
          data={[1520, 1535, 1542, 1539, 1545, 1548]}
          color="var(--accent-teal)"
          showDot
          showArea
        />
      </td>
    </tr>
  );
}
```

**Props:**

```ts
interface SparklineProps {
  data: number[];                    // Array of values to plot
  width?: number;                    // Default 80
  height?: number;                   // Default 24
  color?: string;                    // CSS color (defaults to trend)
  trend?: "up" | "down" | "neutral"; // Override auto-detection
  fill?: boolean;                    // Fill area under line
  showDots?: boolean;                // Show dot on last point
  strokeWidth?: number;              // Default 1.5
  className?: string;
}
```

---

### 2. WPChart (Win Probability - Recharts Area Chart)

**Use Case:** Gameday Dashboard, team game pages, live game tracking.

**Features:**
- Home team WP (0-100%) on Y-axis
- Color-coded areas: home color above 50%, away color below
- 50% reference line (even odds)
- Key play markers (vertical dashed lines)
- Interactive tooltips with WP + description
- Smooth Recharts animation

**Example:**

```tsx
import { WPChart } from "@/components/charts";

const plays = [
  { playNumber: 1, homeWP: 0.5, description: "Opening kickoff" },
  { playNumber: 45, homeWP: 0.65, isKeyPlay: true, description: "TD pass" },
  { playNumber: 89, homeWP: 0.78, isKeyPlay: true, description: "Interception" },
];

export function GamePage() {
  return (
    <WPChart
      plays={plays}
      homeTeam="Ohio State"
      awayTeam="Michigan"
      homeColor="#00a854"
      awayColor="#ff6b6b"
      height={300}
      showKeyPlays
      interactive
    />
  );
}
```

**Props:**

```ts
interface WPChartProps {
  plays: Array<{
    playNumber: number;
    homeWP: number;           // 0-1
    description?: string;
    isKeyPlay?: boolean;
  }>;
  homeTeam: string;
  awayTeam: string;
  homeColor?: string;         // Team primary color
  awayColor?: string;
  height?: number;            // Default 300
  showKeyPlays?: boolean;     // Default true
  interactive?: boolean;      // Default true
  className?: string;
}
```

---

### 3. RatingHistory (Recharts Line + Area)

**Use Case:** Team detail pages, historical comparisons, rating evolution.

**Features:**
- Main line: team rating over time
- Confidence band: ±RD (rating deviation) shaded area
- Auto-scaled Y-axis with padding
- Grid lines (horizontal)
- Interactive tooltips: "Week 3: 1523 ± 47"
- Smooth animations

**Example:**

```tsx
import { RatingHistory } from "@/components/charts";

const ratingData = [
  { label: "Week 1", rating: 1520, rd: 35 },
  { label: "Week 2", rating: 1535, rd: 32 },
  { label: "Week 3", rating: 1542, rd: 28 },
  { label: "Week 4", rating: 1539, rd: 26 },
];

export function TeamDetailPage() {
  return (
    <RatingHistory
      data={ratingData}
      height={250}
      showConfidence
      color="var(--accent-teal)"
      interactive
    />
  );
}
```

**Props:**

```ts
interface RatingHistoryProps {
  data: Array<{
    label: string;    // "Week 1", "2023", etc.
    rating: number;
    rd?: number;      // Rating deviation for confidence band
  }>;
  height?: number;              // Default 250
  showConfidence?: boolean;     // Default true
  showGrid?: boolean;           // Default true
  color?: string;               // Default accent teal
  interactive?: boolean;        // Default true
  minRating?: number;           // Auto if omitted
  maxRating?: number;           // Auto if omitted
  className?: string;
}
```

---

### 4. ScoreDistribution (Recharts Bar Chart)

**Use Case:** Matchup Machine, Monte Carlo simulation results, spread predictions.

**Features:**
- Histogram of simulation outcomes
- Bars colored by which team wins
- Center bar for toss-ups (muted color)
- Highlights most likely outcome (higher opacity)
- X-axis: spread ranges ("A by 14-17")
- Y-axis: percentage
- Tooltip: "A by 14-17: 12.3% (1,230 sims)"

**Example:**

```tsx
import { ScoreDistribution } from "@/components/charts";

const results = [
  { range: "Alabama by 21+", percentage: 8.5, count: 850 },
  { range: "Alabama by 14-20", percentage: 12.3, count: 1230 },
  { range: "Alabama by 7-13", percentage: 18.7, count: 1870 },
  { range: "Alabama by 1-6", percentage: 22.1, count: 2210 },
  { range: "Toss-up", percentage: 15.2, count: 1520 },
  { range: "Other team by 1-6", percentage: 14.8, count: 1480 },
  { range: "Other team by 7-13", percentage: 5.4, count: 540 },
  { range: "Other team by 14+", percentage: 3.0, count: 300 },
];

export function MatchupMachine() {
  return (
    <ScoreDistribution
      buckets={results}
      teamAName="Alabama"
      teamBName="Other team"
      teamAColor="var(--accent-teal)"
      teamBColor="var(--accent-chaos)"
      height={200}
    />
  );
}
```

**Props:**

```ts
interface ScoreDistributionProps {
  buckets: Array<{
    range: string;        // "A by 14-17"
    percentage: number;   // 0-100
    count: number;
  }>;
  teamAName: string;
  teamBName: string;
  teamAColor?: string;
  teamBColor?: string;
  height?: number;        // Default 200
  className?: string;
}
```

---

### 5. BumpChart (D3-based Rank Evolution)

**Use Case:** Signature visualization for rankings over weeks, multi-team comparisons.

**Features:**
- Smooth curves (D3 cardinal interpolation) for each team
- Y-axis inverted: rank 1 at top
- Hover effects: dim non-hovered lines (20% opacity)
- Circles at data points (hidden until hover)
- Labels on right: team name + current rank
- Stroke-dasharray animation on mount
- Fully interactive with D3 + React

**Example:**

```tsx
import { BumpChart } from "@/components/charts";

const rankingData = [
  {
    team: "Ohio State",
    color: "#00a854",
    ranks: [
      { week: 1, rank: 3 },
      { week: 2, rank: 2 },
      { week: 3, rank: 1 },
      { week: 4, rank: 1 },
    ],
  },
  {
    team: "Michigan",
    color: "#ff6b6b",
    ranks: [
      { week: 1, rank: 5 },
      { week: 2, rank: 4 },
      { week: 3, rank: 3 },
      { week: 4, rank: 2 },
    ],
  },
];

export function SeasonEvolution() {
  return (
    <BumpChart
      data={rankingData}
      weeks={[1, 2, 3, 4]}
      maxRank={25}
      height={400}
      interactive
      showLabels
    />
  );
}
```

**Props:**

```ts
interface BumpChartProps {
  data: Array<{
    team: string;
    color: string;
    ranks: Array<{ week: number; rank: number }>;
  }>;
  weeks: number[];          // [1, 2, 3, ..., 14]
  maxRank?: number;         // Default 25
  height?: number;          // Default 400
  interactive?: boolean;    // Default true
  showLabels?: boolean;     // Default true
  className?: string;
}
```

---

## Design System Integration

All components use centralized constants from `./constants.ts`:

```ts
CHART_COLORS = {
  grid: 'rgba(255, 255, 255, 0.06)',
  axis: '#475569',
  tooltip: {
    bg: '#242937',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#f1f5f9',
  },
  positive: '#34d399',   // Green
  negative: '#f87171',   // Red
  teal: '#00f5d4',       // Brand primary
  purple: '#7b61ff',     // Brand secondary
  chaos: '#f472b6',      // Upset/chaos indicator
  warning: '#fbbf24',    // Amber
  muted: '#475569',
};

CHART_FONTS = {
  label: "'DM Sans', sans-serif",
  value: "'Courier Prime', monospace",
};
```

---

## Performance Notes

### Sparkline
- **Renders 100+** times on rankings page without performance degradation
- Pure SVG (no DOM overhead)
- Memoization-friendly (no internal state)

### Recharts Components (WPChart, RatingHistory, ScoreDistribution)
- Built on Recharts with `isAnimationActive={true}` for smooth 800ms transitions
- Respects reduced-motion preferences via CSS
- Responsive containers auto-scale to parent width

### BumpChart
- D3-based with manual DOM manipulation
- Use `useRef` + `useEffect` pattern (no re-render on state change)
- Optimized for ~5-15 teams max (use pagination for more)

---

## Integration Checklist

When adding these to pages:

1. **Import from `/components/charts`** — use the barrel export:
   ```tsx
   import { Sparkline, WPChart, RatingHistory, ScoreDistribution, BumpChart } from "@/components/charts";
   ```

2. **Pass data in correct format** — see examples above

3. **Customize colors** — pass `color`, `homeColor`, `awayColor` props or use CSS variables:
   ```tsx
   color="var(--accent-teal)"  // or hex: "#00f5d4"
   ```

4. **Set height/dimensions** — all components are responsive but need explicit height:
   ```tsx
   height={300}  // pixels
   ```

5. **Add className for layout** — Tailwind CSS for composability:
   ```tsx
   className="mb-6 rounded-lg"
   ```

---

## Accessibility

- All components respect `prefers-reduced-motion` (via CSS)
- SVG elements have `aria-hidden="true"` (decorative)
- Tooltips are keyboard-accessible (interactive components)
- Color is never the only indicator (use text labels)

---

## Future Enhancements

- [ ] Tooltip positioning (smart edge detection)
- [ ] Comparative mode (overlay multiple teams on RatingHistory)
- [ ] Export to PNG/SVG (D3 charts)
- [ ] Dark mode toggle (future light theme support)
- [ ] Custom animation duration per component
