# Database Migration Instructions

This document explains how to apply database migrations to your Supabase project.

## Quick Start (Recommended)

### Using the CLI (Fastest Method)

1. **Check migration status:**

   ```bash
   pnpm db:status
   ```

2. **Apply all pending migrations:**

   ```bash
   pnpm db:migrate
   ```

3. **Verify migrations applied successfully:**
   ```bash
   pnpm db:status
   ```

That's it! The Supabase CLI will automatically apply all pending migrations to your linked production database.

---

## Setup (First Time Only)

If you haven't linked your local environment to the Supabase project yet:

```bash
# Link to your Supabase project (you'll need your project ref: ogqcycqctxulcvhjeiii)
supabase link --project-ref ogqcycqctxulcvhjeiii

# Or if prompted, paste your database connection string from Supabase Dashboard
```

After linking once, all future migrations can be run with `pnpm db:migrate`.

---

## Available Commands

| Command           | Description                                                        |
| ----------------- | ------------------------------------------------------------------ |
| `pnpm db:migrate` | Apply all pending migrations to production                         |
| `pnpm db:status`  | Check which migrations have been applied                           |
| `pnpm db:reset`   | Reset your local dev database (dev only, never use in production!) |

---

## Migration Files

Migrations are located in `supabase/migrations/` and are numbered sequentially:

- `001_sync_profile_total_views.sql`
- `002_add_profile_fields.sql`
- `003_storage_public_access.sql`
- `004_add_username_changed_at.sql`
- `005_backfill_public_slugs.sql`
- `006_add_vibelog_likes.sql`
- `007_add_voice_cloning.sql`
- `008_fix_profile_creation_trigger.sql`
- `009_add_multilanguage_support.sql`
- `010_sync_profile_total_vibelogs.sql`
- `011_add_tone_preferences.sql`
- `012_create_comments_table.sql`
- `013_add_admin_role.sql`
- `014_create_usage_tracking.sql`
- `015_create_admin_audit_log.sql`

Each migration is **idempotent** (safe to run multiple times).

---

## Manual Application (Alternative)

If you prefer to apply migrations manually via the Supabase Dashboard:

1. Open [Supabase Dashboard → SQL Editor](https://supabase.com/dashboard/project/ogqcycqctxulcvhjeiii/sql)
2. Copy the contents of the migration file from `supabase/migrations/`
3. Paste into SQL Editor
4. Click "Run" to execute

---

## Backfill Scripts

Some migrations require data backfilling. After applying the migration, check if there's a corresponding backfill script:

### Example: Profile Total Views Backfill

After applying `001_sync_profile_total_views.sql`, run:

```sql
SELECT public.backfill_profile_total_views();
```

Or use the provided file:

```bash
# Copy contents of supabase/backfill_profile_views.sql
# Paste into Supabase SQL Editor and run
```

---

## Verification Queries

### Check Profile Total Views Are Syncing

```sql
SELECT
  p.id,
  p.username,
  p.total_views as profile_total_views,
  COALESCE(SUM(v.view_count), 0) as calculated_total_views
FROM public.profiles p
LEFT JOIN public.vibelogs v
  ON v.user_id = p.id
  AND v.is_published = true
  AND v.is_public = true
GROUP BY p.id, p.username, p.total_views
ORDER BY calculated_total_views DESC;
```

The `profile_total_views` and `calculated_total_views` should match for all users.

---

## Creating New Migrations

To create a new migration:

1. **Create the SQL file:**

   ```bash
   # Use the next sequential number
   touch supabase/migrations/016_your_migration_name.sql
   ```

2. **Write idempotent SQL:**

   ```sql
   -- Always use IF NOT EXISTS, IF EXISTS, etc.
   CREATE TABLE IF NOT EXISTS my_new_table (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **Test locally first:**

   ```bash
   # Apply to local dev database
   supabase db reset
   ```

4. **Apply to production:**
   ```bash
   pnpm db:migrate
   ```

---

## Troubleshooting

### "Project not linked"

```bash
supabase link --project-ref ogqcycqctxulcvhjeiii
```

### "Migrations already applied"

This is normal! The CLI tracks which migrations have been run. Only new migrations will be applied.

### "Permission denied"

Make sure you have the `SUPABASE_SERVICE_ROLE_KEY` environment variable set, or authenticate via:

```bash
supabase login
```

### Check current migration state

```bash
pnpm db:status
```

---

## Production Safety

- ✅ Migrations are idempotent (safe to run multiple times)
- ✅ Supabase has automatic backups (point-in-time recovery: 7 days, daily backups: 30 days)
- ✅ All migrations are tracked in the database
- ⚠️ Always run `pnpm db:status` before and after migrations
- ⚠️ Review migration SQL before applying to production
- ⚠️ Never use `pnpm db:reset` in production (it wipes the database!)

---

## Quick Reference

```bash
# Daily workflow
pnpm db:migrate           # Apply new migrations after code deploy

# Check status
pnpm db:status            # See which migrations are applied

# Development only
pnpm db:reset             # Reset local database (NEVER use in production)
```
