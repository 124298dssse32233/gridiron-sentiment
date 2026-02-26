# Gridiron Intel OG Assets — Quick Reference

Fast lookup for using OG image generation and favicon assets.

## File Locations

```
src/lib/utils/
├── og-image.ts                    # Main utility (550 lines)
└── og-image-examples.ts           # 12 example functions

public/
├── favicon.svg                    # 128x128 favicon
└── icon.svg                       # 192x192 PWA icon

docs/
└── OG_IMAGE_SETUP.md              # Full integration guide

Root/
├── FAVICON_AND_OG_IMAGES.md       # Asset overview
└── OG_ASSETS_SUMMARY.txt          # Complete summary
```

## Import Examples

```typescript
// Import main functions
import {
  generateDefaultOG,
  generateTeamOG,
  generateRankingsOG,
  generateMatchupOG,
  generateChaosOG,
  generateArticleOG,
} from '@/lib/utils/og-image';

// Import types
import type {
  TeamOGData,
  RankingsOGData,
  MatchupOGData,
  ChaosOGData,
  ArticleOGData,
} from '@/lib/utils/og-image';

// Import examples
import { ogExamples } from '@/lib/utils/og-image-examples';
```

## Function Quick Reference

### generateDefaultOG()
Generic homepage image. No parameters needed.

```typescript
const svg = generateDefaultOG();
// Returns SVG string 1200x630px
```

**Use Cases:**
- Homepage `/`
- Generic social share
- Fallback OG image
- Marketing pages

---

### generateTeamOG(data: TeamOGData)
Team page with rating, rank, and colors.

```typescript
const svg = generateTeamOG({
  teamName: 'Alabama',
  mascot: 'Crimson Tide',
  rating: 1547,
  ratingDeviation: 42,    // Optional
  rank: 1,
  level: 'FBS',           // 'FBS' | 'FCS' | 'D2' | 'D3' | 'NAIA'
  conference: 'SEC',      // Optional
  primaryColor: '#9E1B32', // Optional (team color)
  record: '12-0',         // Optional
});
```

**Use Cases:**
- Team detail pages `/team/[slug]`
- Team comparison
- Roster pages
- Coach profiles

---

### generateRankingsOG(data: RankingsOGData)
Rankings page showing top 5 teams.

```typescript
const svg = generateRankingsOG({
  week: 15,               // Optional
  season: 2024,
  topTeams: [
    { rank: 1, name: 'Alabama', rating: 1547, level: 'FBS' },
    { rank: 2, name: 'Ohio State', rating: 1532, level: 'FBS' },
    // ... up to 5 teams
  ],
});
```

**Use Cases:**
- Rankings page `/`
- Weekly rankings
- All-time rankings
- Conference standings

---

### generateMatchupOG(data: MatchupOGData)
Two teams with win probability and spread.

```typescript
const svg = generateMatchupOG({
  teamA: {
    name: 'Alabama',
    rating: 1547,
    primaryColor: '#9E1B32', // Optional
  },
  teamB: {
    name: 'Georgia',
    rating: 1521,
    primaryColor: '#BA0021', // Optional
  },
  winProbA: 0.58,             // 0.0 - 1.0
  spread: 3.5,                // Optional
  date: 'Saturday, Jan 13',   // Optional
});
```

**Use Cases:**
- Matchup Machine `/matchup`
- Game predictions
- Weekly previews
- Head-to-head comparison

---

### generateChaosOG(data: ChaosOGData)
Game highlight with chaos score and tier.

```typescript
const svg = generateChaosOG({
  gameTitle: 'Kansas vs Texas',
  chaosScore: 8.7,
  chaosTier: 'LEGENDARY',     // 'LEGENDARY' | 'EPIC' | 'CHAOS' | 'WEIRD' | 'NORMAL'
  score: '45-42',
  date: 'Saturday, Nov 9',    // Optional
});
```

**Use Cases:**
- Chaos Index `/chaos`
- Game highlights
- Upset alerts
- Chaotic games coverage

---

### generateArticleOG(data: ArticleOGData)
Article or digest with title and date.

```typescript
const svg = generateArticleOG({
  title: 'The Playoff Committee\'s Biggest Blunders',
  subtitle: 'An analysis of controversial rankings',  // Optional
  date: 'February 24, 2025',
  category: 'Analysis',       // Optional
});
```

**Use Cases:**
- Articles
- Blog posts
- The Stack `/stack`
- Weekly digests
- News pages

---

## Color Reference

### Design System Colors

| Variable | Hex | Use Case |
|----------|-----|----------|
| bgPrimary | #0a0e17 | Main background |
| bgCard | #1a1f2e | Card backgrounds |
| accentTeal | #00f5d4 | Primary accent (brand) |
| accentPurple | #7b61ff | Secondary accent |
| accentChaos | #f472b6 | Chaos elements (pink) |
| accentWarning | #fbbf24 | Warnings (amber) |
| accentPositive | #34d399 | Positive (green) |
| accentNegative | #f87171 | Negative (red) |
| textPrimary | #f1f5f9 | Main text |
| textSecondary | #94a3b8 | Secondary text |
| textMuted | #475569 | Muted text |

### Level Badge Colors

| Level | Color |
|-------|-------|
| FBS | #00f5d4 (teal) |
| FCS | #7b61ff (purple) |
| D2 | #fbbf24 (amber) |
| D3 | #34d399 (green) |
| NAIA | #94a3b8 (gray) |

### Chaos Tier Colors

| Tier | Color |
|------|-------|
| LEGENDARY | #f472b6 (pink) |
| EPIC | #fbbf24 (amber) |
| CHAOS | #00f5d4 (teal) |
| WEIRD | #7b61ff (purple) |
| NORMAL | #94a3b8 (gray) |

---

