/**
 * OG Image Generation Utilities
 * Generates SVG Open Graph images for various Gridiron Intel pages
 * All images are 1200x630px and use the design system colors and fonts
 */

// Design System Colors
const COLORS = {
  bgPrimary: '#0a0e17',
  bgCard: '#1a1f2e',
  accentTeal: '#00f5d4',
  accentPurple: '#7b61ff',
  accentChaos: '#f472b6',
  accentWarning: '#fbbf24',
  accentPositive: '#34d399',
  accentNegative: '#f87171',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#475569',
} as const;

// Fonts (SVG fallbacks to Georgia/Courier New)
const FONTS = {
  display: 'Instrument Serif, Georgia, serif',
  body: 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif',
  mono: 'Courier Prime, Courier New, monospace',
} as const;

/**
 * Creates a reusable SVG filter for subtle glow effect
 */
function createGlowFilter(): string {
  return `
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${COLORS.accentTeal};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${COLORS.accentPurple};stop-opacity:1" />
      </linearGradient>
      <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:${COLORS.accentPurple};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${COLORS.accentTeal};stop-opacity:0.6" />
      </linearGradient>
      <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${COLORS.textMuted}" stroke-width="0.5" opacity="0.1" />
      </pattern>
    </defs>
  `;
}

/**
 * Creates the background grid pattern (like a football field)
 */
function createBackground(): string {
  return `
    <rect width="1200" height="630" fill="${COLORS.bgPrimary}" />
    <rect width="1200" height="630" fill="url(#gridPattern)" />
    <!-- Top accent line -->
    <line x1="0" y1="0" x2="1200" y2="0" stroke="${COLORS.accentTeal}" stroke-width="3" opacity="0.2" />
  `;
}

/**
 * Creates the Gridiron Intel branding header
 */
function createBranding(): string {
  return `
    <text x="30" y="45" font-family="${FONTS.body}" font-size="16" font-weight="700" fill="${COLORS.accentTeal}" letter-spacing="2">
      GRIDIRON INTEL
    </text>
    <line x1="30" y1="55" x2="220" y2="55" stroke="${COLORS.accentTeal}" stroke-width="2" opacity="0.4" />
  `;
}

/**
 * Interface for team OG data
 */
interface TeamOGData {
  teamName: string;
  mascot?: string;
  rating: number;
  ratingDeviation?: number;
  rank: number;
  level: 'FBS' | 'FCS' | 'D2' | 'D3' | 'NAIA';
  conference?: string;
  primaryColor?: string;
  secondaryColor?: string;
  record?: string;
}

/**
 * Interface for rankings OG data
 */
interface RankingsOGData {
  week?: number;
  season: number;
  topTeams: Array<{
    rank: number;
    name: string;
    rating: number;
    level: string;
  }>;
}

/**
 * Interface for matchup OG data
 */
interface MatchupOGData {
  teamA: { name: string; rating: number; primaryColor?: string };
  teamB: { name: string; rating: number; primaryColor?: string };
  winProbA: number;
  spread?: number;
  date?: string;
}

/**
 * Interface for chaos game OG data
 */
interface ChaosOGData {
  gameTitle: string;
  chaosScore: number;
  chaosTier: 'LEGENDARY' | 'EPIC' | 'CHAOS' | 'WEIRD' | 'NORMAL';
  score: string;
  date?: string;
}

/**
 * Interface for article OG data
 */
interface ArticleOGData {
  title: string;
  subtitle?: string;
  date: string;
  category?: string;
}

/**
 * Helper to format rating with confidence interval
 */
function formatRating(rating: number, rd?: number): string {
  const confidence = rd ? Math.round(1.96 * rd) : 0;
  return confidence ? `${Math.round(rating)} ± ${confidence}` : Math.round(rating).toString();
}

/**
 * Helper to get color for level badge
 */
