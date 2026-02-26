/**
 * Skeleton Loading Components
 *
 * Base primitives for shimmer animation loading states.
 * Matches dark theme with electric teal accent accents.
 */

"use client";

import { cn } from "@/lib/utils/cn";

/* Shimmer Animation CSS */
const SHIMMER_STYLES = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      #1a1f2e 25%,
      #242937 50%,
      #1a1f2e 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
`;

/**
 * Base Skeleton Component
 *
 * Renders a div with shimmer animation.
 */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <>
      <style>{SHIMMER_STYLES}</style>
      <div
        className={cn("skeleton-shimmer rounded", className)}
        {...props}
      />
    </>
  );
}

/**
 * Text Skeleton
 *
 * Multiple lines of text skeletons with varying widths for realistic feel.
 */
export interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  lineHeight?: string;
}

export function SkeletonText({
  lines = 3,
  lineHeight = "h-4",
  className,
  ...props
}: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {[...Array(lines)].map((_, i) => {
        const isLastLine = i === lines - 1;
        const width = isLastLine ? "w-3/5" : "w-full";

        return (
          <Skeleton
            key={i}
            className={cn(lineHeight, width)}
          />
        );
      })}
    </div>
  );
}

/**
 * Circle Skeleton
 *
 * For avatars, logos, and team circles.
 */
export interface SkeletonCircleProps
  extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

const circleSizes = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

export function SkeletonCircle({
  size = "md",
  className,
  ...props
}: SkeletonCircleProps) {
  return (
    <Skeleton
      className={cn(circleSizes[size], "rounded-full", className)}
      {...props}
    />
  );
}

/**
 * Badge Skeleton
 *
 * Small rounded rectangle for badges.
 */
export function SkeletonBadge({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton className={cn("h-5 w-16 rounded-full", className)} {...props} />
  );
}

/**
 * Chart Skeleton
 *
 * Area for chart visualizations with shimmer.
 */
export interface SkeletonChartProps
  extends React.HTMLAttributes<HTMLDivElement> {
  height?: string;
}

export function SkeletonChart({
  height = "h-64",
  className,
  ...props
}: SkeletonChartProps) {
  return (
    <Skeleton
      className={cn(height, "w-full rounded-lg", className)}
      {...props}
    />
  );
}

/**
 * Table Row Skeleton
 *
 * A complete table row with n skeleton cells.
 */
export interface SkeletonTableRowProps
  extends React.HTMLAttributes<HTMLDivElement> {
  columns?: number;
  columnWidths?: (string | number)[];
  staggerDelay?: number;
}

export function SkeletonTableRow({
  columns = 7,
  columnWidths,
  staggerDelay = 0,
  className,
  ...props
}: SkeletonTableRowProps) {
  return (
    <style>{SHIMMER_STYLES}</style>
  );
}

/**
 * Table Row Content (for use in parent grid)
 *
 * Renders table cells with proper spacing.
 */
export function SkeletonTableRowContent({
  columns = 7,
  columnWidths,
  staggerDelay = 0,
  className,
  ...props
}: SkeletonTableRowProps) {
  return (
    <div
      className={cn("flex items-center gap-4 px-4 py-3", className)}
      style={{
        animationDelay: `${staggerDelay * 50}ms`,
      }}
      {...props}
    >
      {[...Array(columns)].map((_, i) => {
        const width = columnWidths?.[i] || "w-24";
        const isFirstColumn = i === 0;

        return (
          <Skeleton
            key={i}
            className={cn(
              "h-4 rounded",
              typeof width === "string" ? width : undefined
            )}
            style={
              typeof width === "number" ? { width: `${width}px` } : undefined
            }
          />
        );
      })}
    </div>
  );
}

/**
 * Card Skeleton
 *
 * Full card with header, body, and optional footer.
 */
export interface SkeletonCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  includeFooter?: boolean;
}

export function SkeletonCard({
  includeFooter = false,
  className,
  ...props
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "bg-bg-card border border-bg-elevated rounded-lg overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Header */}
      <div className="p-4 border-b border-bg-elevated">
        <Skeleton className="h-5 w-32 mb-2" />
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Footer */}
      {includeFooter && (
        <div className="p-4 border-t border-bg-elevated flex gap-3">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      )}
    </div>
  );
}

/**
 * Stat Box Skeleton
 *
 * For stat cards in grids.
 */
export function SkeletonStatBox({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-bg-card border border-bg-elevated rounded-lg p-4", className)}
      {...props}
    >
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

/**
 * Avatar with Text Skeleton
 *
 * For team rows, player cards, etc.
 */
export interface SkeletonAvatarTextProps
  extends React.HTMLAttributes<HTMLDivElement> {
  avatarSize?: "sm" | "md" | "lg";
}

export function SkeletonAvatarText({
  avatarSize = "md",
  className,
  ...props
}: SkeletonAvatarTextProps) {
  return (
    <div className={cn("flex items-center gap-3", className)} {...props}>
      <SkeletonCircle size={avatarSize} />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/**
 * Pulse Animation Utility
 *
 * Simple fade pulse for loading states.
 */
export function SkeletonPulse({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse bg-bg-elevated rounded", className)}
      {...props}
    />
  );
}
