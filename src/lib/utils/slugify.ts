/**
 * String utilities for slugs and URL-safe identifiers
 */

/**
 * Convert a string to a URL-safe slug
 * Preserves special characters for team names (e.g., "Texas A&M" -> "texas-am")
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special chars except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
}

/**
 * Convert a team name to a slug with special handling for ampersands
 */
export function teamSlugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and") // Convert & to "and"
    .replace(/[^\w\s-]/g, "") // Remove other special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
}

/**
 * Conference-specific slug mapping
 * Some conferences have non-standard abbreviations
 */
export const CONFERENCE_SLUG_OVERRIDES: Record<string, string> = {
  "Big 12": "big-12",
  "Big Ten": "big-ten",
  "Mid-American": "mac",
  "American Athletic": "aac",
  "Conference USA": "cusa",
  "Mountain West": "mwc",
  "Pac-12": "pac-12",
  "SEC": "sec",
  "ACC": "acc",
  "FBS Independents": "independent",
  "FCS Independents": "independent",
};

/**
 * Get a conference slug, using overrides if available
 */
export function conferenceSlugify(name: string): string {
  const override = CONFERENCE_SLUG_OVERRIDES[name];
  if (override) return override;
  return slugify(name);
}
