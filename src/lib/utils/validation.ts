/**
 * Zod Validation Schemas
 * Centralized validation schemas for all API inputs, query parameters, and request bodies.
 * Uses strict TypeScript with no `any` types.
 */

import { z } from "zod";

/**
 * Common reusable schemas for cross-API validation
 */

/** Season year (2014-2030) */
export const SeasonSchema = z.number().int().min(2014).max(2030);

/** Week number (0-20 including postseason) */
export const WeekSchema = z.number().int().min(0).max(20);

/** College football division level */
export const LevelSchema = z.enum(["FBS", "FCS", "D2", "D3", "NAIA"]);

/** Pagination page number (1-indexed) */
export const PageSchema = z.number().int().min(1).default(1);

/** Pagination page size (1-200 items) */
export const PageSizeSchema = z.number().int().min(1).max(200).default(50);

/** URL-safe slug for team/conference routes */
export const SlugSchema = z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, "Invalid slug format");

/** Database primary key (numeric) */
export const TeamIdSchema = z.number().int().positive();

/** UUID identifier */
export const UUIDSchema = z.string().uuid();

/** Sort order direction */
export const SortOrderSchema = z.enum(["asc", "desc"]).default("desc");

/** Confidence interval (0-1 probability) */
export const ProbabilitySchema = z.number().min(0).max(1);

/**
 * Rankings API Validation
 * GET /api/rankings
 */
export const RankingsQuerySchema = z.object({
  season: SeasonSchema,
  week: WeekSchema.optional(),
  level: LevelSchema.optional(),
  conference: z.string().max(100).optional(),
  search: z.string().max(100).optional(),
  page: PageSchema,
  pageSize: PageSizeSchema,
  sortBy: z.enum(["rating", "rank", "change", "name", "wins"]).default("rank"),
  sortOrder: SortOrderSchema,
});

export type RankingsQuery = z.infer<typeof RankingsQuerySchema>;

/**
 * Team API Validation
 * GET /api/teams/[slug]
 */
export const TeamQuerySchema = z.object({
  slug: SlugSchema,
  season: SeasonSchema.optional(),
});

export type TeamQuery = z.infer<typeof TeamQuerySchema>;

/**
 * Matchup Machine API Validation
 * POST /api/matchup
 */
export const MatchupQuerySchema = z.object({
  teamAId: TeamIdSchema,
  teamBId: TeamIdSchema,
  simulations: z.number().int().min(1000).max(100000).default(10000),
  model: z.enum(["poisson", "normal"]).default("poisson"),
  neutralSite: z.boolean().default(false),
  week: WeekSchema.optional(),
  season: SeasonSchema.optional(),
});

export type MatchupQuery = z.infer<typeof MatchupQuerySchema>;

/**
 * Predictions API Validation
 * GET /api/predictions
 */
export const PredictionsQuerySchema = z.object({
  season: SeasonSchema,
  week: WeekSchema,
  level: LevelSchema.optional(),
  conference: z.string().max(100).optional(),
  page: PageSchema,
  pageSize: PageSizeSchema,
});

export type PredictionsQuery = z.infer<typeof PredictionsQuerySchema>;

/**
 * Chaos Index API Validation
 * GET /api/chaos
 */
export const ChaosQuerySchema = z.object({
  season: SeasonSchema,
  week: WeekSchema.optional(),
  limit: z.number().int().min(1).max(100).default(25),
  minScore: z.number().min(0).max(100).optional(),
  sortBy: z.enum(["chaos", "date", "excitement"]).default("chaos"),
});

export type ChaosQuery = z.infer<typeof ChaosQuerySchema>;

/**
 * Coach Intelligence API Validation
 * GET /api/coaches
 */
export const CoachQuerySchema = z.object({
  season: SeasonSchema,
  coachId: z.string().max(100).optional(),
  teamSlug: SlugSchema.optional(),
  minGames: z.number().int().min(1).default(3),
  limit: z.number().int().min(1).max(100).default(50),
});

export type CoachQuery = z.infer<typeof CoachQuerySchema>;

/**
 * Search API Validation
 * GET /api/search
 */
export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  type: z.enum(["team", "coach", "conference", "all"]).default("all"),
  level: LevelSchema.optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

/**
 * What If Engine API Validation
 * POST /api/whatif
 */
export const WhatIfGameOverrideSchema = z.object({
  gameId: z.number().int().positive(),
  homeScore: z.number().int().min(0).max(200),
  awayScore: z.number().int().min(0).max(200),
});

export const WhatIfQuerySchema = z.object({
  season: SeasonSchema,
  week: WeekSchema,
  overrides: z.array(WhatIfGameOverrideSchema).min(1).max(20),
  recalculateRanks: z.boolean().default(true),
});

export type WhatIfQuery = z.infer<typeof WhatIfQuerySchema>;

/**
 * Conference API Validation
 * GET /api/conference/[slug]
 */
export const ConferenceQuerySchema = z.object({
  slug: SlugSchema,
  season: SeasonSchema.optional(),
});

export type ConferenceQuery = z.infer<typeof ConferenceQuerySchema>;

/**
 * The Lab (Outliers) API Validation
 * GET /api/lab
 */
