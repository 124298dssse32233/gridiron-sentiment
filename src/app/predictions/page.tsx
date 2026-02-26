/**
 * Predictions Page
 *
 * Weekly game predictions with win probabilities, confidence intervals,
 * and upset alerts powered by GridRank ratings.
 */

"use client";

import { useState, useEffect } from "react";
import { PredictionCard } from "@/components/predictions/prediction-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Calendar,
} from "lucide-react";

interface GamePrediction {
  gameId: number;
  homeWinProb: number;
  awayWinProb: number;
  predictedSpread: number;
  confidenceIntervalLow: number;
  confidenceIntervalHigh: number;
  confidence: number;
  homeFavored: boolean;
  upsetAlert: boolean;
  modelVersion: string;
  predictedAt: Date | string;
  narrative: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  homeTeamLevel: string;
  awayTeamLevel: string;
  gameDate: Date | string | null;
}

interface PredictionsData {
  predictions: GamePrediction[];
}

interface PredictionsMeta {
  season: number;
  week: number;
  returned: number;
  total: number;
  accuracy: {
    ytd: number;
    lastWeek: number;
  };
  timestamp: string;
}

export default function PredictionsPage() {
  const [data, setData] = useState<PredictionsData | null>(null);
  const [meta, setMeta] = useState<PredictionsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [season, setSeason] = useState(2024);
  const [week, setWeek] = useState<number | null>(null);
  const [minConfidence, setMinConfidence] = useState(0);

  const currentWeek = week ?? meta?.week ?? 1;

  const fetchPredictions = async (newSeason: number, newWeek: number | null) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        season: newSeason.toString(),
        ...(newWeek !== null && { week: newWeek.toString() }),
        ...(minConfidence > 0 && { minConfidence: minConfidence.toString() }),
        limit: "50",
      });

      const response = await fetch(`/api/predictions?${params}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setMeta(result.meta);
      } else {
        setError(result.error || "Failed to load predictions");
      }
    } catch (err) {
      console.error("Error fetching predictions:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions(season, week);
  }, [season, week, minConfidence]);

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

  const handleMinConfidenceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMinConfidence(parseFloat(e.target.value));
  };

  const upsetCount = data?.predictions.filter((p) => p.upsetAlert).length ?? 0;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-bg-elevated">
        <div className="absolute inset-0 bg-gradient-to-b from-bg-secondary via-bg-primary to-bg-primary" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent-teal/10 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-bg-elevated mb-4">
                <TrendingUp className="w-4 h-4 text-accent-teal" />
                <span className="text-sm text-text-secondary">
                  Win probabilities powered by GridRank ratings
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-text-primary mb-2">
                Predictions
              </h1>

              <p className="font-body text-lg text-text-secondary max-w-xl">
                Weekly game predictions with win probabilities, confidence
                intervals, and upset alerts.
              </p>
            </div>

            {/* Accuracy Stats */}
            {!loading && meta && (
              <div className="flex gap-6">
                <AccuracyStat label="YTD Accuracy" value={`${(meta.accuracy.ytd * 100).toFixed(1)}%`} />
                <AccuracyStat label="Last Week" value={`${(meta.accuracy.lastWeek * 100).toFixed(1)}%`} />
              </div>
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
                className="px-3 py-1.5 bg-bg-elevated border border-bg-card rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-teal/50"
              >
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
                <option value={2022}>2022</option>
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

            {/* Confidence Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-text-muted" />
              <label htmlFor="confidence-select" className="text-sm text-text-secondary">
                Min Confidence
              </label>
              <select
                id="confidence-select"
                value={minConfidence}
                onChange={handleMinConfidenceChange}
                className="px-3 py-1.5 bg-bg-elevated border border-bg-card rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-teal/50"
              >
                <option value={0}>All Games</option>
                <option value={0.4}>40%+</option>
                <option value={0.5}>50%+</option>
                <option value={0.6}>60%+</option>
                <option value={0.7}>70%+</option>
                <option value={0.8}>80%+</option>
              </select>
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPredictions(season, week)}
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
            <TrendingUp className="w-12 h-12 text-accent-teal animate-pulse mb-4" />
            <p className="text-text-secondary">Loading predictions...</p>
          </div>
        )}

        {error && (
          <Card padding="lg" className="mb-8">
            <CardContent>
              <p className="text-accent-negative mb-2">Error loading predictions</p>
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
                value={data.predictions.length.toString()}
              />
              <StatItem
                label="Upset Alerts"
                value={upsetCount.toString()}
                highlight={upsetCount > 0}
              />
              <StatItem
                label="Avg Confidence"
                value={
                  data.predictions.length > 0
                    ? `${(
                        (data.predictions.reduce((sum, p) => sum + p.confidence, 0) /
                          data.predictions.length) *
                        100
                      ).toFixed(0)}%`
                    : "—"
                }
              />
            </div>

            {/* Predictions Grid */}
            {data.predictions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.predictions.map((prediction) => (
                  <PredictionCard
                    key={prediction.gameId}
                    prediction={prediction}
                    homeTeamLogo={prediction.homeTeamLogo}
                    awayTeamLogo={prediction.awayTeamLogo}
                  />
                ))}
              </div>
            ) : (
              <Card padding="lg">
                <CardContent className="text-center py-12">
                  <Calendar className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <p className="text-text-secondary">No predictions found for this week</p>
                  <p className="text-sm text-text-muted mt-2">
                    Try selecting a different week or lowering the minimum confidence
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

function AccuracyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-text-secondary uppercase tracking-wide">{label}</p>
      <p className="font-mono text-2xl font-bold text-accent-teal">{value}</p>
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
          highlight ? "text-accent-teal" : "text-text-primary"
        )}
      >
        {value}
      </span>
    </div>
  );
}
