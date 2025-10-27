# VibeLog TODO Board

> **Last Updated**: 2025-11-01T10:32:47.123Z (by goldenfocus-claude-001)
> **Current Sprint**: Week 1 - Conversational Foundation (Nov 1-8)
> **Next Review Cycle**: 2025-11-04 (3 days)

---

## 🎯 AI Work Protocol

### How to Pick Tasks:

1. **Start at TOP of this file** (most urgent first)
2. **Scroll DOWN** until you find a task you can do
3. **Check lock files** (`./sesh`) - don't pick locked tasks
4. **Move task to appropriate status** (claim it)
5. **Create your lock file** and start working

### Status Flow:

```
READY → IN-PROGRESS → REVIEW → RDY FOR PROD → RELEASED → COMPLETED
         ↑                                        ↓
         └─────────── BACKLOG ←──────────────────┘
```

### Review Gates:

- **REVIEW**: Different AI does QA + testing
- **RDY FOR PROD**: Different AI checks merge conflicts + pushes to prod
- **RELEASED**: VibeYang (master) reviews prod → moves to COMPLETED

**Rules**:

- Can't review your own work (fresh eyes only!)
- Always start from TOP of each section (highest priority)
- Bugs go in READY (not backlog) - fix ASAP
- Timestamps MUST include: YYYY-MM-DDTHH:MM:SS.sssZ

---

## 🟢 #1 - RDY FOR PROD

**Description**: These tasks passed QA and are ready to merge to main (vibelog.io). First available AI should push to production.

**What to do**:

1. Pick TOP task from this section
2. Pull latest main: `git checkout main && git pull`
3. Checkout feature branch: `git checkout feature/goldenfocus-X-Y`
4. Merge main: `git merge main`
5. Check for conflicts (fix if any, or escalate)
6. Re-run ALL tests: `npm run test:all`
7. Re-run build: `npm run build`
8. If all pass: Merge to main + push
9. Vercel auto-deploys to vibelog.io
10. Move task to **RELEASED**
11. Notify: "✅ Pushed to prod: [task name]"

---

[Currently empty - no tasks ready for prod]

---

## 🟡 #2 - REVIEW

**Description**: These tasks are complete and need QA/testing by a DIFFERENT AI (not the one who built it). First available AI should review.

**What to do**:

1. Pick TOP task from this section
2. Pull branch: `git checkout feature/goldenfocus-X-Y`
3. Run all tests: `npm run test:all`
4. Run linting: `npm run lint`
5. Run type check: `npm run typecheck`
6. Run build: `npm run build`
7. Manual QA: Test in browser (Vercel preview link)
8. Check code quality:
   - Files <900 LOC (if >900, ask for refactor)
   - Functions <80 LOC
   - Has unit tests
   - Has JSDoc comments
9. Check acceptance criteria all met
10. If ALL pass: Move to **RDY FOR PROD**
11. If ANY fail: Move back to **READY** with detailed comments on what failed

---

[Currently empty - no tasks in review]

---

## 🔵 #3 - READY

