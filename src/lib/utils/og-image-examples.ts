/**
 * OG Image Generation Examples
 * Quick reference snippets for generating OG images
 */

import {
  generateDefaultOG,
  generateTeamOG,
  generateRankingsOG,
  generateMatchupOG,
  generateChaosOG,
  generateArticleOG,
  type TeamOGData,
  type RankingsOGData,
  type MatchupOGData,
  type ChaosOGData,
  type ArticleOGData,
} from './og-image';

/**
 * Example 1: Default homepage OG image
 */
export function exampleDefaultOG(): string {
  const svg = generateDefaultOG();
  return svg;
}

/**
 * Example 2: Team page OG (Alabama)
 */
export function exampleTeamOG(): string {
  const data: TeamOGData = {
    teamName: 'Alabama',
    mascot: 'Crimson Tide',
    rating: 1547,
    ratingDeviation: 42,
    rank: 1,
    level: 'FBS',
    conference: 'SEC',
    primaryColor: '#9E1B32',
    record: '12-0',
  };

  return generateTeamOG(data);
}

/**
 * Example 3: Rankings OG (Week 15, 2024)
 */
export function exampleRankingsOG(): string {
  const data: RankingsOGData = {
    week: 15,
    season: 2024,
    topTeams: [
      { rank: 1, name: 'Alabama', rating: 1547, level: 'FBS' },
      { rank: 2, name: 'Ohio State', rating: 1532, level: 'FBS' },
      { rank: 3, name: 'Georgia', rating: 1521, level: 'FBS' },
      { rank: 4, name: 'Texas', rating: 1508, level: 'FBS' },
      { rank: 5, name: 'Notre Dame', rating: 1495, level: 'FBS' },
    ],
  };

  return generateRankingsOG(data);
}

/**
 * Example 4: All-time rankings (no week)
 */
export function exampleAllTimeRankingsOG(): string {
  const data: RankingsOGData = {
    season: 2024,
    topTeams: [
      { rank: 1, name: 'Ohio State', rating: 1567, level: 'FBS' },
      { rank: 2, name: 'Alabama', rating: 1555, level: 'FBS' },
      { rank: 3, name: 'Clemson', rating: 1542, level: 'FBS' },
      { rank: 4, name: 'Georgia', rating: 1536, level: 'FBS' },
      { rank: 5, name: 'LSU', rating: 1521, level: 'FBS' },
    ],
  };

  return generateRankingsOG(data);
}

/**
 * Example 5: Matchup OG (Alabama vs Georgia)
 */
export function exampleMatchupOG(): string {
  const data: MatchupOGData = {
    teamA: {
      name: 'Alabama',
      rating: 1547,
      primaryColor: '#9E1B32',
    },
    teamB: {
      name: 'Georgia',
      rating: 1521,
      primaryColor: '#BA0021',
    },
    winProbA: 0.58,
    spread: 3.5,
    date: 'Saturday, January 13, 2025',
  };

  return generateMatchupOG(data);
}

/**
 * Example 6: Chaos Index game (Kansas vs Texas)
 */
export function exampleChaosOG(): string {
  const data: ChaosOGData = {
    gameTitle: 'Kansas vs Texas',
    chaosScore: 8.7,
    chaosTier: 'LEGENDARY',
    score: '45-42',
    date: 'Saturday, November 9, 2024',
  };

  return generateChaosOG(data);
}

/**
 * Example 7: Another chaos game (UCF vs SMU)
 */
export function exampleChaosTierOG(tier: 'LEGENDARY' | 'EPIC' | 'CHAOS' | 'WEIRD' | 'NORMAL'): string {
  const games: Record<string, ChaosOGData> = {
    LEGENDARY: {
      gameTitle: 'Kansas vs Texas',
      chaosScore: 9.1,
      chaosTier: 'LEGENDARY',
      score: '45-42',
    },
    EPIC: {
      gameTitle: 'Iowa vs Nebraska',
      chaosScore: 7.8,
      chaosTier: 'EPIC',
      score: '33-31',
    },
    CHAOS: {
      gameTitle: 'TCU vs Baylor',
      chaosScore: 6.5,
      chaosTier: 'CHAOS',
      score: '29-28',
    },
    WEIRD: {
      gameTitle: 'Rutgers vs Penn State',
      chaosScore: 4.2,
      chaosTier: 'WEIRD',
      score: '21-17',
    },
    NORMAL: {
      gameTitle: 'Michigan vs Michigan State',
      chaosScore: 1.5,
      chaosTier: 'NORMAL',
      score: '49-0',
    },
  };

  return generateChaosOG(games[tier]);
}

/**
 * Example 8: Article/Stack OG (analysis article)
 */
export function exampleArticleOG(): string {
  const data: ArticleOGData = {
    title: 'The College Football Playoff\'s Biggest Blunders',
    subtitle: 'An analysis of controversial committee decisions',
    date: 'February 24, 2025',
    category: 'Analysis',
  };

  return generateArticleOG(data);
}

/**
 * Example 9: Stack weekly digest OG
 */
export function exampleStackOG(): string {
  const data: ArticleOGData = {
    title: 'The Stack: Week 10 Roundup',
    subtitle: 'Top stories, biggest upsets, and chaos index highlights',
    date: 'November 11, 2024',
    category: 'Digest',
  };

  return generateArticleOG(data);
}

/**
 * Example 10: Dynamic FCS team OG
 */
export function exampleFCSTeamOG(): string {
  const data: TeamOGData = {
    teamName: 'North Dakota State',
    mascot: 'Bison',
    rating: 1287,
    ratingDeviation: 38,
    rank: 52,
    level: 'FCS',
    conference: 'MVFC',
    primaryColor: '#00843D',
    record: '11-1',
  };

  return generateTeamOG(data);
}

/**
 * Example 11: D2 team OG
 */
export function exampleD2TeamOG(): string {
  const data: TeamOGData = {
    teamName: 'Colorado School of Mines',
    rating: 1034,
    ratingDeviation: 45,
    rank: 187,
    level: 'D2',
    conference: 'RMAC',
    primaryColor: '#003366',
  };

  return generateTeamOG(data);
}

/**
 * Example 12: Matchup without spread
 */
export function exampleMatchupNoSpreadOG(): string {
  const data: MatchupOGData = {
    teamA: {
      name: 'Army',
      rating: 1156,
      primaryColor: '#000000',
    },
    teamB: {
      name: 'Navy',
      rating: 1142,
      primaryColor: '#003478',
    },
    winProbA: 0.54,
  };

  return generateMatchupOG(data);
}

/**
 * Export all examples as object for easy access
 */
export const ogExamples = {
  default: exampleDefaultOG,
  team: exampleTeamOG,
  rankings: exampleRankingsOG,
  allTimeRankings: exampleAllTimeRankingsOG,
  matchup: exampleMatchupOG,
  chaos: exampleChaosOG,
  chaosTier: exampleChaosTierOG,
  article: exampleArticleOG,
  stack: exampleStackOG,
  fcsTeam: exampleFCSTeamOG,
  d2Team: exampleD2TeamOG,
  matchupNoSpread: exampleMatchupNoSpreadOG,
};