export const LabQuerySchema = z.object({
  season: SeasonSchema,
  type: z.enum(["player", "team", "all"]).default("all"),
  limit: z.number().int().min(1).max(100).default(30),
  zscore: z.number().min(1).max(5).default(2.5),
});

export type LabQuery = z.infer<typeof LabQuerySchema>;

/**
 * Awards Tracker API Validation
 * GET /api/awards
 */
export const AwardsQuerySchema = z.object({
  season: SeasonSchema,
  award: z.enum([
    "heisman",
    "butkus",
    "bednarik",
    "nagurski",
    "outland",
    "biletnikoff",
    "davey_obrien",
    "sammy_baugh",
    "chuck_bednarik",
    "maxwell",
  ]).optional(),
  limit: z.number().int().min(1).max(100).default(25),
});

export type AwardsQuery = z.infer<typeof AwardsQuerySchema>;

/**
 * Gauntlet (SOS) API Validation
 * GET /api/gauntlet
 */
export const GauntletQuerySchema = z.object({
  season: SeasonSchema,
  week: WeekSchema.optional(),
  level: LevelSchema.optional(),
  includeRemaining: z.boolean().default(true),
});

export type GauntletQuery = z.infer<typeof GauntletQuerySchema>;

/**
 * Gameday Dashboard API Validation
 * GET /api/gameday
 */
export const GamedayQuerySchema = z.object({
  season: SeasonSchema,
  week: WeekSchema,
  level: LevelSchema.optional(),
  conference: z.string().max(100).optional(),
});

export type GamedayQuery = z.infer<typeof GamedayQuerySchema>;

/**
 * The Stack (Weekly Digest) API Validation
 * GET /api/stack
 */
export const StackQuerySchema = z.object({
  season: SeasonSchema,
  week: WeekSchema,
  level: LevelSchema.optional(),
});

export type StackQuery = z.infer<typeof StackQuerySchema>;

/**
 * Rivalry API Validation
 * GET /api/rivalry/[slug]
 */
export const RivalryQuerySchema = z.object({
  slug: SlugSchema,
  season: SeasonSchema.optional(),
  includeHistory: z.boolean().default(true),
});

export type RivalryQuery = z.infer<typeof RivalryQuerySchema>;

/**
 * Roster Intelligence API Validation
 * GET /api/roster
 */
export const RosterQuerySchema = z.object({
  season: SeasonSchema,
  teamSlug: SlugSchema.optional(),
  level: LevelSchema.optional(),
  sortBy: z.enum(["talent", "recruiting", "returning"]).default("talent"),
});

export type RosterQuery = z.infer<typeof RosterQuerySchema>;

/**
 * Helper: Parse and validate search parameters from URL
 * Handles string-to-appropriate-type coercion
 * @throws ZodError if validation fails
 * @example
 * const query = parseSearchParams(RankingsQuerySchema, Object.fromEntries(url.searchParams))
 */
export function parseSearchParams<T extends z.ZodSchema>(
  schema: T,
  params: Record<string, string | string[] | undefined>
): z.infer<T> {
  const coercedParams: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;

    // Handle array values (take first if multiple)
    const val = Array.isArray(value) ? value[0] : value;

    // Coerce to appropriate types
    if (val === "true") coercedParams[key] = true;
    else if (val === "false") coercedParams[key] = false;
    else if (!isNaN(Number(val)) && val !== "") coercedParams[key] = Number(val);
    else coercedParams[key] = val;
  }

  return schema.parse(coercedParams);
}

/**
 * Helper: Validate request body (JSON)
 * @throws ZodError if validation fails
 * @example
 * const matchup = parseBody(MatchupQuerySchema, await req.json())
 */
export function parseBody<T extends z.ZodSchema>(schema: T, body: unknown): z.infer<T> {
  return schema.parse(body);
}

/**
 * Helper: Create standardized error response from Zod validation error
 * Returns HTTP 400 with detailed error information
 * @example
 * try {
 *   const query = parseSearchParams(RankingsQuerySchema, params)
 * } catch (error) {
 *   return validationErrorResponse(error)
 * }
 */
export function validationErrorResponse(error: z.ZodError): Response {
  const formatted = error.format();

  return new Response(
    JSON.stringify({
      error: "Validation failed",
      details: formatted,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Helper: Safely parse with fallback default
 * Returns default value if validation fails (logs error in dev)
 * @example
 * const query = safeParse(RankingsQuerySchema, params, { season: 2024, page: 1, pageSize: 50, sortBy: "rank", sortOrder: "desc" })
 */
export function safeParse<T extends z.ZodSchema>(
  schema: T,
  data: unknown,
  defaultValue: z.infer<T>
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Validation failed, using defaults:", result.error.format());
    }
    return defaultValue;
  }
  return result.data;
}

/**
 * Helper: Validate pagination parameters
 * Returns standardized pagination object with bounds checks
 */
export const PaginationSchema = z.object({
  page: PageSchema,
  pageSize: PageSizeSchema,
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Helper: Extract pagination from query
 */
export function extractPagination(params: Record<string, string | string[] | undefined>): Pagination {
  const coerced = {
    page: params.page ? Number(params.page) : 1,
    pageSize: params.pageSize ? Number(params.pageSize) : 50,
  };
  return PaginationSchema.parse(coerced);
}
