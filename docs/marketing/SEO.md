# Gridiron Intel SEO & GEO Specifications

> Read this before creating or modifying any page on the site.

## Existing Infrastructure

The project already has structured data generators in `src/lib/utils/structured-data.ts`. That file exports helpers for WebSite, Organization, SportsTeam, SportsEvent, Article, BreadcrumbList, and FAQPage schemas. Use those helpers rather than writing JSON-LD by hand. OG image generators live in `src/lib/utils/og-image.ts` (6 SVG templates: default, team, rankings, matchup, chaos, article).

## Schema Markup (JSON-LD on Every Page)

### Team Pages (`/team/[slug]`)
Use `generateTeamSchema()` from `src/lib/utils/structured-data.ts`:
```json
{
  "@context": "https://schema.org",
  "@type": "SportsTeam",
  "name": "Team Full Name",
  "sport": "American Football",
  "memberOf": {
    "@type": "SportsOrganization",
    "name": "Conference Name"
  },
  "description": "GridRank: 1523 +/- 47. [One sentence analysis].",
  "url": "https://gridironintel.com/team/[slug]"
}
```

### Prediction/Matchup Pages (`/matchup`, `/predictions`)
Use `generateGameSchema()`:
```json
{
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": "[Team A] vs [Team B]",
  "startDate": "[ISO date]",
  "competitor": [
    { "@type": "SportsTeam", "name": "[Team A]" },
    { "@type": "SportsTeam", "name": "[Team B]" }
  ],
  "location": { "@type": "Place", "name": "[Venue]" }
}
```

### Article Pages (The Stack, weekly articles)
Use `generateArticleSchema()`:
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "[Title]",
  "author": { "@type": "Person", "name": "Kevin", "url": "https://gridironintel.com/methodology" },
  "publisher": { "@type": "Organization", "name": "Gridiron Intel" },
  "datePublished": "[ISO date]",
  "dateModified": "[ISO date]",
  "description": "[Meta description]"
}
```

### Dataset Pages (Rankings at `/`)
```json
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "GridRank College Football Power Rankings - [Division] - [Week/Date]",
  "description": "College football power rankings for 900+ teams using Glicko-2 hybrid model",
  "creator": { "@type": "Organization", "name": "Gridiron Intel" },
  "temporalCoverage": "[season year]",
  "distribution": { "@type": "DataDownload", "encodingFormat": "text/html" }
}
```

## Meta Tags (Every Page)

- `<title>`: 50-60 chars, primary keyword first, brand last. Example: "FCS Power Rankings Week 8 (2026) | Gridiron Intel"
- `<meta name="description">`: 140-155 chars, include primary keyword and a hook.
- Open Graph tags: og:title, og:description, og:image (use OG image generators from `src/lib/utils/og-image.ts`), og:type
- Twitter Card: summary_large_image with stat card or OG graphic.

Use Next.js App Router `generateMetadata()` exports for all meta tags. Never hardcode meta into HTML.

## Keyword Targets by Page Type

### Division Gap Keywords (Near-Zero Competition)
- "FCS power rankings [year]"
- "D2 football rankings [year]"
- "D3 football best teams"
- "NAIA football rankings [year]"

### Conference Keywords (Low Competition)
- "[Conference] power rankings" (Sun Belt, MEAC, OVC, SWAC, etc.)
- "[Conference] football standings [year]"

### Methodology Keywords (Evergreen)
- "how do computer rankings work"
- "Glicko-2 rating explained"
- "college football computer rankings methodology"

### Prediction Keywords (Weekly Traffic)
- "college football predictions week [N]"
- "cfb picks against the spread"
- "[Team A] vs [Team B] prediction"

### Team Keywords (Long-Tail x900)
- "[Team Name] football rating"
- "[Team Name] power ranking [year]"

### Feature-Specific Keywords
- "college football chaos index" (Chaos Index page)
- "college football coaching grades" (Coach Intelligence page)
- "college football what if scenarios" (What If Engine)
- "college football strength of schedule" (The Gauntlet)

## Internal Linking Rules

Hub-and-spoke model matching actual URL structure:

1. Homepage (`/`) links to division filter views and top teams
2. Conference pages (`/conference/[slug]`) link to ALL team pages in that conference
3. Team pages (`/team/[slug]`) link to: their conference page, upcoming opponent team pages, and 3-5 teams with the closest GridRank rating
4. Weekly articles link to specific team pages when mentioning any team by name (use `src/lib/utils/slugify.ts` to generate correct slugs)
5. Every page includes a link to the Methodology page (`/methodology`) in the footer or sidebar
6. Matchup Machine (`/matchup`) links to both participating team pages
7. The Stack (`/stack`) links to all teams and features mentioned in the weekly digest

## GEO (Generative Engine Optimization) Rules

These rules help Gridiron Intel get cited by ChatGPT, Perplexity, Google AI Overviews, and other LLM-powered search tools.

1. Lead every page with the most important data point in the first paragraph (44% of LLM citations come from the first 30% of text)
2. Use HTML tables (DataTable component) for comparison data, not prose paragraphs (LLMs prefer structured tables)
3. Keep rankings data visible on the page, not behind a toggle or accordion
4. Use the branded metric name "GridRank" consistently across all pages and content
5. Include FAQPage schema on the Methodology page (`/methodology`)
6. Write factual, entity-rich content (team names, conference names, specific stats) that LLMs can extract as structured answers
7. Maintain cross-platform consistency: use the same numbers and team descriptions on the site, social media, and Reddit so LLMs see consensus

## Page Speed Requirements

- All images: WebP format, lazy loaded, max 200KB
- Use Next.js `<Image>` component for automatic optimization
- No render-blocking CSS or JS above the fold (Tailwind handles this via JIT)
- Target: LCP under 2.5s, CLS under 0.1, INP under 200ms
- Use ISR (`export const revalidate = 3600`) on data-heavy pages, not client-side fetching

## Sitemap

A dynamic XML sitemap generator already exists in the codebase. When adding new page types, ensure they're included in the sitemap generation logic. Submit updated sitemaps to Google Search Console after launching new page batches.
