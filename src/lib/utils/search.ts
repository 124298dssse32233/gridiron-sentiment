/**
 * Client-side fuzzy search engine for Gridiron Intel teams.
 *
 * Handles 1,200+ teams with intelligent multi-signal matching:
 * - Exact matches (name, abbreviation)
 * - Starts-with matching
 * - Word-boundary matching
 * - Fuzzy matching with Levenshtein distance
 * - Conference and mascot matching
 * - Common aliases ("Bama", "tOSU", "Ducks", etc.)
 *
 * Uses weighted scoring to rank results by relevance.
 */

import type { Level } from "@/types/team";

/**
 * Minimal team data needed for search indexing.
 */
export interface SearchableTeam {
  id: string | number;
  name: string;
  abbreviation?: string | null;
  mascot?: string | null;
  conference?: string | null;
  level: Level;
  slug: string;
  aliases?: string[];
}

/**
 * Pre-computed search index for fast lookups.
 */
export interface SearchIndex {
  teams: SearchableTeam[];
  trigrams: Map<string, Set<number>>;
  prefixes: Map<string, Set<number>>;
  commonAliases: Map<string, number>; // alias → team index
}

/**
 * Search result with score and match metadata.
 */
export interface SearchResult {
  team: SearchableTeam;
  score: number;
  matchType:
    | "exact"
    | "starts-with"
    | "abbreviation"
    | "word-boundary"
    | "contains"
    | "fuzzy"
    | "conference"
    | "mascot"
    | "alias";
  highlights: HighlightedText[];
}

/**
 * Text segment with highlighting applied.
 */
export interface HighlightedText {
  text: string;
  highlighted: boolean;
}

/**
 * Search options to customize result filtering and ranking.
 */
export interface SearchOptions {
  /** Maximum results to return (default: 20) */
  limit?: number;
  /** Minimum score threshold to include result (default: 10) */
  minScore?: number;
  /** Filter results by division level */
  levels?: Level[];
  /** Filter results by conference abbreviation */
  conferences?: string[];
  /** Boost results from specific level (adds 15 points) */
  boostLevel?: Level;
}

/**
 * Common team aliases for fuzzy matching.
 * Maps common nicknames/abbreviations to team names.
 */
const COMMON_ALIASES: Record<string, string[]> = {
  Alabama: ["bama", "tide"],
  "Ohio State": ["osu", "tosU", "bucks"],
  Oklahoma: ["ou", "sooners"],
  "Southern California": ["usc", "trojans"],
  "Louisiana State": ["lsu"],
  Georgia: ["uga", "ga", "dawgs", "bulldogs"],
  Texas: ["ut", "longhorns"],
  "Texas A&M": ["a&m", "tamu", "aggies"],
  Clemson: ["clemson", "tigers"],
  "Florida State": ["fsu", "noles"],
  Florida: ["uf", "gators"],
  Arkansas: ["hogs", "razorbacks"],
  Washington: ["uw", "dawgs", "huskies"],
  Oregon: ["ducks", "oregon"],
  Tennessee: ["vols", "tennessee"],
  "North Carolina": ["tar heels", "unc", "heels"],
  Duke: ["blue devils"],
  "North Carolina State": ["nc state", "wolfpack"],
  "Virginia Tech": ["vt", "hokies"],
  Michigan: ["umich", "wolverines"],
  "Michigan State": ["msu", "spartans"],
  Penn: ["upenn", "quakers"],
  Yale: ["bulldogs"],
  Harvard: ["crimson"],
  Auburn: ["tigers", "aubs"],
  "Mississippi State": ["bulldogs", "msstate"],
  Mississippi: ["ole miss", "rebels"],
  "South Carolina": ["gamecocks"],
  Missouri: ["mizzou", "tigers"],
  Kentucky: ["wildcats"],
  "North Dakota State": ["ndsu", "bison"],
  "James Madison": ["dukes"],
  Montana: ["grizzlies"],
};

/**
 * Calculate Levenshtein distance between two strings.
 * Used for fuzzy matching with misspellings.
 */
function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const matrix: number[][] = Array.from({ length: bLen + 1 }, () =>
    Array.from({ length: aLen + 1 }, () => 0)
  );

  for (let i = 0; i <= aLen; i++) matrix[0][i] = i;
  for (let j = 0; j <= bLen; j++) matrix[j][0] = j;

  for (let j = 1; j <= bLen; j++) {
    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }

  return matrix[bLen][aLen];
}

/**
 * Generate all trigrams from a string (for fuzzy indexing).
 */
function getTrigrams(text: string): Set<string> {
  const trigrams = new Set<string>();
  const normalized = text.toLowerCase();

  for (let i = 0; i <= normalized.length - 3; i++) {
    trigrams.add(normalized.substring(i, i + 3));
  }

  return trigrams;
}

/**
 * Generate all word-start prefixes from a string.
 */
