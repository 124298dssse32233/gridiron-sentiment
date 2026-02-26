/**
 * GridLegacy Tier System Compute Script
 *
 * Computes program prestige tiers based on 6-pillar composite score:
 * - Sustained Performance (35%)
 * - Peak Achievement (20%)
 * - Postseason Pedigree (15%)
 * - Win Equity (12%)
 * - Stability & Trajectory (8%)
 * - Recruiting Capital (10%)
 *
 * Run: npx tsx scripts/compute-gridlegacy.ts [year]
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Tier definitions per division
const TIER_DEFINITIONS = {
  FBS: [
    { number: 1, name: 'Blue Bloods', minScore: 85 },
    { number: 2, name: 'Powerhouses', minScore: 70 },
    { number: 3, name: 'Contenders', minScore: 58 },
    { number: 4, name: 'Gatekeepers', minScore: 48 },
    { number: 5, name: 'Crossroads', minScore: 38 },
    { number: 6, name: 'Rebuilders', minScore: 28 },
    { number: 7, name: 'Stragglers', minScore: 15 },
    { number: 8, name: 'Basement Dwellers', minScore: 0 },
  ],
  FCS: [
    { number: 1, name: 'Blue Bloods', minScore: 82 },
    { number: 2, name: 'Powerhouses', minScore: 65 },
    { number: 3, name: 'Contenders', minScore: 50 },
    { number: 4, name: 'Gatekeepers', minScore: 35 },
    { number: 5, name: 'Rebuilders', minScore: 20 },
    { number: 6, name: 'Basement Dwellers', minScore: 0 },
  ],
  D2: [
    { number: 1, name: 'Blue Bloods', minScore: 80 },
    { number: 2, name: 'Powerhouses', minScore: 62 },
    { number: 3, name: 'Contenders', minScore: 45 },
    { number: 4, name: 'Gatekeepers', minScore: 30 },
    { number: 5, name: 'Rebuilders', minScore: 15 },
    { number: 6, name: 'Basement Dwellers', minScore: 0 },
  ],
  D3: [
    { number: 1, name: 'Blue Bloods', minScore: 78 },
    { number: 2, name: 'Powerhouses', minScore: 60 },
    { number: 3, name: 'Contenders', minScore: 42 },
    { number: 4, name: 'Gatekeepers', minScore: 28 },
    { number: 5, name: 'Rebuilders', minScore: 12 },
    { number: 6, name: 'Basement Dwellers', minScore: 0 },
  ],
  NAIA: [
    { number: 1, name: 'Blue Bloods', minScore: 75 },
    { number: 2, name: 'Powerhouses', minScore: 58 },
    { number: 3, name: 'Contenders', minScore: 40 },
    { number: 4, name: 'Gatekeepers', minScore: 25 },
    { number: 5, name: 'Rebuilders', minScore: 10 },
    { number: 6, name: 'Basement Dwellers', minScore: 0 },
  ],
} as const;

// Current year for computation
const TARGET_YEAR = parseInt(process.argv[2]) || 2024;
const START_YEAR = 2014; // GridLegacy window starts here

/**
 * Normalize values to 0-100 scale within division
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return ((value - min) / (max - min)) * 100;
}

/**
 * Compute Sustained Performance pillar (35% weight)
 * Based on weighted average of final GridRank ratings per season
 */
async function computeSustainedPerformance(
  teamId: number,
  division: string,
  currentYear: number
): Promise<number> {
  const seasons = await prisma.season.findMany({
    where: {
      year: { gte: START_YEAR, lte: currentYear },
      sport: { name: 'College Football' },
    },
    orderBy: { year: 'desc' },
  });

  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = 0; i < seasons.length; i++) {
    const season = seasons[i];
    const decayWeight = Math.pow(0.85, i); // 0.85^n decay

    const ranking = await prisma.teamRanking.findFirst({
      where: {
        teamId,
        ranking: {
          seasonId: season.id,
          week: null, // Year-end ranking
        },
      },
      orderBy: { ranking: { week: 'desc' } },
    });

    if (ranking) {
      const rating = Number(ranking.rating);
      weightedSum += rating * decayWeight;
      weightTotal += decayWeight;
    }
  }

  const avgRating = weightTotal > 0 ? weightedSum / weightTotal : 1200;

  // Normalize to 0-100 (FBS range roughly 1000-1800, other divisions lower)
  const fbsMin = 1000;
  const fbsMax = 1800;

  let normalized: number;
  switch (division) {
    case 'FBS':
      normalized = normalize(avgRating, fbsMin, fbsMax);
      break;
    case 'FCS':
      normalized = normalize(avgRating, 900, 1500);
      break;
    case 'D2':
      normalized = normalize(avgRating, 800, 1300);
      break;
    case 'D3':
      normalized = normalize(avgRating, 700, 1200);
      break;
    case 'NAIA':
      normalized = normalize(avgRating, 700, 1200);
      break;
    default:
      normalized = normalize(avgRating, fbsMin, fbsMax);
  }

  return Math.max(0, Math.min(100, normalized));
}

