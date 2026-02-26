/**
 * Pulse Page
 *
 * Real-time fan and media sentiment for every team.
 * The mood of college football, measured.
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamLogo } from "@/components/ui/team-logo";
import { cn } from "@/lib/utils/cn";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Newspaper,
  MessageSquare,
  Search,
  RefreshCw,
  Flame,
} from "lucide-react";
import Link from "next/link";

interface PulseData {
  leaderboard: {
    mostPositive: TeamEntry[];
    mostNegative: TeamEntry[];
  };
  controversies: TeamEntry[];
  risers: TeamEntry[];
  divergences: DivergenceEntry[];
  playerBuzz: PlayerBuzzEntry[];
  coachApproval: CoachApprovalEntry[];
  weekStats: {
    avgScore: number;
    totalMentions: number;
    mostDiscussed: string | null;
  };
}

interface TeamEntry {
  teamId: number;
  name: string;
  abbreviation: string | null;
  slug: string;
  logoUrl: string | null;
  level: string;
  score: number | null;
  trend: string | null;
  buzzVolume: number | null;
}

interface DivergenceEntry extends TeamEntry {
  mediaScore: number | null;
  fanScore: number | null;
  divergence: number;
}

interface PlayerBuzzEntry {
  playerName: string;
  teamName: string;
  teamSlug: string;
  position: string | null;
  buzzZscore: number | null;
  buzzStatus: string | null;
  mentionCount: number | null;
  sentimentScore: number | null;
}

interface CoachApprovalEntry {
  teamId: number;
  teamName: string;
  teamSlug: string;
  coachName: string;
  approvalScore: number;
  approvalTrend: string | null;
  mentionCount: number;
}

export default function PulsePage() {
  const [data, setData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPulseData();
  }, []);

  const fetchPulseData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sentiment/pulse");
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to load pulse data");
      }
    } catch (err) {
      console.error("Error fetching pulse data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (score: number | null) => {
    if (!score) return "text-text-muted";
    if (score >= 70) return "text-accent-positive";
    if (score >= 55) return "text-accent-teal";
    if (score >= 40) return "text-accent-warning";
    return "text-accent-negative";
  };

  const getSentimentBadge = (score: number | null) => {
    if (!score) return "default";
    if (score >= 70) return "positive";
    if (score >= 55) return "primary";
    if (score >= 40) return "warning";
    return "negative";
  };

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
                <Activity className="w-4 h-4 text-accent-teal animate-pulse" />
                <span className="text-sm text-text-secondary">
                  The mood of college football, measured
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-text-primary mb-2">
                Pulse
              </h1>

              <p className="font-body text-lg text-text-secondary max-w-xl">
                Real-time fan and media sentiment for every team.
                Track buzz, trends, and the emotional pulse of CFB.
              </p>
            </div>

            {/* Week Stats */}
            {!loading && data && (
              <div className="flex gap-6">
                <WeekStat label="Avg Score" value={`${data.weekStats.avgScore}/100`} />
                <WeekStat
                  label="Total Mentions"
                  value={data.weekStats.totalMentions.toLocaleString()}
                />
                {data.weekStats.mostDiscussed && (
                  <WeekStat label="Most Discussed" value={data.weekStats.mostDiscussed} />
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="border-b border-bg-elevated bg-bg-card/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a team to see detailed sentiment..."
                className="w-full pl-9 pr-3 py-2 bg-bg-elevated border border-bg-card rounded-md text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-teal/50"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPulseData}
              disabled={loading}
              className="gap-2"
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
            <Activity className="w-12 h-12 text-accent-teal animate-pulse mb-4" />
            <p className="text-text-secondary">Measuring pulse...</p>
          </div>
        )}

        {error && (
          <Card padding="lg" className="mb-8">
            <CardContent>
              <p className="text-accent-negative mb-2">Error loading pulse data</p>
              <p className="text-sm text-text-muted">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Leaderboards */}
            <div className="space-y-6">
              {/* Most Positive */}
              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-accent-positive" />
                    Most Positive
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.leaderboard.mostPositive.slice(0, 5).map((team) => (
                      <TeamRow
                        key={team.teamId}
                        team={team}
                        showScore
                        showTrend
                        colorVariant="positive"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Most Negative */}
              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-accent-negative" />
                    Most Negative
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.leaderboard.mostNegative.slice(0, 5).map((team) => (
                      <TeamRow
                        key={team.teamId}
                        team={team}
                        showScore
                        showTrend
                        colorVariant="negative"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Middle Column - Controversy & Risers */}
            <div className="space-y-6">
              {/* Controversy Tracker */}
              <Card padding="lg" className="border-accent-chaos/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-accent-chaos" />
                    Controversy Tracker
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-text-muted mb-3">
                    Teams with negative sentiment trends
                  </p>
                  <div className="space-y-2">
                    {data.controversies.length > 0 ? (
                      data.controversies.map((team) => (
                        <TeamRow
                          key={team.teamId}
                          team={team}
                          showScore
                          showTrend
                          colorVariant="chaos"
                        />
                      ))
                    ) : (
                      <p className="text-sm text-text-muted text-center py-4">
                        No controversies this week
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Biggest Risers */}
              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Flame className="w-4 h-4 text-accent-teal" />
                    Rising Fast
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.risers.map((team) => (
                      <TeamRow
                        key={team.teamId}
                        team={team}
                        showScore
                        colorVariant="primary"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Coach Approval */}
              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent-secondary" />
                    Coach Approval
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.coachApproval.slice(0, 5).map((coach) => (
                      <CoachApprovalRow key={coach.teamId} coach={coach} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Divergences & Player Buzz */}
            <div className="space-y-6">
              {/* Media vs Fans */}
              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Newspaper className="w-4 h-4 text-accent-warning" />
                    Media vs Fans
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-text-muted mb-3">
                    Biggest opinion gaps
                  </p>
                  <div className="space-y-3">
                    {data.divergences.map((entry) => (
                      <DivergenceBar key={entry.teamId} entry={entry} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Player Buzz */}
              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-accent-purple" />
                    Player Buzz
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.playerBuzz.slice(0, 8).map((player, i) => (
                      <PlayerBuzzRow key={`${player.playerName}-${i}`} player={player} rank={i + 1} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

interface WeekStatProps {
  label: string;
  value: string | number;
}

function WeekStat({ label, value }: WeekStatProps) {
  return (
    <div className="text-center">
      <p className="text-xs text-text-secondary uppercase tracking-wide">{label}</p>
      <p className="font-mono text-2xl font-bold text-accent-teal">{value}</p>
    </div>
  );
}

interface TeamRowProps {
  team: TeamEntry;
  showScore?: boolean;
  showTrend?: boolean;
  colorVariant?: "positive" | "negative" | "chaos" | "primary";
}

function TeamRow({ team, showScore, showTrend, colorVariant = "default" }: TeamRowProps) {
  const colors = {
    positive: "text-accent-positive",
    negative: "text-accent-negative",
    chaos: "text-accent-chaos",
    primary: "text-accent-teal",
    default: "text-text-primary",
  };

  return (
    <Link href={`/team/${team.slug}`} className="block">
      <div className="flex items-center gap-3 p-2 rounded-md hover:bg-bg-elevated transition-colors">
        <TeamLogo
          team={team.name}
          abbreviation={team.abbreviation}
          logoUrl={team.logoUrl}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{team.name}</p>
          {showScore && team.score !== null && (
            <p className={cn("text-xs font-mono", colors[colorVariant])}>
              {team.score.toFixed(1)}/100
            </p>
          )}
        </div>
        {showTrend && team.trend && (
          <Badge
            variant={team.trend === "up" ? "positive" : team.trend === "down" ? "negative" : "default"}
            className="text-xs"
          >
            {team.trend}
          </Badge>
        )}
      </div>
    </Link>
  );
}

interface DivergenceBarProps {
  entry: DivergenceEntry;
}

function DivergenceBar({ entry }: DivergenceBarProps) {
  const mediaScore = entry.mediaScore ?? 50;
  const fanScore = entry.fanScore ?? 50;
  const divergence = entry.divergence;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <TeamLogo
          team={entry.name}
          abbreviation={entry.abbreviation}
          logoUrl={entry.logoUrl}
          size="sm"
        />
        <span className="text-xs font-medium text-text-primary flex-1 truncate">
          {entry.name}
        </span>
        <span className="font-mono text-xs text-accent-warning">{divergence.toFixed(0)}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden">
        <div
          className="bg-accent-secondary"
          style={{ width: `${mediaScore}%` }}
          title={`Media: ${mediaScore.toFixed(0)}`}
        />
        <div
          className="bg-accent-teal"
          style={{ width: `${fanScore}%` }}
          title={`Fans: ${fanScore.toFixed(0)}`}
        />
      </div>
    </div>
  );
}

interface CoachApprovalRowProps {
  coach: CoachApprovalEntry;
}

function CoachApprovalRow({ coach }: CoachApprovalRowProps) {
  const getColor = (score: number) => {
    if (score >= 70) return "text-accent-positive";
    if (score >= 50) return "text-accent-teal";
    if (score >= 30) return "text-accent-warning";
    return "text-accent-negative";
  };

  return (
    <Link href={`/team/${coach.teamSlug}`} className="block">
      <div className="flex items-center gap-3 p-2 rounded-md hover:bg-bg-elevated transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{coach.coachName}</p>
          <p className="text-xs text-text-muted truncate">{coach.teamName}</p>
        </div>
        <div className="text-right">
          <p className={cn("font-mono text-sm font-bold", getColor(coach.approvalScore))}>
            {coach.approvalScore.toFixed(0)}
          </p>
        </div>
      </div>
    </Link>
  );
}

interface PlayerBuzzRowProps {
  player: PlayerBuzzEntry;
  rank: number;
}

function PlayerBuzzRow({ player, rank }: PlayerBuzzRowProps) {
  const getStatusColor = (status: string | null) => {
    if (status === "VIRAL") return "text-accent-chaos";
    if (status === "TRENDING") return "text-accent-teal";
    if (status === "RISING") return "text-accent-positive";
    return "text-text-muted";
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-md">
      <span className="font-mono text-xs text-text-muted w-5">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {player.playerName}
        </p>
        <p className="text-xs text-text-muted">
          {player.teamName} • {player.position ?? "N/A"}
        </p>
      </div>
      {player.buzzStatus && (
        <Badge variant="default" className="text-xs">
          <span className={getStatusColor(player.buzzStatus)}>{player.buzzStatus}</span>
        </Badge>
      )}
    </div>
  );
}
