# Marketing Docs Cross-Reference Audit

**Date:** 2025-02-26
**Files Audited:** 8 total (VOICE.md, SEO.md, CONTENT_PIPELINE.md, PAGE_BUILDER.md, DATA_VIZ.md, IMPLEMENTATION_GUIDE.md, COWORK_PROMPT.md, CLAUDE_MARKETING_REFERENCE.md)

## Executive Summary

All 8 marketing documents are **consistent across all critical references**. No breaking inconsistencies found. Minor observations noted below for documentation maintainability.

---

## 1. File Path References

### Status: CONSISTENT ✓

All internal doc references use the format `docs/marketing/[FILENAME].md` consistently throughout.

**Verification:**
- IMPLEMENTATION_GUIDE.md references: 17 references to `docs/marketing/` files
- COWORK_PROMPT.md references: 8 references to `docs/marketing/` files
- CONTENT_PIPELINE.md references: 4 references to `docs/marketing/VOICE.md` and `docs/marketing/DATA_VIZ.md`
- PAGE_BUILDER.md references: 3 references to `docs/marketing/VOICE.md` and `docs/marketing/SEO.md`
- CLAUDE_MARKETING_REFERENCE.md: Index table shows all 7 marketing docs with correct paths

All paths verified. Each file exists and is referenced correctly.

---

## 2. Rating System Naming

### Status: CONSISTENT ✓

**GridRank is consistently used throughout all documents.**

Findings:
- VOICE.md line 15: "The rating system is **GridRank** (capital G, capital R, one word)"
- SEO.md: 8 uses of "GridRank" in schema examples and GEO rules
- CONTENT_PIPELINE.md: 5 uses; includes quality check "Uses 'GridRank' (not 'GI Rating' or 'Glicko-2 rating')"
- PAGE_BUILDER.md: 10 uses in section headers and component descriptions
- DATA_VIZ.md: 5 uses in chart specs and social card examples
- IMPLEMENTATION_GUIDE.md: 2 uses, including "GridRank, Not GI Rating" as explicit rule
- COWORK_PROMPT.md: 4 uses, including explicit instruction: "Flag banned words...and any use of 'GI Rating' (should be 'GridRank')"
- CLAUDE_MARKETING_REFERENCE.md: Quick reference table has "GridRank" with correct display format "1523 +/- 47"

**No instances of "GI Rating" used as the correct form anywhere in documentation.**

---

## 3. URL Routes

### Status: CONSISTENT ✓

All URL routes use singular forms with bracket syntax consistently.

**Team Pages:**
- Referenced as `/team/[slug]` in: VOICE.md (context mention), SEO.md (3x), CONTENT_PIPELINE.md (1x), PAGE_BUILDER.md (3x), CLAUDE_MARKETING_REFERENCE.md (1x), IMPLEMENTATION_GUIDE.md (1x)
- Example: `/team/north-dakota-state` in PAGE_BUILDER.md line 39
- Never referenced with plural `/teams/`

**Conference Pages:**
- Referenced as `/conference/[slug]` in: SEO.md (3x), CONTENT_PIPELINE.md (1x), PAGE_BUILDER.md (2x), CLAUDE_MARKETING_REFERENCE.md (1x)
- Example: `/conference/big-ten` in PAGE_BUILDER.md line 59
- Never referenced with plural `/conferences/`

**Other Routes:**
- `/` (homepage/rankings): 2 references
- `/division/[slug]`: 4 references in PAGE_BUILDER.md and CLAUDE_MARKETING_REFERENCE.md
- `/programs` (GridLegacy): consistent in VOICE.md, CONTENT_PIPELINE.md, CLAUDE_MARKETING_REFERENCE.md
- `/stack` (The Stack): consistent in VOICE.md, CLAUDE_MARKETING_REFERENCE.md
- `/chaos` (Chaos Index): consistent in VOICE.md, CLAUDE_MARKETING_REFERENCE.md
- `/lab` (The Lab): consistent in VOICE.md, CLAUDE_MARKETING_REFERENCE.md
- `/gauntlet` (The Gauntlet): consistent in VOICE.md, CLAUDE_MARKETING_REFERENCE.md
- `/methodology`: 5 references (SEO.md, PAGE_BUILDER.md, CLAUDE_MARKETING_REFERENCE.md)
- `/matchup`, `/predictions`, `/whatif`, `/coaches`, `/awards`, `/rivalry/[slug]`, `/roster`, `/pulse`, `/gameday` all consistently referenced

