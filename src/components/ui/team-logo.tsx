"use client";

/**
 * TeamLogo — Displays a team's logo with graceful fallback
 *
 * Rendering priority:
 * 1. Image from `logoUrl` or `logos` array (CFBD/ESPN CDN)
 * 2. ESPN CDN via known team ID lookup
 * 3. Styled letter avatar using team colors
 *
 * Features:
 * - Dark-background optimized (uses dark variant from ESPN CDN)
 * - Loading skeleton while image loads
 * - Smooth fade-in on load
 * - Automatic error fallback to letter avatar
 * - Configurable sizes: xs, sm, md, lg, xl
 */

import { useState, useCallback } from "react";
import Image from "next/image";
import { getTeamLogos, getTeamInitials, type TeamLogoInfo } from "@/lib/data/team-logos";
import { getTeamColors, type TeamColors } from "@/lib/data/team-colors";
import { cn } from "@/lib/utils/cn";

// =============================================================================
// TYPES
// =============================================================================

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface TeamLogoProps {
  /** Team display name (e.g., "Ohio State") */
  teamName: string;
  /** Logo URL from database (team.logoUrl) */
  logoUrl?: string | null;
  /** Full logos array from database (team.metadata.logos) */
  logos?: string[] | null;
  /** Team abbreviation from database (team.abbreviation) — used for letter fallback */
  abbreviation?: string | null;
  /** Primary team color override (hex). Falls back to team-colors database */
  primaryColor?: string | null;
  /** Secondary team color override (hex). Falls back to team-colors database */
  secondaryColor?: string | null;
  /** Size preset */
  size?: LogoSize;
  /** Additional CSS classes */
  className?: string;
  /** Show a subtle glow behind the logo in the team's primary color */
  glow?: boolean;
  /** Render as a circle (default) or rounded square */
  shape?: "circle" | "square";
  /** Alt text override */
  alt?: string;
}

// =============================================================================
// SIZE CONFIG
// =============================================================================

const SIZE_MAP: Record<
  LogoSize,
  {
    container: string;
    image: number;
    fontSize: string;
    glowSize: string;
  }