/**
 * Compute Peak Achievement pillar (20% weight)
 */
async function computePeakAchievement(
  teamId: number,
  division: string,
  currentYear: number
): Promise<number> {
  const seasons = await prisma.season.findMany({
    where: {
      year: { gte: START_YEAR, lte: currentYear },
      sport: { name: 'College Football' },
    },
    include: {
      games: {
        where: {
          OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
          isPostseason: true,
        },
      },
    },
    orderBy: { year: 'desc' },
  });

  let totalPoints = 0;

  for (let i = 0; i < seasons.length; i++) {
    const season = seasons[i];
    const decayWeight = Math.pow(0.85, i);
    let seasonPoints = 0;

    const teamGames = season.games.filter(
      (g) => g.homeScore !== null && g.awayScore !== null
    );
    let wins = 0;

    for (const game of teamGames) {
      const isHome = game.homeTeamId === teamId;
      const teamScore = isHome ? game.homeScore : game.awayScore;
      const oppScore = isHome ? game.awayScore : game.homeScore;

      if (teamScore! > oppScore!) wins++;
    }

    // Win totals
    if (wins >= 10) seasonPoints += 8;
    if (wins >= 12) seasonPoints += 15;

    // Bowl games
    const bowlGames = teamGames.filter((g) => g.isPostseason);
    for (const bowl of bowlGames) {
      const isHome = bowl.homeTeamId === teamId;
      const teamScore = isHome ? bowl.homeScore : bowl.awayScore;
      const oppScore = isHome ? bowl.awayScore : bowl.homeScore;

      if (teamScore! > oppScore!) {
        seasonPoints += 8; // Bowl win
      } else {
        seasonPoints += 4; // Bowl appearance
      }
    }

    totalPoints += seasonPoints * decayWeight;
  }

  return Math.max(0, Math.min(100, (totalPoints / 150) * 100));
}

/**
 * Compute Postseason Pedigree pillar (15% weight)
 */
async function computePostseasonPedigree(
  teamId: number,
  division: string,
  currentYear: number
): Promise<number> {
  const seasons = await prisma.season.findMany({
    where: {
      year: { gte: START_YEAR, lte: currentYear },
      sport: { name: 'College Football' },
    },
    include: {
      games: {
        where: {
          OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
          isPostseason: true,
        },
      },
    },
    orderBy: { year: 'desc' },
  });

  let totalPoints = 0;

  for (let i = 0; i < seasons.length; i++) {
    const season = seasons[i];
    const year = season.year;
    const decayWeight = Math.pow(0.85, i);

    const postseasonGames = season.games;

    for (const game of postseasonGames) {
      const isHome = game.homeTeamId === teamId;
      const teamScore = isHome ? game.homeScore : game.awayScore;
      const oppScore = isHome ? game.awayScore : game.homeScore;
      const won = teamScore! > oppScore!;

      // Points based on era
      if (year >= 2024) {
        // 12-team era
        if (won) totalPoints += 6;
        else totalPoints += 3;
      } else {
        // 4-team era
        if (won) totalPoints += 12;
        else totalPoints += 6;
      }
    }

    totalPoints *= decayWeight;
  }

  return Math.max(0, Math.min(100, (totalPoints / 80) * 100));
}

/**
 * Compute Win Equity pillar (12% weight)
 */
