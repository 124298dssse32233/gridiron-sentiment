/**
 * JSON-LD Structured Data Generators for Gridiron Intel
 * Comprehensive helpers for Google rich results and SEO-optimized schema markup.
 *
 * Implements schema.org types:
 * - WebSite (homepage search action)
 * - Organization (branding, contact)
 * - SportsTeam (team pages)
 * - SportsEvent (games, predictions, gameday)
 * - Article / BlogPosting (The Stack newsletter, methodology)
 * - BreadcrumbList (navigation structure)
 * - FAQPage (methodology deep dives)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Input data for website schema (homepage)
 */
export interface WebsiteSchemaInput {
  baseUrl: string;
  searchUrl: string;
}

/**
 * Input data for team schema
 */
export interface TeamSchemaInput {
  /** Full team name (e.g., "Ohio State Buckeyes") */
  name: string;

  /** Team mascot (e.g., "Buckeyes") */
  mascot?: string;

  /** Conference name (e.g., "Big Ten Conference") */
  conference?: string;

  /** Division level (FBS, FCS, D2, D3, NAIA) */
  level: string;

  /** Stadium/venue name */
  stadium?: string;

  /** City where team is located */
  city?: string;

  /** State abbreviation (e.g., "OH") */
  state?: string;

  /** URL to team logo */
  logoUrl?: string;

  /** Team slug for generating URLs */
  slug: string;

  /** Current season rating/ranking (optional) */
  rating?: number;

  /** Team record (optional) */
  wins?: number;
  losses?: number;

  /** Official athletics website */
  athleticsUrl?: string;
}

/**
 * Input data for sports event/game schema
 */
export interface GameSchemaInput {
  /** Home team info */
  homeTeam: {
    name: string;
    slug: string;
    logoUrl?: string;
  };

  /** Away team info */
  awayTeam: {
    name: string;
    slug: string;
    logoUrl?: string;
  };

  /** Game date/time in ISO format */
  date: string;

  /** Venue/stadium name */
  venue?: string;

  /** City where game is played */
  city?: string;

  /** State where game is played */
  state?: string;

  /** Week number (optional) */
  week?: number;

  /** Season year (optional) */
  season?: number;

  /** Whether it's a conference game */
  isConferenceGame?: boolean;

  /** Home team score (if game completed) */
  homeScore?: number;

  /** Away team score (if game completed) */
  awayScore?: number;
}

/**
 * Input data for article/blog post schema
 */
export interface ArticleSchemaInput {
  /** Article headline */
  title: string;

  /** Short description/excerpt */
  description: string;

  /** Publication date (ISO format) */
  datePublished: string;

  /** Last modified date (ISO format) */
  dateModified?: string;

  /** Article slug for generating URL */
  slug: string;

  /** Featured image URL */
  imageUrl?: string;

  /** Author name */
  author?: string;

  /** Article body/content (optional, for search engines) */
  body?: string;
}

/**
 * Single breadcrumb item
 */
export interface BreadcrumbItem {
  /** Display name */
  name: string;

  /** Relative or absolute URL */
  href: string;

  /** Position in breadcrumb hierarchy */
  position?: number;
}

/**
 * Input data for FAQ schema (methodology page, etc.)
 */
export interface FAQItem {
  /** Question text */
  question: string;

  /** Answer text (can include HTML) */
  answer: string;
}

// ============================================================================
// OUTPUT SCHEMA TYPES
// ============================================================================

/**
 * Structured data for website schema
 */
export interface WebsiteSchema {
  "@context": "https://schema.org";
  "@type": "WebSite";
  name: string;
  url: string;
  description: string;
  potentialAction: {
    "@type": "SearchAction";
    target: string;
    "query-input": string;
  };
}

/**
 * Structured data for organization schema
 */
export interface OrganizationSchema {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: string;
  url: string;
  logo: string;
  description: string;
  sameAs: string[];
  contactPoint: {
    "@type": "ContactPoint";
    contactType: string;
    email: string;
  };
}

/**
 * Structured data for sports team
 */
export interface SportsTeamSchema {
  "@context": "https://schema.org";
  "@type": "SportsTeam";
  name: string;
  url: string;
  logo?: string;
  sport: "American Football";
  division?: string;
  memberOf?: {
    "@type": "SportsOrganization";
    name: string;
  };
  location?: {
    "@type": "Place";
    name: string;
    address?: {
      "@type": "PostalAddress";
      streetAddress?: string;
      addressLocality: string;
      addressRegion: string;
    };
  };
  potentialAction?: {
    "@type": "ViewAction";
    target: string;
  };
}

