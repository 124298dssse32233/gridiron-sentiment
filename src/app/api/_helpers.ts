/**
 * Shared API Helpers
 * Utilities used across all API route handlers
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSeason, getCurrentSeasonWeek } from "@/lib/utils/constants";

/**
 * Standard error response
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standard success response
 */
export function successResponse<T>(
  data: T,
  meta?: Record<string, unknown>
) {
  const response: Record<string, unknown> = { ...data };
  if (meta) {
    response.meta = meta;
  }
  return NextResponse.json(response);
}

/**
 * Extract query parameter as string
 */
export function getQueryParam(
  req: NextRequest,
  key: string,
  defaultValue: string
): string {
  return req.nextUrl.searchParams.get(key) ?? defaultValue;
}

/**
 * Extract query parameter as integer
 */
export function getQueryParamInt(
  req: NextRequest,
  key: string,
  defaultValue: number
): number {
  const val = req.nextUrl.searchParams.get(key);
  return val ? parseInt(val, 10) || defaultValue : defaultValue;
}

/**
 * Extract query parameter as boolean
 */
export function getQueryParamBool(
  req: NextRequest,
  key: string,
  defaultValue: boolean = false
): boolean {
  const val = req.nextUrl.searchParams.get(key);
  if (val === null) return defaultValue;
  return val === "true" || val === "1" || val === "yes";
}

/**
 * Get current season and latest week.
 *
 * A college football season spans Aug of year N through Jan of year N+1.
 * The season is identified by the fall year (e.g., "2025 season" = Aug 2025 - Jan 2026).
 * In January, the current season is still the previous year's season.
 */
export function getCurrentSeasonAndWeek(): {
  season: number;
  week: number;
} {
  const season = getCurrentSeason();
  const week = getCurrentSeasonWeek();

  return { season, week: Math.max(1, week) };
}

/**
 * Standard ISR/cache control headers
 */
export function getCacheHeaders(ttl: number = 3600) {
  return {
    "Cache-Control": `s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
    "Content-Type": "application/json",
  };
}

/**
 * Type-safe JSON body parsing with error handling
 */
export async function parseJSON<T>(
  req: NextRequest
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await req.json();
    return { data: data as T, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return { data: null, error: message };
  }
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  obj: Record<string, unknown>,
  fields: string[]
): { valid: true } | { valid: false; missing: string[] } {
  const missing = fields.filter((field) => !obj[field]);
  if (missing.length > 0) {
    return { valid: false, missing };
  }
  return { valid: true };
}
