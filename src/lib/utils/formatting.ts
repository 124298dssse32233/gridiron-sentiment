/**
 * Comprehensive Formatting Utilities for Gridiron Intel
 * Central hub for all data formatting across the application.
 * Used by every component that displays GridRank data, scores, stats, and analytics.
 *
 * Formatting principles:
 * - Type-safe with strict TypeScript
 * - No emoji anywhere (use text symbols: ▲ ▼ — instead)
 * - Monospace fonts (Courier Prime) for numbers/stats
 * - Locale-aware where applicable (Intl API)
 * - Consistent symbols: − (minus) not - (hyphen), em-dash for neutral
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CONFIDENCE_MULTIPLIER } from "./constants";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Tier threshold for categorizing values by color and label.
 * Used for chaos scores, ratings, and other tiered data.
 */
export interface TierThreshold {
  /** Minimum value (inclusive) to qualify for this tier */
  min: number;
  /** Hex color for this tier (#FFF, #FFFFFF, or rgb() format) */
  color: string;
  /** Optional label for this tier */
  label?: string;
}

/**
 * Result of formatting a rating change with directional info.
 */
export interface RatingChangeResult {
  /** Formatted text (e.g., "▲ 12" or "▼ 8" or "—") */
  text: string;
  /** Direction indicator */
  direction: "up" | "down" | "neutral";
}

/**
 * Result of formatting a rank with movement info.
 */
export interface RankFormattingResult {
  /** Formatted rank text (e.g., "5") */
  text: string;
  /** Movement indicator (e.g., "▲3" or "▼2") or null if no movement */
  movement: string | null;
  /** Direction of movement */
  direction: "up" | "down" | "new" | "none";
}

/**
 * Result of formatting a level badge with styling.
 */
export interface LevelBadge {
  /** Display text (e.g., "FBS") */
  text: string;
  /** Accent color (hex) for border/highlight */
  color: string;
  /** Background color (hex) for badge background */
  bgColor: string;
}

/**
 * Result of formatting a chaos tier with styling.
 */
export interface ChaosTierResult {
  /** Tier label (e.g., "LEGENDARY", "CHAOTIC", "STABLE") */
  tier: string;
  /** Color (hex) for visualization */
  color: string;
}

/**
 * Result of formatting confidence level.
 */
export interface ConfidenceResult {
  /** Human-readable text (e.g., "High Confidence") */
  text: string;
  /** Color (hex) for visualization */
  color: string;
}

/**
 * Odds format variants for display.
 */
export type OddsFormat = "american" | "decimal" | "fractional";

/**
 * Direction of movement for rankings/ratings.
 */
export type MovementDirection = "up" | "down" | "neutral" | "new";

// ============================================================================
// CLASS UTILITIES
// ============================================================================

/**
 * Tailwind class merge utility.
 * Combines clsx and tailwind-merge for optimal class handling.
 * Resolves conflicting Tailwind classes while preserving layering.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Format a GridRank rating with optional confidence interval (RD).
 * Example: formatRating(1523, 24) → "1523 ± 24"
 * Example: formatRating(1523) → "1523"
 *
 * @param rating - The Glicko-2 rating (μ)
 * @param rd - Optional rating deviation for confidence interval
 * @returns Formatted string with ± notation if RD provided
 */
export function formatRating(rating: number, rd?: number): string {
  const formattedRating = Math.round(rating).toLocaleString("en-US");

  if (rd === undefined) {
    return formattedRating;
  }

  const confidenceInterval = Math.round(rd * CONFIDENCE_MULTIPLIER);
  return `${formattedRating} ± ${confidenceInterval}`;
}

/**
 * Format a rating change with directional indicator.
 * Example: formatRatingChange(12) → { text: "▲ +12", direction: "up" }
 * Example: formatRatingChange(-8) → { text: "▼ −8", direction: "down" }
 * Example: formatRatingChange(0.5) → { text: "—", direction: "neutral" } (with threshold)
 *
 * @param change - Rating change value (positive/negative)
 * @param threshold - Minimum absolute change to display (default: 0)
 * @returns Object with formatted text and direction
 */