/**
 * Structured data for sports event
 */
export interface SportsEventSchema {
  "@context": "https://schema.org";
  "@type": "SportsEvent";
  name: string;
  startDate: string;
  endDate?: string;
  eventStatus?: "EventScheduled" | "EventLive" | "EventFinished";
  homeTeam?: {
    "@type": "SportsTeam";
    name: string;
    logo?: string;
  };
  awayTeam?: {
    "@type": "SportsTeam";
    name: string;
    logo?: string;
  };
  location?: {
    "@type": "Place";
    name: string;
    address?: {
      "@type": "PostalAddress";
      addressLocality: string;
      addressRegion: string;
    };
  };
  potentialAction?: {
    "@type": "ViewAction";
    target: string;
  };
  result?: {
    "@type": "GamePlayAction";
    homeTeamScore?: number;
    awayTeamScore?: number;
  };
}

/**
 * Structured data for article/blog post
 */
export interface ArticleSchema {
  "@context": "https://schema.org";
  "@type": "Article" | "BlogPosting";
  headline: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author?: {
    "@type": "Person" | "Organization";
    name: string;
  };
  publisher?: {
    "@type": "Organization";
    name: string;
    logo?: {
      "@type": "ImageObject";
      url: string;
    };
  };
  mainEntityOfPage?: {
    "@type": "WebPage";
    "@id": string;
  };
}

/**
 * Structured data for breadcrumb navigation
 */
export interface BreadcrumbSchema {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>;
}

/**
 * Structured data for FAQ page
 */
export interface FAQPageSchema {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }>;
}

// ============================================================================
// SCHEMA GENERATORS
// ============================================================================

const BASE_URL = "https://gridironintel.com";

/**
 * Generate WebSite schema for homepage with search action
 * Enables sitelinks search box in Google SERP
 *
 * @param input - Website schema input data
 * @returns Schema.org WebSite schema
 *
 * @example
 * ```ts
 * const schema = generateWebsiteSchema({
 *   baseUrl: 'https://gridironintel.com',
 *   searchUrl: 'https://gridironintel.com/search?q={search_term}'
 * });
 * ```
 */
export function generateWebsiteSchema(
  input: WebsiteSchemaInput
): WebsiteSchema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Gridiron Intel",
    url: input.baseUrl,
    description:
      "The definitive college football analytics platform. Unified rankings across FBS, FCS, D2, D3, NAIA divisions with GridRank ratings, predictions, and real-time analytics.",
    potentialAction: {
      "@type": "SearchAction",
      target: input.searchUrl,
      "query-input": "required name=search_term",
    },
  };
}

/**
 * Generate Organization schema for Gridiron Intel
 * Used in footer and general site information
 *
 * @returns Schema.org Organization schema
 *
 * @example
 * ```ts
 * const schema = generateOrganizationSchema();
 * ```
 */
export function generateOrganizationSchema(): OrganizationSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Gridiron Intel",
    url: BASE_URL,
    logo: `${BASE_URL}/logo-512x512.png`,
    description:
      "College football analytics platform ranking every team in America on the GridRank unified scale.",
    sameAs: [
      "https://twitter.com/gridironintel",
      "https://instagram.com/gridironintel",
      "https://facebook.com/gridironintel",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: "hello@gridironintel.com",
    },
  };
}

/**
 * Generate SportsTeam schema for team detail pages
 * Includes team info, conference, stadium location
 *
 * @param input - Team schema input data
 * @returns Schema.org SportsTeam schema
 *
 * @example
 * ```ts
 * const schema = generateTeamSchema({
 *   name: 'Ohio State Buckeyes',
 *   mascot: 'Buckeyes',
 *   conference: 'Big Ten Conference',
 *   level: 'FBS',
 *   stadium: 'Ohio Stadium',
 *   city: 'Columbus',
 *   state: 'OH',
 *   slug: 'ohio-state'
 * });
 * ```
 */
export function generateTeamSchema(input: TeamSchemaInput): SportsTeamSchema {
  const teamUrl = `${BASE_URL}/team/${input.slug}`;

  const schema: SportsTeamSchema = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: input.name,
    url: teamUrl,
    sport: "American Football",
    division: input.level,
  };

  // Add logo if available
  if (input.logoUrl) {
    schema.logo = input.logoUrl;
  }

  // Add conference info if available
  if (input.conference) {
    schema.memberOf = {
      "@type": "SportsOrganization",
      name: input.conference,
    };
  }

  // Add location if stadium and city are available
  if (input.stadium && input.city) {
    schema.location = {
      "@type": "Place",
      name: input.stadium,
      address: {
        "@type": "PostalAddress",
        addressLocality: input.city,
        addressRegion: input.state || "",
      },
    };
  }

  // Add view action
  schema.potentialAction = {
    "@type": "ViewAction",
    target: teamUrl,
  };

  return schema;
}

