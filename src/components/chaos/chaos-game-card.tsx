/**
 * Chaos Game Card Component
 *
 * Displays a single game with its chaos score and components
 */

import { GameWithStats as ChaosGame } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TeamLogo } from "@/components/ui/team-logo";
import { cn } from "@/lib/utils/cn";
import {
  Flame,
  TrendingUp,
  AlertTriangle,
  Zap,
  Clock,
  ArrowUpDown,
} from "lucide-react";

interface ChaosGameCardProps {
  game: ChaosGame;
}

function getChaosTierColor(score: number | null): string {
  if (!score) return "text-text-muted";
  if (score >= 80) return "text-accent-chaos";
  if (score >= 60) return "text-accent-warning";
  if (score >= 40) return "text-accent-secondary";
  return "text-text-secondary";
}

function getChaosTierBadge(score: number | null): "chaos" | "warning" | "secondary" | "default" {
  if (!score) return "default";
  if (score >= 80) return "chaos";
  if (score >= 60) return "warning";
  if (score >= 40) return "secondary";
  return "default";
}

export function ChaosGameCard({ game }: ChaosGameCardProps) {
  const chaosScore = game.chaosScore ?? 0;
  const components = game.components;

  const homeScore = game.homeScore ?? 0;
  const awayScore = game.awayScore ?? 0;
  const margin = Math.abs(homeScore - awayScore);

  const isUpset = game.wasUpset;
  const hasTags = game.tags && game.tags.length > 0;

  return (
    <Card
      variant={chaosScore >= 60 ? "glow" : "default"}
      className={cn(
        "overflow-hidden transition-all hover:border-accent-chaos/30",
        chaosScore >= 60 && "border-accent-chaos/20"
      )}
      padding="md"
    >
      {/* Header - Game Info */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Badge variant={getChaosTierBadge(chaosScore)}>
            <span className={cn("font-mono font-bold", getChaosTierColor(chaosScore))}>
              {chaosScore.toFixed(1)}
            </span>
          </Badge>
          {game.week && (
            <span className="text-xs text-text-muted">Week {game.week}</span>
          )}
        </div>

        {isUpset && (
          <Badge variant="chaos" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            UPSET
          </Badge>
        )}
      </div>

      {/* Teams and Score */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Away Team */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <TeamLogo
              team={game.awayTeamName}
              abbreviation={game.awayTeamAbbr}
              logoUrl={game.awayTeamLogo}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {game.awayTeamName}
              </p>
              <p className="text-xs text-text-muted">{game.awayTeamLevel}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <span className="font-mono text-2xl font-bold text-text-primary">
              {awayScore}
            </span>
          </div>
        </div>

        {/* VS */}
        <div className="px-2">
          <span className="text-xs text-text-muted font-mono">@</span>
        </div>

        {/* Home Team */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <TeamLogo
              team={game.homeTeamName}
              abbreviation={game.homeTeamAbbr}
              logoUrl={game.homeTeamLogo}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {game.homeTeamName}
              </p>
              <p className="text-xs text-text-muted">{game.homeTeamLevel}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <span className="font-mono text-2xl font-bold text-text-primary">
              {homeScore}
            </span>
          </div>
        </div>
      </div>

      {/* Margin */}
      {margin > 0 && (
        <div className="text-center mb-4">
          <span className="text-xs text-text-muted">
            {homeScore > awayScore ? `${game.homeTeamAbbr} wins by` : `${game.awayTeamAbbr} wins by`}{" "}
            <span className="font-mono font-medium text-text-secondary">{margin}</span>
          </span>
        </div>
      )}

      {/* Headline */}
      {game.headline && (
        <div className="mb-4 p-3 bg-bg-secondary/50 rounded-md">
          <p className="text-sm text-text-primary font-medium leading-snug">
            {game.headline}
          </p>
        </div>
      )}

      {/* Chaos Components */}
      {components && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <ComponentItem
            icon={<Zap className="w-3 h-3" />}
            label="Excitement"
            value={components.excitementIndex}
          />
          <ComponentItem
            icon={<ArrowUpDown className="w-3 h-3" />}
            label="WP Vol"
            value={components.wpVolatility}
          />
          <ComponentItem
            icon={<TrendingUp className="w-3 h-3" />}
            label="Upset Mag"
            value={components.upsetMagnitude}
          />
          <ComponentItem
            icon={<Flame className="w-3 h-3" />}
            label="Context"
            value={components.contextWeight}
          />
        </div>
      )}

      {/* Tags */}
      {hasTags && (
        <div className="flex flex-wrap gap-1.5">
          {game.tags?.map((tag, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-full bg-bg-elevated text-text-secondary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

interface ComponentItemProps {
  icon: React.ReactNode;
  label: string;
  value: number | null;
}

function ComponentItem({ icon, label, value }: ComponentItemProps) {
  return (
    <div className="flex flex-col items-center p-2 bg-bg-secondary/30 rounded">
      <div className="flex items-center gap-1 text-text-muted mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      {value !== null ? (
        <span className="font-mono text-sm font-medium text-text-primary">
          {value.toFixed(1)}
        </span>
      ) : (
        <span className="font-mono text-xs text-text-muted">—</span>
      )}
    </div>
  );
}
