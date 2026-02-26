# Gridiron Intel — Marketing & Content Quick Reference

> This is the index file for all marketing/content strategy docs. Read this first to understand what's available, then read the specific doc for your task.

## Project Summary

Gridiron Intel ranks every college football team in America (FBS, FCS, D2, D3, NAIA) on one unified list using GridRank, a Glicko-2 hybrid rating system. Built with Next.js, TypeScript, Tailwind, Supabase, deployed on Vercel. 18 features including Chaos Index, Matchup Machine, What If Engine, Coach Intelligence, The Lab, GridLegacy, and The Stack newsletter.

Competitive moat: nobody else ranks below FBS. The lower-division keyword space has near-zero competition.

## Quick Terminology

| Term | Meaning |
|------|---------|
| **GridRank** | The rating system. Display as "1523 +/- 47". |
| **GridLegacy** | All-time program index (2014-present). Page: `/programs` |
| **The Stack** | Weekly newsletter/digest. Page: `/stack` |
| **Chaos Index** | Upset/chaos metric. Page: `/chaos` |
| **The Lab** | Statistical outlier detection. Page: `/lab` |
| **The Gauntlet** | Strength of schedule visualizer. Page: `/gauntlet` |
| **Gridiron Intel** | Brand name (two words). Domain: gridironintel.com |

## Strategy Docs Index

Read the relevant doc BEFORE starting work in that area:

| Doc | Path | Read Before... |
|-----|------|---------------|
| Voice Bible | `docs/marketing/VOICE.md` | Writing ANY content (articles, social, analysis, newsletter) |
| SEO & GEO | `docs/marketing/SEO.md` | Creating or modifying any page, adding schema markup |
| Content Pipeline | `docs/marketing/CONTENT_PIPELINE.md` | Running the weekly content production workflow |
| Page Builder | `docs/marketing/PAGE_BUILDER.md` | Generating team, conference, or division pages |
| Data Viz | `docs/marketing/DATA_VIZ.md` | Creating charts, stat cards, or social graphics |
| Implementation Guide | `docs/marketing/IMPLEMENTATION_GUIDE.md` | First time doing any marketing task (full walkthrough) |
| Cowork Operations | `docs/marketing/COWORK_PROMPT.md` | Understanding monetization plan, Cowork's role, project status |

## Key Technical References

These existing codebase files are referenced throughout the marketing docs:

| File | What It Does |
|------|-------------|
| `src/lib/utils/structured-data.ts` | JSON-LD schema generators (SportsTeam, SportsEvent, Article, etc.) |
| `src/lib/utils/og-image.ts` | OG image SVG generators (6 templates) |
| `src/lib/utils/newsletter.ts` | The Stack newsletter HTML template |
| `src/lib/utils/formatting.ts` | Rating display ("1523 +/- 47"), spreads, odds, ordinals |
| `src/lib/utils/slugify.ts` | Team name -> URL slug conversion |
| `src/lib/utils/search.ts` | Fuzzy search (trigram-indexed, alias-aware) |
| `src/components/charts/` | Sparkline, WPChart, RatingHistory, ScoreDistribution, BumpChart |
| `src/components/ui/DataTable` | Sortable, responsive table with keyboard nav |
| `src/app/globals.css` | Design system tokens (colors, radii, shadows, transitions) |

## URL Structure (Actual Routes)

| Page | Route | Notes |
|------|-------|-------|
| Rankings (home) | `/` | Full rankings table with filters |
| Team detail | `/team/[slug]` | Dynamic, one per team |
| Conference | `/conference/[slug]` | Dynamic, one per conference |
| GridLegacy | `/programs` | All-time program rankings |
| Predictions | `/predictions` | Weekly game predictions |
| Methodology | `/methodology` | How GridRank works |
| Pulse | `/pulse` | Sentiment analysis |
| Chaos Index | `/chaos` | Chaotic games/weeks |
| The Lab | `/lab` | Statistical outliers |
| Matchup Machine | `/matchup` | Head-to-head simulator |
| What If Engine | `/whatif` | Alternate scenario modeling |
| Gameday | `/gameday` | Live dashboard |
| Coach Intelligence | `/coaches` | Coaching grades |
| The Gauntlet | `/gauntlet` | Strength of schedule |
| Awards Tracker | `/awards` | Award probabilities |
| Rivalry Pages | `/rivalry/[slug]` | Head-to-head history |
| Roster Intel | `/roster` | Talent composite, portal |
| The Stack | `/stack` | Weekly digest/newsletter |
| Division pages | `/division/[slug]` | TO BE CREATED (see PAGE_BUILDER.md) |