/**
 * Generate SportsEvent schema for games and predictions
 * Used for gameday dashboard, predictions, and matchup pages
 *
 * @param input - Game schema input data
 * @param baseUrl - Base URL for canonical links (defaults to BASE_URL)
 * @returns Schema.org SportsEvent schema
 *
 * @example
 * ```ts
 * const schema = generateGameSchema({
 *   homeTeam: { name: 'Ohio State', slug: 'ohio-state' },
 *   awayTeam: { name: 'Michigan', slug: 'michigan' },
 *   date: '2025-11-29T12:00:00Z',
 *   venue: 'Michigan Stadium',
 *   city: 'Ann Arbor',
 *   state: 'MI',
 *   week: 13,
 *   season: 2025
 * });
 * ```
 */
export function generateGameSchema(
  input: GameSchemaInput,
  baseUrl: string = BASE_URL
): SportsEventSchema {
  // Format date for schema
  const eventDate = new Date(input.date);
  const startDate = eventDate.toISOString();
  // Estimate 3.5 hour game duration
  const endDate = new Date(
    eventDate.getTime() + 3.5 * 60 * 60 * 1000
  ).toISOString();

  // Determine event status
  let eventStatus: "EventScheduled" | "EventLive" | "EventFinished" =
    "EventScheduled";
  const now = new Date();
  if (eventDate < now) {
    eventStatus = "EventFinished";
  } else if (
    eventDate.getTime() - now.getTime() < 3.5 * 60 * 60 * 1000 &&
    eventDate < now
  ) {
    eventStatus = "EventLive";
  }

  // Build game name
  const gameName = `${input.homeTeam.name} vs ${input.awayTeam.name}`;

  const schema: SportsEventSchema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: gameName,
    startDate,
    endDate,
    eventStatus,
  };

  // Add home team
  schema.homeTeam = {
    "@type": "SportsTeam",
    name: input.homeTeam.name,
  };
  if (input.homeTeam.logoUrl) {
    schema.homeTeam.logo = input.homeTeam.logoUrl;
  }

  // Add away team
  schema.awayTeam = {
    "@type": "SportsTeam",
    name: input.awayTeam.name,
  };
  if (input.awayTeam.logoUrl) {
    schema.awayTeam.logo = input.awayTeam.logoUrl;
  }

  // Add location if venue is available
  if (input.venue && input.city) {
    schema.location = {
      "@type": "Place",
      name: input.venue,
      address: {
        "@type": "PostalAddress",
        addressLocality: input.city,
        addressRegion: input.state || "",
      },
    };
  }

  // Add result if game is complete
  if (
    eventStatus === "EventFinished" &&
    input.homeScore !== undefined &&
    input.awayScore !== undefined
  ) {
    schema.result = {
      "@type": "GamePlayAction",
      homeTeamScore: input.homeScore,
      awayTeamScore: input.awayScore,
    };
  }

  // Add view action with link to gameday or matchup page
  const gameId = `${input.season}-${input.week}-${input.homeTeam.slug}-vs-${input.awayTeam.slug}`;
  schema.potentialAction = {
    "@type": "ViewAction",
    target: `${baseUrl}/gameday?game=${gameId}`,
  };

  return schema;
}

/**
 * Generate Article/BlogPosting schema for content pages
 * Used for The Stack newsletter, methodology page, blog posts
 *
 * @param input - Article schema input data
 * @param baseUrl - Base URL for canonical links (defaults to BASE_URL)
 * @returns Schema.org Article schema
 *
 * @example
 * ```ts
 * const schema = generateArticleSchema({
 *   title: 'How GridRank Works: Glicko-2 for College Football',
 *   description: 'Deep dive into the Glicko-2 rating system...',
 *   datePublished: '2025-02-24T10:00:00Z',
 *   slug: 'gridrank-methodology',
 *   imageUrl: 'https://...',
 *   author: 'Gridiron Intel'
 * });
 * ```
 */
