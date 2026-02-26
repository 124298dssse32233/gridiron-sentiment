/**
 * Newsletter Email Template for "The Stack"
 *
 * Weekly intelligence brief for Gridiron Intel subscribers.
 * Generates email-client-compatible HTML and plain text versions.
 *
 * Design system:
 * - Dark theme matching Gridiron Intel (navy backgrounds, teal accents)
 * - Table-based layout (100% email client compatibility)
 * - Email-safe fonts (Georgia, Helvetica Neue, Courier New)
 * - Inline styles only (no external CSS)
 * - Max width 600px
 *
 * @packageDocumentation
 */

/** Data structure for newsletter generation */
interface NewsletterData {
  week: number;
  season: number;
  date: string;
  headlines: string;
  topRankings: Array<{
    rank: number;
    team: string;
    rating: number;
    change: number;
    level: string;
  }>;
  biggestMovers: {
    risers: Array<{ team: string; from: number; to: number }>;
    fallers: Array<{ team: string; from: number; to: number }>;
  };
  chaosGames: Array<{
    teams: string;
    score: string;
    chaosScore: number;
    chaosTier: string;
    headline: string;
  }>;
  upsetOfWeek: {
    winner: string;
    loser: string;
    score: string;
    winProbability: number;
    headline: string;
  } | null;
  statOfWeek: {
    stat: string;
    context: string;
  };
  predictionAccuracy: {
    correct: number;
    total: number;
    percentage: number;
  };
  coachSpotlight: {
    coach: string;
    team: string;
    decision: string;
    grade: string;
    context: string;
  } | null;
  upcomingGames: Array<{
    matchup: string;
    date: string;
    prediction: string;
  }>;
  unsubscribeUrl: string;
  webVersionUrl: string;
}

// Design tokens
const colors = {
  bgPrimary: '#0a0e17',
  bgSecondary: '#111827',
  bgCard: '#1a1f2e',
  bgElevated: '#242937',
  accentPrimary: '#00f5d4',
  accentSecondary: '#7b61ff',
  accentChaos: '#f472b6',
  accentWarning: '#fbbf24',
  accentPositive: '#34d399',
  accentNegative: '#f87171',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#475569',
};

/**
 * Format a number with appropriate change indicator (↑/↓/→)
 * @param change - Positive for up, negative for down, 0 for no change
 * @returns Formatted string with indicator and number
 */
function formatChange(change: number): string {
  if (change > 0) return `<span style="color: ${colors.accentPositive};">↑ ${change}</span>`;
  if (change < 0) return `<span style="color: ${colors.accentNegative};">↓ ${Math.abs(change)}</span>`;
  return `<span style="color: ${colors.textMuted};">→ 0</span>`;
}

/**
 * Format rating number with standard Glicko-2 notation
 * @param rating - Rating value
 * @returns Formatted rating string
 */
function formatRating(rating: number): string {
  return Math.round(rating).toString();
}

/**
 * Generate chaos score badge with color coding
 * @param score - Chaos score (0-100)
 * @returns HTML string for badge
 */
function getChaosColor(score: number): string {
  if (score >= 80) return colors.accentChaos;
  if (score >= 60) return colors.accentWarning;
  if (score >= 40) return colors.accentSecondary;
  return colors.accentPrimary;
}

/**
 * Generate the preheader text for email clients
 * @param data - Newsletter data
 * @returns Preheader text
 */
function generatePreheader(data: NewsletterData): string {
  const topTeam = data.topRankings[0];
  return `Week ${data.week} | ${topTeam?.team} #1 | ${data.predictionAccuracy.percentage}% prediction accuracy`;
}

/**
 * Generate HTML email for newsletter
 * @param data - Newsletter data
 * @returns Complete HTML email string
 */