export function formatRatingChange(
  change: number,
  threshold: number = 0
): RatingChangeResult {
  const absChange = Math.abs(change);

  if (absChange <= threshold) {
    return { text: "—", direction: "neutral" };
  }

  if (change > 0) {
    return { text: `▲ +${Math.round(change)}`, direction: "up" };
  }

  if (change < 0) {
    return { text: `▼ −${Math.round(Math.abs(change))}`, direction: "down" };
  }

  return { text: "—", direction: "neutral" };
}

/**
 * Format a number in compact notation.
 * Example: compactNumber(1200) → "1.2K"
 * Example: compactNumber(1500000) → "1.5M"
 * Example: compactNumber(47.5) → "47.5"
 *
 * @param n - Number to format
 * @param precision - Decimal places (default: 1)
 * @returns Compact string representation
 */
export function compactNumber(n: number, precision: number = 1): string {
  const absValue = Math.abs(n);

  if (absValue >= 1_000_000) {
    const millions = n / 1_000_000;
    return `${millions.toFixed(precision)}M`;
  }

  if (absValue >= 1_000) {
    const thousands = n / 1_000;
    return `${thousands.toFixed(precision)}K`;
  }

  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

/**
 * Format a number as an ordinal (1st, 2nd, 3rd, etc.).
 * Example: ordinal(1) → "1st"
 * Example: ordinal(11) → "11th"
 * Example: ordinal(23) → "23rd"
 *
 * @param n - Number to convert
 * @returns Ordinal string
 */
export function ordinal(n: number): string {
  const abs = Math.abs(n);
  const remainder = abs % 100;

  if (remainder >= 11 && remainder <= 13) {
    return `${n}th`;
  }

  const lastDigit = abs % 10;
  switch (lastDigit) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * Format a decimal as a percentage.
 * Example: formatPct(0.7234) → "72.3%"
 * Example: formatPct(0.05) → "5.0%"
 *
 * @param value - Decimal value (0-1)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Percentage string
 */
export function formatPct(value: number, decimals: number = 1): string {
  const percentage = value * 100;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format a betting spread with proper signs.
 * Example: formatSpread(-7.5) → "−7.5"
 * Example: formatSpread(3) → "+3.0"
 * Example: formatSpread(0) → "PICK"
 *
 * @param spread - Spread value (negative favors home)
 * @returns Formatted spread string
 */
export function formatSpread(
  spread: number | null | undefined
): string {
  if (spread === null || spread === undefined) {
    return "PICK";
  }

  if (spread === 0) {
    return "PICK";
  }

  if (spread > 0) {
    return `+${spread.toFixed(1)}`;
  }

  // Use minus sign (−) not hyphen (-) for negative
  return `−${Math.abs(spread).toFixed(1)}`;
}

/**
 * Convert win probability to American odds, decimal odds, or fractional odds.
 * Example: formatOdds(0.65, 'american') → "-186"
 * Example: formatOdds(0.65, 'decimal') → "1.54"
 * Example: formatOdds(0.65, 'fractional') → "13/20"
 *
 * @param probability - Win probability (0-1)
 * @param format - Output format (default: 'american')
 * @returns Formatted odds string
 */
export function formatOdds(
  probability: number,
  format: OddsFormat = "american"
): string {
  if (format === "decimal") {
    // Decimal odds = 1 / probability
    const decimalOdds = 1 / probability;
    return decimalOdds.toFixed(2);
  }

  if (format === "fractional") {
    // Convert to fractional odds
    const decimalOdds = 1 / probability;
    const fractionalOdds = decimalOdds - 1;

    // Find best simple fraction representation
    const tolerance = 0.01;
    for (let denominator = 1; denominator <= 100; denominator++) {
      for (let numerator = 1; numerator <= 100; numerator++) {
        const frac = numerator / denominator;
        if (Math.abs(frac - fractionalOdds) < tolerance) {
          return `${numerator}/${denominator}`;
        }
      }
    }

    return `${fractionalOdds.toFixed(2)}/1`;
  }

  // American odds (default)
  const decimalOdds = 1 / probability;

  if (decimalOdds <= 2) {
    // Negative odds
    const americanOdds = -100 / (decimalOdds - 1);
    return Math.round(americanOdds).toString();
  }

  // Positive odds
  const americanOdds = (decimalOdds - 1) * 100;
  return `+${Math.round(americanOdds)}`;
}

/**
 * Format a number with leading sign (+ or −).
 * Example: signedNumber(-5) → "−5"
 * Example: signedNumber(5) → "+5"
 * Example: signedNumber(0) → "0"
 *
 * @param n - Number to format
 * @param decimals - Decimal places (default: 0)
 * @returns Signed string
 */
export function signedNumber(n: number, decimals: number = 0): string {
  const formatted = n.toFixed(decimals);

  if (n > 0) {
    return `+${formatted}`;
  }

  if (n < 0) {
    return `−${Math.abs(Number(formatted))}`;
  }

  return "0";
}

/**
 * Format a large statistic number with thousand separators.
 * Example: formatStat(2847) → "2,847"
 * Example: formatStat(47) → "47"
 *
 * @param n - Number to format
 * @returns Formatted string with commas
 */
export function formatStat(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/**
 * Format a number with K/M/B suffixes (alias for compactNumber).
 * Kept for backward compatibility.
 */
export function formatNumber(num: number): string {
  return compactNumber(num, 1);
}

// ============================================================================
// RECORD & SCORE FORMATTING
// ============================================================================

/**
 * Format a win-loss record.
 * Example: formatRecord(8, 2) → "8-2"
 * Example: formatRecord(8, 2, 5, 1) → "8-2 (5-1)"
 *
 * @param wins - Number of wins
 * @param losses - Number of losses
 * @param confWins - Optional conference wins
 * @param confLosses - Optional conference losses
 * @returns Formatted record string
 */
export function formatRecord(
  wins: number,
  losses: number,
  confWins?: number,
  confLosses?: number
): string {
  const overallRecord = `${wins}-${losses}`;

  if (confWins !== undefined && confLosses !== undefined) {
    return `${overallRecord} (${confWins}-${confLosses})`;
  }

  return overallRecord;
}

/**
 * Format a game score display (updated signature).
 * Example: formatScore("Ohio State", 42, "Michigan", 27) → "Ohio State 42, Michigan 27"
 *
 * Can also accept the legacy signature for backward compatibility.
 *
 * @param homeTeamOrScore - Home team name or home score (if legacy)
 * @param homeScoreOrAwayScore - Home score or away score (if legacy)
 * @param awayTeamOrIsFinal - Away team name or isFinal boolean (if legacy)
 * @param awayScoreOrUndefined - Away score (if new signature)
 * @returns Formatted score string
 */
export function formatScore(
  homeTeamOrScore: string | number,
  homeScoreOrAwayScore: number | null,
  awayTeamOrIsFinal?: string | boolean,
  awayScoreOrUndefined?: number
): string {
  // New signature: formatScore(homeTeam: string, homeScore: number, awayTeam: string, awayScore: number)
  if (
    typeof homeTeamOrScore === "string" &&
    typeof homeScoreOrAwayScore === "number" &&
    typeof awayTeamOrIsFinal === "string" &&
    typeof awayScoreOrUndefined === "number"
  ) {
    return `${homeTeamOrScore} ${homeScoreOrAwayScore}, ${awayTeamOrIsFinal} ${awayScoreOrUndefined}`;
  }

  // Legacy signature: formatScore(homeScore: number, awayScore: number, isFinal?: boolean)
  if (homeScoreOrAwayScore === null || homeScoreOrAwayScore === undefined) {
    const isFinal = typeof awayTeamOrIsFinal === "boolean" ? awayTeamOrIsFinal : false;
    return isFinal ? "F" : "vs";
  }

  return `${homeScoreOrAwayScore} - ${homeTeamOrScore}`;
}

/**
 * Format a margin of victory/loss.
 * Example: formatMargin(15) → "by 15"
 * Example: formatMargin(-3) → "by 3"
 * Example: formatMargin(0) → "tied"
 *
 * @param margin - Margin value (positive = winner margin)
 * @returns Formatted margin string
 */
export function formatMargin(margin: number): string {
  if (margin === 0) {
    return "tied";
  }

  const absMargin = Math.abs(margin);
  return `by ${absMargin}`;
}

// ============================================================================
// TIME FORMATTING
// ============================================================================

/**
 * Format a date as relative time (e.g., "3 hours ago", "2 days ago").
 * Example: timeAgo(new Date(Date.now() - 3 * 3600 * 1000)) → "3 hours ago"
 * Example: timeAgo("2025-02-24T10:00:00Z") → "1 day ago"
 *
 * @param date - Date object, ISO string, or Unix timestamp (ms)
 * @returns Relative time string
 */
export function timeAgo(date: Date | string | number): string {
  const targetDate =
    typeof date === "string"
      ? new Date(date)
      : typeof date === "number"
        ? new Date(date)
        : date;

  const now = new Date();
  const diffMs = now.getTime() - targetDate.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) {
    return "just now";
  }

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  }

  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  }

  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

/**
 * Format game time (quarter and seconds remaining).
 * Example: formatGameTime(3, 502) → "Q3 8:22"
 * Example: formatGameTime(2, 0) → "Halftime"
 * Example: formatGameTime(4, 0, true) → "Final"
 *
 * @param quarter - Quarter number (1-4, 0=pregame)
 * @param seconds - Seconds remaining in quarter
 * @param isFinal - Whether game is final
 * @returns Formatted game time string
 */
export function formatGameTime(
  quarter: number,
  seconds: number,
  isFinal: boolean = false
): string {
  if (isFinal) {
    return "Final";
  }

  if (quarter === 0) {
    return "Pregame";
  }

  if (seconds === 0 && quarter < 4) {
    return "Halftime";
  }

  if (seconds === 0 && quarter === 4) {
    return "End of game";
  }

  if (quarter > 4) {
    return `OT`;
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${minutes}:${secs.toString().padStart(2, "0")}`;

  return `Q${quarter} ${timeStr}`;
}

/**
 * Format a duration in seconds to HH:MM:SS or MM:SS format.
 * Example: formatDuration(3661) → "1:01:01"
 * Example: formatDuration(125) → "2:05"
 *
 * @param seconds - Total seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format a season week for display.
 * Example: formatWeek(1, 2024) → "Week 1, 2024"
 * Example: formatWeek(13, 2024, true) → "Bowl Season 2024"
 * Example: formatWeek(0, 2024) → "Preseason 2024"
 *
 * @param week - Week number (0=preseason, 1-12=regular, 13+=postseason)
 * @param season - Season year
 * @param postseason - Whether in postseason (bowl/playoff)
 * @returns Formatted week label
 */
export function formatWeek(
  week: number,
  season: number,
  postseason: boolean = false
): string {
  if (week === 0) {
    return `Preseason ${season}`;
  }

  if (postseason || week > 15) {
    return `Bowl Season ${season}`;
  }

  return `Week ${week}, ${season}`;
}

/**
 * Format a date for display.
 * Example: formatDate(new Date("2024-11-23")) → "Nov 23, 2024" (short)
 * Example: formatDate(new Date("2024-11-23"), 'long') → "Saturday, November 23, 2024"
 * Example: formatDate(new Date("2024-11-23"), 'day') → "Saturday"
 *
 * @param date - Date object or ISO string
 * @param format - Format style (default: 'short')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  format: "short" | "long" | "day" = "short"
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (format === "long") {
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (format === "day") {
    return dateObj.toLocaleDateString("en-US", { weekday: "long" });
  }

  // short format: "Nov 23, 2024"
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a time for display (legacy function).
 * Kept for backward compatibility.
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

// ============================================================================
// TEXT FORMATTING
// ============================================================================

/**
 * Convert text to URL-friendly slug.
 * Example: slugify("Ohio State Buckeyes") → "ohio-state-buckeyes"
 * Example: slugify("TCU—Horned Frogs!") → "tcu-horned-frogs"
 *
 * @param text - Text to slugify
 * @returns Slug string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Collapse multiple hyphens
}

/**
 * Truncate text with ellipsis if too long.
 * Example: truncate("This is a very long string", 20) → "This is a very long..."
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before ellipsis
 * @returns Truncated string
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Convert text to title case.
 * Example: titleCase("the ohio state university") → "The Ohio State University"
 * Example: titleCase("college FOOTBALL data") → "College Football Data"
 *
 * @param text - Text to titlecase
 * @returns Title cased string
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Convert camelCase to Title Case (legacy function).
 * Kept for backward compatibility.
 */
export function toTitleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

/**
 * Format a possessive name.
 * Example: possessive("Williams") → "Williams'"
 * Example: possessive("Smith") → "Smith's"
 *
 * @param name - Name to make possessive
 * @returns Possessive form
 */
export function possessive(name: string): string {
  if (name.endsWith("s")) {
    return `${name}'`;
  }

  return `${name}'s`;
}

/**
 * Pluralize a word based on count.
 * Example: pluralize(3, "game") → "3 games"
 * Example: pluralize(1, "game") → "1 game"
 * Example: pluralize(2, "child", "children") → "2 children"
 *
 * @param count - Count
 * @param singular - Singular form
 * @param plural - Optional plural form (default: singular + "s")
 * @returns Pluralized string with count
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  const pluralForm = plural || `${singular}s`;
  const word = count === 1 ? singular : pluralForm;
  return `${count} ${word}`;
}

/**
 * Format game location (legacy function).
 * Kept for backward compatibility.
 */
export function formatLocation(
  isNeutralSite: boolean,
  homeTeam: string | null,
  awayTeam: string | null
): string {
  if (isNeutralSite) return "@ Neutral Site";
  if (homeTeam) return `vs ${homeTeam}`;
  return "TBD";
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Parse hex color to RGB components.
 * Handles #FFF, #FFFFFF formats.
 *
 * @param hex - Hex color string
 * @returns { r, g, b } object or null if invalid
 */
function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace("#", "");

  if (cleaned.length === 3) {
    const [r, g, b] = cleaned.split("");
    return {
      r: parseInt(r + r, 16),
      g: parseInt(g + g, 16),
      b: parseInt(b + b, 16),
    };
  }

  if (cleaned.length === 6) {
    return {
      r: parseInt(cleaned.slice(0, 2), 16),
      g: parseInt(cleaned.slice(2, 4), 16),
      b: parseInt(cleaned.slice(4, 6), 16),
    };
  }

  return null;
}

/**
 * Calculate relative luminance of a color for WCAG contrast.
 *
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns Luminance value (0-1)
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const v = val / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Get contrasting text color (white or black) for a background color.
 * Uses WCAG contrast calculation.
 * Example: getContrastColor("#FF0000") → "#FFFFFF"
 * Example: getContrastColor("#FFFFFF") → "#000000"
 *
 * @param hex - Background color in hex format
 * @returns White ("#FFFFFF") or black ("#000000")
 */
export function getContrastColor(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return "#FFFFFF"; // Default to white on invalid input
  }

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);

  // If background is light (luminance > 0.179), use black text
  return luminance > 0.179 ? "#000000" : "#FFFFFF";
}

