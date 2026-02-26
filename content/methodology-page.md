# How GridRank Works

## Casual Mode

### The Short Version

GridRank is a chess rating system we repurposed for football.

That's not a metaphor. The Glicko-2 algorithm was designed by Mark Glickman at Harvard to rate chess players. It tracks three things for every player (or in our case, every team): how good they are, how confident we are in that estimate, and how consistently they perform. We took that system and bolted on a margin-of-victory model, a home-field calculator, a garbage time filter, and a set of preseason priors informed by recruiting data and coaching stability.

The result is a single number for each of the 900+ college football teams in America. Not just FBS. All of them.

### Why Not Just Use the AP Poll?

Because the AP Poll is 65 sportswriters watching 15 games each and pretending they saw the other 50. Nobody on that ballot watched East Central Oklahoma play Southwestern Oklahoma last Saturday. We did. Well, the math did.

Computer rankings aren't smarter than humans. They're more consistent. They don't have a recency bias that makes a Week 11 loss count five times more than a Week 3 loss. They don't forget that a team's best win came against an opponent that later went 4-8. And they don't leave 130 FCS teams, 300 D2 teams, and 250 NAIA teams completely unranked because nobody's heard of them.

GridRank has watched every game. It remembers all of them. And it tells you exactly how uncertain it is about every rating it produces.

### What the Numbers Mean

Every team gets a rating displayed like this: **1523 +/- 47**

That first number is the team's estimated strength. FBS teams generally land between 1300 and 1750. An average FBS team sits around 1500. An average FCS team is around 1200. The scale keeps going down through D2, D3, and NAIA.

The "+/- 47" is the confidence interval. It means we're 95% sure the team's true strength is somewhere between 1476 and 1570. A tight interval means we've seen enough games to be confident. A wide one means the team has played a soft schedule, or hasn't played many games yet, or just does weird things from week to week.

Early in the season, every team's interval is wide. By November, the picture tightens up. That's the system working as designed.

### How Games Change the Rating

When a team wins, their rating goes up. When they lose, it goes down. Standard stuff. But the size of the move depends on three things:

**Who you beat matters.** Beating the #3 team moves you a lot. Beating a 2-9 team barely moves the needle.

**How much you won by matters, but with limits.** A 28-point win is more impressive than a 7-point win. But a 56-point win doesn't count much more than a 35-point win. We compress margins using a logarithmic curve because once the backups are in, the score doesn't tell you anything useful about either team.

**How sure we were about the prediction matters.** If GridRank expected a 20-point blowout and you won by 20, nothing changes. The system already knew. But if you were supposed to lose by 10 and won by 3, that's a big update.

### The Preseason Problem

