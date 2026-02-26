/**
 * Win Probability Chart Component
 *
 * Displays win probability swing over the course of a game.
 * Used on Gameday Dashboard and team game pages.
 *
 * - Shows home team WP (0% to 100%) on Y-axis
 * - Uses team colors for area fills (home team > 50%, away team < 50%)
 * - Marks key plays with vertical lines and tooltips
 * - Dark theme with grid lines at 25% intervals
 * - Fully interactive with Recharts
 */

"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils/cn";
import { CHART_COLORS, CHART_FONTS } from "./constants";

export interface WPPlay {
  playNumber: number;
  homeWP: number; // 0-1
  description?: string;
  isKeyPlay?: boolean;
}

export interface WPChartProps {
  plays: WPPlay[];
  homeTeam: string;
  awayTeam: string;
  homeColor?: string; // Team primary color (hex)
  awayColor?: string;
  height?: number; // Default 300
  showKeyPlays?: boolean; // Default true
  interactive?: boolean; // Default true
  className?: string;
}

interface WPTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: WPPlay;
  }>;
}

function CustomWPTooltip({ active, payload }: WPTooltipProps) {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0];
  const homeWP = (data.value * 100).toFixed(1);
  const awayWP = (100 - data.value * 100).toFixed(1);
  const description = data.payload.description;

  return (
    <div
      className="rounded-md border p-3 shadow-lg"
      style={{
        backgroundColor: CHART_COLORS.tooltip.bg,
        borderColor: CHART_COLORS.tooltip.border,
        color: CHART_COLORS.tooltip.text,
      }}
    >
      {description && (
        <p className="text-xs font-medium mb-1 opacity-90">{description}</p>
      )}
      <p className="text-xs font-mono">
        Home WP:{" "}
        <span style={{ color: CHART_COLORS.teal }}>{homeWP}%</span>
      </p>
      <p className="text-xs font-mono">
        Away WP:{" "}
        <span style={{ color: CHART_COLORS.muted }}>{awayWP}%</span>
      </p>
    </div>
  );
}

export function WPChart({
  plays,
  homeTeam,
  awayTeam,
  homeColor = CHART_COLORS.teal,
  awayColor = CHART_COLORS.muted,
  height = 300,
  showKeyPlays = true,
  interactive = true,
  className,
}: WPChartProps) {
  if (!plays || plays.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-bg-card",
          className
        )}
        style={{ height }}
      >
        <p className="text-text-muted text-sm">No game data available</p>
      </div>
    );
  }

  // Transform data for Recharts
  const chartData = plays.map((play) => ({
    ...play,
    wpPercent: play.homeWP * 100,
  }));

  return (
    <div className={cn("w-full rounded-lg bg-bg-card p-4", className)}>
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: homeColor }}
          />
          <span className="text-xs font-medium text-text-secondary">
            {homeTeam} WP
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: awayColor }}
          />
          <span className="text-xs font-medium text-text-secondary">
            {awayTeam} WP
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="wpHome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={homeColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={homeColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="wpAway" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={awayColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={awayColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_COLORS.grid}
            horizontal
            vertical={false}
          />

          <XAxis
            dataKey="playNumber"
            stroke={CHART_COLORS.axis}
            style={{ fontSize: "12px", fontFamily: CHART_FONTS.label }}
            tickFormatter={(v) => `Play ${v}`}
          />

          <YAxis
            domain={[0, 100]}
            stroke={CHART_COLORS.axis}
            style={{ fontSize: "12px", fontFamily: CHART_FONTS.value }}
            label={{ value: "Win Probability (%)", angle: -90, position: "insideLeft" }}
            ticks={[0, 25, 50, 75, 100]}
          />

          {/* Reference line at 50% (even odds) */}
          <ReferenceLine
            y={50}
            stroke={CHART_COLORS.grid}
            strokeDasharray="5 5"
            label={{
              value: "50%",
              position: "right",
              fill: CHART_COLORS.text.muted,
              fontSize: 12,
              offset: 10,
            }}
          />

          {/* Home WP area (above 50%) */}
          <Area
            type="monotone"
            dataKey="wpPercent"
            stroke={homeColor}
            strokeWidth={2}
            fill="url(#wpHome)"
            isAnimationActive={true}
            animationDuration={800}
            name={`${homeTeam} WP`}
          />

          {/* Away WP area (below 50%) — inverted for visual clarity */}
          <Area
            type="monotone"
            dataKey={(data) => 100 - data.wpPercent}
            stroke={awayColor}
            strokeWidth={0}
            fill="url(#wpAway)"
            isAnimationActive={true}
            animationDuration={800}
            name={`${awayTeam} WP`}
          />

          {interactive && (
            <Tooltip content={<CustomWPTooltip />} cursor={{ stroke: CHART_COLORS.grid }} />
          )}

          {/* Mark key plays with vertical lines */}
          {showKeyPlays &&
            chartData
              .filter((play) => play.isKeyPlay)
              .map((play, idx) => (
                <ReferenceLine
                  key={idx}
                  x={play.playNumber}
                  stroke={CHART_COLORS.chaos}
                  strokeDasharray="3 3"
                  opacity={0.6}
                />
              ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
