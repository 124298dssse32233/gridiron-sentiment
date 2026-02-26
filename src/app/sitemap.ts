/**
 * Dynamic Sitemap Generator
 * Generates /sitemap.xml dynamically using Next.js 15 App Router
 * Includes static pages and database-driven pages (teams, conferences)
 *
 * Updates daily to reflect new teams/conferences
 * Priority values: 1.0 (critical), 0.9 (high), 0.7 (medium), 0.6 (standard), 0.5 (low)
 * Changefreq: hourly (live updates), daily (games/rankings), weekly (analysis), monthly (static)
 */

import { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";

interface SitemapEntry {
  url: string;
  lastModified: Date;
  changeFrequency: "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
}

/**
 * Static pages with their properties
 */
const STATIC_PAGES: SitemapEntry[] = [
  {
    url: "https://gridironintel.com/",
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1.0,
  },
  {
    url: "https://gridironintel.com/methodology",
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    url: "https://gridironintel.com/predictions",
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: "https://gridironintel.com/chaos",
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  },
  {
    url: "https://gridironintel.com/coaches",
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    url: "https://gridironintel.com/lab",
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    url: "https://gridironintel.com/matchup",
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: "https://gridironintel.com/whatif",
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: "https://gridironintel.com/gameday",
    lastModified: new Date(),
    changeFrequency: "hourly",
    priority: 0.9,
  },
  {
    url: "https://gridironintel.com/programs",
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    url: "https://gridironintel.com/awards",
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    url: "https://gridironintel.com/gauntlet",
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  },
  {
    url: "https://gridironintel.com/roster",
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: "https://gridironintel.com/stack",
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    url: "https://gridironintel.com/pulse",
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.6,
  },
];

/**
 * Generate team URLs from database
 * Fetches all teams and creates individual team pages
 */
async function getTeamUrls(): Promise<SitemapEntry[]> {
  try {
    const teams = await prisma.team.findMany({
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    return teams.map((team) => ({
      url: `https://gridironintel.com/team/${team.slug}`,
      lastModified: team.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.85,
    }));
  } catch (error) {
    console.error("Error fetching teams for sitemap:", error);
    return [];
  }
}

/**
 * Generate conference URLs from database
 * Fetches all conferences and creates individual conference pages
 */
async function getConferenceUrls(): Promise<SitemapEntry[]> {
  try {
    const conferences = await prisma.conference.findMany({
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    return conferences.map((conf) => ({
      url: `https://gridironintel.com/conference/${conf.slug}`,
      lastModified: conf.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.75,
    }));
  } catch (error) {
    console.error("Error fetching conferences for sitemap:", error);
    return [];
  }
}

/**
 * Generate rivalry URLs from database
 * Fetches active rivalries and creates rivalry pages
 */
async function getRivalryUrls(): Promise<SitemapEntry[]> {
  try {
    // Query for unique team pairs that have rivalry records
    const rivalries = await prisma.$queryRaw<
      Array<{ slug: string; updatedAt: Date }>
    >`
      SELECT DISTINCT
        LOWER(CONCAT(t1.slug, '-vs-', t2.slug)) as slug,
        MAX(g.updatedAt) as updatedAt
      FROM game g
      JOIN team t1 ON g.homeTeamId = t1.id
      JOIN team t2 ON g.awayTeamId = t2.id
      WHERE g.season >= EXTRACT(YEAR FROM NOW()) - 5
      GROUP BY t1.id, t2.id
      LIMIT 1000
    `;

    return rivalries.map((r) => ({
      url: `https://gridironintel.com/rivalry/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    }));
  } catch (error) {
    console.error("Error fetching rivalries for sitemap:", error);
    return [];
  }
}

/**
 * Main sitemap generator
 * Combines static and dynamic URLs into MetadataRoute.Sitemap format
 * Called automatically by Next.js when GET /sitemap.xml is requested
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // Fetch dynamic URLs in parallel
    const [teamUrls, conferenceUrls, rivalryUrls] = await Promise.all([
      getTeamUrls(),
      getConferenceUrls(),
      getRivalryUrls(),
    ]);

    // Combine all URLs
    const allUrls = [...STATIC_PAGES, ...teamUrls, ...conferenceUrls, ...rivalryUrls];

    // Convert to Next.js MetadataRoute.Sitemap format
    return allUrls.map((entry) => ({
      url: entry.url,
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    }));
  } catch (error) {
    console.error("Error generating sitemap:", error);

    // Return at minimum the static pages if database fails
    return STATIC_PAGES.map((entry) => ({
      url: entry.url,
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    }));
  }
}
