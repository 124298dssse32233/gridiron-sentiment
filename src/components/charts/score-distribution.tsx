/**
 * Score Distribution Chart Component
 *
 * Histogram showing spread distribution from Monte Carlo simulations.
 * Used in Matchup Machine to visualize possible game outcomes.
 *
 * - Bars colored by which team wins (team A color for positive, team B color for negative)
 * - Center bar in muted color (toss-up)
 * - X-axis: spread ranges
 * - Y-axis: percentage or count
 * - Tooltip: "A by 14-17: 12.3% (1,230 sims)"
 * - Highlights the most likely outcome with stronger opacity
 */

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils/cn";
import { CHART_COLORS, CHART_FONTS } from "./constants";

export interface ScoreDistributionBucket {
  range: string; // "A by 14-17"
  percentage: number; // 0-100
  count: number;
}

export interface ScoreDistributionProps {
  buckets: ScoreDistributionBucket[];
  teamAName: string;
  teamBName: string;
  teamAColor?: string;
  teamBColor?: string;
  height?: number; // Default 200
  className?: string;
}

interface DistributionTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: ScoreDistributionBucket;
  }>;
}

function CustomDistributionTooltip({ active, payload }: DistributionTooltipProps) {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;

  return (
    <div
      className="rounded-md border p-3 shadow-lg"
      style={{
        backgroundColor: CHART_COLORS.tooltip.bg,
        borderColor: CHART_COLORS.tooltip.border,
        color: CHART_COLORS.tooltip.text,
      }}
    >
      <p className="text-xs font-medium mb-1">{data.range}</p>
      <p className="text-xs font-mono">
        <span style={{ color: CHART_COLORS.teal }}>
          {data.percentage.toFixed(1)}%
        </span>
      </p>
      <p className="text-xs font-mono text-text-secondary">
        ({data.count.toLocaleString()} sims)
      </p>
    </div>
  );
}

export function ScoreDistribution({
  buckets,
  teamAName,
  teamBName,
  teamAColor = CHART_COLORS.teal,
  teamBColor = CHART_COLORS.chaos,
  height = 200,
  className,
}: ScoreDistributionProps) {
  if (!buckets || buckets.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-bg-card",
          className
        )}
        style={{ height }}
      >
        <p className="text-text-muted text-sm">No simulation data available</p>
      </div>
    );
  }

  // Find the most likely outcome (peak)
  const maxPercentage = Math.max(...buckets.map((b) => b.percentage));
  const mostLikelyIndex = buckets.findIndex((b) => b.percentage === maxPercentage);

  // Determine bar colors based on team outcome
  const barColors = buckets.map((bucket, idx) => {
    if (bucket.range.includes(teamAName) || bucket.range.includes("by") && idx > mostLikelyIndex) {
      return teamAColor;
    } else if (bucket.range.includes(teamBName) || bucket.range.includes("by") && idx < mostLikelyIndex) {
      return teamBColor;
    } else {
      // Toss-up / center
      return CHART_COLORS.muted;
    }
  });

  // Build chart data with colors
  const chartData = buckets.map((bucket, idx) => ({
    ...bucket,
    fill: barColors[idx],
  }));

  return (
    <div className={cn("w-full rounded-lg bg-bg-card p-4", className)}>
      <div className="flex gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: teamAColor }}
          />
          <span className="text-xs font-medium text-text-secondary">
            {teamAName} Win
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: teamBColor }}
          />
          <span className="text-xs font-medium text-text-secondary">
            {teamBName} Win
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_COLORS.grid}
            horizontal
            vertical={false}
          />

          <XAxis
            dataKey="range"
            stroke={CHART_COLORS.axis}
            style={{
              fontSize: "11px",
              fontFamily: CHART_FONTS.label,
            }}
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fill: CHART_COLORS.axis }}
          />

          <YAxis
            stroke={CHART_COLORS.axis}
            style={{
              fontSize: "12px",
              fontFamily: CHART_FONTS.value,
            }}
            label={{
              value: "Probability (%)",
              angle: -90,
              position: "insideLeft",
            }}
            tick={{ fill: CHART_COLORS.axis }}
          />

          <Tooltip
            content={<CustomDistributionTooltip />}
            cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
          />

          <Bar
            dataKey="percentage"
            fill={CHART_COLORS.teal}
            isAnimationActive={true}
            animationDuration={800}
            shape={
              <BarShape mostLikelyIndex={mostLikelyIndex} chartData={chartData} />
            }
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Custom bar shape to apply per-bar colors and highlight most likely
interface BarShapeProps {
  fill?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: ScoreDistributionBucket;
  mostLikelyIndex?: number;
  chartData?: Array<ScoreDistributionBucket & { fill: string }>;
}

function BarShape({
  fill,
  x,
  y,
  width,
  height,
  payload,
  mostLikelyIndex = -1,
  chartData = [],
}: BarShapeProps) {
  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined
  ) {
    return null;
  }

  const index = chartData.findIndex((d) => d === payload);
  const isHighlighted = index === mostLikelyIndex;
  const barFill = chartData[index]?.fill || fill || CHART_COLORS.teal;
  const opacity = isHighlighted ? 1 : 0.7;

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={barFill}
      fillOpacity={opacity}
      rx={4}
      ry={4}
    />
  );
}
