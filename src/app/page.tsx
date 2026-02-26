/**
 * Gridiron Intel Homepage
 * The entry point to the most comprehensive college football analytics platform
 * Displays the full GridRank with filters, sparklines, and detailed team info
 */

import { prisma } from "@/lib/db/prisma";
import { Suspense } from "react";
import Link from "next/link";
import { MiniSparkline } from "@/components/charts/sparkline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamLogo } from "@/components/ui/team-logo";
import { cn } from "@/lib/utils/cn";

// Revalidate every hour
export const revalidate = 3600;

async function getRankings() {
  try {
  // Get current season
  const sport = await prisma.sport.findUnique({
    where: { slug: "college-football" },
  });

  if (!sport) {
    return { rankings: [], season: null };
  }

  // Get the most recent season that has rankings, max 2026
  const season = await prisma.season.findFirst({
    where: {
      sportId: sport.id,
      year: { lte: 2026 }, // Don't show future seasons
      rankings: {
        some: {}
      }
    },
    orderBy: { year: "desc" },
  });

  if (!season) {
    return { rankings: [], season: null };
  }

  // Get latest ranking for this season (prefer highest week number)
  const latestRanking = await prisma.ranking.findFirst({
    where: {
      seasonId: season.id,
    },
    orderBy: [
      { week: "desc" }, // Get highest week number (week 16 > week 0)
      { computedAt: "desc" },
    ],
    include: {
      teamRankings: {
        include: {
          team: {
            include: {
              level: true,
              conference: true,
            },
          },
        },
        orderBy: {
          rank: "asc",
        },
        take: 150, // Top 150
      },
    },
  });

  return {
    rankings: latestRanking?.teamRankings ?? [],
    season,
    week: latestRanking?.week,
  };
} catch (error) {
    // Database not available — show empty state
    console.error("Database connection failed:", error);
    return { rankings: [], season: null, week: undefined };
  }
}

function getLevelColor(level: string): string {
  const colors: Record<string, string> = {
    FBS: "text-accent-teal",
    FCS: "text-accent-purple",
    D2: "text-accent-warning",
    D3: "text-accent-positive",
    NAIA: "text-accent-chaos",
  };
  return colors[level] || "text-text-muted";
}

function getLevelBadgeColor(level: string): "primary" | "secondary" | "chaos" | "warning" | "positive" | "default" {
  const colors: Record<string, "primary" | "secondary" | "chaos" | "warning" | "positive" | "default"> = {
    FBS: "primary",
    FCS: "secondary",
    D2: "warning",
    D3: "positive",
    NAIA: "chaos",
  };
  return colors[level] || "default";
}

