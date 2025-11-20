# SEO Implementation Prompt for AI Agent

**Context:** You are implementing a comprehensive SEO audit roadmap for vibelog.io, a Next.js 15 voice-first content platform. The site uses App Router, React 19, TypeScript, Supabase, and is deployed on Vercel.

**Mission:** Execute the HIGH and MEDIUM priority SEO fixes systematically to achieve 10x indexation speed and 3-5x organic traffic growth within 60 days.

---

## 🎯 PHASE 1: CRITICAL FOUNDATION (Week 1 — Execute Immediately)

### Task 1.1: Create Dynamic XML Sitemap
**Priority:** CRITICAL
**File to create:** `app/sitemap.ts`

**Requirements:**
- Implement Next.js 15 `sitemap()` export that returns `MetadataRoute.Sitemap`
- Fetch ALL published, public vibelogs from Supabase `vibelogs` table
- Join with `profiles` table to get username for URL construction
- Generate URLs in format: `https://vibelog.io/@{username}/{slug}`
- Include static pages: homepage (priority 1.0), community (0.9), about (0.5), pricing (0.6)
- Use appropriate `changeFrequency` values: daily for homepage, hourly for community, weekly for vibelogs
- Limit to 5000 vibelogs per sitemap (Google's soft limit is 50k, but keep it performant)
- Set `lastModified` to vibelog's `published_at` date
- Handle edge cases: vibelogs with `public_slug` vs `slug`, anonymous vibelogs

**After implementation:**
- Update `public/robots.txt` to add: `Sitemap: https://vibelog.io/sitemap.xml`
- Test sitemap loads at: `https://vibelog.io/sitemap.xml`
- Verify XML format is valid
- Submit sitemap to Google Search Console and Bing Webmaster Tools (provide instructions)

**Reference:** Study existing vibelog URL structure in `app/[username]/[slug]/page.tsx` lines 40-269.

---

### Task 1.2: Add Organization & WebApplication Schema to Homepage
**Priority:** CRITICAL
**File to modify:** `app/page.tsx`

**Requirements:**
- Homepage is currently a client component (`'use client'`) — add JSON-LD scripts at the end of the JSX return, before closing `</div>`
- Create TWO structured data blocks:
  1. **Organization Schema** with: name, url, logo, description, sameAs (social profiles), contactPoint
  2. **WebApplication Schema** with: name, applicationCategory, operatingSystem, offers (free tier), featureList
- Use `dangerouslySetInnerHTML` pattern consistent with existing BlogPosting schema in `app/[username]/[slug]/page.tsx:507-545`
- Ensure valid JSON-LD format (no trailing commas, proper escaping)
- Logo URL: `https://vibelog.io/logo.png` (verify this file exists, if not use `og-image.png`)

**Validation:**
- Test with Google Rich Results Test: https://search.google.com/test/rich-results
- Validate JSON-LD syntax

---

### Task 1.3: Optimize Favicon (710KB → <50KB)
**Priority:** HIGH
**File to optimize:** `public/favicon.png`

**Requirements:**
- Current favicon is 710KB — unacceptably large
- Use Sharp (already in dependencies) to resize and compress
- Target size: 180x180px for `favicon.png`, <50KB file size
- Create optimized version, replace existing file
- Verify references in `app/layout.tsx:66-72` still work
- Test loading time improvement

**Command example:**
```bash
npx sharp-cli --input public/favicon.png --output public/favicon-optimized.png --resize 180 --quality 85
mv public/favicon-optimized.png public/favicon.png
```

---

### Task 1.4: Create Missing Twitter Image
**Priority:** HIGH
**File to create:** `public/twitter-image.png`

**Requirements:**
- `app/layout.tsx:62` references `/twitter-image.png` but file doesn't exist
- Copy `public/og-image.png` (1200x630, 56KB) to `public/twitter-image.png`
- Verify Twitter card metadata in layout is correct
- Test with Twitter Card Validator: https://cards-dev.twitter.com/validator

---

## 🎯 PHASE 2: SERVER-SIDE RENDERING REFACTOR (Week 2-3)

### Task 2.1: Refactor Homepage to Server Component
**Priority:** CRITICAL
**File to refactor:** `app/page.tsx`

**Problem:** Entire homepage is `'use client'` — search engines see "Loading..." instead of content.

**Requirements:**
- Convert default export to async Server Component
- Move static content (hero, features grid) to server-rendered JSX
- Create NEW client components for interactive elements:
  - `components/creation/CreationModeSelector.tsx` (4-icon mode buttons)
  - `components/creation/CreationInterface.tsx` (conditional rendering of Text/Audio/Video/Screen creators)
- Use `<Suspense>` boundaries for:
  - Creation interface (show skeleton while loading)
  - `HomeCommunityShowcase` (show feed skeleton)
- Keep `RemixHandler` as client component (uses `useSearchParams`)
- Ensure i18n translations work with Server Components (fetch translations server-side or use next-intl's server functions)

**Pattern to follow:**
```tsx
// app/page.tsx (Server Component)
export default async function Home() {
  const translations = await getTranslations('home') // Server-side i18n

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <RemixHandlerClient /> {/* Client component */}
      </Suspense>
      <Navigation />
      <main>
        {/* Static hero - server rendered */}
        <div className="hero">{translations.heroTitle}</div>

        {/* Interactive creation - client component island */}
        <Suspense fallback={<CreationSkeleton />}>
          <CreationInterfaceClient />
        </Suspense>

        {/* Static features - server rendered */}
        <FeaturesGrid translations={translations} />

        {/* Dynamic feed - server component with data */}
        <Suspense fallback={<FeedSkeleton />}>
          <HomeCommunityShowcase />
        </Suspense>
      </main>
    </div>
  )
}
```

**Critical:** Preserve ALL existing functionality, styling, and user experience. Only change rendering strategy.

---

### Task 2.2: Refactor Community Page to Server Component
**Priority:** HIGH
**File to refactor:** `app/community/page.tsx`

**Problem:** Page is `'use client'` and fetches data client-side. Search engines can't see content.

**Requirements:**
- Convert to async Server Component
- Fetch vibelogs server-side using `createServerSupabaseClient()` (see pattern in `app/[username]/[slug]/page.tsx:40-269`)
- Remove `useEffect`, `useState` for loading/error
- Render vibelogs server-side, pass to client components only for interactive features (like, remix)
- Add pagination support (limit 50, add `?page=` param handling)
- Use `<Suspense>` for vibelog feed
- Keep `VibelogCard` as client component if it has interactions

**Benefits:** Instant indexation, 50%+ faster perceived load time, better SEO.

---

## 🎯 PHASE 3: ENHANCED STRUCTURED DATA (Week 2)

### Task 3.1: Add Breadcrumb Schema to Vibelog Pages
**Priority:** MEDIUM
**File to modify:** `app/[username]/[slug]/page.tsx`

**Requirements:**
- Add BreadcrumbList JSON-LD alongside existing BlogPosting schema (line 507-545)
- 3-level breadcrumb: Home → Author Profile → Vibelog Title
- Use `position` numbering: 1, 2, 3
- URLs:
  - Position 1: `https://vibelog.io`
  - Position 2: `https://vibelog.io/@{username}`
  - Position 3: Current vibelog URL

**Example structure:**
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://vibelog.io"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "{author.display_name}",
      "item": "https://vibelog.io/@{author.username}"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "{vibelog.title}",
      "item": "https://vibelog.io/@{author.username}/{slug}"
    }
  ]
}
```

---

### Task 3.2: Add VideoObject Schema for Vibelogs with Videos
**Priority:** MEDIUM
**File to modify:** `app/[username]/[slug]/page.tsx`

**Requirements:**
- Add CONDITIONAL VideoObject schema when `vibelog.video_url` exists
- Place after BlogPosting schema
- Include: name, description, thumbnailUrl, uploadDate, contentUrl, embedUrl
- Use vibelog's cover image as thumbnail (or fallback to og-image)
- Conditional rendering: `{vibelog.video_url && (<script...>)}`

**Reference:** Video player is rendered at lines 354-370. Schema should match this data.

---

### Task 3.3: Add Custom Metadata to About & Pricing Pages
**Priority:** MEDIUM
**Files to modify:**
- `app/about/page.tsx`
- `app/pricing/page.tsx`

**Requirements:**
- Export `metadata: Metadata` object with custom title, description, OpenGraph tags
- About page title: "About VibeLog — Voice-First Content Creation"
- About description: "Learn about VibeLog's mission to build a living web where creators focus on ideas, not tools. Voice-first AI publishing for the human internet."
- Pricing page title: "Pricing — VibeLog Plans for Creators & Agencies"
- Pricing description: "Flexible pricing for creators, influencers, and agencies. Start free, upgrade as you grow. Voice-to-content AI publishing that scales."
- Include canonical URLs for each page

**Pattern:**
```tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '...',
  description: '...',
  openGraph: {
    title: '...',
    description: '...',
    url: 'https://vibelog.io/about',
  },
  alternates: {
    canonical: 'https://vibelog.io/about',
  },
}
```

---

## 🎯 PHASE 4: CONTENT ARCHITECTURE (Week 3-4)

### Task 4.1: Implement Related Vibelogs Section
**Priority:** MEDIUM
**Files to modify:** `app/[username]/[slug]/page.tsx`

**Requirements:**
- Add "Related Vibelogs" section AFTER comments section
- Fetch 3-5 related vibelogs based on:
  1. Same author (priority 1)
  2. Shared tags (priority 2)
  3. Recent popular vibelogs (fallback)
- Use Supabase query with proper filters (is_published=true, is_public=true)
- Render as horizontal card carousel or grid
- Each card should link to vibelog with proper SEO-friendly URLs
- Track clicks for analytics

**SEO Benefit:** Internal linking, increased crawl depth, reduced bounce rate.

---

### Task 4.2: Create Topic/Tag Pages
**Priority:** MEDIUM
**Files to create:**
- `app/topics/[tag]/page.tsx`
- Update sitemap to include topic pages

**Requirements:**
- Dynamic route for tags: `/topics/ai-content`, `/topics/voice-tech`, etc.
- Server-side render list of all vibelogs with that tag
- Add pagination (50 per page)
- Generate metadata with tag name in title
- Add CollectionPage schema
- Update sitemap to include all active tags

**SEO Benefit:** Topic cluster architecture, keyword targeting, internal link hubs.

---

### Task 4.3: Add Person Schema to User Profile Pages
**Priority:** MEDIUM
**Files to locate and modify:** `app/[username]/page.tsx` (find user profile page)

**Requirements:**
- Add Person schema with: name, url, image (avatar), description (bio), sameAs (social links)
- Conditional rendering: only if profile exists
- Include author's vibelog count in description
- Link to author's vibelogs feed

---

## 🎯 PHASE 5: ADDITIONAL OPTIMIZATIONS (Week 4+)

### Task 5.1: Add FAQ Schema to FAQ Page
**Priority:** LOW-MEDIUM
**File to modify:** `app/faq/page.tsx`

**Requirements:**
- Read FAQ page structure (currently unknown)
- Add FAQPage schema with all questions/answers
- Each Q&A becomes a Question entity with acceptedAnswer

---

### Task 5.2: Add Noindex to Admin/Lab Pages
**Priority:** LOW
**Files to modify:** All pages in `app/admin/`, `app/*-lab/`

**Requirements:**
- Export metadata with `robots: { index: false, follow: false }`
- Prevents Google from indexing test/internal pages

---

### Task 5.3: Add Preconnect Headers for External APIs
**Priority:** LOW
**File to modify:** `app/layout.tsx`

**Requirements:**
- Add `<link rel="preconnect">` for:
  - Supabase API URL
  - OpenAI API (`https://api.openai.com`)
  - Any other external APIs used
- Place in `<head>` section

---

## 📋 VALIDATION CHECKLIST

After implementing each phase, validate:

**Phase 1:**
- [ ] Sitemap loads at `/sitemap.xml` and shows all vibelogs
- [ ] Robots.txt includes sitemap URL
- [ ] Organization schema validates in Google Rich Results Test
- [ ] Favicon is <50KB and displays correctly
- [ ] Twitter image exists and Twitter Card Validator passes

**Phase 2:**
- [ ] Homepage renders hero text immediately (view source shows content, not "Loading...")
- [ ] Community page shows vibelogs in view-source
- [ ] All interactive features still work (recording, remixing, etc.)
- [ ] No hydration errors in console
- [ ] Lighthouse Performance score improves

**Phase 3:**
- [ ] Breadcrumb schema validates
- [ ] VideoObject schema appears only when video_url exists
- [ ] About/Pricing pages have unique titles in search results

**Phase 4:**
- [ ] Related vibelogs section shows relevant content
- [ ] Topic pages are indexed (check GSC after 1 week)
- [ ] User profiles have Person schema

**Phase 5:**
- [ ] FAQ schema validates
- [ ] Admin pages show `noindex` in robots meta tag
- [ ] Preconnect headers appear in network tab

---

## ⚠️ CRITICAL CONSTRAINTS

1. **Zero Breaking Changes:** Do NOT break existing functionality. Test all interactive features after refactoring.
2. **Type Safety:** Maintain TypeScript strict mode. No `any` types.
3. **Performance:** Refactors must improve or maintain current performance. Monitor bundle size.
4. **Mobile-First:** All changes must work perfectly on mobile (375px width).
5. **Accessibility:** Maintain WCAG 2.1 AA compliance. Don't remove ARIA labels.
6. **Brand Consistency:** Use existing design system (Tailwind classes, color tokens like `electric`, `bg-gradient-electric`).
7. **Database Safety:** All Supabase queries must include proper filters (is_published=true, is_public=true) to avoid leaking private content.

---

## 🚀 EXECUTION ORDER

**Week 1 (Days 1-7):**
- Day 1-2: Task 1.1 (Sitemap)
- Day 3: Task 1.2 (Organization Schema)
- Day 4: Task 1.3 & 1.4 (Images)
- Day 5-7: Begin Task 2.1 (Homepage refactor)

**Week 2 (Days 8-14):**
- Day 8-10: Complete Task 2.1
- Day 11-12: Task 2.2 (Community refactor)
- Day 13-14: Task 3.1, 3.2, 3.3 (All structured data)

**Week 3 (Days 15-21):**
- Day 15-17: Task 4.1 (Related vibelogs)
- Day 18-20: Task 4.2 (Topic pages)
- Day 21: Task 4.3 (Person schema)

**Week 4 (Days 22-28):**
- Day 22-23: Task 5.1, 5.2, 5.3 (Polish)
- Day 24-25: Full QA testing
- Day 26-28: Submit to GSC/Bing, monitor indexation

---

## 📊 SUCCESS METRICS

Track these metrics weekly:

1. **Indexed Pages (GSC):** Target 1000+ indexed vibelogs by Day 30
2. **Average Position:** Track top 10 keywords, aim for position improvement
3. **Click-Through Rate:** Monitor CTR improvement from rich snippets
4. **Organic Traffic:** Target 3-5x increase by Day 60
5. **Core Web Vitals:** LCP <2.5s, CLS <0.1, INP <200ms
6. **Crawl Stats (GSC):** Reduce crawl errors to 0, increase crawl rate

---

## 🆘 TROUBLESHOOTING GUIDE

**If sitemap returns 404:**
- Ensure `app/sitemap.ts` exports a default async function named `sitemap`
- Check Next.js 15 docs for App Router sitemap convention
- Verify build succeeded without errors

**If Server Components break interactivity:**
- Wrap interactive elements in Client Components with `'use client'`
- Use `<Suspense>` boundaries to isolate client islands
- Check for hooks (useState, useEffect) in server components — move to client components

**If structured data fails validation:**
- Use https://validator.schema.org/ for detailed error messages
- Ensure proper escaping in `dangerouslySetInnerHTML`
- Check for trailing commas in JSON-LD

**If performance degrades:**
- Run `npm run analyze` to check bundle size
- Ensure Suspense boundaries prevent blocking renders
- Consider lazy loading non-critical components

---

## 🎯 FINAL DELIVERABLES

1. **Sitemap:** Live at `/sitemap.xml` with 1000+ URLs
2. **Schema Markup:** 5+ schema types across site
3. **Server-Rendered Pages:** Homepage + Community fully SSR
4. **Internal Linking:** Related vibelogs + topic pages
5. **Optimized Images:** Favicon <50KB, Twitter image present
6. **Documentation:** Updated README with SEO implementation notes

---

**Execute with precision. Scale with speed. Dominate with trust. 🌌**

When complete, run full SEO audit again to verify 100% completion of HIGH and MEDIUM priority items.
