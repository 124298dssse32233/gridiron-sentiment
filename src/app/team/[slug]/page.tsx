import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatRecord } from "@/lib/utils/formatting";
import type { Metadata } from "next";

export const revalidate = 3600;

interface TeamPageProps {
  params: Promise<{ slug: string }>;
}

// Simple metadata without DB query
export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const { slug } = await params;
  const name = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return {
    title: `${name} - GridRank Ratings & History`,
  };
}

async function getTeamData(slug: string) {
  const { prisma } = await import("@/lib/db/prisma");

  // Find team by slug (case-insensitive)
  const teams = await prisma.team.findMany({
    where: {
      slug: {
        equals: slug,
        mode: "insensitive",
      },
    },
    include: {
      level: true,
      conference: true,
    },
    take: 1,
  });

  if (teams.length === 0) return null;

  const team = teams[0];

  // Get current season - find the most recent season with rankings
  const currentSeason = await prisma.season.findFirst({
    where: {
      year: { lte: 2025 },
      sport: { name: "College Football" },
      rankings: {
        some: {}
      }
    },
    orderBy: { year: "desc" },
  });

  if (!currentSeason) return { team, season: 2024, ranking: null, games: [], record: { wins: 0, losses: 0 } };

  // Get latest ranking
  const latestRanking = await prisma.ranking.findFirst({
    where: { seasonId: currentSeason.id },
    orderBy: { computedAt: "desc" },
  });

  const ranking = latestRanking
    ? await prisma.teamRanking.findFirst({
        where: {
          rankingId: latestRanking.id,
          teamId: team.id,
        },
      })
    : null;

  // Get games
  const games = await prisma.game.findMany({
    where: {
      seasonId: currentSeason.id,
      OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
    },
    include: {
      homeTeam: {
        select: {
          id: true,
          name: true,
          slug: true,
          abbreviation: true,
          primaryColor: true,
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
          slug: true,
          abbreviation: true,
          primaryColor: true,
        },
      },
    },
    orderBy: [{ week: "asc" }, { gameDate: "asc" }],
  });

  // Calculate record
  let wins = 0;
  let losses = 0;
  const completedGames = games.filter(
    (g) => g.homeScore !== null && g.awayScore !== null
  );

  for (const game of completedGames) {
    const isHome = game.homeTeamId === team.id;
    const teamScore = isHome ? game.homeScore : game.awayScore;
    const opponentScore = isHome ? game.awayScore : game.homeScore;

    if (teamScore !== null && opponentScore !== null) {
      if (teamScore > opponentScore) wins++;
      else losses++;
    }
  }

  return {
    team,
    season: currentSeason.year,
    ranking,
    games,
    record: { wins, losses },
  };
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;
  const data = await getTeamData(slug);

  if (!data) {
    notFound();
  }

  const { team, season, ranking, games, record } = data;

  const currentRating = ranking ? Number(ranking.rating) : 1500;
  const currentRank = ranking?.rank ?? null;
  const logos = (team.metadata as Record<string, unknown> | null)?.logos as string[] | undefined;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden border-b border-bg-elevated"
        style={{
          background: `linear-gradient(135deg, ${team.primaryColor ?? "#00f5d4"}10, ${team.secondaryColor ?? team.primaryColor ?? "#00f5d4"}05)`,
        }}
      >
        <div className="absolute inset-0 bg-bg-primary/90" />

        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-6"
          >
            ← Back to Rankings
          </Link>

          <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-12">
            {/* Team Logo */}
            <div className="flex-shrink-0">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
                style={{
                  backgroundColor: team.primaryColor
                    ? `${team.primaryColor}20`
                    : "#374151",
                  color: team.primaryColor || "#fff",
                }}
              >
                {team.abbreviation ?? team.name.substring(0, 2)}
              </div>
            </div>

            {/* Team Info */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={team.level.name === "FBS" ? "primary" : "secondary"}
                >
                  {team.level.name}
                </Badge>
                {team.conference && (
                  <Link href={`/conference/${team.conference.slug}`}>
                    <Badge variant="default" className="cursor-pointer hover:bg-bg-elevated/50">
                      {team.conference.name}
                    </Badge>
                  </Link>
                )}
              </div>

              <h1 className="font-display text-4xl sm:text-5xl text-text-primary">
                {team.name}
                {team.mascot && <span className="text-text-secondary"> {team.mascot}</span>}
              </h1>

              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-text-muted uppercase">GridRank</p>
                  <p className="font-mono text-2xl font-bold">{Math.round(currentRating)}</p>
                </div>

                {currentRank && currentRank > 0 && (
                  <div>
                    <p className="text-xs text-text-muted uppercase">Rank</p>
                    <p className="font-mono text-2xl font-bold">#{currentRank}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-text-muted uppercase">Record</p>
                  <p className="font-mono text-2xl font-bold">{formatRecord(record.wins, record.losses)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Game Log */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="font-display text-2xl text-text-primary mb-6">
          {season} Game Log
        </h2>

        <div className="bg-bg-card rounded-lg border border-bg-elevated overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-bg-elevated bg-bg-elevated/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">Week</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">Opponent</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-text-muted uppercase">Result</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-elevated">
              {games.map((game) => {
                const isHome = game.homeTeamId === team.id;
                const opponent = isHome ? game.awayTeam : game.homeTeam;
                const teamScore = isHome ? game.homeScore : game.awayScore;
                const opponentScore = isHome ? game.awayScore : game.homeScore;
                const isCompleted = teamScore !== null && opponentScore !== null;
                const isWin = isCompleted && teamScore > opponentScore;

                return (
                  <tr
                    key={game.id}
                    className="hover:bg-bg-elevated/30 transition-colors"
                    style={{
                      borderLeft: isWin && isCompleted
                        ? `3px solid ${team.primaryColor ?? "#00f5d4"}`
                        : "3px solid transparent",
                    }}
                  >
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {game.week ? `Week ${game.week}` : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {game.gameDate ? new Date(game.gameDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/team/${opponent.slug}`}
                        className="flex items-center gap-2 group"
                      >
                        <span className="text-text-primary group-hover:text-accent-teal">
                          {opponent.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isCompleted ? (
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                            isWin
                              ? "bg-accent-positive/10 text-accent-positive"
                              : "bg-accent-negative/10 text-accent-negative"
                          }`}
                        >
                          {isWin ? "W" : "L"}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">Upcoming</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isCompleted ? (
                        <span className="font-mono text-sm text-text-primary">
                          {teamScore} - {opponentScore}
                        </span>
                      ) : (
                        <span className="text-sm text-text-muted">vs</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {games.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            No games scheduled for {season}
          </div>
        )}
      </section>

      {/* Conference Link */}
      {team.conference && (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <Link
            href={`/conference/${team.conference.slug}`}
            className="block bg-bg-card rounded-lg border border-bg-elevated p-6 hover:border-accent-teal/50 transition-colors"
          >
            <h3 className="font-display text-lg text-text-primary mb-2">
              View {team.conference.name} Standings
            </h3>
            <p className="text-sm text-text-secondary">
              See how {team.name} ranks within their conference.
            </p>
          </Link>
        </section>
      )}
    </div>
  );
}