async function computeWinEquity(
  teamId: number,
  division: string,
  currentYear: number
): Promise<number> {
  // Get games with team relations included
  const games = await prisma.game.findMany({
    where: {
      season: {
        year: { gte: START_YEAR, lte: currentYear },
        sport: { name: 'College Football' },
      },
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    include: {
      homeTeam: true,
      awayTeam: true,
      season: true,
    },
  });

  let equitySum = 0;

  for (const game of games) {
    if (game.homeScore === null || game.awayScore === null) continue;

    const isHome = game.homeTeamId === teamId;
    const teamScore = isHome ? game.homeScore : game.awayScore;
    const oppScore = isHome ? game.awayScore : game.homeScore;
    const opponent = isHome ? game.awayTeam : game.homeTeam;

    // Skip if opponent data is missing
    if (!opponent) continue;

    const won = teamScore! > oppScore!;

    // Get opponent's year-end rating
    const oppRanking = await prisma.teamRanking.findFirst({
      where: {
        teamId: opponent.id,
        ranking: {
          seasonId: game.seasonId,
          week: null,
        },
      },
    });

    const oppRating = oppRanking ? Number(oppRanking.rating) : 1200;

    // Quality win: beat opponent with rating >= 1500
    if (won && oppRating >= 1500) {
      equitySum += (oppRating - 1400) / 10;
    }

    // Bad loss: lose to opponent with rating <= 1300
    if (!won && oppRating <= 1300) {
      equitySum -= (1400 - oppRating) / 10;
    }
  }

  return Math.max(0, Math.min(100, (equitySum + 50) * 0.67));
}

/**
 * Compute Stability & Trajectory pillar (8% weight)
 */
async function computeStabilityTrajectory(
  teamId: number,
  division: string,
  currentYear: number
): Promise<number> {
  const seasons = await prisma.season.findMany({
    where: {
      year: { gte: Math.max(START_YEAR, currentYear - 5), lte: currentYear },
      sport: { name: 'College Football' },
    },
    include: {
      games: {
        where: {
          OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        },
      },
    },
    orderBy: { year: 'asc' },
  });

  const winTotals: number[] = [];

  for (const season of seasons) {
    let wins = 0;
    for (const game of season.games) {
      if (game.homeScore === null || game.awayScore === null) continue;

      const isHome = game.homeTeamId === teamId;
      const teamScore = isHome ? game.homeScore : game.awayScore;
      const oppScore = isHome ? game.awayScore : game.homeScore;

      if (teamScore! > oppScore!) wins++;
    }
    winTotals.push(wins);
  }

  // Trajectory: 3-year average trend
  let trajectoryScore = 50;
  if (winTotals.length >= 3) {
    const recent3 = winTotals.slice(-3);
    const earlier3 = winTotals.slice(0, Math.min(3, winTotals.length - 3));
    const recentAvg = recent3.reduce((a, b) => a + b, 0) / recent3.length;
    const earlierAvg = earlier3.length > 0 ? earlier3.reduce((a, b) => a + b, 0) / earlier3.length : recentAvg;
    const trend = recentAvg - earlierAvg;
    trajectoryScore = Math.max(0, Math.min(100, 50 + trend * 5));
  }

  // Consistency: inverse of standard deviation
  let consistencyScore = 50;
  if (winTotals.length >= 3) {
    const avg = winTotals.reduce((a, b) => a + b, 0) / winTotals.length;
    const variance = winTotals.reduce((sum, w) => sum + Math.pow(w - avg, 2), 0) / winTotals.length;
    const stdDev = Math.sqrt(variance);
    consistencyScore = Math.max(0, Math.min(100, 100 - stdDev * 8));
  }

  return trajectoryScore * 0.5 + consistencyScore * 0.5;
}

/**
 * Compute Recruiting Capital pillar (10% weight)
 */
async function computeRecruitingCapital(
  teamId: number,
  division: string,
  currentYear: number
): Promise<number> {
  const recruitingYears = [currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

  let totalScore = 0;
  let yearsWithData = 0;

  for (const year of recruitingYears) {
    const players = await prisma.player.findMany({
      where: {
        currentTeamId: teamId,
        recruitClassYear: year,
        recruitStars: { not: null },
      },
    });

    if (players.length === 0) continue;

    let classScore = 0;
    for (const player of players) {
      const stars = player.recruitStars || 0;
      classScore += stars * 10;
      if (stars === 5) classScore += 50;
      if (stars === 4) classScore += 20;
    }

    const yearsAgo = currentYear - year;
    const decayWeight = Math.pow(0.9, yearsAgo - 1);

    totalScore += classScore * decayWeight;
    yearsWithData++;
  }

  return yearsWithData > 0 ? Math.max(0, Math.min(100, (totalScore / yearsWithData / 20))) : 30;
}

/**
 * Assign tier based on score and division
 */
function assignTier(score: number, division: string): { number: number; name: string } {
  const tiers = TIER_DEFINITIONS[division as keyof typeof TIER_DEFINITIONS] || TIER_DEFINITIONS.FBS;

  for (const tier of tiers) {
    if (score >= tier.minScore) {
      return { number: tier.number, name: tier.name };
    }
  }

  return { number: tiers.length, name: tiers[tiers.length - 1].name };
}

/**
 * Main computation function
 */
async function main() {
  console.log(`🏈 Computing GridLegacy tiers for ${TARGET_YEAR}...`);

  // Get all teams grouped by division
  const fbsLevel = await prisma.level.findFirst({ where: { name: 'FBS' } });
  const fcsLevel = await prisma.level.findFirst({ where: { name: 'FCS' } });
  const d2Level = await prisma.level.findFirst({ where: { name: 'D2' } });
  const d3Level = await prisma.level.findFirst({ where: { name: 'D3' } });

  const divisions = [
    { name: 'FBS', levelId: fbsLevel?.id },
    { name: 'FCS', levelId: fcsLevel?.id },
    { name: 'D2', levelId: d2Level?.id },
    { name: 'D3', levelId: d3Level?.id },
  ];

  let totalProcessed = 0;

  for (const division of divisions) {
    if (!division.levelId) continue;

    console.log(`\n📊 Processing ${division.name}...`);

    const teams = await prisma.team.findMany({
      where: { levelId: division.levelId },
    });

    console.log(`   Found ${teams.length} teams`);

    const results: any[] = [];

    for (const team of teams) {
      const [
        sustainedPerf,
        peakAchievement,
        postseasonPedigree,
        winEquity,
        stabilityTrajectory,
        recruitingCapital,
      ] = await Promise.all([
        computeSustainedPerformance(team.id, division.name, TARGET_YEAR),
        computePeakAchievement(team.id, division.name, TARGET_YEAR),
        computePostseasonPedigree(team.id, division.name, TARGET_YEAR),
        computeWinEquity(team.id, division.name, TARGET_YEAR),
        computeStabilityTrajectory(team.id, division.name, TARGET_YEAR),
        computeRecruitingCapital(team.id, division.name, TARGET_YEAR),
      ]);

      // Weighted composite score
      const gridlegacyScore =
        sustainedPerf * 0.35 +
        peakAchievement * 0.20 +
        postseasonPedigree * 0.15 +
        winEquity * 0.12 +
        stabilityTrajectory * 0.08 +
        recruitingCapital * 0.10;

      const tier = assignTier(gridlegacyScore, division.name);

      results.push({
        teamId: team.id,
        teamName: team.name,
        gridlegacyScore: Math.round(gridlegacyScore * 100) / 100,
        sustainedPerformance: Math.round(sustainedPerf * 100) / 100,
        peakAchievement: Math.round(peakAchievement * 100) / 100,
        postseasonPedigree: Math.round(postseasonPedigree * 100) / 100,
        winEquity: Math.round(winEquity * 100) / 100,
        stabilityTrajectory: Math.round(stabilityTrajectory * 100) / 100,
        recruitingCapital: Math.round(recruitingCapital * 100) / 100,
        tierNumber: tier.number,
        tierName: tier.name,
        division: division.name,
      });

      totalProcessed++;

      if (totalProcessed % 50 === 0) {
        console.log(`   Processed ${totalProcessed} teams...`);
      }
    }

    // Sort by score for rankings
    results.sort((a, b) => b.gridlegacyScore - a.gridlegacyScore);

    // Assign overall ranks
    results.forEach((r, i) => {
      r.rankOverall = i + 1;

      // Count teams in same tier for tier rank
      const sameTier = results.filter((tr) => tr.tierNumber === r.tierNumber);
      const tierIndex = sameTier.findIndex((tr) => tr.teamId === r.teamId);
      r.rankInTier = tierIndex + 1;
    });

    // Check for previous tier to determine movement
    const previousYear = TARGET_YEAR - 1;
    const previousTiers = await prisma.programTier.findMany({
      where: {
        season: previousYear,
        division: division.name,
        week: null,
      },
    });

    const previousTierMap = new Map(previousTiers.map((pt) => [pt.teamId, pt.tierNumber]));

    // Write to database
    console.log(`\n   Writing ${results.length} records to database...`);

    for (const result of results) {
      const previousTier = previousTierMap.get(result.teamId);
      const tierChange = previousTier ? result.tierNumber - previousTier : 0;

      // Determine promotion/relegation zones (within 5 points of boundary)
      const tierDef = TIER_DEFINITIONS[division.name as keyof typeof TIER_DEFINITIONS];
      const nextTier = tierDef.find((t) => t.number === result.tierNumber - 1);
      const prevTier = tierDef.find((t) => t.number === result.tierNumber + 1);

      const promotionZone = nextTier && result.gridlegacyScore >= nextTier.minScore - 5;
      const relegationZone = prevTier && result.gridlegacyScore <= prevTier.minScore + 5;
      const relegationWatch = relegationZone && tierChange < 0;

      await prisma.programTier.upsert({
        where: {
          teamId_season_week: {
            teamId: result.teamId,
            season: TARGET_YEAR,
            week: 0, // 0 = end-of-season/final program tier
          },
        },
        create: {
          teamId: result.teamId,
          season: TARGET_YEAR,
          week: 0, // 0 = end-of-season/final program tier
          gridlegacyScore: result.gridlegacyScore,
          sustainedPerformance: result.sustainedPerformance,
          peakAchievement: result.peakAchievement,
          postseasonPedigree: result.postseasonPedigree,
          winEquity: result.winEquity,
          stabilityTrajectory: result.stabilityTrajectory,
          recruitingCapital: result.recruitingCapital,
          tierNumber: result.tierNumber,
          tierName: result.tierName,
          division: result.division,
          tierChange,
          promotionZone,
          relegationZone,
          relegationWatch,
          rankInTier: result.rankInTier,
          rankOverall: result.rankOverall,
        },
        update: {
          gridlegacyScore: result.gridlegacyScore,
          sustainedPerformance: result.sustainedPerformance,
          peakAchievement: result.peakAchievement,
          postseasonPedigree: result.postseasonPedigree,
          winEquity: result.winEquity,
          stabilityTrajectory: result.stabilityTrajectory,
          recruitingCapital: result.recruitingCapital,
          tierNumber: result.tierNumber,
          tierName: result.tierName,
          tierChange,
          promotionZone,
          relegationZone,
          relegationWatch,
          rankInTier: result.rankInTier,
          rankOverall: result.rankOverall,
        },
      });

      // Generate tier alerts for movements
      if (tierChange !== 0) {
        await prisma.tierAlert.create({
          data: {
            teamId: result.teamId,
            season: TARGET_YEAR,
            week: null,
            alertType: tierChange > 0 ? 'promotion' : 'relegation',
            fromTier: previousTier || result.tierNumber - tierChange,
            toTier: result.tierNumber,
            fromTierName: tierDef?.find((t) => t.number === (previousTier || result.tierNumber - tierChange))?.name || 'Unknown',
            toTierName: result.tierName,
            headline: `${result.teamName} ${tierChange > 0 ? 'rises to' : 'falls to'} ${result.tierName} status`,
            context: `GridLegacy Score: ${result.gridlegacyScore}`,
            gridlegacyScore: result.gridlegacyScore,
          },
        });
      } else if (relegationWatch) {
        await prisma.tierAlert.create({
          data: {
            teamId: result.teamId,
            season: TARGET_YEAR,
            week: null,
            alertType: 'relegation_watch',
            fromTier: result.tierNumber,
            toTier: result.tierNumber + 1,
            fromTierName: result.tierName,
            toTierName: tierDef?.find((t) => t.number === result.tierNumber + 1)?.name || 'Unknown',
            headline: `${result.teamName} at risk of dropping to ${tierDef?.find((t) => t.number === result.tierNumber + 1)?.name || 'Unknown'}`,
            context: `Within 5 points of relegation threshold`,
            gridlegacyScore: result.gridlegacyScore,
          },
        });
      }
    }
  }

  console.log(`\n✅ GridLegacy computation complete! Processed ${totalProcessed} teams.`);

  // Show tier breakdown for FBS
  console.log('\n🏆 FBS Tier Breakdown:\n');

  const fbsTiers = await prisma.programTier.groupBy({
    by: ['tierName', 'tierNumber'],
    where: {
      season: TARGET_YEAR,
      division: 'FBS',
      week: null,
    },
    _count: true,
    orderBy: {
      tierNumber: 'asc',
    },
  });

  for (const tier of fbsTiers) {
    console.log(`  ${tier.tierName}: ${tier._count} teams`);
  }

  // Show top 5 per tier
  console.log('\n📊 Top 5 Teams per Tier:\n');

  for (const tierDef of TIER_DEFINITIONS.FBS) {
    const topTeams = await prisma.programTier.findMany({
      where: {
        season: TARGET_YEAR,
        division: 'FBS',
        tierNumber: tierDef.number,
        week: null,
      },
      include: {
        team: true,
      },
      orderBy: {
        gridlegacyScore: 'desc',
      },
      take: 5,
    });

    if (topTeams.length > 0) {
      console.log(`\n${tierDef.name} (${topTeams.length} total):`);
      for (const team of topTeams) {
        console.log(`  ${team.rankInTier}. ${team.team.name} — ${team.gridlegacyScore}`);
      }
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
