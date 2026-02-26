# Structured Data Module - Complete Export Reference

Quick lookup for all exported types and functions from `structured-data.ts`.

## Type Exports (9 Interfaces)

### Input Types

```typescript
// Website schema input
interface WebsiteSchemaInput {
  baseUrl: string;
  searchUrl: string;
}

// Team schema input
interface TeamSchemaInput {
  name: string;
  mascot?: string;
  conference?: string;
  level: string;
  stadium?: string;
  city?: string;
  state?: string;
  logoUrl?: string;
  slug: string;
  rating?: number;
  wins?: number;
  losses?: number;
  athleticsUrl?: string;
}

// Game schema input
interface GameSchemaInput {
  homeTeam: { name: string; slug: string; logoUrl?: string };
  awayTeam: { name: string; slug: string; logoUrl?: string };
  date: string;  // ISO format
  venue?: string;
  city?: string;
  state?: string;
  week?: number;
  season?: number;
  isConferenceGame?: boolean;
  homeScore?: number;
  awayScore?: number;
}

// Article schema input
interface ArticleSchemaInput {
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  slug: string;
  imageUrl?: string;
  author?: string;
  body?: string;
}

// Breadcrumb item
interface BreadcrumbItem {
  name: string;
  href: string;
  position?: number;
}

// FAQ item
interface FAQItem {
  question: string;
  answer: string;
}
```

### Output Types (Schema Objects)

```typescript
// Website schema output
interface WebsiteSchema {
  "@context": "https://schema.org";
  "@type": "WebSite";
  name: string;
  url: string;
  description: string;
  potentialAction: {
    "@type": "SearchAction";
    target: string;
    "query-input": string;
  };
}

// Organization schema output
interface OrganizationSchema {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: string;
  url: string;
  logo: string;
  description: string;
  sameAs: string[];
  contactPoint: {
    "@type": "ContactPoint";
    contactType: string;
    email: string;
  };
}

// SportsTeam schema output
interface SportsTeamSchema {
  "@context": "https://schema.org";
  "@type": "SportsTeam";
  name: string;
  url: string;
  logo?: string;
  sport: "American Football";
  division?: string;
  memberOf?: {
    "@type": "SportsOrganization";
    name: string;
  };
  location?: {
    "@type": "Place";
    name: string;
    address?: {
      "@type": "PostalAddress";
      streetAddress?: string;
      addressLocality: string;
      addressRegion: string;
    };
  };
  potentialAction?: {
    "@type": "ViewAction";
    target: string;
  };
}

// SportsEvent schema output
interface SportsEventSchema {
  "@context": "https://schema.org";
  "@type": "SportsEvent";
  name: string;
  startDate: string;
  endDate?: string;
  eventStatus?: "EventScheduled" | "EventLive" | "EventFinished";
  homeTeam?: {
    "@type": "SportsTeam";
    name: string;
    logo?: string;
  };
  awayTeam?: {
    "@type": "SportsTeam";
    name: string;
    logo?: string;
  };
  location?: {
    "@type": "Place";
    name: string;
    address?: {
      "@type": "PostalAddress";
      addressLocality: string;
      addressRegion: string;
    };
  };
  potentialAction?: {
    "@type": "ViewAction";
    target: string;
  };
  result?: {
    "@type": "GamePlayAction";
    homeTeamScore?: number;
    awayTeamScore?: number;
  };
}

// Article schema output
interface ArticleSchema {
  "@context": "https://schema.org";
  "@type": "Article" | "BlogPosting";
  headline: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author?: {
    "@type": "Person" | "Organization";
    name: string;
  };
  publisher?: {
    "@type": "Organization";
    name: string;
    logo?: {
      "@type": "ImageObject";
      url: string;
    };
  };
  mainEntityOfPage?: {
    "@type": "WebPage";
    "@id": string;
  };
}

// BreadcrumbList schema output
interface BreadcrumbSchema {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>;
}

// FAQPage schema output
interface FAQPageSchema {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }>;
}
```

## Function Exports (15 Functions)

### Schema Generators (10 Functions)

#### 1. generateWebsiteSchema()
**Purpose:** Generate website schema for homepage with search action
**Signature:** `(input: WebsiteSchemaInput) => WebsiteSchema`
**Returns:** WebSite schema with sitelinks search box support
**Use Case:** Homepage to enable Google sitelinks search box

```typescript
const schema = generateWebsiteSchema({
  baseUrl: 'https://gridironintel.com',
  searchUrl: 'https://gridironintel.com/search?q={search_term}'
});
```

