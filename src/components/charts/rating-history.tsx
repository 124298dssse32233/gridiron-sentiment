/**
 * Rating History Chart Component
 *
 * Line chart showing a team's rating evolution across weeks or seasons.
 * Includes optional confidence band showing rating deviation (RD).
 *
 * - Main line: team rating over time
 * - Confidence band: ±RD shaded area (when RD provided)
 * - Grid lines: horizontal reference lines
 * - Interactive tooltips: show rating ± RD
 * - Dark theme with Gridiron brand colors
 */

"use client";

import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { cn } from "@/lib/utils/cn";
import { CHART_COLORS, CHART_FONTS } from "./constants";

export interface RatingHistoryDataPoint {
  label: string; // "Week 1", "2023", etc.
  rating: number;
  rd?: number; // Rating deviation for confidence band
}

export interface RatingHistoryProps {
  data: RatingHistoryDataPoint[];
  height?: number; // Default 250
  showConfidence?: boolean; // Default true
  showGrid?: boolean; // Default true
  color?: string; // Default accent teal
  interactive?: boolean; // Default true
  className?: string;
  minRating?: number; // Min for Y-axis (auto-calculated if omitted)
  maxRating?: number; // Max for Y-axis (auto-calculated if omitted)
}

interface RatingTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: RatingHistoryDataPoint;
  }>;
}

function CustomRatingTooltip({ active, payload }: RatingTooltipProps) {
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
      <p className="text-xs font-medium mb-1">{data.label}</p>
      <p className="text-xs font-mono">
        Rating:{" "}
        <span style={{ color: CHART_COLORS.teal }}>
          {data.rating.toFixed(1)}
        </span>
      </p>
      {data.rd && (
        <p className="text-xs font-mono text-text-secondary">
          ± {(1.96 * data.rd).toFixed(1)} (95% CI)
        </p>
      )}
    </div>
  );
}

export function RatingHistory({
  data,
  height = 250,
  showConfidence = true,
  showGrid = true,
  color = CHART_COLORS.teal,
  interactive = true,
  className,
  minRating,
  maxRating,
}: RatingHistoryProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-bg-card",
          className
        )}
        style={{ height }}
      >
        <p className="text-text-muted text-sm">No rating data available</p>
      </div>
    );
  }

  // Calculate axis bounds
  const ratings = data.map((d) => d.rating);
  const minVal = minRating ?? Math.min(...ratings) - 50;
  const maxVal = maxRating ?? Math.max(...ratings) + 50;

  // Transform data with confidence bounds if RD available
  const chartData = data.map((d) => ({
    ...d,
    ratingUpper: d.rd ? d.rating + 1.96 * d.rd : d.rating,
    ratingLower: d.rd ? Math.max(minVal, d.rating - 1.96 * d.rd) : d.rating,
  }));

  return (
    <div className={cn("w-full rounded-lg bg-bg-card p-4", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_COLORS.grid}
              horizontal
              vertical={false}
            />
          )}

          <XAxis
            dataKey="label"
            stroke={CHART_COLORS.axis}
            style={{ fontSize: "12px", fontFamily: CHART_FONTS.label }}
            tick={{ fill: CHART_COLORS.axis }}
          />

          <YAxis
            domain={[minVal, maxVal]}
            stroke={CHART_COLORS.axis}
            style={{ fontSize: "12px", fontFamily: CHART_FONTS.value }}
            tick={{ fill: CHART_COLORS.axis }}
          />

          {/* Confidence band (if RD available) */}
          {showConfidence && data.some((d) => d.rd) && (
            <Area
              type="monotone"
              dataKey="ratingUpper"
              stackId="confidence"
              stroke="none"
              fill={color}
              fillOpacity={0.1}
              isAnimationActive={true}
              animationDuration={800}
            />
          )}

          {/* Main rating line */}
          <Line
            type="monotone"
            dataKey="rating"
            stroke={color}
            strokeWidth={2.5}
            dot={{
              fill: color,
              r: 4,
              strokeWidth: 0,
            }}
            activeDot={{
              r: 6,
            }}
            isAnimationActive={true}
            animationDuration={800}
            name="Rating"
          />

          {interactive && (
            <Tooltip
              content={<CustomRatingTooltip />}
              cursor={{ stroke: CHART_COLORS.grid }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
