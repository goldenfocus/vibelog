# Missing Profiles Fix - SQL Scripts

## Problem Summary

Users were not appearing on the people's page (https://www.vibelog.io/people) even after successfully signing up with Google OAuth.

**Root Cause:** The `handle_new_user()` trigger that creates profiles during signup was failing silently for some users (likely due to database constraints, connection timeouts, or data parsing issues). The exception handler allowed user creation to succeed even when profile creation failed, resulting in users without profiles.

**Affected Users:**

- `love@chicoman.com`
- `thanhmai0107@gmail.com` (potentially)
- Unknown number of other users

## Why Users Don't Appear on People's Page

The people's page query requires:

1. A profile record exists in the `profiles` table
2. `username IS NOT NULL`
3. `is_public = true`

Users missing any of these won't appear.

---

## Quick Fix Instructions

### Step 1: Diagnose the Problem

Run this in Supabase SQL Editor:

```sql
-- Copy and paste the entire contents of:
-- supabase/scripts/1-diagnose-missing-profiles.sql
```

This will show you:

- How many users are missing profiles
- How many profiles have NULL usernames
- Specific users affected (including love@chicoman.com and thanhmai0107)
- Summary statistics

**Expected Output:**

```
issue_type       | user_id | email                | ...
-----------------+---------+----------------------+---
Missing Profile  | uuid    | love@chicoman.com    | ...
NULL Username    | uuid    | someone@example.com  | ...
```

---

### Step 2: Fix All Issues

Run this in Supabase SQL Editor:

```sql
-- Copy and paste the entire contents of:
-- supabase/scripts/2-backfill-missing-profiles.sql
```

This will:

- Create profiles for all users who are missing them
- Generate usernames from email addresses (e.g., `love@chicoman.com` → `love`)
- Handle username conflicts with numeric suffixes (e.g., `love1`, `love2`)
- Fix NULL usernames
- Set `is_public = true` for all profiles

**Expected Output:**

```
NOTICE:  ✓ Created profile for love@chicoman.com with username: love
NOTICE:  ✓ Created profile for thanhmai0107@gmail.com with username: thanhmai0107
NOTICE:  ========================================
NOTICE:  Backfill Complete!
NOTICE:  Profiles Created: 2
NOTICE:  Usernames Fixed: 0
NOTICE:  Errors: 0
```

---

### Step 3: Prevent Future Issues

Run this in Supabase SQL Editor:

```sql
-- Copy and paste the entire contents of:
-- supabase/scripts/3-prevent-future-issues.sql
```

This will:

- **Replace the `handle_new_user()` trigger** with an improved version:
  - Better username generation with multiple fallbacks
  - Detailed error logging for debugging
  - Safety limits to prevent infinite loops
  - Uses user ID as ultimate fallback if email fails

- **Add monitoring function** `check_missing_profiles()`:
  - Can be called manually or via cron job
  - Detects missing profiles and NULL usernames
  - Returns actionable report

- **Add app-level safeguard** `ensure_profile_exists(user_id)`:
  - Called automatically when users sign in (via AuthProvider)
  - Creates profiles on-the-fly if missing
  - Catches any users who slip through

**Expected Output:**

```
NOTICE:  ========================================
NOTICE:  Prevention Measures Installed
NOTICE:  1. ✓ Improved handle_new_user() trigger
NOTICE:  2. ✓ Monitoring function: check_missing_profiles()
NOTICE:  3. ✓ App-level safeguard: ensure_profile_exists(user_id)
```

---

### Step 4: Verify the Fix

Run the diagnostic script again:

```sql
-- Re-run: supabase/scripts/1-diagnose-missing-profiles.sql
```

**Expected Output:**

```
metric                      | count
----------------------------+------
Total Auth Users            | 150
Total Profiles              | 150
Missing Profiles            | 0     ← Should be 0!
Profiles with NULL Username | 0     ← Should be 0!
Visible on People Page      | 150
```

Then check the people's page:

- Visit https://www.vibelog.io/people
- Search for "love" - should see the new user
- Search for "thanhmai0107" - should see that user
- All users should now be visible

---

## What Changed in the Code

### 1. App-Level Safeguard (Automatic)

**File:** `lib/ensure-profile.ts` (NEW)

- Utility function to check/create profiles
- Called automatically when users sign in

**File:** `components/providers/AuthProvider.tsx` (MODIFIED)

- Imported `ensureProfileExists()`
- Calls it on `SIGNED_IN` event
- Creates missing profiles automatically on next sign-in

This means even if the backfill script wasn't run, affected users will get their profiles created automatically the next time they sign in!

### 2. Improved Database Trigger

**File:** `supabase/scripts/3-prevent-future-issues.sql`

- Improved `handle_new_user()` with better error handling
- Multiple fallbacks for username generation:
  1. Google name → `love@chicoman.com` uses Google metadata
  2. Email prefix → `love@chicoman.com` → `love`
  3. User ID → Ultimate fallback: `user123abc456def...`

### 3. Monitoring Function

**Function:** `public.check_missing_profiles()`

- Returns list of users with missing/broken profiles
- Can be called manually: `SELECT * FROM check_missing_profiles();`
- Can be scheduled with pg_cron for automatic monitoring

---

## For the User: love@chicoman.com

**Current Status:** No profile exists (diagnosed by script 1)

**After Running Scripts:**

1. Script 2 will create a profile with username `love`
2. User will appear on people's page immediately
3. Profile page accessible at https://www.vibelog.io/@love
4. Script 3 ensures this won't happen to future users
5. If script 2 wasn't run, user will get profile auto-created on next sign-in

**Note:** The username `love` might become `love1` or `love2` if there's already a user with that username.

---

## For Developers

### Testing the Fix

1. **Create a test user** via Google OAuth
2. **Check profile created:**
   ```sql
   SELECT id, email, username, is_public
   FROM profiles
   WHERE email = 'test@example.com';
   ```
3. **Verify appears on people page:**
   - Visit /people
   - Search for test username
4. **Test app-level safeguard:**
   - Manually delete profile: `DELETE FROM profiles WHERE email = 'test@example.com';`
   - Sign out and sign in again
   - Profile should be auto-created

### Monitoring

**Manual check:**

```sql
SELECT * FROM check_missing_profiles();
```

**Automated monitoring (optional):**

```sql
-- Requires pg_cron extension
SELECT cron.schedule(
  'check-missing-profiles-daily',
  '0 2 * * *',  -- 2 AM daily
  $$ SELECT * FROM check_missing_profiles(); $$
);
```

### Future Improvements

Consider making the trigger fail user creation if profile creation fails (stricter mode):

In `3-prevent-future-issues.sql`, uncomment this line:

```sql
-- RAISE EXCEPTION 'Profile creation failed for user %. User creation aborted.', new.email;
```

This ensures data consistency but users will see signup errors if profile creation fails.

---

## Summary

| Script                          | Purpose               | Safe?               | Required?     |
| ------------------------------- | --------------------- | ------------------- | ------------- |
| 1-diagnose-missing-profiles.sql | Find issues           | ✅ Read-only        | Run first     |
| 2-backfill-missing-profiles.sql | Fix existing issues   | ⚠️ Writes data      | Yes, run once |
| 3-prevent-future-issues.sql     | Prevent future issues | ⚠️ Alters functions | Yes, run once |

**Total time:** ~5 minutes to run all scripts

**Risk level:** Low - Scripts are idempotent (safe to run multiple times)

**Rollback:** Scripts don't delete data, only create/update. Profiles can be manually deleted if needed.

---

## Questions?

- Check the Supabase logs for detailed error messages
- Use `SELECT * FROM check_missing_profiles();` to monitor for issues
- Check console logs in browser for `[PROFILE-CHECK]` messages
- The app-level safeguard will catch most issues automatically going forward