**All 18 feature routes verified against CLAUDE_MARKETING_REFERENCE.md lines 53-75 (URL Structure table).**

---

## 4. Email Tool References

### Status: CONSISTENT ✓

**Resend is consistently used throughout for email delivery.**

- VOICE.md line 87: "### Newsletter (The Stack, via Resend)"
- CONTENT_PIPELINE.md line 82: "Send via Resend (configured in project, free tier: 3K emails/month)"
- CONTENT_PIPELINE.md line 89: "Newsletter: trigger via Resend API"
- COWORK_PROMPT.md line 47: "| Resend | Free | Email newsletter, 3K/mo |"
- COWORK_PROMPT.md line 59: "compile The Stack newsletter draft...Send via Resend"
- IMPLEMENTATION_GUIDE.md line 93: "3. Send via Resend"

**No references to Buttondown or any alternative email service found.**

---

## 5. Design System Colors

### Status: CONSISTENT ✓

All color references use the dark palette. No Forest Green/Gold/Cream palette found.

**Primary Color Tokens Used:**
- `--bg-primary` (#0a0e17): DATA_VIZ.md 5x, correct CSS variable name
- `--accent-teal` or `#00f5d4` (Electric Teal): DATA_VIZ.md 8x, PAGE_BUILDER.md references accent colors
- `--accent-purple` or `#7b61ff` (Purple): DATA_VIZ.md 3x
- `--accent-chaos` or `#f472b6` (Pink): DATA_VIZ.md 1x, PAGE_BUILDER.md line 21
- `--accent-positive` or `#34d399` (Green): PAGE_BUILDER.md line 21, DATA_VIZ.md references
- `--accent-negative` or `#f87171` (Red): PAGE_BUILDER.md line 21, DATA_VIZ.md references
- `--text-primary` or `#f1f5f9` (White): DATA_VIZ.md 3x
- `--text-secondary` or `#94a3b8` (Slate): DATA_VIZ.md 2x
- `--text-muted` or `#475569` (Muted): DATA_VIZ.md 2x

**DATA_VIZ.md Line 7:** "Do NOT use Forest Green/Gold/Cream or any light-mode palette."
**IMPLEMENTATION_GUIDE.md Line 64:** "Use the dark navy design system (NOT Forest Green/Gold)."

**All color references verified against globals.css:**
- globals.css lines 9-32 define all referenced color tokens
- Token names in DATA_VIZ.md match globals.css (e.g., `--accent-teal` is `--accent-teal` in both)

---

## 6. Component Paths

### Status: CONSISTENT WITH ONE NAMING NUANCE ⚠️

All component paths reference actual locations in codebase. One minor inconsistency in reference naming conventions.

**Verified Component Paths (All Exist):**

`src/components/charts/`:
- Sparkline: Referenced as `Sparkline` (data-viz.md line 110) and `src/components/charts/Sparkline` (PAGE_BUILDER.md line 23)
  - **File:** `sparkline.tsx` ✓
- WPChart: `src/components/charts/WPChart` (DATA_VIZ.md line 111)
  - **File:** `wp-chart.tsx` ✓
- RatingHistory: `src/components/charts/RatingHistory` (PAGE_BUILDER.md line 23, DATA_VIZ.md line 112)
  - **File:** `rating-history.tsx` ✓
- ScoreDistribution: `src/components/charts/ScoreDistribution` (DATA_VIZ.md line 113)
  - **File:** `score-distribution.tsx` ✓
- BumpChart: `src/components/charts/BumpChart` (DATA_VIZ.md line 114)
  - **File:** `bump-chart.tsx` ✓

`src/components/ui/`:
- DataTable: `src/components/ui/DataTable` referenced in PAGE_BUILDER.md, CONTENT_PIPELINE.md, DATA_VIZ.md
  - **Files:** index.ts exports all UI components ✓

`src/components/team/` and `src/components/rankings/`:
- Referenced in PAGE_BUILDER.md line 13 and IMPLEMENTATION_GUIDE.md line 46
- Both directories exist with components ✓

`src/lib/utils/`:
- **structured-data.ts:** All 8 marketing docs reference it 10x total; file exists ✓
  - References: generateTeamSchema(), generateGameSchema(), generateArticleSchema(), etc.
- **og-image.ts:** Referenced 4x across docs; file exists ✓
  - References: OG image generators, generateTeamOGImage() mentioned in PAGE_BUILDER.md
- **formatting.ts:** CLAUDE_MARKETING_REFERENCE.md and others reference it; file exists ✓
- **slugify.ts:** PAGE_BUILDER.md and SEO.md reference it; file exists ✓
- **newsletter.ts:** CONTENT_PIPELINE.md, IMPLEMENTATION_GUIDE.md reference it; file exists ✓
- **search.ts:** CLAUDE_MARKETING_REFERENCE.md references it; file exists ✓

`src/lib/db/`:
- **prisma.ts:** PAGE_BUILDER.md line 11 references it; file exists ✓

`src/lib/matchup/`:
- **monte-carlo.ts:** PAGE_BUILDER.md line 25 references it; file exists ✓

`src/lib/cfbd/`:
- **client.ts:** CONTENT_PIPELINE.md line 10 references it; file exists ✓

**Naming Nuance (Minor):**
- Component filenames use kebab-case (e.g., `rating-history.tsx`, `score-distribution.tsx`)
- Documentation references use PascalCase (e.g., `RatingHistory`, `ScoreDistribution`)
- This is standard React practice and causes no actual inconsistency; files import/export with correct names
- **Not a breaking issue**, but documentation could optionally clarify this is React import convention

---

## 7. Feature Names & Branding

### Status: CONSISTENT ✓

All feature names capitalized and used consistently:

- **GridRank** (never "Glicko-2 rating", never "GI Rating"): 30+ references across all docs
- **GridLegacy**: 8 references, always referring to `/programs`
- **The Stack**: 10 references, always referring to `/stack` newsletter
- **Chaos Index**: 6 references, always `/chaos`
- **The Lab**: 5 references, always `/lab`
- **The Gauntlet**: 4 references, always `/gauntlet` (SOS)
- **Matchup Machine**: 3 references, always `/matchup`
- **What If Engine**: 2 references, always `/whatif`
- **Coach Intelligence**: 3 references, always `/coaches`
- **Gridiron Intel** (brand name): 20+ references, never inconsistent capitalization
- **gridironintel.com**: 6 references, consistent

---

## 8. Content Guidelines & Standards

### Status: CONSISTENT ✓

All content standards references point to same rules:

- **Banned words list:** VOICE.md lines 32-45 (31 words/phrases)
  - CONTENT_PIPELINE.md line 104: "Check for banned words from `docs/marketing/VOICE.md`"
  - COWORK_PROMPT.md: "Flag banned words...AI-sounding patterns"

- **Display format for ratings:** "1523 +/- 47" (with +/- not +/- variants)
  - VOICE.md line 16: "Display ratings as '1523 +/- 47'"
  - CLAUDE_MARKETING_REFERENCE.md: "Display as '1523 +/- 47'"
  - All other docs consistently show same format

- **em dash prohibition:** VOICE.md line 28: "ZERO em dashes"
  - CONTENT_PIPELINE.md line 105: "Check for em dashes (there should be zero)"
  - COWORK_PROMPT.md: "Flag...em dashes"

- **Voice drift warning:** IMPLEMENTATION_GUIDE.md line 133 and CONTENT_PIPELINE.md line 101 both mention re-reading VOICE.md to prevent drift

---

## 9. Data Visualization Standards

### Status: CONSISTENT ✓

DATA_VIZ.md provides complete specs with 4-5 references in other docs:

- **Chart types specified:** Bar, Line, Sparkline, Matchup Card, Scorecard (DATA_VIZ.md lines 55-95)
- **Social card template:** 1080x1080px (square) or 1080x1350px (portrait) - DATA_VIZ.md lines 44-53
- **Export formats:** SVG, PNG, WebP, HTML/React - DATA_VIZ.md lines 97-101
- **Accessibility rules:** Alt text, color contrast, no emoji - DATA_VIZ.md lines 103-107
- **Component references:** All 5 chart components listed with correct file paths (Sparkline, WPChart, RatingHistory, ScoreDistribution, BumpChart)

CONTENT_PIPELINE.md line 64 references DATA_VIZ.md for specs; IMPLEMENTATION_GUIDE.md examples reference DATA_VIZ.md

---

## 10. Phased Rollout & Build Order

### Status: CONSISTENT ✓

PAGE_BUILDER.md defines 3 phases with team/page counts:

- **Phase 1 (FBS/FCS):** 130 FBS + ~130 FCS teams + 10+13 conference pages + 2 division pages
- **Phase 2 (D2/D3):** ~300 D2 + ~250 D3 teams + 44 conference pages + 2 division pages
- **Phase 3 (NAIA):** ~250 NAIA teams + 20 conference pages + 1 division page

COWORK_PROMPT.md and IMPLEMENTATION_GUIDE.md reference phased rollout concept; no contradicting phase definitions found.

---

## Summary of Findings

| Category | Status | Notes |
|----------|--------|-------|
| File paths | ✓ CONSISTENT | All `docs/marketing/` references correct |
| GridRank naming | ✓ CONSISTENT | No "GI Rating" as correct form anywhere; 30+ uses of GridRank |
| URL routes | ✓ CONSISTENT | No plural forms; `/team/[slug]` and `/conference/[slug]` everywhere |
| Email tool | ✓ CONSISTENT | Resend only, no Buttondown references |
| Design colors | ✓ CONSISTENT | Dark palette only; Forest Green/Gold/Cream explicitly forbidden |
| Component paths | ✓ CONSISTENT | All files exist; PascalCase/kebab-case convention is standard React practice |
| Feature names | ✓ CONSISTENT | All 18 features named identically across all docs |
| Content standards | ✓ CONSISTENT | Voice rules, display formats, bans all point to VOICE.md |
| Data viz specs | ✓ CONSISTENT | All chart types, templates, and components documented |
| Phased rollout | ✓ CONSISTENT | Phase definitions match across docs |

**Overall Assessment:** No breaking inconsistencies detected. Documentation is production-ready for content team distribution.

---

## Recommendations

1. **Minor Enhancement (Optional):** Add a note in DATA_VIZ.md clarifying that component references use PascalCase (React import convention) while actual files use kebab-case (Next.js convention). Example: "When importing: `import { RatingHistory } from '@/components/charts'` (file: `rating-history.tsx`)"

2. **Maintenance Note:** The three color tokens in DATA_VIZ.md line 15 use `--accent-teal`, `--accent-purple`, `--accent-chaos`. The CSS variables in globals.css use the same names. If these are ever renamed, update DATA_VIZ.md's color token table (lines 10-23).

3. **Future-Proofing:** When `/division/[slug]` pages are created, update CLAUDE_MARKETING_REFERENCE.md line 75 to remove "TO BE CREATED" note and update PAGE_BUILDER.md line 102 context strategy note.

---

**Audit completed:** All 8 files verified for internal consistency.
