# AI Coordination System

## Overview

This directory contains the atomic task system for coordinating multiple AI agents working in parallel without interruptions.

## Structure

```
/coordination/
  /tasks/              ← Individual task files (one per task)
    /ready/            ← Tasks ready to start
    /in-progress/      ← Currently being worked on
    /review/           ← Needs QA by different AI
    /ready-for-prod/   ← Passed QA, ready to merge
    /released/         ← Live in production
    /completed/        ← Verified stable
    /backlog/          ← Future/low-priority tasks
  events.jsonl         ← Audit log (auto-updated by git hook)
  /active/             ← Legacy lock files (deprecated)
  /archive/            ← Historical data
  README.md            ← This file
```

## How It Works

### For AI Agents

1. **Read `go.md`** - Quick start guide (30 seconds)
2. **Run `./scripts/sesh`** - View dashboard
3. **Claim task** - `git mv tasks/ready/NNN.md tasks/in-progress/NNN.md`
4. **Work** - Edit only your task file
5. **Commit** - Git hook auto-logs to events.jsonl
6. **Move forward** - `git mv tasks/in-progress/NNN.md tasks/review/NNN.md`

### Key Benefits

✅ **Zero interruptions** - Each AI edits different files
✅ **Unlimited parallelism** - No bottlenecks
✅ **Full audit trail** - events.jsonl + git history
✅ **Simple operations** - git mv, edit single file
✅ **Human-readable** - `./scripts/sesh` dashboard

### Git Hook

`.git/hooks/pre-commit` automatically:

- Detects task file movements
- Logs events to events.jsonl
- Stages events.jsonl for commit
- No manual tracking needed

### Events Log

Format: JSON Lines (`.jsonl`)

```json
{"event":"created","task":"001","status":"ready","ai":"claude-xyz","ts":"2025-10-27T05:00:00.000Z"}
{"event":"claimed","task":"001","ai":"claude-xyz","assignee":"claude-xyz","ts":"2025-10-27T05:01:00.000Z"}
{"event":"moved","task":"001","from":"ready","to":"in-progress","ai":"claude-xyz","ts":"2025-10-27T05:01:00.000Z"}
{"event":"completed","task":"001","ai":"claude-xyz","ts":"2025-10-27T07:00:00.000Z"}
{"event":"moved","task":"001","from":"in-progress","to":"review","ai":"claude-xyz","ts":"2025-10-27T07:00:00.000Z"}
```

## Migration Notes

**Migrated:** 2025-10-27
**From:** Single TODO.md file (caused interruptions)
**To:** Atomic task files (zero interruptions)

**Tasks migrated:**

- #001 conversation-state-machine (review)
- #002 chat-ui-components (in-progress)
- #003 command-parser (ready)
- #004 twitter-automation (ready)
- #005 dalle-image-quality-bug (ready)
- #006 openai-realtime-api (backlog)
- #007 twitter-preview-component (backlog)

## See Also

- `go.md` - AI onboarding guide
- `./scripts/sesh` - Dashboard command
- `.git/hooks/pre-commit` - Auto-logging hook
