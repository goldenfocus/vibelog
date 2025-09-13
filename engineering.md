Purpose: ship lovable MVPs fast, safe, and rankable.
Mantra: Small files. Clear flows. Ship first, polish later.

⸻

0) Operating System
	•	MVP before polish. Core path → ship → refine behind flags.
	•	Tiny, reversible changes. One feature per PR.
	•	Protect polish. Visual magic lives in /components/polish/.

⸻

1) Structure & Size
	•	Max ~300 LOC per file (target 150–200).
	•	Max ~80 LOC per function (target 20–60).
	•	Single responsibility per file.
	•	Components: UI-only (no fetch/side-effects).
	•	Hooks: one job per hook; name useX.
	•	Folders
	•	app/ routes & layouts
	•	components/ dumb UI
	•	features/<domain>/ smart comps, hooks, services
	•	lib/ utils, flags, config, constants
	•	i18n/ translations & helpers
	•	types/ shared types
	•	tests/ unit + smoke

⸻

2) Refactor Protocol (AI-safe)
	1.	Snapshot: git add -A && git commit -m "chore: snapshot pre-refactor".
	2.	Branch: refactor/<thing>.
	3.	Ask AI for file split plan first; freeze logic; keep *.legacy.tsx.
	4.	Validate each split (typecheck + run + visual diff).
	5.	If drift: revert first, then iterate smaller.
	6.	Never refactor + add features in the same PR.

⸻

3) i18n Rules (Multi-language)
	•	URL policy: /{locale}/... for all public routes.
Examples: /en/user/yanlovez, /es/user/yanlovez
	•	System segments stay English (/user, /post, /record).
	•	Slugs translate (marketing & posts) via slugByLocale.
	•	Handles/IDs are global (never localized).
	•	Metadata per locale: <title>, <meta>, Open Graph, JSON-LD inLanguage.
	•	hreflang for all siblings + x-default.
	•	Sitemaps: one per locale + index sitemap (see SEO/AIO).
	•	Redirects: detect language only on / (cookie). Never auto-redirect if locale present.
	•	Testing: 404 when locale missing; snapshot key pages per locale.

⸻

4) Coding Rules
	•	TypeScript strict; no any leaks.
	•	Constants in lib/constants.ts.
	•	Async: try/catch + typed Result<T,E> or error boundary.
	•	Accessibility: labels, roles, keyboard nav; no div-buttons.
	•	Styling: Tailwind + shadcn UI; no heavy inline style objects.
	•	Imports: absolute @/; avoid cycles.

⸻

5) SEO & AIO (Search Engine + AI Optimization)

5.1 Classic SEO
	•	Titles: < 60 chars, keyword first.
	•	Descriptions: unique, action-led (120–160 chars).
	•	Headings: one <h1>; logical <h2> structure.
	•	Images: descriptive alt, lazy-load, compressed.
	•	Canonical: set on every page (self-canonical unless consolidated).
	•	Internal links: every page linked from at least one parent; related-post blocks.
	•	Schema.org JSON-LD: Organization, ProfilePage, Article (with author, datePublished, inLanguage).
	•	Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms.
	•	Robots: block staging/beta; allow prod.

5.2 AI-Era AIO (for Google/Perplexity/LLM crawlers)
	•	Structured writing: short paragraphs, bullets, FAQs per post.
	•	FAQs: per page Q&A block (high snippet win rate).
	•	Author/E-E-A-T: real profile pages with bio, socials, expertise.
	•	Multi-format outputs: summary, key takeaways, quotes (improves AI chunking).
	•	Freshness cadence: refresh top posts monthly; surface last updated date.
	•	Multilingual parity: no thin translations; equal content quality per locale.
	•	OG Images: auto-generated per post for CTR; include title + brand.
	•	Embeddings (optional): semantic related posts and site search to boost engagement.

5.3 Sitemaps (multi-locale)
	•	Generate and submit a dynamic sitemap per locale (/{locale}/sitemap.xml) plus an index sitemap to ensure full coverage of all languages and posts.
	•	Include marketing pages, posts (all localized slugs), profiles, and key listing pages.
	•	Update on deploy and on publish events; ping Google/Bing.
	•	Exclude noindex routes and staging.

⸻

6) Performance Budget
	•	Route JS < 150KB (gzip) per page.
	•	Images next-gen; next/image with defined sizes.
	•	Cache headers: static public, max-age=31536000, immutable; HTML no-store where needed.
	•	Avoid blocking JS; stream where possible (Next.js RSC).

⸻

7) Security & Privacy
	•	HTTP headers: CSP (strict), X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.
	•	Sanitize user content; encode everywhere.
	•	Secrets only via env (typed in env.mjs); never commit.
	•	GDPR basics: cookie consent for analytics; DSR contact in footer.

⸻

8) Analytics & Observability
	•	Vercel Analytics + one product analytics (Plausible/GA4).
	•	Event funnel: record → transcribe → edit → publish → share.
	•	Error tracking: Sentry (frontend + edge).
	•	Uptime: Vercel checks; alert on 5xx spikes.

⸻

9) Testing
	•	Unit: utils + core hooks.
	•	Smoke (Playwright): home, record, transcribe, publish, switch locale.
	•	Visual snapshots: polish comps (equalizer, loaders).
	•	Pre-commit: lint, format, typecheck.

⸻

10) Feature Flags & Environments
	•	Flags in lib/flags.ts; unfinished work gated.
	•	Staging/beta: password or token + noindex.
	•	Config via env.mjs per environment.

⸻

11) Git & PR Discipline
	•	Branches: feat/*, fix/*, refactor/*, chore/*, docs/*.
	•	Conventional commits; PR < 300 lines.
	•	UI PRs include before/after GIF.

⸻

12) Recovery & Rollback
	•	Hourly snapshots: chore: wip snapshot.
	•	Keep *.legacy.tsx until stable replacement shipped.
	•	If AI breaks code: revert instantly; reapply in small pieces.
	•	Maintain scratch/ for experiments (never shipped).

⸻

13) MicRecorder Split (golden pattern)
	•	features/recorder/MicRecorder.tsx (orchestrator < 200 LOC)
	•	features/recorder/hooks/useRecorder.ts
	•	features/recorder/hooks/useWaveform.ts
	•	components/polish/AudioEqualizer.tsx (props-only, versioned)
	•	features/recorder/services/transcribe.ts
	•	features/recorder/types.ts

⸻

14) Deploy & Redirects
	•	Blue-green: beta.vibelog.io → measure → flip apex when ready.
	•	301 map for any route changes (locale-aware).
	•	Remove noindex on go-live; submit index sitemap in GSC.

⸻

15) Ship Rhythm
	•	Daily: small PRs to main.
	•	Weekly: polish sprint (animations, microcopy).
	•	Monthly: refactor window with strict protocol.

⸻

One codebase. Many languages. Maximum rankings. Tiny files. Ship daily.
