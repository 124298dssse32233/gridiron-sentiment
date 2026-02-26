/**
 * Week Tier Badge Component
 *
 * Displays the overall chaos tier for a week
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { Flame, Activity, AlertCircle, Minus } from "lucide-react";

interface WeekTierBadgeProps {
  weekScore: number;
  weekTier: string;
}

export function WeekTierBadge({ weekScore, weekTier }: WeekTierBadgeProps) {
  const config = getTierConfig(weekTier);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className={cn("p-2 rounded-full", config.iconBgColor)}>
        <config.icon className={cn("w-5 h-5", config.iconColor)} />
      </div>
      <div>
        <p className="text-xs text-text-secondary font-medium">Week Chaos Tier</p>
        <p className={cn("text-lg font-bold font-display", config.textColor)}>
          {weekTier}
        </p>
      </div>
      <div className="ml-auto text-right">
        <p className="text-xs text-text-secondary">Score</p>
        <p className="font-mono text-xl font-bold text-text-primary">
          {weekScore.toFixed(1)}
        </p>
      </div>
    </div>
  );
}

interface TierConfig {
  icon: React.ElementType;
  bgColor: string;
  borderColor: string;
  iconBgColor: string;
  iconColor: string;
  textColor: string;
}

function getTierConfig(tier: string): TierConfig {
  const configs: Record<string, TierConfig> = {
    "Chaos Reigns": {
      icon: Flame,
      bgColor: "bg-accent-chaos/10",
      borderColor: "border-accent-chaos/30",
      iconBgColor: "bg-accent-chaos/20",
      iconColor: "text-accent-chaos",
      textColor: "text-accent-chaos",
    },
    "Mayhem": {
      icon: Activity,
      bgColor: "bg-accent-warning/10",
      borderColor: "border-accent-warning/30",
      iconBgColor: "bg-accent-warning/20",
      iconColor: "text-accent-warning",
      textColor: "text-accent-warning",
    },
    "Elevated": {
      icon: TrendingUp,
      bgColor: "bg-accent-secondary/10",
      borderColor: "border-accent-secondary/30",
      iconBgColor: "bg-accent-secondary/20",
      iconColor: "text-accent-secondary",
      textColor: "text-accent-secondary",
    },
    "Notable": {
      icon: AlertCircle,
      bgColor: "bg-accent-teal/10",
      borderColor: "border-accent-teal/30",
      iconBgColor: "bg-accent-teal/20",
      iconColor: "text-accent-teal",
      textColor: "text-accent-teal",
    },
    "Normal": {
      icon: Minus,
      bgColor: "bg-bg-elevated/30",
      borderColor: "border-bg-elevated",
      iconBgColor: "bg-bg-elevated",
      iconColor: "text-text-muted",
      textColor: "text-text-secondary",
    },
    "unknown": {
      icon: Minus,
      bgColor: "bg-bg-elevated/30",
      borderColor: "border-bg-elevated",
      iconBgColor: "bg-bg-elevated",
      iconColor: "text-text-muted",
      textColor: "text-text-secondary",
    },
  };

  return configs[tier] || configs["unknown"];
}

function TrendingUp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
