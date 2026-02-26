/**
 * Sparkline Component
 *
 * A minimal line chart showing rating trends over time
 * Uses SVG for lightweight, scalable rendering
 */

"use client";

import { cn } from "@/lib/utils/cn";

export interface SparklineProps {
  /** Array of numeric values to plot */
  data: number[];
  /** CSS class for the SVG element */
  className?: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Color of the line (CSS color) */
  color?: string;
  /** Whether to show the trend as positive (green) or negative (red) */
  trend?: "up" | "down" | "neutral";
  /** Whether to fill the area under the line */
  fill?: boolean;
  /** Whether to show dots at data points */
  showDots?: boolean;
  /** Stroke width in pixels */
  strokeWidth?: number;
}

/**
 * Generate SVG path command from data points
 */
function generatePath(
  data: number[],
  width: number,
  height: number,
  padding = 2
): string {
  if (data.length < 2) {
    return "";
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * usableWidth;
    const y = padding + usableHeight - ((value - min) / range) * usableHeight;
    return `${x},${y}`;
  });

  return `M ${points.join(" L ")}`;
}

/**
 * Generate fill area path
 */
function generateAreaPath(
  data: number[],
  width: number,
  height: number,
  padding = 2
): string {
  if (data.length < 2) {
    return "";
  }

  const linePath = generatePath(data, width, height, padding);
  if (!linePath) return "";

  const max = Math.max(...data);
  const min = Math.min(...data);

  // Extend path to bottom corners for fill
  const firstX = padding;
  const lastX = width - padding;
  const bottomY = height - padding;

  return `${linePath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
}

export function Sparkline({
  data,
  className,
  width = 60,
  height = 20,
  color,
  trend = "neutral",
  fill = false,
  showDots = false,
  strokeWidth = 1.5,
}: SparklineProps) {
  // Determine color based on trend
  const getColor = () => {
    if (color) return color;
    if (trend === "up") return "var(--accent-positive)";
    if (trend === "down") return "var(--accent-negative)";
    return "var(--accent-teal)";
  };

  const strokeColor = getColor();

  // Calculate overall trend
  const getTrend = (): "up" | "down" | "neutral" => {
    if (data.length < 2) return "neutral";
    const first = data[0] ?? 0;
    const last = data[data.length - 1] ?? 0;
    const diff = last - first;
    if (Math.abs(diff) < 5) return "neutral";
    return diff > 0 ? "up" : "down";
  };

  const currentTrend = trend === "neutral" ? getTrend() : trend;

  const linePath = generatePath(data, width, height);
  const areaPath = fill ? generateAreaPath(data, width, height) : null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`gradient-${currentTrend}`} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={strokeColor}
            stopOpacity={0.2}
          />
          <stop
            offset="100%"
            stopColor={strokeColor}
            stopOpacity={0}
          />
        </linearGradient>
      </defs>

      {/* Fill area */}
      {areaPath && (
        <path
          d={areaPath}
          fill={`url(#gradient-${currentTrend})`}
          stroke="none"
        />
      )}

      {/* Line */}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* End dot */}
      {linePath && (
        <circle
          cx={width - 2}
          cy={linePath.split(" ").pop()?.split(",").at(1) ?? height / 2}
          r={2}
          fill={strokeColor}
        />
      )}
    </svg>
  );
}

/**
 * Mini sparkline for table cells
 */
export interface MiniSparklineProps {
  /** Current value */
  value: number;
  /** Previous value (for trend calculation) */
  previous?: number;
  /** Historical data (optional, falls back to [previous, value]) */
  history?: number[];
  /** Show as a simple up/down indicator instead of full sparkline */
  simple?: boolean;
}

export function MiniSparkline({
  value,
  previous,
  history,
  simple = false,
}: MiniSparklineProps) {
  const data = history ?? (previous !== undefined ? [previous, value] : [value]);
  const trend = value > (previous ?? value) ? "up" : value < (previous ?? value) ? "down" : "neutral";

  if (simple || data.length < 3) {
    // Simple up/down indicator
    const color =
      trend === "up"
        ? "text-accent-positive"
        : trend === "down"
        ? "text-accent-negative"
        : "text-text-muted";

    return (
      <span className={cn("inline-flex items-center gap-1 font-mono text-xs", color)}>
        {trend === "up" && "↑"}
        {trend === "down" && "↓"}
        {Math.abs(value - (previous ?? value)).toFixed(1)}
      </span>
    );
  }

  return <Sparkline data={data} trend={trend} width={40} height={16} />;
}
