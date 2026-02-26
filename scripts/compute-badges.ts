/**
 * Team Badges Compute Script
 *
 * Computes badges for teams based on game results, rankings, and achievements.
 * Badges are organized into 5 categories: Identity, Statistical, Trajectory, Historical, Fun
 *
 * Run: npx tsx scripts/compute-badges.ts [year] [week]
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Current year/week for computation
const TARGET_YEAR = parseInt(process.argv[2]) || 2024;
const TARGET_WEEK = parseInt(process.argv[3]) || null; // null = year-end
const START_YEAR = 2014;

// Badge definitions with criteria
interface BadgeDefinition {
  id: string;
  name: string;
  category: string;
  borderTier: "gold" | "teal" | "red" | "purple" | "default";
  icon: string;
  isPermanent: boolean;
  isLive: boolean;
  compute: (teamId: number, year: number) => Promise<{ earned: boolean; tooltip: string; detail?: any }>;
}

// All badge definitions
const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // IDENTITY BADGES
  {
    id: "fortress",
    name: "Fortress",
    category: "identity",
    borderTier: "default",
    icon: "shield",
    isPermanent: false,
    isLive: false,
    compute: async (teamId: number, year: number) => {
      const seasons = await prisma.season.findMany({
        where: { year: { gte: Math.max(START_YEAR, year - 3), lte: year } },
        include: {
          games: {
            where: {
              OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
            },
          },
        },
      });

      let homeWins = 0;
      let homeGames = 0;

      for (const season of seasons) {
        for (const game of season.games) {
          if (game.homeScore === null || game.awayScore === null) continue;
          if (game.homeTeamId !== teamId) continue;

          homeGames++;
          if (game.homeScore > game.awayScore) homeWins++;
        }
      }

      const homePct = homeGames >= 10 ? homeWins / homeGames : 0;
      const earned = homePct >= 0.85 && homeGames >= 10;

      return {
        earned,
        tooltip: earned
          ? `${Math.round(homePct * 100)}% home win rate since ${Math.max(START_YEAR, year - 3)} (${homeWins}-${homeGames - homeWins})`
          : `Home win rate: ${Math.round(homePct * 100)}% (need 85%+)`,
        detail: { homeWins, homeGames, homePct },
      };
    },
  },
  {
    id: "bulldozer",
    name: "Bulldozer",
    category: "identity",
    borderTier: "teal",
    icon: "truck",
    isPermanent: false,
    isLive: false,
    compute: async (teamId: number, year: number) => {
      const seasons = await prisma.season.findMany({
        where: { year: { gte: Math.max(START_YEAR, year - 2), lte: year } },
        include: {
          games: {
            where: {
              OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
            },
          },
        },
      });

      const winningMargins: number[] = [];

      for (const season of seasons) {
        for (const game of season.games) {
          if (game.homeScore === null || game.awayScore === null) continue;

          const isHome = game.homeTeamId === teamId;
          const teamScore = isHome ? game.homeScore : game.awayScore;
          const oppScore = isHome ? game.awayScore : game.homeScore;
          const margin = Math.abs(teamScore! - oppScore!);

          if (teamScore! > oppScore!) {
            winningMargins.push(margin);
          }
        }
      }

      const avgMargin = winningMargins.length > 0
        ? winningMargins.reduce((a, b) => a + b, 0) / winningMargins.length
        : 0;

      const earned = avgMargin >= 20 && winningMargins.length >= 12;

      return {
        earned,
        tooltip: earned
          ? `Average winning margin: ${Math.round(avgMargin)} points since ${Math.max(START_YEAR, year - 2)}`
          : `Average margin: ${Math.round(avgMargin)} (need 20+ points with 12+ wins)`,
        detail: { avgMargin: Math.round(avgMargin), wins: winningMargins.length },
      };
    },
  },
  {
    id: "comeback_kings",
    name: "Comeback Kings",
    category: "identity",
    borderTier: "teal",
    icon: "rotate-ccw",
    isPermanent: false,
    isLive: false,
    compute: async (teamId: number, year: number) => {
      // Simplified - count wins where opponent was favored
      const seasons = await prisma.season.findMany({
        where: { year: { gte: Math.max(START_YEAR, year - 3), lte: year } },
        include: {
          games: {
            where: {
              OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
            },
          },
        },
      });

      let comebackWins = 0;

      for (const season of seasons) {
        for (const game of season.games) {
          if (game.homeScore === null || game.awayScore === null) continue;

          const isHome = game.homeTeamId === teamId;
          const teamScore = isHome ? game.homeScore : game.awayScore;
          const oppScore = isHome ? game.awayScore : game.homeScore;

          // Simplified: if they won, count it (in reality would need play-by-play)
          if (teamScore! > oppScore! && (teamScore! - oppScore!) <= 7) {
            comebackWins++; // Close win approximation
          }
        }
      }

      const earned = comebackWins >= 5;

      return {
        earned,
        tooltip: earned
          ? `${comebackWins} comeback wins since ${Math.max(START_YEAR, year - 3)}`
          : `Close wins: ${comebackWins} (need 5+)`,
        detail: { comebackWins },
      };
    },
  },
  {
    id: "front_runners",
    name: "Front Runners",
    category: "identity",
    borderTier: "default",
    icon: "lock",
    isPermanent: false,
    isLive: false,
    compute: async (teamId: number, year: number) => {
      const seasons = await prisma.season.findMany({
        where: { year: { gte: Math.max(START_YEAR, year - 3), lte: year } },
        include: {
          games: {
            where: {
              OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
            },
          },
        },
      });

      let leadingHalftimeGames = 0;
      let leadingHalftimeWins = 0;

      // Simplified - assume if they won by more than 10, they likely led at halftime
      for (const season of seasons) {
        for (const game of season.games) {
          if (game.homeScore === null || game.awayScore === null) continue;

          const isHome = game.homeTeamId === teamId;
          const teamScore = isHome ? game.homeScore : game.awayScore;
          const oppScore = isHome ? game.awayScore : game.homeScore;
          const margin = teamScore! - oppScore!;

          if (margin > 10) {
            leadingHalftimeGames++;
            leadingHalftimeWins++;
          } else if (margin > 0) {
            leadingHalftimeGames++;
          }
        }
      }

      const closeRate = leadingHalftimeGames >= 15
        ? leadingHalftimeWins / leadingHalftimeGames
        : 0;

      const earned = closeRate >= 0.90 && leadingHalftimeGames >= 15;

      return {
        earned,
        tooltip: earned
          ? `${Math.round(closeRate * 100)}% win rate when leading`
          : `Win rate when leading: ${Math.round(closeRate * 100)}% (need 90%+)`,
        detail: { leadingHalftimeWins, leadingHalftimeGames, closeRate },
      };
    },
  },

  // TRAJECTORY BADGES
  {
    id: "hot_streak",
    name: "Hot Streak",
    category: "trajectory",
    borderTier: "default",
    icon: "flame",
    isPermanent: false,
    isLive: true,
    compute: async (teamId: number, year: number) => {
      if (!TARGET_WEEK) return { earned: false, tooltip: "No active week" };

      const season = await prisma.season.findFirst({
        where: { year },
        include: {
          games: {
            where: {
              OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
              week: { lte: TARGET_WEEK },
            },
            orderBy: { week: "asc" },
          },
        },
      });

      if (!season) return { earned: false, tooltip: "No games found" };

      let currentStreak = 0;
      for (let i = season.games.length - 1; i >= 0; i--) {
        const game = season.games[i];
        if (game.homeScore === null || game.awayScore === null) continue;

        const isHome = game.homeTeamId === teamId;
        const teamScore = isHome ? game.homeScore : game.awayScore;
        const oppScore = isHome ? game.awayScore : game.homeScore;

        if (teamScore! > oppScore!) {
          currentStreak++;
        } else {
          break;
        }
      }

      const earned = currentStreak >= 5;

      return {
        earned,
        tooltip: earned ? `${currentStreak}-game win streak` : `Win streak: ${currentStreak}`,
        detail: { streak: currentStreak },
      };
    },
  },
  {
    id: "cold_streak",
    name: "Cold Streak",
    category: "trajectory",
    borderTier: "red",
    icon: "snowflake",
    isPermanent: false,
    isLive: true,
    compute: async (teamId: number, year: number) => {
      if (!TARGET_WEEK) return { earned: false, tooltip: "No active week" };

      const season = await prisma.season.findFirst({
        where: { year },
        include: {
          games: {
            where: {
              OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
              week: { lte: TARGET_WEEK },
            },
            orderBy: { week: "asc" },
          },
        },
      });

      if (!season) return { earned: false, tooltip: "No games found" };

      let currentStreak = 0;
      for (let i = season.games.length - 1; i >= 0; i--) {
        const game = season.games[i];
        if (game.homeScore === null || game.awayScore === null) continue;

        const isHome = game.homeTeamId === teamId;
        const teamScore = isHome ? game.homeScore : game.awayScore;
        const oppScore = isHome ? game.awayScore : game.homeScore;

        if (teamScore! < oppScore!) {
          currentStreak++;
        } else {
          break;
        }
      }

      const earned = currentStreak >= 4;

      return {
        earned,
        tooltip: earned ? `${currentStreak}-game losing streak` : `Losing streak: ${currentStreak}`,
        detail: { streak: currentStreak },
      };
    },
  },
  {
    id: "dynasty_run",
    name: "Dynasty Run",
    category: "trajectory",
    borderTier: "gold",
    icon: "crown",
    isPermanent: false,
    isLive: false,
    compute: async (teamId: number, year: number) => {
      // Count seasons with 10+ wins in last 5 years
      const seasons = await prisma.season.findMany({
        where: { year: { gte: year - 5, lte: year } },
        include: {
          games: {
            where: {
              OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
            },
          },
        },
      });

      let tenWinSeasons = 0;

      for (const season of seasons) {
        let wins = 0;
        for (const game of season.games) {
          if (game.homeScore === null || game.awayScore === null) continue;

          const isHome = game.homeTeamId === teamId;
          const teamScore = isHome ? game.homeScore : game.awayScore;
          const oppScore = isHome ? game.awayScore : game.homeScore;

          if (teamScore! > oppScore!) wins++;
        }

        if (wins >= 10) tenWinSeasons++;
      }

      const earned = tenWinSeasons >= 3;

      return {
        earned,
        tooltip: earned
          ? `${tenWinSeasons} seasons with 10+ wins in last 5 years`
          : `${tenWinSeasons} 10+ win seasons (need 3+)`,
        detail: { tenWinSeasons },
      };
    },
  },

  // HISTORICAL BADGES
  {
    id: "championship_pedigree",
    name: "Championship Pedigree",
    category: "historical",
    borderTier: "gold",
    icon: "trophy",
    isPermanent: true,
    isLive: false,
    compute: async (teamId: number, year: number) => {
      // Check for championship-level seasons (undefeated or 13+ wins)
      const seasons = await prisma.season.findMany({
        where: { year: { gte: START_YEAR, lte: year } },
        include: {
          games: {
            where: {
              OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
            },
          },
        },
      });

      const championshipYears: number[] = [];

      for (const season of seasons) {
        let wins = 0;
        let losses = 0;

        for (const game of season.games) {
          if (game.homeScore === null || game.awayScore === null) continue;

          const isHome = game.homeTeamId === teamId;
          const teamScore = isHome ? game.homeScore : game.awayScore;
          const oppScore = isHome ? game.awayScore : game.homeScore;

          if (teamScore! > oppScore!) wins++;
          else losses++;
        }

        // Undefeated or 13+ wins
        if (losses === 0 || wins >= 13) {
          championshipYears.push(season.year);
        }
      }

      const earned = championshipYears.length > 0;

      return {
        earned,
        tooltip: earned
          ? `Championship-level seasons: ${championshipYears.join(", ")}`
          : "No championship seasons",
        detail: { years: championshipYears },
      };
    },
  },
  {
    id: "perfection",
    name: "Perfection",
    category: "historical",
    borderTier: "gold",
    icon: "star",
    isPermanent: true,
    isLive: false,
    compute: async (teamId: number, year: number) => {
      const seasons = await prisma.season.findMany({
        where: { year: { gte: START_YEAR, lte: year } },
        include: {
          games: {
            where: {
              OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
            },
          },
        },
      });

      const perfectSeasons: number[] = [];

      for (const season of seasons) {
        let losses = 0;

        for (const game of season.games) {
          if (game.homeScore === null || game.awayScore === null) continue;

          const isHome = game.homeTeamId === teamId;
          const teamScore = isHome ? game.homeScore : game.awayScore;
          const oppScore = isHome ? game.awayScore : game.homeScore;

          if (teamScore! < oppScore!) {
            losses++;
            break;
          }
        }

        if (losses === 0) {
          perfectSeasons.push(season.year);
        }
      }

      const earned = perfectSeasons.length > 0;

      return {
        earned,
        tooltip: earned
          ? `Undefeated regular season: ${perfectSeasons.join(", ")}`
          : "No undefeated seasons",
        detail: { years: perfectSeasons },
      };
    },
  },
  {
    id: "iron_man",
    name: "Iron Man",
    category: "historical",
    borderTier: "gold",
    icon: "shield-check",
    isPermanent: true,
    isLive: false,
    compute: async (teamId: number, year: number) => {
      const seasons = await prisma.season.findMany({
        where: { year: { gte: START_YEAR, lte: year } },
        include: {
          games: {
            where: {
              OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
            },
          },
        },
      });

      let allAbove500 = true;

      for (const season of seasons) {
        let wins = 0;
        let losses = 0;

        for (const game of season.games) {
          if (game.homeScore === null || game.awayScore === null) continue;

          const isHome = game.homeTeamId === teamId;
          const teamScore = isHome ? game.homeScore : game.awayScore;
          const oppScore = isHome ? game.awayScore : game.homeScore;

          if (teamScore! > oppScore!) wins++;
          else losses++;
        }

        if (losses > wins) {
          allAbove500 = false;
          break;
        }
      }

      return {
        earned: allAbove500,
        tooltip: allAbove500
          ? `No losing season since ${START_YEAR}`
          : "Has losing seasons in window",
        detail: { allAbove500 },
      };
    },
  },
  {
    id: "bowl_streak",
    name: "Bowl Streak",
    category: "historical",
    borderTier: "default",
    icon: "calendar-check",
    isPermanent: false,
    isLive: false,
    compute: async (teamId: number, year: number) => {
      const seasons = await prisma.season.findMany({
        where: { year: { gte: START_YEAR, lte: year } },
        include: {
          games: {
            where: {
              OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
              isPostseason: true,
            },
          },
        },
      });

      let currentStreak = 0;
      let maxStreak = 0;
      const streakStarts: { start: number; end: number; length: number }[] = [];

      for (let i = 0; i < seasons.length; i++) {
        const season = seasons[i];
        const hasBowl = season.games.length > 0;

        if (hasBowl) {
          currentStreak++;
          if (currentStreak >= 5 && currentStreak > maxStreak) {
            maxStreak = currentStreak;
          }
        } else {
          if (currentStreak >= 5) {
            streakStarts.push({
              start: season.year - currentStreak,
              end: season.year - 1,
              length: currentStreak,
            });
          }
          currentStreak = 0;
        }
      }

      if (currentStreak >= 5) {
        streakStarts.push({
          start: seasons[seasons.length - 1].year - currentStreak + 1,
          end: seasons[seasons.length - 1].year,
          length: currentStreak,
        });
      }

      const earned = maxStreak >= 5;
      const bestStreak = streakStarts.sort((a, b) => b.length - a.length)[0];

      return {
        earned,
        tooltip: earned
          ? `${bestStreak.length}-year bowl streak (${bestStreak.start}-${bestStreak.end})`
          : `Longest bowl streak: ${maxStreak} years`,
        detail: { maxStreak, streaks: streakStarts },
      };
    },
  },
  {
    id: "bowl_warriors",
    name: "Bowl Warriors",
    category: "fun",
    borderTier: "default",
    icon: "medal",
    isPermanent: false,
    isLive: false,
    compute: async (teamId: number, year: number) => {
      const seasons = await prisma.season.findMany({
        where: { year: { gte: START_YEAR, lte: year } },
        include: {
          games: {
            where: {
              OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
              isPostseason: true,
            },
          },
        },
      });

      let bowlWins = 0;
      let bowlLosses = 0;

      for (const season of seasons) {
        for (const game of season.games) {
          const isHome = game.homeTeamId === teamId;
          const teamScore = isHome ? game.homeScore : game.awayScore;
          const oppScore = isHome ? game.awayScore : game.homeScore;

          if (teamScore! > oppScore!) bowlWins++;
          else bowlLosses++;
        }
      }

      const bowlGames = bowlWins + bowlLosses;
      const bowlPct = bowlGames >= 5 ? bowlWins / bowlGames : 0;
      const earned = bowlPct >= 0.70 && bowlGames >= 5;

      return {
        earned,
        tooltip: earned
          ? `${bowlWins}-${bowlLosses} in bowl games since ${START_YEAR}`
          : `Bowl record: ${bowlWins}-${bowlLosses} (need .700+ with 5+ games)`,
        detail: { bowlWins, bowlLosses, bowlPct },
      };
    },
  },
  {
    id: "season_opener_assassin",
    name: "Season Opener Assassin",
    category: "fun",
    borderTier: "default",
    icon: "play",
    isPermanent: false,
    isLive: false,
    compute: async (teamId: number, year: number) => {
      const seasons = await prisma.season.findMany({
        where: { year: { gte: START_YEAR, lte: year } },
        include: {
          games: {
            where: {
              OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
              week: 1,
            },
          },
        },
      });

      let openerWins = 0;
      let openerGames = 0;

      for (const season of seasons) {
        const opener = season.games[0];
        if (!opener) continue;

        openerGames++;
        const isHome = opener.homeTeamId === teamId;
        const teamScore = isHome ? opener.homeScore : opener.awayScore;
        const oppScore = isHome ? opener.awayScore : opener.homeScore;

        if (teamScore! > oppScore!) openerWins++;
      }

      const openerPct = openerGames >= 5 ? openerWins / openerGames : 0;
      const earned = openerPct >= 0.80 && openerGames >= 5;

      return {
        earned,
        tooltip: earned
          ? `${openerWins}-${openerGames - openerWins} in season openers`
          : `Opener record: ${openerWins}-${openerGames - openerGames} (need .800+)`,
        detail: { openerWins, openerGames, openerPct },
      };
    },
  },
];

/**
 * Main computation function
 */
