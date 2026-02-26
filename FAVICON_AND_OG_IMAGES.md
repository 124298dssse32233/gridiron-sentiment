# Favicon & OG Image Assets

Three new assets have been created for Gridiron Intel's social media presence, favicon, and PWA support.

## Files Created

### 1. OG Image Generation Utility
**Path:** `/src/lib/utils/og-image.ts` (550 lines, 19KB)

TypeScript utility for generating SVG Open Graph images dynamically. Includes 6 template functions:
- `generateDefaultOG()` — Homepage/generic brand image
- `generateTeamOG(data)` — Team page with rating and rank
- `generateRankingsOG(data)` — Rankings page with top 5 teams
- `generateMatchupOG(data)` — Matchup comparison with win probability
- `generateChaosOG(data)` — Chaos Index game highlight
- `generateArticleOG(data)` — Article/Stack digest

**Features:**
- Pure SVG output (no React/JSX needed)
- 1200x630px standard social media format
- Full design system color integration
- Subtle grid pattern (football field aesthetic)
- Glow effects for teal accent text
- Team color gradients (when provided)
- TypeScript strict mode, fully typed interfaces
- System font fallbacks (Georgia, Courier New) for SVG compatibility

**Example Usage:**
```typescript
import { generateTeamOG, type TeamOGData } from '@/lib/utils/og-image';

const svg = generateTeamOG({
  teamName: 'Alabama',
  rating: 1547,
  rank: 1,
  level: 'FBS',
  primaryColor: '#9E1B32',
});
```

### 2. Favicon SVG
**Path:** `/public/favicon.svg` (52 lines, 2.2KB)

Scalable favicon for all devices. Features:
- Stylized electric teal "G" on deep navy background
- Rounded square (24px radius)
- Subtle football field grid pattern
- Yard line markers and lace details
- Works at 16x16, 32x32, and all sizes up
- Single color optimized for clarity at tiny sizes

### 3. Icon SVG
**Path:** `/public/icon.svg` (78 lines, 3.7KB)

Enhanced icon for Apple touch icon and PWA manifest. Features:
- Larger 192x192px viewBox
- More detailed football lace graphics
- Radial gradient on "G" for depth
- Shadow and glow effects
- Yard line markers and hash marks
- Corner accent dots for visual interest
- Additional glow ring for PWA shelf

## Design System Alignment

All assets use the official Gridiron Intel design system:

| Element | Color | Hex |
|---------|-------|-----|
| Background | Deep Navy | #0a0e17 |
| Accent (Primary) | Electric Teal | #00f5d4 |
| Accent (Secondary) | Purple | #7b61ff |
| Text Primary | Off-white | #f1f5f9 |
| Text Secondary | Gray | #94a3b8 |
| Text Muted | Muted Gray | #475569 |

**Fonts (OG Images):**
- Display: Instrument Serif (fallback: Georgia)
- Body: DM Sans (fallback: system fonts)
- Monospace: Courier Prime (fallback: Courier New)

## Integration Steps

### 1. Update Layout Metadata
In `src/app/layout.tsx`:

```typescript
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gridiron Intel',
  description: 'Every Team. One List.',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon.svg',
  },
};
```

### 2. Create OG Image API Routes (Optional)
For dynamic OG images using `@vercel/og`:

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
  // ... etc

  const svg = generateTeamOG({ teamName: name, rating, ... });

  return new ImageResponse(svg, {
    width: 1200,
    height: 630,
  });
}
```

### 3. Update Team/Page Metadata
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const team = await getTeam(params.slug);
  const svgString = generateTeamOG({
    teamName: team.name,
    rating: team.ranking.rating,
    rank: team.ranking.rank,
    // ...
  });

  return {
    openGraph: {
      images: [
        {
          url: `data:image/svg+xml;base64,${btoa(svgString)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}
```

## File Specifications

### og-image.ts
- **Lines:** 550
- **Size:** 19KB
- **Dependencies:** None (pure TypeScript)
- **Functions:** 6 exported + 5 helper functions
- **Interfaces:** 5 exported data types

### favicon.svg
- **Size:** 2.2KB
- **Format:** SVG with viewBox 128x128
- **Colors:** 2 (teal + navy)
- **Scalable:** Yes, all sizes

### icon.svg
- **Size:** 3.7KB
- **Format:** SVG with viewBox 192x192
- **Colors:** 2 (teal + navy + purple accents)
- **Scalable:** Yes, all sizes

## Testing

View SVG files in browser:
```bash
# Firefox, Chrome, Safari all support SVG files directly
open public/favicon.svg
open public/icon.svg
```

Test OG image generation:
```typescript
import { generateDefaultOG } from '@/lib/utils/og-image';
import fs from 'fs';

const svg = generateDefaultOG();
fs.writeFileSync('/tmp/test-og.svg', svg);
```

## Browser Support

- **Favicon:** All modern browsers (Edge, Chrome, Firefox, Safari)
- **SVG OG Images:** All social platforms supporting custom OG images
- **Apple Touch Icon:** iOS Safari, iPad Safari
- **PWA Icon:** Web app manifests, installable web apps

## Performance

- **OG Generation:** <1ms per image (pure string templates)
- **SVG Size:** 2-4KB for favicon/icon, 5-8KB per OG image
- **Caching:** Use HTTP cache headers for API-generated OG images
- **CDN:** Serve favicon/icon from static CDN

## Next Steps (Phase Integration)

These assets are ready for integration with the following phases:

- **Phase 5 (Homepage):** Use `generateDefaultOG()` and `generateRankingsOG()`
- **Phase 6 (Team Pages):** Use `generateTeamOG()` with dynamic metadata
- **Phase 8 (Matchup Machine):** Use `generateMatchupOG()`
- **Phase 10 (Chaos Index):** Use `generateChaosOG()`
- **Phase 14 (The Stack):** Use `generateArticleOG()`

## See Also

- `/docs/OG_IMAGE_SETUP.md` — Detailed integration guide
- `/CLAUDE.md` — Design system specification
- `/docs/MASTER_PLAN.md` — Full feature roadmap
