/**
 * Award Definitions for Gridiron Intel Awards Tracker
 *
 * Defines the 10 major college football awards tracked by the platform,
 * including eligibility criteria and historical context.
 */

export interface AwardDefinition {
  id: string;
  name: string;
  fullName: string;
  description: string;
  eligiblePositions: string[];
  selectionCriteria: string;
  firstAwarded: number;
  namedAfter: string;
  /** Weight factors for prediction model */
  predictionWeights: {
    statistical: number;
    teamSuccess: number;
    narrative: number;
    historical: number;
  };
}

export const AWARDS: AwardDefinition[] = [
  {
    id: "heisman",
    name: "Heisman Trophy",
    fullName: "Heisman Memorial Trophy",
    description:
      "The most outstanding player in college football. The most prestigious individual award in American sports.",
    eligiblePositions: ["QB", "RB", "WR", "TE", "LB", "DB", "DL", "EDGE", "KR", "PR"],
    selectionCriteria:
      "Voted on by media members (one per region) plus former winners. Heavily favors QBs and offensive skill players on winning teams.",
    firstAwarded: 1935,
    namedAfter: "John Heisman, legendary Georgia Tech coach and early advocate for the forward pass",
    predictionWeights: {
      statistical: 0.35,
      teamSuccess: 0.30,
      narrative: 0.20,
      historical: 0.15,
    },
  },
  {
    id: "maxwell",
    name: "Maxwell Award",
    fullName: "Maxwell Award",
    description:
      "Best all-around player in college football. Often mirrors the Heisman but occasionally diverges.",
    eligiblePositions: ["QB", "RB", "WR", "TE", "LB", "DB", "DL", "EDGE"],
    selectionCriteria:
      "Selected by media panel and coaches. Tends to favor similar profiles as the Heisman.",
    firstAwarded: 1937,
    namedAfter: "Robert 'Tiny' Maxwell, early 20th century football player and sportswriter",
    predictionWeights: {
      statistical: 0.40,
      teamSuccess: 0.25,
      narrative: 0.20,
      historical: 0.15,
    },
  },
  {
    id: "biletnikoff",
    name: "Biletnikoff Award",
    fullName: "Fred Biletnikoff Award",
    description:
      "Best receiver in college football. Includes wide receivers, tight ends, and slot receivers.",
    eligiblePositions: ["WR", "TE"],
    selectionCriteria:
      "Voted on by the Tallahassee Quarterback Club. Emphasizes receiving yards, touchdowns, and big-play ability.",
    firstAwarded: 1994,
    namedAfter: "Fred Biletnikoff, Florida State and Oakland Raiders legend",
    predictionWeights: {
      statistical: 0.50,
      teamSuccess: 0.15,
      narrative: 0.20,
      historical: 0.15,
    },
  },
  {
    id: "doak-walker",
    name: "Doak Walker Award",
    fullName: "Doak Walker Award",
    description:
      "Best running back in college football. Named after the SMU legend.",
    eligiblePositions: ["RB"],
    selectionCriteria:
      "National committee vote. Emphasizes rushing yards, touchdowns, all-purpose yardage, and team contribution.",
    firstAwarded: 1990,
    namedAfter: "Doak Walker, three-time All-American at SMU and 1948 Heisman winner",
    predictionWeights: {
      statistical: 0.50,
      teamSuccess: 0.15,
      narrative: 0.20,
      historical: 0.15,
    },
  },
  {
    id: "davey-obrien",
    name: "Davey O'Brien Award",
    fullName: "Davey O'Brien National Quarterback Award",
    description:
      "Best quarterback in college football. The premier QB-specific award.",
    eligiblePositions: ["QB"],
    selectionCriteria:
      "Selected by a national committee. Passing efficiency, touchdown-to-interception ratio, team wins, and leadership.",
    firstAwarded: 1981,
    namedAfter: "Davey O'Brien, TCU quarterback who won the 1938 Heisman",
    predictionWeights: {
      statistical: 0.45,
      teamSuccess: 0.25,
      narrative: 0.15,
      historical: 0.15,
    },
  },
  {
    id: "outland",
    name: "Outland Trophy",
    fullName: "Outland Trophy",
    description:
      "Best interior lineman in college football. Can go to offensive or defensive linemen.",
    eligiblePositions: ["OL", "DL", "C", "OG", "OT", "DT", "NT"],
    selectionCriteria:
      "Selected by the Football Writers Association of America. Consistency, dominance at the point of attack, and team impact.",
    firstAwarded: 1946,
    namedAfter: "John Outland, early football innovator at Penn and Kansas",
    predictionWeights: {
      statistical: 0.35,
      teamSuccess: 0.25,
      narrative: 0.20,
      historical: 0.20,
    },
  },
  {
    id: "nagurski",
    name: "Nagurski Trophy",
    fullName: "Bronko Nagurski Trophy",
    description:
      "Best defensive player in college football. The top defensive award.",
    eligiblePositions: ["LB", "DB", "DL", "EDGE", "S", "CB"],
    selectionCriteria:
      "FWAA vote. Tackles, sacks, interceptions, forced turnovers, and overall defensive impact.",
    firstAwarded: 1993,
    namedAfter: "Bronko Nagurski, Minnesota legend and NFL Hall of Famer",
    predictionWeights: {
      statistical: 0.45,
      teamSuccess: 0.20,
      narrative: 0.20,
      historical: 0.15,
    },
  },
  {
    id: "butkus",
    name: "Butkus Award",
    fullName: "Butkus Award",
    description:
      "Best linebacker in college football (also given at NFL and high school levels).",
    eligiblePositions: ["LB", "ILB", "OLB", "EDGE"],
    selectionCriteria:
      "Selected by the Butkus Foundation committee. Tackles, tackles for loss, QB pressures, coverage ability, and leadership.",
    firstAwarded: 1985,
    namedAfter: "Dick Butkus, Illinois and Chicago Bears legend",
    predictionWeights: {
      statistical: 0.45,
      teamSuccess: 0.15,
      narrative: 0.25,
      historical: 0.15,
    },
  },
  {
    id: "thorpe",
    name: "Jim Thorpe Award",
    fullName: "Jim Thorpe Award",
    description:
      "Best defensive back in college football. Covers corners, safeties, and nickel backs.",
    eligiblePositions: ["CB", "S", "DB", "FS", "SS"],
    selectionCriteria:
      "Selected by the Jim Thorpe Association. Interceptions, pass breakups, tackles, and coverage grade.",
    firstAwarded: 1986,
    namedAfter: "Jim Thorpe, multi-sport legend and Olympic gold medalist",
    predictionWeights: {
      statistical: 0.50,
      teamSuccess: 0.15,
      narrative: 0.20,
      historical: 0.15,
    },
  },
  {
    id: "rimington",
    name: "Rimington Trophy",
    fullName: "Dave Rimington Trophy",
    description:
      "Best center in college football. The only major award for a single offensive line position.",
    eligiblePositions: ["C"],
    selectionCriteria:
      "Voted on by three national media organizations. Snap consistency, blocking grade, leadership, and team rushing success.",
    firstAwarded: 2000,
    namedAfter: "Dave Rimington, two-time Outland winner at Nebraska (1981-82)",
    predictionWeights: {
      statistical: 0.35,
      teamSuccess: 0.25,
      narrative: 0.20,
      historical: 0.20,
    },
  },
];

/**
 * Get award definition by ID
 */
export function getAward(id: string): AwardDefinition | undefined {
  return AWARDS.find((a) => a.id === id);
}

/**
 * Get all awards a position is eligible for
 */
export function getAwardsForPosition(position: string): AwardDefinition[] {
  return AWARDS.filter((a) => a.eligiblePositions.includes(position));
}