Week 1 is the hardest week for any rating system. You've got zero games and 900 teams to rank. We handle this with preseason priors that lean on four things: last year's rating (regressed toward the mean, because teams don't stay the same), recruiting talent (including transfer portal movement), returning production, and coaching quality.

Those priors carry real weight in Week 1. By Week 6, they're nearly gone. By late October, GridRank is almost entirely driven by what happened on the field this season. The math doesn't care what your recruiting class looked like if your offensive line can't block a gust of wind.

### Home Field Advantage

Playing at home is worth about 2.5 points on average in modern college football. That number used to be higher. It's been dropping for a decade and the data backs it up.

But 2.5 is the average. BYU at 4,600 feet of elevation gets more than that. Akron playing in front of 9,000 fans in a 30,000-seat stadium gets less. We calculate home-field advantage dynamically for every game based on altitude, crowd fill rate, and whether the visiting team had to cross a time zone.

Neutral-site games get zero home-field adjustment. As they should.

### Garbage Time

If a team is up 35-0 in the third quarter, whatever happens next doesn't tell you much about either team. The starters are on the bench. The playcalling changes. The losing team might score two late touchdowns against a prevent defense that would make a high school coach cringe.

GridRank identifies garbage time using margin thresholds that tighten as the game goes on. A 28-point lead in the second quarter isn't garbage time yet. A 16-point lead with five minutes left probably is. When the filter kicks in, the remaining margin gets heavily discounted in the rating update. We're not going to penalize Alabama because their third-string safety gave up a touchdown with two minutes left in a game that was over at halftime.

### Ranking Every Division on One List

This is the part that makes GridRank different from everything else out there.

Most systems rank FBS and stop. Some rank FCS separately. Nobody puts them all on one list. The problem is obvious: D2 teams don't play FBS teams. How do you compare them?

The answer is bridge games. Every year, about 150 FCS teams play FBS opponents. A handful of D2 teams play FCS opponents. Those cross-division matchups are calibration anchors. When North Dakota State (FCS) beats a mid-tier FBS team on the road, that game connects the two rating pools. The system uses those connections to figure out the right gap between divisions.

For levels with fewer bridge games, we lean more on historical priors and show wider confidence intervals. We're honest about what we know and what we're guessing.

### Why You Should Trust This (And When You Shouldn't)

We publish our prediction accuracy every week. Straight-up record, against-the-spread record, cumulative for the season. When GridRank gets it wrong, you'll know, because we'll tell you. If you visit on a Sunday morning and last week's predictions got torched, we'll say so in The Stack.

No ranking system is perfect. Ours has blind spots. Teams that play a very weak schedule are harder to rate because we've never seen them tested. Teams that change dramatically mid-season (new quarterback, key injury) are slow to adjust because the system weighs the full season, not just the last two weeks.

GridRank is a tool. It's a good one. But it's not the final word on anything, and anyone who tells you their model is should be selling you something other than football analysis.

---

## Deep Dive

### The Glicko-2 Foundation

GridRank is built on Glicko-2, a Bayesian rating system developed by Mark Glickman at Harvard. Each team carries three parameters:

**Rating (mu):** The team's estimated strength on a continuous scale. FBS teams initialize at 1500, FCS at 1200, D2 at 1000, D3 at 850, NAIA at 750. These priors reflect historical cross-division performance data.

**Rating Deviation (RD):** The uncertainty in the rating. New or inactive teams start with high RD (250-320 depending on division). As games accumulate, RD shrinks. A team with an RD of 25 is well-understood. An RD of 120 means the rating is a rough guess. The displayed confidence interval is 1.96 x RD (95% CI).

**Volatility (sigma):** How consistently the team performs relative to its rating. A team that beats strong opponents one week and loses to bad ones the next will have high volatility. This parameter controls how reactive the rating is to individual results. High-volatility teams see larger swings per game.

### Rating Update Mechanics

After each game, both teams' ratings update using Glicko-2's iterative algorithm. The key variables:

**Expected outcome** is calculated from the rating difference between teams, filtered through the logistic function with the opponents' RD factored in. A 300-point rating gap translates to roughly a 95% win probability.

**Margin of victory** enters through a compression function:

```
compressed_margin = sign(margin) * ln(1 + |margin| / 3)
```

This flattens extreme blowouts. The difference between a 14-point win and a 21-point win matters more than the difference between a 42-point win and a 49-point win, because the latter is garbage time and backup players.

The margin multiplier also includes an autocorrelation correction adapted from FiveThirtyEight's Elo model. If a team rated 300 points higher wins by 21, that's exactly what the model predicted. Only margin *beyond* the expected spread creates a meaningful update. Without this correction, strong teams get over-rewarded for blowing out weak opponents they were supposed to blow out.

### Home Field Advantage Model

The HFA model is dynamic, not a static 3-point constant. Each game's home-field value is computed from:

**Base value:** 2.5 points (2024 FBS empirical average, down from ~4.0 in 2005).

**Altitude adjustment:** +0.3 points per 1,000 feet above 3,000 feet, capped at +2.0. This isn't a guess. Colorado, BYU, Air Force, and Wyoming consistently outperform their ratings at home. Visiting teams at altitude have measurably lower performance in the second half.

**Crowd fill rate:** Games played at 95%+ stadium capacity get +0.5. Games below 50% capacity get -0.5. The data is noisy here but directionally correct.

**Cross-conference travel:** +0.3 points when the visiting team is from a different conference, as a rough proxy for time zone crossings and unfamiliar environments.

**Division scaling:** FCS venues get 85% of the base HFA. D2 gets 70%. D3 and NAIA get 60%. Smaller crowds in smaller stadiums produce a smaller advantage.

Neutral-site games always receive zero HFA.

### Garbage Time Filter

The filter uses margin-by-quarter thresholds:

| Quarter | Margin Threshold | Weight Applied |
|---------|-----------------|----------------|
| Q1 | No filter | 1.0 (full weight) |
| Q2 | 26+ points | 0.25 |
| Q3 | 22+ points | 0.20 |
| Q4 | 16+ points | 0.15 |
| Q4 (under 5 min) | 12+ points | 0.10 |

These thresholds scale down for lower divisions (multiplied by 0.85 for FCS, 0.75 for D2, 0.70 for D3/NAIA) to account for lower-scoring environments.

The filter applies to the margin component of the rating update, not the win/loss outcome itself. A win is still a win. But if you won 52-14 and 24 of those points came in garbage time, the system treats it more like a 28-14 win for rating purposes.

### Preseason Prior Formula

```
PreseasonRating = 0.45 * RegressedPrior
                + 0.30 * RecruitingComposite
                + 0.18 * ReturningProduction
                + 0.07 * CoachQuality
```

**RegressedPrior** is last season's final GridRank pulled 40% toward the division mean. A team that finished at 1700 regresses to about 1620 (assuming an FBS mean of 1500). This prevents last year's champion from starting with an unearnable advantage.

**RecruitingComposite** blends high school recruiting (247 composite, 70% weight) with transfer portal net talent (30% weight). The portal weighting was added for the post-2021 era when entire roster construction shifted.

**ReturningProduction** measures what percentage of last year's output (yards, tackles, snaps) returns. A team that lost 80% of its production starts lower.

**CoachQuality** is a stability and track record metric. New coaches get a penalty. Coaches with a 10-year record of development get a small bonus.

The prior decays aggressively over the first six weeks:

| Week | Prior Weight | Game Weight |
|------|-------------|-------------|
| Preseason | 70% | 30% |
| Week 1 | 55% | 45% |
| Week 2 | 40% | 60% |
| Week 3 | 28% | 72% |
| Week 4 | 18% | 82% |
| Week 5 | 10% | 90% |
| Week 6+ | 3% | 97% |

By mid-October, the preseason prior is statistical noise. Bill Connelly's SP+ does something similar, dropping priors to near-zero by Week 6. The logic is the same: six weeks of games tell you more than any offseason projection.

### Cross-Division Calibration

This is the hardest problem in the system and the one nobody else has really solved at scale.

FBS teams and FCS teams play each other roughly 150 times per year. Those games are the bridge. When an FCS team goes into an FBS stadium and covers the spread (or wins), that result connects the two rating pools and helps calibrate the gap.

Historical data validates the initialization gaps: FCS teams beat FBS opponents about 5.1% of the time across 3,700+ games, with an average loss margin of 22.4 points. That's consistent with a ~300-point rating gap. The top FCS teams (Montana State, North Dakota State, South Dakota State) historically play at a level equivalent to FBS teams ranked 60th-100th.

Below FCS, bridge games get rarer. D2-to-FCS matchups happen but not in large numbers. D3 and NAIA teams almost never play outside their division. For those levels, GridRank relies more heavily on historical priors and shows wider confidence intervals to reflect the uncertainty.

Teams with zero cross-division games in a given season carry an RD multiplier of 1.3x, widening their confidence interval. If an entire division has no bridge games connecting it to adjacent levels, those rankings are flagged as prior-dependent.

### Strength of Schedule

```
SOS = (2/3) * avg(opponents' ratings) + (1/3) * avg(opponents' opponents' ratings)
```

The two-thirds/one-third split gives heavier weight to direct opponents but still accounts for the quality of their schedules. A team that went 10-2 against a schedule full of teams that also played tough schedules gets more credit than a team that went 10-2 against a schedule full of teams that padded their records against bad opponents.

SOS is displayed on every team page and factors into The Gauntlet visualization.

---

## Frequently Asked Questions

**How is GridRank different from the AP Poll or Coaches Poll?**
The AP and Coaches polls are human votes. 65 writers or 65 coaches rank their top 25 based on what they've watched (and what they haven't). GridRank is a mathematical model that processes every game result for every team. It doesn't forget early-season results, it doesn't have name-brand bias, and it doesn't stop at 25 teams. It ranks all 900+.