/**
 * Lighten or darken a hex color.
 * Example: adjustColor("#FF0000", 20) → lighter red
 * Example: adjustColor("#FF0000", -20) → darker red
 *
 * @param hex - Hex color string
 * @param amount - Amount to adjust (-255 to 255)
 * @returns Adjusted hex color
 */
export function adjustColor(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return hex; // Return original on invalid input
  }

  const r = Math.max(0, Math.min(255, rgb.r + amount));
  const g = Math.max(0, Math.min(255, rgb.g + amount));
  const b = Math.max(0, Math.min(255, rgb.b + amount));

  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/**
 * Create a CSS gradient from team colors.
 * Example: teamGradient("#FF0000", "#0000FF") → "linear-gradient(135deg, #FF0000, #0000FF)"
 * Example: teamGradient("#FF0000") → "linear-gradient(135deg, #FF0000, #FF0000)"
 *
 * @param primary - Primary color (hex)
 * @param secondary - Secondary color (hex, defaults to primary)
 * @param direction - Gradient direction (default: "135deg")
 * @returns CSS gradient string
 */
export function teamGradient(
  primary: string,
  secondary?: string,
  direction: string = "135deg"
): string {
  const secondaryColor = secondary || primary;
  return `linear-gradient(${direction}, ${primary}, ${secondaryColor})`;
}

