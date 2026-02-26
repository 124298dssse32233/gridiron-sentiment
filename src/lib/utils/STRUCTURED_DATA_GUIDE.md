# Structured Data (JSON-LD) Guide

Complete reference for using the `structured-data.ts` module to generate Google-optimized schema markup for Gridiron Intel.

## Overview

The `structured-data.ts` module exports helpers to generate JSON-LD schemas for:
- **WebSite** — Homepage with sitelinks search box
- **Organization** — Brand identity and contact info
- **SportsTeam** — Team detail pages with ratings
- **SportsEvent** — Game predictions, gameday, matchups
- **Article/BlogPosting** — The Stack, methodology, blog posts
- **BreadcrumbList** — Navigation hierarchy
- **FAQPage** — FAQ and methodology deep dives
- **LocalBusiness** — Stadium information
- **EventSeries** — Season overview
- **SportsOrganization** — Conference pages

All schemas validate against `schema.org` and are optimized for Google Rich Results.

## Core API

### Website Schema (Homepage)

```typescript
import { generateWebsiteSchema, jsonLdScript } from '@/lib/utils/structured-data';

// In your homepage component or Next.js Head
const schema = generateWebsiteSchema({
  baseUrl: 'https://gridironintel.com',
  searchUrl: 'https://gridironintel.com/search?q={search_term}'
});

// Render in Head
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: jsonLdScript(schema) }}
/>
```

**Rich Result:** Enables Google sitelinks search box in SERP

---

### Team Schema (Team Pages)

```typescript
import { generateTeamSchema } from '@/lib/utils/structured-data';

const teamSchema = generateTeamSchema({
  name: 'Ohio State Buckeyes',
  mascot: 'Buckeyes',
  conference: 'Big Ten Conference',
  level: 'FBS',
  stadium: 'Ohio Stadium',
  city: 'Columbus',
  state: 'OH',
  logoUrl: 'https://...',
  slug: 'ohio-state',
  rating: 1523,
  wins: 11,
  losses: 1
});

// Add rating enrichment for better snippets
import { generateTeamRatingSnippet } from '@/lib/utils/structured-data';

const enrichment = generateTeamRatingSnippet(
  'Ohio State Buckeyes',
  1523,
  1,
  11,
  1
);

const enrichedSchema = { ...teamSchema, ...enrichment };
```

**Rich Result:** Team name, logo, record, location in search results

---

### Game Schema (Gameday, Predictions, Matchups)

```typescript
import { generateGameSchema } from '@/lib/utils/structured-data';

const gameSchema = generateGameSchema({
  homeTeam: {
    name: 'Ohio State',
    slug: 'ohio-state',
    logoUrl: 'https://...'
  },
  awayTeam: {
    name: 'Michigan',
    slug: 'michigan',
    logoUrl: 'https://...'
  },
  date: '2025-11-29T12:00:00Z',
  venue: 'Michigan Stadium',
  city: 'Ann Arbor',
  state: 'MI',
  week: 13,
  season: 2025,
  isConferenceGame: true,
  // Add if game is completed:
  homeScore: 31,
  awayScore: 0
});

// For completed games, schema includes result scoring
```

**Rich Result:** Game name, teams, date, venue, and final score (if completed) in knowledge panel

---

### Article Schema (The Stack, Blog Posts, Methodology)

```typescript
import { generateArticleSchema } from '@/lib/utils/structured-data';

const articleSchema = generateArticleSchema({
  title: 'How GridRank Works: The Glicko-2 Algorithm',
  description: 'Understanding the math behind college football ratings...',
  datePublished: '2025-02-24T10:00:00Z',
  dateModified: '2025-02-25T14:30:00Z',
  slug: 'gridrank-methodology',
  imageUrl: 'https://...',
  author: 'Gridiron Intel',
  body: 'Optional: full article HTML for search engines'
});
```

**Rich Result:** Article preview with image, date, and author in search results

---

### Breadcrumb Schema (All Pages)