function getLevelColor(level: string): string {
  const levelColors: Record<string, string> = {
    FBS: COLORS.accentTeal,
    FCS: COLORS.accentPurple,
    D2: COLORS.accentWarning,
    D3: COLORS.accentPositive,
    NAIA: COLORS.textSecondary,
  };
  return levelColors[level] || COLORS.textSecondary;
}

/**
 * Helper to get tier color for chaos
 */
function getTierColor(tier: string): string {
  const tierColors: Record<string, string> = {
    LEGENDARY: COLORS.accentChaos,
    EPIC: COLORS.accentWarning,
    CHAOS: COLORS.accentTeal,
    WEIRD: COLORS.accentPurple,
    NORMAL: COLORS.textSecondary,
  };
  return tierColors[tier] || COLORS.textSecondary;
}

/**
 * Generates default OG image (homepage, generic pages)
 * "GridRank: Every Team. One List."
 */
export function generateDefaultOG(): string {
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    ${createGlowFilter()}
    ${createBackground()}

    <!-- Branding -->
    ${createBranding()}

    <!-- Main Content -->
    <g>
      <!-- "Grid" in white -->
      <text x="600" y="220" font-family="${FONTS.display}" font-size="120" font-weight="400" fill="${COLORS.textPrimary}" text-anchor="middle" letter-spacing="-2">
        Grid
      </text>
      <!-- "Rank" in teal -->
      <text x="600" y="320" font-family="${FONTS.display}" font-size="120" font-weight="700" fill="${COLORS.accentTeal}" text-anchor="middle" letter-spacing="-2" filter="url(#glow)">
        Rank
      </text>
    </g>

    <!-- Subtitle -->
    <text x="600" y="380" font-family="${FONTS.body}" font-size="28" fill="${COLORS.textSecondary}" text-anchor="middle" font-weight="300">
      Every Team. One List.
    </text>

    <!-- Stats Footer -->
    <g>
      <text x="600" y="520" font-family="${FONTS.mono}" font-size="16" fill="${COLORS.textMuted}" text-anchor="middle" letter-spacing="1">
        1,247 Teams • 5 Divisions • Since 2014
      </text>
      <line x1="200" y1="545" x2="1000" y2="545" stroke="${COLORS.accentTeal}" stroke-width="1" opacity="0.2" />
    </g>
  </svg>`;
}

/**
 * Generates team page OG image
 */
export function generateTeamOG(data: TeamOGData): string {
  const gradient = data.primaryColor
    ? `<linearGradient id="teamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${data.primaryColor};stop-opacity:0.3" />
        <stop offset="100%" style="stop-color:${COLORS.accentPurple};stop-opacity:0.1" />
      </linearGradient>`
    : '';

  const gradientUrl = data.primaryColor ? 'url(#teamGradient)' : COLORS.bgCard;

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    ${createGlowFilter()}
    ${createBackground()}
    ${gradient}

    <!-- Branding -->
    ${createBranding()}

    <!-- Left accent stripe (team color) -->
    <rect x="0" y="120" width="8" height="450" fill="${data.primaryColor || COLORS.accentTeal}" />

    <!-- Rank Badge (top right) -->
    <g>
      <rect x="1050" y="80" width="120" height="80" rx="8" fill="${COLORS.bgCard}" stroke="${COLORS.accentTeal}" stroke-width="2" />
      <text x="1110" y="115" font-family="${FONTS.display}" font-size="48" font-weight="700" fill="${COLORS.accentTeal}" text-anchor="middle">
        ${data.rank}
      </text>
      <text x="1110" y="145" font-family="${FONTS.body}" font-size="12" fill="${COLORS.textSecondary}" text-anchor="middle" font-weight="500">
        RANK
      </text>
    </g>

    <!-- Team Name -->
    <text x="100" y="240" font-family="${FONTS.display}" font-size="80" font-weight="700" fill="${COLORS.textPrimary}">
      ${data.teamName}
    </text>

    <!-- Mascot (optional) -->
    ${
      data.mascot
        ? `<text x="100" y="290" font-family="${FONTS.body}" font-size="24" fill="${COLORS.textSecondary}" font-weight="400">
      ${data.mascot}
    </text>`
        : ''
    }

    <!-- Rating Card -->
    <g>
      <rect x="100" y="340" width="500" height="140" rx="8" fill="${gradientUrl}" stroke="${COLORS.textMuted}" stroke-width="1" opacity="0.3" />
      <text x="120" y="375" font-family="${FONTS.body}" font-size="14" fill="${COLORS.textMuted}" font-weight="500" letter-spacing="1">
        RATING
      </text>
      <text x="120" y="430" font-family="${FONTS.mono}" font-size="48" fill="${COLORS.accentTeal}" font-weight="700" filter="url(#glow)">
        ${formatRating(data.rating, data.ratingDeviation)}
      </text>
    </g>

    <!-- Level Badge -->
    <g>
      <rect x="680" y="340" width="200" height="70" rx="8" fill="${COLORS.bgCard}" stroke="${getLevelColor(data.level)}" stroke-width="2" />
      <text x="780" y="385" font-family="${FONTS.body}" font-size="36" font-weight="700" fill="${getLevelColor(data.level)}" text-anchor="middle">
        ${data.level}
      </text>
    </g>

    <!-- Conference (if provided) -->
    ${
      data.conference
        ? `<g>
      <text x="680" y="435" font-family="${FONTS.body}" font-size="14" fill="${COLORS.textMuted}" font-weight="500" letter-spacing="0.5">
        CONFERENCE
      </text>
      <text x="680" y="465" font-family="${FONTS.body}" font-size="22" fill="${COLORS.textPrimary}" font-weight="600">
        ${data.conference}
      </text>
    </g>`
        : ''
    }

    <!-- Record (if provided) -->
    ${
      data.record
        ? `<g>
      <text x="100" y="490" font-family="${FONTS.body}" font-size="14" fill="${COLORS.textMuted}" font-weight="500" letter-spacing="0.5">
        RECORD
      </text>
      <text x="100" y="520" font-family="${FONTS.mono}" font-size="28" fill="${COLORS.textPrimary}" font-weight="600">
        ${data.record}
      </text>
    </g>`
        : ''
    }
  </svg>`;
}

