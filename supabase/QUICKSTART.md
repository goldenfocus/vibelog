# Database Migrations Quick Start

## TL;DR

```bash
# Apply all pending migrations
pnpm db:migrate

# Check what's been applied
pnpm db:status
```

---

## When to Run Migrations

**After every code deploy that includes database changes:**

1. Code gets merged to `main` → Vercel auto-deploys
2. You tell Claude: "run migrations"
3. Claude runs: `pnpm db:migrate`
4. Done! ✅

---

## Current Setup

✅ **Linked to production**: `ogqcycqctxulcvhjeiii`
✅ **CLI configured**: `supabase/config.toml`
✅ **Commands available**: See below

---

## Available Commands

| Command           | What It Does                                           |
| ----------------- | ------------------------------------------------------ |
| `pnpm db:migrate` | Push all pending migrations to production database     |
| `pnpm db:status`  | Show which migrations have been applied                |
| `pnpm db:reset`   | ⚠️ **DEV ONLY** Reset local database (wipes all data!) |

---

## What Migrations Are Pending?

Run `pnpm db:status` to see a table like this:

```
Local | Remote | Migration
------|--------|----------
001   | 001    | sync_profile_total_views
002   | 002    | add_profile_fields
012   |        | create_comments_table    ← PENDING
014   |        | create_usage_tracking    ← PENDING
015   |        | create_admin_audit_log   ← PENDING
```

Migrations without a checkmark in "Remote" are **pending** and will be applied when you run `pnpm db:migrate`.

---

## Example Workflow

### Scenario: New PR with database changes

```bash
# 1. PR gets merged to main
# → Vercel deploys code automatically

# 2. Claude or you runs:
pnpm db:migrate

# 3. Verify it worked:
pnpm db:status
# All migrations should now show ✅ in Remote column

# Done!
```

---

## Safety Features

- ✅ All migrations are **idempotent** (safe to run multiple times)
- ✅ Supabase tracks which migrations have been applied
- ✅ Point-in-time recovery enabled (7 days)
- ✅ Daily backups (30 day retention)
- ⚠️ Always check `pnpm db:status` before and after migrations

---

## Troubleshooting

### "Project not linked"

```bash
supabase link --project-ref ogqcycqctxulcvhjeiii
```

### "Permission denied"

Make sure you're authenticated:

```bash
supabase login
```

### "Migrations already applied"

This is normal! The CLI only applies new migrations.

---

## Full Documentation

For detailed information, see:

- **[MIGRATION_INSTRUCTIONS.md](./MIGRATION_INSTRUCTIONS.md)** - Complete migration guide
- **[../deployment.md](../deployment.md)** - Deployment workflow
- **[../README.md](../README.md)** - Project overview

---

**Need help?** Just ask Claude to run migrations for you! 🤖