/**
 * Convert hex color to RGBA string.
 * Example: hexToRgba("#FF0000", 0.5) → "rgba(255, 0, 0, 0.5)"
 *
 * @param hex - Hex color string
 * @param alpha - Alpha value (0-1)
 * @returns RGBA string or rgba of white on invalid input
 */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return `rgba(255, 255, 255, ${alpha})`; // Default to white
  }

  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha})`;
}

/**
 * Get tier color and label based on value thresholds.
 * Example: getTierColor(85, chaosTiers) → "#f472b6"
 *
 * @param value - Value to tier
 * @param thresholds - Array of tier thresholds (ascending by min)
 * @returns Color hex of matching tier, or first threshold color if no match
 */
export function getTierColor(
  value: number,
  thresholds: TierThreshold[]
): string {
  if (thresholds.length === 0) {
    return "#94a3b8"; // Default gray
  }

  // Find the appropriate tier (highest min that doesn't exceed value)
  let selectedTier = thresholds[0];
  for (const tier of thresholds) {
    if (value >= tier.min) {
      selectedTier = tier;
    } else {
      break;
    }
  }

  return selectedTier.color;
}

// ============================================================================
// GRIDRANK-SPECIFIC FORMATTING
// ============================================================================

/**
 * Format a division level badge.
 * Example: formatLevel("FBS") → { text: "FBS", color: "#00f5d4", bgColor: "rgba(0, 245, 212, 0.1)" }
 *
 * @param level - Level string (FBS, FCS, D2, D3, NAIA)
 * @returns Badge object with styling
 */
export function formatLevel(level: string): LevelBadge {
  const levelColors: Record<string, { color: string; bg: string }> = {
    FBS: {
      color: "#00f5d4", // Electric teal
      bg: "rgba(0, 245, 212, 0.1)",
    },
    FCS: {
      color: "#7b61ff", // Purple
      bg: "rgba(123, 97, 255, 0.1)",
    },
    D2: {
      color: "#34d399", // Green
      bg: "rgba(52, 211, 153, 0.1)",
    },
    D3: {
      color: "#fbbf24", // Amber
      bg: "rgba(251, 191, 36, 0.1)",
    },
    NAIA: {
      color: "#f87171", // Red
      bg: "rgba(248, 113, 113, 0.1)",
    },
  };

  const colors = levelColors[level] || levelColors.FBS;

  return {
    text: level,
    color: colors.color,
    bgColor: colors.bg,
  };
}

/**
 * Format a chaos score into a tier with styling.
 * Chaos tiers: 0-20=STABLE, 21-40=NOTABLE, 41-60=CHAOTIC, 61-80=WILD, 81-99=INSANE, 100=LEGENDARY
 * Example: formatChaosTier(85) → { tier: "INSANE", color: "#f472b6" }
 *
 * @param score - Chaos score (0-100)
 * @returns Chaos tier object with styling
 */
export function formatChaosTier(score: number): ChaosTierResult {
  if (score >= 100) {
    return { tier: "LEGENDARY", color: "#f472b6" };
  }

  if (score >= 81) {
    return { tier: "INSANE", color: "#f87171" };
  }

  if (score >= 61) {
    return { tier: "WILD", color: "#fbbf24" };
  }

  if (score >= 41) {
    return { tier: "CHAOTIC", color: "#f472b6" };
  }

  if (score >= 21) {
    return { tier: "NOTABLE", color: "#7b61ff" };
  }

  return { tier: "STABLE", color: "#34d399" };
}

/**
 * Format a confidence level into readable text and color.
 * Example: formatConfidence("high") → { text: "High Confidence", color: "#34d399" }
 *
 * @param level - Confidence level ("low", "medium", "high", or numeric 0-1)
 * @returns Confidence object with styling
 */
export function formatConfidence(level: string | number): ConfidenceResult {
  let normalizedLevel: "low" | "medium" | "high";

  if (typeof level === "number") {
    if (level < 0.33) {
      normalizedLevel = "low";
    } else if (level < 0.67) {
      normalizedLevel = "medium";
    } else {
      normalizedLevel = "high";
    }
  } else {
    normalizedLevel = (level.toLowerCase() as "low" | "medium" | "high") || "medium";
  }

  const confidenceLevels: Record<
    "low" | "medium" | "high",
    { text: string; color: string }
  > = {
    low: { text: "Low Confidence", color: "#f87171" },
    medium: { text: "Medium Confidence", color: "#fbbf24" },
    high: { text: "High Confidence", color: "#34d399" },
  };

  return confidenceLevels[normalizedLevel];
}

/**
 * Format a rank with movement indicator.
 * Example: formatRank(5, 8) → { text: "5", movement: "▲3", direction: "up" }
 * Example: formatRank(12, null) → { text: "12", movement: null, direction: "new" }
 *
 * @param rank - Current rank
 * @param previousRank - Previous rank (null/undefined if new)
 * @returns Rank formatting object
 */
export function formatRank(
  rank: number,
  previousRank?: number | null
): RankFormattingResult {
  if (!previousRank || previousRank <= 0) {
    return { text: rank.toString(), movement: null, direction: "new" };
  }

  const change = previousRank - rank; // Positive = improved (lower rank = better)

  if (change > 0) {
    return {
      text: rank.toString(),
      movement: `▲${change}`,
      direction: "up",
    };
  }

  if (change < 0) {
    return {
      text: rank.toString(),
      movement: `▼${Math.abs(change)}`,
      direction: "down",
    };
  }

  return {
    text: rank.toString(),
    movement: null,
    direction: "none",
  };
}

/**
 * Format win probability for display.
 * Example: formatWinProb(0.723) → "72.3%"
 * Example: formatWinProb(0.5) → "50.0%"
 *
 * @param prob - Probability (0-1)
 * @returns Percentage string
 */
export function formatWinProb(prob: number): string {
  return formatPct(prob, 1);
}

/**
 * Format EPA (Expected Points Added) metric.
 * Example: formatEPA(0.234) → "+0.23"
 * Example: formatEPA(-0.156) → "−0.16"
 *
 * @param epa - EPA value
 * @returns Signed EPA string
 */
export function formatEPA(epa: number): string {
  if (epa > 0) {
    return `+${epa.toFixed(2)}`;
  }

  if (epa < 0) {
    return `−${Math.abs(epa).toFixed(2)}`;
  }

  return "0.00";
}

/**
 * Format EPA per play for display (legacy function).
 * Kept for backward compatibility.
 */
export function formatEpa(epa: number | null | undefined): string {
  if (epa === null || epa === undefined) return "—";
  return epa.toFixed(3);
}

/**
 * Format a rank change with colored badge text (legacy function).
 * Kept for backward compatibility.
 */
export function formatRankChange(
  change: number
): { text: string; color: "positive" | "negative" | "muted" } {
  if (change > 0) return { text: `+${change}`, color: "positive" };
  if (change < 0) return { text: `${change}`, color: "negative" };
  return { text: "—", color: "muted" };
}
