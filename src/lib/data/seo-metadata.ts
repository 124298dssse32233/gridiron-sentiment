/**
 * SEO Metadata Configuration for All Pages
 *
 * Centralized metadata definitions for every route in Gridiron Intel.
 * Import and use in each page's `export const metadata` or `generateMetadata()`.
 */

import { Metadata } from "next";

const SITE_NAME = "Gridiron Intel";
const SITE_URL = "https://gridironintel.com";
const DEFAULT_OG_IMAGE = "/og-default.png";

/**
 * Base metadata shared across all pages
 */
export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Gridiron Intel — Every Team. One List.",
    template: "%s | Gridiron Intel",
  },
  description:
    "The definitive college football analytics platform. GridRank rates every team in America — FBS, FCS, D2, D3, NAIA — on one unified list.",
  keywords: [
    "college football rankings",
    "college football analytics",
    "GridRank",
    "FBS rankings",
    "FCS rankings",
    "D2 football rankings",
    "D3 football rankings",
    "NAIA football rankings",
    "football computer rankings",
    "Glicko-2 football",
    "college football predictions",
    "chaos index",
    "strength of schedule",
  ],
  authors: [{ name: "Gridiron Intel" }],
  creator: "Gridiron Intel",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Gridiron Intel — Every Team. One List.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@gridironintel",
    creator: "@gridironintel",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

/**
 * Per-page metadata definitions
 */
export const pageMetadata: Record<string, Metadata> = {
  // Homepage — Rankings
  "/": {
    title: "College Football Rankings — GridRank | Gridiron Intel",
    description:
      "Live GridRank college football rankings. Every FBS, FCS, D2, D3, and NAIA team ranked on one unified list using Glicko-2 analytics.",
    openGraph: {
      title: "College Football Rankings — GridRank",
      description:
        "680+ teams. One list. The most comprehensive college football ranking system ever built.",
    },
  },

  // Team Page (template — use generateMetadata for dynamic)
  "/team/[slug]": {
    title: "Team Profile | Gridiron Intel",
    description:
      "Complete team analytics: GridRank rating, game log, historical trends, strength of schedule, and more.",
  },

  // Conference Page
  "/conference/[slug]": {
    title: "Conference Analytics | Gridiron Intel",
    description:
      "Conference power rankings, cross-conference performance, and historical trends.",
  },

  // Programs / GridLegacy
  "/programs": {
    title: "GridLegacy — All-Time Program Rankings | Gridiron Intel",
    description:
      "All-time college football program rankings from 2014 to present. Peak performance, consistency, postseason success, and recruiting all factored in.",
    openGraph: {
      title: "GridLegacy — All-Time Program Rankings",
      description:
        "Which programs have been the best over the last decade? GridLegacy scores peak performance, consistency, and postseason success.",
    },
  },

  // Predictions
  "/predictions": {
    title: "Game Predictions — Weekly Picks | Gridiron Intel",
    description:
      "Weekly college football game predictions with win probabilities, predicted spreads, and confidence intervals powered by GridRank.",
    openGraph: {
      title: "College Football Predictions",
      description:
        "GridRank-powered predictions with win probability, spread, and total for every game this week.",
    },
  },

  // Methodology
  "/methodology": {
    title: "Methodology — How GridRank Works | Gridiron Intel",
    description:
      "The complete guide to GridRank: a Glicko-2 hybrid rating system ranking every college football team. Casual explanation and deep mathematical dive.",
    openGraph: {
      title: "How GridRank Works",
      description:
        "Glicko-2 hybrid with margin compression, garbage time filtering, dynamic HFA, and cross-level bridging. Choose casual or deep dive mode.",
    },
  },

  // Pulse — Fan Sentiment
  "/pulse": {
    title: "Fan Pulse — Sentiment Analysis | Gridiron Intel",
    description:
      "Real-time fan and media sentiment analysis for every college football team. NLP-powered mood tracking across social media and forums.",
    openGraph: {
      title: "Fan Pulse — College Football Sentiment",
      description:
        "What are fans really saying? NLP-powered sentiment analysis tracking the mood of every fanbase in real time.",
    },
  },

  // Chaos Index
  "/chaos": {
    title: "Chaos Index — College Football Upsets | Gridiron Intel",
    description:
      "The Chaos Index scores every game on a 6-component chaos scale. Track the wildest upsets, craziest finishes, and most chaotic weeks in college football.",
    openGraph: {
      title: "Chaos Index — Upsets & Mayhem",
      description:
        "Every game scored on a 6-component chaos scale. Spread busts, win probability swings, upset magnitude, and more.",
    },
  },

  // The Lab
  "/lab": {
    title: "The Lab — Statistical Outliers | Gridiron Intel",
    description:
      "Statistical outlier detection for players and team anomalies. Z-score analysis revealing breakout performers and underperforming expectations.",
    openGraph: {
      title: "The Lab — Outlier Detection",
      description:
        "Find breakout players and anomalous teams with Z-score outlier analysis. Who's outperforming their expected stats?",
    },
  },

  // Matchup Machine
  "/matchup": {
    title: "Matchup Machine — Head-to-Head Simulator | Gridiron Intel",
    description:
      "Pick any two college football teams and run 10,000 Monte Carlo simulations. See win probability, predicted score, and key matchup factors.",
    openGraph: {
      title: "Matchup Machine — Pick Any Two Teams",
      description:
        "10,000 Monte Carlo simulations. Pick any two teams in America and see who wins, by how much, and why.",
    },
  },

  // What If Engine
  "/whatif": {
    title: "What If Engine — Alternate Scenarios | Gridiron Intel",
    description:
      "Change game outcomes and see the cascade effects on rankings, playoff odds, and conference standings. Explore alternate-timeline college football.",
    openGraph: {
      title: "What If Engine — Alternate Timelines",
      description:
        "What if that upset never happened? Change game results and watch the rankings, playoffs, and standings recalculate in real time.",
    },
  },

  // Gameday Dashboard
  "/gameday": {
    title: "Gameday Dashboard — Live Scores & WP | Gridiron Intel",
    description:
      "Live college football scores, real-time win probability charts, upset alerts, and chaos tracking. Your command center on Saturdays.",
    openGraph: {
      title: "Gameday Dashboard",
      description:
        "Live scores, win probability charts, upset alerts, and a real-time chaos tracker. Everything you need on game day.",
    },
  },

  // Coach Intelligence
  "/coaches": {
    title: "Coach Intelligence — Decision Analytics | Gridiron Intel",
    description:
      "Coach grading, fourth-down decision analysis, and an interactive decision calculator. See which coaches make the smartest calls.",
    openGraph: {
      title: "Coach Intelligence",
      description:
        "4th-down decision models, coaching grades, and an interactive calculator. Who's making the smartest calls?",
    },
  },

  // The Gauntlet — Strength of Schedule
  "/gauntlet": {
    title: "The Gauntlet — Strength of Schedule | Gridiron Intel",
    description:
      "Strength of schedule visualization for every team. Past SOS, remaining SOS, and composite difficulty ratings across all levels.",
    openGraph: {
      title: "The Gauntlet — Strength of Schedule",
      description:
        "Visualize every team's strength of schedule. Past, remaining, and composite — rendered as an interactive gauntlet.",
    },
  },

  // Awards Tracker
  "/awards": {
    title: "Awards Tracker — Heisman & More | Gridiron Intel",
    description:
      "Live award probability tracking for the Heisman Trophy and 9 other major college football awards. Statistical, narrative, and historical factors.",
    openGraph: {
      title: "Awards Tracker — Heisman & More",
      description:
        "Real-time probability tracking for the Heisman, Biletnikoff, Doak Walker, and 7 more awards.",
    },
  },

  // Rivalry Pages
  "/rivalry/[slug]": {
    title: "Rivalry Deep Dive | Gridiron Intel",
    description:
      "Complete rivalry history: head-to-head records, rating comparisons, fan sentiment, and historical context.",
  },

  // Roster Intelligence
  "/roster": {
    title: "Roster Intelligence — Talent & Transfers | Gridiron Intel",
    description:
      "Team talent composites, transfer portal war room, and recruiting pipeline analysis. Track roster construction across all divisions.",
    openGraph: {
      title: "Roster Intelligence",
      description:
        "Talent composites, portal tracking, and recruiting pipelines. Everything about roster construction in one place.",
    },
  },

  // The Stack — Weekly Digest
  "/stack": {
    title: "The Stack — Weekly Digest | Gridiron Intel",
    description:
      "Auto-generated weekly college football digest. Top movers, biggest upsets, chaos recap, and what to watch next week.",
    openGraph: {
      title: "The Stack — Weekly Digest",
      description:
        "Your weekly college football briefing: rankings movers, upsets, chaos scores, and the games that matter next.",
    },
  },
};