---

#### 2. generateOrganizationSchema()
**Purpose:** Generate organization schema for branding and contact
**Signature:** `() => OrganizationSchema`
**Returns:** Organization schema with social links and contact
**Use Case:** Footer, about pages, Knowledge Graph eligibility

```typescript
const schema = generateOrganizationSchema();
// Returns hard-coded Gridiron Intel organization info
```

---

#### 3. generateTeamSchema()
**Purpose:** Generate SportsTeam schema for team detail pages
**Signature:** `(input: TeamSchemaInput) => SportsTeamSchema`
**Returns:** SportsTeam schema with conference and stadium info
**Use Case:** Team pages, team cards, team listings

```typescript
const schema = generateTeamSchema({
  name: 'Ohio State Buckeyes',
  mascot: 'Buckeyes',
  conference: 'Big Ten Conference',
  level: 'FBS',
  stadium: 'Ohio Stadium',
  city: 'Columbus',
  state: 'OH',
  logoUrl: 'https://...',
  slug: 'ohio-state'
});
```

---

#### 4. generateGameSchema()
**Purpose:** Generate SportsEvent schema for games and predictions
**Signature:** `(input: GameSchemaInput, baseUrl?: string) => SportsEventSchema`
**Returns:** SportsEvent schema with home/away teams and location
**Use Case:** Game predictions, gameday dashboard, matchup pages

```typescript
const schema = generateGameSchema({
  homeTeam: { name: 'Ohio State', slug: 'ohio-state', logoUrl: '...' },
  awayTeam: { name: 'Michigan', slug: 'michigan', logoUrl: '...' },
  date: '2025-11-29T12:00:00Z',
  venue: 'Michigan Stadium',
  city: 'Ann Arbor',
  state: 'MI',
  week: 13,
  season: 2025,
  homeScore: 31,  // Only if game complete
  awayScore: 0    // Only if game complete
});
```

---

#### 5. generateArticleSchema()
**Purpose:** Generate Article schema for blog posts and content
**Signature:** `(input: ArticleSchemaInput, baseUrl?: string) => ArticleSchema`
**Returns:** Article schema with publication info
**Use Case:** Blog posts, The Stack newsletter, methodology pages

```typescript
const schema = generateArticleSchema({
  title: 'How GridRank Works',
  description: 'Deep dive into Glicko-2...',
  datePublished: '2025-02-24T10:00:00Z',
  dateModified: '2025-02-25T14:30:00Z',
  slug: 'gridrank-methodology',
  imageUrl: 'https://...',
  author: 'Gridiron Intel'
});
```

---

#### 6. generateBreadcrumbs()
**Purpose:** Generate BreadcrumbList schema for navigation
**Signature:** `(items: BreadcrumbItem[], baseUrl?: string) => BreadcrumbSchema`
**Returns:** BreadcrumbList schema for SERP navigation
**Use Case:** All pages for improved SERP UX

```typescript
const schema = generateBreadcrumbs([
  { name: 'Home', href: '/' },
  { name: 'Rankings', href: '/' },
  { name: 'Ohio State', href: '/team/ohio-state' }
]);
```

---

#### 7. generateFAQSchema()
**Purpose:** Generate FAQPage schema for Q&A sections
**Signature:** `(items: FAQItem[]) => FAQPageSchema`
**Returns:** FAQPage schema with questions and answers
**Use Case:** Methodology page, FAQ pages

```typescript
const schema = generateFAQSchema([
  { question: 'What is GridRank?', answer: 'A rating system...' },
  { question: 'How does it work?', answer: 'Using Glicko-2...' }
]);
```

---

#### 8. generateConferenceSchema()
**Purpose:** Generate SportsOrganization schema for conferences
**Signature:** `(name, slug, level, teamCount, logoUrl?, baseUrl?) => Record<string, unknown>`
**Returns:** SportsOrganization schema with member count
**Use Case:** Conference pages

```typescript
const schema = generateConferenceSchema(
  'Big Ten Conference',
  'big-ten',
  'FBS',
  18,
  'https://...',
  'https://gridironintel.com'
);
```

---

#### 9. generateStadiumSchema()
**Purpose:** Generate LocalBusiness schema for stadiums
**Signature:** `(name, teamName, city, state, latitude?, longitude?) => Record<string, unknown>`
**Returns:** LocalBusiness schema with location and coordinates
**Use Case:** Stadium information pages, team detail pages