## Layout Metadata Integration

### Simple Static Setup

```typescript
// src/app/layout.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gridiron Intel',
  description: 'Every Team. One List.',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'Gridiron Intel',
    description: 'Every Team. One List.',
    images: ['/og-default.svg'],
  },
};
```

### Dynamic Metadata (Teams)

```typescript
// src/app/team/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const team = await getTeam(params.slug);
  const svg = generateTeamOG({
    teamName: team.name,
    rating: team.ranking?.rating || 0,
    rank: team.ranking?.rank || 0,
    level: team.level,
    conference: team.conference?.name,
    primaryColor: team.primaryColor,
  });

  return {
    title: `${team.name} - GridRank`,
    openGraph: {
      images: [{
        url: `data:image/svg+xml;base64,${btoa(svg)}`,
        width: 1200,
        height: 630,
      }],
    },
  };
}
```

### With Vercel OG Package

```bash
npm install @vercel/og
```

```typescript
// src/app/api/og/team/route.ts
import { ImageResponse } from '@vercel/og';
import { generateTeamOG } from '@/lib/utils/og-image';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const rating = parseInt(searchParams.get('rating') || '0');
  const rank = parseInt(searchParams.get('rank') || '0');
  const level = searchParams.get('level') || 'FBS';

  const svg = generateTeamOG({
    teamName: name || 'Team',
    rating,
    rank,
    level: level as any,
  });

  return new ImageResponse(svg, {
    width: 1200,
    height: 630,
  });
}
```

---

## Testing OG Images Locally

### Save to File

```typescript
import { generateTeamOG } from '@/lib/utils/og-image';
import fs from 'fs';

const svg = generateTeamOG({
  teamName: 'Alabama',
  rating: 1547,
  rank: 1,
  level: 'FBS',
});

fs.writeFileSync('/tmp/og-team.svg', svg);
console.log('Saved to /tmp/og-team.svg');
```

### Test in Browser

```typescript
// Open in browser console
const svg = generateTeamOG({ ... });
const blob = new Blob([svg], { type: 'image/svg+xml' });
const url = URL.createObjectURL(blob);
window.open(url);
```

### Share Preview Tester

Use these tools to preview how OG images appear on social platforms:

- **Facebook**: https://developers.facebook.com/tools/debug/
- **Twitter**: https://cards-dev.twitter.com/validator
- **LinkedIn**: https://www.linkedin.com/post-inspector/
- **Discord**: Send test message with your URL

---

## Common Patterns

### Generate All Team OG Images (Batch)

```typescript
const allTeams = await prisma.team.findMany();
const ogImages = allTeams.map(team => ({
  teamId: team.id,
  svg: generateTeamOG({
    teamName: team.name,
    rating: team.ranking?.rating || 0,
    rank: team.ranking?.rank || 0,
    level: team.level as any,
    primaryColor: team.primaryColor,
  }),
}));
```

### Cache OG Images in Redis

```typescript
import { redis } from '@/lib/db/redis';

async function getCachedTeamOG(teamId: string): Promise<string> {
  const cached = await redis.get(`og:team:${teamId}`);
  if (cached) return cached;

  const team = await getTeam(teamId);
  const svg = generateTeamOG({ ... });

  await redis.setex(`og:team:${teamId}`, 3600, svg);
  return svg;
}
```

### Format Rating Display

```typescript
// Inside generateTeamOG, ratings show as:
// "1547 ± 47"  where 47 = 1.96 * RD

function formatRating(rating: number, rd?: number): string {
  const confidence = rd ? Math.round(1.96 * rd) : 0;
  return confidence ? `${Math.round(rating)} ± ${confidence}` : Math.round(rating).toString();
}
```

---

## Performance Tips

1. **Cache Dynamic OG Images**: Use Redis with 1-hour TTL
2. **Generate at Request Time**: OG images are <1ms to generate
3. **Static Favicons**: Serve from CDN with 24h cache
4. **Batch Generation**: Run in background jobs for bulk updates
5. **Monitor Size**: Keep OG images under 8KB

---

## Favicon Sizes (Optional PNG Variants)

Generate PNG fallbacks for maximum compatibility:

```bash
# Install svg2png
npm install -D svg2png

# Generate variants
npx svg2png public/favicon.svg -o public/favicon-16x16.png --width 16
npx svg2png public/favicon.svg -o public/favicon-32x32.png --width 32
npx svg2png public/icon.svg -o public/apple-touch-icon.png --width 180
```

Update metadata:

```typescript
icons: {
  icon: [
    { url: '/favicon-16x16.png', sizes: '16x16' },
    { url: '/favicon-32x32.png', sizes: '32x32' },
    { url: '/favicon.svg', type: 'image/svg+xml' },
  ],
  apple: '/apple-touch-icon.png',
},
```

---

## Troubleshooting

### OG Image Not Showing on Social Media

1. Check SVG is valid: Open in browser first
2. Verify data:image URL encoding: Use `btoa()` not `encodeURIComponent()`
3. Check metadata: Ensure `openGraph.images` is set
4. Test with debugger: Facebook/Twitter share debuggers

### Favicon Not Showing

1. Clear browser cache (hard refresh)
2. Check file exists at `/public/favicon.svg`
3. Verify metadata in layout.tsx
4. Test with different browsers

### Performance Issues

1. Check cache headers for API routes
2. Reduce Redis calls with batch processing
3. Consider static pre-generation for top teams
4. Monitor SVG file sizes

---

## See Also

- `/docs/OG_IMAGE_SETUP.md` — Full integration guide
- `/FAVICON_AND_OG_IMAGES.md` — Asset details
- `/src/lib/utils/og-image-examples.ts` — Code examples
- `/CLAUDE.md` — Design system

---

Last Updated: February 25, 2025
Status: Ready for Production
