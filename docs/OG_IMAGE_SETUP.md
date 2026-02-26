# OG Image & Favicon Setup Guide

This document describes how to integrate the OG image generation utilities and favicon assets into Gridiron Intel.

## Files Created

1. **`/src/lib/utils/og-image.ts`** — TypeScript utility module for generating SVG Open Graph images
2. **`/public/favicon.svg`** — SVG favicon (works at 16x16, 32x32, and larger)
3. **`/public/icon.svg`** — Apple touch icon / PWA icon (192x192 recommended)

## Design System Integration

All assets use the Gridiron Intel design system:
- **Background**: #0a0e17 (deep navy)
- **Card Background**: #1a1f2e
- **Accent Teal**: #00f5d4 (primary brand color)
- **Accent Purple**: #7b61ff (secondary)
- **Text Primary**: #f1f5f9
- **Text Secondary**: #94a3b8
- **Text Muted**: #475569

### Fonts (OG Images)
- **Display**: Instrument Serif (fallback: Georgia)
- **Body**: DM Sans (fallback: -apple-system/BlinkMacSystemFont)
- **Monospace**: Courier Prime (fallback: Courier New)

## OG Image Generation Functions

### `generateDefaultOG(): string`
Generic homepage/social media share image with "GridRank" branding.

```typescript
import { generateDefaultOG } from '@/lib/utils/og-image';

const svg = generateDefaultOG();
// Returns: <svg width="1200" height="630" ...>GridRank...</svg>
```

### `generateTeamOG(data: TeamOGData): string`
Team page OG image with rating, rank, and team colors.

```typescript
import { generateTeamOG, type TeamOGData } from '@/lib/utils/og-image';

const teamData: TeamOGData = {
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

const svg = generateTeamOG(teamData);
```

### `generateRankingsOG(data: RankingsOGData): string`
Rankings page OG image with top 5 teams.

```typescript
import { generateRankingsOG, type RankingsOGData } from '@/lib/utils/og-image';

const rankingsData: RankingsOGData = {
  week: 15,
  season: 2024,
  topTeams: [
    { rank: 1, name: 'Alabama', rating: 1547, level: 'FBS' },
    { rank: 2, name: 'Ohio State', rating: 1532, level: 'FBS' },
    // ...
  ],
};

const svg = generateRankingsOG(rankingsData);
```

### `generateMatchupOG(data: MatchupOGData): string`
Matchup comparison OG image with win probability.

```typescript
import { generateMatchupOG, type MatchupOGData } from '@/lib/utils/og-image';

const matchupData: MatchupOGData = {
  teamA: { name: 'Alabama', rating: 1547, primaryColor: '#9E1B32' },
  teamB: { name: 'Georgia', rating: 1521, primaryColor: '#BA0021' },
  winProbA: 0.58,
  spread: 3.5,
  date: 'Saturday, Jan 13, 2025',
};

const svg = generateMatchupOG(matchupData);
```

### `generateChaosOG(data: ChaosOGData): string`
Chaos Index game OG image.

```typescript
import { generateChaosOG, type ChaosOGData } from '@/lib/utils/og-image';

const chaosData: ChaosOGData = {
  gameTitle: 'Kansas vs Texas',
  chaosScore: 8.7,
  chaosTier: 'LEGENDARY',
  score: '45-42',
  date: 'Saturday, Nov 9, 2024',
};

const svg = generateChaosOG(chaosData);
```

### `generateArticleOG(data: ArticleOGData): string`
Article/Stack digest OG image.

```typescript
import { generateArticleOG, type ArticleOGData } from '@/lib/utils/og-image';

const articleData: ArticleOGData = {
  title: 'The College Football Playoff Committee\'s Biggest Blunders',
  subtitle: 'An analysis of controversial rankings decisions',
  date: 'February 24, 2025',
  category: 'Analysis',
};

const svg = generateArticleOG(articleData);
```

## Using OG Images with Next.js

### Option 1: Vercel `@vercel/og` Package (Recommended)

Install the package:
```bash
npm install @vercel/og
```

Create an API route to generate the OG image:

```typescript
// src/app/api/og/default/route.ts
import { ImageResponse } from '@vercel/og';

export async function GET() {
  const svg = generateDefaultOG();

  return new ImageResponse(svg, {
    width: 1200,
    height: 630,
  });
}
```

### Option 2: Static Metadata in Layout

For pages without dynamic data, use static metadata:

```typescript
// src/app/layout.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  openGraph: {
    title: 'Gridiron Intel',
    description: 'Every Team. One List.',
    images: [
      {
        url: '/og-default.svg',
        width: 1200,
        height: 630,
        alt: 'Gridiron Intel Rankings',
      },
    ],
  },
};
```

### Option 3: Dynamic Metadata for Pages

```typescript
// src/app/team/[slug]/page.tsx
import { Metadata } from 'next';
import { generateTeamOG, type TeamOGData } from '@/lib/utils/og-image';
import { prisma } from '@/lib/db/prisma';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const team = await prisma.team.findUnique({
    where: { slug: params.slug },
    include: { ranking: true, conference: true },
  });

  if (!team) return {};

  const ogData: TeamOGData = {
    teamName: team.name,
    mascot: team.mascot,
    rating: team.ranking?.rating || 0,
    ratingDeviation: team.ranking?.ratingDeviation,
    rank: team.ranking?.rank || 0,
    level: team.level as TeamOGData['level'],
    conference: team.conference?.name,
    primaryColor: team.primaryColor || undefined,
    record: team.ranking?.record,
  };

  const svgString = generateTeamOG(ogData);
  const svgBlob = Buffer.from(svgString).toString('base64');
  const svgDataUri = `data:image/svg+xml;base64,${svgBlob}`;

  return {
    title: `${team.name} Rankings`,
    openGraph: {
      title: `${team.name} Rankings`,
      images: [{ url: svgDataUri, width: 1200, height: 630 }],
    },
  };
}
```

## Favicon Setup

### Update `src/app/layout.tsx`

Add favicon links to the root layout:

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gridiron Intel',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* ... */}
    </html>
  );
}
```

### Alternative: Use `<head>` Directly

If using direct head manipulation:

```html
<head>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/icon.svg" />
  <meta name="theme-color" content="#0a0e17" />
</head>
```

### Generate Favicon Variants (Optional)

For maximum browser/device support, generate PNG/ICO versions:

```bash
npx svg2png public/favicon.svg -o public/favicon-32x32.png --width 32 --height 32
npx svg2png public/favicon.svg -o public/favicon-16x16.png --width 16 --height 16
npx svg2png public/icon.svg -o public/apple-touch-icon.png --width 180 --height 180
```

Then update `layout.tsx`:

```typescript
icons: {
  icon: [
    { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    { url: '/favicon.svg', type: 'image/svg+xml' },
  ],
  apple: '/apple-touch-icon.png',
},
```

## Design Notes

### OG Images

- **Size**: Always 1200x630px (standard for social media)
- **Format**: SVG strings (pure text, no JSX)
- **No External Fonts**: SVG OG images use system font fallbacks (Georgia, Courier New)
- **Grid Pattern**: Subtle football field grid overlay on all images
- **Color Consistency**: All colors match design system
- **Glow Effects**: Subtle shadow/glow filters enhance teal accent text
- **Monospace Numbers**: Stats and ratings use monospace font for clarity

### Favicons

- **favicon.svg**: Primary favicon for all devices (16x16+)
  - Stylized "G" in teal on navy background
  - Grid pattern for football field effect
  - Football laces detail
  - Works at any size

- **icon.svg**: Apple touch icon / PWA icon (192x192+)
  - Enhanced visual detail vs favicon
  - More prominent football laces
  - Radial gradient on "G"
  - Shadow and glow effects
  - Good for home screens and PWA manifests

## TypeScript Support

All functions and interfaces are fully typed in strict mode:

```typescript
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
} from '@/lib/utils/og-image';
```

## Performance Considerations

- **SVG Generation**: All functions are synchronous and run instantly
- **Caching**: Consider caching generated OG images if using dynamic metadata
- **Bundle Size**: OG utility is ~19KB, but typically tree-shaken in production
- **API Routes**: If using `@vercel/og`, consider caching at CDN level with proper cache headers

## Testing

To test OG images locally:

1. Generate SVG from a function
2. Save to file: `fs.writeFileSync('test-og.svg', svg)`
3. Open in browser or image viewer
4. Verify colors, text, and layout match design system

Example test:

```typescript
import { generateDefaultOG } from '@/lib/utils/og-image';
import fs from 'fs';

const svg = generateDefaultOG();
fs.writeFileSync('/tmp/og-default.svg', svg);
console.log('OG image saved to /tmp/og-default.svg');
```

## See Also

- `/docs/MASTER_PLAN.md` — Full feature spec
- `/src/types/ranking.ts` — Data types for rankings
- `/CLAUDE.md` — Project guidelines and design system
