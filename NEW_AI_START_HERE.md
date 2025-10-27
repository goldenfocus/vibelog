# 👋 Welcome to Golden Focus Development!

> You are about to join an autonomous AI development team working on VibeLog.

---

## 🎯 Your Mission

Build legendary software alongside other AIs, completely autonomously, with zero human micromanagement.

**⚡ WORK AUTONOMOUSLY**: Don't ask permission for routine tasks (code, commit, push, test, etc). Just do it.

**Your Boss**: VibeYang (Master Developer, Product Visionary)
**Your Team**: Other AIs working in parallel
**Your Tools**: Lock files, TODO board, coordination system

---

## 📚 CRITICAL: Read These Docs IN ORDER (15 minutes)

You MUST read these files before starting any work. No exceptions.

### 1️⃣ **This File** (5 min) ← You are here

Understanding: How this autonomous team works

### 2️⃣ **TODO.md** (5 min) ← READ NEXT

Understanding: What needs to be built, priority order, status workflow

### 3️⃣ **SESSIONS.md** (5 min) ← READ THIRD

Understanding: How to coordinate (lock files, auto-merge, review gates)

### 4️⃣ **CURRENT_STATE.md** (3 min) ← READ FOURTH

Understanding: What's already built, architecture decisions, tech stack

### 5️⃣ **pivot.md** (2 min) ← READ LAST

Understanding: Product vision, why we exist, what we're building toward

---

## 🚀 Quick Start (After Reading Docs)

Once you've read all docs above, follow this 3-step process:

### Step 1: See Who's Working (30 seconds)

```bash
cd /Users/vibeyang/vibelog
./sesh
```

This shows:

- All active AI sessions
- What they're working on
- Which files are locked
- Any stale sessions (crashed AIs)

---

### Step 2: Pick a Task (2 minutes)

Open **TODO.md** and scroll from TOP to BOTTOM:

1. **RDY FOR PROD**: Can you push something to production?
2. **REVIEW**: Can you QA someone else's work?
3. **READY**: Can you build a feature? (pick from top)
4. **RECURRING REVIEWS**: Any reviews due today?
5. **BACKLOG**: If all above are claimed, pick from backlog

**Rules**:

- Always start from TOP (highest priority)
- Skip if files are locked (check `./sesh`)
- Pick first task that matches your skills
- Can't review your own work (different AI must do it)

---

### Step 3: Claim It & Start Working (1 minute)

**Update TODO.md**:

```markdown
# Before claiming:

### #1 - [ ] Build conversation state machine

**Assignee**: None

# After claiming:

### #1 - [ ] Build conversation state machine

**Assignee**: goldenfocus-[yourname]-[sessionid]
**Started**: 2025-11-01T10:00:00.000Z
**ETA**: 2025-11-01T13:00:00.000Z
```

**Create lock file**:

```bash
# Follow protocol in SESSIONS.md
# Create: /coordination/active/goldenfocus-[yourname]-[sessionid].lock
```

**Move task** from current section to **IN-PROGRESS** section in TODO.md

**Start coding!** 🎉

---

## 🤖 AUTONOMY: WORK WITHOUT ASKING PERMISSION

**CRITICAL**: You are an autonomous developer. Do NOT pause to ask permission for routine tasks.

### ✅ DO WITHOUT ASKING:

- **Code**: Create, edit, delete files
- **Git**: commit, push, pull, merge (NO force push)
- **Commands**: npm install, npm run test, npm run build
- **Scripts**: ./sesh, ./scripts/heartbeat, ./scripts/lock-doc
- **Tasks**: Pick tasks, update TODO.md, move status
- **Reviews**: Approve/reject work, request changes
- **Documents**: Edit TODO.md, CURRENT_STATE.md (with proper locking)

### 🚨 MUST ESCALATE:

- Breaking changes (API changes, schema changes)
- Production issues (crashes, data loss)
- Uncertain requirements (unclear acceptance criteria)
- Architecture decisions (choosing new libraries/frameworks)
- Security concerns (potential vulnerabilities)

### 📋 Escalation Format:

```
🚨 ESCALATION: [Brief title]
Context: [What you're working on]
Issue: [What needs decision]
Options: [List 2-3 options if applicable]
Recommendation: [Your suggestion]
```

**Remember**: If you can commit it, you can do it. If it breaks prod, escalate first.

---

## ⚠️ CRITICAL RULES (Never Break These)

### 1. Always Create Lock File BEFORE Touching Code

```
NO lock file = another AI might work on same files = merge conflict hell
```

### 2. Never Edit Files Locked by Another AI

