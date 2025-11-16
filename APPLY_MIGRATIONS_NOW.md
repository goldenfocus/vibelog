# 🚀 Apply Migrations - Simple 3-Step Guide

The Supabase CLI can't connect (max connections + permission issues). Here's the manual approach:

## Step 1: Run the SQL (2 minutes)

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/ogqcycqctxulcvhjeiii/sql/new
   ```

2. **Copy & paste the entire `consolidated-migrations.sql` file**

3. **Click "Run"** - Should complete in ~5 seconds

## Step 2: Grant Admin Privileges (30 seconds)

**Option A - Via SQL Editor (Recommended):**

Paste this in the same SQL Editor:

```sql
UPDATE profiles
SET is_admin = true
WHERE email IN ('yanlovez@gmail.com', 'vibeyang@gmail.com', 'yang@anthropic.com');

-- Verify it worked
SELECT email, is_admin FROM profiles WHERE is_admin = true;
```

**Option B - Via Node Script:**

```bash
node setup-admin.js
```

## Step 3: Verify (1 minute)

1. Log in to Vibelog
2. Go to `/admin`
3. You should see the admin dashboard!

---

## What Gets Created

These 4 migrations create:

- ✅ **comments** table (for future commenting feature)
- ✅ **is_admin** column in profiles (admin access control)
- ✅ **tts_usage_log** table (track TTS usage)
- ✅ **user_quotas** table (daily limits per user)
- ✅ **app_config** table (configurable settings)
- ✅ **admin_audit_log** table (security logging)

## Default Config Values

- Anonymous TTS daily limit: 3
- Registered TTS daily limit: 30
- Cost alert threshold: $90
- Preview audio limit: 9 seconds

## Troubleshooting

**If SQL fails with "column already exists":**
- Some migrations may have partially applied
- Check the error message
- Comment out the failing CREATE/ALTER statement
- Run the rest

**If admin flag doesn't work:**
- Make sure you're logged in as one of the 3 emails
- Try logging out and back in
- Check browser console for errors

## Why CLI Doesn't Work

Your Supabase project isn't linked locally (no `.supabase/` folder), and when trying to link:
- ❌ "unexpected unban status 403" - permission issue
- ❌ "max clients reached" - connection pool full

Manual SQL execution bypasses all these issues! 🎉

---

**Total time: ~3 minutes** | **Then you can deploy!** 🚀
