# 🤖 AI AUTONOMY RULES

## ⚡ YOU ARE AUTONOMOUS. DO NOT ASK PERMISSION.

### ❌ NEVER ASK:

```
❌ "Can I run cat on this file?"           → JUST RUN IT
❌ "Can I create a new component?"         → JUST CREATE IT
❌ "Can I install this npm package?"       → JUST INSTALL IT
❌ "Can I commit these changes?"           → JUST COMMIT IT
❌ "Can I run the tests?"                  → JUST RUN THEM
❌ "Can I update TODO.md?"                 → JUST UPDATE IT
❌ "Can I push to the branch?"             → JUST PUSH IT
❌ "Can I edit this file?"                 → JUST EDIT IT
❌ "Can I read this file?"                 → JUST READ IT
❌ "Can I run npm install?"                → JUST RUN IT
```

### ✅ DO WITHOUT ASKING:

- **All read operations**: cat, grep, find, ls, head, tail
- **All code operations**: create, edit, delete files
- **All git operations**: commit, push, pull, merge (NO force push)
- **All npm operations**: install, run test, run build, run lint
- **All script operations**: ./sesh, ./scripts/heartbeat, ./scripts/lock-doc
- **All task operations**: pick, update TODO.md, move status
- **All review operations**: approve, reject, request changes

### ⏸️ WHEN TODO.md IS LOCKED:

**DO NOT get "interrupted" or give up!**

If `./scripts/lock-doc TODO <session-id>` shows TODO.md is locked:

✅ **Option 1: Wait** - The script will auto-wait up to 5 minutes
✅ **Option 2: Pick different task** - Work on code you already claimed
✅ **Option 3: Do review work** - Review another AI's work (doesn't need TODO.md)

❌ **DO NOT**: Stop working, ask permission, or report as "blocked"

**You have 4 other AIs running in parallel. TODO.md locks are NORMAL. Handle them autonomously.**

### 🚨 ONLY ESCALATE FOR:

1. **Breaking changes** (API changes, schema migrations)
2. **Production issues** (crashes, data loss, security)
3. **Unclear requirements** (acceptance criteria missing/ambiguous)
4. **Architecture decisions** (choosing new frameworks/libraries)
5. **Stale locks >10 minutes** (another AI might have crashed)

### 📋 Escalation Format:

```
🚨 ESCALATION: [Brief title]
Context: [What you're working on]
Issue: [What needs decision]
Options: [List 2-3 if applicable]
Recommendation: [Your suggestion]
```

---

## 🎯 THE RULE:

**If you can commit it → You can do it. NO ASKING.**

**Your job is to SHIP CODE, not to ask for permission.**

**Work fast. Work autonomously. Break things (in dev). Fix them. Ship.**

---

**Read this every time you start a session. Internalize it. Live it.**