**How is GridRank different from SP+, FPI, or Sagarin?**
SP+ (Bill Connelly) uses play-by-play efficiency data. FPI (ESPN) uses a proprietary expected points model. Sagarin uses a least-squares approach. GridRank uses Glicko-2 (a Bayesian chess rating system adapted for football) with margin-of-victory extension. The biggest difference is scope. Most systems rank FBS only. GridRank ranks FBS, FCS, D2, D3, and NAIA on one unified scale.

**What does the "+/- 47" mean after a rating?**
It's the 95% confidence interval. A rating of 1523 +/- 47 means we're 95% sure the team's true strength is between 1476 and 1570. Early in the season, intervals are wide (we haven't seen enough data). By November, they tighten. Teams with weak schedules tend to have wider intervals because we haven't seen them tested.

**Can a D2 team really be ranked above an FBS team?**
Yes. If the math supports it, we report it. In most seasons, the top D2 and FCS teams rate out above the bottom tier of FBS. North Dakota State has a 9-5 historical record against FBS opponents. The numbers don't lie, and we don't adjust them to avoid awkward conversations.

**Why does my team's rating look wrong early in the season?**
The preseason prior is doing most of the work in September. By Week 6, game results account for 90%+ of the rating. If your team looks underrated in Week 3, wait. The model needs data. That's not a flaw. That's honesty about uncertainty.

