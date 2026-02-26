/**
 * Chart Components Index
 *
 * Central export point for all Gridiron Intel chart components.
 * Each component wraps D3.js or Recharts with the brand design system.
 */

// Sparkline — the most critical component, renders 100+ times on rankings page
export { Sparkline, MiniSparkline } from "./sparkline";
export type { SparklineProps, MiniSparklineProps } from "./sparkline";

// Win Probability Chart — Gameday Dashboard and game pages
export { WPChart } from "./wp-chart";
export type { WPChartProps, WPPlay } from "./wp-chart";

// Rating History — Team rating over weeks/seasons with confidence bands
export { RatingHistory } from "./rating-history";
export type { RatingHistoryProps, RatingHistoryDataPoint } from "./rating-history";

// Score Distribution — Monte Carlo simulation results (Matchup Machine)
export { ScoreDistribution } from "./score-distribution";
export type {
  ScoreDistributionProps,
  ScoreDistributionBucket,
} from "./score-distribution";

// Bump Chart — Rankings over time (signature D3 visualization)
export { BumpChart } from "./bump-chart";
export type { BumpChartProps, BumpChartTeam } from "./bump-chart";

// Design constants
export { CHART_COLORS, CHART_FONTS, CHART_SPACING, CHART_ANIMATION } from "./constants";
