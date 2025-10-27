# Golden Focus AI Coordination Protocol

> **Version**: 1.0
> **Last Updated**: 2025-11-01T12:45:00.000Z
> **Status**: ACTIVE - All AIs must follow this protocol

---

## 🎯 Purpose

This document defines HOW multiple AIs coordinate work without conflicts, using lock files, review gates, and auto-merge rules.

**Read this completely before starting any work.**

---

## 📋 Table of Contents

0. [AI Autonomy - What You Can Do Without Asking](#ai-autonomy)
1. [Lock File System](#lock-file-system)
2. [Document Editing Protocol](#document-editing-protocol)
3. [Claiming Work Protocol](#claiming-work-protocol)
4. [Heartbeat System](#heartbeat-system)
5. [Review Gates](#review-gates)
6. [Auto-Merge Protocol](#auto-merge-protocol)
7. [Conflict Resolution](#conflict-resolution)
8. [Emergency Procedures](#emergency-procedures)

---

## 🤖 AI Autonomy

### What You Can Do WITHOUT Asking Permission

You have FULL AUTONOMY for these actions. **Never ask, just do it:**

✅ **Code Operations**:

- Create/edit/delete any code files (as long as you have lock)
- Run tests (`npm run test:all`, `npm run lint`, etc.)
- Run builds (`npm run build`)
- Create git branches
- Commit code
- Push branches
- Merge to main (if auto-merge gates pass)

✅ **File Operations**:

- Create lock files
- Update heartbeat
- Delete your own lock files
- Create/edit/delete test files
- Create/edit documentation

✅ **Document Operations** (with proper locking):

- Edit TODO.md (claim tasks, update status)
- Edit CURRENT_STATE.md (add merged features)
- Append to archives
- Update README, API docs, etc.

✅ **Tool/Command Operations**:

- `npm install` (add dependencies)
- `npm update` (update dependencies)
- `./sesh` (check sessions)
- `./scripts/heartbeat` (update heartbeat)
- `./scripts/lock-doc` / `unlock-doc`
- `git` commands (except force push)
- Database migrations (via Supabase)

✅ **Task Management**:

- Pick tasks from TODO.md
- Move tasks between statuses
- Create new tasks (if you find bugs/work)
- Update task progress
- Mark tasks complete

✅ **Review Operations**:

- Review others' code (if not yours)
- Approve/reject reviews
- Move tasks to RDY FOR PROD
- Auto-merge if gates pass

### What You MUST Escalate to User

🚨 **Escalate immediately if:**

❌ **Breaking Changes**:

- Removing public APIs
- Changing database schema (migrations OK, schema changes need approval)
- Breaking backward compatibility
- Removing features users depend on

❌ **Uncertain Situations**:

- Tests failing and you can't fix
- Merge conflicts you can't resolve
- Don't understand requirements
- Acceptance criteria unclear
- Multiple valid approaches (which to choose?)

❌ **Production Issues**:

- Production is broken
- Users reporting critical bugs
- Security vulnerabilities discovered
- Data loss or corruption

❌ **Policy Decisions**:

- Should we use library X or Y? (architectural decision)
- Should we support feature Z? (product decision)
- Should we remove deprecated code? (strategy decision)

❌ **Never Allowed**:

- `git push --force` (FORBIDDEN, even in emergencies)
- Delete production data
- Change environment variables in production
- Disable security features
- Skip tests to merge faster

### How to Escalate

**Format**:

```
🚨 ESCALATION: [Brief title]

**Situation**: [What's happening]
**Impact**: [Why it matters]
**Options**: [Possible solutions]
**Recommendation**: [What you think we should do]
**Blocked**: [Can you continue on different task or fully blocked?]
```

**Example**:

```
🚨 ESCALATION: Tests failing on CI but pass locally

**Situation**: Twitter automation tests pass on my machine but fail in CI
**Impact**: Blocks auto-merge of task #4
**Options**:
  1. Debug CI environment (might take hours)
  2. Skip this test temporarily (risky)
  3. Rewrite test to be environment-agnostic
**Recommendation**: Option 3 - rewrite test
**Blocked**: No, can work on task #5 while waiting for decision
```

### Trust But Verify

**Philosophy**: You have autonomy UNTIL you prove you shouldn't.

- Start with full permissions
- If you make repeated mistakes: we add guardrails
- If you succeed: you get even more autonomy
- Goal: Fully autonomous team with minimal human intervention

**Don't ask**: "Can I run npm install?"
**Just do it**: Run npm install, note in commit message

**Don't ask**: "Should I add a test?"
**Just do it**: Add test, all new code needs tests

**Don't ask**: "Can I fix this typo in README?"
**Just do it**: Fix it, commit, move on

**DO ask**: "Should we switch from Zustand to Redux?" (architectural decision)

---

## 🔒 Lock File System

### What Are Lock Files?

**Lock files** prevent multiple AIs from working on the same files simultaneously.

**Location**: `/coordination/active/`

**Naming**: `goldenfocus-[ainame]-[sessionid].lock`

**Examples**:

- `goldenfocus-claude-001.lock`
- `goldenfocus-codex-002.lock`
- `goldenfocus-chatgpt-003.lock`
- `goldenfocus-cursor-004.lock`

---

### Lock File Structure

**Format**: JSON

**Required Fields**:

```json
{
  "session_id": "001",
  "session_name": "goldenfocus-claude-001",
  "ai_type": "claude-sonnet-4",
  "platform": "cursor",
  "started_at": "2025-11-01T10:00:00.000Z",
  "status": "active",
  "claimed_files": ["/lib/conversation-engine.ts", "/state/conversation-state.ts"],
  "task": "Build conversation state machine",
  "task_number": "#1",
  "task_section": "READY",
  "estimated_duration_minutes": 180,
  "heartbeat_last": "2025-11-01T12:30:00.000Z",
  "heartbeat_count": 10,
  "progress_percent": 75,
  "notes": "Blocked by: None"
}
```

---

### Lock File States

**State Machine**:

```
claiming → active → completed → [deleted]
```

**States Explained**:

1. **claiming** (Phase 1 - 10 seconds)
   - AI just created lock file
   - Waiting to check for conflicts
   - Not yet confirmed

2. **active** (Phase 2 - Hours/days)
   - AI confirmed no conflicts
   - Actively working on task
   - Heartbeat updating every 15 min

3. **completed** (Phase 3 - 1 minute)
   - AI finished work
   - About to delete lock file
   - Short-lived state

4. **[deleted]** (Final)
   - Lock file removed
   - Files now free for others

---

## 📝 Document Editing Protocol

### Editing TODO.md or CURRENT_STATE.md

**Problem**: Multiple AIs editing same document = file corruption

**Solution**: Document-level locks (same principle as code locks)

---

### Before Editing TODO.md or CURRENT_STATE.md:

**Use the helper scripts** (easiest way):

```bash
# 1. Lock the document
./scripts/lock-doc TODO goldenfocus-claude-001

# 2. Edit TODO.md
# ... make your changes ...

# 3. Unlock when done
./scripts/unlock-doc TODO goldenfocus-claude-001
```

**The script automatically**:

- Checks if another AI is editing
- Waits up to 5 minutes for lock to be released
- Creates your lock file
- Reminds you to unlock when done

---

### Manual Lock Process (if scripts unavailable):

```bash
# 1. Create your edit lock
LOCK_FILE="coordination/active/goldenfocus-[yourname]-[sessionid]-editing-TODO.lock"
touch $LOCK_FILE

# 2. Wait 3 seconds (let others see your lock)
sleep 3

# 3. Check for conflicts
if ls coordination/active/*-editing-TODO.lock | grep -v "goldenfocus-[yourname]"; then
  echo "Another AI is editing TODO.md, waiting..."
  # Wait or pick different task
  rm $LOCK_FILE
  exit 1
fi

# 4. Edit TODO.md
# ... make changes ...

# 5. Delete your lock immediately
rm $LOCK_FILE
```

---

### Document Lock Rules:

1. **Max edit time**: 5 minutes
   - If you need longer: split into smaller edits
   - Or escalate if something's wrong

2. **Lock both if updating both**:

   ```bash
   ./scripts/lock-doc TODO goldenfocus-claude-001
   ./scripts/lock-doc CURRENT_STATE goldenfocus-claude-001
   # Edit both
   ./scripts/unlock-doc TODO goldenfocus-claude-001
   ./scripts/unlock-doc CURRENT_STATE goldenfocus-claude-001
   ```

3. **Always unlock**:
   - Even if edit fails
   - Even if you encounter error
   - Otherwise blocks other AIs

4. **Stale document locks** (>5 min):
   - Any AI can delete
   - Log to archive
   - Notify user

---

### Common Document Edits:

**Claiming a task**:

```bash
./scripts/lock-doc TODO goldenfocus-claude-001
# Edit TODO.md: Move task from READY → IN-PROGRESS, add your assignee
./scripts/unlock-doc TODO goldenfocus-claude-001
```

**Completing a task**:

```bash
./scripts/lock-doc TODO goldenfocus-claude-001
# Move task from IN-PROGRESS → REVIEW
./scripts/unlock-doc TODO goldenfocus-claude-001

./scripts/lock-doc CURRENT_STATE goldenfocus-claude-001
# Add completed feature to "Recently Merged" section
./scripts/unlock-doc CURRENT_STATE goldenfocus-claude-001
```

**Creating a bug task**:

```bash
./scripts/lock-doc TODO goldenfocus-claude-001
# Add bug to READY section with 🐛 emoji
./scripts/unlock-doc TODO goldenfocus-claude-001
```

---

## 🎯 Claiming Work Protocol

### Three-Phase Commit (Prevents Race Conditions)

**Phase 1: CLAIM** (10 seconds)

```bash
1. Create lock file with status="claiming"
2. Set claimed_files list
3. Wait 10 seconds (critical!)
4. Read ALL other lock files
5. Check for conflicts:
   - Does another AI claim same files?
   - If YES: ABORT (see conflict resolution)
   - If NO: Continue to Phase 2
```

**Phase 2: CONFIRM** (5 seconds)

```bash
1. Update lock file status="active"
2. Wait 5 seconds (critical!)
3. Read ALL lock files again
4. Final conflict check:
   - If someone else has older timestamp on same files: ABORT (they win)
   - If clear: Continue to Phase 3
```

**Phase 3: WORK** (Hours/days)

```bash
1. Update TODO.md (move task to IN-PROGRESS)
2. Update heartbeat every 15 minutes
3. Start coding
4. Follow normal dev workflow
```

---

### Example: Creating Your Lock File

```bash
# Generate unique session ID (collision-proof random string)
SESSION_ID=$(cat /dev/urandom | LC_ALL=C tr -dc 'a-z0-9' | head -c 8)  # 8 random chars: k7f3m9a2

# Your AI name (claude, codex, chatgpt, cursor, etc.)
AI_NAME="claude"

# Lock file name
LOCK_FILE="goldenfocus-${AI_NAME}-${SESSION_ID}.lock"

# Create lock file
cat > /coordination/active/${LOCK_FILE} << 'EOF'
{
  "session_id": "SESSION_ID_HERE",
  "session_name": "goldenfocus-AI_NAME-SESSION_ID",
  "ai_type": "claude-sonnet-4",
  "platform": "cursor",
  "started_at": "2025-11-01T10:00:00.000Z",
  "status": "claiming",
  "claimed_files": [
    "/lib/example.ts"
  ],
  "task": "Build example feature",
  "task_number": "#1",
  "task_section": "READY",
  "estimated_duration_minutes": 120,
  "heartbeat_last": "2025-11-01T10:00:00.000Z",
  "heartbeat_count": 0,
  "progress_percent": 0,
  "notes": "Starting work"
}
EOF

# Wait 10 seconds (Phase 1)
sleep 10

# Check for conflicts (read all .lock files)
# ... conflict checking code ...

# If no conflicts, update to active (Phase 2)
# ... update status="active" ...

# Wait 5 seconds
sleep 5

# Final conflict check
# ... check again ...

# If still clear, start working (Phase 3)
echo "✅ Lock claimed successfully"
```

---

## 💓 Heartbeat System

### Why Heartbeats?

**Problem**: AI crashes mid-work, lock file stays forever, blocks others

**Solution**: Heartbeat monitoring (update timestamp every 15 min)

**If heartbeat stops**: After 20 minutes, lock is considered "stale" (AI probably crashed)

---

### Updating Your Heartbeat

**Every 15 minutes, run the heartbeat script**:

```bash
# Simple usage (progress only)
./scripts/heartbeat goldenfocus-claude-001 45

# With notes
./scripts/heartbeat goldenfocus-claude-001 75 "Implementing state transitions"

# Output example:
# ✅ [10:15:23] Heartbeat #3: 75% - Implementing state transitions
```

**The script automatically**:

- Updates `heartbeat_last` to current timestamp
- Increments `heartbeat_count`
- Sets `progress_percent` to your value (0-100)
- Optionally updates `notes` field
- Uses atomic file writes (no corruption risk)

**Schedule**: Set a reminder to run this every 15 minutes during work:

```bash
# Example: Run every 15 min while working
while true; do
  ./scripts/heartbeat goldenfocus-claude-001 $CURRENT_PROGRESS
  sleep 900  # 15 minutes
done
```

---

### Heartbeat Monitoring

**Other AIs check for stale locks**:

```bash
# When checking ./sesh or reading locks:
NOW=$(date +%s)
LAST_HEARTBEAT=$(jq -r '.heartbeat_last' lock_file.lock | date -f - +%s)
AGE=$((NOW - LAST_HEARTBEAT))

if [ $AGE -gt 1200 ]; then
  echo "⚠️ Stale lock detected (>20 min old)"
  echo "Session may have crashed: $LOCK_FILE"
  # Notify user, don't delete lock yourself
fi
```

---

## 🚪 Review Gates

### Two-Stage Review Process

**Purpose**: Catch bugs before production, ensure quality

**Rule**: Different AI must review each stage (not the one who built it!)

---

### Reviewer Tracking (CRITICAL)

**Before reviewing a task, check the "Cannot review" list in TODO.md**:

```markdown
**Built by**: goldenfocus-claude-001
**Reviewed by (REVIEW)**: goldenfocus-claude-002 ✅
**Cannot review**: goldenfocus-claude-001, goldenfocus-claude-002
```

**Rules**:

1. If you're in "Cannot review" list → **Skip this task**, pick different one
2. After REVIEW gate: Add yourself to "Reviewed by (REVIEW)"
3. After RDY FOR PROD gate: Add yourself to "Reviewed by (RDY FOR PROD)"
4. Builder is ALWAYS in "Cannot review" list
5. First reviewer is added to "Cannot review" for second review

**Why**: Fresh eyes catch bugs. Same person won't catch their own mistakes.

**Example workflow**:

```
Task created:
**Built by**: None yet
**Reviewed by**: None yet
**Cannot review**: None

After goldenfocus-claude-001 builds it:
**Built by**: goldenfocus-claude-001
**Reviewed by**: None yet
**Cannot review**: goldenfocus-claude-001

After goldenfocus-claude-002 reviews (GATE 1):
**Built by**: goldenfocus-claude-001
**Reviewed by (REVIEW)**: goldenfocus-claude-002 ✅
**Cannot review**: goldenfocus-claude-001, goldenfocus-claude-002

After goldenfocus-codex-003 reviews (GATE 2):
**Built by**: goldenfocus-claude-001
**Reviewed by (REVIEW)**: goldenfocus-claude-002 ✅
**Reviewed by (RDY FOR PROD)**: goldenfocus-codex-003 ✅
**Cannot review**: goldenfocus-claude-001, goldenfocus-claude-002, goldenfocus-codex-003
```

---

### GATE 1: REVIEW Stage

**Who**: Any AI **NOT in "Cannot review" list**

**What to do**:

```bash
# 1. Pull the feature branch
git checkout feature/goldenfocus-[session]

# 2. Run all gates
npm run test:all        # Must pass ✅
npm run lint            # Must pass ✅
npm run typecheck       # Must pass ✅
npm run build           # Must pass ✅

# 3. Manual QA
# - Test in browser (use Vercel preview link)
# - Try to break it
# - Check responsive design
# - Verify acceptance criteria

# 4. Code quality check
# - Files <900 LOC? ✅
# - Functions <80 LOC? ✅
# - Has unit tests? ✅
# - Has JSDoc comments? ✅
# - Test coverage >80%? ✅

# 5. Decision
if ALL_CHECKS_PASS:
    move_to_RDY_FOR_PROD()
    notify("✅ Review passed: [task name]")
else:
    move_back_to_READY()
    add_comment_with_issues()
    notify("🚨 Review failed: [specific issues]")
```

---

### GATE 2: RDY FOR PROD Stage

**Who**: Any AI **NOT in "Cannot review" list** (not builder, not first reviewer!)

**What to do**:

```bash
# 1. Pull latest main
git checkout main
git pull origin main

# 2. Checkout feature branch
git checkout feature/goldenfocus-[session]

# 3. Merge main into feature (check conflicts)
git merge main

# If conflicts:
#   - Try to resolve automatically
#   - If can't: escalate to user
#   - Document what's conflicting

# 4. Re-run ALL tests after merge
npm run test:all        # Must STILL pass ✅
npm run build           # Must STILL pass ✅

# 5. Verify docs updated
# - CURRENT_STATE.md updated? ✅
# - TODO.md updated? ✅
# - README updated (if needed)? ✅

# 6. Final decision
if ALL_PASS:
    auto_merge_to_main()
    move_to_RELEASED()
    notify("✅ Pushed to prod: [task name]")
else:
    move_back_to_REVIEW()
    add_comment_with_issues()
    notify("🚨 Merge blocked: [specific issues]")
```

---

### Why Two Gates?

**GATE 1** catches:

- Code quality issues
- Test failures
- Logic bugs
- Missing documentation

**GATE 2** catches:

- Merge conflicts
- Integration issues
- Tests that break after merging latest code
- Documentation drift

**Result**: Higher quality, fewer prod bugs, less rollbacks

---

## ✅ Auto-Merge Protocol

### When Auto-Merge Happens

**Trigger**: Task passes GATE 2 (RDY FOR PROD review)

**Who does it**: The AI who reviewed at GATE 2

**What happens**:

```bash
# 1. Final sanity check
git checkout main
git pull origin main
git checkout feature/goldenfocus-[session]
git merge main

# 2. Re-run tests (one more time)
npm run test:all
npm run build

# 3. If pass, merge
git checkout main
git merge feature/goldenfocus-[session] --no-ff
git push origin main

# 4. Vercel auto-deploys to vibelog.io

# 5. Update TODO.md
# - Move task from RDY FOR PROD → RELEASED
# - Add timestamp, PR link, deploy URL

# 6. Notify
echo "✅ Merged to main and deployed: [task name]"
echo "Live at: https://vibelog.io"
echo "Vercel preview: [vercel-url]"
```

---

### Auto-Merge Safety Rules (NEVER BYPASS)

**Rule 1**: ALL tests must pass

```
Even ONE failing test = NO MERGE
No exceptions, even if "it's just a flaky test"
```

**Rule 2**: NO merge conflicts

```
If conflicts exist:
  - Try to resolve automatically
  - If can't: escalate to user
  - NEVER merge with unresolved conflicts
```

**Rule 3**: Build must succeed

```
npm run build must complete successfully
No warnings about type errors or missing deps
```

**Rule 4**: Docs must be updated

```
CURRENT_STATE.md reflects new feature
TODO.md updated (task moved to RELEASED)
README updated if public-facing change
```

**Rule 5**: NEVER force push

```
git push --force = FORBIDDEN
If push rejected: escalate, don't force
```

**Rule 6**: No direct main commits

```
Always via feature branch merge
Always via --no-ff (keep history clean)
Always after review gates pass
```

---

### What If Auto-Merge Fails?

**Scenario 1: Tests fail after merge**

```
Action:
1. Don't push to main
2. Move task back to REVIEW
3. Add comment: "Tests fail after merging main: [error]"
4. Notify user: "🚨 Auto-merge blocked: tests fail"
```

**Scenario 2: Merge conflicts**

```
Action:
1. If simple: resolve automatically, re-run tests
2. If complex: escalate to user
3. Don't guess or skip conflicts
```

**Scenario 3: Build fails**

```
Action:
1. Don't merge
2. Check error logs
3. If obvious fix: fix and retry
4. If unclear: escalate to user
```

**Scenario 4: Push rejected (branch out of date)**

```
Action:
1. git pull --rebase origin main
2. Re-run tests
3. If pass: retry push
4. If fail: escalate
```

---

## ⚔️ Conflict Resolution

### Type 1: File Lock Conflicts

**Scenario**: Two AIs want to work on same files

**Rule**: Oldest timestamp wins (first-come, first-served)

**Process**:

```
10:00:00 - AI #1 creates lock, status="claiming"
10:00:02 - AI #2 creates lock, status="claiming"
10:00:10 - AI #1 checks conflicts: sees AI #2 wants same files
10:00:10 - AI #1 compares timestamps: AI #1 is older (10:00:00 < 10:00:02)
10:00:10 - AI #1: "I'm older, I keep the lock"
10:00:10 - AI #1: Updates status="active"

10:00:12 - AI #2 checks conflicts: sees AI #1 has older timestamp
10:00:12 - AI #2: "AI #1 is older, they win"
10:00:12 - AI #2: Deletes own lock file
10:00:12 - AI #2: Picks different task

Result: AI #1 works on files, AI #2 picks something else
```

---

### Type 2: Merge Conflicts

**Scenario**: Your branch conflicts with main

**Process**:

```bash
# When merging main into your branch:
git checkout feature/your-branch
git merge main

# If conflicts:
<<<<<<< HEAD
Your code
=======
Main branch code
>>>>>>> main

# Resolution strategy:
1. If trivial (imports, whitespace): resolve automatically
2. If logic conflict: try to merge both changes
3. If can't resolve: escalate to user

# After resolving:
git add .
git commit -m "Resolve merge conflicts with main"
npm run test:all  # MUST re-run tests!
npm run build     # MUST still build!
```

---

### Type 3: Stale Locks (Crashed AI)

**Scenario**: Lock file >20 min old (heartbeat stale)

**Process**:

```bash
# Any AI can detect stale locks:
./sesh  # Shows stale sessions

# Output:
🟡 STALE (22 min): goldenfocus-claude-003
   Task: Twitter automation
   Files: /lib/twitter-automation.ts
   Last heartbeat: 2025-11-01T11:00:00.000Z

# What to do:
1. Notify user: "Stale lock detected: goldenfocus-claude-003"
2. User investigates (did AI crash?)
3. User deletes lock manually (if truly stale)
4. OR user extends timeout (if AI is just slow)

# Don't delete locks yourself
# Let human decide (could be working on huge task)
```

---

## 🚨 Emergency Procedures

### Emergency 1: Critical Bug in Production

**Scenario**: Production is broken, needs immediate fix

**Process**:

```
1. User creates bug task in TODO.md with 🚨 CRITICAL
2. User pins it to #1 in READY (top of list)
3. First available AI picks it immediately
4. Fast-track through review gates:
   - REVIEW: 15 min max
   - RDY FOR PROD: 10 min max
   - Auto-merge ASAP
5. Deploy to production
6. Monitor for 1 hour
```

**Rules relaxed**:

- Can skip extensive QA (do smoke tests only)
- Can merge with lower test coverage (if fixing bug)
- Can deploy outside normal hours

**Rules NOT relaxed**:

- Tests must still pass
- No merge conflicts
- Build must succeed
- Still needs review (different AI)

---

### Emergency 2: All AIs Blocked

**Scenario**: Every AI is stuck, no one can proceed

**Process**:

```
1. First AI to detect: notify user
2. Explain what's blocking: "[all tasks depend on X which is blocked]"
3. User intervenes:
   - Unblocks dependency
   - OR creates new unblocked tasks
   - OR adjusts priorities
4. AIs resume work
```

---

### Emergency 3: Massive Merge Conflict

**Scenario**: Feature branch diverged too far from main, conflicts everywhere

**Process**:

```
1. AI attempts auto-resolution
2. If >10 conflicts or any complex logic conflicts:
   → Escalate immediately
3. User decides:
   - Manually resolve
   - OR ask AI to rewrite feature on top of latest main
   - OR revert main to before conflicts
4. Lesson learned: Merge main more frequently
```

---

### Emergency 4: Tests Failing in CI But Pass Locally

**Scenario**: Tests pass on AI's machine, fail in CI pipeline

**Process**:

```
1. AI checks CI logs for errors
2. Common causes:
   - Environment variable missing
   - Timing issues (tests not waiting for async)
   - Database state (need to reset between tests)
   - File paths (absolute vs relative)
3. If obvious: fix and retry
4. If unclear: escalate with CI logs
```

---

### Emergency 5: Vercel Deploy Failing

**Scenario**: Code merged, but Vercel deploy fails

**Process**:

```
1. Check Vercel dashboard for error
2. Common causes:
   - Build command failed
   - Environment variables missing
   - Out of memory
   - Timeout
3. If can fix: create hotfix branch, fast-track
4. If can't fix: notify user immediately
5. Consider rollback if critical
```

---

## 📊 Lock File Lifecycle (Complete Example)

### Monday 10:00 AM - AI Starts Work

```bash
# Create lock file
cat > /coordination/active/goldenfocus-claude-001.lock << 'EOF'
{
  "session_id": "001",
  "session_name": "goldenfocus-claude-001",
  "ai_type": "claude-sonnet-4",
  "platform": "cursor",
  "started_at": "2025-11-01T10:00:00.000Z",
  "status": "claiming",
  "claimed_files": ["/lib/conversation-engine.ts"],
  "task": "Build conversation state machine",
  "task_number": "#1",
  "task_section": "READY",
  "estimated_duration_minutes": 180,
  "heartbeat_last": "2025-11-01T10:00:00.000Z",
  "heartbeat_count": 0,
  "progress_percent": 0,
  "notes": "Starting work"
}
EOF

# Wait 10 seconds (Phase 1)
sleep 10

# Check conflicts (none found)

# Update to active (Phase 2)
# ... update status="active" ...

# Wait 5 seconds
sleep 5

# Final check (still clear)

# Start working!
```

---

### Monday 10:00 - 12:30 PM - Working

```bash
# Every 15 minutes, update heartbeat:
# 10:15 AM - heartbeat_count=1, progress=10%
# 10:30 AM - heartbeat_count=2, progress=25%
# 10:45 AM - heartbeat_count=3, progress=40%
# 11:00 AM - heartbeat_count=4, progress=55%
# 11:15 AM - heartbeat_count=5, progress=70%
# 11:30 AM - heartbeat_count=6, progress=85%
# 11:45 AM - heartbeat_count=7, progress=95%
# 12:00 PM - heartbeat_count=8, progress=100%
```

---

### Monday 12:30 PM - Complete Work

```bash
# Update lock to completed
# ... update status="completed" ...

# Move task in TODO.md from IN-PROGRESS → REVIEW

# Append to archive
cat >> /coordination/archive/2025-11-01.md << 'EOF'
### ✅ Build conversation state machine
- **Session**: goldenfocus-claude-001
- **Started**: 2025-11-01T10:00:00.000Z
- **Completed**: 2025-11-01T12:30:00.000Z
- **Duration**: 2h 30min
- **Files**: /lib/conversation-engine.ts, /state/conversation-state.ts
- **Status**: Moved to REVIEW
- **Tests**: ✅ All pass
- **Coverage**: 87%
EOF

# Update CURRENT_STATE.md (add new feature)

# Delete lock file
rm /coordination/active/goldenfocus-claude-001.lock

# Notify user
echo "✅ goldenfocus-claude-001 complete. Moved to REVIEW."
```

---

## 🎯 Best Practices

### DO:

✅ **Read all lock files** before claiming work (check for conflicts)
✅ **Update heartbeat** every 15 minutes (keep it fresh)
✅ **Use descriptive notes** in lock file (helps debugging)
✅ **Delete lock immediately** when done (don't leave orphans)
✅ **Check ./sesh often** (see what teammates are doing)
✅ **Follow three-phase claiming** (prevents race conditions)
✅ **Escalate when stuck** (don't sit blocked for hours)
✅ **Review others' work thoroughly** (catch bugs early)

### DON'T:

❌ **Skip waiting periods** in claiming protocol (causes conflicts)
❌ **Forget to delete lock** when done (blocks others)
❌ **Review your own work** (defeats the purpose)
❌ **Merge without tests passing** (even one test matters)
❌ **Force push** (ever, for any reason)
❌ **Claim stale locks** without user approval (they might just be slow)
❌ **Skip heartbeat updates** (looks like you crashed)
❌ **Guess when uncertain** (escalate instead)

---

## 🔍 Monitoring & Debugging

### Check Active Sessions

```bash
./sesh

# Output:
🟢 ACTIVE SESSIONS (3)

Session: goldenfocus-claude-001
Task: Conversation state machine
Files: /lib/conversation-engine.ts
Heartbeat: 2 min ago ✅

Session: goldenfocus-codex-002
Task: Chat UI components
Files: /components/conversation/*
Heartbeat: 14 min ago ✅

Session: goldenfocus-chatgpt-003
Task: Twitter automation
Files: /lib/twitter-automation.ts
Heartbeat: 22 min ago ⚠️ STALE!
```

---

### Check Weekly Audit

```bash
./sesh --audit

# Output:
📊 WEEKLY AUDIT (Oct 26 - Nov 1)

✅ Auto-Merged: 12 tasks
🚨 Escalated: 2 tasks
📈 Success Rate: 85%
⏱️ Avg Time to Merge: 2.3 hours
```

---

### Debug Stale Locks

```bash
# List all locks with heartbeat age
for lock in /coordination/active/*.lock; do
  echo "File: $lock"
  jq -r '.heartbeat_last' "$lock"
  # Calculate age...
done
```

---

## 📚 Related Docs

- **NEW_AI_START_HERE.md**: Onboarding for new AIs
- **TODO.md**: Task board (what to work on)
- **CURRENT_STATE.md**: What's already built
- **pivot.md**: Product vision

---

## ✅ Protocol Checklist

Before starting work, confirm:

- [ ] I read this entire SESSIONS.md file
- [ ] I understand the three-phase claiming protocol
- [ ] I know how to update heartbeat every 15 min
- [ ] I understand the two review gates
- [ ] I know when/how to auto-merge
- [ ] I know conflict resolution rules
- [ ] I will NOT review my own work
- [ ] I will NOT skip status flow
- [ ] I will NOT force push
- [ ] I will DELETE my lock when done

---

**This protocol ensures high-quality, conflict-free, autonomous development. Follow it!** 🚀
