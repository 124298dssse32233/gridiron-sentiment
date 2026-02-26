# Page Builder Specifications

> Read this before generating any team, conference, or division page. Also read `docs/marketing/VOICE.md` and `docs/marketing/SEO.md`.

## Architecture Notes

The project uses Next.js App Router with dynamic routes already scaffolded:
- Team pages: `src/app/team/[slug]/page.tsx`
- Conference pages: `src/app/conference/[slug]/page.tsx`

All data comes from the PostgreSQL database via Prisma (`src/lib/db/prisma.ts`). Pages are Server Components using ISR (`export const revalidate = 3600`). Never fetch data client-side for initial page loads.

Components for these pages live in `src/components/team/` and `src/components/rankings/`. Charts use D3.js (complex/custom via `src/components/charts/`) and Recharts (standard charts).

## Team Page Template (`/team/[slug]`, x900+)

Each team page is rendered from database data but MUST include unique written analysis.

### Required Sections
1. **Hero Header**: Team name, conference, division, logo (CFBD logos -> ESPN CDN -> letter avatar fallback, see `src/lib/utils/` for team logo system). Team color accent as left border stripe or gradient backdrop.
2. **GridRank Box**: Current GridRank rating displayed as "1523 +/- 47" in Courier Prime. Rank within division, rank overall, rating change from last week (green/red with `--accent-positive`/`--accent-negative`).
3. **Season Record**: W-L, conference record.
4. **Rating History**: Line chart showing GridRank over the season (or last 3 seasons if historical data available). Use RatingHistory component from `src/components/charts/`.
5. **Strength of Schedule**: SOS rating, SOS rank within division, list of top 3 toughest opponents with links to their team pages.
6. **Upcoming Games**: Next 3 games with opponent GridRank rating and win probability (from Monte Carlo simulation in `src/lib/matchup/monte-carlo.ts`).
7. **Analysis**: 2-3 paragraphs of unique, voice-compliant analysis (READ `docs/marketing/VOICE.md`).
8. **Related Teams**: Links to 5 teams with closest GridRank rating (creates internal linking web per SEO.md hub-and-spoke model).

### Analysis Generation Rules
- MUST read `docs/marketing/VOICE.md` before writing the analysis section.
- Each team's analysis must be unique. No template sentences reused across teams.
- Reference at least one specific game result or stat.
- Include one opinion or prediction.
- For lower-division teams, compare to a more well-known team for context: "Their defense grades out similarly to Oregon State's, which is saying something for a D2 program."
- Keep it 150-250 words. Tight, not padded.

### URL Structure
- `/team/[slug]` (matches existing App Router structure)
- Example: `/team/north-dakota-state`
- Use `src/lib/utils/slugify.ts` for consistent slug generation.

### Schema & SEO
- Every team page gets SportsTeam JSON-LD via `generateTeamSchema()` from `src/lib/utils/structured-data.ts`.
- OG image via `generateTeamOGImage()` from `src/lib/utils/og-image.ts`.
- `generateMetadata()` export with keyword-optimized title: "[Team Name] Football Rating & Stats | Gridiron Intel"

## Conference Page Template (`/conference/[slug]`, x40+)

### Required Sections
1. **Header**: Conference name, division, number of teams, conference logo if available.
2. **Rankings Table**: Sortable DataTable (from `src/components/ui/`) by GridRank, record, SOS. Include all teams in conference. Sparklines in rating column.
3. **Conference Averages**: Average GridRank, average SOS, comparison to other conferences in same division.
4. **Cross-Conference Comparison**: How does this conference stack up against conferences in other divisions? Use bar chart.
5. **Analysis**: 3-4 paragraphs covering the conference race, surprises, disappointments. Follow VOICE.md.
6. **Team Links**: Grid of all team pages in conference (internal linking).

### URL Structure
- `/conference/[slug]` (matches existing App Router structure)
- Example: `/conference/big-ten`

## Division Landing Pages (x5, new pages to create)

These don't exist yet. They'll need new routes: `src/app/division/[slug]/page.tsx`

### Required Sections
1. **Header**: Division name (FBS, FCS, D2, D3, NAIA)
2. **Top 25 Rankings**: Full DataTable with GridRank, record, conference, SOS, sparkline
3. **Division Storylines**: 2-3 paragraphs on division-wide trends (VOICE.md compliant)
4. **Conference Links**: Grid of all conferences in this division (linking to `/conference/[slug]`)
5. **Division Stats**: Total teams, average GridRank, comparison to other divisions

### URL Structure
- `/division/[slug]`
- Example: `/division/fcs`

## Build Order (Phased Rollout)

Content generation should happen AFTER the core platform is functional (Phase 6+ in CLAUDE.md roadmap).

### Phase 1: FBS + FCS
- 130 FBS team pages (analysis content)
- ~130 FCS team pages (analysis content)
- 10 FBS conference pages
- ~13 FCS conference pages
- 2 division landing pages (FBS, FCS)
- Total: ~285 pages

### Phase 2: D2 + D3
- ~300 D2 team pages
- ~250 D3 team pages
- ~16 D2 conference pages
- ~28 D3 conference pages
- 2 division landing pages
- Total: ~596 pages

### Phase 3: NAIA
- ~250 NAIA team pages
- ~20 NAIA conference pages
- 1 division landing page
- Total: ~271 pages

### Context Window Strategy
Break page-building tasks into batches of 15-20 teams per Claude Code session to avoid voice drift and context exhaustion. Start a fresh session for each batch and re-read VOICE.md at the start.

## After Generation

- Run SEO audit: verify JSON-LD schema, meta tags, and internal links on all new pages (see SEO.md)
- Submit updated sitemap to Google Search Console
- Verify pages render correctly on mobile (swipeable cards, collapsible sections per design rules)
- Spot-check 10 random team analyses to ensure they follow VOICE.md and are genuinely unique
- Run `npm run build` to verify no TypeScript errors