/**
 * Generates rankings OG image with top 5 teams
 */
export function generateRankingsOG(data: RankingsOGData): string {
  const title = data.week ? `Week ${data.week}, ${data.season}` : `${data.season} Rankings`;

  // Build top teams list SVG
  const teamsContent = data.topTeams
    .slice(0, 5)
    .map((team, idx) => {
      const y = 180 + idx * 70;
      const levelColor = getLevelColor(team.level);
      return `
    <g>
      <!-- Rank -->
      <circle cx="80" cy="${y - 15}" r="28" fill="${COLORS.accentTeal}" opacity="0.2" />
      <text x="80" y="${y + 3}" font-family="${FONTS.mono}" font-size="28" font-weight="700" fill="${COLORS.accentTeal}" text-anchor="middle">
        ${team.rank}
      </text>

      <!-- Team info -->
      <text x="150" y="${y - 5}" font-family="${FONTS.body}" font-size="20" font-weight="600" fill="${COLORS.textPrimary}">
        ${team.name}
      </text>
      <text x="150" y="${y + 20}" font-family="${FONTS.mono}" font-size="16" fill="${COLORS.textSecondary}">
        ${Math.round(team.rating)} • ${team.level}
      </text>

      <!-- Divider -->
      <line x1="150" y1="${y + 35}" x2="1050" y2="${y + 35}" stroke="${COLORS.textMuted}" stroke-width="0.5" opacity="0.2" />
    </g>`;
    })
    .join('');

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    ${createGlowFilter()}
    ${createBackground()}

    <!-- Branding -->
    ${createBranding()}

    <!-- Title -->
    <text x="600" y="130" font-family="${FONTS.display}" font-size="56" font-weight="700" fill="${COLORS.accentTeal}" text-anchor="middle" filter="url(#glow)">
      ${title}
    </text>
    <text x="600" y="165" font-family="${FONTS.body}" font-size="18" fill="${COLORS.textSecondary}" text-anchor="middle">
      GridRank Top 5
    </text>

    <!-- Teams List -->
    ${teamsContent}
  </svg>`;
}

/**
 * Generates matchup OG image
 */
export function generateMatchupOG(data: MatchupOGData): string {
  const winProbA = Math.round(data.winProbA * 100);
  const winProbB = 100 - winProbA;
  const spreadText = data.spread
    ? `<text x="600" y="500" font-family="${FONTS.mono}" font-size="18" fill="${COLORS.textSecondary}" text-anchor="middle">
      Spread: ${data.spread > 0 ? '+' : ''}${data.spread.toFixed(1)}
    </text>`
    : '';

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    ${createGlowFilter()}
    ${createBackground()}

    <!-- Branding -->
    ${createBranding()}

    <!-- Team A -->
    <g>
      ${
        data.teamA.primaryColor
          ? `<rect x="60" y="120" width="420" height="380" rx="12" fill="${data.teamA.primaryColor}" opacity="0.1" stroke="${data.teamA.primaryColor}" stroke-width="1" />`
          : ''
      }
      <text x="270" y="220" font-family="${FONTS.display}" font-size="48" font-weight="600" fill="${COLORS.textPrimary}" text-anchor="middle">
        ${data.teamA.name}
      </text>
      <text x="270" y="300" font-family="${FONTS.mono}" font-size="36" font-weight="700" fill="${COLORS.accentTeal}" text-anchor="middle" filter="url(#glow)">
        ${Math.round(data.teamA.rating)}
      </text>
      <rect x="100" y="330" width="340" height="40" rx="6" fill="${COLORS.bgCard}" />
      <text x="270" y="362" font-family="${FONTS.body}" font-size="20" font-weight="700" fill="${COLORS.accentTeal}" text-anchor="middle">
        ${winProbA}% Win Prob
      </text>
    </g>

    <!-- VS Center -->
    <g>
      <circle cx="600" cy="310" r="50" fill="url(#tealGradient)" opacity="0.3" />
      <text x="600" y="325" font-family="${FONTS.display}" font-size="48" font-weight="700" fill="${COLORS.accentTeal}" text-anchor="middle" filter="url(#glow)">
        VS
      </text>
    </g>

    <!-- Team B -->
    <g>
      ${
        data.teamB.primaryColor
          ? `<rect x="720" y="120" width="420" height="380" rx="12" fill="${data.teamB.primaryColor}" opacity="0.1" stroke="${data.teamB.primaryColor}" stroke-width="1" />`
          : ''
      }
      <text x="930" y="220" font-family="${FONTS.display}" font-size="48" font-weight="600" fill="${COLORS.textPrimary}" text-anchor="middle">
        ${data.teamB.name}
      </text>
      <text x="930" y="300" font-family="${FONTS.mono}" font-size="36" font-weight="700" fill="${COLORS.accentPurple}" text-anchor="middle" filter="url(#glow)">
        ${Math.round(data.teamB.rating)}
      </text>
      <rect x="760" y="330" width="340" height="40" rx="6" fill="${COLORS.bgCard}" />
      <text x="930" y="362" font-family="${FONTS.body}" font-size="20" font-weight="700" fill="${COLORS.accentPurple}" text-anchor="middle">
        ${winProbB}% Win Prob
      </text>
    </g>

    <!-- Footer -->
    ${spreadText}
    ${
      data.date
        ? `<text x="600" y="580" font-family="${FONTS.body}" font-size="16" fill="${COLORS.textMuted}" text-anchor="middle">
      ${data.date}
    </text>`
        : ''
    }
  </svg>`;
}

