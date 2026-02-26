# Content Pipeline Specifications

> Read this before generating any content batch. Also read `docs/marketing/VOICE.md` first.

## Weekly Production Schedule (In-Season: Aug-Jan)

Run this pipeline every Sunday evening. Total human review time: 2-3 hours.

### Step 1: Data Refresh
- Pull latest game results via CFBD API client (`src/lib/cfbd/client.ts`)
- Run `scripts/compute-gridrank.ts` to update ratings
- Run `scripts/compute-chaos.ts`, `scripts/compute-coaches.ts`, `scripts/compute-lab.ts`, `scripts/compute-awards.ts`, `scripts/compute-predictions.ts`
- Identify top 10 biggest movers (up and down)
- Flag any surprising results (upsets, blowouts, cross-division comparisons)
- Output: updated ratings in database + storyline summary

### Step 2: Flagship Article
- 1,200-1,800 words
- MUST read `docs/marketing/VOICE.md` before writing
- Lead with the single most surprising finding from this week's data
- Cover all divisions, not just FBS
- Include at least 3 specific team examples with GridRank numbers
- Include one self-deprecating note if the model got something wrong last week
- End with a forward-looking take for next week, not a summary
- Add Article schema markup (use `generateArticleSchema()` from `src/lib/utils/structured-data.ts`)
- Save to `content/articles/[year]-week-[N]-power-rankings.md`

### Step 3: Social Content Batch
Generate in a single session, output as structured JSON:

```json
{
  "twitter": [
    { "text": "...", "type": "hot_take|thread_start|poll|stat_drop|quote_tweet_prompt" }
  ],
  "reddit": [
    { "subreddit": "CFB|FCS|SEC|...", "title": "...", "body_markdown": "..." }
  ],
  "instagram": [
    { "type": "stat_card|carousel|reel_script", "text": "...", "data": {} }
  ],
  "linkedin": [
    { "text": "...", "topic": "methodology|building_in_public|analytics_thinking" }
  ],
  "tiktok": [
    { "script": "...", "hook": "...", "duration_seconds": 15 }
  ]
}
```

Save to `content/social/[year]-week-[N]-batch.json`

### Weekly Targets by Platform
| Platform | Posts/Week | Primary Format |
|----------|-----------|----------------|
| X/Twitter | 25-35 | Hot takes, threads, polls, stat drops |
| Reddit | 3-4 | Long-form OC with tables |
| Instagram | 7-10 | Stat cards, carousels, Reels |
| LinkedIn | 2-3 | Methodology, building in public |
| Newsletter | 1 | The Stack weekly digest (Sunday evening) |
| TikTok/Shorts | 3-5 | 15-sec data reveals |

### Step 4: Data Visualizations
Generate 10-15 per week. See `docs/marketing/DATA_VIZ.md` for specs:
- Conference comparison charts (bar charts)
- Team rating trajectory charts (line charts over season)
- Prediction accuracy scorecard (table/graphic)
- Head-to-head matchup cards (side-by-side comparison)
- "Biggest Movers" graphic (top 5 up, top 5 down)

Export social-sized images to `public/social/week-[N]/`

### Step 5: Newsletter Assembly (The Stack)
The newsletter template already exists in the codebase (`src/lib/utils/newsletter.ts`). Compile weekly edition:
1. Conversational 1-2 sentence opener
2. Top 5 rankings changes with one-liner analysis each
3. Article excerpt with link to full piece
4. Prediction accuracy update ("We went X-Y straight up, X-Y ATS")
5. One exclusive stat or finding not published elsewhere
6. Casual sign-off

Send via Resend (configured in project, free tier: 3K emails/month).

### Step 6: Schedule & Distribute
- Export Twitter content to Buffer-compatible CSV
- Reddit posts: manual (authenticity matters, respond to every comment in first hour)
- Instagram: export stat cards as images to `public/social/`
- LinkedIn: manual post
- Newsletter: trigger via Resend API

## Off-Season Pipeline (Feb-Jul): 3-4 posts per week

Topics to rotate:
- Transfer Portal Impact Analysis (run model with roster changes via Roster Intelligence)
- Historical "What If" Analysis (use What If Engine at `/whatif` for retroactive model runs)
- Methodology Deep Dives (how Glicko-2 handles specific scenarios, link to `/methodology`)
- Conference Previews (every conference, every division)
- Draft/NFL Crossover (how GridRank ratings predicted pro success)
- GridLegacy all-time rankings content (use `/programs` data)

## Quality Checklist (Run Before Publishing)

- [ ] Read content aloud. Does it sound like a person talking about football?
- [ ] Check for banned words from `docs/marketing/VOICE.md`
- [ ] Check for em dashes (there should be zero)
- [ ] Verify all team names, scores, and statistics are accurate
- [ ] Confirm internal links to team pages (`/team/[slug]`) and conference pages (`/conference/[slug]`) work
- [ ] Schema markup present and valid (use existing `structured-data.ts` generators)
- [ ] Meta title under 60 chars, meta description under 155 chars
- [ ] At least one image/graphic per article
- [ ] Uses "GridRank" (not "GI Rating" or "Glicko-2 rating") when referencing the rating
