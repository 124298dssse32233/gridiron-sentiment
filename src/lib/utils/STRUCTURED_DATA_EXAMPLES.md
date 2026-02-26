# Structured Data Examples

Practical implementation examples for each schema type in the Gridiron Intel project.

## 1. Homepage with Website Schema

**File:** `src/app/page.tsx`

```typescript
import { generateWebsiteSchema, generateOrganizationSchema, combineSchemas, jsonLdScript } from '@/lib/utils/structured-data';

export default function Homepage() {
  // Generate schemas
  const websiteSchema = generateWebsiteSchema({
    baseUrl: 'https://gridironintel.com',
    searchUrl: 'https://gridironintel.com/search?q={search_term}'
  });

  const orgSchema = generateOrganizationSchema();

  // Combine both schemas
  const combinedSchemas = combineSchemas(websiteSchema, orgSchema);

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(combinedSchemas)
          }}
        />
      </Head>

      {/* Homepage content */}
      <div className="container">
        <h1>Gridiron Intel</h1>
        {/* ... */}
      </div>
    </>
  );
}
```

**Result in Google:**
- Sitelinks search box below title in SERP
- Organization card in Knowledge Graph
- Social links in footer

---

## 2. Team Detail Page

**File:** `src/app/team/[slug]/page.tsx`

```typescript
import { Metadata } from 'next';
import { generateTeamSchema, generateBreadcrumbs, combineSchemas, jsonLdScript } from '@/lib/utils/structured-data';
import { getTeamData } from '@/lib/cfbd/teams';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const team = await getTeamData(params.slug);
  return {
    title: `${team.name} | Gridiron Intel`,
    description: `${team.name} rankings, stats, ratings, and analysis on Gridiron Intel`,
  };
}

export default async function TeamPage({ params }: Props) {
  const team = await getTeamData(params.slug);

  // Team schema
  const teamSchema = generateTeamSchema({
    name: team.name,
    mascot: team.mascot,
    conference: team.conference?.name,
    level: team.level,
    stadium: team.stadium,
    city: team.city,
    state: team.state,
    logoUrl: team.logoUrl,
    slug: team.slug,
    rating: team.rating,
    wins: team.wins,
    losses: team.losses,
    athleticsUrl: team.metadata?.athleticsUrl
  });

  // Breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbs([
    { name: 'Home', href: '/' },
    { name: 'Rankings', href: '/' },
    { name: team.conference?.name || 'Independent', href: `/conference/${team.conference?.slug}` },
    { name: team.name, href: `/team/${team.slug}` }
  ]);

  // Combine schemas
  const combined = combineSchemas(teamSchema, breadcrumbSchema);

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(combined)
          }}
        />
      </Head>

      <div className="team-page">
        <img src={team.logoUrl} alt={team.name} />
        <h1>{team.name}</h1>
        <p>{team.conference?.name || 'Independent'} | {team.level}</p>
        <p>Record: {team.wins}-{team.losses}</p>
        <p>GridRank: {team.rating}</p>
        {/* Team stats and charts */}
      </div>
    </>
  );
}
```

**Result in Google:**
- Team name, logo, conference, location
- Breadcrumb navigation in SERP
- Knowledge Graph card for major programs

---

## 3. Game Prediction Page

**File:** `src/app/predictions/page.tsx`

```typescript
import { generateGameSchema, generateBreadcrumbs, combineSchemas, jsonLdScript } from '@/lib/utils/structured-data';
import { getWeekGames } from '@/lib/cfbd/games';

export default async function PredictionsPage() {
  const games = await getWeekGames(2025, getCurrentWeek());

  // Create schema for each game
  const gameSchemas = games.map(game =>
    generateGameSchema({
      homeTeam: {
        name: game.homeTeam.name,
        slug: game.homeTeam.slug,
        logoUrl: game.homeTeam.logoUrl
      },
      awayTeam: {
        name: game.awayTeam.name,
        slug: game.awayTeam.slug,
        logoUrl: game.awayTeam.logoUrl
      },
      date: game.gameDate.toISOString(),
      venue: game.venue,
      city: game.city,
      state: game.state,
      week: game.week,
      season: game.season,
      isConferenceGame: game.isConferenceGame
    })
  );

  // Breadcrumbs
  const breadcrumbs = generateBreadcrumbs([
    { name: 'Home', href: '/' },
    { name: 'Predictions', href: '/predictions' }
  ]);

  // Combine all game schemas with breadcrumbs
  const combined = combineSchemas(breadcrumbs, ...gameSchemas);

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(combined)
          }}
        />
      </Head>

      <div className="predictions-page">
        <h1>Week {getCurrentWeek()} Predictions</h1>
        {games.map(game => (
          <GamePredictionCard key={game.id} game={game} />
        ))}
      </div>
    </>
  );
}
```

