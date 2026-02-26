/**
 * Analyze GridRank rankings against CFP rankings
 */

const gridrankTop25 = [
  "Oregon", "Notre Dame", "Boise State", "Ohio", "Ohio State",
  "SMU", "Miami", "Arizona State", "Georgia", "Indiana",
  "Texas", "Marshall", "Army", "South Carolina", "Memphis",
  "Penn State", "Clemson", "Baylor", "Tennessee", "Navy",
  "Iowa State", "UNLV", "Ole Miss", "BYU", "Syracuse"
];

const cfpTop12 = [
  "Oregon", "Georgia", "Boise State", "Arizona State", "Texas",
  "Penn State", "Notre Dame", "Ohio State", "Tennessee", "Indiana",
  "SMU", "Clemson"
];

console.log("GridRank Top 25 vs 2024 CFP Top 12 Comparison\n");
console.log("=" .repeat(60));

// Find teams in CFP Top 12
console.log("\nTeams in CFP Top 12 (with GridRank rank):");
for (const team of cfpTop12) {
  const rank = gridrankTop25.indexOf(team) + 1;
  const status = rank > 0 ? `#${rank}` : "NOT IN TOP 25";
  console.log(`  ${team.padEnd(20)} ${status}`);
}

// Find overlap
console.log("\n" + "=".repeat(60));
console.log("\nOverlap Analysis:");

const overlap = cfpTop12.filter(t => gridrankTop25.includes(t));
const overlapPercent = (overlap.length / cfpTop12.length) * 100;

console.log(`  CFP Top 12 teams in GridRank Top 25: ${overlap.length}/12 (${overlapPercent.toFixed(1)}%)`);

// Teams in GridRank Top 25 that weren't in CFP Top 12
const unexpected = gridrankTop25.filter(t => !cfpTop12.includes(t));
console.log(`\n  GridRank Top 25 teams NOT in CFP Top 12 (${unexpected.length}):`);
for (const team of unexpected.slice(0, 12)) {
  const rank = gridrankTop25.indexOf(team) + 1;
  console.log(`    #${rank.toString().padStart(2)} ${team}`);
}

// Teams in CFP Top 12 but not in GridRank Top 25
const missing = cfpTop12.filter(t => !gridrankTop25.includes(t));
console.log(`\n  CFP Top 12 teams NOT in GridRank Top 25 (${missing.length}):`);
for (const team of missing) {
  console.log(`    ${team}`);
}

// Specific problematic rankings
console.log("\n" + "=".repeat(60));
console.log("\nNotable Discrepancies:");

const problematic = [
  { team: "Alabama", cfp: "#1-#5", gridrank: "#39" },
  { team: "Ohio (Bobcats)", cfp: "Unranked", gridrank: "#4" },
  { team: "Marshall", cfp: "Unranked", gridrank: "#12" },
  { team: "Georgia", cfp: "#2", gridrank: "#9" },
];

for (const p of problematic) {
  console.log(`  ${p.team.padEnd(20)} CFP: ${p.cfp.padEnd(12)} GridRank: ${p.gridrank}`);
}

console.log("\n" + "=".repeat(60));
console.log("\nPotential Issues:");
console.log("  1. Alabama at #39 suggests severe underperformance in");
console.log("     the model or issues with game data processing.");
console.log("  2. 'Ohio' at #4 is likely Ohio University (Bobcats), not");
console.log("     Ohio State University. Need to verify team identification.");
console.log("  3. Marshall at #12 suggests MAC teams are being overrated,");
console.log("     possibly due to weak schedule or lack of cross-level games.");
