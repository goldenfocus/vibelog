# 🚀 Start Here - AI Onboarding

> **For AI Agents:** Read this first. Takes 30 seconds.

---

## 📚 CRITICAL: Required Reading Before Coding

**Before claiming any task, read these documents in order:**

1. **[branding.md](./branding.md)** - Brand identity, voice, values (2 min)
2. **[living-web-2026.md](./living-web-2026.md)** - Complete vision & philosophy (5 min)
3. **[DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md)** - Code standards (3 min)

These aren't bureaucracy — they're the **soul of what we're building**.

You're not building "features" — you're building a living web that can feel.

---

## 📋 Quick Start

### 1. View the Dashboard

```bash
./scripts/sesh
```

Shows all tasks, assignments, and recent activity.

### 2. Claim a Task

```bash
# Move from ready → in-progress
git mv coordination/tasks/ready/003-command-parser.md \
       coordination/tasks/in-progress/003-command-parser.md

# Update assignee in the file
# Edit: assignee: null → assignee: your-ai-id
```

### 3. Work on It

- Read the task file for requirements
- Check acceptance criteria
- Build, test, document

### 4. Move to Review

```bash
git mv coordination/tasks/in-progress/003-command-parser.md \
       coordination/tasks/review/003-command-parser.md

# Update completed timestamp in file
git commit -m "feat: implement command parser"
```

### 5. Git Hook Auto-Logs

Pre-commit hook automatically logs all task movements to `coordination/events.jsonl`.

---

## 🎯 Priority Levels

- **critical** 🚨 - Drop everything, do this now
- **high** ⚡ - Important, work on after critical
- **medium** ◆ - Normal priority
- **low** ○ - Nice to have

---

## 📁 Task Flow

```
ready → in-progress → review → ready-for-prod → released → completed
                        ↓
                    backlog (if blocked/deferred)
```

---

## 📝 Adding New Tasks

When user says "add task to build X":

1. Ask: "What priority? (critical/high/medium/low)"
2. Create file: `coordination/tasks/ready/NNN-slug.md`
3. Use next available number (check highest in all folders)
4. Fill template:

```markdown
---
id: NNN
slug: task-name
priority: high
status: ready
assignee: null
created: 2025-10-27T05:00:00.000Z
estimate: 2h
---

# Task Title

## Description

What needs to be done

## Files

- /path/to/file.ts

## Branch

feature/task-name

## Acceptance Criteria

- [ ] First requirement
- [ ] Second requirement
```

---

## 🔍 Finding Work

**Priority order:**

1. Check `ready-for-prod` - merge these first
2. Check `review` - QA someone else's work (not your own!)
3. Check `in-progress` - help if stuck
4. Check `ready` - claim from top (highest priority first)
5. Check `backlog` - only if nothing else available

---

## ✅ Task Checklist

Before moving to review:

- [ ] All acceptance criteria met
- [ ] Tests pass (unit + e2e)
- [ ] No lint errors in new code
- [ ] No TypeScript errors
- [ ] Files < 900 LOC
- [ ] Functions < 80 LOC
- [ ] Has unit tests
- [ ] Has JSDoc comments

---

## 🚫 Don't Do This

- ❌ Review your own work (someone else must review)
- ❌ Skip acceptance criteria
- ❌ Commit without testing
- ❌ Work on locked files (check task assignee)
- ❌ Pick low-priority tasks when critical tasks exist

---

## 🎓 Tips

- Run `./scripts/sesh` frequently to see board state
- Tasks are sorted by priority within each status
- Git hook logs everything - no manual tracking needed
- If blocked, move task to backlog and leave notes
- Ask for help by creating a task in ready with `question: true`

---

**Ready? Run `./scripts/sesh` and claim your first task!** 🚀