**How often do ratings update?**
Weekly during the season, after all games for the week are final. Ratings recompute from scratch each time (not just the latest week), so every game in the season contributes to the current rating.

**Do you account for injuries or suspensions?**
Not directly. GridRank is a results-based system. If a starting quarterback goes down and the team's performance drops, the model sees worse results and the rating adjusts. But it doesn't have a "star player injured" input. This is a known limitation. Teams undergoing major mid-season personnel changes are slower to adjust than the reality on the field.

**What data source do you use?**
Game results, recruiting data, and statistical data come from the CollegeFootballData.com API, which is the most complete public source for college football data across all divisions.

**Is GridRank profitable for betting?**
We publish our against-the-spread accuracy every week. Historically, consistent ATS accuracy above 53% is the breakeven threshold for profitable sports betting (accounting for the standard -110 vig). We track this publicly because transparency is the whole point. Check the accuracy record and decide for yourself.

**Why should I trust a computer over my own eyes?**
You shouldn't. Not completely. Your eyes see things the model can't: a new scheme that hasn't shown up in the stats yet, a team that's clearly better than their record suggests, a coach who's about to get fired. GridRank is a starting point. It's the best available baseline. What you do with that information is up to you.

---

## Our Accuracy Record

*This section will update weekly during the season.*

We track prediction accuracy publicly because if you can't verify it, it's just opinions with extra steps. Every Sunday, we publish:

**Straight-up record:** How many games did GridRank correctly pick the winner? This is the simplest measure. Any model should beat 60% here because most games aren't close.

**Against-the-spread record:** This is the real test. Vegas lines are already very good. Beating the spread consistently means the model is finding value that the market missed. Above 53% over a full season is profitable. Above 55% is elite. We'll report honestly wherever we land.

**Brier score:** A statistical measure of how well-calibrated the probabilities are. When GridRank says a team has a 70% chance to win, they should win about 70% of the time. Not 90%. Not 50%. The Brier score penalizes overconfidence and underconfidence equally. Lower is better. Under 0.22 is the target.

**Division-specific accuracy:** We separately track how well the model performs for FBS, FCS, D2, D3, and NAIA. The FBS numbers should be tightest (most data, most bridge games). Lower divisions will be noisier. That's expected.

When we get it wrong, we'll say so. Publicly, specifically, and without making excuses. If the model says Georgia should beat Vanderbilt by 20 and Vanderbilt wins outright, that shows up in the record. We don't hide bad weeks. The whole point of publishing the methodology is that you can check our work.