/**
 * Generate metadata for a specific team page
 */
export function generateTeamMetadata(
  teamName: string,
  teamSlug: string,
  conference: string,
  level: string,
  rating?: number
): Metadata {
  const ratingStr = rating ? ` (GridRank: ${Math.round(rating)})` : "";
  return {
    title: `${teamName} — Team Profile${ratingStr}`,
    description: `${teamName} (${conference}, ${level}) analytics: GridRank rating, game log, historical trends, strength of schedule, and recruiting data.`,
    openGraph: {
      title: `${teamName} — GridRank Profile`,
      description: `Complete analytics for ${teamName}. Rating, game log, historical chart, SOS, and more.`,
      url: `${SITE_URL}/team/${teamSlug}`,
    },
  };
}

/**
 * Generate metadata for a conference page
 */
export function generateConferenceMetadata(
  conferenceName: string,
  conferenceSlug: string
): Metadata {
  return {
    title: `${conferenceName} — Conference Analytics`,
    description: `${conferenceName} power rankings, cross-conference performance, heatmap, and historical trends on Gridiron Intel.`,
    openGraph: {
      title: `${conferenceName} Analytics`,
      description: `Power rankings and analytics for every team in the ${conferenceName}.`,
      url: `${SITE_URL}/conference/${conferenceSlug}`,
    },
  };
}

/**
 * Generate metadata for a rivalry page
 */
export function generateRivalryMetadata(
  team1: string,
  team2: string,
  rivalryName: string,
  slug: string
): Metadata {
  return {
    title: `${rivalryName} — ${team1} vs ${team2}`,
    description: `The ${rivalryName}: complete head-to-head history, rating comparisons, fan sentiment, and historical context for ${team1} vs ${team2}.`,
    openGraph: {
      title: `${rivalryName}`,
      description: `${team1} vs ${team2} — head-to-head history, analytics, and fan sentiment.`,
      url: `${SITE_URL}/rivalry/${slug}`,
    },
  };
}
