Golden Focus Inc — ENGINEERING.md

One codebase. Many languages. Pixel-perfect. Daily shipping.

⸻

0) Purpose & Mantra
	•	Purpose: Ship lovable MVPs fast, safe, and rankable.
	•	Mantra: small files, clear flows, polish protected by tests, ship daily.

⸻

1) Non-Negotiables
	•	Files: target 150–200 LOC, max ~300 LOC.
	•	Functions: single purpose, ≤80 LOC (target 20–60).
	•	Refactors: never without unit + E2E + visual tests.
	•	Accessibility: keyboard-first, focus rings visible, ARIA accurate.
	•	Performance: interactions <100ms; smooth 60fps animations; CLS ~0.
	•	Determinism: freeze randomness (time, animations, seeded data).

⸻

2) Project Structure

/app                // routes + loaders only
/components         // dumb UI + small containers
/components/polish  // micro-animations, skeletons, effects
/lib                // pure logic: formatters, services, schemas
/hooks              // tiny hooks, single concern each
/state              // finite-state machines or reducers
/tests              // unit + e2e + visual snapshots
/lab                // lab pages for complex UI states (all variants)


⸻

3) Testing — Golden Matrix

Unit (Vitest)
	•	Reducers, hooks, services (e.g. AudioEngine).
	•	Mock APIs/MediaRecorder; assert permission flows.

Functional E2E (Playwright)
	•	Script real flows (Record → Stop → Transcript → Publish).
	•	Assert UI updates and data/network results.
	•	Always cover one happy path + one error path.

Visual Snapshots (Playwright)
	•	Snapshot by data-testid, not full page.
	•	Freeze randomness + pause animations.
	•	Cover idle, recording, processing, complete, error, responsive, hover/focus/active.

Rules
	•	Every UI change → snapshots.
	•	Every behavior change → unit + one E2E.
	•	CI blocks merge if any fail.
	•	Snapshots updated only with reviewer note + “approved-diff” label.

⸻

4) Playwright Advanced (PR Review Power)
	•	PR comments: CI auto-posts results summary + artifact links (HTML report, diff images, videos, trace.zip).
	•	Artifacts: uploaded for both failures and successes.
	•	Matrix: run tests on Chromium, WebKit, Firefox + desktop & mobile viewports.
	•	A11y: run axe checks in Playwright; block merge on critical violations.
	•	Perf budget: assert first interaction <100ms; report metrics in PR comment.
	•	Retries: retries=1 in CI only; cancel previous runs on new commits.
	•	Snapshots: element-scoped, deterministic data/time; forbid flaky.

⸻

5) Feature Flags & Golden Baselines
	•	Risky work behind env flags (e.g. NEXT_PUBLIC_MIC_V2=true).
	•	Always maintain a lab page rendering all states for golden snapshots.
	•	V1 not deleted until V2 proves zero-diff across tests.

⸻

6) Refactor Protocol
	1.	Tag golden baseline; ensure lab renders all states.
	2.	Pick one slice (e.g. Waveform.tsx).
	3.	Extract with identical DOM, tokens, classNames.
	4.	Run unit + E2E + visual. Stop if regress.
	5.	Commit: refactor(component): extract <slice> with zero-diff snapshots.
	6.	Repeat; keep V1 until parity.

⸻

7) AI Collaboration

System Snippet:
“Preserve pixel parity with lab snapshots. Maintain ARIA, focus order, tokens, perf budgets. Files ≤300 LOC, one purpose. Add/update unit + E2E + visual tests. Stop on failing diff/test.”

Workflow:
	•	AI proposes → you approve → AI extracts/tests → reports snapshot status.

⸻

8) Git, PRs, & CI
	•	Commits: conventional (feat:, fix:, refactor:).
	•	PR template must include:
	•	Visual tests updated/green
	•	Unit + E2E added/green
	•	A11y checked
	•	Reason for snapshot changes (if any)
	•	CI gates: typecheck, lint, unit, E2E, Playwright visual, a11y, perf.
	•	Merge rules: require PR comment bot + “approved-diff” label if snapshots changed.

⸻

9) Accessibility
	•	Tab order logical; Escape cancels.
	•	Focus rings visible; no removal.
	•	aria-live for toasts/errors; aria-labels on icons.
	•	Keyboard access for all actions.

⸻

10) Security Practices
	•	Input validation: all user inputs validated with Zod schemas.
	•	Output sanitization: HTML sanitized with DOMPurify before display.
	•	Authentication: JWT tokens with proper expiration and rotation.
	•	Authorization: role-based access control, least privilege principle.
	•	API security: rate limiting, CORS properly configured, no sensitive data in logs.
	•	Secrets management: never commit secrets, use environment variables.
	•	Dependencies: regular security audits, pin versions, monitor for vulnerabilities.
	•	Content Security Policy: strict CSP headers to prevent XSS.
	•	HTTPS everywhere: force SSL in production, secure cookie flags.

⸻

11) Error Handling & Observability
	•	Error boundaries: every route + complex component wrapped
	•	Structured logging: use structured format (JSON) with correlation IDs
	•	Error tracking: Sentry/similar with user context, never log PII
	•	Alerts: critical path failures trigger immediate notifications
	•	Metrics: track Core Web Vitals, API response times, error rates
	•	Dashboards: real-time health monitoring, deployment impact tracking

⸻

12) Data Architecture
	•	State: prefer URL state > React state > global state
	•	Caching: stale-while-revalidate pattern, optimistic updates
	•	Offline: graceful degradation, queue failed requests
	•	Validation: Zod schemas at boundaries (API, forms, env)
	•	Migrations: versioned schemas, backward-compatible changes

⸻

13) Dependencies
	•	Zero-dep where possible; pin versions.
	•	Log new deps in /docs/decisions.md.
	•	Monthly debt sweep.

⸻

14) i18n, SEO, & Sitemaps
	•	Keys: arrays for paragraphs, strings for titles.
	•	Canonical + hreflang for locales.
	•	Auto-generate sitemap on deploy; submit to GSC.
	•	Preload fonts; fix skeleton heights for CLS.

⸻

15) Release Flow
	•	Blue-green or flag rollouts.
	•	301 for route changes.
	•	Remove noindex at launch.
	•	Verify metrics + snapshots post-release.

⸻

16) Culture
	•	Ship small, daily.
	•	Tests protect polish.
	•	Boring tech + elite discipline.
	•	Always leave code cleaner.

⸻

✨ Golden Focus Inc rule: One codebase, many languages, daily shipping. Playwright + CI guard every pixel and behavior.

**See also**: `api.md` for API standards, `monitoring.md` for observability, `deployment.md` for release process

