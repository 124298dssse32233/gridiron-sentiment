/**
 * Design System Constants for Charts
 *
 * Centralized color palette, fonts, and styling constants used across
 * all chart components. Ensures consistency with the Gridiron Intel
 * brand identity and dark-mode design system.
 */

export const CHART_COLORS = {
  /* Grid and axis styling */
  grid: 'rgba(255, 255, 255, 0.06)',
  axis: '#475569',

  /* Tooltip styling */
  tooltip: {
    bg: '#242937',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#f1f5f9',
  },

  /* Trend indicators */
  positive: '#34d399',
  negative: '#f87171',

  /* Brand accents */
  teal: '#00f5d4',
  purple: '#7b61ff',
  chaos: '#f472b6',
  warning: '#fbbf24',

  /* Neutral/muted */
  muted: '#475569',
  text: {
    primary: '#f1f5f9',
    secondary: '#94a3b8',
    muted: '#475569',
  },
};

export const CHART_FONTS = {
  label: "'DM Sans', sans-serif",
  value: "'Courier Prime', monospace",
};

export const CHART_SPACING = {
  /* Default chart margins */
  margin: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 40,
  },
  /* Padding inside charts */
  padding: 16,
  /* Gap between elements */
  gap: 8,
} as const;

export const CHART_ANIMATION = {
  duration: 800,
  ease: [0.65, 0, 0.35, 1], // easeInOutCubic
} as const;
