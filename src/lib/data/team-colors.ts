/**
 * Team Color Database
 * Primary and secondary colors for all FBS teams (and major FCS programs)
 * Colors are hex codes for use in UI
 */

export interface TeamColors {
  primary: string;
  secondary: string;
  accent?: string;
}

export const TEAM_COLORS: Record<string, TeamColors> = {
  // SEC
  "Alabama": { primary: "#9E1B32", secondary: "#A8A8A8", accent: "#FFFFFF" },
  "Arkansas": { primary: "#9D2235", secondary: "#FFFFFF" },
  "Auburn": { primary: "#0C2340", secondary: "#E87722", accent: "#FFFFFF" },
  "Florida": { primary: "#0021A5", secondary: "#FA4616", accent: "#FFFFFF" },
  "Georgia": { primary: "#BA0C2F", secondary: "#000000", accent: "#FFFFFF" },
  "Kentucky": { primary: "#0033A0", secondary: "#FFFFFF" },
  "LSU": { primary: "#461D7C", secondary: "#FFD700", accent: "#FFFFFF" },
  "Mississippi State": { primary: "#660000", secondary: "#FFFFFF" },
  "Missouri": { primary: "#1A1A1A", secondary: "#F1F1F1", accent: "#000000" },
  "Ole Miss": { primary: "#CE1126", secondary: "#14213D", accent: "#FFFFFF" },
  "South Carolina": { primary: "#73000A", secondary: "#000000" },
  "Tennessee": { primary: "#FF8200", secondary: "#FFFFFF", accent: "#0C2340" },
  "Texas A&M": { primary: "#500000", secondary: "#FFFFFF" },
  "Vanderbilt": { primary: "#000000", secondary: "#FFFFFF" },
  "Oklahoma": { primary: "#841617", secondary: "#000000" },
  "Texas": { primary: "#BF5700", secondary: "#FFFFFF", accent: "#283379" },

  // Big Ten
  "Ohio State": { primary: "#BB0000", secondary: "#999999", accent: "#FFFFFF" },
  "Michigan": { primary: "#00274C", secondary: "#FFCB05", accent: "#FFFFFF" },
  "Penn State": { primary: "#041E42", secondary: "#FFFFFF" },
  "Michigan State": { primary: "#18453B", secondary: "#FFFFFF" },
  "Iowa": { primary: "#FFCD00", secondary: "#000000" },
  "Wisconsin": { primary: "#C5050C", secondary: "#FFFFFF" },
  "Illinois": { primary: "#FF5F05", secondary: "#13294B", accent: "#FFFFFF" },
  "Minnesota": { primary: "#7A0019", secondary: "#FFCC33", accent: "#FFFFFF" },
  "Nebraska": { primary: "#E84034", secondary: "#000000" },
  "Northwestern": { primary: "#4E2A84", secondary: "#FFFFFF" },
  "Purdue": { primary: "#C4930A", secondary: "#000000" },
  "Indiana": { primary: "#990000", secondary: "#FFFFFF" },
  "Maryland": { primary: "#E03A3E", secondary: "#000000", accent: "#FFFFFF" },
  "Rutgers": { primary: "#CC0000", secondary: "#000000" },
  "Oregon": { primary: "#154733", secondary: "#FEE123", accent: "#FFFFFF" },
  "Southern California": { primary: "#990000", secondary: "#FFCC00", accent: "#FFFFFF" },
  "UCLA": { primary: "#2774AE", secondary: "#FFD100", accent: "#FFFFFF" },
  "Washington": { primary: "#4B2E83", secondary: "#B7A57A", accent: "#FFFFFF" },

  // Big 12
  "Arizona": { primary: "#003255", secondary: "#CB4B15", accent: "#FFFFFF" },
  "Arizona State": { primary: "#990033", secondary: "#FFCC00", accent: "#FFFFFF" },
  "Baylor": { primary: "#003015", secondary: "#FDB913", accent: "#FFFFFF" },
  "BYU": { primary: "#002E5D", secondary: "#FFFFFF" },
  "Cincinnati": { primary: "#E00122", secondary: "#000000" },
  "Colorado": { primary: "#CF441A", secondary: "#000000", accent: "#FFD700" },
  "Houston": { primary: "#C6A360", secondary: "#FFFFFF", accent: "#000000" },
  "Iowa State": { primary: "#C8102E", secondary: "#FDB913", accent: "#FFFFFF" },
  "Kansas": { primary: "#0051BA", secondary: "#FFFFFF" },
  "Kansas State": { primary: "#512888", secondary: "#FFFFFF" },
  "Oklahoma State": { primary: "#FF7300", secondary: "#000000" },
  "TCU": { primary: "#4D1979", secondary: "#FFFFFF" },
  "Texas Tech": { primary: "#CC0000", secondary: "#000000" },
  "UCF": { primary: "#BA7C35", secondary: "#000000" },
  "West Virginia": { primary: "#002855", secondary: "#FFC72C", accent: "#FFFFFF" },
  "Utah": { primary: "#CC0000", secondary: "#FFFFFF" },

  // ACC
  "Clemson": { primary: "#CC3300", secondary: "#1E4D2B", accent: "#FFFFFF" },
  "Florida State": { primary: "#782F40", secondary: "#CEB888", accent: "#FFFFFF" },
  "Miami (FL)": { primary: "#F47321", secondary: "#006747", accent: "#FFFFFF" },
  "North Carolina": { primary: "#4B9CD3", secondary: "#FFFFFF", accent: "#13294B" },
  "NC State": { primary: "#CC0000", secondary: "#000000" },
  "Virginia Tech": { primary: "#630031", secondary: "#FF6600", accent: "#FFFFFF" },
  "Duke": { primary: "#003087", secondary: "#003087", accent: "#FFFFFF" },
  "Georgia Tech": { primary: "#B3A369", secondary: "#000003" },
  "Wake Forest": { primary: "#936038", secondary: "#000000" },
  "Louisville": { primary: "#AD0000", secondary: "#FFFFFF" },
  "Virginia": { primary: "#232D4B", secondary: "#F57D7C", accent: "#FFFFFF" },
  "Pitt": { primary: "#003594", secondary: "#FFCB05", accent: "#FFFFFF" },
  "Syracuse": { primary: "#D44500", secondary: "#13294B" },
  "Boston College": { primary: "#7D1226", secondary: "#FFFFFF" },
  "California": { primary: "#C4821E", secondary: "#041E42", accent: "#FFFFFF" },
  "Stanford": { primary: "#8C1515", secondary: "#FFFFFF" },
  "SMU": { primary: "#B20020", secondary: "#FFFFFF" },

  // AAC
  "Memphis": { primary: "#004078", secondary: "#999999", accent: "#FFFFFF" },
  "Tulane": { primary: "#006747", secondary: "#FFFFFF" },
  "North Texas": { primary: "#005738", secondary: "#005738", accent: "#FFFFFF" },
  "UTSA": { primary: "#081C36", secondary: "#F2A900", accent: "#FFFFFF" },
  "Rice": { primary: "#002469", secondary: "#FFFFFF" },
  "Tulsa": { primary: "#081C36", secondary: "#CF142B", accent: "#FFFFFF" },
  "Charlotte": { primary: "#0075A2", secondary: "#AE9158", accent: "#FFFFFF" },
  "East Carolina": { primary: "#592A75", secondary: "#FFFFFF" },
  "Florida Atlantic": { primary: "#C4082E", secondary: "#FFFFFF" },
  "South Florida": { primary: "#006747", secondary: "#FFFFFF", accent: "#C4082E" },
  "Navy": { primary: "#00205B", secondary: "#FFFFFF" },
  "Army": { primary: "#000000", secondary: "#FFD700", accent: "#FFFFFF" },
  "Temple": { primary: "#941E38", secondary: "#FFFFFF" },

  // Conference USA
  "Jacksonville State": { primary: "#85172B", secondary: "#FFFFFF" },
  "Liberty": { primary: "#005696", secondary: "#BDB76B", accent: "#FFFFFF" },
  "New Mexico State": { primary: "#8A002F", secondary: "#FFFFFF" },
  "Louisiana Tech": { primary: "#20317B", secondary: "#FF4F00", accent: "#FFFFFF" },
  "Western Kentucky": { primary: "#E00039", secondary: "#FFFFFF" },
  "Middle Tennessee": { primary: "#006747", secondary: "#002147" },
  "UAB": { primary: "#006847", secondary: "#FFFFFF" },
  "North Alabama": { primary: "#005032", secondary: "#FFD700", accent: "#FFFFFF" },
  "Arkansas State": { primary: "#7C1C1C", secondary: "#FFFFFF" },
  "Georgia Southern": { primary: "#041E42", secondary: "#FFFFFF", accent: "#FFCC00" },
  "Georgia State": { primary: "#00447C", secondary: "#FFFFFF" },
  "Louisiana": { primary: "#BF2F38", secondary: "#FFFFFF" },
  "Old Dominion": { primary: "#003087", secondary: "#FFFFFF" },
  "South Alabama": { primary: "#0C2340", secondary: "#FFFFFF" },
  "Texas State": { primary: "#500878", secondary: "#FFFFFF" },
  "Troy": { primary: "#9478BA", secondary: "#FFFFFF" },

  // MAC
  "Ohio": { primary: "#00694E", secondary: "#FFFFFF" },
  "Miami (OH)": { primary: "#CC0000", secondary: "#000000" },
  "Buffalo": { primary: "#00539B", secondary: "#FFFFFF" },
  "Akron": { primary: "#004078", secondary: "#FFD520", accent: "#FFFFFF" },
  "Bowling Green": { primary: "#FF6200", secondary: "#6F263D" },
  "Kent State": { primary: "#091C39", secondary: "#FFB81C", accent: "#FFFFFF" },
  "Ball State": { primary: "#361C4D", secondary: "#FFFFFF" },
  "Central Michigan": { primary: "#6B2D78", secondary: "#FFC72C", accent: "#FFFFFF" },
  "Eastern Michigan": { primary: "#00873F", secondary: "#FFFFFF" },
  "Northern Illinois": { primary: "#CC0000", secondary: "#000000" },
  "Western Michigan": { primary: "#6A1E3A", secondary: "#FFC72C", accent: "#FFFFFF" },
  "Toledo": { primary: "#004078", secondary: "#FFCD00", accent: "#FFFFFF" },

  // Mountain West
  "Boise State": { primary: "#0E2433", secondary: "#FFFFFF", accent: "#0033A0" },
  "Colorado State": { primary: "#1A4B2B", secondary: "#FFFFFF" },
  "Air Force": { primary: "#003087", secondary: "#FFFFFF" },
  "New Mexico": { primary: "#990033", secondary: "#FFFFFF" },
  "Utah State": { primary: "#0F2439", secondary: "#182B49" },
  "Wyoming": { primary: "#49276D", secondary: "#FFC72C", accent: "#FFFFFF" },
  "Nevada": { primary: "#003870", secondary: "#FFFFFF" },
  "UNLV": { primary: "#821438", secondary: "#FFFFFF" },
  "Fresno State": { primary: "#FF0000", secondary: "#000000" },
  "San Diego State": { primary: "#A21942", secondary: "#000000" },
  "San Jose State": { primary: "#005530", secondary: "#FFFFFF" },
  "Hawaii": { primary: "#CC0033", secondary: "#FFFFFF" },

  // FCS - Big Sky
  "Montana": { primary: "#4B296D", secondary: "#C4930A", accent: "#FFFFFF" },
  "Montana State": { primary: "#081C36", secondary: "#FFC72C", accent: "#FFFFFF" },
  "Idaho": { primary: "#B47A2C", secondary: "#000000" },
  "Eastern Washington": { primary: "#AF1E2D", secondary: "#FFFFFF" },
  "Portland State": { primary: "#003870", secondary: "#FFFFFF" },
  "Sacramento State": { primary: "#041E42", secondary: "#FFFFFF" },
  "UC Davis": { primary: "#041E42", secondary: "#FFFFFF" },
  "Cal Poly": { primary: "#003057", secondary: "#FFD700", accent: "#FFFFFF" },
  "Northern Arizona": { primary: "#003470", secondary: "#FFFFFF" },
  "Northern Colorado": { primary: "#006244", secondary: "#FFD700", accent: "#FFFFFF" },
  "Southern Utah": { primary: "#B20A33", secondary: "#FFFFFF" },
  "Weber State": { primary: "#3E1950", secondary: "#FFFFFF" },
  "Idaho State": { primary: "#F47321", secondary: "#000000" },

  // FCS - Missouri Valley
  "North Dakota State": { primary: "#003366", secondary: "#FFCC00", accent: "#FFFFFF" },
  "South Dakota State": { primary: "#003870", secondary: "#FFC72C", accent: "#FFFFFF" },
  "North Dakota": { primary: "#006747", secondary: "#FFFFFF" },
  "South Dakota": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Northern Iowa": { primary: "#400F22", secondary: "#FFC72C", accent: "#FFFFFF" },
  "Illinois State": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Indiana State": { primary: "#003087", secondary: "#FFFFFF" },
  "Missouri State": { primary: "#8A1628", secondary: "#FFFFFF" },
  "Youngstown State": { primary: "#910038", secondary: "#FFFFFF" },
  "Southern Illinois": { primary: "#841617", secondary: "#FFFFFF" },

  // FCS - CAA
  "Delaware": { primary: "#00447C", secondary: "#FFD700", accent: "#FFFFFF" },
  "James Madison": { primary: "#3A0751", secondary: "#FFFFFF" },
  "Villanova": { primary: "#E83929", secondary: "#FFFFFF" },
  "William & Mary": { primary: "#081C36", secondary: "#FFC72C", accent: "#FFFFFF" },
  "Richmond": { primary: "#00447C", secondary: "#FFFFFF" },
  "Towson": { primary: "#000000", secondary: "#FFC72C", accent: "#FFFFFF" },
  "New Hampshire": { primary: "#003870", secondary: "#FFFFFF" },
  "Maine": { primary: "#00447C", secondary: "#FFFFFF" },
  "Rhode Island": { primary: "#00447C", secondary: "#FFFFFF" },
  "Albany": { primary: "#4B2572", secondary: "#FFC72C", accent: "#FFFFFF" },
  "Elon": { primary: "#7F1734", secondary: "#FFFFFF" },
  "Stony Brook": { primary: "#CC0000", secondary: "#FFFFFF" },

  // FCS - SWAC
  "North Carolina A&T": { primary: "#003049", secondary: "#FFD700", accent: "#FFFFFF" },
  "Florida A&M": { primary: "#EF6424", secondary: "#006B3F" },
  "Jackson State": { primary: "#003087", secondary: "#FFFFFF" },
  "Southern": { primary: "#005DAA", secondary: "#FFD700" },
  "Grambling State": { primary: "#000000", secondary: "#FFD700" },
  "Prairie View A&M": { primary: "#3F1050", secondary: "#FFD700" },
  "Alabama State": { primary: "#000000", secondary: "#FFD700" },
  "Alabama A&M": { primary: "#660000", secondary: "#FFFFFF" },
  "Alcorn State": { primary: "#3F1050", secondary: "#FFD700" },
  "Bethune-Cookman": { primary: "#660000", secondary: "#FFD700" },
  "Mississippi Valley State": { primary: "#006747", secondary: "#FFFFFF" },
  "Texas Southern": { primary: "#660000", secondary: "#969696" },
  "Arkansas-Pine Bluff": { primary: "#000000", secondary: "#FFD700" },

  // FCS - MEAC
  "South Carolina State": { primary: "#6E1C28", secondary: "#FFFFFF" },
  "North Carolina Central": { primary: "#6E1C28", secondary: "#969696" },
  "Howard": { primary: "#003087", secondary: "#CC0000" },
  "Delaware State": { primary: "#CC0000", secondary: "#003087" },
  "Morgan State": { primary: "#003087", secondary: "#FF6600" },
  "Norfolk State": { primary: "#006747", secondary: "#FFD700" },
  "Coppin State": { primary: "#003087", secondary: "#FFD700" },

  // FCS - Patriot League
  "Lehigh": { primary: "#652C0C", secondary: "#FFFFFF" },
  "Lafayette": { primary: "#660000", secondary: "#FFFFFF" },
  "Colgate": { primary: "#821019", secondary: "#FFFFFF" },
  "Holy Cross": { primary: "#602D90", secondary: "#FFFFFF" },
  "Bucknell": { primary: "#FF6600", secondary: "#003087" },
  "Fordham": { primary: "#660000", secondary: "#FFFFFF" },
  "Georgetown": { primary: "#041E42", secondary: "#969696" },

  // FCS - OVC / Big South
  "Tennessee State": { primary: "#00447C", secondary: "#FFFFFF" },
  "Tennessee Tech": { primary: "#4B296D", secondary: "#FFC72C", accent: "#FFFFFF" },
  "Austin Peay": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Eastern Kentucky": { primary: "#660000", secondary: "#FFFFFF" },
  "Southeast Missouri": { primary: "#CC0000", secondary: "#000000" },
  "UT Martin": { primary: "#FF6600", secondary: "#003087" },
  "Murray State": { primary: "#003087", secondary: "#FFD700" },
  "Lindenwood": { primary: "#000000", secondary: "#FFD700" },
  "Charleston Southern": { primary: "#003087", secondary: "#FFD700" },
  "Gardner-Webb": { primary: "#CC0000", secondary: "#000000" },
  "Robert Morris": { primary: "#003087", secondary: "#CC0000" },
  "Central Connecticut": { primary: "#003087", secondary: "#FFFFFF" },

  // FCS - Southland
  "McNeese": { primary: "#003087", secondary: "#FFD700" },
  "Nicholls": { primary: "#CC0000", secondary: "#969696" },
  "Northwestern State": { primary: "#3F1050", secondary: "#FF6600" },
  "Southeastern Louisiana": { primary: "#006747", secondary: "#FFD700" },
  "Houston Christian": { primary: "#003087", secondary: "#FF6600" },
  "UIW": { primary: "#CC0000", secondary: "#000000" },
  "Lamar": { primary: "#CC0000", secondary: "#FFFFFF" },
  "East Texas A&M": { primary: "#003087", secondary: "#FFD700" },

  // FCS - Northeast Conference
  "Duquesne": { primary: "#003087", secondary: "#CC0000" },
  "St. Francis (PA)": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Sacred Heart": { primary: "#CC0000", secondary: "#969696" },
  "Wagner": { primary: "#006747", secondary: "#FFFFFF" },
  "Long Island": { primary: "#000000", secondary: "#FFD700" },
  "Merrimack": { primary: "#003087", secondary: "#FFD700" },

  // FCS - Pioneer League
  "Dayton": { primary: "#CC0000", secondary: "#003087" },
  "Drake": { primary: "#003087", secondary: "#FFFFFF" },
  "Valparaiso": { primary: "#65350F", secondary: "#FFD700" },
  "Butler": { primary: "#003087", secondary: "#FFFFFF" },
  "Morehead State": { primary: "#003087", secondary: "#FFD700" },
  "Presbyterian": { primary: "#003087", secondary: "#CC0000" },
  "Marist": { primary: "#CC0000", secondary: "#FFFFFF" },
  "San Diego": { primary: "#003087", secondary: "#87CEEB" },
  "Stetson": { primary: "#006747", secondary: "#FFFFFF" },
  "Davidson": { primary: "#CC0000", secondary: "#000000" },

  // FCS - Ivy League
  "Harvard": { primary: "#A51C30", secondary: "#FFFFFF" },
  "Yale": { primary: "#00356B", secondary: "#FFFFFF" },
  "Princeton": { primary: "#EE7F2D", secondary: "#000000" },
  "Dartmouth": { primary: "#00693E", secondary: "#FFFFFF" },
  "Brown": { primary: "#4F1C38", secondary: "#FFFFFF" },
  "Cornell": { primary: "#B31B1B", secondary: "#FFFFFF" },
  "Columbia": { primary: "#004A80", secondary: "#FFFFFF" },
  "Penn": { primary: "#011F5B", secondary: "#FFFFFF" },

  // FCS - Additional CAA
  "Hampton": { primary: "#003087", secondary: "#FFFFFF" },
  "Campbell": { primary: "#FF6600", secondary: "#000000" },
  "Monmouth": { primary: "#003087", secondary: "#FFFFFF" },

  // FCS - Big South / WAC / Other
  "Kennesaw State": { primary: "#000000", secondary: "#FFD700" },
  "Tarleton State": { primary: "#3F1050", secondary: "#FFFFFF" },
  "Stephen F. Austin": { primary: "#3F1050", secondary: "#FFFFFF" },
  "Sam Houston": { primary: "#FF6600", secondary: "#FFFFFF" },
  "Abilene Christian": { primary: "#3F1050", secondary: "#FFFFFF" },
  "Central Arkansas": { primary: "#3F1050", secondary: "#969696" },
  "Eastern Illinois": { primary: "#003087", secondary: "#969696" },
  "Western Illinois": { primary: "#3F1050", secondary: "#FFD700" },
  "Chattanooga": { primary: "#003087", secondary: "#FFD700" },
  "Western Carolina": { primary: "#3F1050", secondary: "#FFD700" },
  "The Citadel": { primary: "#003087", secondary: "#FFFFFF" },
  "VMI": { primary: "#CC0000", secondary: "#FFD700" },
  "Furman": { primary: "#3F1050", secondary: "#FFFFFF" },
  "Wofford": { primary: "#000000", secondary: "#FFD700" },
  "Samford": { primary: "#003087", secondary: "#CC0000" },
  "Mercer": { primary: "#FF6600", secondary: "#000000" },
  "ETSU": { primary: "#003087", secondary: "#FFD700" },

  // =========================================================================
  // D2 — GLIAC
  // =========================================================================
  "Grand Valley State": { primary: "#002D62", secondary: "#FFFFFF" },
  "Ferris State": { primary: "#CC0000", secondary: "#FFD700" },
  "Wayne State (MI)": { primary: "#006747", secondary: "#FFD700" },
  "Saginaw Valley State": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Michigan Tech": { primary: "#000000", secondary: "#FFD700" },
  "Northern Michigan": { primary: "#006747", secondary: "#FFD700" },
  "Lake Erie": { primary: "#006747", secondary: "#000000" },
  "Davenport": { primary: "#CC0000", secondary: "#000000" },
  "Wisconsin-Parkside": { primary: "#006747", secondary: "#000000" },

  // D2 — GAC (Great American Conference)
  "Ouachita Baptist": { primary: "#3F1050", secondary: "#FFD700" },
  "Harding": { primary: "#000000", secondary: "#FFD700" },
  "Henderson State": { primary: "#CC0000", secondary: "#969696" },
  "Arkansas Tech": { primary: "#006747", secondary: "#FFD700" },
  "Southeastern Oklahoma": { primary: "#003087", secondary: "#FFD700" },
  "Southern Arkansas": { primary: "#003087", secondary: "#FFD700" },
  "Oklahoma Baptist": { primary: "#006747", secondary: "#FFD700" },

  // D2 — GNAC
  "Central Washington": { primary: "#660000", secondary: "#000000" },
  "Western Oregon": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Azusa Pacific": { primary: "#CC0000", secondary: "#FFD700" },
  "Humboldt State": { primary: "#006747", secondary: "#FFD700" },
  "Simon Fraser": { primary: "#CC0000", secondary: "#003087" },

  // D2 — PSAC
  "Slippery Rock": { primary: "#006747", secondary: "#FFFFFF" },
  "Kutztown": { primary: "#660000", secondary: "#FFD700" },
  "Indiana (PA)": { primary: "#660000", secondary: "#969696" },
  "Shepherd": { primary: "#003087", secondary: "#FFD700" },
  "West Chester": { primary: "#3F1050", secondary: "#FFD700" },
  "California (PA)": { primary: "#CC0000", secondary: "#000000" },
  "Shippensburg": { primary: "#003087", secondary: "#CC0000" },
  "Bloomsburg": { primary: "#660000", secondary: "#FFD700" },
  "Millersville": { primary: "#000000", secondary: "#FFD700" },
  "Edinboro": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Clarion": { primary: "#003087", secondary: "#FFD700" },
  "Mercyhurst": { primary: "#006747", secondary: "#FFFFFF" },

  // D2 — RMAC (Rocky Mountain)
  "Colorado Mines": { primary: "#003870", secondary: "#FFC72C", accent: "#FFFFFF" },
  "Colorado Mesa": { primary: "#660000", secondary: "#FFFFFF" },
  "CSU Pueblo": { primary: "#CC0000", secondary: "#003087" },
  "Western Colorado": { primary: "#CC0000", secondary: "#FFD700" },
  "Black Hills State": { primary: "#006747", secondary: "#FFD700" },
  "Chadron State": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Fort Lewis": { primary: "#003087", secondary: "#FFD700" },
  "New Mexico Highlands": { primary: "#3F1050", secondary: "#FFFFFF" },
  "Adams State": { primary: "#006747", secondary: "#FFD700" },
  "South Dakota Mines": { primary: "#003087", secondary: "#FFD700" },

  // D2 — Lone Star
  "Angelo State": { primary: "#003087", secondary: "#FFD700" },
  "Midwestern State": { primary: "#660000", secondary: "#FFD700" },
  "Texas A&M-Commerce": { primary: "#003087", secondary: "#FFD700" },
  "West Texas A&M": { primary: "#660000", secondary: "#FFFFFF" },
  "Texas A&M-Kingsville": { primary: "#003087", secondary: "#FFD700" },
  "Eastern New Mexico": { primary: "#006747", secondary: "#969696" },
  "Western New Mexico": { primary: "#3F1050", secondary: "#FFD700" },
  "UT Permian Basin": { primary: "#FF6600", secondary: "#003087" },

  // D2 — NE-10 (Northeast-10)
  "New Haven": { primary: "#003087", secondary: "#FFD700" },
  "Bentley": { primary: "#003087", secondary: "#FFD700" },
  "Assumption": { primary: "#003087", secondary: "#FFFFFF" },
  "American International": { primary: "#FFD700", secondary: "#000000" },
  "Pace": { primary: "#003087", secondary: "#FFD700" },
  "Southern Connecticut": { primary: "#003087", secondary: "#FFFFFF" },
  "Stonehill": { primary: "#3F1050", secondary: "#FFFFFF" },

  // D2 — NSIC (Northern Sun)
  "Minnesota State": { primary: "#3F1050", secondary: "#FFD700" },
  "Augustana (SD)": { primary: "#003087", secondary: "#FFD700" },
  "Bemidji State": { primary: "#006747", secondary: "#FFFFFF" },
  "Minnesota Duluth": { primary: "#660000", secondary: "#FFD700" },
  "Winona State": { primary: "#3F1050", secondary: "#FFFFFF" },
  "Sioux Falls": { primary: "#3F1050", secondary: "#FFD700" },
  "Upper Iowa": { primary: "#003087", secondary: "#FFFFFF" },
  "Wayne State (NE)": { primary: "#000000", secondary: "#FFD700" },
  "Concordia-St. Paul": { primary: "#006747", secondary: "#FFFFFF" },
  "Southwest Minnesota State": { primary: "#660000", secondary: "#FFD700" },
  "Northern State": { primary: "#660000", secondary: "#969696" },
  "MSU Moorhead": { primary: "#CC0000", secondary: "#000000" },

  // D2 — CIAA
  "Valdosta State": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Bowie State": { primary: "#000000", secondary: "#FFD700" },
  "Fayetteville State": { primary: "#003087", secondary: "#FFFFFF" },
  "Virginia Union": { primary: "#660000", secondary: "#969696" },
  "Virginia State": { primary: "#FF6600", secondary: "#003087" },
  "Elizabeth City State": { primary: "#003087", secondary: "#FFD700" },
  "Livingstone": { primary: "#003087", secondary: "#000000" },
  "Shaw": { primary: "#660000", secondary: "#FFFFFF" },
  "Chowan": { primary: "#003087", secondary: "#FFD700" },
  "Lincoln (PA)": { primary: "#FF6600", secondary: "#003087" },

  // D2 — SIAC
  "Tuskegee": { primary: "#660000", secondary: "#FFD700" },
  "Miles": { primary: "#3F1050", secondary: "#FFD700" },
  "Albany State (GA)": { primary: "#003087", secondary: "#FFD700" },
  "Fort Valley State": { primary: "#003087", secondary: "#FFD700" },
  "Clark Atlanta": { primary: "#CC0000", secondary: "#969696" },
  "Morehouse": { primary: "#660000", secondary: "#FFFFFF" },
  "Lane": { primary: "#003087", secondary: "#CC0000" },
  "Kentucky State": { primary: "#006747", secondary: "#FFD700" },
  "Central State": { primary: "#660000", secondary: "#FFD700" },
  "Benedict": { primary: "#3F1050", secondary: "#FFD700" },
  "Savannah State": { primary: "#003087", secondary: "#FF6600" },
  "Edward Waters": { primary: "#3F1050", secondary: "#FFD700" },

  // D2 — SAC (South Atlantic)
  "Lenoir-Rhyne": { primary: "#CC0000", secondary: "#000000" },
  "Wingate": { primary: "#003087", secondary: "#FFD700" },
  "Mars Hill": { primary: "#003087", secondary: "#FFD700" },
  "Catawba": { primary: "#003087", secondary: "#FFFFFF" },
  "Newberry": { primary: "#CC0000", secondary: "#969696" },
  "Tusculum": { primary: "#FF6600", secondary: "#000000" },
  "Carson-Newman": { primary: "#FF6600", secondary: "#003087" },
  "UVA Wise": { primary: "#003087", secondary: "#FF6600" },

  // =========================================================================
  // D3 — WIAC (Wisconsin Intercollegiate)
  // =========================================================================
  "Wisconsin-Whitewater": { primary: "#800000", secondary: "#FFFFFF" },
  "Wisconsin-Oshkosh": { primary: "#000000", secondary: "#FFD700" },
  "Wisconsin-Platteville": { primary: "#FF6600", secondary: "#003087" },
  "Wisconsin-La Crosse": { primary: "#660000", secondary: "#969696" },
  "Wisconsin-Stevens Point": { primary: "#3F1050", secondary: "#FFD700" },
  "Wisconsin-Stout": { primary: "#003087", secondary: "#FFFFFF" },
  "Wisconsin-Eau Claire": { primary: "#003087", secondary: "#FFD700" },
  "Wisconsin-River Falls": { primary: "#CC0000", secondary: "#FFFFFF" },

  // D3 — OAC (Ohio Athletic Conference)
  "Mount Union": { primary: "#800000", secondary: "#FFFFFF" },
  "Muskingum": { primary: "#000000", secondary: "#660000" },
  "Ohio Northern": { primary: "#FF6600", secondary: "#000000" },
  "Heidelberg": { primary: "#FF6600", secondary: "#000000" },
  "John Carroll": { primary: "#003087", secondary: "#FFD700" },
  "Baldwin Wallace": { primary: "#3F1050", secondary: "#FFD700" },
  "Marietta": { primary: "#003087", secondary: "#FFFFFF" },
  "Capital": { primary: "#3F1050", secondary: "#FFFFFF" },
  "Otterbein": { primary: "#CC0000", secondary: "#000000" },
  "Wilmington": { primary: "#006747", secondary: "#FFFFFF" },

  // D3 — CCIW
  "North Central (IL)": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Wheaton (IL)": { primary: "#FF6600", secondary: "#003087" },
  "Millikin": { primary: "#003087", secondary: "#FFFFFF" },
  "Augustana (IL)": { primary: "#003087", secondary: "#FFD700" },
  "Carthage": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Elmhurst": { primary: "#003087", secondary: "#FFFFFF" },
  "Illinois Wesleyan": { primary: "#006747", secondary: "#FFFFFF" },
  "Washington (MO)": { primary: "#CC0000", secondary: "#006747" },

  // D3 — MIAC
  "St. John's (MN)": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Bethel (MN)": { primary: "#003087", secondary: "#FFD700" },
  "Gustavus Adolphus": { primary: "#000000", secondary: "#FFD700" },
  "Concordia (MN)": { primary: "#660000", secondary: "#FFFFFF" },
  "St. Thomas (MN)": { primary: "#3F1050", secondary: "#969696" },
  "Carleton": { primary: "#003087", secondary: "#FFD700" },
  "Macalester": { primary: "#FF6600", secondary: "#003087" },
  "Hamline": { primary: "#CC0000", secondary: "#969696" },
  "St. Olaf": { primary: "#000000", secondary: "#FFD700" },
  "Augsburg": { primary: "#660000", secondary: "#969696" },

  // D3 — Centennial Conference
  "Susquehanna": { primary: "#FF6600", secondary: "#660000" },
  "Johns Hopkins": { primary: "#003087", secondary: "#FFFFFF" },
  "Muhlenberg": { primary: "#CC0000", secondary: "#969696" },
  "Dickinson": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Gettysburg": { primary: "#FF6600", secondary: "#003087" },
  "Franklin & Marshall": { primary: "#003087", secondary: "#FFFFFF" },
  "Ursinus": { primary: "#CC0000", secondary: "#FFD700" },
  "McDaniel": { primary: "#006747", secondary: "#FFD700" },
  "Juniata": { primary: "#003087", secondary: "#FFD700" },

  // D3 — NESCAC
  "Williams": { primary: "#3F1050", secondary: "#FFD700" },
  "Amherst": { primary: "#3F1050", secondary: "#FFFFFF" },
  "Middlebury": { primary: "#003087", secondary: "#FFFFFF" },
  "Tufts": { primary: "#3E3B38", secondary: "#003087" },
  "Trinity (CT)": { primary: "#003087", secondary: "#FFD700" },
  "Wesleyan (CT)": { primary: "#CC0000", secondary: "#000000" },
  "Bates": { primary: "#660000", secondary: "#FFFFFF" },
  "Bowdoin": { primary: "#000000", secondary: "#FFFFFF" },
  "Colby": { primary: "#003087", secondary: "#969696" },
  "Hamilton": { primary: "#002F6C", secondary: "#FFD700" },
  "Conn College": { primary: "#003087", secondary: "#FFFFFF" },

  // D3 — Other Notable Programs
  "Mary Hardin-Baylor": { primary: "#3F1050", secondary: "#FFD700" },
  "Linfield": { primary: "#3F1050", secondary: "#CC0000" },
  "Hardin-Simmons": { primary: "#3F1050", secondary: "#FFD700" },
  "Wesley": { primary: "#006747", secondary: "#FFD700" },
  "St. Norbert": { primary: "#006747", secondary: "#FFD700" },
  "Rensselaer": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Carnegie Mellon": { primary: "#CC0000", secondary: "#969696" },
  "Case Western Reserve": { primary: "#003087", secondary: "#FFFFFF" },
  "Emory & Henry": { primary: "#003087", secondary: "#FFD700" },
  "Wabash": { primary: "#CC0000", secondary: "#FFFFFF" },
  "DePauw": { primary: "#FFD700", secondary: "#000000" },
  "Rose-Hulman": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Hobart": { primary: "#3F1050", secondary: "#FF6600" },
  "Union (NY)": { primary: "#660000", secondary: "#FFFFFF" },
  "Cortland": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Ithaca": { primary: "#003087", secondary: "#FFFFFF" },
  "Brockport": { primary: "#006747", secondary: "#FFD700" },

  // =========================================================================
  // NAIA — Major Programs
  // =========================================================================
  "Morningside": { primary: "#660000", secondary: "#FFFFFF" },
  "Grand View": { primary: "#003087", secondary: "#CC0000" },
  "Marian (IN)": { primary: "#003087", secondary: "#FFD700" },
  "Reinhardt": { primary: "#003087", secondary: "#FFD700" },
  "Keiser": { primary: "#003087", secondary: "#FFD700" },
  "Lindsey Wilson": { primary: "#003087", secondary: "#FFFFFF" },
  "Georgetown (KY)": { primary: "#FF6600", secondary: "#003087" },
  "Saint Xavier": { primary: "#003087", secondary: "#FFD700" },
  "Olivet Nazarene": { primary: "#3F1050", secondary: "#FFD700" },
  "Baker": { primary: "#FF6600", secondary: "#003087" },
  "Benedictine (KS)": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Kansas Wesleyan": { primary: "#003087", secondary: "#FFD700" },
  "Bethel (KS)": { primary: "#660000", secondary: "#969696" },
  "Southwestern (KS)": { primary: "#3F1050", secondary: "#FFD700" },
  "Cumberlands": { primary: "#003087", secondary: "#FFFFFF" },
  "Campbellsville": { primary: "#660000", secondary: "#FFD700" },
  "Concordia (NE)": { primary: "#003087", secondary: "#FFFFFF" },
  "Doane": { primary: "#FF6600", secondary: "#003087" },
  "Hastings": { primary: "#660000", secondary: "#FFFFFF" },
  "Midland": { primary: "#003087", secondary: "#CC0000" },
  "Northwestern (IA)": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Dordt": { primary: "#000000", secondary: "#FFD700" },
  "College of Idaho": { primary: "#3F1050", secondary: "#FFD700" },
  "Montana Tech": { primary: "#003087", secondary: "#969696" },
  "Carroll (MT)": { primary: "#3F1050", secondary: "#FFD700" },
  "Rocky Mountain": { primary: "#003087", secondary: "#CC0000" },
  "Southern Oregon": { primary: "#CC0000", secondary: "#000000" },
  "Southeastern (FL)": { primary: "#CC0000", secondary: "#FFFFFF" },
  "Faulkner": { primary: "#003087", secondary: "#FFD700" },
  "Pikeville": { primary: "#000000", secondary: "#FF6600" },
  "Bethany (KS)": { primary: "#006747", secondary: "#FFD700" },
};

/**
 * Get team colors with fallback defaults
 */
export function getTeamColors(teamName: string): TeamColors {
  // Exact match first
  if (TEAM_COLORS[teamName]) {
    return TEAM_COLORS[teamName];
  }

  // Try partial match (for names like "Miami (FL)")
  for (const [key, value] of Object.entries(TEAM_COLORS)) {
    if (teamName.includes(key) || key.includes(teamName)) {
      return value;
    }
  }

  // Default fallback
  return {
    primary: "#1a1f2e",
    secondary: "#475569",
    accent: "#00f5d4",
  };
}
