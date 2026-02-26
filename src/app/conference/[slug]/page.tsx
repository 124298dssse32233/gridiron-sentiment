import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const revalidate = 3600;

interface ConferencePageProps {
  params: Promise<{ slug: string }>;
}

// Simple metadata without DB query
export async function generateMetadata({ params }: ConferencePageProps): Promise<Metadata> {
  const { slug } = await params;
  const name = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return {
    title: `${name} Conference - Power Rankings`,
  };
}

async function getConferenceData(slug: string) {
  // Use Prisma directly with the correct query
  const { prisma } = await import("@/lib/db/prisma");

  // Try to find the conference by slug
  const conferences = await prisma.conference.findMany({
    where: {
      slug: {
        equals: slug,
        mode: "insensitive",
      },
    },
    include: {
      level: true,
    },
    take: 1,
  });

  if (conferences.length === 0) return null;

  const conference = conferences[0];

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

  if (!currentSeason) return { conference, teams: [], standings: [] };

  // Get teams in this conference
  const teams = await prisma.team.findMany({
    where: { conferenceId: conference.id },
    include: {
      level: true,
    },
    orderBy: { name: "asc" },
  });

  // Get rankings for these teams
  const latestRanking = await prisma.ranking.findFirst({
    where: { seasonId: currentSeason.id },
    orderBy: { computedAt: "desc" },
  });

  if (!latestRanking) return { conference, teams, standings: [] };

  const teamRankings = await prisma.teamRanking.findMany({
    where: {
      rankingId: latestRanking.id,
      team: { conferenceId: conference.id },
    },
    include: {
      team: {
        include: {
          level: true,
        },
      },
    },
  });

  const standings = teamRankings.map((tr) => ({
    ...tr.team,
    rank: tr.rank,
    rating: Number(tr.rating),
    ratingChange: tr.ratingChange ? Number(tr.ratingChange) : null,
    recordWins: tr.recordWins,
    recordLosses: tr.recordLosses,
  })).sort((a, b) => b.rating - a.rating);

  return { conference, teams: standings, standings };
}

export default async function ConferencePage({ params }: ConferencePageProps) {
  const { slug } = await params;
  const data = await getConferenceData(slug);

  if (!data || !data.conference) {
    notFound();
  }

  const { conference, standings } = data;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-bg-elevated">
        <div className="absolute inset-0 bg-gradient-to-b from-bg-secondary via-bg-primary to-bg-primary" />

        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-6"
          >
            ← Back to Rankings
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <Badge
                variant={conference.level.name === "FBS" ? "primary" : "secondary"}
                className="mb-4"
              >
                {conference.level.name}
              </Badge>

              <h1 className="font-display text-4xl sm:text-5xl text-text-primary mb-2">
                {conference.name}
              </h1>

              <p className="text-text-secondary">
                {conference.abbreviation} Conference • {standings.length} Teams
              </p>
            </div>

            <div className="flex gap-6">
              <div>
                <p className="text-xs text-text-muted uppercase">Teams</p>
                <p className="font-mono text-2xl">{standings.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Standings */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-bg-card rounded-lg border border-bg-elevated overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-bg-elevated bg-bg-elevated/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">Team</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">Rating</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-text-muted uppercase">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-elevated">
              {standings.map((team, index) => {
                const rank = index + 1;
                return (
                  <tr
                    key={team.id}
                    className="hover:bg-bg-elevated/30 transition-colors"
                    style={{
                      borderLeft: rank <= 2
                        ? `3px solid ${team.primaryColor ?? "#00f5d4"}`
                        : "3px solid transparent",
                    }}
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`font-mono font-bold ${
                          rank === 1
                            ? "text-accent-secondary"
                            : rank === 2
                              ? "text-accent-teal"
                              : "text-text-primary"
                        }`}
                      >
                        {rank}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/team/${team.slug}`}
                        className="flex items-center gap-3 group"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            backgroundColor: team.primaryColor
                              ? `${team.primaryColor}20`
                              : "#374151",
                            color: team.primaryColor || "#fff",
                          }}
                        >
                          {team.abbreviation?.substring(0, 2) ?? team.name.substring(0, 2)}
                        </div>
                        <span className="text-text-primary group-hover:text-accent-teal">
                          {team.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono">{Math.round(team.rating)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-sm">
                        {team.recordWins !== null && team.recordLosses !== null
                          ? `${team.recordWins}-${team.recordLosses}`
                          : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {standings.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            No standings data available
          </div>
        )}
      </section>
    </div>
  );
}
