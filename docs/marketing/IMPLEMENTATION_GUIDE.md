# Marketing & Content Implementation Guide

> Step-by-step reference for executing Gridiron Intel's content and SEO strategy using Claude Code.

## File Map

All marketing/content strategy docs live in `docs/marketing/`:

| File | Purpose | When to Read |
|------|---------|-------------|
| `VOICE.md` | Editorial voice, banned words, tone, platform rules, examples | Before writing ANY content |
| `SEO.md` | Schema markup, keywords, internal linking, GEO rules | Before creating/modifying pages |
| `CONTENT_PIPELINE.md` | Weekly 6-step production workflow, platform targets | Before generating content batches |
| `PAGE_BUILDER.md` | Team/conference/division page templates, phased rollout | Before auto-generating pages |
| `DATA_VIZ.md` | Chart specs, social card templates, color system, components | Before generating visuals |
| `COWORK_PROMPT.md` | Operational context, monetization plan, Cowork role | Reference for strategy decisions |
| `CLAUDE_MARKETING_REFERENCE.md` | Quick-reference index of everything | Starting point for any marketing task |

## How Claude Code Uses These Files

The root `CLAUDE.md` includes a "Marketing, SEO & Content Operations" section that points to `docs/marketing/`. Claude Code reads `CLAUDE.md` automatically every session, so it always knows where to find these docs. It won't load VOICE.md or other marketing docs into context until it's about to do content work, keeping context clean for coding tasks.

## Running Specific Tasks with Claude Code

### Writing a Weekly Article
```
Read docs/marketing/VOICE.md and docs/marketing/CONTENT_PIPELINE.md.
Write the Week 8 power rankings article.
Here are this week's top movers: [paste data summary].
Save to content/articles/2026-week-8-power-rankings.md
```

### Generating Social Content Batch
```
Read docs/marketing/VOICE.md and docs/marketing/CONTENT_PIPELINE.md.
Generate this week's full social content batch based on the article
at content/articles/2026-week-8-power-rankings.md.
Output JSON to content/social/2026-week-8-batch.json
```

### Building Team Pages (Programmatic SEO)
```
Read docs/marketing/PAGE_BUILDER.md, docs/marketing/SEO.md, and docs/marketing/VOICE.md.
Generate team page analysis content for all Big Ten teams using database data.
Each team needs unique 150-250 word analysis following VOICE.md.
The page components live in src/components/team/ and the route is src/app/team/[slug]/page.tsx.
```

### Running an SEO Audit
```
Read docs/marketing/SEO.md.
Audit all team pages for:
- Missing or invalid JSON-LD schema (should use generateTeamSchema from src/lib/utils/structured-data.ts)
- Missing generateMetadata() exports
- Missing internal links to conference pages
- Any images without alt text
Output report to docs/marketing/audit-results.md
```

### Generating Data Visualizations
```
Read docs/marketing/DATA_VIZ.md.
Generate stat cards for the top 5 biggest GridRank movers this week.
Use the dark navy design system (NOT Forest Green/Gold).
Export PNG to public/social/week-8/
```

### Compiling The Stack Newsletter
```
Read docs/marketing/VOICE.md and docs/marketing/CONTENT_PIPELINE.md.
Compile The Stack newsletter for this week using:
- The article at content/articles/2026-week-8-power-rankings.md
- This week's prediction accuracy: [paste results]
- Top social posts from content/social/2026-week-8-batch.json
Use the newsletter template from src/lib/utils/newsletter.ts.
```

## The Weekly Workflow (Sunday Evening, 2-3 Hours)

### Hour 1: Data + Article
1. Run compute scripts to update ratings database
2. Ask Claude Code to generate the flagship article (with VOICE.md loaded)
3. Review the article. Edit jokes, add personal observations, fix anything that sounds AI-generated
4. Publish to the site

### Hour 2: Social + Visuals
1. Ask Claude Code to generate the full social content batch
2. Review the batch. Kill any posts that use banned words or sound robotic
3. Ask Claude Code to generate 10-15 stat cards and charts (DATA_VIZ.md specs)
4. Export to Buffer for scheduling, manual post on Reddit

### Hour 3: Newsletter + Maintenance
1. Ask Claude Code to compile The Stack newsletter
2. Review, add the personal opener and sign-off
3. Send via Resend
4. Run SEO audit on any new pages created this week

## Key Directories for Content Work

```
gridiron-intel/
  docs/marketing/             # These strategy docs (you're here)
  content/
    articles/                 # Weekly articles (markdown)
    social/                   # Social content batches (JSON)
  public/
    social/                   # Exported stat cards and graphics (PNG/WebP)
  src/
    app/
      team/[slug]/page.tsx    # Team detail pages
      conference/[slug]/      # Conference pages
      stack/page.tsx          # The Stack newsletter page
      methodology/page.tsx    # Methodology (link from every page)
    components/
      team/                   # Team page components
      charts/                 # Sparkline, WPChart, RatingHistory, BumpChart, etc.
      ui/                     # DataTable, tooltips, cards, badges
    lib/
      utils/
        structured-data.ts    # JSON-LD schema generators (10 types)
        og-image.ts           # OG image SVG generators (6 templates)
        formatting.ts         # Rating display ("1523 +/- 47"), spreads, odds
        search.ts             # Fuzzy search (trigram, alias-aware)
        slugify.ts            # Team name -> URL slug
        newsletter.ts         # The Stack HTML template
      gridrank/               # Rating engine (Glicko-2 hybrid)
      matchup/                # Monte Carlo simulation
      chaos/                  # Chaos Score engine
```

## Important Reminders

**Voice Drift**: Over long sessions, Claude Code may drift back toward default AI tone. Start fresh sessions for each content batch and re-read VOICE.md at the start. If mid-session drift happens, say: "Re-read docs/marketing/VOICE.md. You're drifting."

**GridRank, Not GI Rating**: The branded metric name is GridRank. Always. In all content, on all pages, in all social posts.

**Review Everything**: Claude Code is your production engine, not your editor. You are the editor. Every piece of content gets human review before publishing.

**Batch Size**: Break large page-building tasks into batches of 15-20 teams per session to prevent voice drift and context exhaustion.

**Git Workflow**: Always have Claude Code create a feature branch before making changes. Never push directly to main.

## Quick Reference: Prompt Patterns

| Task | Prompt Pattern |
|------|---------------|
| Write article | "Read docs/marketing/VOICE.md and CONTENT_PIPELINE.md. Write [article type] about [topic]. Save to content/articles/[filename].md" |
| Social batch | "Read VOICE.md and CONTENT_PIPELINE.md. Generate social batch from [article]. Output JSON to content/social/[filename].json" |
| Team pages | "Read PAGE_BUILDER.md, SEO.md, and VOICE.md. Generate team page content for [conference]." |
| SEO audit | "Read SEO.md. Audit [directory] for schema, meta tags, and links. Report to docs/marketing/audit-results.md" |
| Stat cards | "Read DATA_VIZ.md. Generate [type] for [data]. Export PNG to public/social/" |
| Newsletter | "Read VOICE.md and CONTENT_PIPELINE.md. Compile The Stack from this week's content." |
| Fix voice | "Re-read VOICE.md. Rewrite [content] to match voice rules. Check for banned words." |