async function main() {
  console.log(`🏅 Computing team badges for ${TARGET_YEAR}${TARGET_WEEK ? ` Week ${TARGET_WEEK}` : ' (year-end)'}...`);

  const sport = await prisma.sport.findFirst({ where: { name: 'College Football' } });
  if (!sport) {
    console.error('Sport "College Football" not found');
    return;
  }

  const teams = await prisma.team.findMany({
    where: { level: { sportId: sport.id } },
  });

  console.log(`Found ${teams.length} teams\n`);

  let totalBadgesEarned = 0;

  for (const team of teams) {
    let teamBadgeCount = 0;

    for (const badgeDef of BADGE_DEFINITIONS) {
      // Skip live badges if no week specified
      if (badgeDef.isLive && !TARGET_WEEK) continue;

      const result = await badgeDef.compute(team.id, TARGET_YEAR);

      if (result.earned) {
        // Check if badge already exists
        const existing = await prisma.teamBadge.findUnique({
          where: {
            teamId_season_week_badgeId: {
              teamId: team.id,
              season: TARGET_YEAR,
              week: TARGET_WEEK,
              badgeId: badgeDef.id,
            },
          },
        });

        if (!existing) {
          await prisma.teamBadge.create({
            data: {
              teamId: team.id,
              season: TARGET_YEAR,
              week: TARGET_WEEK,
              badgeId: badgeDef.id,
              badgeName: badgeDef.name,
              category: badgeDef.category,
              borderTier: badgeDef.borderTier,
              isPermanent: badgeDef.isPermanent,
              isLive: badgeDef.isLive,
              icon: badgeDef.icon,
              tooltip: result.tooltip,
              detailJson: result.detail || {},
              earnedAt: new Date(),
            },
          });

          totalBadgesEarned++;
          teamBadgeCount++;
        }
      } else {
        // Remove badge if no longer earned (unless permanent)
        const existing = await prisma.teamBadge.findUnique({
          where: {
            teamId_season_week_badgeId: {
              teamId: team.id,
              season: TARGET_YEAR,
              week: TARGET_WEEK,
              badgeId: badgeDef.id,
            },
          },
        });

        if (existing && !existing.isPermanent) {
          await prisma.teamBadge.delete({
            where: { id: existing.id },
          });
        }
      }
    }

    if (teamBadgeCount > 0) {
      console.log(`  ${team.name}: ${teamBadgeCount} badges`);
    }
  }

  console.log(`\n✅ Badge computation complete! ${totalBadgesEarned} badges awarded.`);

  // Show badge distribution
  console.log('\n📊 Badge Distribution:\n');

  const badgeCounts = await prisma.teamBadge.groupBy({
    by: ['badgeName'],
    where: {
      season: TARGET_YEAR,
      week: TARGET_WEEK,
    },
    _count: true,
    orderBy: { _count: { badgeName: 'desc' } },
  });

  for (const badge of badgeCounts) {
    console.log(`  ${badge.badgeName}: ${badge._count} teams`);
  }

  // Show teams with most badges
  console.log('\n🏆 Teams with Most Badges:\n');

  const topTeams = await prisma.teamBadge.groupBy({
    by: ['teamId'],
    where: {
      season: TARGET_YEAR,
      week: TARGET_WEEK,
    },
    _count: true,
    orderBy: { _count: { teamId: 'desc' } },
    take: 10,
  });

  for (const teamBadge of topTeams) {
    const team = await prisma.team.findUnique({ where: { id: teamBadge.teamId } });
    console.log(`  ${team?.name}: ${teamBadge._count} badges`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
