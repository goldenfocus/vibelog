# Migration: Fix Profile Total Views

This migration fixes the issue where `profiles.total_views` was showing 0 for all users because it wasn't being synced from individual vibelog view counts.

## What This Does

1. **Creates a sync function** (`sync_profile_total_views`) that calculates and updates a profile's `total_views` from all their published public vibelogs
2. **Creates a database trigger** that automatically updates `profiles.total_views` whenever:
   - A vibelog's `view_count` changes (when someone views a vibelog)
   - A new vibelog is inserted
   - A vibelog is deleted
3. **Creates a backfill function** to sync all existing profiles

## How to Apply

### Option 1: Run the migration file

1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `supabase/migrations/001_sync_profile_total_views.sql`
4. Run the query

### Option 2: Apply to schema.sql (for new databases)

If you're setting up a fresh database, the `schema.sql` file has been updated with these functions and triggers, so running `schema.sql` will include them.

## Backfill Existing Data

After applying the migration, you need to sync existing profiles:

1. Run the backfill script in Supabase SQL Editor:
   ```sql
   SELECT public.backfill_profile_total_views();
   ```

Or use the provided file:

- Copy and paste `supabase/backfill_profile_views.sql` into SQL Editor and run it

## Verification

After running the migration and backfill, verify it's working:

```sql
-- Check that total_views are being calculated correctly
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

## How It Works Going Forward

- When someone views a vibelog at `/v/[slug]`, the `view_count` on `vibelogs` is incremented
- The trigger automatically detects this change and calls `sync_profile_total_views()` for that user
- The profile's `total_views` is recalculated from all their published vibelogs
- The People page now shows accurate view counts! 🎉
