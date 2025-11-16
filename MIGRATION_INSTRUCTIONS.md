# Twitter Auto-Posting Migration Instructions

## Issue

The Supabase CLI is having connection timeout issues when trying to repair migrations or push new ones. This is preventing migration 018 (Twitter auto-posting) from being applied to your database.

## Solution: Apply Migration via Supabase Dashboard

Since the CLI is having connection issues, the fastest way to apply the migration is through the Supabase SQL Editor:

### Step 1: Access Supabase SQL Editor

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project (ogqcycqctxulcvhjeiii)
3. Click on "SQL Editor" in the left sidebar

### Step 2: Run the Migration Script

1. Click "New Query" button
2. Open the file `apply-018-migration.sql` (created in your project root)
3. Copy the entire contents
4. Paste into the SQL Editor
5. Click "Run" button

The migration is **idempotent** - it's safe to run multiple times. It uses `IF NOT EXISTS` checks, so it won't create duplicate tables or columns.

### Step 3: Verify Success

After running the SQL, you should see a success message:
```
Migration 018 applied successfully! Twitter auto-posting tables and columns are ready.
```

You can verify the tables and columns were created by running:

```sql
-- Check if vibelog_social_posts table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'vibelog_social_posts'
);

-- Check if profile columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('auto_post_twitter', 'twitter_post_format', 'twitter_custom_template');
```

### Step 4: Test the Feature

1. Restart your development server (if running)
2. Go to your app at `http://localhost:3000/settings/profile`
3. Scroll down - you should now see the **"Twitter Auto-Posting"** section
4. Enable auto-posting and configure your preferences
5. Publish a vibelog to test!

## Alternative: Wait for CLI Connection to Recover

If you prefer to use the CLI, you can wait for the connection timeout to resolve and try:

```bash
# Attempt 1: Mark old migrations as applied
supabase migration repair 014 015 016 017 --status applied --linked

# Attempt 2: Push migration 018
pnpm db:migrate
```

But given the persistent connection issues, **using the SQL Editor is recommended** for faster resolution.

## What the Migration Does

The migration adds:

### New Table: `vibelog_social_posts`
- Tracks which vibelogs have been posted to which platforms
- Stores post IDs, URLs, status (pending/posting/posted/failed)
- Has unique constraint on (vibelog_id, platform) to prevent duplicates
- Includes RLS policies for security

### New Profile Columns:
- `auto_post_twitter` - Boolean to enable/disable auto-posting
- `twitter_post_format` - Choice of 'teaser', 'full', or 'custom'
- `twitter_custom_template` - User's custom tweet template
- `auto_post_instagram` - Placeholder for future feature
- `auto_post_linkedin` - Placeholder for future feature

## Need Help?

If you encounter any issues:
1. Check the Supabase dashboard for error messages
2. Verify your database credentials are correct
3. Try running the SQL queries in the verification step above

The SQL file is located at:
```
/Users/vibeyang/vibelog/apply-018-migration.sql
```