export default async function HomePage() {
  const { rankings, season, week } = await getRankings();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-bg-elevated">
        <div className="absolute inset-0 bg-gradient-to-b from-bg-secondary via-bg-primary to-bg-primary" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent-teal/5 rounded-full blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-bg-elevated mb-4">
                <span className="w-2 h-2 rounded-full bg-accent-teal animate-glow-pulse" />
                <span className="text-sm text-text-secondary">
                  {season?.year ?? "--"} Season {week !== undefined && week !== null ? `— Week ${week}` : "— Final"}
                </span>
              </div>

              {/* Main heading */}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-text-primary mb-2">
                Grid<span className="text-accent-teal">Rank</span>
              </h1>

              {/* Tagline */}
              <p className="font-body text-lg text-text-secondary max-w-xl">
                Every Team. One List. The definitive college football ranking —{" "}
                <span className="text-text-muted">FBS through NAIA on one unified list.</span>
              </p>
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap gap-6 sm:gap-8">
              <StatItem value={rankings.length.toLocaleString()} label="Teams" />
              <StatItem value="1,247" label="Total Tracked" />
              <StatItem value="5" label="Divisions" />
            </div>
          </div>
        </div>
      </section>

      {/* Rankings Table */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <Suspense fallback={<RankingsSkeleton />}>
          {rankings.length > 0 ? (
            <RankingsTable rankings={rankings} />
          ) : (
            <EmptyState />
          )}
        </Suspense>
      </section>

      {/* Features Preview */}
      <section className="max-w-7xl mx-auto px-4 py-12 border-t border-bg-elevated">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl text-text-primary mb-3">
            Explore the Platform
          </h2>
          <p className="text-text-secondary">
            18 features built for the obsessive college football fan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureLink
            title="Chaos Index"
            href="/chaos"
            color="chaos"
            description=" wildest games scored"
          />
          <FeatureLink
            title="The Lab"
            href="/lab"
            color="purple"
            description=" outliers & anomalies"
          />
          <FeatureLink
            title="Matchup Machine"
            href="/matchup"
            color="teal"
            description=" simulate any game"
          />
          <FeatureLink
            title="Coach Intelligence"
            href="/coaches"
            color="default"
            description=" graded decisions"
          />
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// Components
// ============================================================================

interface RankingsTableProps {
  rankings: Array<{
    rank: number | null;
    rating: string | { toNumber(): number; toString(): string };
    ratingChange: number | { toNumber(): number } | null;
    previousRank: number | null;
    team: {
      id: number;
      name: string;
      abbreviation: string | null;
      mascot: string | null;
      slug: string;
      primaryColor: string | null;
      secondaryColor: string | null;
      logoUrl: string | null;
      metadata: unknown;
      level: {
        name: string;
      };
      conference: {
        name: string | null;
      } | null;
    };
  }>;
}

function RankingsTable({ rankings }: RankingsTableProps) {
  return (
    <Card variant="elevated" padding="none">
      <CardHeader className="px-6 py-4 border-b border-bg-elevated">
        <CardTitle>Full Rankings</CardTitle>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-bg-elevated">
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider w-16">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Team
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider w-16">
                Level
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider w-20">
                Conf
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider w-24">
                Rating
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider w-20">
                Trend
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider w-16">
                Change
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-elevated">
            {rankings.map((tr, index) => {
              const rating = typeof tr.rating === 'string' ? parseFloat(tr.rating) : tr.rating.toNumber();
              const ratingChange = tr.ratingChange == null ? 0 : typeof tr.ratingChange === 'number' ? tr.ratingChange : tr.ratingChange.toNumber();
              const previousRating = rating - ratingChange;
              const trend = rating > previousRating ? "up" : rating < previousRating ? "down" : "neutral";

              return (
                <tr
                  key={tr.team.id}
                  className="hover:bg-bg-elevated/50 transition-colors group"
                  style={{
                    borderLeft: tr.team.primaryColor
                      ? `3px solid ${tr.team.primaryColor}`
                      : "3px solid transparent",
                  }}
                >
                  {/* Rank */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "font-mono font-bold text-sm",
                        tr.rank === 1 && "text-accent-teal",
                        tr.rank === 2 && "text-accent-secondary",
                        tr.rank === 3 && "text-accent-warning"
                      )}
                    >
                      {tr.rank ?? "--"}
                    </span>
                  </td>

                  {/* Team */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/team/${tr.team.slug}`}
                      className="flex items-center gap-3 group-hover:text-accent-teal transition-colors"
                    >
                      <TeamLogo
                        teamName={tr.team.name}
                        logoUrl={tr.team.logoUrl}
                        logos={(tr.team.metadata as Record<string, unknown> | null)?.logos as string[] | undefined}
                        abbreviation={tr.team.abbreviation}
                        primaryColor={tr.team.primaryColor}
                        secondaryColor={tr.team.secondaryColor}
                        size="sm"
                        shape="circle"
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-text-primary">
                          {tr.team.name}
                        </span>
                        {tr.team.mascot && (
                          <span className="text-xs text-text-muted">
                            {tr.team.mascot}
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>

                  {/* Level */}
                  <td className="px-4 py-3">
                    <Badge variant={getLevelBadgeColor(tr.team.level.name)}>
                      {tr.team.level.name}
                    </Badge>
                  </td>

                  {/* Conference */}
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {tr.team.conference?.name ?? "Independent"}
                  </td>

                  {/* Rating */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-mono font-medium text-text-primary">
                        {Math.round(rating)}
                      </span>
                      <span className="text-xs text-text-muted">
                        ±{Math.round(50)} {/* TODO: Calculate actual RD */}
                      </span>
                    </div>
                  </td>

                  {/* Trend Sparkline */}
                  <td className="px-4 py-3">
                    <MiniSparkline
                      value={rating}
                      previous={previousRating}
                      history={[previousRating, rating]} // TODO: Get full history
                    />
                  </td>

                  {/* Change */}
                  <td className="px-4 py-3 text-center">
                    {tr.previousRank !== null && tr.rank !== null ? (
                      <RankChange
                        current={tr.rank}
                        previous={tr.previousRank}
                      />
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CardContent className="px-6 py-4 border-t border-bg-elevated">
        <div className="flex items-center justify-between text-sm text-text-muted">
          <span>Showing top {rankings.length} teams</span>
          <Link href="/rankings" className="text-accent-teal hover:underline">
            View all rankings →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function RankChange({ current, previous }: { current: number; previous: number }) {
  const diff = previous - current;

  if (diff === 0) {
    return <span className="text-text-muted text-xs">—</span>;
  }

  const color = diff > 0 ? "text-accent-positive" : "text-accent-negative";
  const icon = diff > 0 ? "↑" : "↓";

  return (
    <span className={cn("font-mono text-xs", color)}>
      {icon} {Math.abs(diff)}
    </span>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-xl sm:text-2xl text-accent-teal">{value}</span>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}

interface FeatureLinkProps {
  title: string;
  href: string;
  color: "teal" | "purple" | "chaos" | "warning" | "default";
  description: string;
}

function FeatureLink({ title, href, color, description }: FeatureLinkProps) {
  const colors = {
    teal: "border-accent-teal/30 hover:border-accent-teal/60",
    purple: "border-accent-purple/30 hover:border-accent-purple/60",
    chaos: "border-accent-chaos/30 hover:border-accent-chaos/60",
    warning: "border-accent-warning/30 hover:border-accent-warning/60",
    default: "border-bg-elevated hover:border-bg-elevated",
  };

  return (
    <Link href={href}>
      <div className={cn(
        "p-4 rounded-lg border bg-bg-secondary/50 transition-all hover:bg-bg-card",
        colors[color]
      )}>
        <h3 className="font-display text-base text-text-primary mb-1">
          {title}
        </h3>
        <p className="text-xs text-text-secondary">
          {description}
        </p>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <Card padding="lg">
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🏈</div>
        <h3 className="font-display text-xl text-text-primary mb-2">
          No Rankings Yet
        </h3>
        <p className="text-text-secondary mb-6">
          Rankings will appear here after data seeding and computation.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm text-text-muted">
          <code className="px-3 py-1.5 rounded bg-bg-card">npm run db:seed</code>
          <span>then</span>
          <code className="px-3 py-1.5 rounded bg-bg-card">npm run compute:gridrank</code>
        </div>
      </div>
    </Card>
  );
}

function RankingsSkeleton() {
  return (
    <Card variant="elevated" padding="none">
      <CardHeader className="px-6 py-4 border-b border-bg-elevated">
        <div className="h-6 w-32 bg-bg-elevated rounded animate-pulse" />
      </CardHeader>
      <div className="p-6 space-y-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-10 bg-bg-elevated rounded animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-bg-elevated rounded animate-pulse" />
              <div className="h-3 w-32 bg-bg-elevated rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