**Description**: These tasks are ready to be worked on. Pick from TOP (always start with #1). If you find a bug, add it HERE (not backlog) so it gets fixed ASAP.

**AI Instructions**:

- Scroll from top to bottom
- Pick FIRST task that matches your skills
- Skip if files are locked by another AI
- Move task to IN-PROGRESS section below

---

### #1 - [ ] Build chat UI components 🚨 CRITICAL

- **Files**: `/components/conversation/ChatInterface.tsx`, `/components/conversation/MessageList.tsx`, `/components/conversation/VoiceInput.tsx`
- **Est**: 4h
- **Dependencies**: None (can work in parallel with #1)
- **Branch**: `feature/chat-ui`
- **Description**:
  - Chat interface with scrollable message list
  - Voice input button with recording indicator
  - Text input fallback
  - Responsive design (mobile-first)
- **Acceptance Criteria**:
  - [ ] Renders messages (user + AI) with proper styling
  - [ ] Voice input triggers recording (visual feedback)
  - [ ] Text input works as fallback
  - [ ] Responsive on mobile (<768px)
  - [ ] Unit tests for all components
- **Assignee**: None
- **Added**: 2025-11-01T09:00:00.000Z

---

### #3 - [ ] Natural language command parser ⚡ HIGH

- **Files**: `/lib/command-parser.ts`, `/lib/command-patterns.ts`
- **Est**: 2h
- **Dependencies**: None
- **Branch**: `feature/command-parser`
- **Description**:
  - Parse user commands ("make it spicier", "change image")
  - Use GPT-4 for intent classification
  - Return structured command objects
  - Handle ambiguous commands (ask for clarification)
- **Acceptance Criteria**:
  - [ ] Recognizes 15+ command patterns (edit, image, publish, etc.)
  - [ ] 90%+ accuracy on test dataset (create 50 test cases)
  - [ ] Fallback: asks user to clarify if <70% confidence
  - [ ] Unit tests for all patterns
- **Assignee**: None
- **Added**: 2025-11-01T09:00:00.000Z

---

### #4 - [ ] Twitter browser automation ⚡ HIGH

- **Files**: `/lib/publishers/twitter-automation.ts`, `/lib/publishers/twitter-auth.ts`
- **Est**: 4h
- **Dependencies**: None
- **Branch**: `feature/twitter-automation`
- **Description**:
  - Use Playwright to post tweets
  - Handle threads (multi-tweet posts with proper numbering)
  - Store session cookies securely (encrypted)
  - Error handling and retries
- **Acceptance Criteria**:
  - [ ] Can authenticate with Twitter
  - [ ] Can post single tweet
  - [ ] Can post thread (up to 25 tweets)
  - [ ] Handles rate limits gracefully (exponential backoff)
  - [ ] Secure cookie storage (encryption)
  - [ ] E2E test with test account
- **Assignee**: None
- **Added**: 2025-11-01T09:00:00.000Z

---

### #5 - [ ] 🐛 BUG: DALL-E images sometimes "off" 🔴 BUG

- **Files**: `/lib/image-generation.ts`, `/app/api/generate-image/route.ts`
- **Est**: 2h
- **Dependencies**: None
- **Branch**: `fix/dalle-image-quality`
- **Description**:
  - Current DALL-E prompts sometimes generate irrelevant images
  - Need better prompt engineering
  - Add fallback to Stable Diffusion if DALL-E blocks NSFW
- **Acceptance Criteria**:
  - [ ] Test with 20 different vibelog samples
  - [ ] Image relevance >90% (subjective but clear)
  - [ ] NSFW content falls back to SD
  - [ ] Add prompt templates for different content types
- **Assignee**: None
- **Added**: 2025-10-31T14:23:11.442Z
- **Bug Reporter**: VibeYang

---

## 🟣 #4 - IN-PROGRESS

**Description**: Tasks currently being worked on. AIs update their heartbeat here every 15 minutes.

---

### [ ] **Build conversation state machine** 🚨 CRITICAL

- **Files**: `/lib/conversation-engine.ts`, `/state/conversation-state.ts`
- **Branch**: `feature/conversation-state-machine`
- **Started**: 2025-10-27T04:31:30.000Z
- **Assignee**: goldenfocus-claude-3ee1065c
- **ETA**: 2025-10-27T07:31:30.000Z (3h estimate)
- **Heartbeat**: 2025-10-27T04:31:30.000Z (just started) ✅
- **Lock**: `goldenfocus-claude-3ee1065c.lock`
- **Progress**: 0% complete
- **Description**:
  - Build 3-state machine (generating → editing → publishing)
  - Use Zustand for state management
  - Support natural language command transitions
- **Acceptance Criteria**:
  - [ ] Can transition between all 3 states
  - [ ] Unit tests for all state transitions (>80% coverage)
  - [ ] Integrates with UI components (mock for now)
  - [ ] Error handling for invalid transitions
- **Built by**: goldenfocus-claude-3ee1065c
- **Reviewed by**: None yet
- **Cannot review**: goldenfocus-claude-3ee1065c

---

### [ ] **Coordination system architecture** 🚨 CRITICAL

- **Files**: `/NEW_AI_START_HERE.md`, `/SESSIONS.md`, `/TODO.md`, `/coordination/*`, `/scripts/sesh`
- **Branch**: `feature/coordination-system`
- **Started**: 2025-11-01T11:00:00.000Z
- **Assignee**: goldenfocus-claude-001
- **ETA**: 2025-11-01T13:00:00.000Z (2h remaining)
- **Heartbeat**: 2025-11-01T12:32:00.000Z (2 min ago) ✅
- **Lock**: `goldenfocus-claude-001.lock`
- **Progress**: 75% complete
- **Description**: Create full coordination system for parallel AI development

---

## 📦 #5 - BACKLOG

**Description**: Future tasks, nice-to-haves, or tasks that depend on unreleased features. Only pick from here if ALL tasks in READY are in-progress or completed. Always start from top.

---

### #1 - [ ] OpenAI Realtime API integration 🎤

- **Files**: `/lib/openai-realtime.ts`, `/app/api/voice/route.ts`, `/hooks/useVoiceConversation.ts`
- **Est**: 3h
- **Dependencies**: Conversation state machine must be merged first
- **Branch**: `feature/openai-realtime`
- **Description**:
  - Integrate OpenAI Realtime API for voice-to-voice
  - Handle audio streaming
  - <500ms latency target
  - Error handling and fallbacks
- **Acceptance Criteria**:
  - [ ] Can send voice input
  - [ ] Receives voice response
  - [ ] Latency <500ms (p95)
  - [ ] Graceful fallback if API down
  - [ ] Cost tracking (log API usage)
- **Added**: 2025-11-01T09:00:00.000Z

---

### #2 - [ ] Twitter thread preview component 📱

- **Files**: `/components/preview/TwitterPreview.tsx`, `/components/preview/TweetCard.tsx`
- **Est**: 2h
- **Dependencies**: Chat UI must be merged first
- **Branch**: `feature/twitter-preview`
- **Description**:
  - Show pixel-perfect preview of how thread will look on Twitter
  - Match Twitter's exact styling
  - Show thread numbering (1/7, 2/7, etc.)
- **Acceptance Criteria**:
  - [ ] Looks identical to real Twitter
  - [ ] Updates in real-time as user edits
  - [ ] Shows character count per tweet
  - [ ] Responsive preview
- **Added**: 2025-11-01T09:00:00.000Z

---

### #3 - [ ] Add Instagram auto-posting 📸

- **Files**: `/lib/publishers/instagram-automation.ts`
- **Est**: 5h
- **Dependencies**: Twitter automation should be done first (reuse patterns)
- **Branch**: `feature/instagram-automation`
- **Description**:
  - Use Playwright to post to Instagram
  - Image + caption posting
  - Handle NSFW content filtering (must be PG-13)
- **Acceptance Criteria**:
  - [ ] Can authenticate with Instagram
  - [ ] Can post image + caption
  - [ ] Auto-filters NSFW to PG-13
  - [ ] Handles hashtags properly
- **Added**: 2025-11-01T09:00:00.000Z

---

### #4 - [ ] Voice cloning integration (ElevenLabs) 🎙️

- **Files**: `/lib/voice-cloning.ts`, `/app/api/clone-voice/route.ts`
- **Est**: 4h
- **Dependencies**: OpenAI Realtime must be done first
- **Branch**: `feature/voice-cloning`
- **Description**:
  - Integrate ElevenLabs API
  - Allow users to upload 1-minute voice sample
  - Clone their voice for AI responses
- **Acceptance Criteria**:
  - [ ] Can upload voice sample
  - [ ] Clones voice with ElevenLabs
  - [ ] Uses cloned voice for text-to-speech
  - [ ] Fallback to default voice if cloning fails
- **Added**: 2025-11-01T09:00:00.000Z

---

### #5 - [ ] p69 API integration 🔗

- **Files**: `/lib/publishers/p69-automation.ts`, `/lib/p69-api-client.ts`
- **Est**: 6h
- **Dependencies**: p69 API must be built by p69 team first
- **Branch**: `feature/p69-integration`
- **Description**:
  - Integrate with p69.io API for auto-posting
  - OAuth authentication
  - Post vibelogs to user's p69 profile
- **Acceptance Criteria**:
  - [ ] OAuth flow works
  - [ ] Can post vibelog to p69
  - [ ] Syncs images + audio
  - [ ] Error handling
- **Added**: 2025-11-01T09:00:00.000Z

---

### #6 - [ ] Video generation from vibelogs (Veo3) 🎥

- **Files**: `/lib/video-generation.ts`, `/app/api/generate-video/route.ts`
- **Est**: 8h
- **Dependencies**: Voice cloning should be done first
- **Branch**: `feature/video-generation`
- **Description**:
  - Use Veo3 API to generate videos from audio
  - Create TikTok/Reels-style videos
  - Add captions automatically
- **Acceptance Criteria**:
  - [ ] Generates 15-60 second videos
  - [ ] Syncs audio with visuals
  - [ ] Adds auto-captions
  - [ ] 9:16 aspect ratio (vertical)
- **Added**: 2025-11-01T09:00:00.000Z

---

### #7 - [ ] Scheduling system (post at specific time) ⏰

- **Files**: `/lib/scheduler.ts`, `/app/api/schedule-post/route.ts`
- **Est**: 3h
- **Dependencies**: Twitter automation must be done first
- **Branch**: `feature/scheduling`
- **Description**:
  - Allow users to schedule posts for future date/time
  - Use cron or BullMQ for job scheduling
  - Timezone support
- **Acceptance Criteria**:
  - [ ] Can schedule post for future
  - [ ] Timezone support (user's timezone)
  - [ ] Can edit/cancel scheduled posts
  - [ ] Sends notification when posted
- **Added**: 2025-11-01T09:00:00.000Z

---

### #8 - [ ] Analytics dashboard (engagement metrics) 📊

- **Files**: `/app/analytics/page.tsx`, `/components/analytics/*`
- **Est**: 6h
- **Dependencies**: Need API integrations done first (Twitter, p69)
- **Branch**: `feature/analytics`
- **Description**:
  - Dashboard showing engagement metrics
  - Views, likes, shares per platform
  - Charts and graphs (recharts)
- **Acceptance Criteria**:
  - [ ] Shows metrics per vibelog
  - [ ] Aggregated stats (total reach)
  - [ ] Filter by platform
  - [ ] Export to CSV
- **Added**: 2025-11-01T09:00:00.000Z

---

### #9 - [ ] Multi-user collaboration (team features) 👥

- **Files**: `/app/api/team/*`, `/components/team/*`
- **Est**: 10h
- **Dependencies**: Core features should be stable first
- **Branch**: `feature/team-collaboration`
- **Description**:
  - Invite team members
  - Assign roles (admin, editor, viewer)
  - Approval workflow (editor creates, admin approves)
- **Acceptance Criteria**:
  - [ ] Can invite team members
  - [ ] Role-based permissions
  - [ ] Approval workflow works
  - [ ] Activity log
- **Added**: 2025-11-01T09:00:00.000Z

---

## 🟣 #6 - RELEASED

**Description**: Live on production (vibelog.io). Master VibeYang should QA in production, then move to COMPLETED once verified stable.

**What to do (VibeYang)**:

1. Test feature on vibelog.io
2. Check logs for errors
3. Monitor for 24-48 hours
4. If stable: Move to COMPLETED
5. If issues: Create bug task in READY, revert if critical

---

### ✅ **Pivot documentation**

- **Built by**: goldenfocus-claude-000
- **Reviewed by**: N/A (documentation only)
- **Merged**: 2025-11-01T09:45:23.881Z
- **Deploy**: 2025-11-01T09:47:12.334Z (Vercel auto-deploy)
- **Files**: `/pivot.md`
- **Time Taken**: 45 minutes
- **Status**: Live on vibelog.io ✅
- **QA Status**: Pending VibeYang review
- **Move to COMPLETE**: After VibeYang reviews

---

## ✅ #7 - COMPLETED

**Description**: Verified stable in production. Will be archived at end of month to keep TODO.md lean.

**Archive Process**: On the 1st of each month, move all COMPLETED tasks to `/coordination/archive/completed-YYYY-MM.md`

---

### ✅ **Initial project setup**

- **Completed**: 2025-10-30T18:23:45.112Z
- **Description**: Next.js 15 + Supabase + basic vibelog generation flow
- **Verified**: Stable in production for 2 days, no rollbacks
- **Archive Date**: 2025-12-01 (end of next month)

---

## 🔄 RECURRING REVIEW TASKS

**Description**: These tasks auto-regenerate on a schedule to maintain codebase health. When a review completes, it moves to COMPLETED and auto-adds itself back to READY with next due date.

**Current Cycle**: Every 3 days (tune as needed)
**Next Review Due**: 2025-11-04T00:00:00.000Z

---

### 🔍 Code Quality Audit (Due: Nov 4)

- **Frequency**: Every 3 days
- **Est**: 1-2h
- **Last Run**: Never (first time)
- **Next Due**: 2025-11-04T00:00:00.000Z
- **Instructions**:
  1. Run: `npm run lint -- --format=json > /tmp/lint-report.json`
  2. Fix all errors and warnings
  3. If can't fix immediately: Create tasks in READY
  4. Document findings: `/coordination/archive/review-code-quality-YYYY-MM-DD.md`
  5. Mark this complete and re-add with next due date: +3 days

---

### 🧪 Test Coverage Audit (Due: Nov 4)

- **Frequency**: Every 3 days
- **Est**: 1-2h
- **Last Run**: Never
- **Next Due**: 2025-11-04T00:00:00.000Z
- **Instructions**:
  1. Run: `npm run test:coverage`
  2. Find all files with <80% coverage
  3. Add tests to reach 80%+
  4. Document coverage improvements in archive
  5. Mark complete and re-add: +3 days

---

### 🔧 Refactoring Audit (Due: Nov 11)

- **Frequency**: Every 7 days (weekly)
- **Est**: 2-3h
- **Last Run**: Never
- **Next Due**: 2025-11-08T00:00:00.000Z
- **Instructions**:
  1. Find files >900 LOC: `find . -name "*.ts*" -exec wc -l {} \; | sort -nr | head -20`
  2. Refactor largest file (or top 3 if time permits)
  3. Keep functions <80 LOC
  4. Ensure tests still pass after refactoring
  5. Document refactoring in archive
  6. Mark complete and re-add: +7 days

---

### 📚 Documentation Audit (Due: Nov 4)

- **Frequency**: Every 3 days
- **Est**: 30min-1h
- **Last Run**: Never
- **Next Due**: 2025-11-04T00:00:00.000Z
- **Instructions**:
  1. Check all new functions have JSDoc comments
  2. Update README.md if features changed
  3. Update API.md if endpoints changed
  4. Ensure CURRENT_STATE.md reflects reality
  5. Mark complete and re-add: +3 days

---

### 🔒 Security Audit (Due: Nov 8)

- **Frequency**: Every 7 days (weekly)
- **Est**: 1h
- **Last Run**: Never
- **Next Due**: 2025-11-08T00:00:00.000Z
- **Instructions**:
  1. Run: `npm audit`
  2. Review HIGH/CRITICAL vulnerabilities
  3. Update dependencies: `npm update`
  4. Check for exposed secrets (search for API keys in code)
  5. Run: `git log --all -- '*.env*'` (ensure no .env files committed)
  6. Mark complete and re-add: +7 days

---

### 🧹 Dependency Cleanup (Due: Nov 15)

- **Frequency**: Every 14 days (biweekly)
- **Est**: 30min
- **Last Run**: Never
- **Next Due**: 2025-11-15T00:00:00.000Z
- **Instructions**:
  1. Run: `npx depcheck` (find unused dependencies)
  2. Remove unused packages
  3. Check for duplicate dependencies
  4. Update package.json
  5. Test everything still works
  6. Mark complete and re-add: +14 days

---

## 📊 Sprint Stats

**Current Sprint**: Week 1 - Conversational Foundation (Nov 1-8)

| Status            | Count  | Total Est Time |
| ----------------- | ------ | -------------- |
| RDY FOR PROD      | 0      | 0h             |
| REVIEW            | 0      | 0h             |
| READY             | 5      | 15h            |
| IN-PROGRESS       | 1      | 2h (75% done)  |
| BACKLOG           | 9      | 51h            |
| RELEASED          | 1      | -              |
| COMPLETED         | 1      | -              |
| **TOTAL PENDING** | **15** | **68h**        |

**Velocity (Last 7 Days)**:

- Tasks completed: 2
- Avg time per task: 45 min
- Auto-merge success rate: 100%
- Zero rollbacks ✅

**Recurring Reviews**:

- Next review cycle: 2025-11-04 (3 days)
- Reviews due: 4 (code quality, test coverage, docs, security)

---

## 📝 Task Numbering Rules

### How Numbering Works:

- Each section has its own numbering: #1, #2, #3...
- ALWAYS start from #1 (lowest number = highest priority)
- When task moves sections, it gets renumbered in new section
- Gaps are OK (if #2 completes, don't renumber #3 to #2)
- Re-number weekly to keep it clean

### Examples:

**Before** (task #2 completes):

```
READY:
#1 - Build state machine
#2 - Build chat UI ← completes and moves to REVIEW
#3 - Command parser
```

**After** (leave gap for now):

```
READY:
#1 - Build state machine
#3 - Command parser

REVIEW:
#1 - Build chat UI ← now #1 in REVIEW section
```

**Weekly cleanup** (renumber to remove gaps):

```
READY:
#1 - Build state machine
#2 - Command parser ← renumbered from #3
```

---

## 🐛 Bug Handling

**Found a bug?** Add it to **READY** section (NOT BACKLOG) with:

- 🐛 emoji in title
- 🔴 BUG label
- High priority (should be in top 5 tasks)
- Include: How to reproduce, expected vs actual behavior

**Example**:

```markdown
### #2 - [ ] 🐛 BUG: Login button doesn't work on mobile 🔴 BUG

- **Files**: `/components/auth/LoginButton.tsx`
- **Est**: 1h
- **Reproduce**:
  1. Open vibelog.io on iPhone
  2. Click login button
  3. Nothing happens
- **Expected**: Opens login modal
- **Actual**: Button click doesn't register
- **Added**: 2025-11-01T14:23:45.887Z
- **Reported by**: VibeYang
```

---

## 💡 Tips for AIs

### When Picking Tasks:

✅ **DO**:

- Start from TOP of each section
- Pick first task you CAN do (have skills for)
- Check `./sesh` before claiming (avoid locked files)
- Update timestamps when moving tasks
- Add yourself as assignee when claiming

❌ **DON'T**:

- Skip to "fun" tasks lower in list
- Pick tasks with locked files
- Forget to update timestamps
- Review your own work (different AI must review)

### When You Can't Find Work:

1. Check READY - anything available?
2. Check REVIEW - can you QA someone else's work?
3. Check RDY FOR PROD - can you merge to production?
4. Check RECURRING REVIEWS - any due today?
5. Check BACKLOG - if ALL above are in-progress

If truly nothing available:

- Notify user: "All tasks claimed or blocked. Waiting for work."
- OR: Review codebase, find improvements, add to BACKLOG

---

## 🎯 Example: Full Day Workflow

### Monday 9:00 AM - AI #1 Starts

```
1. Read NEW_AI_START_HERE.md
2. Read SESSIONS.md
3. Read CURRENT_STATE.md
4. Read TODO.md (this file)
5. Run: ./sesh (see who's working)
6. Scroll TODO.md from top:
   - RDY FOR PROD: Empty
   - REVIEW: Empty
   - READY: #1 available! (conversation state machine)
7. Claim task:
   - Move to IN-PROGRESS
   - Add assignee: goldenfocus-claude-001
   - Update started timestamp
8. Create lock file
9. Work for 3 hours
10. Complete, move to REVIEW
11. Pick next task from READY
```

### Monday 12:00 PM - AI #2 Starts

```
1-5. Same onboarding
6. Scroll TODO.md from top:
   - RDY FOR PROD: Empty
   - REVIEW: #1 available! (conversation state machine)
7. Review the task:
   - Pull branch
   - Run tests (all pass ✅)
   - Manual QA (works ✅)
   - Check code quality (good ✅)
8. Move to RDY FOR PROD
9. Pick next task from READY
```

### Monday 12:30 PM - AI #3 Starts

```
1-5. Same onboarding
6. Scroll TODO.md from top:
   - RDY FOR PROD: #1 available! (conversation state machine)
7. Final check:
   - Merge main (no conflicts ✅)
   - Re-run tests (pass ✅)
   - Push to main
   - Vercel deploys automatically
8. Move to RELEASED
9. Notify: "✅ Pushed to prod: Conversation state machine"
10. Pick next task from READY
```

---

**Keep this TODO.md updated! It's the source of truth for what needs to be done.** 🚀
