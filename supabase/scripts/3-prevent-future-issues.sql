-- ============================================================================
-- PREVENTION SCRIPT: Improved Trigger + Monitoring
-- ============================================================================
-- Purpose: Prevent profiles from failing to create in the future
-- Improvements:
--   1. More robust username generation with better fallbacks
--   2. Better error logging with detailed context
--   3. Optional: Fail user creation if profile fails (commented out by default)
--   4. Add a monitoring function to detect missing profiles
-- ============================================================================

-- ============================================================================
-- PART 1: Improved Profile Creation Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  username_suffix INT := 0;
  max_retries INT := 100; -- Prevent infinite loops
BEGIN
  RAISE LOG 'handle_new_user triggered for user: %', new.email;

  -- ============================================================================
  -- Step 1: Generate Base Username with Multiple Fallbacks
  -- ============================================================================
  base_username := NULL;

  -- Try 1: Google/OAuth name (remove special chars, lowercase)
  IF new.raw_user_meta_data->>'name' IS NOT NULL THEN
    base_username := LOWER(REGEXP_REPLACE(new.raw_user_meta_data->>'name', '[^a-zA-Z0-9]', '', 'g'));
    IF base_username = '' THEN
      base_username := NULL;
    END IF;
  END IF;

  -- Try 2: Email prefix (remove special chars, lowercase)
  IF base_username IS NULL AND new.email IS NOT NULL THEN
    base_username := LOWER(REGEXP_REPLACE(SPLIT_PART(new.email, '@', 1), '[^a-zA-Z0-9]', '', 'g'));
    IF base_username = '' THEN
      base_username := NULL;
    END IF;
  END IF;

  -- Try 3: User ID as ultimate fallback
  IF base_username IS NULL THEN
    base_username := 'user' || REPLACE(new.id::TEXT, '-', '')::TEXT;
    RAISE WARNING 'Using user ID as username base for %: %', new.email, base_username;
  END IF;

  -- ============================================================================
  -- Step 2: Handle Username Conflicts with Safety Limit
  -- ============================================================================
  final_username := base_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) AND username_suffix < max_retries LOOP
    username_suffix := username_suffix + 1;
    final_username := base_username || username_suffix;
  END LOOP;

  -- Safety check: Did we hit max retries?
  IF username_suffix >= max_retries THEN
    RAISE EXCEPTION 'Failed to generate unique username after % attempts for user %', max_retries, new.email;
  END IF;

  RAISE LOG 'Generated username % for user %', final_username, new.email;

  -- ============================================================================
  -- Step 3: Insert Profile with All Available Data
  -- ============================================================================
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    provider,
    provider_id,
    google_name,
    google_given_name,
    google_family_name,
    google_picture,
    google_email,
    google_verified_email,
    google_locale,
    username,
    display_name,
    is_public,
    allow_search,
    created_at,
    updated_at,
    last_sign_in_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    SPLIT_PART(new.app_metadata->>'provider', ',', 1),
    new.raw_user_meta_data->>'sub',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'given_name',
    new.raw_user_meta_data->>'family_name',
    new.raw_user_meta_data->>'picture',
    new.raw_user_meta_data->>'email',
    (new.raw_user_meta_data->>'email_verified')::BOOLEAN,
    new.raw_user_meta_data->>'locale',
    final_username,  -- Guaranteed to be unique and non-null
    COALESCE(new.raw_user_meta_data->>'name', SPLIT_PART(new.email, '@', 1), 'User'),
    true,  -- is_public = true by default
    true,  -- allow_search = true by default
    new.created_at,
    NOW(),
    NOW()
  );

  RAISE LOG 'Successfully created profile for user % with username %', new.email, final_username;

  RETURN new;

EXCEPTION
  WHEN OTHERS THEN
    -- Log detailed error information
    RAISE WARNING 'CRITICAL: Failed to create profile for user %', new.email;
    RAISE WARNING 'Error Code: %', SQLSTATE;
    RAISE WARNING 'Error Message: %', SQLERRM;
    RAISE WARNING 'Error Detail: %', COALESCE(CURRENT_EXCEPTION_DETAIL, 'No detail');
    RAISE WARNING 'User ID: %', new.id;
    RAISE WARNING 'Email: %', new.email;
    RAISE WARNING 'Raw Metadata: %', new.raw_user_meta_data;
    RAISE WARNING 'App Metadata: %', new.app_metadata;

    -- OPTION 1 (Default): Allow user creation to succeed even if profile fails
    -- This is more resilient but can lead to users without profiles
    RETURN new;

    -- OPTION 2 (Commented): Fail user creation if profile creation fails
    -- Uncomment the line below to make signup fail if profile creation fails
    -- This is stricter but ensures data consistency
    -- RAISE EXCEPTION 'Profile creation failed for user %. User creation aborted.', new.email;
END;
$$;

