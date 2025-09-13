ENGINEERING.md — Golden Focus Inc Standard

0) Purpose & Mantra
	•	Purpose: ship lovable MVPs fast, safe, and rankable.
	•	Mantra: small files, clear flows, tests guard polish, ship daily.

⸻

1) Non-Negotiables
	•	Files: target 150–200 LOC, hard cap ~300 LOC.
	•	Functions: one purpose per file; functions ≤80 LOC (target 20–60).
	•	Refactors: never change behavior without tests + visual diffs.
	•	Accessibility: keyboard first, focus rings visible, ARIA accurate.
	•	Performance: no jank; interactions <100ms; CLS ~0, TTI snappy.
	•	Determinism: stable data seeds for tests/snapshots.

⸻

2) Project Structure (lean & obvious)

/app                // routes + loaders only
/components         // dumb UI + small containers
/components/polish  // micro-animations, skeletons, effects
/lib                // pure logic: formatters, services, schemas
/hooks              // tiny hooks, single concern each
/state              // finite-state machines or reducers
/tests              // unit + e2e + visual snapshots
/mic-lab            // lab pages for complex UI states (all variants)


⸻

3) File & Function Rules
	•	One file = one clear responsibility.
	•	Break long components into siblings (FooView, FooControls, FooPanel).
	•	Extract logic out of JSX into hooks or /lib.
	•	Prefer composition over config flags.
	•	Kill dead code quickly; keep PRs tiny.

⸻

4) Feature Flags & Golden Baselines
	•	Ship risky work behind env flags (e.g., NEXT_PUBLIC_MIC_V2=true).
	•	Maintain a golden baseline route (e.g., /mic-lab) rendering every state/variant for snapshot testing.
	•	Never delete V1 until V2 is zero-diff in visuals + behavior.

⸻

5) Playwright Always-On (visual regression by default)

Policy
	•	Every UI with states must have a lab page and Playwright snapshot tests.
	•	CI blocks merges on Playwright failures.
	•	Updating snapshots requires reviewer sign-off with a reason.

Commands
	•	Run tests locally (UI): npx playwright test --ui
	•	Approve intentional changes: npx playwright test --update-snapshots
	•	CI headless: npx playwright test --reporter=line

Test Design
	•	Snapshot element handles by data-testid (not full page).
	•	Freeze randomness (seeded data, fixed time, deterministic animations).
	•	Wait for “final paint” (no loading shimmer) before snapshot.
	•	Cover: idle, permission, recording, processing, complete, error, variants, responsive breakpoints, focus/hover/active states, animation keyframes.

⸻

6) Testing Matrix (lean but real)
	•	Unit (Vitest): pure logic, reducers, formatters, permission branching.
	•	Component (React Testing Library): props/ARIA, keyboard flows.
	•	E2E (Playwright): happy paths + critical errors.
	•	Visual (Playwright): pixel parity on all states.
	•	A11y smoke (axe via Playwright): no critical violations.

⸻

7) Refactor Protocol (baked-in; no separate doc)
	1.	Mark golden: tag or note current good UI; ensure /mic-lab renders all states.
	2.	Pick a tiny slice (e.g., Waveform.tsx).
	3.	Extract with identical classNames/tokens/DOM order; adapters live in the orchestrator, not children.
	4.	Run: typecheck → unit → visual tests. If any diff >0.1% or a11y/perf regresses: stop and fix.
	5.	Commit: refactor(component): extract <slice> with zero-diff snapshots
	6.	Rinse and repeat. Ship only behind a flag until full parity.

⸻

8) AI Collaboration (make AI your senior IC)

System preface to paste in new AI sessions
	•	“Always preserve pixel-parity vs /mic-lab snapshots. Maintain ARIA, focus order, tokens, and performance budgets. Use small files (≤300 LOC), one purpose per file. After each change, propose tests and run visual checks. Stop on any failing diff/test.”

Working rules
	•	AI proposes a micro-plan → you approve → it executes and runs tests.
	•	AI must output: file list, reasoning, updated tests, and snapshot status.

⸻

