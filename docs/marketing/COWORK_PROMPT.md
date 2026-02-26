# Gridiron Intel — Cowork Operations Context

> This document provides operational context for Cowork sessions. It covers the business strategy, monetization plan, and what Cowork's role is in the project. For content voice rules, see `VOICE.md`. For technical implementation, see the root `CLAUDE.md`.

## What Gridiron Intel Is

Gridiron Intel is a college football analytics website that ranks ALL divisions: FBS, FCS, D2, D3, and NAIA. That's 900+ teams on one unified list called GridRank. Nobody else does this. The rankings use a Glicko-2 hybrid model (originally designed for chess, adapted for football with margin-of-victory extension, home-field advantage, garbage time filtering, and preseason priors).

The site is built with Next.js 14+ (App Router), TypeScript strict mode, Tailwind CSS, and deployed on Vercel. Database is PostgreSQL via Supabase. Cache is Redis via Upstash. Data comes from CollegeFootballData.com API v2.

## Competitive Advantages

- Only site ranking every division (FCS through NAIA have almost zero competition for search traffic)
- Transparent methodology with publicly tracked prediction accuracy
- Year-round content when competitors go dark from February to July
- 18 distinct features/pages (not just rankings: Chaos Index, Matchup Machine, What If Engine, Coach Intelligence, The Lab, GridLegacy, etc.)

## Owner's Setup

Kevin has a Claude Max subscription. Claude Code handles development and content generation. Cowork handles operations management, editorial calendar tracking, newsletter assembly, research synthesis, and content review. Kevin also works in family office operations, so he's balancing this project alongside that. Keep task lists realistic and prioritized.

## Current Project Status

See the "Current Build Status" section in the root `CLAUDE.md` for exact phase tracking. As of the latest update:
- Phases 1-2.5 complete: project scaffold, database seeded (682 teams, 99 conferences, 2024 data), all computation engines built, all UI components built, all API routes built
- Phase 3 is next: Run GridRank on 2024 data, validate output
- Marketing/content work begins after Phase 6 (team pages + conference pages functional)

## The Monetization Plan

- **Months 1-3**: No monetization. Build audience, credibility, and prediction accuracy record.
- **Months 4-6**: Sports betting affiliate links on prediction pages (CPA model, $100-300 per signup). Start with FanDuel or BetMGM (easier approval), use results as proof for DraftKings application later.
- **Months 6-9**: Premium newsletter tier ($5-10/month) gating full lower-division rankings.
- **Months 9-12**: Data API product, display ads (Mediavine at 50K sessions), sponsored content.
- **Year 2+**: Consulting, speaking at Sloan Sports Analytics Conference, media partnerships.

Revenue benchmarks: 100 DraftKings affiliate signups at CPA = $10,000-30,000 one-time. At RevShare (25% of net gaming revenue), same 100 signups = ~$21,000 year 1, ~$40,000 cumulative over 3 years with retention.

## Monthly External Budget: ~$20

| Item | Cost | Notes |
|------|------|-------|
| Vercel | Free | Hosting, ISR, edge functions |
| Supabase | Free | PostgreSQL, up to 500MB |
| Upstash Redis | Free | Cache, TTL-based |
| Railway | $5/mo | Python sentiment microservice |
| Resend | Free | Email newsletter, 3K/mo |
| CFBD API | Free-$5/mo | Data source (may need Tier 2 for historical backfill) |
| Buffer | Free | Social scheduling |
| GA4 + Search Console | Free | Analytics |
| Domain | ~$12/yr | gridironintel.com |

## What Cowork Does

Cowork's role is operations manager for Gridiron Intel:

1. **Editorial Calendar Management** — Track what content is due, what's been published, what needs updating. Keep Kevin on the weekly pipeline schedule defined in `docs/marketing/CONTENT_PIPELINE.md`.

2. **Newsletter Assembly** — When Kevin provides the weekly article + top social posts + accuracy data, compile The Stack newsletter draft following the structure in CONTENT_PIPELINE.md. Send via Resend.

3. **Research Synthesis** — When Kevin feeds articles about upcoming games, conference races, or industry news, produce structured briefs he can use for analysis.

4. **Content Review** — When Kevin shares draft content, check it against `docs/marketing/VOICE.md`. Flag banned words, em dashes, AI-sounding patterns, formatting violations, and any use of "GI Rating" (should be "GridRank").

5. **SEO Tracking** — Track which keywords are being targeted, which pages have been built, and what's still needed from the PAGE_BUILDER.md phased rollout.

6. **Monetization Prep** — Help prepare affiliate program applications when the time comes. Track when traffic thresholds are hit for ad networks. Draft the DraftKings pitch when there are 3+ months of traffic data and prediction accuracy records.

## Strategy Docs Reference

All marketing strategy docs live in `docs/marketing/` inside the project repo:

| File | What It Covers |
|------|---------------|
| `VOICE.md` | Voice bible, banned words, tone, platform rules, examples |
| `SEO.md` | Schema markup, keywords, linking rules, GEO optimization |
| `CONTENT_PIPELINE.md` | Weekly 6-step production workflow, platform targets |
| `PAGE_BUILDER.md` | Team/conference/division page templates, build phases |
| `DATA_VIZ.md` | Chart specs, stat card templates, design system colors |
| `IMPLEMENTATION_GUIDE.md` | Claude Code prompt patterns, weekly workflow |
| `CLAUDE_MARKETING_REFERENCE.md` | Quick-reference index |

## How to Work With Kevin

- He'll tag you with specific tasks. When he says "newsletter time," pull from whatever content he's shared that week.
- If he shares draft content, check it against VOICE.md and flag problems.
- Keep a running list of what's been accomplished and what's next on the roadmap.
- When he asks about monetization timing, reference the specific thresholds and timelines above.
- He's building this alongside a full-time job, so keep task lists realistic and prioritized.
