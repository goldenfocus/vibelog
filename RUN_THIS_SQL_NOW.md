# 🚨 CRITICAL: Run This SQL to Fix Admin Panel

## Why This is Needed

The `/admin` page is giving a 500 error because the database tables and columns don't exist yet in production. The Supabase CLI can't connect due to authentication/connection issues, so we need to run the SQL manually.

## Step 1: Open Supabase SQL Editor

Click this link:
**https://supabase.com/dashboard/project/ogqcycqctxulcvhjeiii/sql/new**

## Step 2: Copy the Entire SQL File

Open the file `consolidated-migrations.sql` in this directory (343 lines) and copy ALL of it.

**OR** copy from below (exact same content):

<details>
<summary>Click to expand SQL (343 lines)</summary>

```sql
-- Migration: Create comments table for vibelogs
-- Allows users to comment on vibelogs with text or voice

-- Create comments table
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  vibelog_id uuid not null references public.vibelogs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Comment content
  content text, -- Text content (optional if audio_url is provided)
  audio_url text, -- URL to audio file for voice comments
  voice_id text, -- Voice clone ID used for TTS (if text comment was converted to voice)

  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- [REST OF consolidated-migrations.sql - 343 lines total]
```

</details>

## Step 3: Paste and Run

1. Paste the entire SQL into the editor
2. Click the green "Run" button
3. Wait for it to complete (~5-10 seconds)
4. You should see "Success. No rows returned" or similar

## Step 4: Grant Admin Privileges

After the migrations succeed, run this second SQL query:

```sql
UPDATE profiles
SET is_admin = true
WHERE email IN ('yanik@yanik.com', 'yan@veganz.net', 'cacaoconnexions@gmail.com');

-- Verify it worked
SELECT email, username, is_admin
FROM profiles
WHERE is_admin = true;
```

You should see 3 rows returned with `is_admin = true`.

## Step 5: Test

1. Go to https://www.vibelog.io/admin
2. Should load successfully (no more 500 error!)
3. Click "Users" tab
4. You'll see the **eye icon** (God Mode button) next to each user

## What Gets Created

This SQL creates:
- ✅ `comments` table (for future commenting feature)
- ✅ `profiles.is_admin` column (admin access control)
- ✅ `tts_usage_log` table (track TTS usage)
- ✅ `user_quotas` table (daily limits per user)
- ✅ `app_config` table (configurable settings)
- ✅ `admin_audit_log` table (security logging)

## Troubleshooting

**If you get an error about a table already existing:**
- That's OK! The SQL uses `IF NOT EXISTS` so it's safe to run multiple times
- Just continue with the rest

**If admin flag doesn't set:**
- Check the email addresses match exactly
- The script earlier showed the correct emails are:
  - vibeyang: `yanik@yanik.com`
  - yanlovez: `yan@veganz.net`
  - yang: `cacaoconnexions@gmail.com`

## File Location

The complete SQL is in:
- `/Users/vibeyang/vibelog/consolidated-migrations.sql`

Just open it and copy everything!
