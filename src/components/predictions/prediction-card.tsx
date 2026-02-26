/**
 * Prediction Card Component
 *
 * Displays a single game prediction with win probabilities and confidence intervals
 */

import { GamePrediction } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamLogo } from "@/components/ui/team-logo";
import { cn } from "@/lib/utils/cn";
import { TrendingUp, AlertTriangle, Calendar } from "lucide-react";

interface PredictionCardProps {
  prediction: GamePrediction;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
}

export function PredictionCard({
  prediction,
  homeTeamLogo,
  awayTeamLogo,
}: PredictionCardProps) {
  const {
    homeWinProb,
    awayWinProb,
    predictedSpread,
    confidenceIntervalLow,
    confidenceIntervalHigh,
    confidence,
    homeFavored,
    upsetAlert,
  } = prediction;

  const favorite = homeFavored ? "home" : "away";
  const underdog = homeFavored ? "away" : "home";
  const winProb = homeFavored ? homeWinProb : awayWinProb;

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return "text-accent-positive";
    if (conf >= 0.6) return "text-accent-teal";
    if (conf >= 0.4) return "text-accent-warning";
    return "text-accent-negative";
  };

  const getConfidenceBadge = (conf: number): "primary" | "secondary" | "warning" | "chaos" | "default" => {
    if (conf >= 0.8) return "primary";
    if (conf >= 0.6) return "secondary";
    if (conf >= 0.4) return "warning";
    return "default";
  };

  return (
    <Card
      padding="md"
      className={cn(
        "transition-all hover:border-accent-teal/30",
        upsetAlert && "border-accent-chaos/30"
      )}
    >
      {/* Upset Alert */}
      {upsetAlert && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-accent-chaos/10 rounded-md">
          <AlertTriangle className="w-4 h-4 text-accent-chaos" />
          <span className="text-xs font-medium text-accent-chaos">
            Upset Alert
          </span>
        </div>
      )}

      {/* Teams and Score */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Away Team */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <TeamLogo
              team={prediction.awayTeamName || "Away"}
              abbreviation={prediction.awayTeamAbbr || "AWAY"}
              logoUrl={awayTeamLogo}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {prediction.awayTeamName}
              </p>
              <p className="text-xs text-text-muted">
                {prediction.awayTeamAbbr} • {prediction.awayTeamLevel}
              </p>
            </div>
          </div>
          {/* Win Probability Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Win Prob</span>
              <span className="font-mono font-medium text-text-primary">
                {(awayWinProb * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-purple transition-all"
                style={{ width: `${awayWinProb * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center gap-1 px-2">
          <span className="text-xs text-text-muted font-mono">@</span>
        </div>

        {/* Home Team */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 justify-end">
            <div className="min-w-0 text-right">
              <p className="text-sm font-medium text-text-primary truncate">
                {prediction.homeTeamName}
              </p>
              <p className="text-xs text-text-muted">
                {prediction.homeTeamAbbr} • {prediction.homeTeamLevel}
              </p>
            </div>
            <TeamLogo
              team={prediction.homeTeamName || "Home"}
              abbreviation={prediction.homeTeamAbbr || "HOME"}
              logoUrl={homeTeamLogo}
              size="sm"
            />
          </div>
          {/* Win Probability Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-medium text-text-primary">
                {(homeWinProb * 100).toFixed(1)}%
              </span>
              <span className="text-text-muted">Win Prob</span>
            </div>
            <div className="h-2 bg-bg-elevated rounded-full overflow-hidden flex justify-end">
              <div
                className="h-full bg-accent-teal transition-all"
                style={{ width: `${homeWinProb * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Prediction Details */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-bg-elevated">
        {/* Spread */}
        <div className="text-center">
          <p className="text-xs text-text-muted mb-1">Spread</p>
          <p className="font-mono text-sm font-medium text-text-primary">
            {predictedSpread > 0 ? "+" : ""}
            {predictedSpread.toFixed(1)}
          </p>
        </div>

        {/* Confidence */}
        <div className="text-center">
          <p className="text-xs text-text-muted mb-1">Confidence</p>
          <Badge variant={getConfidenceBadge(confidence)} className="text-xs">
            <span className={cn("font-mono", getConfidenceColor(confidence))}>
              {(confidence * 100).toFixed(0)}%
            </span>
          </Badge>
        </div>

        {/* Confidence Interval */}
        <div className="text-center">
          <p className="text-xs text-text-muted mb-1">CI (95%)</p>
          <p className="font-mono text-xs text-text-secondary">
            {favorite === "home"
              ? `${(confidenceIntervalLow * 100).toFixed(0)}-${(confidenceIntervalHigh * 100).toFixed(0)}%`
              : `${((1 - confidenceIntervalHigh) * 100).toFixed(0)}-${((1 - confidenceIntervalLow) * 100).toFixed(0)}%`}
          </p>
        </div>
      </div>

      {/* Game Info */}
      {prediction.gameDate && (
        <div className="mt-3 pt-3 border-t border-bg-elevated flex items-center gap-2 text-xs text-text-muted">
          <Calendar className="w-3 h-3" />
          <span>
            {new Date(prediction.gameDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}
    </Card>
  );
}