function getPrefixes(text: string): Set<string> {
  const prefixes = new Set<string>();
  const normalized = text.toLowerCase();
  const words = normalized.split(/[\s\-&]+/);

  words.forEach((word) => {
    if (word.length > 0) {
      for (let i = 1; i <= Math.min(word.length, 3); i++) {
        prefixes.add(word.substring(0, i));
      }
    }
  });

  return prefixes;
}

/**
 * Build a search index from an array of teams.
 * Call once at startup, then reuse the index for all searches.
 *
 * @param teams - Array of searchable teams
 * @returns Optimized search index
 */
export function buildSearchIndex(teams: SearchableTeam[]): SearchIndex {
  const trigrams = new Map<string, Set<number>>();
  const prefixes = new Map<string, Set<number>>();
  const commonAliases = new Map<string, number>();

  teams.forEach((team, index) => {
    // Index team name trigrams and prefixes
    const nameTrigrams = getTrigrams(team.name);
    const namePrefixes = getPrefixes(team.name);

    nameTrigrams.forEach((trigram) => {
      if (!trigrams.has(trigram)) trigrams.set(trigram, new Set());
      trigrams.get(trigram)!.add(index);
    });

    namePrefixes.forEach((prefix) => {
      if (!prefixes.has(prefix)) prefixes.set(prefix, new Set());
      prefixes.get(prefix)!.add(index);
    });

    // Index abbreviation
    if (team.abbreviation) {
      const abbr = team.abbreviation.toLowerCase();
      if (!prefixes.has(abbr)) prefixes.set(abbr, new Set());
      prefixes.get(abbr)!.add(index);
    }

    // Index mascot
    if (team.mascot) {
      const mascotTrigrams = getTrigrams(team.mascot);
      mascotTrigrams.forEach((trigram) => {
        if (!trigrams.has(trigram)) trigrams.set(trigram, new Set());
        trigrams.get(trigram)!.add(index);
      });
    }

    // Index custom aliases
    if (team.aliases) {
      team.aliases.forEach((alias) => {
        const lowerAlias = alias.toLowerCase();
        if (!commonAliases.has(lowerAlias)) {
          commonAliases.set(lowerAlias, index);
        }
      });
    }
  });

  // Build common aliases from the COMMON_ALIASES map
  teams.forEach((team, index) => {
    const aliases = COMMON_ALIASES[team.name] || [];
    aliases.forEach((alias) => {
      if (!commonAliases.has(alias)) {
        commonAliases.set(alias, index);
      }
    });
  });

  return {
    teams,
    trigrams,
    prefixes,
    commonAliases,
  };
}

/**
 * Calculate composite match score for a team against a query.
 */
function calculateMatchScore(
  team: SearchableTeam,
  query: string,
  boostLevel?: Level
): {
  score: number;
  matchType: SearchResult["matchType"];
} {
  const q = query.toLowerCase();
  const name = team.name.toLowerCase();
  const abbr = team.abbreviation?.toLowerCase() || "";
  const mascot = team.mascot?.toLowerCase() || "";
  const conf = team.conference?.toLowerCase() || "";

  let bestScore = 0;
  let bestMatchType: SearchResult["matchType"] = "contains";

  // 1. Exact match on name or abbreviation (score: 100)
  if (name === q || abbr === q) {
    bestScore = 100;
    bestMatchType = "exact";
  }
  // 2. Exact match on mascot (score: 90)
  else if (mascot === q) {
    bestScore = 90;
    bestMatchType = "mascot";
  }
  // 3. Starts-with on name (score: 80)
  else if (name.startsWith(q)) {
    bestScore = 80;
    bestMatchType = "starts-with";
  }
  // 4. Starts-with on abbreviation (score: 75)
  else if (abbr.startsWith(q)) {
    bestScore = 75;
    bestMatchType = "abbreviation";
  }
  // 5. Word-boundary match (score: 60)
  else {
    const words = name.split(/[\s\-&]+/);
    for (const word of words) {
      if (word.startsWith(q)) {
        bestScore = 60;
        bestMatchType = "word-boundary";
        break;
      }
    }
  }

  // If no word-boundary match, try other strategies
  if (bestScore < 60) {
    // 6. Contains match (score: 40)
    if (name.includes(q) || abbr.includes(q) || mascot.includes(q)) {
      bestScore = 40;
      bestMatchType = "contains";
    }
    // 7. Fuzzy match with Levenshtein distance (score: 20-35)
    else {
      const maxDistance = Math.max(2, Math.floor(q.length / 3));
      const nameDist = levenshteinDistance(name, q);
      const abbrDist = levenshteinDistance(abbr, q);
      const mascotDist = levenshteinDistance(mascot, q);

      const minDist = Math.min(nameDist, abbrDist, mascotDist);

      if (minDist <= maxDistance) {
        // Score inversely proportional to distance
        bestScore = Math.max(20, 35 - minDist * 5);
        bestMatchType = "fuzzy";
      }
    }
  }

  // 8. Conference match (score: 30)
  if (bestScore < 30 && conf === q) {
    bestScore = 30;
    bestMatchType = "conference";
  }

  // Apply boost for level if specified
  if (boostLevel && team.level === boostLevel) {
    bestScore += 15;
  }

  return { score: bestScore, matchType: bestMatchType };
}