export function generateArticleSchema(
  input: ArticleSchemaInput,
  baseUrl: string = BASE_URL
): ArticleSchema {
  const articleUrl = `${baseUrl}/${input.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    image: input.imageUrl,
    datePublished: input.datePublished,
    dateModified: input.dateModified || input.datePublished,
    author: input.author
      ? {
          "@type": "Organization",
          name: input.author,
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "Gridiron Intel",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo-256x256.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
  };
}

/**
 * Generate BreadcrumbList schema for navigation
 * Used on all pages to show hierarchy and improve SERP appearance
 *
 * @param items - Array of breadcrumb items
 * @param baseUrl - Base URL (defaults to BASE_URL)
 * @returns Schema.org BreadcrumbList schema
 *
 * @example
 * ```ts
 * const schema = generateBreadcrumbs([
 *   { name: 'Home', href: '/' },
 *   { name: 'Rankings', href: '/rankings' },
 *   { name: 'Ohio State', href: '/team/ohio-state' }
 * ]);
 * ```
 */
export function generateBreadcrumbs(
  items: BreadcrumbItem[],
  baseUrl: string = BASE_URL
): BreadcrumbSchema {
  const itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }> = items.map((item, index) => ({
    "@type": "ListItem" as const,
    position: index + 1,
    name: item.name,
    item: `${baseUrl}${item.href.startsWith("/") ? "" : "/"}${item.href}`,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };
}

/**
 * Generate FAQPage schema for methodology and FAQ pages
 * Enables FAQ rich result in Google search
 *
 * @param items - Array of FAQ items
 * @returns Schema.org FAQPage schema
 *
 * @example
 * ```ts
 * const schema = generateFAQSchema([
 *   {
 *     question: 'What is GridRank?',
 *     answer: 'GridRank is a unified college football rating system...'
 *   },
 *   {
 *     question: 'How is the rating calculated?',
 *     answer: 'GridRank uses the Glicko-2 algorithm...'
 *   }
 * ]);
 * ```
 */
export function generateFAQSchema(items: FAQItem[]): FAQPageSchema {
  const mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }> = items.map((item) => ({
    "@type": "Question" as const,
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer" as const,
      text: item.answer,
    },
  }));

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Render schema as a JSON-LD script tag string
 * Ready to be inserted into Next.js Head component
 *
 * @param schema - Schema.org schema object
 * @returns HTML script tag with JSON-LD content
 *
 * @example
 * ```tsx
 * // In a Next.js component:
 * import { Head } from 'next/document';
 *
 * export default function MyPage() {
 *   const schema = generateTeamSchema({ ... });
 *   return (
 *     <Head>
 *       <script
 *         type="application/ld+json"
 *         dangerouslySetInnerHTML={{ __html: jsonLdScript(schema) }}
 *       />
 *     </Head>
 *   );
 * }
 * ```
 */
export function jsonLdScript(schema: Record<string, unknown>): string {
  return JSON.stringify(schema, null, 2);
}

/**
 * Combine multiple schemas into a single script tag
 * Useful for pages with multiple schema types (e.g., breadcrumb + article + organization)
 *
 * @param schemas - Variable number of schema objects
 * @returns Array of schemas formatted for JSON-LD @graph structure
 *
 * @example
 * ```tsx
 * const combined = combineSchemas(
 *   breadcrumbSchema,
 *   articleSchema,
 *   organizationSchema
 * );
 *
 * // Render as:
 * <script type="application/ld+json">
 *   {JSON.stringify(combined)}
 * </script>
 * ```
 */
export function combineSchemas(
  ...schemas: Record<string, unknown>[]
): Record<string, unknown> {
  if (schemas.length === 0) {
    return {};
  }

  if (schemas.length === 1) {
    return schemas[0];
  }

  // Multiple schemas: wrap in @graph
  return {
    "@context": "https://schema.org",
    "@graph": schemas,
  };
}

/**
 * Generate a rich snippet for a team rating/ranking
 * Returns an object that can be merged into team schema for additional richness
 *
 * @param teamName - Team name
 * @param rating - Current rating (e.g., 1523)
 * @param rank - Current rank (1-N)
 * @param wins - Season wins
 * @param losses - Season losses
 * @returns Partial schema object for team enrichment
 *
 * @example
 * ```ts
 * const teamSchema = generateTeamSchema({ ... });
 * const ratingEnrichment = generateTeamRatingSnippet(
 *   'Ohio State Buckeyes',
 *   1523,
 *   1,
 *   11,
 *   1
 * );
 * const enriched = { ...teamSchema, ...ratingEnrichment };
 * ```
 */
export function generateTeamRatingSnippet(
  teamName: string,
  rating: number,
  rank: number,
  wins: number,
  losses: number
): Record<string, unknown> {
  return {
    description: `${teamName} - GridRank #${rank} (Rating: ${rating}) with a record of ${wins}-${losses}`,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: (rating / 20).toFixed(1), // Normalize to 0-100 scale
      bestRating: 100,
      worstRating: 0,
      description: `GridRank Rating: ${rating}`,
    },
  };
}

