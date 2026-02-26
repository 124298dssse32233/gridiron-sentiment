/**
 * Simulation Results Component
 *
 * Displays the results of a Monte Carlo matchup simulation
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamLogo } from "@/components/ui/team-logo";
import { cn } from "@/lib/utils/cn";
import { Trophy, TrendingUp, BarChart3, Scale } from "lucide-react";

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

interface SimulationResultsProps {
  result: SimulationResult;
  teamAName: string;
  teamBName: string;
  teamALogo: string | null;
  teamBLogo: string | null;
}

export function SimulationResults({
  result,
  teamAName,
  teamBName,
  teamALogo,
  teamBLogo,
}: SimulationResultsProps) {
  const { teamA, teamB, upsetProbability } = result;

  const favorite = teamA.winProbability > teamB.winProbability ? teamA : teamB;
  const underdog = teamA.winProbability > teamB.winProbability ? teamB : teamA;

  const predictedWinner = teamA.winProbability > teamB.winProbability ? "A" : "B";
  const spread = Math.abs(teamA.avgScore - teamB.avgScore);

  return (
    <div className="space-y-6">
      {/* Win Probability Bar */}
      <Card padding="lg">
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Win Probability
          </h3>

          <div className="space-y-4">
            {/* Team A */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TeamLogo
                    team={teamA.name}
                    abbreviation={teamA.slug}
                    logoUrl={teamALogo}
                    size="sm"
                  />
                  <span className="text-sm font-medium text-text-primary">
                    {teamA.name}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-text-primary">
                  {(teamA.winProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-8 bg-bg-elevated rounded-full overflow-hidden flex">
                <div
                  className="bg-accent-teal h-full transition-all duration-500"
                  style={{ width: `${teamA.winProbability * 100}%` }}
                />
              </div>
            </div>

            {/* Team B */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TeamLogo
                    team={teamB.name}
                    abbreviation={teamB.slug}
                    logoUrl={teamBLogo}
                    size="sm"
                  />
                  <span className="text-sm font-medium text-text-primary">
                    {teamB.name}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-text-primary">
                  {(teamB.winProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-8 bg-bg-elevated rounded-full overflow-hidden flex">
                <div
                  className="bg-accent-secondary h-full transition-all duration-500"
                  style={{ width: `${teamB.winProbability * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Predicted Winner */}
          <div className="mt-6 pt-6 border-t border-bg-elevated">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Predicted Winner</span>
              <Badge
                variant={predictedWinner === "A" ? "primary" : "secondary"}
                className="text-sm"
              >
                {predictedWinner === "A" ? teamA.name : teamB.name}
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-text-secondary">Predicted Spread</span>
              <span className="font-mono text-sm font-medium text-text-primary">
                {predictedWinner === "A" ? "+" : "-"}
                {spread.toFixed(1)}
              </span>
            </div>
            {result.ties > 0 && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-text-secondary">Tie Probability</span>
                <span className="font-mono text-sm font-medium text-text-muted">
                  {((result.ties / result.simulations) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Score Projection */}
      <Card padding="lg">
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Score Projection
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Team A Score */}
            <div className="text-center p-4 bg-bg-elevated rounded-lg">
              <TeamLogo
                team={teamA.name}
                abbreviation={teamA.slug}
                logoUrl={teamALogo}
                size="md"
              />
              <p className="text-sm text-text-secondary mt-2">{teamA.name}</p>
              <p className="font-mono text-4xl font-bold text-text-primary mt-1">
                {teamA.avgScore.toFixed(1)}
              </p>
              <p className="text-xs text-text-muted mt-1">
                ±{teamA.stdDev.toFixed(1)} std dev
              </p>
            </div>

            {/* Team B Score */}
            <div className="text-center p-4 bg-bg-elevated rounded-lg">
              <TeamLogo
                team={teamB.name}
                abbreviation={teamB.slug}
                logoUrl={teamBLogo}
                size="md"
              />
              <p className="text-sm text-text-secondary mt-2">{teamB.name}</p>
              <p className="font-mono text-4xl font-bold text-text-primary mt-1">
                {teamB.avgScore.toFixed(1)}
              </p>
              <p className="text-xs text-text-muted mt-1">
                ±{teamB.stdDev.toFixed(1)} std dev
              </p>
            </div>
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-bg-elevated text-center">
            <span className="text-sm text-text-secondary">Projected Total</span>
            <p className="font-mono text-2xl font-bold text-text-primary">
              {(teamA.avgScore + teamB.avgScore).toFixed(1)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upset Alert */}
      {upsetProbability > 0.2 && (
        <Card variant="glow" padding="lg" className="border-accent-warning/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent-warning/10 rounded-full">
                <Scale className="w-5 h-5 text-accent-warning" />
              </div>
              <div>
                <h4 className="font-medium text-text-primary">Upset Alert</h4>
                <p className="text-sm text-text-secondary mt-1">
                  {underdog.name} has a{" "}
                  <span className="font-mono font-bold text-accent-warning">
                    {(upsetProbability * 100).toFixed(1)}%
                  </span>{" "}
                  chance to win according to the simulation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simulation Info */}
      <Card padding="md">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>
              {result.simulations.toLocaleString()} simulations
            </span>
            <span>Model: {result.model}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