```typescript
const schema = generateStadiumSchema(
  'Ohio Stadium',
  'Ohio State Buckeyes',
  'Columbus',
  'OH',
  40.0090,   // latitude (optional)
  -83.1099   // longitude (optional)
);
```

---

#### 10. generateSeasonSchema()
**Purpose:** Generate EventSeries schema for seasons
**Signature:** `(year, startDate, endDate, gameCount, baseUrl?) => Record<string, unknown>`
**Returns:** EventSeries schema with schedule info
**Use Case:** Season overview pages

```typescript
const schema = generateSeasonSchema(
  2025,
  '2025-09-01',
  '2026-01-15',
  15000
);
```

---

### Utility Functions (5 Functions)

#### 1. jsonLdScript()
**Purpose:** Render schema as JSON-LD script content
**Signature:** `(schema: Record<string, unknown>) => string`
**Returns:** JSON string ready for `<script type="application/ld+json">`
**Use Case:** Rendering schema in Next.js Head component

```typescript
const jsonStr = jsonLdScript(schema);

// In React:
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: jsonStr }}
/>
```

---

#### 2. combineSchemas()
**Purpose:** Combine multiple schemas into one @graph structure
**Signature:** `(...schemas: Record<string, unknown>[]) => Record<string, unknown>`
**Returns:** Combined schema with @graph (if multiple) or single schema
**Use Case:** Pages with multiple schema types (breadcrumb + article + org)

```typescript
const combined = combineSchemas(
  breadcrumbSchema,
  articleSchema,
  organizationSchema
);

// Renders as single @graph with all 3 schemas
```

---

#### 3. validateSchema()
**Purpose:** Validate schema structure locally
**Signature:** `(schema: Record<string, unknown>) => boolean`
**Returns:** true if valid, false if missing required fields
**Use Case:** Development/debugging validation

```typescript
if (validateSchema(mySchema)) {
  console.log('Schema is valid');
} else {
  console.error('Schema validation failed');
}
```

---

#### 4. generateTeamRatingSnippet()
**Purpose:** Generate enrichment for team schema with ratings
**Signature:** `(name, rating, rank, wins, losses) => Record<string, unknown>`
**Returns:** Object with aggregateRating and description
**Use Case:** Enhance team schema with ranking info

```typescript
const snippet = generateTeamRatingSnippet(
  'Ohio State Buckeyes',
  1523,
  1,
  11,
  1
);

const enriched = { ...teamSchema, ...snippet };
```

---

## Constants

```typescript
const BASE_URL = "https://gridironintel.com";
```

Default base URL used for all schema generation. Can be overridden in function parameters.

## Usage Summary

| Task | Function(s) |
|------|-----------|
| Homepage | `generateWebsiteSchema()` + `generateOrganizationSchema()` |
| Team page | `generateTeamSchema()` + `generateBreadcrumbs()` |
| Game page | `generateGameSchema()` + `generateBreadcrumbs()` |
| Article | `generateArticleSchema()` + `generateBreadcrumbs()` |
| FAQ page | `generateFAQSchema()` + `generateBreadcrumbs()` |
| Conference | `generateConferenceSchema()` + `generateBreadcrumbs()` |
| Stadium | `generateStadiumSchema()` |
| Season | `generateSeasonSchema()` |
| Multi-schema | `combineSchemas()` |
| Render JSON | `jsonLdScript()` |
| Validate | `validateSchema()` |
| Enrich | `generateTeamRatingSnippet()` |

## Import Statement

```typescript
import {
  // Types
  type WebsiteSchemaInput,
  type TeamSchemaInput,
  type GameSchemaInput,
  type ArticleSchemaInput,
  type BreadcrumbItem,
  type FAQItem,
  type WebsiteSchema,
  type OrganizationSchema,
  type SportsTeamSchema,
  type SportsEventSchema,
  type ArticleSchema,
  type BreadcrumbSchema,
  type FAQPageSchema,
  
  // Functions
  generateWebsiteSchema,
  generateOrganizationSchema,
  generateTeamSchema,
  generateGameSchema,
  generateArticleSchema,
  generateBreadcrumbs,
  generateFAQSchema,
  generateConferenceSchema,
  generateStadiumSchema,
  generateSeasonSchema,
  jsonLdScript,
  combineSchemas,
  validateSchema,
  generateTeamRatingSnippet,
} from '@/lib/utils/structured-data';
```

---

**Total Exports:** 27 (14 types + 13 functions)
**Module Location:** `src/lib/utils/structured-data.ts`
**Last Updated:** February 25, 2025
