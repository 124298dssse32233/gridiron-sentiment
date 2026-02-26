/**
 * Matchup Machine Page
 *
 * Pick any two teams, any level. Simulate the matchup using
 * Monte Carlo simulation based on GridRank ratings.
 */

"use client";

import { useState } from "react";
import { TeamSelector } from "@/components/matchup/team-selector";
import { SimulationResults } from "@/components/matchup/simulation-results";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  Swords,
  RotateCcw,
  Settings,
  Zap,
  Info,
} from "lucide-react";

interface Team {
  id: number;
  name: string;
  abbreviation: string | null;
  slug: string;
  logoUrl: string | null;
  level: { name: string } | null;
}

interface SimulationResult {
  teamA: {
    name: string;
    slug: string;
    wins: number;
    winProbability: number;
    avgScore: number;
    stdDev: number;
  };
  teamB: {
    name: string;
    slug: string;
    wins: number;
    winProbability: number;
    avgScore: number;
    stdDev: number;
  };
  ties: number;
  upsets: number;
  upsetProbability: number;
  spreadDistribution: Record<number, number>;
  simulations: number;
  model: string;
  timestamp: string;
}

export default function MatchupPage() {
  const [teamA, setTeamA] = useState<Team | null>(null);
  const [teamB, setTeamB] = useState<Team | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulations, setSimulations] = useState(10000);
  const [neutralSite, setNeutralSite] = useState(false);

  const canSimulate = teamA && teamB && teamA.id !== teamB.id;

  const runSimulation = async () => {
    if (!teamA || !teamB || !canSimulate) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/matchup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamA: teamA.slug,
          teamB: teamB.slug,
          simulations,
          neutralSite,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Simulation failed");
      }

      if (data.success) {
        setResult(data.data);
      } else {
        throw new Error(data.error || "Simulation failed");
      }
    } catch (err) {
      console.error("Simulation error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setTeamA(null);
    setTeamB(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-bg-elevated">
        <div className="absolute inset-0 bg-gradient-to-b from-bg-secondary via-bg-primary to-bg-primary" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent-secondary/10 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-bg-elevated mb-4">
              <Swords className="w-4 h-4 text-accent-secondary" />
              <span className="text-sm text-text-secondary">
                Monte Carlo simulation powered by GridRank ratings
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-text-primary mb-4">
              Matchup <span className="text-accent-secondary">Machine</span>
            </h1>

            <p className="font-body text-lg text-text-secondary">
              Pick any two teams, from any division. Simulate the matchup
              thousands of times to see win probabilities, projected scores,
              and upset potential.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Team Selection */}
          <div className="space-y-6">
            {/* Team A */}
            <TeamSelector
              label="Team A (Home)"
              selectedTeam={teamA}
              onTeamSelect={setTeamA}
              onClear={() => setTeamA(null)}
              excludeTeam={teamB}
            />

            {/* VS Divider */}
            {teamA && teamB && (
              <div className="flex items-center justify-center">
                <Badge variant="secondary" className="text-lg py-2 px-4 gap-2">
                  <Swords className="w-4 h-4" />
                  VS
                  <Swords className="w-4 h-4" />
                </Badge>
              </div>
            )}

            {/* Team B */}
            <TeamSelector
              label="Team B (Away)"
              selectedTeam={teamB}
              onTeamSelect={setTeamB}
              onClear={() => setTeamB(null)}
              excludeTeam={teamA}
            />

            {/* Simulation Options */}
            {(teamA || teamB) && (
              <Card padding="md">
                <h3 className="text-sm font-medium text-text-secondary mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Simulation Options
                </h3>

                <div className="space-y-4">
                  {/* Simulation Count */}
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">
                      Simulations: {simulations.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min={100}
                      max={50000}
                      step={100}
                      value={simulations}
                      onChange={(e) => setSimulations(parseInt(e.target.value))}
                      className="w-full accent-accent-secondary"
                    />
                    <div className="flex justify-between text-xs text-text-muted mt-1">
                      <span>100</span>
                      <span>50,000</span>
                    </div>
                  </div>

                  {/* Neutral Site */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-primary">Neutral Site</p>
                      <p className="text-xs text-text-muted">
                        Remove home field advantage
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNeutralSite(!neutralSite)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        neutralSite
                          ? "bg-accent-secondary"
                          : "bg-bg-elevated"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          neutralSite ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="default"
                size="lg"
                onClick={runSimulation}
                disabled={!canSimulate || loading}
                className="flex-1 gap-2"
              >
                <Zap className="w-4 h-4" />
                {loading ? "Simulating..." : "Simulate"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={reset}
                disabled={loading}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {/* Error */}
            {error && (
              <Card padding="md" className="border-accent-negative/30">
                <p className="text-sm text-accent-negative">{error}</p>
              </Card>
            )}

            {/* Info */}
            <Card padding="md">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-accent-teal flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-primary mb-1">
                    How it works
                  </p>
                  <p className="text-xs text-text-muted">
                    We run Monte Carlo simulations based on each team&apos;s GridRank
                    rating and home field advantage. Each simulation generates a
                    predicted score using a normal distribution, and we aggregate
                    thousands of runs to calculate win probabilities.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div>
            {result && teamA && teamB ? (
              <SimulationResults
                result={result}
                teamAName={teamA.name}
                teamBName={teamB.name}
                teamALogo={teamA.logoUrl}
                teamBLogo={teamB.logoUrl}
              />
            ) : (
              <Card padding="lg" className="h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <Swords className="w-16 h-16 text-text-muted mx-auto mb-4" />
                  <p className="text-text-secondary">
                    Select two teams to simulate a matchup
                  </p>
                  <p className="text-sm text-text-muted mt-2">
                    Pick any teams from FBS, FCS, D2, D3, or NAIA
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