```typescript
import { generateBreadcrumbs } from '@/lib/utils/structured-data';

const breadcrumbSchema = generateBreadcrumbs([
  { name: 'Home', href: '/' },
  { name: 'Rankings', href: '/rankings' },
  { name: 'Big Ten', href: '/conference/big-ten' },
  { name: 'Ohio State', href: '/team/ohio-state' }
]);

// Render on every page for better SERP UX
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbSchema) }}
/>
```

**Rich Result:** Breadcrumb navigation in SERP for easier navigation

---

### FAQ Schema (Methodology, Help Pages)

```typescript
import { generateFAQSchema } from '@/lib/utils/structured-data';

const faqSchema = generateFAQSchema([
  {
    question: 'What is GridRank?',
    answer: 'GridRank is a unified college football rating system...'
  },
  {
    question: 'How is the rating calculated?',
    answer: 'GridRank uses the Glicko-2 algorithm with margin-of-victory extension...'
  },
  {
    question: 'Why does my team\'s rating change week to week?',
    answer: 'Ratings update based on game results, strength of schedule, and...'
  }
]);
```

**Rich Result:** FAQ accordion in search results (Google.com only)

---

### Conference Schema (Conference Pages)

```typescript
import { generateConferenceSchema } from '@/lib/utils/structured-data';

const confSchema = generateConferenceSchema(
  'Big Ten Conference',
  'big-ten',
  'FBS',
  18,  // team count
  'https://...'  // logo
);
```

**Rich Result:** Conference name, member count, and sport in search results

---

### Stadium Schema (Location & Directions)

```typescript
import { generateStadiumSchema } from '@/lib/utils/structured-data';

const stadiumSchema = generateStadiumSchema(
  'Ohio Stadium',
  'Ohio State Buckeyes',
  'Columbus',
  'OH',
  40.0090,   // latitude
  -83.1099   // longitude
);
```

**Rich Result:** Stadium location, directions, and coordinates for maps integration

---

### Season Schema (Season Overview)

```typescript
import { generateSeasonSchema } from '@/lib/utils/structured-data';

const seasonSchema = generateSeasonSchema(
  2025,
  '2025-09-01',
  '2026-01-15',
  15000  // total games across all divisions
);
```

**Rich Result:** Season schedule and event series in search results

---

### Organization Schema (Footer, About)

```typescript
import { generateOrganizationSchema } from '@/lib/utils/structured-data';

const orgSchema = generateOrganizationSchema();
// Returns: Gridiron Intel branding, contact, social links
```

**Rich Result:** Organization knowledge panel in search results

---

## Advanced: Combining Schemas

When a page has multiple schema types (e.g., breadcrumb + article + organization), use `combineSchemas`:

```typescript
import {
  generateBreadcrumbs,
  generateArticleSchema,
  generateOrganizationSchema,
  combineSchemas,
  jsonLdScript
} from '@/lib/utils/structured-data';

// Build each schema
const breadcrumbs = generateBreadcrumbs([...]);
const article = generateArticleSchema({...});
const org = generateOrganizationSchema();

// Combine into @graph
const combined = combineSchemas(breadcrumbs, article, org);

// Single script tag renders all three
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: jsonLdScript(combined) }}
/>
```

---

## Next.js Integration Patterns

### Option 1: Static Pages (App Router)

```typescript
// src/app/team/[slug]/page.tsx
import { generateTeamSchema, jsonLdScript } from '@/lib/utils/structured-data';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ohio State | Gridiron Intel'
  // ... other metadata
};

export default async function TeamPage({ params }: Props) {
  const team = await getTeamData(params.slug);

  const schema = generateTeamSchema({
    name: team.name,
    // ... other fields
  });

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(schema) }}
        />
      </Head>
      <TeamContent team={team} />
    </>
  );
}
```

### Option 2: Layout-Level (Root Layout)