**Result in Google:**
- Each game appears in search as event in Knowledge Graph
- Game name, teams, date, venue, status
- Clickable "View" action to gameday dashboard

---

## 4. Gameday Dashboard (Live Game)

**File:** `src/app/gameday/page.tsx`

```typescript
import { generateGameSchema, generateBreadcrumbs, combineSchemas, jsonLdScript } from '@/lib/utils/structured-data';
import { getGameData } from '@/lib/cfbd/games';

export default async function GamedayDashboard() {
  const gameId = getQueryParam('game');
  const game = await getGameData(gameId);

  // Game schema with completed score
  const gameSchema = generateGameSchema({
    homeTeam: {
      name: game.homeTeam.name,
      slug: game.homeTeam.slug,
      logoUrl: game.homeTeam.logoUrl
    },
    awayTeam: {
      name: game.awayTeam.name,
      slug: game.awayTeam.slug,
      logoUrl: game.awayTeam.logoUrl
    },
    date: game.gameDate.toISOString(),
    venue: game.venue,
    city: game.city,
    state: game.state,
    week: game.week,
    season: game.season,
    isConferenceGame: game.isConferenceGame,
    // Add scores if game is complete
    homeScore: game.homeScore,
    awayScore: game.awayScore
  });

  const breadcrumbs = generateBreadcrumbs([
    { name: 'Home', href: '/' },
    { name: 'Gameday', href: '/gameday' },
    { name: `${game.homeTeam.name} vs ${game.awayTeam.name}`, href: `/gameday?game=${gameId}` }
  ]);

  const combined = combineSchemas(breadcrumbs, gameSchema);

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(combined)
          }}
        />
      </Head>

      <div className="gameday-dashboard">
        {/* Live score, WP chart, play-by-play, etc. */}
      </div>
    </>
  );
}
```

**Result in Google:**
- Game card with final score (after game ends)
- Status: "EventFinished" with home/away scores
- Breadcrumb showing game hierarchy

---

## 5. Article/Methodology Page

**File:** `src/app/methodology/page.tsx`

```typescript
import { generateArticleSchema, generateFAQSchema, generateBreadcrumbs, combineSchemas, jsonLdScript } from '@/lib/utils/structured-data';

export const metadata = {
  title: 'GridRank Methodology | Gridiron Intel',
  description: 'How GridRank works: Glicko-2 algorithm, preseason priors, home field advantage',
};

export default function MethodologyPage() {
  // Article schema
  const articleSchema = generateArticleSchema({
    title: 'GridRank Methodology: How We Rank College Football',
    description: 'Deep dive into the Glicko-2 rating system powering unified college football rankings',
    datePublished: '2025-02-01T10:00:00Z',
    dateModified: '2025-02-24T14:30:00Z',
    slug: 'methodology',
    imageUrl: 'https://gridironintel.com/images/gridrank-hero.jpg',
    author: 'Gridiron Intel Team'
  });

  // FAQ schema (for "How it works" section)
  const faqSchema = generateFAQSchema([
    {
      question: 'What is GridRank?',
      answer: 'GridRank is a unified college football ranking system based on the Glicko-2 rating algorithm, which accounts for team strength, uncertainty in ratings, and performance consistency across all NCAA divisions.'
    },
    {
      question: 'How does the algorithm work?',
      answer: 'GridRank uses the Glicko-2 algorithm with margin-of-victory extension. Each team has three values: Rating (μ, team strength), Rating Deviation (RD, uncertainty), and Volatility (σ, consistency). These update after each game based on result and margin.'
    },
    {
      question: 'What is preseason rating?',
      answer: 'Preseason rating combines historical performance (50%), recruiting (25%), returning production (15%), and coaching stability (10%). It decays throughout the season as game results accumulate.'
    },
    {
      question: 'How is home field advantage calculated?',
      answer: 'Home field advantage is dynamic, varying by team and game. Base: 2.5 points + travel distance factor + altitude + crowd factor. Applied during rating updates for home teams.'
    },
    {
      question: 'What is garbage time?',
      answer: 'When margin exceeds game-phase threshold (Q2: 38+ pts, Q3: 28+ pts, Q4: 22+ pts), remaining plays are weighted 0.3x in rating updates. Large margins don\'t disproportionately affect ratings.'
    },
    {
      question: 'How do cross-divisional comparisons work?',
      answer: 'GridRank uses level-adjusted ratings. FBS baseline is 1500, FCS is 1200, D2 is 1000, D3 is 800, NAIA is 700. Comparative schedules allow ranking all teams on one scale.'
    }
  ]);

  // Breadcrumbs
  const breadcrumbs = generateBreadcrumbs([
    { name: 'Home', href: '/' },
    { name: 'Methodology', href: '/methodology' }
  ]);

  // Combine: breadcrumb + article + FAQ
  const combined = combineSchemas(breadcrumbs, articleSchema, faqSchema);

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(combined)
          }}
        />
      </Head>

      <article className="methodology-page">
        <header>
          <h1>GridRank Methodology</h1>
          <p>Published Feb 1, 2025 | Updated Feb 24, 2025</p>
        </header>

        <section>
          <h2>What is GridRank?</h2>
          <p>GridRank is a unified college football ranking system...</p>
        </section>

        <section>
          <h2>How the Algorithm Works</h2>
          <p>GridRank uses the Glicko-2 rating algorithm...</p>
        </section>

        {/* More sections */}

        <section className="faq">
          <h2>Frequently Asked Questions</h2>
          {/* FAQ items automatically marked up with schema */}
        </section>
      </article>
    </>
  );
}
```