export function generateNewsletterHtml(data: NewsletterData): string {
  const preheader = generatePreheader(data);
  const changeIndicator = data.topRankings[0]?.change ?? 0;
  const topTeamColor = data.topRankings[0]?.level === 'FBS' ? colors.accentPrimary : colors.accentSecondary;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Stack | Week ${data.week}, ${data.season}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: ${colors.bgPrimary}; font-family: 'Helvetica Neue', Arial, sans-serif; }
    table { border-collapse: collapse; border-spacing: 0; }
    img { border: 0; outline: none; text-decoration: none; max-width: 100%; }
    a { color: ${colors.accentPrimary}; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.bgPrimary}; font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: ${colors.textPrimary};">
  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
  </div>

  <!-- Main Container -->
  <table role="presentation" style="width: 100%; max-width: 100%; background-color: ${colors.bgPrimary};">
    <tr>
      <td style="padding: 0;">
        <!-- Content Wrapper (max-width 600px) -->
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: ${colors.bgPrimary};">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px 20px; background-color: ${colors.bgPrimary}; border-bottom: 2px solid ${colors.accentPrimary};">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: ${colors.accentPrimary}; letter-spacing: 2px;">THE STACK</h1>
                    <p style="margin: 8px 0 0; font-family: Georgia, serif; font-size: 14px; color: ${colors.textSecondary}; font-weight: normal; letter-spacing: 1px;">WEEK ${data.week} • ${data.season} SEASON</p>
                  </td>
                  <td style="text-align: right;">
                    <p style="margin: 0; font-size: 12px; color: ${colors.textMuted}; line-height: 1.4;">${data.date}</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0; font-size: 13px; color: ${colors.textSecondary}; font-style: italic; border-left: 3px solid ${colors.accentSecondary}; padding-left: 12px;">Your weekly intelligence brief from Gridiron Intel</p>
            </td>
          </tr>

          <!-- Week Headlines -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 18px; color: ${colors.textPrimary}; border-bottom: 1px solid ${colors.bgElevated}; padding-bottom: 12px;">This Week's Headlines</h2>
              <p style="margin: 0; font-size: 14px; line-height: 1.7; color: ${colors.textSecondary};">${data.headlines}</p>
            </td>
          </tr>

          <!-- Top 10 Rankings -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px; font-family: Georgia, serif; font-size: 18px; color: ${colors.textPrimary}; border-bottom: 1px solid ${colors.bgElevated}; padding-bottom: 12px;">Top 10 Rankings</h2>
              <table role="presentation" style="width: 100%; margin-bottom: 20px;">
                <tr style="border-bottom: 1px solid ${colors.bgElevated};">
                  <td style="padding: 12px 0; font-family: 'Courier New', monospace; font-size: 12px; color: ${colors.textMuted}; font-weight: bold;">RANK</td>
                  <td style="padding: 12px 0; font-family: 'Courier New', monospace; font-size: 12px; color: ${colors.textMuted}; font-weight: bold;">TEAM</td>
                  <td style="padding: 12px 0; text-align: right; font-family: 'Courier New', monospace; font-size: 12px; color: ${colors.textMuted}; font-weight: bold;">RATING</td>
                  <td style="padding: 12px 0; text-align: right; font-family: 'Courier New', monospace; font-size: 12px; color: ${colors.textMuted}; font-weight: bold;">CHG</td>
                </tr>
                ${data.topRankings
                  .map(
                    (ranking, idx) => `
                <tr style="background-color: ${idx % 2 === 0 ? colors.bgCard : 'transparent'};">
                  <td style="padding: 12px 0; font-family: 'Courier New', monospace; font-size: 13px; font-weight: bold; color: ${colors.accentPrimary};">#${ranking.rank}</td>
                  <td style="padding: 12px 0; font-size: 13px; color: ${colors.textPrimary};">
                    <strong>${ranking.team}</strong>
                    <span style="font-size: 11px; color: ${colors.textMuted};">(${ranking.level})</span>
                  </td>
                  <td style="padding: 12px 0; text-align: right; font-family: 'Courier New', monospace; font-size: 13px; color: ${colors.textSecondary};">${formatRating(ranking.rating)}</td>
                  <td style="padding: 12px 0; text-align: right; font-family: 'Courier New', monospace; font-size: 13px;">${formatChange(ranking.change)}</td>
                </tr>
                `
                  )
                  .join('')}
              </table>
              <p style="margin: 0; font-size: 12px; color: ${colors.textMuted};"><a href="${data.webVersionUrl}#rankings" style="color: ${colors.accentPrimary}; text-decoration: none;">View full rankings →</a></p>
            </td>
          </tr>

          <!-- Biggest Movers -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px; font-family: Georgia, serif; font-size: 18px; color: ${colors.textPrimary}; border-bottom: 1px solid ${colors.bgElevated}; padding-bottom: 12px;">Biggest Movers</h2>
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="width: 50%; padding-right: 15px; vertical-align: top;">
                    <p style="margin: 0 0 12px; font-size: 12px; color: ${colors.accentPositive}; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Risers</p>
                    ${data.biggestMovers.risers
                      .slice(0, 3)
                      .map(
                        (riser) => `
                      <p style="margin: 0 0 8px; font-size: 13px; color: ${colors.textSecondary};">
                        <strong style="color: ${colors.accentPositive};">${riser.team}</strong>
                        <br>
                        <span style="font-family: 'Courier New', monospace; font-size: 12px; color: ${colors.textMuted};">#${riser.from} → #${riser.to}</span>
                      </p>
                      `
                      )
                      .join('')}
                  </td>
                  <td style="width: 50%; padding-left: 15px; border-left: 1px solid ${colors.bgElevated}; vertical-align: top;">
                    <p style="margin: 0 0 12px; font-size: 12px; color: ${colors.accentNegative}; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Fallers</p>
                    ${data.biggestMovers.fallers
                      .slice(0, 3)
                      .map(
                        (faller) => `
                      <p style="margin: 0 0 8px; font-size: 13px; color: ${colors.textSecondary};">
                        <strong style="color: ${colors.accentNegative};">${faller.team}</strong>
                        <br>
                        <span style="font-family: 'Courier New', monospace; font-size: 12px; color: ${colors.textMuted};">#${faller.from} → #${faller.to}</span>
                      </p>
                      `
                      )
                      .join('')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Chaos Corner -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px; font-family: Georgia, serif; font-size: 18px; color: ${colors.textPrimary}; border-bottom: 1px solid ${colors.bgElevated}; padding-bottom: 12px;">Chaos Corner</h2>
              ${data.chaosGames
                .slice(0, 3)
                .map(
                  (game, idx) => `
                <div style="margin-bottom: ${idx < 2 ? '20px' : '0'}; padding: 16px; background-color: ${colors.bgCard}; border-left: 4px solid ${getChaosColor(game.chaosScore)}; border-radius: 4px;">
                  <p style="margin: 0 0 8px; font-size: 13px; color: ${colors.textPrimary};">
                    <strong>${game.teams}</strong>
                    <span style="color: ${colors.textMuted};">${game.score}</span>
                  </p>
                  <p style="margin: 0 0 8px; font-size: 12px; color: ${colors.textSecondary};">${game.headline}</p>
                  <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold;">
                    Chaos Score: <span style="color: ${getChaosColor(game.chaosScore)};">${game.chaosScore.toFixed(1)}</span>
                    <span style="color: ${colors.textMuted};">(${game.chaosTier})</span>
                  </p>
                </div>
                `
                )
                .join('')}
            </td>
          </tr>

          <!-- Upset Alert -->
          ${
            data.upsetOfWeek
              ? `
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px; font-family: Georgia, serif; font-size: 18px; color: ${colors.textPrimary}; border-bottom: 1px solid ${colors.bgElevated}; padding-bottom: 12px;">Upset Alert</h2>
              <div style="padding: 20px; background-color: ${colors.bgCard}; border-left: 4px solid ${colors.accentChaos}; border-radius: 4px;">
                <p style="margin: 0 0 8px; font-size: 13px; color: ${colors.textPrimary};">
                  <strong>${data.upsetOfWeek.winner}</strong>
                  <span style="color: ${colors.textMuted};"> defeated </span>
                  <strong>${data.upsetOfWeek.loser}</strong>
                </p>
                <p style="margin: 0 0 8px; font-size: 12px; color: ${colors.textSecondary}; font-family: 'Courier New', monospace;">${data.upsetOfWeek.score}</p>
                <p style="margin: 0 0 8px; font-size: 12px; color: ${colors.textSecondary};">${data.upsetOfWeek.headline}</p>
                <p style="margin: 0; font-size: 11px; color: ${colors.textMuted};">
                  Win probability: <span style="color: ${colors.accentNegative};">${(data.upsetOfWeek.winProbability * 100).toFixed(1)}%</span> (major shock)
                </p>
              </div>
            </td>
          </tr>
          `
              : ''
          }

          <!-- Stat of the Week -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px; font-family: Georgia, serif; font-size: 18px; color: ${colors.textPrimary}; border-bottom: 1px solid ${colors.bgElevated}; padding-bottom: 12px;">Stat of the Week</h2>
              <div style="padding: 20px; background-color: ${colors.bgCard}; border-radius: 4px;">
                <p style="margin: 0 0 8px; font-family: Georgia, serif; font-size: 15px; color: ${colors.accentPrimary}; font-weight: bold;">${data.statOfWeek.stat}</p>
                <p style="margin: 0; font-size: 13px; color: ${colors.textSecondary};">${data.statOfWeek.context}</p>
              </div>
            </td>
          </tr>

          <!-- Prediction Scorecard -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px; font-family: Georgia, serif; font-size: 18px; color: ${colors.textPrimary}; border-bottom: 1px solid ${colors.bgElevated}; padding-bottom: 12px;">Prediction Scorecard</h2>
              <table role="presentation" style="width: 100%; background-color: ${colors.bgCard}; border-radius: 4px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 8px; font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: ${colors.accentPrimary};">${data.predictionAccuracy.percentage}%</p>
                    <p style="margin: 0; font-size: 12px; color: ${colors.textSecondary};">${data.predictionAccuracy.correct} of ${data.predictionAccuracy.total} games correct</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Coach Spotlight -->
          ${
            data.coachSpotlight
              ? `
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px; font-family: Georgia, serif; font-size: 18px; color: ${colors.textPrimary}; border-bottom: 1px solid ${colors.bgElevated}; padding-bottom: 12px;">Coach Spotlight</h2>
              <div style="padding: 20px; background-color: ${colors.bgCard}; border-radius: 4px;">
                <p style="margin: 0 0 4px; font-size: 13px; color: ${colors.textPrimary};">
                  <strong>${data.coachSpotlight.coach}</strong>
                  <span style="color: ${colors.textMuted};"> • ${data.coachSpotlight.team}</span>
                </p>
                <p style="margin: 0 0 12px; font-size: 11px; font-weight: bold; color: ${data.coachSpotlight.grade.includes('+') || data.coachSpotlight.grade.startsWith('A') ? colors.accentPositive : colors.accentNegative}; text-transform: uppercase; letter-spacing: 1px;">Grade: ${data.coachSpotlight.grade}</p>
                <p style="margin: 0 0 8px; font-size: 13px; color: ${colors.textSecondary};"><strong>${data.coachSpotlight.decision}</strong></p>
                <p style="margin: 0; font-size: 12px; color: ${colors.textMuted};">${data.coachSpotlight.context}</p>
              </div>
            </td>
          </tr>
          `
              : ''
          }

          <!-- Coming Up -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px; font-family: Georgia, serif; font-size: 18px; color: ${colors.textPrimary}; border-bottom: 1px solid ${colors.bgElevated}; padding-bottom: 12px;">Coming Up</h2>
              <table role="presentation" style="width: 100%;">
                ${data.upcomingGames
                  .slice(0, 4)
                  .map(
                    (game, idx) => `
                  <tr style="border-bottom: ${idx < 3 ? `1px solid ${colors.bgCard}` : 'none'};">
                    <td style="padding: 12px 0; vertical-align: top;">
                      <p style="margin: 0 0 4px; font-size: 13px; color: ${colors.textPrimary};"><strong>${game.matchup}</strong></p>
                      <p style="margin: 0 0 6px; font-size: 11px; color: ${colors.textMuted};">${game.date}</p>
                      <p style="margin: 0; font-size: 12px; color: ${colors.textSecondary};">${game.prediction}</p>
                    </td>
                  </tr>
                  `
                  )
                  .join('')}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid ${colors.bgElevated}; background-color: ${colors.bgSecondary};">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="padding-bottom: 20px; border-bottom: 1px solid ${colors.bgCard};">
                    <p style="margin: 0 0 12px; font-size: 13px; color: ${colors.textSecondary};">
                      <a href="${data.webVersionUrl}" style="color: ${colors.accentPrimary}; text-decoration: none;">View on web</a>
                      <span style="color: ${colors.textMuted};"> • </span>
                      <a href="${data.unsubscribeUrl}" style="color: ${colors.accentPrimary}; text-decoration: none;">Unsubscribe</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: ${colors.textSecondary};">
                      Follow <a href="https://twitter.com/gridironintel" style="color: ${colors.accentPrimary}; text-decoration: none;">@gridironintel</a> for live updates
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 20px; text-align: center;">
                    <p style="margin: 0 0 8px; font-family: Georgia, serif; font-size: 14px; font-weight: bold; color: ${colors.accentPrimary}; letter-spacing: 1px;">GRIDIRON INTEL</p>
                    <p style="margin: 0; font-size: 11px; color: ${colors.textMuted};">
                      The analytics platform for college football. Rankings, predictions, and insights on every team in America.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate plain text version of newsletter
 * @param data - Newsletter data
 * @returns Plain text email string
 */
export function generateNewsletterText(data: NewsletterData): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('THE STACK - WEEKLY INTELLIGENCE BRIEF');
  lines.push(`WEEK ${data.week} • ${data.season} SEASON`);
  lines.push(data.date);
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  lines.push('THIS WEEK\'S HEADLINES');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(data.headlines);
  lines.push('');

  lines.push('TOP 10 RANKINGS');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push('RANK  TEAM                               RATING  CHG');
  lines.push('─────────────────────────────────────────────────────────');
  data.topRankings.forEach((ranking) => {
    const change = ranking.change > 0 ? `↑${ranking.change}` : ranking.change < 0 ? `↓${Math.abs(ranking.change)}` : '→0';
    const ratingStr = formatRating(ranking.rating).padEnd(6);
    const changeStr = change.padEnd(5);
    lines.push(`#${ranking.rank.toString().padEnd(3)} ${ranking.team.padEnd(30)} ${ratingStr} ${changeStr}`);
  });
  lines.push('');

  lines.push('BIGGEST MOVERS');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push('RISERS:');
  data.biggestMovers.risers.slice(0, 3).forEach((riser) => {
    lines.push(`  ${riser.team} (#${riser.from} → #${riser.to})`);
  });
  lines.push('');
  lines.push('FALLERS:');
  data.biggestMovers.fallers.slice(0, 3).forEach((faller) => {
    lines.push(`  ${faller.team} (#${faller.from} → #${faller.to})`);
  });
  lines.push('');

  lines.push('CHAOS CORNER');
  lines.push('─────────────────────────────────────────────────────────');
  data.chaosGames.slice(0, 3).forEach((game) => {
    lines.push(`${game.teams} (${game.score})`);
    lines.push(`${game.headline}`);
    lines.push(`Chaos Score: ${game.chaosScore.toFixed(1)}/100 (${game.chaosTier})`);
    lines.push('');
  });

  if (data.upsetOfWeek) {
    lines.push('UPSET ALERT');
    lines.push('─────────────────────────────────────────────────────────');
    lines.push(`${data.upsetOfWeek.winner} defeated ${data.upsetOfWeek.loser}`);
    lines.push(`${data.upsetOfWeek.score}`);
    lines.push(data.upsetOfWeek.headline);
    lines.push(`Win Probability: ${(data.upsetOfWeek.winProbability * 100).toFixed(1)}% (major shock)`);
    lines.push('');
  }

  lines.push('STAT OF THE WEEK');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(data.statOfWeek.stat);
  lines.push(data.statOfWeek.context);
  lines.push('');

  lines.push('PREDICTION SCORECARD');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(`${data.predictionAccuracy.percentage}% accuracy`);
  lines.push(`${data.predictionAccuracy.correct} of ${data.predictionAccuracy.total} games correct`);
  lines.push('');

  if (data.coachSpotlight) {
    lines.push('COACH SPOTLIGHT');
    lines.push('─────────────────────────────────────────────────────────');
    lines.push(`${data.coachSpotlight.coach} • ${data.coachSpotlight.team}`);
    lines.push(`Grade: ${data.coachSpotlight.grade}`);
    lines.push(data.coachSpotlight.decision);
    lines.push(data.coachSpotlight.context);
    lines.push('');
  }

  lines.push('COMING UP');
  lines.push('─────────────────────────────────────────────────────────');
  data.upcomingGames.slice(0, 4).forEach((game) => {
    lines.push(`${game.matchup}`);
    lines.push(`${game.date}`);
    lines.push(`${game.prediction}`);
    lines.push('');
  });

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('GRIDIRON INTEL');
  lines.push('The analytics platform for college football.');
  lines.push('Rankings, predictions, and insights on every team in America.');
  lines.push('');
  lines.push(`View online: ${data.webVersionUrl}`);
  lines.push(`Unsubscribe: ${data.unsubscribeUrl}`);
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Generate email subject line for newsletter
 * @param data - Newsletter data
 * @returns Subject line string
 */
export function generateSubjectLine(data: NewsletterData): string {
  const topTeam = data.topRankings[0]?.team ?? 'CFB';
  const changeStr = data.topRankings[0]?.change ?? 0 > 0 ? '↑' : '↓';

  if (data.upsetOfWeek) {
    return `The Stack Week ${data.week}: ${data.upsetOfWeek.winner} stuns ${data.upsetOfWeek.loser}`;
  }

  return `The Stack Week ${data.week}: ${topTeam} atop GridRank | ${data.predictionAccuracy.percentage}% accuracy`;
}

export type { NewsletterData };