/**
 * Perform fuzzy search on the index.
 *
 * @param index - Pre-built search index
 * @param query - Search query string
 * @param options - Search configuration
 * @returns Array of matching teams, sorted by score (highest first)
 */
export function search(
  index: SearchIndex,
  query: string,
  options?: SearchOptions
): SearchResult[] {
  const limit = options?.limit ?? 20;
  const minScore = options?.minScore ?? 10;
  const levelFilter = options?.levels;
  const conferenceFilter = options?.conferences;
  const boostLevel = options?.boostLevel;

  if (!query || query.trim().length === 0) {
    return [];
  }

  const q = query.toLowerCase().trim();
  const results = new Map<number, SearchResult>();

  // 1. Check common aliases first (highest priority)
  if (index.commonAliases.has(q)) {
    const teamIndex = index.commonAliases.get(q)!;
    const team = index.teams[teamIndex];
    const { score, matchType } = calculateMatchScore(
      team,
      query,
      boostLevel
    );

    if (score >= minScore) {
      results.set(teamIndex, {
        team,
        score: score + 20, // Boost alias matches
        matchType: "alias",
        highlights: highlightMatch(team.name, query),
      });
    }
  }

  // 2. Gather candidate teams using trigrams and prefixes
  const candidates = new Set<number>();

  // Trigram-based candidates (fuzzy)
  const queryTrigrams = getTrigrams(q);
  if (queryTrigrams.size > 0) {
    let trigramCandidates: Set<number> | null = null;

    queryTrigrams.forEach((trigram) => {
      const trigramTeams = index.trigrams.get(trigram) || new Set();
      if (trigramCandidates === null) {
        trigramCandidates = new Set(trigramTeams);
      } else {
        trigramCandidates = new Set(
          [...trigramCandidates].filter((i) => trigramTeams.has(i))
        );
      }
    });

    trigramCandidates?.forEach((i) => candidates.add(i));
  }

  // Prefix-based candidates (exact prefix match)
  const prefixCandidates = index.prefixes.get(q);
  prefixCandidates?.forEach((i) => candidates.add(i));

  // Also check all teams (for fallback scoring)
  if (candidates.size === 0) {
    index.teams.forEach((_, i) => candidates.add(i));
  }

  // 3. Score all candidates
  candidates.forEach((teamIndex) => {
    if (results.has(teamIndex)) return; // Already scored via alias

    const team = index.teams[teamIndex];

    // Apply level/conference filters
    if (levelFilter && !levelFilter.includes(team.level)) {
      return;
    }
    if (
      conferenceFilter &&
      (!team.conference ||
        !conferenceFilter.includes(team.conference.toUpperCase()))
    ) {
      return;
    }

    const { score, matchType } = calculateMatchScore(
      team,
      query,
      boostLevel
    );

    if (score >= minScore) {
      results.set(teamIndex, {
        team,
        score,
        matchType,
        highlights: highlightMatch(team.name, query),
      });
    }
  });

  // 4. Sort by score descending and return top results
  return Array.from(results.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Highlight matching portions of text for display.
 *
 * @param text - Text to highlight
 * @param query - Search query to match
 * @returns Array of highlighted text segments
 */
export function highlightMatch(text: string, query: string): HighlightedText[] {
  if (!query || query.length === 0) {
    return [{ text, highlighted: false }];
  }

  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const result: HighlightedText[] = [];

  let lastIndex = 0;
  let matchIndex = t.indexOf(q);

  while (matchIndex !== -1) {
    // Add unhighlighted text before match
    if (matchIndex > lastIndex) {
      result.push({
        text: text.substring(lastIndex, matchIndex),
        highlighted: false,
      });
    }

    // Add highlighted match
    result.push({
      text: text.substring(matchIndex, matchIndex + q.length),
      highlighted: true,
    });

    lastIndex = matchIndex + q.length;
    matchIndex = t.indexOf(q, lastIndex);
  }

  // Add remaining unhighlighted text
  if (lastIndex < text.length) {
    result.push({
      text: text.substring(lastIndex),
      highlighted: false,
    });
  }

  return result.length === 0 ? [{ text, highlighted: false }] : result;
}

/**
 * Quick check if a query might match a team.
 * Use this for filtering while typing (before full search).
 *
 * @param team - Team to check
 * @param query - Search query
 * @returns True if team might match this query
 */
export function quickMatch(team: SearchableTeam, query: string): boolean {
  if (!query || query.length === 0) return true;

  const q = query.toLowerCase();
  const name = team.name.toLowerCase();
  const abbr = team.abbreviation?.toLowerCase() || "";
  const mascot = team.mascot?.toLowerCase() || "";
  const conf = team.conference?.toLowerCase() || "";

  return (
    name.includes(q) ||
    abbr.includes(q) ||
    mascot.includes(q) ||
    conf.includes(q)
  );
}