/**
 * Generate structured data for a conference page
 * Combines organization schema with sports league info
 *
 * @param conferenceName - Full conference name (e.g., "Big Ten Conference")
 * @param conferenceSlug - URL slug (e.g., "big-ten")
 * @param level - Division level (FBS, FCS, D2, D3, NAIA)
 * @param teamCount - Number of teams in conference
 * @param logoUrl - Optional conference logo URL
 * @param baseUrl - Base URL (defaults to BASE_URL)
 * @returns Schema object for conference page
 *
 * @example
 * ```ts
 * const schema = generateConferenceSchema(
 *   'Big Ten Conference',
 *   'big-ten',
 *   'FBS',
 *   18,
 *   'https://...'
 * );
 * ```
 */
export function generateConferenceSchema(
  conferenceName: string,
  conferenceSlug: string,
  level: string,
  teamCount: number,
  logoUrl?: string,
  baseUrl: string = BASE_URL
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: conferenceName,
    url: `${baseUrl}/conference/${conferenceSlug}`,
    logo: logoUrl,
    sport: "American Football",
    division: level,
    member: {
      "@type": "Collection",
      numberOfItems: teamCount,
    },
    potentialAction: {
      "@type": "ViewAction",
      target: `${baseUrl}/conference/${conferenceSlug}`,
    },
  };
}

/**
 * Validate if a schema object is properly structured
 * Basic validation for required fields based on schema type
 *
 * @param schema - Schema object to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```ts
 * const schema = generateTeamSchema({ ... });
 * if (validateSchema(schema)) {
 *   console.log('Schema is valid');
 * }
 * ```
 */
export function validateSchema(schema: Record<string, unknown>): boolean {
  // Check required @context and @type
  if (
    !schema["@context"] ||
    typeof schema["@context"] !== "string" ||
    !schema["@type"]
  ) {
    return false;
  }

  // Check for @graph if using combined schemas
  if (schema["@graph"] && !Array.isArray(schema["@graph"])) {
    return false;
  }

  return true;
}

/**
 * Generate a LocalBusiness schema for team stadium/location
 * Useful for stadium directions, contact info
 *
 * @param stadiumName - Name of the stadium
 * @param teamName - Associated team name
 * @param city - City location
 * @param state - State location
 * @param latitude - Latitude coordinate (optional)
 * @param longitude - Longitude coordinate (optional)
 * @returns Schema.org LocalBusiness schema
 *
 * @example
 * ```ts
 * const schema = generateStadiumSchema(
 *   'Ohio Stadium',
 *   'Ohio State Buckeyes',
 *   'Columbus',
 *   'OH',
 *   40.0090,
 *   -83.1099
 * );
 * ```
 */
export function generateStadiumSchema(
  stadiumName: string,
  teamName: string,
  city: string,
  state: string,
  latitude?: number,
  longitude?: number
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${BASE_URL}/stadiums/${stadiumName.toLowerCase().replace(/\s+/g, "-")}`,
    name: stadiumName,
    alternateName: `${teamName} Home Stadium`,
    address: {
      "@type": "PostalAddress",
      addressLocality: city,
      addressRegion: state,
      addressCountry: "US",
    },
    description: `Home stadium for ${teamName}`,
  };

  if (latitude && longitude) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude,
      longitude,
    };
  }

  return schema;
}

/**
 * Generate EventSeries schema for season/schedule
 * Useful for season overview pages
 *
 * @param seasonYear - Season year (e.g., 2025)
 * @param startDate - Season start date (ISO)
 * @param endDate - Season end date (ISO)
 * @param gameCount - Total number of games
 * @param baseUrl - Base URL (defaults to BASE_URL)
 * @returns Schema.org EventSeries schema
 *
 * @example
 * ```ts
 * const schema = generateSeasonSchema(
 *   2025,
 *   '2025-09-01',
 *   '2025-01-15',
 *   15000  // total games across all divisions
 * );
 * ```
 */
export function generateSeasonSchema(
  seasonYear: number,
  startDate: string,
  endDate: string,
  gameCount: number,
  baseUrl: string = BASE_URL
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "EventSeries",
    name: `${seasonYear} College Football Season`,
    description: `Complete schedule and results for the ${seasonYear} college football season across all divisions`,
    startDate,
    endDate,
    url: `${baseUrl}/season/${seasonYear}`,
    event: {
      "@type": "Collection",
      numberOfItems: gameCount,
    },
    organizer: {
      "@type": "Organization",
      name: "NCAA",
    },
  };
}