**Result in Google:**
- Article preview with publication date and author
- FAQ accordion in search results (Google.com only)
- Featured image in rich result
- "Read More" action to full article

---

## 6. The Stack Newsletter Article

**File:** `src/app/stack/[date]/page.tsx`

```typescript
import { generateArticleSchema, generateBreadcrumbs, combineSchemas, jsonLdScript } from '@/lib/utils/structured-data';
import { getStackDgest } from '@/lib/stack/digest';

export default async function StackDigestPage({ params }: Props) {
  const digest = await getStackDigest(params.date);

  // Article schema for newsletter
  const articleSchema = generateArticleSchema({
    title: `The Stack: Week ${digest.week} Digest`,
    description: digest.topline,
    datePublished: digest.publishedAt.toISOString(),
    slug: `stack/${params.date}`,
    imageUrl: digest.featureImage,
    author: 'Gridiron Intel',
    body: digest.htmlContent
  });

  const breadcrumbs = generateBreadcrumbs([
    { name: 'Home', href: '/' },
    { name: 'The Stack', href: '/stack' },
    { name: digest.title, href: `/stack/${params.date}` }
  ]);

  const combined = combineSchemas(breadcrumbs, articleSchema);

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(combined)
          }}
        />
      </Head>

      <article className="stack-digest">
        <header>
          <h1>{digest.title}</h1>
          <time dateTime={digest.publishedAt.toISOString()}>
            {formatDate(digest.publishedAt)}
          </time>
        </header>

        {/* Digest content */}
        <div dangerouslySetInnerHTML={{ __html: digest.htmlContent }} />
      </article>
    </>
  );
}
```

**Result in Google:**
- Article appears in search with publication date
- Featured image in preview
- Breadcrumb navigation to Stack collection
- Snippet of article text in SERP

---

## 7. Conference Page

**File:** `src/app/conference/[slug]/page.tsx`

```typescript
import { generateConferenceSchema, generateBreadcrumbs, combineSchemas, jsonLdScript } from '@/lib/utils/structured-data';
import { getConferenceData } from '@/lib/cfbd/conferences';

export default async function ConferencePage({ params }: Props) {
  const conference = await getConferenceData(params.slug);

  // Conference schema
  const confSchema = generateConferenceSchema(
    conference.name,
    conference.slug,
    conference.level,
    conference.teams.length,
    conference.logoUrl
  );

  // Breadcrumbs
  const breadcrumbs = generateBreadcrumbs([
    { name: 'Home', href: '/' },
    { name: 'Conferences', href: '/' },
    { name: conference.name, href: `/conference/${conference.slug}` }
  ]);

  const combined = combineSchemas(breadcrumbs, confSchema);

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(combined)
          }}
        />
      </Head>

      <div className="conference-page">
        <h1>{conference.name}</h1>
        <p>{conference.level} | {conference.teams.length} Teams</p>
        {/* Conference standings, power rankings, heatmap, etc. */}
      </div>
    </>
  );
}
```

**Result in Google:**
- Conference card with member count
- Sport and division level
- Logo displayed in search result

---

## 8. Full-Page Integration (All Schemas)

For maximum SEO impact, combine multiple schemas on your most important pages:

```typescript
// Example: Team page with everything
import {
  generateTeamSchema,
  generateTeamRatingSnippet,
  generateStadiumSchema,
  generateBreadcrumbs,
  generateOrganizationSchema,
  combineSchemas,
  jsonLdScript
} from '@/lib/utils/structured-data';

export default async function FullTeamPage({ params }: Props) {
  const team = await getTeamData(params.slug);

  // 1. Team schema
  const teamSchema = generateTeamSchema({ /* ... */ });

  // 2. Enrich with ratings
  const ratingEnrichment = generateTeamRatingSnippet(
    team.name,
    team.rating,
    team.rank,
    team.wins,
    team.losses
  );
  const enrichedTeam = { ...teamSchema, ...ratingEnrichment };

  // 3. Stadium schema
  const stadiumSchema = generateStadiumSchema(
    team.stadium,
    team.name,
    team.city,
    team.state,
    team.metadata?.latitude,
    team.metadata?.longitude
  );

  // 4. Breadcrumbs
  const breadcrumbs = generateBreadcrumbs([...]);

  // 5. Organization (footer)
  const org = generateOrganizationSchema();

  // Combine all 5 schemas
  const combined = combineSchemas(
    breadcrumbs,
    enrichedTeam,
    stadiumSchema,
    org
  );

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(combined)
        }}
      />
    </Head>
  );
}
```

**Result in Google:**
- Team knowledge panel with logo, record, stadium location
- Stadium with map/directions
- Breadcrumb navigation
- Organization information
- Enriched snippet with rating percentile

---

## Testing Your Schemas

### 1. Google Rich Results Test
https://search.google.com/test/rich-results

Paste your JSON-LD to verify Google recognizes it.

### 2. Schema.org Validator
https://validator.schema.org/

Check for syntax and required fields.

### 3. Lighthouse SEO Audit
```bash
npx lighthouse https://gridironintel.com --view
```

Check "SEO" section for structured data recommendations.

### 4. Local Testing
```typescript
import { validateSchema } from '@/lib/utils/structured-data';

const schema = generateTeamSchema({...});
console.log(validateSchema(schema)); // true/false
```

---

## Best Practices Checklist

- [ ] Use `https://` URLs for all image and logo URLs
- [ ] Images should be at least 1200x800 pixels
- [ ] Dates must be ISO 8601 format (`YYYY-MM-DDTHH:MM:SSZ`)
- [ ] Test with Google Rich Results Test after every schema change
- [ ] Use breadcrumbs on all pages (improves SERP CTR)
- [ ] Combine schemas on important pages (maximizes rich results)
- [ ] Update `dateModified` when page content changes
- [ ] Validate schemas in TypeScript (use provided types)
- [ ] Monitor Google Search Console for "Indexed with issues"
- [ ] Allow 1-2 weeks for Google to crawl and index changes

---

## Performance Tips

1. **Cache schema generation** (ISR)
   ```typescript
   export const revalidate = 3600; // 1 hour
   ```

2. **Minify JSON in production**
   ```typescript
   const isDev = process.env.NODE_ENV === 'development';
   JSON.stringify(schema, null, isDev ? 2 : 0)
   ```

3. **Lazy load non-critical schemas**
   ```typescript
   // Load organization schema in Footer (async)
   const OrgSchema = dynamic(() => import('./OrgSchema'));
   ```

4. **Use ISR for team/game pages** (1 hour cache)
5. **Revalidate on-demand after game completion**
   ```typescript
   await revalidatePath(`/gameday?game=${gameId}`);
   ```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Google cannot reach URL" | Ensure URLs are public/crawlable, no robots.txt blocks |
| Missing image in rich result | Use `https://` URL, 1200x800+ px, common formats (jpg/png) |
| Schema shows but rich result doesn't | Wait 2+ weeks for Google crawl, try forcing crawl in GSC |
| Fields marked "yellow" in test tool | These are optional; fix only if they're important to you |
| Multiple schemas not combining | Use `combineSchemas()`, wrap in `@graph` |
| Dates showing incorrectly | Use ISO 8601: `2025-02-24T10:00:00Z` not `2/24/2025` |

---

## Further Resources

- [Schema.org Full Documentation](https://schema.org/)
- [Google Structured Data Guide](https://developers.google.com/search/docs/appearance/structured-data)
- [Rich Results Gallery](https://search.google.com/test/rich-results)
- [JSON-LD Documentation](https://json-ld.org/)
- [Glicko-2 Algorithm](https://www.glicko.net/glicko/glicko2.pdf)

---

**Last Updated:** Feb 24, 2025
**Module Location:** `src/lib/utils/structured-data.ts`
**Tests:** Run `npx tsc --noEmit src/lib/utils/structured-data.ts`
