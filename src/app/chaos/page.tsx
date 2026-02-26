/**
 * Chaos Index Page
 *
 * The definitive record of college football's most insane games.
 * Shows games ranked by their chaos score - a composite of excitement,
 * upsets, comebacks, lead changes, and drama.
 */

"use client";

import { useState, useEffect } from "react";
import { ChaosGameCard } from "@/components/chaos/chaos-game-card";
import { WeekTierBadge } from "@/components/chaos/week-tier-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  Flame,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
} from "lucide-react";

interface ChaosGameData {
  games: ChaosGame[];
  weekScore: number;
  weekTier: string;
}

interface ChaosGame {
  gameId: number;
  game: {
    id: number;
    season: number;
    week: number | null;
    gameDate: Date | null;
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number | null;
    awayScore: number | null;
  };
  chaosScore: number | null;
  chaosPercentile: number | null;
  components: {
    spreadBustFactor: number | null;
    wpVolatility: number | null;
    upsetMagnitude: number | null;
    excitementIndex: number | null;
    contextWeight: number | null;
    postgameWpInversion: number | null;
  };
  tags: string[];
  headline: string | null;
  narrative: string | null;
  winnerLowestWp: number | null;
  wpCrosses50: number | null;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  homeTeamLevel: string;
  awayTeamLevel: string;
  margin: number | null;
  wasUpset: boolean | null;
}

interface ChaosMeta {
  season: number;
  week: number;
  returned: number;
  timestamp: string;
}

export default function ChaosPage() {
  const [data, setData] = useState<ChaosGameData | null>(null);
  const [meta, setMeta] = useState<ChaosMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [season, setSeason] = useState<number>(2024);
  const [week, setWeek] = useState<number | null>(null);
  const [minScore, setMinScore] = useState<number>(0);

  const currentWeek = week ?? meta?.week ?? 1;

  const fetchChaosData = async (newSeason: number, newWeek: number | null) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        season: newSeason.toString(),
        ...(newWeek !== null && { week: newWeek.toString() }),
        minScore: minScore.toString(),
        limit: "50",
      });

      const response = await fetch(`/api/chaos?${params}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setMeta(result.meta);
      } else {
        setError(result.error || "Failed to load chaos data");
      }
    } catch (err) {
      console.error("Error fetching chaos data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChaosData(season, week);
  }, [season, week, minScore]);

  const handlePrevWeek = () => {
    if (currentWeek > 1) {
      setWeek(currentWeek - 1);
    }
  };

  const handleNextWeek = () => {
    if (currentWeek < 16) {
      setWeek(currentWeek + 1);
    }
  };

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSeason(parseInt(e.target.value));
    setWeek(null);
  };

  const handleMinScoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMinScore(parseInt(e.target.value));
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-bg-elevated">
        <div className="absolute inset-0 bg-gradient-to-b from-bg-secondary via-bg-primary to-bg-primary" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent-chaos/10 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-bg-elevated mb-4">
                <Flame className="w-4 h-4 text-accent-chaos" />
                <span className="text-sm text-text-secondary">
                  The definitive record of college football&apos;s insanity
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-text-primary mb-2">
                Chaos <span className="text-accent-chaos">Index</span>
              </h1>

              <p className="font-body text-lg text-text-secondary max-w-xl">
                Every game scored on 8 dimensions of chaos. Upsets, comebacks,
                lead changes, momentum swings — measured.
              </p>
            </div>

            {data && !loading && (
              <WeekTierBadge weekScore={data.weekScore} weekTier={data.weekTier} />
            )}
          </div>
        </div>
      </section>

      {/* Controls */}
      <section className="border-b border-bg-elevated bg-bg-card/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Season Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="season-select" className="text-sm text-text-secondary">
                Season
              </label>
              <select
                id="season-select"
                value={season}
                onChange={handleSeasonChange}
                className="px-3 py-1.5 bg-bg-elevated border border-bg-card rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-chaos/50"
              >
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
                <option value={2022}>2022</option>
                <option value={2021}>2021</option>
              </select>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary">Week</label>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevWeek}
                disabled={currentWeek <= 1 || loading}
                className="px-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 py-1.5 bg-bg-elevated border border-bg-card rounded-md text-sm text-text-primary min-w-[60px] text-center font-mono">
                {week ?? "All"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextWeek}
                disabled={currentWeek >= 16 || loading}
                className="px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeek(null)}
                disabled={loading}
              >
                All Weeks
              </Button>
            </div>

            {/* Min Score Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-text-muted" />
              <label htmlFor="score-select" className="text-sm text-text-secondary">
                Min Score
              </label>
              <select
                id="score-select"
                value={minScore}
                onChange={handleMinScoreChange}
                className="px-3 py-1.5 bg-bg-elevated border border-bg-card rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-chaos/50"
              >
                <option value={0}>All Games</option>
                <option value={30}>30+ (Notable)</option>
                <option value={45}>45+ (Elevated)</option>
                <option value={60}>60+ (Mayhem)</option>
                <option value={75}>75+ (Chaos Reigns)</option>
              </select>
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchChaosData(season, week)}
              disabled={loading}
              className="ml-auto gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Flame className="w-12 h-12 text-accent-chaos animate-pulse mb-4" />
            <p className="text-text-secondary">Calculating chaos...</p>
          </div>
        )}

        {error && (
          <Card padding="lg" className="mb-8">
            <CardContent>
              <p className="text-accent-negative mb-2">Error loading chaos data</p>
              <p className="text-sm text-text-muted">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && data && (
          <>
            {/* Stats Bar */}
            <div className="flex flex-wrap items-center gap-6 mb-8 p-4 bg-bg-card rounded-lg border border-bg-elevated">
              <StatItem
                label="Games This Week"
                value={data.games.length.toString()}
              />
              <StatItem
                label="Week Score"
                value={data.weekScore.toFixed(1)}
              />
              <StatItem
                label="Week Tier"
                value={data.weekTier}
                highlight={data.weekTier !== "Normal"}
              />
            </div>

            {/* Games Grid */}
            {data.games.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.games.map((game) => (
                  <ChaosGameCard key={game.gameId} game={game} />
                ))}
              </div>
            ) : (
              <Card padding="lg">
                <CardContent className="text-center py-12">
                  <Flame className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <p className="text-text-secondary">No games found matching your filters</p>
                  <p className="text-sm text-text-muted mt-2">
                    Try lowering the minimum score or selecting a different week
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </section>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function StatItem({ label, value, highlight }: StatItemProps) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-text-secondary uppercase tracking-wide">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-lg font-bold",
          highlight ? "text-accent-chaos" : "text-text-primary"
        )}
      >
        {value}
      </span>
    </div>
  );
}