/**
 * Generates chaos game OG image
 */
export function generateChaosOG(data: ChaosOGData): string {
  const tierColor = getTierColor(data.chaosTier);

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    ${createGlowFilter()}
    ${createBackground()}

    <!-- Branding -->
    ${createBranding()}

    <!-- Chaos Tier Badge (top right) -->
    <g>
      <rect x="1000" y="80" width="170" height="80" rx="8" fill="${COLORS.bgCard}" stroke="${tierColor}" stroke-width="2" />
      <text x="1085" y="125" font-family="${FONTS.body}" font-size="14" fill="${COLORS.textMuted}" text-anchor="middle" font-weight="500" letter-spacing="1">
        CHAOS TIER
      </text>
      <text x="1085" y="155" font-family="${FONTS.body}" font-size="20" font-weight="700" fill="${tierColor}" text-anchor="middle">
        ${data.chaosTier}
      </text>
    </g>

    <!-- Game Title -->
    <text x="600" y="200" font-family="${FONTS.display}" font-size="56" font-weight="700" fill="${COLORS.textPrimary}" text-anchor="middle">
      ${data.gameTitle}
    </text>

    <!-- Score -->
    <text x="600" y="280" font-family="${FONTS.mono}" font-size="52" font-weight="700" fill="${COLORS.textSecondary}" text-anchor="middle">
      ${data.score}
    </text>

    <!-- Chaos Score -->
    <g>
      <rect x="250" y="340" width="700" height="120" rx="12" fill="${tierColor}" opacity="0.1" stroke="${tierColor}" stroke-width="2" />
      <text x="600" y="380" font-family="${FONTS.body}" font-size="18" fill="${COLORS.textMuted}" text-anchor="middle" font-weight="500" letter-spacing="1">
        CHAOS SCORE
      </text>
      <text x="600" y="445" font-family="${FONTS.mono}" font-size="72" font-weight="700" fill="${tierColor}" text-anchor="middle" filter="url(#glow)">
        ${data.chaosScore.toFixed(1)}
      </text>
    </g>

    <!-- Date (if provided) -->
    ${
      data.date
        ? `<text x="600" y="580" font-family="${FONTS.body}" font-size="16" fill="${COLORS.textMuted}" text-anchor="middle">
      ${data.date}
    </text>`
        : ''
    }
  </svg>`;
}

/**
 * Generates article/stack OG image
 */
export function generateArticleOG(data: ArticleOGData): string {
  const categoryBadge = data.category
    ? `
    <rect x="100" y="80" width="auto" rx="4" fill="${COLORS.accentPurple}" opacity="0.2" />
    <text x="115" y="105" font-family="${FONTS.body}" font-size="12" fill="${COLORS.accentPurple}" font-weight="600" letter-spacing="1">
      ${data.category.toUpperCase()}
    </text>`
    : '';

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    ${createGlowFilter()}
    ${createBackground()}

    <!-- Branding -->
    ${createBranding()}

    <!-- Category Badge -->
    ${categoryBadge}

    <!-- Title -->
    <text x="100" y="220" font-family="${FONTS.display}" font-size="54" font-weight="700" fill="${COLORS.textPrimary}" word-spacing="-0.1em">
      <tspan x="100" dy="1.2em">${data.title}</tspan>
    </text>

    <!-- Subtitle (if provided) -->
    ${
      data.subtitle
        ? `<text x="100" y="420" font-family="${FONTS.body}" font-size="24" fill="${COLORS.textSecondary}" word-spacing="-0.05em">
      ${data.subtitle}
    </text>`
        : ''
    }

    <!-- Date -->
    <text x="100" y="550" font-family="${FONTS.body}" font-size="16" fill="${COLORS.textMuted}" font-weight="500">
      ${data.date}
    </text>

    <!-- Accent line -->
    <line x1="100" y1="570" x2="400" y2="570" stroke="${COLORS.accentTeal}" stroke-width="3" />
  </svg>`;
}

// Export types for external use
export type { TeamOGData, RankingsOGData, MatchupOGData, ChaosOGData, ArticleOGData };
