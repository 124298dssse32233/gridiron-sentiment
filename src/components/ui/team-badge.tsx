/**
 * Team Badge Component
 *
 * Displays a single team badge with icon, name, and tooltip.
 * Based on the GridLegacy Badge System specification.
 */

"use client";

import { cn } from "@/lib/utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Lucide icon components - simplified mapping
const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  shield: ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  ),
  truck: ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 17h4V5H2v12h3" />
      <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5" />
      <path d="M14 17h1" />
      <circle cx="7.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  ),
  flame: ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  ),
  snowflake: ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="m20 16-4-4 4-4" />
      <path d="m4 8 4 4-4 4" />
      <path d="m16 4-4 4-4-4" />
      <path d="m8 20 4-4 4 4" />
    </svg>
  ),
  crown: ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  ),
  star: ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  "shield-check": ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  trophy: ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  "calendar-check": ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  ),
  medal: ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7.2 2 2 7.3l2 2.1L7.2 2Z" />
      <path d="m16.8 2 5.3 5.3-2 2.1L16.8 2Z" />
      <circle cx="12" cy="14" r="5" />
      <path d="M12 14v9" />
    </svg>
  ),
  play: ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  lock: ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  "rotate-ccw": ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74-2.74L3 12" />
      <path d="M3 3v9h9" />
    </svg>
  ),
};

export interface TeamBadgeProps {
  id: string;
  name: string;
  icon: string;
  tooltip: string;
  borderTier: "gold" | "teal" | "red" | "purple" | "default";
  isPermanent?: boolean;
  isLive?: boolean;
  teamColor?: string;
}

const borderStyles = {
  gold: "border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
  teal: "border-accent-teal/50 shadow-[0_0_10px_rgba(0,245,212,0.2)]",
  red: "border-accent-negative/50 shadow-[0_0_10px_rgba(248,113,113,0.2)]",
  purple: "border-accent-purple/50 shadow-[0_0_10px_rgba(123,97,255,0.2)]",
  default: "border-bg-elevated",
};

export function TeamBadge({
  name,
  icon,
  tooltip,
  borderTier,
  isPermanent,
  isLive,
  teamColor,
}: TeamBadgeProps) {
  const IconComponent = IconMap[icon] || IconMap.shield;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-bg-card transition-all hover:bg-bg-elevated/50",
              borderStyles[borderTier],
              isLive && "animate-pulse",
              teamColor && `shadow-[0_0_12px_${teamColor}15]`
            )}
          >
            <IconComponent className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs font-medium text-text-primary whitespace-nowrap">
              {name}
            </span>
            {isPermanent && (
              <span className="w-1 h-1 rounded-full bg-amber-500" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-bg-elevated border border-bg-card text-text-primary max-w-xs"
        >
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export interface BadgeShelfProps {
  badges: TeamBadgeProps[];
  maxDisplay?: number;
  teamColor?: string;
}

export function BadgeShelf({ badges, maxDisplay = 6, teamColor }: BadgeShelfProps) {
  if (badges.length === 0) {
    return (
      <div className="text-sm text-text-muted italic">
        No badges earned yet
      </div>
    );
  }

  const displayBadges = badges.slice(0, maxDisplay);
  const hasMore = badges.length > maxDisplay;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {displayBadges.map((badge) => (
          <TeamBadge
            key={badge.id}
            {...badge}
            teamColor={teamColor}
          />
        ))}
        {hasMore && (
          <div className="inline-flex items-center px-2.5 py-1 rounded-md border border-bg-elevated bg-bg-card text-xs text-text-muted">
            +{badges.length - maxDisplay} more
          </div>
        )}
      </div>

      {badges.length > maxDisplay && (
        <details className="group">
          <summary className="text-xs text-accent-teal hover:text-accent-teal/80 cursor-pointer list-none inline-flex items-center gap-1">
            <span>View all {badges.length} badges</span>
            <svg
              className="w-3 h-3 transition-transform group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <TeamBadge
                key={badge.id}
                {...badge}
                teamColor={teamColor}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
