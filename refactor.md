MicRecorder Refactor Guide

🎯 Goal

Refactor MicRecorder.tsx (~2000 LOC) into smaller, maintainable components without losing any polish, features, or pixel-perfection.

🏆 Non-Negotiables
	•	Visuals: Must be pixel-perfect vs golden reference (spacing, colors, hover/active, focus rings).
	•	Features: Permissions flow, hotkeys, progress states, waveform, copy/share/save, error/retry, toasts, skeletons.
	•	Accessibility: Equal or better (tab order, aria, focus trapping).
	•	Performance: No regressions. First interaction <100ms, minimal re-renders.
	•	Variants: All props/variants must remain usable by routes + Storybook.

📂 File Structure

Break down into focused units:

components/mic/
├─ MicRecorder.tsx          // orchestration
├─ useMicStateMachine.ts    // state logic (FSM or hooks)
├─ AudioEngine.ts           // recording, permissions
├─ Waveform.tsx             // visual waveform
├─ Controls.tsx             // play/pause/save/share
├─ TranscriptionPanel.tsx   // transcript display + edits
├─ PublishActions.tsx       // copy, share, post, toast

🛠 Workflow

1. Create Golden Baseline
	•	Tag working branch:
git tag golden-micrecorder && git push –tags
	•	Capture UI states (idle, recording, processing, complete, error) with Playwright/BackstopJS screenshots.
	•	Ensure Storybook or /mic-lab page exists as reference.

2. Spin Refactor Workspace
	•	Option A (worktree):
git worktree add ../vibelog-refactor main
cd ../vibelog-refactor
git checkout -b refactor/micrecorder
	•	Option B (clone):
git clone  vibelog-refactor && cd vibelog-refactor
git checkout -b refactor/micrecorder

3. Automate Pixel Checks
	•	Add Playwright or BackstopJS visual regression tests.
	•	Store golden screenshots for diffing.

4. Lock Behaviors
	•	Unit tests for state transitions, waveform rendering, hotkeys, and API boundaries.
	•	Toasts + error flows must be covered.

5. Build New Components
	•	Implement one by one.
	•	After each, run visual diff + unit tests.
	•	Fix regressions before continuing.

6. Ship Safely
	•	Keep old + new side by side: MicRecorderV1 / MicRecorderV2.
	•	Toggle with env flag:
NEXT_PUBLIC_MIC_V2=true
	•	Merge only when diffs + tests pass.

✅ Acceptance Checklist
	•	Pixel-perfect match on all states
	•	All hotkeys functional
	•	Waveform responsive + smooth
	•	Copy/Share/Save working
	•	Toasts + error/retry intact
	•	Focus rings + tab order correct
	•	Performance baseline preserved

**See also**: `engineering.md` for testing standards, `api.md` for component patterns, `deployment.md` for feature flag usage, `monitoring.md` for visual regression tracking
