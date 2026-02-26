import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { TeamLogo } from "@/components/ui/team-logo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const revalidate = 3600;

async function getProgramRankings() {
  const programs = await prisma.programRanking.findMany({
    where: {},
    include: {
      team: {
        include: {
          level: true,
          conference: true,
        },
      },
    },
    orderBy: {
      avgRating: "desc", // Higher avg rating = better program
    },
    take: 300, // Top 300 programs
  });

  return programs;
}

export default async function ProgramsPage() {
  const programs = await getProgramRankings();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-bg-elevated">
        <div className="absolute inset-0 bg-gradient-to-b from-bg-secondary via-bg-primary to-bg-primary" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent-secondary/5 rounded-full blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-bg-elevated mb-4">
            <span className="w-2 h-2 rounded-full bg-accent-secondary animate-glow-pulse" />
            <span className="text-sm text-text-secondary">
              2014–2024 Composite
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-text-primary mb-2">
            Grid<span className="text-accent-secondary">Legacy</span>
          </h1>

          <p className="font-body text-lg text-text-secondary max-w-xl">
            The definitive ranking of college football programs — aggregating 11 seasons of GridRank data
            to identify the most consistent and successful programs in America.
          </p>
        </div>
      </section>

      {/* Rankings Table */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <Card variant="elevated" padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-bg-elevated">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider w-16">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Program
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider w-20">
                    Level
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider w-24">
                    Conference
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider w-24">
                    Avg Rating
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider w-20">
                    Peak
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider w-24">
                    Consistency
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-elevated">
                {programs.map((program, index) => {
                  const rank = index + 1;
                  const avgRating = Number(program.avgRating) * 10; // Scale back for display
                  const peakRating = Number(program.peakPerformance) * 10; // Scale back for display
                  const consistency = Number(program.consistency);

                  return (
                    <tr
                      key={program.teamId}
                      className="hover:bg-bg-elevated/50 transition-colors group"
                      style={{
                        borderLeft: program.team.primaryColor
                          ? `3px solid ${program.team.primaryColor}`
                          : "3px solid transparent",
                      }}
                    >
                      {/* Rank */}
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono font-bold text-sm ${
                            rank === 1 ? "text-accent-secondary" :
                            rank === 2 ? "text-accent-teal" :
                            rank === 3 ? "text-accent-warning" :
                            "text-text-primary"
                          }`}
                        >
                          {rank}
                        </span>
                      </td>

                      {/* Program */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/team/${program.team.slug}`}
                          className="flex items-center gap-3 group-hover:text-accent-teal transition-colors"
                        >
                          <TeamLogo
                            teamName={program.team.name}
                            logoUrl={program.team.logoUrl}
                            logos={(program.team.metadata as Record<string, unknown> | null)?.logos as string[] | undefined}
                            abbreviation={program.team.abbreviation}
                            primaryColor={program.team.primaryColor}
                            secondaryColor={program.team.secondaryColor}
                            size="sm"
                            shape="circle"
                          />
                          <div className="flex flex-col">
                            <span className="font-medium text-text-primary">
                              {program.team.name}
                            </span>
                            {program.team.mascot && (
                              <span className="text-xs text-text-muted">
                                {program.team.mascot}
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Level */}
                      <td className="px-4 py-3">
                        <Badge variant={program.team.level.name === "FBS" ? "primary" : "secondary"}>
                          {program.team.level.name}
                        </Badge>
                      </td>

                      {/* Conference */}
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {program.team.conference?.name ?? "Independent"}
                      </td>

                      {/* Avg Rating */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-medium text-text-primary">
                          {avgRating.toFixed(1)}
                        </span>
                      </td>

                      {/* Peak */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-sm text-text-muted">
                          {peakRating.toFixed(0)}
                        </span>
                      </td>

                      {/* Consistency */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="w-16 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent-secondary"
                              style={{ width: `${consistency}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-muted w-8 text-right">
                            {consistency.toFixed(0)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <CardContent className="px-6 py-4 border-t border-bg-elevated">
            <p className="text-sm text-text-muted">
              Showing top {programs.length} programs. Avg Rating is the mean GridRank across all seasons.
              Peak is the highest single-season rating. Consistency measures rating stability (higher = more consistent).
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Methodology Note */}
      <section className="max-w-7xl mx-auto px-4 py-8 border-t border-bg-elevated">
        <div className="bg-bg-card rounded-lg p-6 border border-bg-elevated">
          <h3 className="font-display text-lg text-text-primary mb-3">Methodology</h3>
          <p className="text-text-secondary text-sm leading-relaxed">
            GridLegacy aggregates final GridRank ratings from each season (2014-2024) to create all-time program rankings.
            Programs are ranked by their average rating across all seasons they've played. The consistency score
            rewards programs that maintain steady performance year-over-year, while the peak rating shows the program's
            highest single-season achievement. Cross-level games are properly weighted, and all divisions (FBS, FCS, D2, D3)
            are ranked on the same unified list.
          </p>
        </div>
      </section>
    </div>
  );
}