9) Performance & UX Budgets
	•	First interaction on primary controls <100ms.
	•	No extra re-renders from prop churn (memoize, stable refs).
	•	Animations at 60fps; avoid layout thrash (transform/opacity).
	•	Waveform/visualizers: precompute frames; throttle to requestAnimationFrame.
	•	Add a tiny perf probe comparing V1 vs V2; keep a /perf-notes.md.

⸻

10) Accessibility & Keyboard
	•	Logical tab order; Escape cancels modals/recording where expected.
	•	Visible focus states; do not remove focus rings.
	•	aria-live for toasts and errors; descriptive aria-labels on icon buttons.
	•	All actions reachable via keyboard; document hotkeys in UI.

⸻

11) Git, PRs, and CI (fast & safe by default)
	•	Branching: small feature branches, one change per PR.
	•	Commits: conventional messages (feat:, fix:, refactor:).
	•	PR template requires:
	•	Visual test coverage added/updated
	•	A11y checked
	•	Intentional snapshot changes explained
	•	CI gates: typecheck, unit, e2e, Playwright visual, lint.
	•	Protect main; block merge on failing checks.

⸻

12) Errors, Logging, and Recovery
	•	Catch and toast user-visible errors with friendly copy.
	•	Log details to console in dev; to telemetry in prod (privacy-safe).
	•	Always provide a retry path; keep UI interactive during async work where possible.
	•	Never swallow exceptions silently.

⸻

13) Dependencies & Tech Debt
	•	Prefer zero-dep utilities; pin versions.
	•	Remove unused libs quickly.
	•	If a dep is added, add a line to /docs/decisions.md with reason & exit plan.
	•	Monthly debt sweep: 2–4 hours to delete cruft and tighten files.

⸻

14) i18n, SEO, and Sitemaps
	•	i18n keys return arrays for paragraphs and strings for titles; never assume map on a string.
	•	Routes locale-aware; canonical + hreflang.
	•	Generate sitemap per deploy; submit to GSC on go-live.
	•	Avoid content shifts: preload critical fonts, fixed skeleton heights.

⸻

15) Release Flow
	•	Blue-green: ship behind subdomain/flag → observe → flip apex.
	•	301 map any route changes (by locale).
	•	Remove noindex on launch; re-crawl in GSC.
	•	Post-release checklist: metrics stable, errors quiet, snapshots unchanged.

⸻

16) New Component Starter (micro-checklist)
	•	File ≤300 LOC, single purpose
	•	Lab page with all states/variants
	•	Snapshot tests for idle/hover/focus/active + breakpoints
	•	Unit tests for logic, hotkeys, branching
	•	A11y ok (axe, keyboard)
	•	Perf okay (no jank, minimal re-renders)

⸻

17) Commands You’ll Actually Use
	•	Local runner UI: npx playwright test --ui
	•	CI run locally: npx playwright test --reporter=line
	•	Approve visuals: npx playwright test --update-snapshots
	•	Focus a single spec: npx playwright test tests/micrecorder.spec.ts -g "Complete State"

⸻

18) When Something Breaks (fast triage)
	1.	Open Playwright UI → inspect Actual vs Expected vs Diff.
	2.	If legit regression → fix CSS/markup; rerun tests.
	3.	If intentional UI change → update snapshot with PR note.
	4.	If flaky → stabilize data/time/animation; never accept flaky tests.

⸻

19) Culture
	•	Ship small, ship daily.
	•	Protect polish with tests, not with fear.
	•	Prefer boring tech + elite discipline over clever hacks.
	•	Leave the campground cleaner: simpler APIs, smaller files, more tests.

⸻

20) Appendix — MicRecorder patterns (quick ref)
	•	Orchestrator thin; children pure: Waveform, Controls, TranscriptionPanel, PublishActions.
	•	State lives in useMicStateMachine (single source of truth).
	•	AudioEngine wraps permissions and recording; UI reads derived state.
	•	Deterministic waveform frames in tests; real analyser only in prod.
	•	V1 and V2 rendered side-by-side in /mic-lab until zero-diff.

⸻

One codebase. Many languages. Maximum rankings. Tiny files. Daily shipping. Visual tests as our shield.
