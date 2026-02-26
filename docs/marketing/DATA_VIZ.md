# Data Visualization Specifications

> Read this before generating charts, stat cards, or social graphics.

## Design System Colors (from `src/app/globals.css`)

All visualizations must use the project's established dark-mode design system. Do NOT use Forest Green/Gold/Cream or any light-mode palette.

### On-Site Charts & Embeds (Dark Mode)
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | #0a0e17 | Chart backgrounds |
| `--bg-card` | #1a1f2e | Card/panel backgrounds |
| `--bg-elevated` | #242937 | Hover states, tooltips |
| `--accent-teal` | #00f5d4 | Primary data color, brand accent |
| `--accent-purple` | #7b61ff | Secondary data color |
| `--accent-chaos` | #f472b6 | Chaos/upset elements |
| `--accent-warning` | #fbbf24 | Amber highlights, attention items |
| `--accent-positive` | #34d399 | Positive changes (rating up) |
| `--accent-negative` | #f87171 | Negative changes (rating down) |
| `--text-primary` | #f1f5f9 | Primary text on dark backgrounds |
| `--text-secondary` | #94a3b8 | Axis labels, secondary info |
| `--text-muted` | #475569 | Grid lines, tertiary info |

### Social Media Graphics (Light Variant)
Social cards need to pop on white-background feeds (Instagram, Twitter, LinkedIn). Use this adapted palette:

| Element | Color | Notes |
|---------|-------|-------|
| Background | #0a0e17 (deep navy) | Dark cards stand out in feeds |
| Top bar | #00f5d4 (electric teal) | Brand recognition strip |
| Brand text | #f1f5f9 (white) on teal bar | "GRIDIRON INTEL" |
| Main stat number | #00f5d4 (electric teal) | 72-96px, Courier Prime bold |
| Context text | #f1f5f9 (white) | What the number means, 24px |
| Team/conference | #7b61ff (purple) or team colors | 20px |
| Bottom bar | #94a3b8 (slate) | "gridironintel.com", 12px |
| Alternative | Use team's primary color as accent | When featuring a specific team |

### Typography in Visualizations
- Numbers/stats: Courier Prime (monospace), matching the site
- Headlines: Instrument Serif
- Body/labels: DM Sans

## Stat Card Template (Instagram/Twitter)
- 1080x1080px (square) or 1080x1350px (portrait)
- Dark navy background (#0a0e17)
- Top bar: Electric teal (#00f5d4) with "GRIDIRON INTEL" in white, 14px, DM Sans
- Main stat: Large number in electric teal, 72-96px, Courier Prime bold
- Context line: What the number means, white (#f1f5f9), 24px, DM Sans
- Team/conference name: Purple (#7b61ff) or team color, 20px
- Bottom bar: "gridironintel.com" in slate (#94a3b8), 12px
- Optional: Ambient glow effect behind the stat number (teal at 15% opacity, matching site design)
- Export as PNG (social posting) and WebP (web embedding)

## Chart Types

### Bar Chart (Conference Comparison)
- Horizontal bars, sorted by GridRank descending
- Bar color: Electric teal (#00f5d4)
- Highlight bar (featured team): Purple (#7b61ff) or team's actual color
- Labels: team name left (DM Sans), rating value right (Courier Prime)
- Background: Deep navy (#0a0e17)
- Grid lines: Muted (#475569), subtle
- Max 15 teams per chart

### Line Chart (Rating Trajectory)
- Use RatingHistory component or Recharts wrapper from `src/components/charts/`
- X-axis: weeks or seasons
- Y-axis: GridRank rating
- Line color: Electric teal (#00f5d4), 3px stroke
- Data points: Purple (#7b61ff) circles, 6px
- Reference line at division average: Muted (#475569), dashed
- Annotate significant jumps/drops with accent-positive/accent-negative
- Background: Card background (#1a1f2e)

### Sparkline (Inline in Tables)
- Already built: `src/components/charts/Sparkline` (SVG-based)
- Teal line, 1.5px stroke, no axes or labels
- Red/green endpoint indicators for trend direction
- Used in rankings table and team page sidebar

### Matchup Card (Head-to-Head)
- Split layout: Team A left, Team B right
- Each team's primary color as background gradient (use team color data)
- GridRank for each team in large Courier Prime text
- Win probability bar (gradient from teal to purple)
- Key stats comparison: 3-4 rows (SOS, record, points per game, etc.)
- Use matchup OG image generator from `src/lib/utils/og-image.ts`

### Scorecard (Prediction Accuracy)
- Table format using DataTable component styles
- Columns: Week, Straight Up Record, ATS Record, Cumulative %
- Highlight weeks with 60%+ accuracy using accent-positive (#34d399)
- Flag bad weeks with accent-negative (#f87171)
- Running accuracy percentage in bold at bottom, Courier Prime

## Export Formats
- SVG for web embedding (articles, team pages, embedded in React components)
- PNG for social media (stat cards, Instagram, 1080px)
- WebP for web (smaller file size, lazy loaded)
- HTML/React for interactive charts on site (D3/Recharts)

## Accessibility
- All charts must have alt text describing the data trend and key numbers
- Color contrast ratio: minimum 4.5:1 for text (the dark palette naturally achieves this)
- Don't rely on color alone to convey meaning (add labels, arrows, or icons from Lucide)
- No emoji in charts or graphics (use Lucide icons per CLAUDE.md design rules)

## Existing Components to Use
- Sparkline: `src/components/charts/Sparkline`
- WPChart: `src/components/charts/WPChart` (Recharts-based win probability)
- RatingHistory: `src/components/charts/RatingHistory`
- ScoreDistribution: `src/components/charts/ScoreDistribution`
- BumpChart: `src/components/charts/BumpChart` (D3-based)
- DataTable: `src/components/ui/DataTable` (sortable, responsive, keyboard nav)