> = {
  xs: {
    container: "w-6 h-6",
    image: 24,
    fontSize: "text-[9px]",
    glowSize: "shadow-[0_0_8px_var(--glow-color)]",
  },
  sm: {
    container: "w-8 h-8",
    image: 32,
    fontSize: "text-[10px]",
    glowSize: "shadow-[0_0_10px_var(--glow-color)]",
  },
  md: {
    container: "w-10 h-10",
    image: 40,
    fontSize: "text-xs",
    glowSize: "shadow-[0_0_14px_var(--glow-color)]",
  },
  lg: {
    container: "w-14 h-14",
    image: 56,
    fontSize: "text-sm",
    glowSize: "shadow-[0_0_20px_var(--glow-color)]",
  },
  xl: {
    container: "w-20 h-20",
    image: 80,
    fontSize: "text-base",
    glowSize: "shadow-[0_0_28px_var(--glow-color)]",
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function TeamLogo({
  teamName,
  logoUrl,
  logos,
  abbreviation,
  primaryColor,
  secondaryColor,
  size = "md",
  className,
  glow = false,
  shape = "circle",
  alt,
}: TeamLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeConfig = SIZE_MAP[size];

  // Resolve logo URLs
  const logoInfo: TeamLogoInfo = getTeamLogos(
    teamName,
    logoUrl,
    logos
  );

  // Resolve colors
  const colors: TeamColors = {
    primary: primaryColor ?? getTeamColors(teamName).primary,
    secondary: secondaryColor ?? getTeamColors(teamName).secondary,
  };

  const hasImage = logoInfo.source !== "fallback" && logoInfo.primary && !imageError;
  const initials = getTeamInitials(teamName, abbreviation);
  const borderRadius = shape === "circle" ? "rounded-full" : "rounded-lg";

  const handleError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  return (
    <div
      className={cn(
        "relative flex-shrink-0 flex items-center justify-center overflow-hidden",
        sizeConfig.container,
        borderRadius,
        glow && sizeConfig.glowSize,
        className
      )}
      style={{
        // CSS custom property for glow color
        "--glow-color": glow ? `${colors.primary}40` : "transparent",
      } as React.CSSProperties}
      title={alt ?? teamName}
    >
      {hasImage ? (
        <>
          {/* Loading skeleton */}
          {!imageLoaded && (
            <div
              className={cn(
                "absolute inset-0 animate-pulse",
                borderRadius
              )}
              style={{ backgroundColor: `${colors.primary}20` }}
            />
          )}

          {/* Team logo image */}
          <Image
            src={logoInfo.primary}
            alt={alt ?? `${teamName} logo`}
            width={sizeConfig.image}
            height={sizeConfig.image}
            className={cn(
              "object-contain transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onError={handleError}
            onLoad={handleLoad}
            unoptimized // External CDN images — skip Next.js optimization
          />
        </>
      ) : (
        /* Letter avatar fallback */
        <LetterAvatar
          initials={initials}
          primaryColor={colors.primary}
          secondaryColor={colors.secondary}
          fontSize={sizeConfig.fontSize}
          borderRadius={borderRadius}
        />
      )}
    </div>
  );
}

// =============================================================================
// LETTER AVATAR SUB-COMPONENT
// =============================================================================

function LetterAvatar({
  initials,
  primaryColor,
  secondaryColor,
  fontSize,
  borderRadius,
}: {
  initials: string;
  primaryColor: string;
  secondaryColor: string;
  fontSize: string;
  borderRadius: string;
}) {
  // Scale down font for longer abbreviations (4+ chars) to fit the container
  const scaledFontSize =
    initials.length >= 5
      ? "text-[7px]"
      : initials.length === 4
        ? fontSize // Keep normal for 4 chars — fits fine at all sizes
        : fontSize;

  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-center font-mono font-bold",
        initials.length >= 4 ? "tracking-tighter" : "tracking-tight",
        scaledFontSize,
        borderRadius
      )}
      style={{
        backgroundColor: primaryColor,
        color: getContrastColor(primaryColor),
        border: `2px solid ${secondaryColor}`,
      }}
    >
      {initials}
    </div>
  );
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Pick white or dark text for maximum contrast against a background color.
 * Uses relative luminance formula (WCAG 2.0).
 */
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  if (hex.length < 6) return "#FFFFFF";

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // sRGB to linear
  const linearR = r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4;
  const linearG = g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4;
  const linearB = b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4;

  const luminance = 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;

  return luminance > 0.179 ? "#000000" : "#FFFFFF";
}

// =============================================================================
// LOGO ROW — Common pattern for showing logo + team name inline
// =============================================================================

interface TeamLogoRowProps {
  teamName: string;
  logoUrl?: string | null;
  logos?: string[] | null;
  abbreviation?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  size?: LogoSize;
  /** Show conference or subtitle text below team name */
  subtitle?: string;
  /** Additional class for the container */
  className?: string;
}

/**
 * TeamLogoRow — Logo + Team Name inline, commonly used in rankings tables
 */
export function TeamLogoRow({
  teamName,
  logoUrl,
  logos,
  abbreviation,
  primaryColor,
  secondaryColor,
  size = "sm",
  subtitle,
  className,
}: TeamLogoRowProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <TeamLogo
        teamName={teamName}
        logoUrl={logoUrl}
        logos={logos}
        abbreviation={abbreviation}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        size={size}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {teamName}
        </p>
        {subtitle && (
          <p className="text-xs text-text-muted truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// LOGO PAIR — For matchup displays (Team A vs Team B)
// =============================================================================

interface TeamLogoPairProps {
  team1Name: string;
  team2Name: string;
  team1LogoUrl?: string | null;
  team2LogoUrl?: string | null;
  team1Logos?: string[] | null;
  team2Logos?: string[] | null;
  team1Color?: string | null;
  team2Color?: string | null;
  size?: LogoSize;
  className?: string;
}

/**
 * TeamLogoPair — Two team logos side by side with "VS" separator
 * Used in matchup displays, predictions, and rivalry pages
 */
export function TeamLogoPair({
  team1Name,
  team2Name,
  team1LogoUrl,
  team2LogoUrl,
  team1Logos,
  team2Logos,
  team1Color,
  team2Color,
  size = "lg",
  className,
}: TeamLogoPairProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <TeamLogo
        teamName={team1Name}
        logoUrl={team1LogoUrl}
        logos={team1Logos}
        primaryColor={team1Color}
        size={size}
        glow
      />
      <span className="text-text-muted font-mono text-xs uppercase tracking-widest">
        vs
      </span>
      <TeamLogo
        teamName={team2Name}
        logoUrl={team2LogoUrl}
        logos={team2Logos}
        primaryColor={team2Color}
        size={size}
        glow
      />
    </div>
  );
}
