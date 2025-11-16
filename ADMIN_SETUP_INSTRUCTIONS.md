# Admin Setup Instructions

This guide will help you apply the pending database migrations and set up admin users for the Vibelog admin panel.

## Problem

The Supabase CLI is experiencing connection issues and migration sync problems. We'll apply the migrations manually via the Supabase Dashboard.

## Step 1: Apply Database Migrations

1. **Open the Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/ogqcycqctxulcvhjeiii/sql/new

2. **Copy the consolidated migrations:**
   - Open the file `consolidated-migrations.sql` in this directory
   - Copy all the SQL content (343 lines)

3. **Execute in Supabase:**
   - Paste the SQL into the SQL Editor
   - Click "Run" to execute all migrations at once

4. **Verify the migrations:**
   - Check that these tables exist in the [Table Editor](https://supabase.com/dashboard/project/ogqcycqctxulcvhjeiii/table-editor):
     - `comments` (new)
     - `profiles` (should have new `is_admin` column)
     - `tts_usage_log` (new)
     - `user_quotas` (new)
     - `app_config` (new)
     - `admin_audit_log` (new)

## Step 2: Set Admin Flags

After migrations are applied, run this script to grant admin privileges:

```bash
node setup-admin.js
```

This will set `is_admin = true` for:
- yanlovez@gmail.com
- vibeyang@gmail.com
- yang@anthropic.com

**OR** manually run this SQL in the Dashboard:

```sql
UPDATE profiles
SET is_admin = true
WHERE email IN ('yanlovez@gmail.com', 'vibeyang@gmail.com', 'yang@anthropic.com');
```

## Step 3: Verify Admin Panel

1. **Log in** as one of the admin users
2. **Visit** `/admin` route
3. **Check** that you can access:
   - Dashboard (overview stats)
   - Users (manage users and admin privileges)
   - Vibelogs (view/edit/delete all vibelogs)
   - Config (manage quotas and limits)

## Step 4: Test God Mode (Optional)

1. In the **Users** page of admin panel
2. Click "Enter God Mode" on any user
3. Verify you can act as that user
4. Check that the God Mode banner appears
5. Exit God Mode using the banner

## Troubleshooting

### If migrations fail:

Check for existing columns/tables:
```sql
-- Check if is_admin already exists
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_admin';

-- Check existing tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

### If admin flags don't work:

Manually verify the update:
```sql
SELECT id, email, display_name, is_admin
FROM profiles
WHERE email IN ('yanlovez@gmail.com', 'vibeyang@gmail.com', 'yang@anthropic.com');
```

## What These Migrations Do

1. **012_create_comments_table.sql**
   - Creates `comments` table for vibelog comments
   - Adds RLS policies for comment access

2. **013_add_admin_role.sql**
   - Adds `is_admin` boolean column to profiles
   - Creates index for efficient admin checks

3. **014_create_usage_tracking.sql**
   - Creates `tts_usage_log` for tracking TTS usage
   - Creates `user_quotas` for daily limits
   - Creates `app_config` for configurable settings
   - Sets default quotas and limits

4. **015_create_admin_audit_log.sql**
   - Creates `admin_audit_log` for tracking admin actions
   - Adds helper function `log_admin_action()`
   - Enables audit logging for security

## Next Steps After Setup

1. **Deploy to production** - All code is ready!
2. **Monitor costs** in the admin dashboard
3. **Set Modal to min_containers=0** to save ~$432/month
4. **Configure quotas** via the Config page as needed

## Support

If you encounter any issues:
- Check the Supabase Dashboard logs
- Verify migrations ran successfully
- Check browser console for API errors
- Verify admin flag is set correctly
