# GRIDIRON INTEL — COMPLETE MASTER IMPLEMENTATION PLAN
## Version 3.0 — Final Build Spec for Claude Code

> **This document is the SINGLE SOURCE OF TRUTH. It supersedes all prior plans (V1, V2, new_pages_spec).** Every feature is specified at implementation depth. Hand this to Claude Code and build.

---

## TABLE OF CONTENTS

1. [Project Vision & Requirements](#1-project-vision--requirements)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [The Ranking Algorithm — GridRank](#3-gridrank)
4. [GridLegacy — All-Time Program Power Index](#4-gridlegacy)
5. [Sentiment Analysis Engine](#5-sentiment-engine)
6. [Data Sources & Pipeline](#6-data-pipeline)
7. [Database Schema](#7-database-schema)
8. [Frontend Design System](#8-frontend-design)
9. [ALL 18 Feature Specs (World-Class)](#9-feature-specs)
10. [Implementation Phases (18-Week Roadmap)](#10-roadmap)
11. [Budget](#11-budget)
12. [Claude Code Session Guide](#12-claude-code)

---

## 1. PROJECT VISION & REQUIREMENTS

### Core Philosophy
- **One List:** Every college football team in America — FBS, FCS, D2, D3, NAIA — ranked on a single unified list
- **Accessible Depth:** Casual fans get it at a glance; data nerds drill into methodology
- **Interactive:** Users simulate, compare, argue, and predict — not just read
- **Living Product:** Rankings, sentiment, outliers, and coaching grades update throughout season
- **Scalable:** Architecture supports adding NFL, NBA, soccer with minimal refactoring

### Complete Feature Set (18 Pages/Features)

**Core Pages (7):** Rankings, Team Pages, Conference Pages, Program Rankings (GridLegacy), Predictions, Methodology, Pulse (Sentiment)

**Analytics Pages (2):** Chaos Index, The Lab

**Interactive Features (9):** Matchup Machine, What If Engine, Gameday Dashboard, Coach Intelligence, The Gauntlet, Awards Tracker, Rivalry Pages, Roster Intelligence, The Stack

### Constraints
- Budget: ~$100/month
- Primary API: CollegeFootballData.com (already have access)
- Beginner-friendly codebase with comprehensive docs
- No enterprise APIs — sentiment uses scraping + open-source NLP

---

## 2. TECH STACK & ARCHITECTURE

```
Frontend:     Next.js 14+ (App Router), TypeScript, Tailwind CSS
Charts:       D3.js (custom/complex) + Recharts (standard)
Animations:   Framer Motion
Backend:      Next.js API Routes + Python microservices (NLP/ML)
Database:     PostgreSQL via Supabase (free tier)
ORM:          Prisma
Cache:        Redis via Upstash (free tier)
Hosting:      Vercel (free) + Railway ($5/mo for Python)
NLP:          HuggingFace Transformers (open source)
Scraping:     Cheerio + Puppeteer
Email:        Resend (free tier for newsletter)
```

### Architecture Pattern
```
[CFBD API] → [Data Ingestion Cron] → [PostgreSQL]
                                          ↓
                                   [Computation Layer]
                                   - GridRank Engine
                                   - Chaos Score Engine
                                   - Outlier Detection
                                   - Coach Grading
                                   - Award Prediction
                                   - Talent Composite
                                          ↓
                                   [Cache (Redis)]
                                          ↓
                                   [Next.js ISR Pages]
                                          ↓
                                   [User Browser]

[Reddit/News] → [Python Scraper] → [NLP Pipeline] → [PostgreSQL]
```

---

## 3. GRIDRANK — THE RANKING ALGORITHM

### Bayesian Hierarchical Model

**Team strength as latent variable:**
```
θᵢ ~ Normal(μ_conference, σ²_conference)
μ_conference ~ Normal(μ_level, σ²_level)

Level priors:
  FBS: μ=1500, σ=200
  FCS: μ=1200, σ=150
  D2:  μ=1000, σ=120
  D3:  μ=800,  σ=100
  NAIA: μ=700, σ=100
```

**Game outcome model:**
```
Expected_Margin = θ_home - θ_away + HFA
HFA (Home Field Advantage) = 3.0 points (adjustable)
```

**Margin compression (diminishing returns for blowouts):**
```
adjusted_margin(m) = sign(m) × k × ln(1 + |m| / c)
where k=15, c=10
```

**Recency weighting:**
```
w(t) = e^(-λ × (T - t))
where λ=0.05, T=current_week, t=game_week
```

**Strength of Schedule:**
```
SOS_i = (2/3) × avg(θ_opponents) + (1/3) × avg(θ_opponents_of_opponents)
```

**Cross-Level Calibration (the secret sauce):**
1. Bridge games (FBS vs FCS, etc.) serve as calibration anchors
2. Transitive performance chains connect non-overlapping levels
3. Hierarchical shrinkage for teams with few cross-level games
4. Iterative convergence: fix teams → estimate conferences → estimate levels → update teams → apply bridge corrections → check convergence (typically 15-20 iterations)

**Validation Targets:**
- Out-of-sample ATS accuracy >53% (profitable)
- Benchmark against SP+, FPI, Massey, Sagarin
- Cross-level prediction accuracy tracking
- Log loss and Brier score reporting

---

## 4. GRIDLEGACY — ALL-TIME PROGRAM POWER INDEX

CFP-era (2014–present) composite:
```
GridLegacy = 0.25 × Peak Performance Index
           + 0.20 × Consistency Score
           + 0.20 × Postseason Success
           + 0.15 × Average GridRank Rating
           + 0.10 × Trend Score (trajectory)
           + 0.10 × SOS Premium
```

---

## 5. SENTIMENT ANALYSIS ENGINE

**Stack:** Python microservice on Railway using HuggingFive Transformers
**Model:** `cardiffnlp/twitter-roberta-base-sentiment-latest`
**Sources:** Reddit API (free), Google News RSS, sports forum scraping
**Schedule:** Every 6-12 hours during season, daily offseason
**Metrics per team:** Sentiment Score (0-100), Trend, Buzz Volume, Top Players, Coach Approval, Media vs Fan Divergence
**Player buzz:** Rolling z-score spike detection (z>3=VIRAL, z>2=TRENDING, z>1=RISING)

---

## 6. DATA SOURCES & PIPELINE

| Source | Data | Cost |
|--------|------|------|
| CollegeFootballData.com API | Games, stats, play-by-play, recruiting, transfers, ratings, WP, EPA, lines | Already have |
| CFBD Recruiting endpoints | Star ratings, composite scores, player rankings | Included |
| CFBD Transfer Portal endpoints | Portal entries, destinations, previous stats | Included |
| NAIA.org | NAIA schedules/results (scraping) | Free |
| Reddit API | Fan sentiment, game threads | Free |
| Google News RSS | Media sentiment | Free |

**Sync Schedule:**
- In-season: Every 6 hours game data, weekly full ranking recompute, 12-hour sentiment
- Offseason: Weekly roster checks, monthly historical recompute
- Preseason: Daily data pulls, initialize new season
- Post-bowl: Final GridLegacy update

---

## 7. DATABASE SCHEMA

```sql
-- ============ FOUNDATION ============
CREATE TABLE sports (id SERIAL PRIMARY KEY, name VARCHAR(50), slug VARCHAR(50) UNIQUE);
CREATE TABLE levels (id SERIAL PRIMARY KEY, sport_id INT REFERENCES sports(id), name VARCHAR(50), slug VARCHAR(50), base_rating DECIMAL(8,2));
CREATE TABLE conferences (id SERIAL PRIMARY KEY, level_id INT REFERENCES levels(id), name VARCHAR(100), abbreviation VARCHAR(20), slug VARCHAR(50));
CREATE TABLE teams (
  id SERIAL PRIMARY KEY, name VARCHAR(200), mascot VARCHAR(100), abbreviation VARCHAR(10), slug VARCHAR(100) UNIQUE,
  conference_id INT REFERENCES conferences(id), level_id INT REFERENCES levels(id),
  primary_color VARCHAR(7), secondary_color VARCHAR(7), logo_url TEXT,
  city VARCHAR(100), state VARCHAR(2), stadium VARCHAR(200), stadium_capacity INT,
  metadata JSONB DEFAULT '{}'
);
CREATE TABLE seasons (id SERIAL PRIMARY KEY, sport_id INT REFERENCES sports(id), year INT, is_current BOOLEAN DEFAULT false);

-- ============ GAMES ============
CREATE TABLE games (
  id SERIAL PRIMARY KEY, season_id INT REFERENCES seasons(id),
  home_team_id INT REFERENCES teams(id), away_team_id INT REFERENCES teams(id),
  week INT, game_date TIMESTAMPTZ,
  home_score INT, away_score INT, is_neutral_site BOOLEAN DEFAULT false,
  is_conference_game BOOLEAN, is_postseason BOOLEAN DEFAULT false,
  home_win_prob DECIMAL(5,4), excitement_index DECIMAL(6,3),
  spread DECIMAL(5,1), over_under DECIMAL(5,1),
  home_epa DECIMAL(8,3), away_epa DECIMAL(8,3),
  home_success_rate DECIMAL(5,4), away_success_rate DECIMAL(5,4),
  home_explosiveness DECIMAL(6,3), away_explosiveness DECIMAL(6,3),
  metadata JSONB DEFAULT '{}'
);

-- ============ RANKINGS ============
CREATE TABLE rankings (id SERIAL PRIMARY KEY, season_id INT, sport_id INT, week INT, computed_at TIMESTAMPTZ, algorithm_version VARCHAR(20));
CREATE TABLE team_rankings (
  id SERIAL PRIMARY KEY, ranking_id INT REFERENCES rankings(id),
  team_id INT REFERENCES teams(id), rank INT, rating DECIMAL(8,2),
  previous_rank INT, rating_change DECIMAL(6,2),
  offense_rating DECIMAL(8,2), defense_rating DECIMAL(8,2),
  sos DECIMAL(8,2), record_wins INT, record_losses INT,
  playoff_probability DECIMAL(5,4)
);
CREATE TABLE program_rankings (
  id SERIAL PRIMARY KEY, team_id INT REFERENCES teams(id), computed_at TIMESTAMPTZ,
  overall_rank INT, overall_score DECIMAL(6,3),
  peak_performance DECIMAL(6,3), consistency DECIMAL(6,3),
  postseason_success DECIMAL(6,3), avg_rating DECIMAL(6,3),
  trend_score DECIMAL(6,3), sos_premium DECIMAL(6,3)
);

-- ============ SENTIMENT ============
CREATE TABLE team_sentiment (
  id SERIAL PRIMARY KEY, team_id INT REFERENCES teams(id), season_id INT,
  measured_at TIMESTAMPTZ, score DECIMAL(5,2), trend VARCHAR(10),
  buzz_volume INT, source_breakdown JSONB, hot_topics JSONB,
  coach_approval DECIMAL(5,2), media_fan_divergence DECIMAL(5,2)
);
CREATE TABLE player_sentiment (
  id SERIAL PRIMARY KEY, team_id INT REFERENCES teams(id), player_name VARCHAR(200),
  position VARCHAR(10), measured_at TIMESTAMPTZ, mention_count INT,
  sentiment_score DECIMAL(5,2), buzz_zscore DECIMAL(5,2), buzz_status VARCHAR(20)
);

-- ============ CHAOS INDEX ============
CREATE TABLE chaos_games (
  id SERIAL PRIMARY KEY, game_id INT REFERENCES games(id) UNIQUE,
  season_id INT REFERENCES seasons(id),
  chaos_score DECIMAL(6,2),
  spread_bust_factor DECIMAL(6,2), win_prob_volatility DECIMAL(6,2),
  upset_magnitude DECIMAL(6,2), excitement_index DECIMAL(6,2),
  context_weight DECIMAL(6,2), postgame_wp_inversion DECIMAL(6,2),
  winner_lowest_wp DECIMAL(5,4), wp_crosses_50 INT,
  tags TEXT[], headline VARCHAR(200), narrative TEXT, computed_at TIMESTAMPTZ
);
CREATE TABLE season_superlatives (
  id SERIAL PRIMARY KEY, season_id INT REFERENCES seasons(id),
  category VARCHAR(50), team_id INT REFERENCES teams(id),
  stat_value VARCHAR(200), stat_detail TEXT, computed_at TIMESTAMPTZ
);

-- ============ THE LAB ============
CREATE TABLE player_outliers (
  id SERIAL PRIMARY KEY, season_id INT REFERENCES seasons(id),
  player_name VARCHAR(200), team_id INT REFERENCES teams(id),
  position VARCHAR(10), category VARCHAR(50),
  stat_label VARCHAR(200), stat_value DECIMAL(10,3),
  zscore DECIMAL(5,2), percentile DECIMAL(5,2),
  detail TEXT, computed_at TIMESTAMPTZ
);
CREATE TABLE team_anomalies (
  id SERIAL PRIMARY KEY, season_id INT REFERENCES seasons(id),
  team_id INT REFERENCES teams(id), category VARCHAR(50),
  label VARCHAR(100), description TEXT,
  offense_percentile DECIMAL(5,2), defense_percentile DECIMAL(5,2),
  epa_per_play DECIMAL(6,3), expected_wins DECIMAL(4,1),
  actual_wins INT, luck_index DECIMAL(5,2),
  metadata JSONB, computed_at TIMESTAMPTZ
);

-- ============ COACH INTELLIGENCE ============
CREATE TABLE coach_decisions (
  id SERIAL PRIMARY KEY, game_id INT REFERENCES games(id),
  team_id INT REFERENCES teams(id), coach_name VARCHAR(200),
  decision_type VARCHAR(30), -- '4th_down', '2pt', 'timeout', 'clock'
  situation JSONB, -- {score_diff, time_remaining, yard_line, down, distance, timeouts, half}
  decision_made VARCHAR(50), optimal_decision VARCHAR(50),
  was_correct BOOLEAN, wp_gained DECIMAL(6,4), wp_optimal DECIMAL(6,4),
  outcome VARCHAR(100)
);
CREATE TABLE coach_grades (
  id SERIAL PRIMARY KEY, season_id INT REFERENCES seasons(id),
  team_id INT REFERENCES teams(id), coach_name VARCHAR(200),
  overall_grade DECIMAL(5,2),
  fourth_down_grade DECIMAL(5,2), fourth_down_aggression DECIMAL(5,4), fourth_down_accuracy DECIMAL(5,4),
  two_pt_grade DECIMAL(5,2), timeout_grade DECIMAL(5,2), clock_management_grade DECIMAL(5,2),
  total_wp_gained DECIMAL(6,3), total_wp_lost DECIMAL(6,3), net_wp DECIMAL(6,3),
  decisions_count INT, computed_at TIMESTAMPTZ
);

-- ============ ROSTER INTELLIGENCE ============
CREATE TABLE players (
  id SERIAL PRIMARY KEY, cfbd_id INT UNIQUE, name VARCHAR(200), position VARCHAR(10),
  current_team_id INT REFERENCES teams(id),
  height_inches INT, weight_lbs INT, class VARCHAR(15), eligibility_remaining INT,
  hometown VARCHAR(200), home_state VARCHAR(2), high_school VARCHAR(200),
  recruit_rating DECIMAL(6,4), recruit_stars INT, recruit_composite DECIMAL(6,4),
  recruit_national_rank INT, recruit_position_rank INT, recruit_state_rank INT, recruit_class_year INT,
  career_epa DECIMAL(8,3), career_snaps INT, career_games INT,
  draft_projection VARCHAR(50), metadata JSONB
);
CREATE TABLE player_transfers (
  id SERIAL PRIMARY KEY, player_id INT REFERENCES players(id),
  from_team_id INT REFERENCES teams(id), to_team_id INT REFERENCES teams(id),
  transfer_year INT, transfer_window VARCHAR(20),
  previous_epa DECIMAL(8,3), previous_snaps INT,
  post_transfer_epa DECIMAL(8,3), post_transfer_snaps INT,
  epa_delta DECIMAL(8,3), impact_rating DECIMAL(6,2), status VARCHAR(20)
);
CREATE TABLE team_roster_grades (
  id SERIAL PRIMARY KEY, team_id INT REFERENCES teams(id), season_id INT REFERENCES seasons(id),
  overall_talent_score DECIMAL(8,2), talent_national_rank INT,
  hs_recruit_talent DECIMAL(8,2), portal_acquired_talent DECIMAL(8,2),
  homegrown_dev_score DECIMAL(8,2),
  portal_additions INT, portal_losses INT, portal_net_epa DECIMAL(8,3), portal_roi DECIMAL(6,2),
  avg_recruit_rating DECIMAL(6,4), five_stars INT, four_stars INT, three_stars INT, two_stars INT,
  blue_chip_ratio DECIMAL(5,4), recruiting_class_rank INT,
  composite_class_score DECIMAL(8,2), -- avg 247 composite of last 3 classes
  development_grade DECIMAL(5,2), stars_to_starters_rate DECIMAL(5,4),
  low_star_overperformers INT, talent_vs_performance_delta DECIMAL(6,2),
  computed_at TIMESTAMPTZ
);

-- ============ RIVALRIES ============
CREATE TABLE rivalries (
  id SERIAL PRIMARY KEY,
  team_a_id INT REFERENCES teams(id), team_b_id INT REFERENCES teams(id),
  name VARCHAR(200), trophy_name VARCHAR(200),
  significance_tier INT, -- 1=legendary, 2=major, 3=notable
  metadata JSONB
);
CREATE TABLE rivalry_stats (
  id SERIAL PRIMARY KEY, rivalry_id INT REFERENCES rivalries(id),
  season_id INT REFERENCES seasons(id), game_id INT REFERENCES games(id),
  winner_team_id INT REFERENCES teams(id),
  margin INT, was_upset BOOLEAN,
  chaos_score DECIMAL(6,2), sentiment_differential DECIMAL(6,2)
);

-- ============ AWARDS ============
CREATE TABLE award_candidates (
  id SERIAL PRIMARY KEY, season_id INT REFERENCES seasons(id),
  award_name VARCHAR(100), player_id INT REFERENCES players(id),
  probability DECIMAL(5,4), previous_probability DECIMAL(5,4),
  rank INT, total_epa DECIMAL(8,3),
  team_success_factor DECIMAL(5,2), narrative_score DECIMAL(5,2),
  statistical_score DECIMAL(5,2), historical_comp TEXT,
  computed_at TIMESTAMPTZ
);

-- ============ THE STACK ============
CREATE TABLE weekly_digests (
  id SERIAL PRIMARY KEY, season_id INT REFERENCES seasons(id),
  week INT, published_at TIMESTAMPTZ,
  top_movers JSONB, game_of_week JSONB, chaos_highlights JSONB,
  prediction_accuracy JSONB, sentiment_shifts JSONB,
  outlier_performances JSONB, coaching_highlights JSONB,
  award_race_updates JSONB, gauntlet_update JSONB,
  rendered_html TEXT, rendered_markdown TEXT
);

-- ============ INDEXES ============
CREATE INDEX idx_chaos_season ON chaos_games(season_id, chaos_score DESC);
CREATE INDEX idx_outliers_season ON player_outliers(season_id, category, zscore DESC);
CREATE INDEX idx_anomalies_season ON team_anomalies(season_id, category);
CREATE INDEX idx_coach_decisions ON coach_decisions(game_id, team_id);
CREATE INDEX idx_coach_grades ON coach_grades(season_id, overall_grade DESC);
CREATE INDEX idx_transfers_year ON player_transfers(transfer_year, to_team_id);
CREATE INDEX idx_roster_season ON team_roster_grades(season_id, talent_national_rank);
CREATE INDEX idx_awards_season ON award_candidates(season_id, award_name, rank);
CREATE INDEX idx_games_week ON games(season_id, week);
CREATE INDEX idx_games_teams ON games(home_team_id, away_team_id);
CREATE INDEX idx_rankings_rank ON team_rankings(ranking_id, rank);
CREATE INDEX idx_sentiment_date ON team_sentiment(team_id, measured_at);
CREATE INDEX idx_players_team ON players(current_team_id);
CREATE INDEX idx_players_recruit ON players(recruit_stars DESC, recruit_national_rank);
```

---

## 8. FRONTEND DESIGN SYSTEM

### Aesthetic: "Data-Forward Editorial"
Dark mode primary, data as hero, movement with purpose, typography-driven hierarchy.

### Colors
```css
:root {
  --bg-primary: #0a0e17;
  --bg-secondary: #111827;
  --bg-card: #1a1f2e;
  --bg-elevated: #242937;
  --accent-primary: #00f5d4;     /* Electric teal — signature */
  --accent-secondary: #7b61ff;   /* Purple */
  --accent-chaos: #f472b6;       /* Pink — chaos/upset accent */
  --accent-warning: #fbbf24;     /* Amber */
  --accent-positive: #34d399;    /* Green */
  --accent-negative: #f87171;    /* Red */
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #475569;
}
```

### Typography
```
Display/Headlines: 'Instrument Serif', serif
Body:              'DM Sans', sans-serif
Rankings/Stats:    'Courier Prime', monospace
```

### Design Rules
- Ambient glow effects behind key data points
- Sparklines everywhere — trends should be visible at a glance
- Team color accents (left border stripe, gradient backdrops)
- Smooth Framer Motion animations (stagger children, fade-up on scroll)
- Mobile-first responsive — swipeable cards, collapsible sections

---

## 9. ALL 18 FEATURE SPECIFICATIONS

---

### 9.1 — HOMEPAGE / RANKINGS (`/`)

**Hero:** "GridRank" branding, current week, stat highlights (total teams ranked, prediction accuracy).

**Filter bar:** Level (All/FBS/FCS/D2/D3/NAIA), Conference dropdown, text search.

**Rankings table columns:** Rank, Δ (change badge), Team (color stripe + name + conf), Record, Rating (monospace), Off/Def split, SOS, Trend (8-week sparkline), Next Game WP.

**Expandable rows:** Full schedule with results, each game WP, margin vs expected, link to game detail.

**Sidebar:** Top 5 risers, top 5 fallers, "Games to Watch This Week" (highest combined rating matchups), GridRank accuracy tracker (season-long predictions vs results).

---

### 9.2 — TEAM PAGE (`/team/[slug]`)

1. **Hero:** Team colors as gradient backdrop, rank badge (large), record, conference, level
2. **Quick Stats Grid (6 cards):** Rating, SOS, Off Rating, Def Rating, Trend (Δ), Playoff Prob
3. **Season Timeline:** Week-by-week rank visualization with game results (W/L dots)
4. **Game Log:** Each game with opponent, score, WP chart, margin vs expected, EPA, chaos score if notable
5. **Historical Rankings (2014–present):** Line chart of GridRank per season
6. **SOS Visualization:** Opponent strength distribution + upcoming strength
7. **Sentiment Panel:** Current score, trend, fan vs media, hot topics
8. **Roster Intelligence Preview:** Talent composite rank, top recruits, portal summary
9. **GridLegacy Stats:** Component breakdown if team ranks in top 50 all-time

---

### 9.3 — CONFERENCE PAGE (`/conference/[slug]`)

Conference strength rating, internal power rankings, week-by-week performance heatmap (teams × weeks), cross-level performance (how conf teams do vs other conferences), historical strength chart, head-to-head matrix within conference, preseason vs actual finish comparison.

---

### 9.4 — PROGRAM RANKINGS / GRIDLEGACY (`/programs`)

GridLegacy rankings with component mini-bars, radar charts (6 axes), compare tool (select 2-4 programs side-by-side), trajectory chart (rating over time), rising/falling callouts, CFP appearances and results.

---

### 9.5 — PREDICTIONS (`/predictions`)

Weekly matchup cards with win probabilities. Monte Carlo season simulator (10,000 runs). Playoff probability tracker. Accuracy scoreboard: GridRank vs Vegas vs SP+ vs FPI. Historical accuracy by week. Bowl projections.

---

### 9.6 — METHODOLOGY (`/methodology`)

Two modes: "Casual" (plain English + infographic) and "Deep Dive" (full math, LaTeX-style equations). Interactive examples ("Here's how we'd rate Team X with these results"). Performance dashboard with calibration plots, log loss, Brier scores. Algorithm changelog.

---

### 9.7 — PULSE / SENTIMENT HUB (`/pulse`)

Trending teams bar chart. Player buzz leaderboard with z-score badges. Controversy tracker (biggest negative sentiment spikes). Per-team drilldown: sentiment over time + word cloud + source breakdown. Live feed aesthetic with pulsing indicators. Coach approval ratings leaderboard.

---

### 9.8 — CHAOS INDEX (`/chaos`)

#### Purpose
The definitive record of college football's most insane games — ranked by a proprietary Chaos Score. "SportsCenter Top 10 meets advanced analytics."

#### The Chaos Score Algorithm (0-100)
```
ChaosScore = 0.25 × SpreadBust + 0.20 × WPVolatility + 0.20 × UpsetMagnitude
           + 0.15 × ExcitementIndex + 0.10 × ContextWeight + 0.10 × PostgameWPInversion
```

**Spread Bust Factor (25%):** Logarithmic scaling of spread deviation. `score = min(25, 8 × ln(1 + |actual_margin - spread| / 3))`. Bonus: +5 if underdog won outright (not just covered).

**Win Probability Volatility (20%):** Count WP crosses of 50% line. Measure max swing amplitude. Weight 4th quarter swings 2x. `score = min(20, 3 × crosses_50 + 0.5 × max_swing_amplitude + 2 × q4_crosses)`.

**Upset Magnitude (20%):** `score = min(20, 5 × ln(ranking_differential + 1))`. Cross-level bonus: FCS over FBS = +8, D2 over FCS = +5. Unranked over top-5 = +10, over top-10 = +6.

**Excitement Index (15%):** Pull directly from CFBD excitement_index. Normalize to 0-15 scale using historical distribution (mean ~3.5, cap at 10+).

**Context Weight (10%):** Compound multipliers on base 5: rivalry × 1.2, conference championship implications × 1.3, playoff implications × 1.5, late-season (week 10+) × 1.15, postseason × 1.4. Special plays (blocked kicks, safeties, pick-sixes in final minute) × 1.1 each.

**Postgame WP Inversion (10%):** Using CFBD postgame_wp. If the team with <40% postgame WP won: `score = (50 - postgame_wp_of_winner) × 0.2`. If they had >50%, score = 0.

#### Page Sections

**Section 1 — Top Chaos Games (main feature)**
- Expandable card per game, ranked by Chaos Score
- Each card: Chaos Score ring gauge, teams with color accents, score, spread badge, headline, narrative blurb, win probability mini-chart (showing actual in-game WP swings), tags
- Expanded view: full stat breakdown (all 6 component scores), key plays, WP chart full-size
- Tags (auto-assigned): "Giant Killer", "Spread Buster", "Instant Classic", "Blocked Kick", "OT Thriller", "Season Ruiner", "Historic First", "Cinderella", "Defensive Gem", "Shootout", "Rivalry Chaos", "Comeback", "Pick-Six Finish", "Hail Mary"
- Tag assignment rules: "Giant Killer" = unranked beats top-15; "Spread Buster" = beat spread by 20+; "Instant Classic" = excitement_index > 8; "OT Thriller" = went to OT; "Comeback" = winner trailed by 14+ in 2H; "Shootout" = combined score > 80
- **Filter by season (2014–present), by tag, by conference, by level**

**Section 2 — Season Superlatives (16 categories)**

| Category | Icon | What It Measures | Data Source |
|----------|------|-----------------|-------------|
| Comeback Kings | 🏔️ | Most wins when trailing by 14+ pts | Play-by-play WP data |
| Biggest Blowout | 🔨 | Largest margin of victory in FBS/FCS/D2/D3 | Game scores |
| Cardiac Crew | ⏱️ | Most one-score (≤7 pt) wins | Game scores |
| Chaos Agent | 🎰 | Most wins as 10+ pt underdog | Spreads + results |
| Immovable Object | 🧱 | Lowest scoring defense (PPG) | Game scores |
| Track Meet | 💨 | Highest scoring offense (PPG) | Game scores |
| Free Fall | 📉 | Largest year-over-year win decline | Season records |
| Biggest Rise | 🚀 | Largest year-over-year win improvement | Season records |
| OT Specialists | ⏰ | Most overtime games + record | Game data |
| Road Warriors | 🛣️ | Best away record | Game locations |
| Giant Killers | 🗡️ | Most wins as double-digit underdogs | Spreads + results |
| Paper Tigers | 📄 | Best record vs worst advanced metrics gap | GridRank vs record |
| Clutch City | 🎯 | Best record in games decided in final 2 min | WP + time data |
| Turnover Machine | 🌀 | Highest forced turnover rate | Play-by-play |
| 4th Down Gamblers | 🎲 | Most 4th down attempts + conversion rate | Play-by-play |
| Special Teams Chaos | ⚡ | Most non-offensive/defensive TDs | Play-by-play |

**Section 3 — Chaos Calendar**
- Week-by-week heatmap (rows = weeks, intensity = total chaos generated that week)
- Click any week to see all upsets/crazy results from that week
- Year-over-year comparison: "Was 2024 more chaotic than 2023?"
- "Chaos per Week" line chart showing seasonal rhythm

**Section 4 — All-Time Chaos Leaderboard (2014–present)**
- Top 50 most chaotic games across all seasons
- Historical context annotations
- "Was Vanderbilt-Alabama 2024 more chaotic than App State-Michigan 2007?"
- Cross-era normalization (spread availability varies by era)

---

### 9.9 — THE LAB (`/lab`)

#### Purpose
Statistical outliers and anomalies that tell stories the scoreboard can't. Everything measured in z-scores with percentile rankings. "The Ringer meets a Bloomberg terminal for football."

#### Tab 1: Player Outliers (9 categories)

Each player entry shows: name, team, position, headline stat, detail context, z-score badge, percentile bar, and visual showing where they sit in the population distribution.

**Category 1: 🏆 EPA Monsters — Most Dominant Players**
- Metric: Total EPA (season), EPA/play (min 100 snaps)
- Display: Top 10 per position group (QB, RB, WR, TE, EDGE, LB, DB)
- Historical context: compare to best seasons since 2014
- "This season vs all-time" percentile
- Computation: Pull all player EPA from CFBD, compute z-score against position/season peers

**Category 2: 🎯 Surgical Precision — Efficiency Outliers**
- Metrics: Completion % Over Expected (CPOE), success rate by down, red zone efficiency, EPA/play in "passing downs" (2nd & 8+, 3rd & 5+)
- Display: Scatter plot (volume vs efficiency), outlier callouts
- CPOE computation: `CPOE = actual_comp% - expected_comp%` where expected is modeled from air yards, pressure rate, target separation

**Category 3: 💥 Boom or Bust — Variance Kings**
- Metrics: Standard deviation of game-to-game EPA, max-min EPA gap, "explosiveness" (avg EPA on successful plays)
- Display: Game-by-game EPA strip chart showing volatility
- Identify: Players elite in one metric but terrible in another (high YPC but low success rate)

**Category 4: 🛡️ Wrecking Balls — Defensive Havoc Leaders**
- Metrics: Havoc rate (TFL + FF + INT + PBU / plays), pressure rate, defensive EPA, DB havoc rate
- Display: Radar chart per player (havoc, pressure, coverage, run stop)
- "Ghost" defenders: elite havoc rate but low tackle numbers (disrupt without finishing)

**Category 5: 🔮 Clutch Factor — 4th Quarter Heroes**
- Metrics: Q4 + OT EPA, WPA (Win Probability Added) leaders, performance when team WP < 30%, game-winning drive count
- Display: Clutch moments timeline showing specific high-WPA plays
- Context: 3rd/4th down conversion rate, red zone performance, 2-minute drill EPA

**Category 6: 🎭 Dr. Jekyll / Mr. Hyde — Split Personality**
- Metrics: Home vs away EPA splits, first half vs second half, performance vs ranked opponents vs unranked, conference vs non-conference
- Display: Side-by-side bar comparisons highlighting dramatic gaps
- Threshold: Flag players with > 1.5σ difference between splits

**Category 7: 📈 Breakout Tracker — Rate of Improvement**
- Metrics: EPA improvement from first 4 games to last 4 games of season
- Display: "Before and After" comparison cards
- Sub-category: True freshman outliers (best first-year players)
- Historical comps: "Player X's improvement curve matches [notable player]'s trajectory"

**Category 8: ⚡ Speed Demons — Explosive Play Leaders**
- Metrics: Plays of 20+ yards, plays of 40+ yards, yards after catch / yards after contact, breakaway rate (% of carries/catches going 15+ yards)
- Display: Highlight reel statistics + sparklines
- Position-adjusted (RB breakaway rate vs WR breakaway rate on different scales)

**Category 9: 🎲 Luck vs Skill — Regression Candidates**
- Metrics: QB INT rate vs turnover-worthy play rate (high INT + low TWP = unlucky; low INT + high TWP = regression coming), fumble recovery rate vs expected (50%), pass catchers' contested catch rate sustainability
- Display: "Lucky" and "Unlucky" columns with projected regression
- Historical validation: "Players in this position historically regressed by X% the following year"

#### Tab 2: Team Anomalies (8 categories)

**Category 1: Offensive Identity Matrix**
- Interactive scatter: Rush EPA/play (x) vs Pass EPA/play (y)
- Quadrants labeled: "Balanced Elite" (top-right), "Ground & Pound" (right-only), "Air Raid" (top-only), "Struggling" (bottom-left)
- Click any dot → team offensive fingerprint (rush/pass tendency by down, by game situation)
- Year-over-year trajectory arrows

**Category 2: Luck vs Skill Dashboard**
- Scatter: Actual wins (x) vs Expected wins (y, from postgame WP model)
- Above diagonal = "lucky" (won more than metrics suggest)
- Includes: turnover margin luck, fumble recovery rate vs 50%, close-game record vs expected
- Historical regression callout: "Teams in BYU's position historically lost X wins the following year"
- Predictive: "If luck normalizes, projected record would be..."

**Category 3: The Efficiency Disconnect**
- Teams where EPA dramatically diverges from scoring
- "Move the ball but can't score" = high total EPA but low red zone TD%
- "Bend don't break" = high yards allowed but low points allowed
- Field position impact analysis

**Category 4: Defensive Anomalies**
- Havoc rate vs points allowed scatter
- 3rd down stop rate leaders and laggards
- Red zone defense efficiency
- Garbage time correction: show stats with and without garbage time

**Category 5: Schedule Difficulty Visualizer**
- Each team's schedule as a "mountain range" (peaks = opponent GridRank)
- "Gauntlet Index" — longest streak against above-average opponents
- "Cupcake Ratio" — % schedule below 25th percentile
- Strength of wins vs strength of losses

**Category 6: Pace & Style Matrix**
- Scatter: Plays per game (x) vs EPA/play (y)
- Quadrants: "Fast & Good" (Oregon), "Fast & Sloppy", "Slow & Dominant" (Navy), "Slow & Bad"
- Tempo flexibility: teams that speed up when trailing, slow down with leads

**Category 7: Conference Deep Dive**
- Intra-conference competitive balance (σ of team ratings within conference)
- Cross-conference performance matrix (conf A vs conf B win rate)
- Which conference overperformed/underperformed preseason projections most?

**Category 8: The Regression Report**
- Teams most likely to improve next year: returning production %, recruiting class strength, luck metrics reverting, close-game regression
- Teams most likely to decline: same factors in reverse
- Historical comps: "Teams matching this profile historically went X-Y"

#### Quick Hits — By The Numbers
- Grid of 6 eye-catching individual statistics with full historical context
- Format: huge number → unit → context sentence
- Pulls the most extreme stats from across all categories

---

### 9.10 — HEAD-TO-HEAD MATCHUP MACHINE (`/matchup`)

The viral feature. Only possible because GridRank ranks ALL levels on one scale.

**Flow:**
1. User selects Team A and Team B (autocomplete across all ~1,400 teams, any level)
2. Home/away/neutral toggle
3. GridRank WP computation → Monte Carlo (1,000 sim runs) → predicted score distribution

**Display:**
- Win Probability Bar (large, animated fill, shows %)
- Predicted Score with confidence interval (e.g., "Oregon 34, Montana 17 ± 8")
- Score Distribution Chart: histogram of simulated outcomes
- Radar Comparison (6 axes): Offense, Defense, SOS, Consistency, Explosiveness, Havoc
- Auto-generated narrative: "Oregon's defensive EPA (-0.28/play) would overwhelm Montana's offense, which averages only 0.04 EPA/play against FBS-caliber defenses..."
- Cross-level insight: "Montana's GridRank (1287) is higher than 14 FBS teams including..."
- Historical context: most similar-rated matchups and their results
- Share button → generates OG image with both teams, score, and WP for social sharing

**Cross-level magic:** "Could Mount Union beat Kansas?" — show the rating gap, translate to predicted spread, contextualize ("This gap is similar to #1 vs #80 in FBS")

---

### 9.11 — "WHAT IF" SCENARIO ENGINE (`/what-if`)

Change game outcomes → watch the entire ranking recalculate in real time.

**Flow:**
1. Select season + week range
2. Game grid shows all games as toggleable cards
3. Click to flip winner, drag slider to set margin
4. "Recalculate" button → live re-ranking with animated transitions
5. See the butterfly effect cascade through the system

**Display:**
- Diff View: "Actual" vs "Your Scenario" columns, highlighted movers (green/red arrows)
- Cascade Tracker: visual chain showing how one changed result ripples through SOS and rankings
- Playoff Impact Panel: CFP probability changes for all affected teams
- Share: "In my universe, Alabama is still #1" → shareable link/image

**Tech approach:** Client-side lightweight approximation for instant feedback (pre-computed sensitivity matrices showing how each game affects each team's rank). Async full server-side GridRank for precise numbers if user requests it.

---

### 9.12 — LIVE GAMEDAY DASHBOARD (`/gameday`)

The Saturday command center. Why fans come to the site every week.

**Data:** Live scores via CFBD or ESPN unofficial API, polling every 60 seconds during game windows.

**Layout:**
- **Scoreboard Ribbon:** Horizontal scroll of all live games with mini WP bars
- **Featured Game Panel:** Full live WP chart, running EPA, key play feed with EPA annotations
- **"If This Holds..." Sidebar:** Real-time ranking projections based on current scores
- **Upset Alert Panel:** Underdogs currently winning, sorted by spread deviation, pulsing red animation
- **Chaos Score Live:** Running chaos score computation for the day's most chaotic game
- **Filters:** All Games / Top 25 / Upset Watch / My Conference / Rivalry Games
- **Post-game wrap:** Final scores with GridRank impact (projected rank change)
- **Toast notifications:** Push notification-style banners for major upsets, top-10 losses
- **CHAOS ALERT banner:** Full-width animated banner when a top-10 team is losing to an unranked opponent

---

### 9.13 — COACH INTELLIGENCE REPORT (`/coaches`)

Analytics-graded coaching decisions for every FBS coach. The coaching accountability page.

**Decision Model (adapted from Baldwin/cfbfastr):**

For each 4th down, 2-point attempt, and key timeout: compute the WP-optimal decision given the full game state (score, time, down, distance, yard line, timeouts, home/away, spread context, 2H kickoff).

```
Coach Grade = 50 + (net_WP_gained × scaling_factor)
  where scaling_factor normalizes so 50 = average, 70+ = elite, 30- = poor

Sub-grades:
  4th Down:  aggression rate + accuracy when going for it + WP gain/loss
  2-Point:   frequency vs optimal + conversion rate
  Timeouts:  wasted timeouts, late-game management
  Clock:     end-of-half management, kill-clock efficiency
```

**Page Layout:**

**Leaderboard view:** All FBS coaches ranked by overall grade. Columns: Name, Team, Grade (color-coded), 4th Down Grade, Aggression %, Net WP, Decisions Count. Sortable by any column.

**Coach Detail (`/coaches/[slug]`):**
- Grade trend sparkline (week-by-week)
- Every logged decision: situation, decision made, optimal decision, WP impact, outcome
- "Worst Decisions" and "Best Decisions" callouts
- Tendencies: aggression by score differential, by field position, by game time
- Year-over-year comparison
- Conference ranking among peers

**"Ask The Bot" Calculator:**
- Users enter a 4th-down situation (score, time, yard line, distance, timeouts)
- Model outputs: recommended decision, WP for going-for-it vs punting vs FG, and break-even conversion probability

---

### 9.14 — THE GAUNTLET (`/gauntlet`)

Remaining schedule difficulty visualizer. Updated weekly. The "who has the hardest path forward" page.

**Layout:**
- **Ranking:** All teams by remaining SOS (average GridRank of future opponents)
- **Difficulty Mountain:** Each team's remaining schedule as a mountain range. Peaks = opponent GridRank. Color = home (blue) / away (red) / neutral (gray). Width = number of games remaining.
- **Playoff Path Simulator:** "To make the CFP, Team X likely needs to win at least Y of these Z remaining games." Shows probability of making playoffs under various win scenarios.
- **Conference Race Impact:** "If Team A wins out, here's what happens to the conference standings"
- **Danger Calendar:** Week-by-week view of the most dangerous upcoming games for ranked teams
- **Historical Comparison:** "This remaining schedule is harder than any remaining schedule since 2018"

---

### 9.15 — HEISMAN & AWARDS TRACKER (`/awards`)

Statistical prediction model for 10 major awards.

**Awards tracked:** Heisman, Maxwell, Biletnikoff, Thorpe, Doak Walker, Davey O'Brien, Outland, Butkus, Bednarik, Ray Guy.

**Prediction Model:**
```
Award_Probability =
    0.40 × Statistical Score       (EPA, z-score vs position peers)
  + 0.25 × Team Success Factor     (GridRank rank, wins, national relevance)
  + 0.20 × Narrative Score         (sentiment engine buzz, media mentions, viral moments)
  + 0.15 × Historical Precedent    (Bayesian prior from past voting patterns — what stats did past winners have at this point?)
```

**Page Layout:**
- **Heisman Race Hero:** Top 5 candidates with probability bars + trend sparklines (week-by-week)
- **Award-by-Award Tabs:** Each of 10 awards with top candidates
- **Probability Timeline:** Line chart per candidate showing odds over the season
- **"What Does He Need?"** Path scenarios: "If Jeanty rushes for 150+ in each remaining game and Boise State wins out, his probability reaches 78%"
- **Model Accuracy Backtesting:** How well did the model predict past winners?
- **Dark Horses:** Fastest-rising candidates outside top 5
- **Historical Comps:** "At this point in 2019, Joe Burrow had similar numbers to Cam Ward"

---

### 9.16 — RIVALRY PAGES (`/rivalries` + `/rivalry/[slug]`)

Dedicated analytics for ~30+ major rivalries. High emotional engagement + great SEO.

**Rivalry Index page (`/rivalries`):**
- All rivalries ranked by Rivalry Intensity Score
- `Intensity = 0.25×historical_closeness + 0.20×sentiment_volatility + 0.20×stakes_frequency + 0.20×fan_engagement + 0.15×tradition_significance`
- Cards with both team logos, name/trophy, recent result, series record
- Filter: by conference, by tier (legendary/major/notable)
- Upcoming rivalry games section

**Individual Rivalry Page (`/rivalry/[slug]`):**
- Hero: both logos/colors, rivalry name, trophy image/name
- Series record (2014–present) with margin chart
- Streak tracker: current streak + longest streaks in CFP era
- Game-by-game: every matchup with score, Chaos Score, rankings at time, tags
- Sentiment Showdown: pre-game and post-game fan sentiment comparison for each meeting
- Comparative analytics: side-by-side GridRank, recruiting talent, portal balance, coaching grades
- Next matchup prediction with WP + spread
- Greatest moments: top 3 chaos games in this rivalry highlighted
- Head-to-head trends: "Michigan has won the last 4, but Ohio State has the higher average GridRank in 3 of those years"

**Rivalry Database (seed these ~35):**
Michigan-Ohio State ("The Game"), Alabama-Auburn ("Iron Bowl"), Army-Navy, USC-UCLA, Florida-Georgia ("WLOCP"), Texas-Oklahoma ("Red River"), Ohio State-Penn State, Clemson-South Carolina ("Palmetto Bowl"), Florida-Florida State, Michigan-Michigan State, Oregon-Oregon State ("Civil War"), Georgia-Georgia Tech ("Clean Old-Fashioned Hate"), Harvard-Yale ("The Game"), Notre Dame-USC, Texas-Texas A&M, Oklahoma-Oklahoma State ("Bedlam"), Wisconsin-Minnesota (Paul Bunyan's Axe), Iowa-Iowa State (Cy-Hawk), NC State-UNC, Virginia-Virginia Tech, Pitt-West Virginia (Backyard Brawl), Stanford-Cal ("Big Game"), BYU-Utah ("Holy War"), Colorado-Colorado State (Rocky Mountain Showdown), Boise State-Fresno State, App State-Georgia Southern, Montana-Montana State (Brawl of the Wild), NDSU-SDSU (Dakota Marker), and more.

---

### 9.17 — ROSTER INTELLIGENCE (`/roster-intel`)

NOT just portal tracking. A comprehensive talent pipeline analyzer covering high school recruiting, transfer portal, and player development.

#### Tab A: Talent Composite Rankings

Every team ranked by total roster talent — combining recruiting AND portal AND development.

```
Talent Score =
    0.30 × Blue Chip Ratio (% of roster that was 4- or 5-star recruit)
  + 0.25 × On-Field Production (sum career EPA of all active players)
  + 0.20 × Recruiting Class Composite (avg 247 composite of last 3 classes)
  + 0.15 × Portal Acquired Talent (sum EPA of incoming transfers)
  + 0.10 × Development Grade (avg EPA improvement of retained players year-over-year)
```

**Display:**
- National ranking with breakdown bars (show which component contributes most)
- Talent vs Performance scatter: teams above the line = well-coached (outperforming talent), below = underperforming
- "Best-Coached" leaderboard: biggest positive delta between talent rank and GridRank
- "Wasted Talent" leaderboard: biggest negative delta

#### Tab B: Transfer Portal War Room

**Portal Leaderboard:** Teams ranked by net EPA gained/lost through portal.

**Sankey Diagram:** Player flow between conferences and programs. Width = player count or total EPA. Interactive — hover to see individual transfers.

**Individual Transfer Table (sortable):** Player, position, from, to, recruit stars, previous EPA, new EPA, EPA delta, impact rating. Search + filter by position, conference, stars.

**Portal ROI per team:** `ROI = post_transfer_EPA / recruit_rating_of_acquired_players`. Who gets the most bang for their portal buck?

**Winners/Losers:** Top 5 portal winners and losers each cycle with narrative.

**Historical Portal Success Rate per school:** "Alabama converts 72% of portal additions into positive-EPA starters vs national average of 48%."

**Level Migration Tracker:** FCS→FBS success rate by tier jump. D2→FCS rate. "Players jumping from FCS to Power 5 average 0.02 EPA/play lower than P5 natives."

#### Tab C: Recruiting & Development

**Class Rankings:** Current cycle + historical (2014–present) pulled from CFBD recruiting endpoints. Average star rating, total composite points, class rank.

**Stars-to-Starters Pipeline:** For each star level (5★, 4★, 3★, 2★, walk-on):
- What % become starters by Year 2? Year 3?
- What % achieve positive EPA?
- What % get drafted?
- Breakdown by position group

**Development Grade:** Year-over-year EPA improvement for players who stay. "Program X improves its players' EPA by an average of +0.08/play per year, ranking 12th nationally."

**Low-Star Overperformers:** 2-3 star recruits playing at 4-5 star EPA levels. The "diamonds in the rough" finder.

**State Pipeline Map:** Interactive US map showing:
- Which states produce the most college talent
- Which schools dominate recruiting in which states
- Color-coded by team (in Texas, show how recruits split between Texas, A&M, Baylor, TCU, etc.)

**Class-over-Class Trajectory:** Is the program trending up or down in recruiting? 3-year moving average with arrow direction.

---

### 9.18 — THE STACK (`/stack`)

Auto-generated weekly digest. Serves as both a page on the site AND an email newsletter.

**Content (auto-generated every Sunday via cron):**
1. **Rankings Movers** — Top 5 risers + top 5 fallers with context
2. **Game of the Week** — Highest Chaos Score game with narrative recap
3. **Chaos Report** — Top 3 chaos games + any new all-time leaderboard entries
4. **Prediction Scorecard** — GridRank accuracy this week + cumulative + vs Vegas
5. **Lab Highlights** — Most extreme outlier performances of the week
6. **Coaching Decision of the Week** — Best + worst call (with WP numbers)
7. **Award Race Update** — Heisman probability shifts + any new dark horses
8. **Sentiment Seismograph** — Biggest positive and negative sentiment shifts
9. **Gauntlet Update** — Schedule difficulty changes as games are played
10. **Looking Ahead** — Next week's top games with predictions

**Pipeline:**
```
Sunday 6:00 AM  — Final data ingest from Saturday games
Sunday 7:00 AM  — Recompute: GridRank, Chaos, Lab, Coach, Awards, Gauntlet
Sunday 8:00 AM  — Stack generator assembles digest from all engines
Sunday 8:30 AM  — Publish page + send email newsletter via Resend
```

**Email template:** Clean HTML email with the same dark theme, linking back to full pages for each section. Responsive for mobile email clients.

---

## 10. IMPLEMENTATION PHASES (18-WEEK ROADMAP)

### Phase 1: Foundation (Week 1-2)
```
- [ ] Initialize Next.js 14 + TypeScript + Tailwind + Prisma
- [ ] Configure Supabase PostgreSQL + Upstash Redis
- [ ] Implement full database schema (all tables from Section 7)
- [ ] Build CFBD API integration layer (lib/cfbd/)
- [ ] Seed historical data: all teams, conferences, games (2014–present, all levels)
- [ ] Implement basic GridRank (simplified Bayesian, single-level first)
- [ ] Build Homepage rankings table with filters and sparklines
- [ ] Build basic Team Page (hero, stats grid, game log)
- [ ] Deploy to Vercel
- [ ] Set up frontend-design skill aesthetic (colors, fonts, dark theme)
```

### Phase 2: Full Rankings & Viz (Week 3-4)
```
- [ ] Full Bayesian GridRank engine with cross-level calibration
- [ ] Convergence algorithm (iterative team → conference → level)
- [ ] Team Page: all visualizations (D3 season timeline, SOS viz, historical chart)
- [ ] Conference Pages (strength, heatmap, head-to-head matrix)
- [ ] Framer Motion animations + responsive design pass
- [ ] Rankings accuracy tracking system
```

### Phase 3: Historical & Programs (Week 5-6)
```
- [ ] Historical rankings computation (run GridRank for every season 2014–present)
- [ ] GridLegacy algorithm + Program Rankings page
- [ ] Compare programs feature (select 2-4, side-by-side radar)
- [ ] Methodology page (casual + deep dive modes)
- [ ] Historical trend charts on Team Pages
```

### Phase 4: Predictions & Interactive Tools (Week 7-8)
```
- [ ] Prediction system: game-level WP from GridRank ratings
- [ ] Monte Carlo season simulator (10,000 runs)
- [ ] Predictions page: weekly cards, playoff tracker, accuracy scoreboard
- [ ] HEAD-TO-HEAD MATCHUP MACHINE: team selector, WP computation, radar, narrative gen, share card
- [ ] "WHAT IF" SCENARIO ENGINE: game grid, flip winners, diff view, cascade tracker, playoff impact
- [ ] Client-side sensitivity matrices for instant feedback
```

### Phase 5: Sentiment & Pulse (Week 8-10)
```
- [ ] Python NLP microservice on Railway
- [ ] Scraping pipeline: Reddit API, Google News RSS, forums
- [ ] NLP processing: sentiment classification, entity extraction, player buzz
- [ ] Player buzz z-score detection system
- [ ] Sentiment data into team_sentiment + player_sentiment tables
- [ ] Sentiment panels on Team Pages
- [ ] PULSE page: trending teams, player buzz board, controversy tracker
- [ ] Cron scheduling (every 6-12 hours)
```

### Phase 6: Chaos Index & The Lab (Week 10-11)
```
- [ ] Chaos Score computation engine (all 6 components)
- [ ] Season superlatives computation (all 16 categories)
- [ ] Chaos tag auto-assignment system
- [ ] CHAOS INDEX page: game cards, WP charts, superlatives grid, calendar, all-time leaderboard
- [ ] Player outlier detection engine (all 9 categories, z-scores, percentiles)
- [ ] Team anomaly detection engine (all 8 categories)
- [ ] THE LAB page: Player Outliers tab, Team Anomalies tab, Quick Hits
- [ ] Run engines on historical data (2014–present)
```

### Phase 7: Coach Intelligence & Awards (Week 12-13)
```
- [ ] 4th-down decision model (adapt cfbfastr/go-for-it methodology)
- [ ] Decision extraction from CFBD play-by-play data
- [ ] Coach grade computation engine (overall + 4 sub-grades)
- [ ] COACH INTELLIGENCE page: leaderboard, coach detail, "Ask The Bot" calculator
- [ ] Award prediction model (4-component weighted score)
- [ ] Historical award winner data for backtesting
- [ ] AWARDS TRACKER page: Heisman race hero, all 10 awards, timeline, paths
```

### Phase 8: Roster Intelligence (Week 13-14)
```
- [ ] Players table: seed from CFBD recruiting + roster endpoints
- [ ] Transfer portal data: player_transfers from CFBD transfer endpoint
- [ ] Talent composite algorithm (5-component weighted score)
- [ ] Portal ROI computation + development grade
- [ ] Stars-to-starters pipeline analysis
- [ ] ROSTER INTELLIGENCE page: Tab A (Composite), Tab B (Portal War Room), Tab C (Recruiting & Dev)
- [ ] State pipeline map (interactive US map)
```

### Phase 9: Gauntlet, Rivalries & Gameday (Week 15-16)
```
- [ ] Remaining SOS engine (recomputes weekly)
- [ ] THE GAUNTLET page: difficulty mountains, playoff paths, danger calendar
- [ ] Rivalry database seed (~35 rivalries with metadata)
- [ ] RIVALRY PAGES: index + individual rivalry pages
- [ ] Live score polling system (60-second intervals during game windows)
- [ ] GAMEDAY DASHBOARD: scoreboard ribbon, featured game, upset alerts, chaos live, toast notifications
```

### Phase 10: The Stack, Polish & Launch (Week 17-18)
```
- [ ] Digest auto-generation pipeline (Sunday morning cron)
- [ ] THE STACK page + email newsletter via Resend
- [ ] Performance optimization: ISR caching, lazy loading, image optimization
- [ ] SEO: meta tags, OG images (dynamic for matchups/teams), sitemaps, structured data
- [ ] Error handling + monitoring (Sentry or similar free tier)
- [ ] Mobile polish pass on all 18 pages
- [ ] Dark/light mode toggle
- [ ] Social sharing (OG card generation for matchups, rankings, chaos games)
- [ ] Analytics integration (Vercel Analytics or Plausible)
- [ ] Final design review against mockup
- [ ] LAUNCH 🚀
```

---

## 11. BUDGET

| Service | Monthly |
|---------|---------|
| Vercel (free tier) | $0 |
| Supabase (free tier) | $0 |
| Upstash (free tier) | $0 |
| Railway (Python) | $5 |
| Resend (free tier) | $0 |
| CFBD API | Already have |
| Domain | ~$1 |
| Buffer | ~$25-50 |
| **Total** | **~$30-60/month** |

At scale: Supabase Pro ($25) + Vercel Pro ($20) + Railway ($15) + Resend Pro ($20) = ~$80-95/month

---

## 12. CLAUDE CODE SESSION GUIDE

### File Structure
```
gridiron-intel/
├── src/
│   ├── app/                        # All 18 pages
│   │   ├── page.tsx                # Rankings (homepage)
│   │   ├── team/[slug]/page.tsx
│   │   ├── conference/[slug]/page.tsx
│   │   ├── programs/page.tsx
│   │   ├── predictions/page.tsx
│   │   ├── methodology/page.tsx
│   │   ├── pulse/page.tsx
│   │   ├── chaos/page.tsx
│   │   ├── lab/page.tsx
│   │   ├── matchup/page.tsx
│   │   ├── what-if/page.tsx
│   │   ├── gameday/page.tsx
│   │   ├── coaches/page.tsx
│   │   ├── coaches/[slug]/page.tsx
│   │   ├── gauntlet/page.tsx
│   │   ├── awards/page.tsx
│   │   ├── rivalries/page.tsx
│   │   ├── rivalry/[slug]/page.tsx
│   │   ├── roster-intel/page.tsx
│   │   ├── stack/page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                     # Shared: buttons, badges, cards, modals
│   │   ├── charts/                 # Sparkline, WPChart, RadarChart, MiniBar, ChaosRing, MountainChart
│   │   ├── rankings/               # RankingsTable, RankRow, FilterBar
│   │   ├── team/                   # TeamHero, StatsGrid, GameLog, SeasonTimeline
│   │   ├── chaos/                  # ChaosCard, ChaosScoreRing, WPMiniChart, SuperlativeCard, ChaosCalendar
│   │   ├── lab/                    # OutlierCard, ZScoreBadge, PercentileBar, AnomalyCard, IdentityMatrix
│   │   ├── matchup/                # TeamSelector, WPBar, ScoreDistribution, RadarComparison
│   │   ├── coaches/                # CoachCard, DecisionLog, GradeBreakdown, SituationCalculator
│   │   ├── roster/                 # TalentBar, PortalSankey, StateMap, StarsChart, DevelopmentGrade
│   │   ├── sentiment/              # SentimentGauge, BuzzBadge, TrendLine
│   │   ├── gameday/                # ScoreboardRibbon, LiveWPChart, UpsetAlert, ChaosAlertBanner
│   │   └── nav/                    # Navbar, Footer, MobileMenu
│   ├── lib/
│   │   ├── cfbd/                   # API client, data fetchers, type mappings
│   │   ├── gridrank/               # Bayesian engine, cross-level calibration, convergence
│   │   ├── gridlegacy/             # Program power index computation
│   │   ├── chaos/                  # Chaos score engine, tag assignment, superlatives
│   │   ├── lab/                    # Outlier detection, z-score computation, anomaly detection
│   │   ├── coaches/                # Decision model, grade computation, situation calculator
│   │   ├── awards/                 # Award prediction model, historical comp matching
│   │   ├── roster/                 # Talent composite, portal ROI, development grade, pipeline
│   │   ├── matchup/                # Monte Carlo matchup simulator
│   │   ├── whatif/                 # Scenario engine, sensitivity matrices
│   │   ├── gauntlet/               # Remaining SOS, playoff path scenarios
│   │   ├── stack/                  # Digest generator, email template
│   │   ├── sentiment/              # NLP integration, buzz detection
│   │   └── db/                     # Prisma client, query helpers
│   ├── types/                      # All TypeScript interfaces
│   └── styles/                     # Any non-Tailwind CSS
├── services/
│   └── sentiment/                  # Python NLP microservice
│       ├── main.py
│       ├── scraper.py
│       ├── nlp_pipeline.py
│       ├── buzz_detector.py
│       └── requirements.txt
├── scripts/
│   ├── seed-teams.ts
│   ├── seed-games.ts
│   ├── seed-recruiting.ts
│   ├── seed-rivalries.ts
│   ├── compute-gridrank.ts
│   ├── compute-gridlegacy.ts
│   ├── compute-chaos.ts
│   ├── compute-outliers.ts
│   ├── compute-coach-grades.ts
│   ├── compute-awards.ts
│   ├── compute-talent.ts
│   ├── compute-gauntlet.ts
│   ├── generate-stack.ts
│   └── backfill-historical.ts
├── prisma/schema.prisma
└── docs/methodology.md
```

### Session Prompts (Phase by Phase)

**Session 1 (Phase 1):**
```
Read the master implementation plan at [path]. Start Phase 1: Foundation.
Initialize Next.js 14 + TypeScript + Tailwind + Prisma. Set up full database
schema from Section 7. Build CFBD API integration. Use the frontend-design
skill. Aesthetic: "Data-Forward Editorial" — dark navy (#0a0e17), electric
teal (#00f5d4), Instrument Serif headlines, Courier Prime for stats.
```

**Session 2 (Phase 1 cont.):**
```
Continue Phase 1. Seed historical data from CFBD API (2014-present, all levels).
Implement basic GridRank (Section 3 — start with simplified single-level Bayesian).
Build homepage rankings table with filters, sparklines, expandable rows.
Build basic team page with hero and stats grid. Deploy to Vercel.
```

**Session 3 (Phase 2):**
```
Phase 2: Full GridRank engine with cross-level calibration per Section 3.
Implement convergence algorithm. Build all Team Page visualizations using
D3/Recharts. Build Conference Pages. Add Framer Motion animations.
```

**Session 4 (Phase 3):**
```
Phase 3: Run GridRank historically for 2014-present. Implement GridLegacy
(Section 4). Build Program Rankings page with radar charts and compare tool.
Build Methodology page with casual + deep dive modes.
```

**Session 5 (Phase 4):**
```
Phase 4: Prediction system + Monte Carlo. Build Predictions page.
Build Matchup Machine (Section 9.10) — team selector, WP bar, radar,
narrative generation, social share card. Build What If Engine (Section 9.11)
— game grid, diff view, cascade tracker, playoff impact.
```

**Session 6 (Phase 5):**
```
Phase 5: Python sentiment microservice. Set up Railway deployment.
Scraping: Reddit API + Google News RSS. NLP: HuggingFace sentiment +
entity extraction. Player buzz z-score detection. Build Pulse page (Section 9.7).
Wire sentiment to Team Pages. Set up cron jobs.
```

**Session 7 (Phase 6):**
```
Phase 6: Chaos Score engine (Section 9.8 — all 6 components with exact
formulas). Season superlatives (16 categories). Tag auto-assignment.
Build Chaos Index page. Player outlier engine (Section 9.9 — 9 categories).
Team anomaly engine (8 categories). Build The Lab page with both tabs.
Run on all historical seasons.
```

**Session 8 (Phase 7):**
```
Phase 7: 4th-down decision model (Section 9.13). Extract decisions from
CFBD play-by-play. Coach grade engine. Build Coach Intelligence page with
leaderboard, detail pages, and "Ask The Bot" calculator. Award prediction
model (Section 9.15). Build Awards Tracker with all 10 awards.
```

**Session 9 (Phase 8):**
```
Phase 8: Roster Intelligence (Section 9.17). Seed players table from CFBD
recruiting + roster endpoints. Transfer portal data. Talent composite
algorithm. Portal ROI + development grade. Stars-to-starters analysis.
Build all 3 tabs: Composite Rankings, Portal War Room, Recruiting & Development.
Build state pipeline map.
```

**Session 10 (Phase 9):**
```
Phase 9: Remaining SOS engine. Build Gauntlet page (Section 9.14) with
difficulty mountains and playoff path simulator. Seed rivalry database (~35).
Build Rivalry pages (Section 9.16) — index + individual. Set up live score
polling. Build Gameday Dashboard (Section 9.12) with scoreboard ribbon,
WP charts, upset alerts, chaos alerts, toast notifications.
```

**Session 11 (Phase 10):**
```
Phase 10: Stack auto-generation (Section 9.18) — Sunday cron pipeline.
Email newsletter via Resend. Performance optimization: ISR, caching,
lazy loading. SEO: meta, OG images, sitemaps, structured data.
Mobile polish on all 18 pages. Dark/light toggle. Social sharing.
Analytics. Final review. Launch.
```

---

## APPENDIX: COMPETITIVE DIFFERENTIATION

| Feature | ESPN | SP+ | Massey | PFF | **Gridiron Intel** |
|---------|------|-----|--------|-----|-------------------|
| All-level unified rankings | ❌ | ❌ | ❌ | ❌ | ✅ |
| Cross-level matchup machine | ❌ | ❌ | ❌ | ❌ | ✅ |
| What-If scenario engine | ❌ | ❌ | ❌ | ❌ | ✅ |
| Chaos/upset analytics | ❌ | ❌ | ❌ | ❌ | ✅ |
| Statistical outlier detection | ❌ | ❌ | ❌ | Partial | ✅ |
| Coach decision grading | ❌ | ❌ | ❌ | Partial | ✅ |
| Comprehensive talent pipeline | ❌ | ❌ | ❌ | Partial | ✅ |
| Fan sentiment integration | ❌ | ❌ | ❌ | ❌ | ✅ |
| Award prediction model | ❌ | ❌ | ❌ | ❌ | ✅ |
| Rivalry deep dives | ❌ | ❌ | ❌ | ❌ | ✅ |
| Live gameday dashboard | Partial | ❌ | ❌ | ❌ | ✅ |
| Auto weekly digest | ❌ | ❌ | ❌ | ❌ | ✅ |
| Open methodology | Partial | Partial | ✅ | ❌ | ✅ |
| Free to access | ✅ | ❌ | ✅ | ❌ | ✅ |

---

*Master Plan v3.0 — February 24, 2026. 18 features. 18 weeks. One vision. Ready to build.*
*This document supersedes V1, V2, and all addenda. Hand to Claude Code and go.*