-- ============================================================================
-- PART 2: Monitoring Function - Detect Missing Profiles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_missing_profiles()
RETURNS TABLE (
  issue_type TEXT,
  user_id UUID,
  email TEXT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Missing profiles
  SELECT
    'missing_profile'::TEXT,
    u.id,
    u.email,
    FORMAT('User created at %s, no profile found', u.created_at)
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE p.id IS NULL

  UNION ALL

  -- NULL usernames
  SELECT
    'null_username'::TEXT,
    p.id,
    p.email,
    FORMAT('Profile exists but username is NULL')
  FROM public.profiles p
  WHERE p.username IS NULL;
END;
$$;

-- Grant execute permission to authenticated users (optional)
-- GRANT EXECUTE ON FUNCTION public.check_missing_profiles() TO authenticated;

COMMENT ON FUNCTION public.check_missing_profiles() IS
  'Monitoring function to detect users without profiles or with NULL usernames. '
  'Can be called periodically by a cron job or Edge Function to auto-fix issues.';

-- ============================================================================
-- PART 3: Scheduled Monitoring (Manual Setup Required)
-- ============================================================================

-- NOTE: This requires Supabase's pg_cron extension or an Edge Function
-- Below is a template for setting up automated monitoring

/*
-- Enable pg_cron if not already enabled (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily check at 2 AM UTC
SELECT cron.schedule(
  'check-missing-profiles-daily',
  '0 2 * * *',  -- Every day at 2 AM
  $$
  DO $$
  DECLARE
    issue_count INT;
  BEGIN
    SELECT COUNT(*) INTO issue_count FROM public.check_missing_profiles();

    IF issue_count > 0 THEN
      RAISE WARNING 'Found % users with profile issues. Consider running backfill script.', issue_count;
      -- Optionally: Call the backfill logic here to auto-fix
    END IF;
  END $$;
  $$
);
*/

-- ============================================================================
-- PART 4: App-Level Safeguard Function
-- ============================================================================

-- This function can be called from your app on first authenticated request
-- to ensure a profile exists for the user
CREATE OR REPLACE FUNCTION public.ensure_profile_exists(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_exists BOOLEAN;
  user_data RECORD;
  base_username TEXT;
  final_username TEXT;
  username_suffix INT := 0;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_id) INTO profile_exists;

  IF profile_exists THEN
    RETURN true;
  END IF;

  -- Profile missing - try to create it
  RAISE WARNING 'Profile missing for user %, attempting to create...', user_id;

  -- Get user data from auth.users
  SELECT * INTO user_data
  FROM auth.users
  WHERE id = user_id;

  IF NOT FOUND THEN
    RAISE WARNING 'User % not found in auth.users', user_id;
    RETURN false;
  END IF;

  -- Generate username
  base_username := COALESCE(
    NULLIF(LOWER(REGEXP_REPLACE(user_data.raw_user_meta_data->>'name', '[^a-zA-Z0-9]', '', 'g')), ''),
    NULLIF(LOWER(REGEXP_REPLACE(SPLIT_PART(user_data.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')), ''),
    'user'
  );

  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    username_suffix := username_suffix + 1;
    final_username := base_username || username_suffix;
  END LOOP;

  -- Create profile
  INSERT INTO public.profiles (
    id, email, username, display_name, is_public, allow_search,
    created_at, updated_at, last_sign_in_at
  )
  VALUES (
    user_id,
    user_data.email,
    final_username,
    COALESCE(user_data.raw_user_meta_data->>'name', SPLIT_PART(user_data.email, '@', 1)),
    true,
    true,
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created missing profile for user % with username %', user_data.email, final_username;
  RETURN true;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', user_id, SQLERRM;
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.ensure_profile_exists(UUID) IS
  'App-level safeguard: Creates a profile for a user if it does not exist. '
  'Call this on first authenticated request to catch users who slipped through. '
  'Returns true if profile exists or was created, false on error.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the monitoring function
SELECT * FROM public.check_missing_profiles();

-- Show current statistics
SELECT
  'Total Auth Users' as metric,
  COUNT(*)::TEXT as value
FROM auth.users
UNION ALL
SELECT
  'Total Profiles',
  COUNT(*)::TEXT
FROM public.profiles
UNION ALL
SELECT
  'Missing Profiles',
  COUNT(*)::TEXT
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
UNION ALL
SELECT
  'NULL Usernames',
  COUNT(*)::TEXT
FROM public.profiles
WHERE username IS NULL;

-- ============================================================================
-- SUMMARY
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Prevention Measures Installed';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. ✓ Improved handle_new_user() trigger';
  RAISE NOTICE '   - Better username generation';
  RAISE NOTICE '   - Detailed error logging';
  RAISE NOTICE '   - Fallback to user ID if needed';
  RAISE NOTICE '';
  RAISE NOTICE '2. ✓ Monitoring function: check_missing_profiles()';
  RAISE NOTICE '   - Detects missing profiles and NULL usernames';
  RAISE NOTICE '   - Can be called manually or scheduled';
  RAISE NOTICE '';
  RAISE NOTICE '3. ✓ App-level safeguard: ensure_profile_exists(user_id)';
  RAISE NOTICE '   - Call from app on first authenticated request';
  RAISE NOTICE '   - Auto-creates missing profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'Optional Next Steps:';
  RAISE NOTICE '- Set up pg_cron for automated monitoring (see comments)';
  RAISE NOTICE '- Add ensure_profile_exists() call in your app AuthProvider';
  RAISE NOTICE '- Consider uncommenting strict mode in trigger (fails signup on error)';
  RAISE NOTICE '========================================';
END $$;