```typescript
// src/app/layout.tsx
import { generateWebsiteSchema, generateOrganizationSchema } from '@/lib/utils/structured-data';

export default function RootLayout({ children }) {
  const websiteSchema = generateWebsiteSchema({
    baseUrl: 'https://gridironintel.com',
    searchUrl: 'https://gridironintel.com/search?q={search_term}'
  });

  const orgSchema = generateOrganizationSchema();

  return (
    <html>
      <head>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [websiteSchema, orgSchema]
          })}
        </script>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Option 3: Client Components

```typescript
// src/components/GameCard.tsx
'use client';

import { useEffect } from 'react';
import { generateGameSchema, jsonLdScript } from '@/lib/utils/structured-data';

export function GameCard({ game }: Props) {
  useEffect(() => {
    const schema = generateGameSchema({
      homeTeam: { name: game.homeTeam.name, slug: game.homeTeam.slug },
      awayTeam: { name: game.awayTeam.name, slug: game.awayTeam.slug },
      date: game.date,
      // ...
    });

    // Create and inject script tag
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = jsonLdScript(schema);
    document.head.appendChild(script);

    return () => script.remove();
  }, [game]);

  return <div>{/* Game UI */}</div>;
}
```

---

## Validation & Debugging

### Validate Schema Locally

```typescript
import { validateSchema } from '@/lib/utils/structured-data';

const schema = generateTeamSchema({...});

if (validateSchema(schema)) {
  console.log('✓ Schema is valid');
} else {
  console.error('✗ Schema validation failed');
}
```

### Test in Google Rich Results Test Tool

1. Generate schema on your page
2. Copy JSON-LD from the `<script>` tag
3. Paste into [Google Rich Results Test](https://search.google.com/test/rich-results)
4. Verify all properties are recognized

### Common Issues

| Issue | Solution |
|-------|----------|
| "Missing required field" | Check all `@context`, `@type` are present |
| Schema not appearing in SERP | Allow 1-2 weeks for Google to crawl and index |
| Wrong rich result type | Verify `@type` matches intended schema |
| Image not showing | Use `https://` URLs, min 1200x800 pixels |
| Dates invalid | Use ISO 8601 format (`2025-02-24T10:00:00Z`) |

---

## Performance Tips

1. **Use ISR (Incremental Static Regeneration)** — Cache schema generation
   ```typescript
   export const revalidate = 3600; // 1 hour
   ```

2. **Minify in Production** — JSON-LD is sent over the wire
   ```typescript
   // Use JSON.stringify with no spaces in production
   const isDev = process.env.NODE_ENV === 'development';
   JSON.stringify(schema, null, isDev ? 2 : 0)
   ```

3. **Lazy Load Non-Critical Schemas** — Load breadcrumbs/org in footer async

---

## Reference: All Exported Functions

| Function | Returns | Use Case |
|----------|---------|----------|
| `generateWebsiteSchema()` | WebsiteSchema | Homepage |
| `generateOrganizationSchema()` | OrganizationSchema | Footer, branding |
| `generateTeamSchema()` | SportsTeamSchema | Team pages |
| `generateGameSchema()` | SportsEventSchema | Games, predictions, matchups |
| `generateArticleSchema()` | ArticleSchema | Articles, The Stack, blog |
| `generateBreadcrumbs()` | BreadcrumbSchema | All pages |
| `generateFAQSchema()` | FAQPageSchema | Methodology, FAQ pages |
| `generateConferenceSchema()` | SportsOrganization | Conference pages |
| `generateStadiumSchema()` | LocalBusiness | Stadium pages |
| `generateSeasonSchema()` | EventSeries | Season overviews |
| `generateTeamRatingSnippet()` | Object | Enrich team schema |
| `jsonLdScript()` | string | Render to HTML |
| `combineSchemas()` | Object | Multi-schema pages |
| `validateSchema()` | boolean | Debug validation |

---

## Further Reading

- [Schema.org Documentation](https://schema.org/)
- [Google Structured Data Guide](https://developers.google.com/search/docs/appearance/structured-data)
- [Rich Results Gallery](https://search.google.com/test/rich-results)
- [Glicko-2 Algorithm](https://www.glicko.net/glicko/glicko2.pdf)