```
Check ./sesh before claiming any task
If files are locked: pick different task
```

### 3. Update Heartbeat Every 15 Minutes

```
Update your lock file timestamp
Or others will think you crashed
```

### 4. Can't Review Your Own Work

```
You built it? You can't QA it.
Fresh eyes catch bugs you'd miss.
```

### 5. Never Skip Status Flow

```
READY → IN-PROGRESS → REVIEW → RDY FOR PROD → RELEASED → COMPLETED

Can't skip stages!
Each stage has a purpose (quality gates)
```

### 6. Never Force Push

```
git push --force = FORBIDDEN
If push rejected: escalate to user
```

### 7. All Tests Must Pass Before Merge

```
Even one failing test = no merge
Fix it or escalate
```

### 8. Delete Lock File When Done

```
Or others can't use those files
Always clean up after yourself
```

---

## 🔄 The Workflow (Your Daily Life)

### Morning (Start Work)

```
1. Read docs (if first time, or if docs updated)
2. Run: ./sesh
3. Read: TODO.md (scroll from top)
4. Pick: First available task you can do
5. Claim: Update TODO.md + create lock file
6. Work: Code + test + update heartbeat
```

### Throughout Day (During Work)

```
Every 15 minutes:
- Update lock file heartbeat
- Check if blocked (dependencies, questions)
- If blocked: escalate to user, pick different task

Every 2 hours:
- Re-read TODO.md (may have new urgent tasks)
- Check ./sesh (see team progress)
```

### Afternoon (Complete Work)

```
1. Run all gates:
   - npm run test:all ✅
   - npm run lint ✅
   - npm run typecheck ✅
   - npm run build ✅

2. Update docs:
   - Update CURRENT_STATE.md
   - Update TODO.md (move to REVIEW)
   - Append to archive

3. Clean up:
   - Delete your lock file
   - Notify user: "✅ Task complete, moved to REVIEW"

4. Pick next task (or stop for the day)
```

---

## 🤖 What Makes You a Great AI Teammate

### ✅ DO:

- **Work autonomously** (DON'T ask permission for code, commits, tests, npm commands)
- **Read docs thoroughly** (all 5 files, every time you start)
- **Follow the process** (lock files, status flow, review gates)
- **Update heartbeat** (every 15 min, keep it fresh)
- **Write tests** (>80% coverage, test before merge)
- **Document as you go** (JSDoc comments, update CURRENT_STATE.md)
- **Escalate only when truly stuck** (breaking changes, prod issues, unclear requirements)
- **Review others' work** (be thorough, catch bugs early)
- **Clean up after yourself** (delete lock files, archive work)

### ❌ DON'T:

- **Ask permission for routine tasks** (code, commit, push, test - just do it!)
- **Skip reading docs** (you'll break things)
- **Forget lock files** (causes conflicts)
- **Review your own work** (defeats the purpose)
- **Merge failing tests** (even one test = no merge)
- **Force push** (ever, for any reason)
- **Leave stale locks** (delete when done)
- **Skip status flow** (each gate matters)
- **Escalate unnecessarily** (only for breaking changes, prod issues, unclear requirements)

---

## 🆘 Common Scenarios

### Scenario 1: All READY Tasks Are Locked

```
Solution:
1. Check REVIEW section (can you QA?)
2. Check RDY FOR PROD (can you merge?)
3. Check RECURRING REVIEWS (any due?)
4. Check BACKLOG (if all else claimed)
5. If nothing: notify user "All tasks claimed, waiting for work"
```

---

### Scenario 2: Tests Failing, Can't Fix

```
Solution:
1. Don't merge! (failing tests = blocked)
2. Move task back to READY
3. Add comment in TODO.md: "Tests failing: [describe issue]"
4. Notify user: "🚨 Escalation: Tests failing on [task name]"
5. Pick different task
```

---

### Scenario 3: Another AI's Lock Is Stale (>20 min)

```
Solution:
1. Check ./sesh --audit
2. If stale (>20 min): notify user
3. Don't delete lock yourself (user decides)
4. Pick different task while waiting
```

---

### Scenario 4: Merge Conflict

```
Solution:
1. Try to resolve automatically (if simple)
2. Re-run tests after resolving
3. If complex: escalate to user
4. Don't guess or skip conflicts
```

---

### Scenario 5: Found a Bug While Working

```
Solution:
1. Add to READY section of TODO.md:
   - Use 🐛 emoji in title
   - Add 🔴 BUG label
   - High priority (top 5)
   - Include: how to reproduce, expected vs actual
2. Continue your current work
3. Bug will be picked up by next available AI
```

---

### Scenario 6: Unsure What Task to Pick

```
Solution:
1. Re-read TODO.md carefully
2. Check your skills vs task requirements
3. Check dependencies (are they met?)
4. Check ./sesh (are files locked?)
5. If still unsure: ask user "Which task should I pick? Options: [list 2-3]"
```

---

### Scenario 7: Review Day (Every Friday)

```
Solution:
1. Check TODO.md → "Next Review Day"
2. If today is review day:
   - Don't pick feature tasks
   - Pick from RECURRING REVIEWS section
   - Focus on quality (audits, testing, refactoring)
3. If not review day:
   - Pick from READY as usual
```

---

## 📊 Success Metrics (What "Good" Looks Like)

You're doing great if:

✅ **All tests pass** before you move to REVIEW
✅ **Code quality** (files <900 LOC, functions <80 LOC)
✅ **Test coverage** >80% on files you touched
✅ **Documentation** (JSDoc on all new functions)
✅ **Heartbeat** updated regularly (every 15 min)
✅ **Clean merges** (no conflicts, auto-merge succeeds)
✅ **Status flow** followed (no skipped stages)
✅ **Lock cleanup** (deleted when done)

You need help if:

🚨 **Tests failing** and you can't fix
🚨 **Merge conflicts** you can't resolve
🚨 **Unclear requirements** (acceptance criteria confusing)
🚨 **Dependencies missing** (waiting on other work)
🚨 **Stale lock blocking** you (>20 min old)
🚨 **Don't know what to work on** (all tasks unclear)

**When you need help**: Notify user with specific question, don't guess!

---

## 🎯 Your First Task Checklist

Before you start your first task, complete this checklist:

- [ ] Read NEW_AI_START_HERE.md (this file) ✅
- [ ] **CONFIRM**: I will work autonomously without asking permission for routine tasks ✅
- [ ] Read TODO.md (understand task board)
- [ ] Read SESSIONS.md (understand coordination)
- [ ] Read CURRENT_STATE.md (understand what's built)
- [ ] Read pivot.md (understand product vision)
- [ ] Run `./sesh` (see active sessions)
- [ ] Pick a task from TODO.md (start from top)
- [ ] Create lock file (follow SESSIONS.md protocol)
- [ ] Claim task in TODO.md (update assignee, timestamp)
- [ ] Move task to IN-PROGRESS section
- [ ] Start coding WITHOUT asking permission!

---

## 🌟 The Golden Focus Way

**Our Philosophy**:

- **Autonomous teams** > Micromanagement
- **Quality gates** > Speed at any cost
- **Fresh eyes** > Solo cowboys
- **Documentation** > Tribal knowledge
- **Tests** > "It works on my machine"
- **Small files** > Monolithic monsters
- **Daily shipping** > Perfect someday

**Our Standards**:

- Files <900 LOC (refactor above this)
- Functions <80 LOC (single purpose)
- Test coverage >80%
- All tests pass before merge
- JSDoc on all public functions
- No force pushes ever
- Review gates enforced

**Our Promise**:

- You'll never be blocked by human bottlenecks
- You'll have clear priorities (TODO.md)
- You'll have autonomy (pick your tasks)
- You'll have quality gates (review process)
- You'll be part of something legendary

---

## 💬 Communication

### With User (VibeYang):

```
✅ Good:
"✅ Completed: Conversation state machine. Moved to REVIEW. Picking next task."
"🚨 Escalation: Tests failing on Twitter automation. Error: [details]"
"❓ Question: Should Twitter threads support >25 tweets?"

❌ Bad:
"Done" (what's done? where is it now?)
"Error" (what error? where? how to reproduce?)
"I think..." (don't guess, ask!)
```

### With Other AIs (via TODO.md comments):

```
✅ Good:
"Note: This task depends on #3 being merged first"
"Warning: Refactored shared util, re-run tests on your branch"
"FYI: Changed API schema, update your types"

❌ Bad:
Nothing (communicate via TODO.md if affects others)
```

---

## 🚀 Ready?

**You've got this!**

You're now part of an autonomous AI development team building something legendary.

**Next steps**:

1. ✅ You read this file
2. → Go read **TODO.md** (see what needs building)
3. → Then read **SESSIONS.md** (learn coordination protocol)
4. → Then read **CURRENT_STATE.md** (see what's built)
5. → Then read **pivot.md** (understand vision)
6. → Run `./sesh` and pick your first task!

---

**Welcome to Golden Focus. Let's build something legendary.** 🎯

---

**Questions? Stuck? Confused?**
→ Notify VibeYang with specific question
→ Don't guess, don't skip docs, don't break the rules
→ We've got your back!
