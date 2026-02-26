"use client";

/**
 * Methodology Content — Client component with casual/deep-dive toggle
 */

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  BookOpen,
  Calculator,
  TrendingUp,
  Shield,
  Zap,
  Home,
  Clock,
  BarChart3,
  AlertTriangle,
  ChevronRight,
  Users,
  MapPin,
  Mountain,
  Volume2,
} from "lucide-react";

type Mode = "casual" | "deep";

// =============================================================================
// SECTION DATA
// =============================================================================

interface Section {
  id: string;
  icon: React.ElementType;
  title: string;
  casualTitle?: string;
}

const sections: Section[] = [
  { id: "overview", icon: BookOpen, title: "What is GridRank?" },
  { id: "glicko2", icon: Calculator, title: "The Rating Engine", casualTitle: "How Ratings Move" },
  { id: "margin", icon: TrendingUp, title: "Margin of Victory", casualTitle: "Why Blowouts Matter Less" },
  { id: "garbage", icon: Clock, title: "Garbage Time Filter", casualTitle: "Ignoring Junk Points" },
  { id: "hfa", icon: Home, title: "Home Field Advantage", casualTitle: "Home Cooking" },
  { id: "preseason", icon: Users, title: "Preseason Priors", casualTitle: "Starting Ratings" },
  { id: "crosslevel", icon: Shield, title: "Cross-Level Play", casualTitle: "FBS vs. Everyone Else" },
  { id: "display", icon: BarChart3, title: "Reading the Numbers" },
  { id: "faq", icon: AlertTriangle, title: "FAQ" },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function MethodologyContent() {
  const [mode, setMode] = useState<Mode>("casual");
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="border-b border-bg-elevated">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-teal/10 border border-accent-teal/20">
                <Calculator className="w-3.5 h-3.5 text-accent-teal" />
                <span className="text-xs font-medium text-accent-teal tracking-wide uppercase">
                  Methodology
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-text-primary">
                How GridRank Works
              </h1>
              <p className="text-text-secondary max-w-2xl text-lg">
                The first rating system that puts every college football team in America on one
                unified list. FBS, FCS, D2, D3, NAIA — ranked together, compared fairly.
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex-shrink-0">
              <div className="inline-flex items-center rounded-lg bg-bg-card border border-bg-elevated p-1">
                <button
                  onClick={() => setMode("casual")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                    mode === "casual"
                      ? "bg-accent-teal text-bg-primary"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <BookOpen className="w-4 h-4" />
                  Plain English
                </button>
                <button
                  onClick={() => setMode("deep")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                    mode === "deep"
                      ? "bg-accent-purple text-white"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <Calculator className="w-4 h-4" />
                  Deep Dive
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Nav */}
          <nav className="lg:w-64 flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const title =
                  mode === "casual" && section.casualTitle
                    ? section.casualTitle
                    : section.title;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      document
                        .getElementById(section.id)
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left transition-colors",
                      activeSection === section.id
                        ? "bg-bg-card text-accent-teal border border-bg-elevated"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-card/50"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {title}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Main Content */}
          <div className="flex-1 max-w-3xl space-y-16">
            {/* Overview */}
            <ContentSection id="overview">
              <SectionHeader icon={BookOpen} title="What is GridRank?" />
              {mode === "casual" ? (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    GridRank is a computer rating system that ranks every college football team in
                    America on one list. Not just the 134 FBS teams you see on ESPN — all of them.
                    FCS schools like North Dakota State, Division II powerhouses like Ferris State,
                    D3 juggernauts like Mount Union, and NAIA programs too. Over 680 teams, one
                    list.
                  </p>
                  <p className="text-text-secondary leading-relaxed">
                    The system is built on Glicko-2, a rating algorithm originally designed for
                    chess. It tracks three things for every team: how good they are, how sure we are
                    about that, and how consistently they perform. When two teams play, both
                    ratings update based on the result — and a bunch of smart adjustments we will
                    walk through below.
                  </p>
                  <Callout color="teal" title="The Big Idea">
                    Most ranking systems only rank FBS teams, treating the other 550+ programs as
                    afterthoughts. GridRank uses cross-level games (like FBS hosting FCS) as bridges
                    to connect all levels onto one scale. When James Madison moved from FCS to FBS,
                    we already knew where they stood.
                  </Callout>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    GridRank is a modified Glicko-2 rating system (Glickman, 2013) extended with
                    margin-of-victory compression, dynamic home-field advantage, garbage-time
                    filtering, and cross-level bridging. It processes results from all NCAA
                    divisions and NAIA to produce a single unified ranking.
                  </p>
                  <p className="text-text-secondary leading-relaxed">
                    Each team carries a triplet: rating ({"\u03BC"}), rating deviation (RD), and
                    volatility ({"\u03C3"}). The rating represents estimated strength, RD
                    represents uncertainty, and volatility measures performance consistency over
                    time. Cross-level games serve as bridge observations, connecting the FBS, FCS,
                    D2, D3, and NAIA rating pools.
                  </p>
                  <CodeBlock title="Team Rating Triplet">
                    {`TeamRating = (\u03BC, RD, \u03C3)
  \u03BC  = team strength (FBS scale ~1500)
  RD = rating deviation (uncertainty)
  \u03C3  = volatility (performance consistency)`}
                  </CodeBlock>
                </div>
              )}
            </ContentSection>

            {/* Glicko-2 Engine */}
            <ContentSection id="glicko2">
              <SectionHeader
                icon={Calculator}
                title={mode === "casual" ? "How Ratings Move" : "The Glicko-2 Engine"}
              />
              {mode === "casual" ? (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    Every team starts the season with a rating based on their level and history.
                    Each game updates both teams. Beat a strong team? Your rating jumps. Lose to a
                    weak one? It drops. The size of the move depends on three things:
                  </p>
                  <FeatureList
                    items={[
                      {
                        title: "How surprising was the result?",
                        description:
                          "A huge upset moves ratings more than a chalky favorite win.",
                      },
                      {
                        title: "How confident are we in each team?",
                        description:
                          "A team with only 2 games played has a less certain rating, so it moves more. A team with 10 games played has a locked-in rating that barely budges.",
                      },
                      {
                        title: "How much did they win by?",
                        description:
                          "Winning 45-7 says more than winning 17-14. But we cap the impact of blowouts so you are not incentivized to run up the score.",
                      },
                    ]}
                  />
                  <Callout color="purple" title="Why Not Just Win/Loss?">
                    Pure win/loss systems cannot distinguish between a 1-point squeaker and a
                    45-point demolition. GridRank uses margin of victory (with diminishing returns)
                    to extract more signal from every game.
                  </Callout>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    The core update follows Glicko-2 conventions, scaled to a ~1500-centered system
                    (rather than Glicko-2{"'"}s internal 0-centered {"\u03BC"} scale). The scaling
                    constant is 173.7178, matching the original Glicko system{"'"}s 400/ln(10).
                  </p>
                  <CodeBlock title="Expected Outcome (Logistic)">
                    {`E(home) = 1 / (1 + exp(-((\u03BC_home + HFA) - \u03BC_away) / 173.7178))

Where:
  \u03BC_home = home team rating
  \u03BC_away = away team rating
  HFA     = home field advantage (rating points)

A 400-point rating gap \u2248 91% win probability.`}
                  </CodeBlock>
                  <p className="text-text-secondary leading-relaxed">
                    Rating updates use a variable K-factor derived from each team{"'"}s rating
                    deviation, bounded between 20 and 50. Higher RD means the rating is less
                    certain and should move more aggressively.
                  </p>
                  <CodeBlock title="Rating Update">
                    {`// Pre-game RD inflation (accounts for uncertainty growth)
RD' = sqrt(RD\u00B2 + 25)

// K-factor from RD (bounded 20-50)
K = clamp(RD' \u00D7 0.15, 20, 50)

// Update
\u03BC_new = \u03BC + K \u00D7 (S - E)

Where:
  S = actual outcome after MOV compression (0 to 1)
  E = expected outcome from logistic function`}
                  </CodeBlock>
                  <p className="text-text-secondary leading-relaxed">
                    RD decreases after each game proportional to the surprise of the result.
                    Predictable outcomes provide less information (smaller RD reduction), while
                    surprises lock in more certainty about a team{"'"}s true strength. RD is floored
                    at 50.
                  </p>
                  <InitializationTable />
                </div>
              )}
            </ContentSection>

            {/* Margin of Victory */}
            <ContentSection id="margin">
              <SectionHeader
                icon={TrendingUp}
                title={mode === "casual" ? "Why Blowouts Matter Less" : "Margin of Victory Compression"}
              />
              {mode === "casual" ? (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    We want margin of victory in our system because a 30-point win tells us more
                    than a 1-point win. But we do not want teams rewarded for running up the score
                    to 70-0. GridRank uses a compression function that gives you credit for winning
                    big, but with sharply diminishing returns.
                  </p>
                  <p className="text-text-secondary leading-relaxed">
                    Think of it like a volume knob: the first 14 points of margin turn the knob a
                    lot. The next 14 turn it a little. After about 28 points, you are barely moving
                    the dial. A 42-0 win and a 56-0 win rate almost identically.
                  </p>
                  <MarginTable />
                  <Callout color="teal" title="The Sportsmanship Factor">
                    This compression naturally discourages score-running. A coach who pulls starters
                    and lets the backups play in a blowout barely loses any rating credit compared
                    to continuing to pour it on.
                  </Callout>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    Raw margin is compressed via a two-stage function: logarithmic compression
                    followed by hyperbolic tangent bounding.
                  </p>
                  <CodeBlock title="Margin Compression">
                    {`// Stage 1: Logarithmic compression
compressed = sign(margin) \u00D7 ln(1 + |margin| / 3)

// Stage 2: Hyperbolic tangent bounding to [-1, 1]
bounded = tanh(compressed / 15)

// Convert to outcome score [0, 1]
outcome = 0.5 + 0.5 \u00D7 bounded

Properties:
  margin =   0  \u2192 outcome = 0.500 (tie)
  margin =   7  \u2192 outcome = 0.553
  margin =  14  \u2192 outcome = 0.592
  margin =  21  \u2192 outcome = 0.621
  margin =  28  \u2192 outcome = 0.644
  margin =  35  \u2192 outcome = 0.661
  margin =  42  \u2192 outcome = 0.675
  margin =  56  \u2192 outcome = 0.695`}
                  </CodeBlock>
                  <p className="text-text-secondary leading-relaxed">
                    The ln(1 + x/3) function provides rapidly diminishing returns: the 4th
                    touchdown of margin adds roughly half the credit of the 1st. The tanh wrapper
                    ensures the outcome never exceeds 1.0 regardless of margin, making the system
                    robust to extreme blowouts (FBS vs. NAIA, for example).
                  </p>
                </div>
              )}
            </ContentSection>

            {/* Garbage Time */}
            <ContentSection id="garbage">
              <SectionHeader
                icon={Clock}
                title={mode === "casual" ? "Ignoring Junk Points" : "Garbage Time Filter"}
              />
              {mode === "casual" ? (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    When Alabama leads 45-10 in the 4th quarter, both teams have pulled their
                    starters. The backups scoring a couple touchdowns does not tell us anything
                    meaningful about team quality. GridRank detects these situations and reduces
                    how much that late-game scoring matters.
                  </p>
                  <p className="text-text-secondary leading-relaxed">
                    The thresholds adapt by quarter — it takes a bigger lead to trigger garbage time
                    early in the game:
                  </p>
                  <GarbageTimeTable />
                  <p className="text-text-secondary leading-relaxed">
                    When garbage time is detected, the margin of victory from that portion of the
                    game is reduced by up to 70%. This way, a team that wins 52-14 after leading
                    45-0 at halftime is rated similarly to one that wins 45-0 outright.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    Garbage time detection uses quarter-by-quarter running margins against
                    threshold values inspired by Bill Connelly{"'"}s work at ESPN.
                  </p>
                  <CodeBlock title="Garbage Time Detection">
                    {`Thresholds (running margin triggers garbage time):
  Q1: \u221E   (no garbage time in Q1)
  Q2: 38 points
  Q3: 28 points
  Q4: 22 points

Algorithm:
  for each quarter q in [1..4]:
    running_margin = |home_cumulative - away_cumulative|
    if running_margin > threshold[q]:
      garbage_quarters += 1

  garbage_ratio = garbage_quarters / total_quarters
  reduction_factor = max(0.3, 1 - 0.7 \u00D7 garbage_ratio)

  effective_outcome = 0.5 + (raw_outcome - 0.5) \u00D7 reduction_factor`}
                  </CodeBlock>
                  <p className="text-text-secondary leading-relaxed">
                    When quarter-by-quarter data is unavailable (common for D2/D3/NAIA), a fallback
                    estimator uses the final margin: 35+ point margin = 0.4 factor, 28-35 = 0.5,
                    21-28 = 0.7.
                  </p>
                </div>
              )}
            </ContentSection>

            {/* Home Field Advantage */}
            <ContentSection id="hfa">
              <SectionHeader
                icon={Home}
                title={mode === "casual" ? "Home Cooking" : "Dynamic Home Field Advantage"}
              />
              {mode === "casual" ? (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    Playing at home matters. The crowd, the familiar field, sleeping in your own
                    bed — it all adds up. Most systems use a flat 3-point advantage for every home
                    game. GridRank calculates it dynamically for each game based on four factors:
                  </p>
                  <FeatureList
                    items={[
                      {
                        icon: MapPin,
                        title: "Travel Distance",
                        description:
                          "A West Coast team flying to play in the Eastern time zone gets more of a disadvantage than a team driving 90 minutes down the highway.",
                      },
                      {
                        icon: Mountain,
                        title: "Altitude",
                        description:
                          "Playing at Air Force (6,621 ft) or BYU (4,649 ft) is a real disadvantage for sea-level teams. We model the elevation difference.",
                      },
                      {
                        icon: Volume2,
                        title: "Crowd Size",
                        description:
                          "A 107,000-seat Death Valley is louder and more intimidating than a 15,000-seat stadium. Bigger crowds = more HFA.",
                      },
                      {
                        icon: Home,
                        title: "Dome Factor",
                        description:
                          "Indoor stadiums reduce the advantage. No weather, controlled noise — it's more neutral than an outdoor environment.",
                      },
                    ]}
                  />
                  <Callout color="purple" title="Neutral Sites & Bowls">
                    Neutral-site games (conference championships, bowls) get zero home field
                    advantage. Postseason games played at one team{"'"}s home stadium get a 50%
                    reduction.
                  </Callout>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    HFA is computed per-game as a sum of component bonuses, converted to rating
                    points. The base advantage is 14 rating points (~2.5 actual points on the
                    scoreboard).
                  </p>
                  <CodeBlock title="HFA Calculation">
                    {`HFA = (base + crowd) \u00D7 dome_factor + travel + altitude + team_modifier

Components:
  base     = 14 rating points
  travel   = min(20, (miles - 200) / 1800 \u00D7 20)  [if miles > 200]
  altitude = min(15, (elev_diff - 2000) / 5000 \u00D7 15) [if diff > 2000 ft]
  crowd    = min(10, (capacity - 40000) / 60000 \u00D7 10) [if capacity > 40K]
  dome     = 0.7 multiplier on (base + crowd)
  team_mod = historical HFA modifier (-3 to +5)

Postseason: HFA \u00D7 0.5
Neutral:    HFA = 0

Example — Ohio State hosting Oregon:
  base     = 14
  travel   = 20 \u00D7 (2100 - 200) / 1800 = 20 (capped)
  altitude = 0 (both ~700-900 ft)
  crowd    = 10 \u00D7 (104,944 - 40,000) / 60,000 = 10 (capped)
  dome     = 1.0 (outdoor)
  team_mod = +5
  Total    = (14 + 10) \u00D7 1.0 + 20 + 0 + 5 = 49 rating points`}
                  </CodeBlock>
                </div>
              )}
            </ContentSection>

            {/* Preseason Priors */}
            <ContentSection id="preseason">
              <SectionHeader
                icon={Users}
                title={mode === "casual" ? "Starting Ratings" : "Preseason Priors"}
              />
              {mode === "casual" ? (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    At the start of each season, we cannot just give every team the same rating and
                    wait 6 weeks for it to sort out. We know things before the season starts —
                    last year{"'"}s performance, recruiting classes, how many starters are returning,
                    whether the coach is new. GridRank uses all of this.
                  </p>
                  <p className="text-text-secondary leading-relaxed">
                    The preseason rating is a weighted blend of four signals:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <StatCard label="Last Year's Rating" value="50%" sublabel="regressed to the mean" />
                    <StatCard label="Recruiting" value="25%" sublabel="talent coming in" />
                    <StatCard label="Returning Production" value="15%" sublabel="experience retained" />
                    <StatCard label="Coach Stability" value="10%" sublabel="continuity bonus" />
                  </div>
                  <p className="text-text-secondary leading-relaxed">
                    Crucially, the preseason prior fades away as real games happen. By week 1 it
                    accounts for 60% of the rating; by midseason it is under 10%; by the final
                    week it is just 3%. The games always win.
                  </p>
                  <Callout color="teal" title="Transfer Portal Bonus">
                    On top of the four-component prior, a transfer portal adjustment of up to
                    {"\u00B1"}50 rating points accounts for major roster changes via the portal.
                  </Callout>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    The preseason prior blends four components plus an additive transfer adjustment:
                  </p>
                  <CodeBlock title="Preseason Prior Formula">
                    {`PreseasonRating = 0.50 \u00D7 RegressedPrior
                 + 0.25 \u00D7 RecruitingComponent
                 + 0.15 \u00D7 ReturningProduction
                 + 0.10 \u00D7 CoachStability
                 + TransferAdjustment

RegressedPrior:
  \u03BC_regressed = \u03BC_prev \u00D7 (1 - r) + \u03BC_level_mean \u00D7 r
  r = min(0.5, RD_prev / 500)

RecruitingComponent:
  normalized = recruit_score / level_max_score
  component = normalized \u00D7 150

CoachStability:
  years 0:  0 points (new coach)
  years 1: -20 points (uncertainty penalty)
  years 2:  0 points
  years 3: +10 points
  years 5: +20 points
  years 7+: +25 points (cap)
  + win% bonus: >60% = +15, >50% = +5, <40% = -10

TransferAdjustment:
  clamp(net_transfer_EPA / 10, -50, +50)`}
                  </CodeBlock>
                  <p className="text-text-secondary leading-relaxed">
                    The prior weight decays linearly through the season:
                  </p>
                  <CodeBlock title="Prior Decay Schedule">
                    {`Week  0 (preseason): 60% prior / 40% games
Week  1:             50% / 50%
Week  2:             40% / 60%
Week  3:             30% / 70%
Week  4:             25% / 75%
Week  5:             20% / 80%
Week  6:             15% / 85%
Week  7:             12% / 88%
Week  8:             10% / 90%
Week  9:              8% / 92%
Week 10:              6% / 94%
Week 11:              5% / 95%
Week 12:              3% / 97%
Week 13+:             2% / 98%`}
                  </CodeBlock>
                  <p className="text-text-secondary leading-relaxed">
                    RD is initialized based on data availability. Each available data source
                    (prior rating, recruiting, returning production) reduces initial RD by 20%
                    from the level baseline, reflecting higher confidence in priors with more
                    information.
                  </p>
                </div>
              )}
            </ContentSection>

            {/* Cross-Level Play */}
            <ContentSection id="crosslevel">
              <SectionHeader
                icon={Shield}
                title={mode === "casual" ? "FBS vs. Everyone Else" : "Cross-Level Adjustments"}
              />
              {mode === "casual" ? (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    This is the secret sauce that makes GridRank unique. Most weeks, FBS teams play
                    other FBS teams and FCS teams play other FCS teams. But in Week 1 and Week 2,
                    dozens of FBS programs host FCS opponents. These cross-level games are bridges
                    that connect the rating pools.
                  </p>
                  <p className="text-text-secondary leading-relaxed">
                    However, cross-level games are not clean data. FBS teams often play their
                    backups. The talent gap is enormous. So we apply adjustment factors that dampen
                    how much we learn from these lopsided matchups:
                  </p>
                  <CrossLevelTable />
                  <Callout color="purple" title="Why It Matters">
                    When an FCS team upsets an FBS team (like Appalachian State beating Michigan in
                    2007), the cross-level bridge lets us immediately recalibrate both teams. And
                    when an FCS champion goes undefeated, we can place them in context against FBS
                    teams they share opponents with, even indirectly.
                  </Callout>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    Cross-level games have their outcome deviation from expected multiplied by an
                    adjustment factor less than 1.0, reducing the information extracted from
                    inherently noisy cross-level observations.
                  </p>
                  <CodeBlock title="Cross-Level Adjustment">
                    {`adjusted_outcome = 0.5 + (raw_outcome - 0.5) \u00D7 garbage_factor \u00D7 cross_level_factor

Cross-level factors:
  FBS vs FCS:  0.85  (15% reduction)
  FBS vs D2:   0.70  (30% reduction)
  FBS vs D3:   0.50  (50% reduction)
  FBS vs NAIA: 0.40  (60% reduction)
  FCS vs D2:   0.85
  FCS vs D3:   0.70
  FCS vs NAIA: 0.60
  Same level:  1.00  (no adjustment)

Rationale:
  Cross-level games feature mismatched rosters,
  heavy substitution, and non-competitive environments.
  The adjustment prevents a single FBS-vs-NAIA blowout
  from dominating the NAIA team's entire rating history.`}
                  </CodeBlock>
                </div>
              )}
            </ContentSection>

            {/* Reading the Numbers */}
            <ContentSection id="display">
              <SectionHeader icon={BarChart3} title="Reading the Numbers" />
              {mode === "casual" ? (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    On the rankings page, you will see ratings displayed like{" "}
                    <span className="font-mono text-accent-teal">1523 {"\u00B1"} 47</span>. Here
                    is what that means:
                  </p>
                  <FeatureList
                    items={[
                      {
                        title: "The number (1523)",
                        description:
                          "The team's estimated strength. Higher is better. An average FBS team is around 1500. An elite team is 1700+. An average FCS team is around 1200.",
                      },
                      {
                        title: "The range (\u00B147)",
                        description:
                          "The 95% confidence interval. We're 95% sure the team's true strength is between 1476 and 1570. Early in the season, this range is wide. By November, it tightens up.",
                      },
                    ]}
                  />
                  <Callout color="teal" title="Comparing Teams">
                    If two teams{"'"} confidence intervals overlap significantly, treat them as
                    roughly equal. A team rated 1520 {"\u00B1"} 60 and one rated 1490 {"\u00B1"} 55
                    are essentially the same — the difference is within the noise.
                  </Callout>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-text-secondary leading-relaxed">
                    Ratings are displayed as {"\u03BC \u00B1"} (1.96 {"\u00D7"} RD), representing a
                    95% confidence interval assuming approximate normality of the posterior
                    distribution.
                  </p>
                  <CodeBlock title="Display Format">
                    {`display = "\u03BC \u00B1 CI"
CI = 1.96 \u00D7 RD  (95% confidence)

Percentile calculation:
  percentile = 50 + ((\u03BC - \u03BC_level_mean) / 200) \u00D7 34

Scale reference:
  \u03BC = 1800+  Elite (top ~5 FBS)
  \u03BC = 1650+  Playoff contender
  \u03BC = 1500   Average FBS
  \u03BC = 1350   Below-average FBS / elite FCS
  \u03BC = 1200   Average FCS
  \u03BC = 1000   Average D2
  \u03BC =  800   Average D3
  \u03BC =  700   Average NAIA`}
                  </CodeBlock>
                </div>
              )}
            </ContentSection>

            {/* FAQ */}
            <ContentSection id="faq">
              <SectionHeader icon={AlertTriangle} title="FAQ" />
              <div className="space-y-6">
                <FaqItem
                  question="Why not use the CFP rankings or AP Poll?"
                  answer="Those are human polls influenced by brand, preseason expectations, and recency bias. GridRank is purely algorithmic — it only cares about game results, adjusted for context. It also ranks all 680+ teams, not just FBS."
                />
                <FaqItem
                  question="How is this different from FPI, SP+, or Massey?"
                  answer="Most computer systems only rank FBS. GridRank's unique contribution is the unified cross-level ranking — putting NDSU on the same scale as Ohio State. The Glicko-2 foundation also gives us built-in uncertainty quantification (the \u00B1 range), which most systems lack."
                />
                <FaqItem
                  question="Where does the data come from?"
                  answer="All game results, recruiting data, roster information, and team metadata come from CollegeFootballData.com's API. We process results from 2014 to present."
                />
                <FaqItem
                  question="How often are ratings updated?"
                  answer="Ratings recompute after each week's games are final. During bowl season and the playoff, they update after each completed game. Historical seasons are backfilled from 2014."
                />
                <FaqItem
                  question="Can a D2 or FCS team be ranked above an FBS team?"
                  answer="Absolutely. If an FCS team beats multiple FBS opponents and dominates their conference, the math will put them above mediocre FBS teams. The system doesn't care about your division label — only your results."
                />
                <FaqItem
                  question="Why Glicko-2 instead of Elo?"
                  answer={
                    mode === "casual"
                      ? "Glicko-2 tracks uncertainty (how sure we are about the rating), which Elo doesn't. This matters a lot early in the season when we've only seen 2-3 games. Glicko-2 also has a volatility parameter that adapts to streaky vs. consistent teams."
                      : "Glicko-2 provides three advantages over Elo: (1) explicit rating deviation tracking, enabling confidence intervals; (2) volatility parameter (\u03C3) adapting to performance consistency; (3) mathematically principled handling of rating periods with variable numbers of games. The RD mechanism is particularly valuable for FCS/D2/D3 teams that play fewer cross-level games."
                  }
                />
                <FaqItem
                  question="What about strength of schedule?"
                  answer="It's baked in. When you beat a team rated 1700, your rating moves more than when you beat a team rated 1100. You don't need a separate SOS metric — the rating already reflects who you played and how you did."
                />
              </div>
            </ContentSection>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ContentSection({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      {children}
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-lg bg-bg-card border border-bg-elevated flex items-center justify-center">
        <Icon className="w-5 h-5 text-accent-teal" />
      </div>
      <h2 className="font-display text-2xl text-text-primary">{title}</h2>
    </div>
  );
}

function Callout({
  color,
  title,
  children,
}: {
  color: "teal" | "purple" | "chaos";
  title: string;
  children: React.ReactNode;
}) {
  const colorMap = {
    teal: {
      bg: "bg-accent-teal/5",
      border: "border-accent-teal/20",
      title: "text-accent-teal",
    },
    purple: {
      bg: "bg-accent-purple/5",
      border: "border-accent-purple/20",
      title: "text-accent-purple",
    },
    chaos: {
      bg: "bg-accent-chaos/5",
      border: "border-accent-chaos/20",
      title: "text-accent-chaos",
    },
  };
  const c = colorMap[color];

  return (
    <div className={cn("rounded-lg p-4 border", c.bg, c.border)}>
      <p className={cn("text-sm font-medium mb-1", c.title)}>{title}</p>
      <p className="text-sm text-text-secondary">{children}</p>
    </div>
  );
}

function CodeBlock({
  title,
  children,
}: {
  title: string;
  children: string;
}) {
  return (
    <div className="rounded-lg border border-bg-elevated overflow-hidden">
      <div className="px-4 py-2 bg-bg-elevated/50 border-b border-bg-elevated">
        <span className="text-xs font-mono text-text-muted">{title}</span>
      </div>
      <pre className="p-4 text-sm font-mono text-text-secondary overflow-x-auto leading-relaxed bg-bg-card">
        {children}
      </pre>
    </div>
  );
}

function FeatureList({
  items,
}: {
  items: {
    icon?: React.ElementType;
    title: string;
    description: string;
  }[];
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const Icon = item.icon || ChevronRight;
        return (
          <div key={i} className="flex gap-3 p-3 rounded-lg bg-bg-card border border-bg-elevated">
            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-bg-elevated flex items-center justify-center mt-0.5">
              <Icon className="w-4 h-4 text-accent-teal" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{item.title}</p>
              <p className="text-sm text-text-secondary mt-0.5">{item.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-bg-card border border-bg-elevated">
      <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
      <p className="font-mono text-2xl text-accent-teal mt-1">{value}</p>
      <p className="text-xs text-text-secondary mt-1">{sublabel}</p>
    </div>
  );
}

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-bg-card border border-bg-elevated">
      <p className="font-medium text-text-primary mb-2">{question}</p>
      <p className="text-sm text-text-secondary leading-relaxed">{answer}</p>
    </div>
  );
}

// =============================================================================
// DATA TABLES
// =============================================================================

function InitializationTable() {
  const data = [
    { level: "FBS", mu: 1500, rd: 250, sigma: 0.06 },
    { level: "FCS", mu: 1200, rd: 280, sigma: 0.06 },
    { level: "D2", mu: 1000, rd: 300, sigma: 0.06 },
    { level: "D3", mu: 800, rd: 320, sigma: 0.06 },
    { level: "NAIA", mu: 700, rd: 320, sigma: 0.06 },
  ];
  return (
    <div className="rounded-lg border border-bg-elevated overflow-hidden">
      <div className="px-4 py-2 bg-bg-elevated/50 border-b border-bg-elevated">
        <span className="text-xs font-mono text-text-muted">Initial Rating Parameters by Level</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bg-elevated">
            <th className="px-4 py-2 text-left text-text-muted font-medium">Level</th>
            <th className="px-4 py-2 text-right font-mono text-text-muted font-medium">{"\u03BC"}</th>
            <th className="px-4 py-2 text-right font-mono text-text-muted font-medium">RD</th>
            <th className="px-4 py-2 text-right font-mono text-text-muted font-medium">{"\u03C3"}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.level} className="border-b border-bg-elevated/50 last:border-0">
              <td className="px-4 py-2 text-text-primary font-medium">{d.level}</td>
              <td className="px-4 py-2 text-right font-mono text-accent-teal">{d.mu}</td>
              <td className="px-4 py-2 text-right font-mono text-text-secondary">{d.rd}</td>
              <td className="px-4 py-2 text-right font-mono text-text-secondary">{d.sigma}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarginTable() {
  const data = [
    { margin: "7 pts (1 TD)", credit: "High" },
    { margin: "14 pts (2 TDs)", credit: "Moderate" },
    { margin: "21 pts (3 TDs)", credit: "Diminishing" },
    { margin: "28 pts (4 TDs)", credit: "Small" },
    { margin: "42+ pts", credit: "Minimal additional" },
  ];
  return (
    <div className="rounded-lg border border-bg-elevated overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bg-elevated bg-bg-elevated/30">
            <th className="px-4 py-2 text-left text-text-muted font-medium">Margin</th>
            <th className="px-4 py-2 text-left text-text-muted font-medium">Additional Rating Credit</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.margin} className="border-b border-bg-elevated/50 last:border-0">
              <td className="px-4 py-2 font-mono text-text-primary">{d.margin}</td>
              <td className="px-4 py-2 text-text-secondary">{d.credit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GarbageTimeTable() {
  const data = [
    { quarter: "Q1", threshold: "No limit", note: "Too early for garbage time" },
    { quarter: "Q2", threshold: "38 points", note: "Leading 45-7 at half" },
    { quarter: "Q3", threshold: "28 points", note: "Leading 35-7 entering Q4" },
    { quarter: "Q4", threshold: "22 points", note: "Leading 28-6 late" },
  ];
  return (
    <div className="rounded-lg border border-bg-elevated overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bg-elevated bg-bg-elevated/30">
            <th className="px-4 py-2 text-left text-text-muted font-medium">Quarter</th>
            <th className="px-4 py-2 text-left text-text-muted font-medium">Threshold</th>
            <th className="px-4 py-2 text-left text-text-muted font-medium">Example</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.quarter} className="border-b border-bg-elevated/50 last:border-0">
              <td className="px-4 py-2 font-mono text-accent-teal font-medium">{d.quarter}</td>
              <td className="px-4 py-2 font-mono text-text-primary">{d.threshold}</td>
              <td className="px-4 py-2 text-text-secondary">{d.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CrossLevelTable() {
  const data = [
    { matchup: "FBS vs FCS", factor: "85%", note: "FBS starters often pulled early" },
    { matchup: "FBS vs D2", factor: "70%", note: "Even bigger talent gap" },
    { matchup: "FBS vs D3", factor: "50%", note: "Minimal useful signal" },
    { matchup: "FBS vs NAIA", factor: "40%", note: "Almost purely exhibition" },
    { matchup: "FCS vs D2", factor: "85%", note: "Closer talent level" },
    { matchup: "FCS vs D3", factor: "70%", note: "Moderate adjustment" },
  ];
  return (
    <div className="rounded-lg border border-bg-elevated overflow-hidden">
      <div className="px-4 py-2 bg-bg-elevated/50 border-b border-bg-elevated">
        <span className="text-xs text-text-muted">How much rating signal we extract from cross-level games</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bg-elevated">
            <th className="px-4 py-2 text-left text-text-muted font-medium">Matchup</th>
            <th className="px-4 py-2 text-right font-mono text-text-muted font-medium">Signal Retained</th>
            <th className="px-4 py-2 text-left text-text-muted font-medium">Why</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.matchup} className="border-b border-bg-elevated/50 last:border-0">
              <td className="px-4 py-2 text-text-primary font-medium">{d.matchup}</td>
              <td className="px-4 py-2 text-right font-mono text-accent-teal">{d.factor}</td>
              <td className="px-4 py-2 text-text-secondary">{d.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
