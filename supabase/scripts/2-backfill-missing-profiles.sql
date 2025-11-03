-- ============================================================================
-- BACKFILL SCRIPT: Create Missing Profiles and Fix Issues
-- ============================================================================
-- Purpose: Fix all users who won't appear on the people's page
-- IMPORTANT: This makes changes to the database
-- Run the diagnostic script first to see what will be fixed
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  base_username TEXT;
  final_username TEXT;
  username_suffix INT;
  created_count INT := 0;
  fixed_username_count INT := 0;
  error_count INT := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting Profile Backfill Process';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- ============================================================================
  -- PART 1: Create Missing Profiles for Auth Users
  -- ============================================================================
  RAISE NOTICE '--- PART 1: Creating Missing Profiles ---';

  FOR user_record IN (
    SELECT
      u.id,
      u.email,
      u.raw_user_meta_data,
      u.app_metadata,
      u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL
    ORDER BY u.created_at
  ) LOOP
    BEGIN
      -- Generate base username from email or Google name
      base_username := COALESCE(
        -- Try to extract from Google name (remove special chars, lowercase)
        NULLIF(LOWER(REGEXP_REPLACE(user_record.raw_user_meta_data->>'name', '[^a-zA-Z0-9]', '', 'g')), ''),
        -- Fallback to email prefix
        NULLIF(LOWER(REGEXP_REPLACE(SPLIT_PART(user_record.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')), ''),
        -- Ultimate fallback
        'user'
      );

      -- Handle username conflicts with numeric suffix
      final_username := base_username;
      username_suffix := 0;
      WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
        username_suffix := username_suffix + 1;
        final_username := base_username || username_suffix;
      END LOOP;

      -- Create the missing profile
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
        user_record.id,
        user_record.email,
        COALESCE(
          user_record.raw_user_meta_data->>'full_name',
          user_record.raw_user_meta_data->>'name'
        ),
        user_record.raw_user_meta_data->>'avatar_url',
        SPLIT_PART(user_record.app_metadata->>'provider', ',', 1),
        user_record.raw_user_meta_data->>'sub',
        user_record.raw_user_meta_data->>'name',
        user_record.raw_user_meta_data->>'given_name',
        user_record.raw_user_meta_data->>'family_name',
        user_record.raw_user_meta_data->>'picture',
        user_record.raw_user_meta_data->>'email',
        (user_record.raw_user_meta_data->>'email_verified')::BOOLEAN,
        user_record.raw_user_meta_data->>'locale',
        final_username,  -- Generated username
        COALESCE(
          user_record.raw_user_meta_data->>'name',
          SPLIT_PART(user_record.email, '@', 1)
        ),
        true,  -- is_public = true by default
        true,  -- allow_search = true by default
        user_record.created_at,
        NOW(),
        NOW()
      );

      created_count := created_count + 1;
      RAISE NOTICE '✓ Created profile for % with username: %', user_record.email, final_username;

    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE WARNING '✗ Failed to create profile for %: %', user_record.email, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Part 1 Complete: % profiles created, % errors', created_count, error_count;
  RAISE NOTICE '';

  -- ============================================================================
  -- PART 2: Fix NULL Usernames
  -- ============================================================================
  RAISE NOTICE '--- PART 2: Fixing NULL Usernames ---';

  FOR user_record IN (
    SELECT
      p.id,
      p.email,
      u.raw_user_meta_data
    FROM public.profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE p.username IS NULL
    ORDER BY p.created_at
  ) LOOP
    BEGIN
      -- Generate base username from email or Google name
      base_username := COALESCE(
        NULLIF(LOWER(REGEXP_REPLACE(user_record.raw_user_meta_data->>'name', '[^a-zA-Z0-9]', '', 'g')), ''),
        NULLIF(LOWER(REGEXP_REPLACE(SPLIT_PART(user_record.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')), ''),
        'user'
      );

      -- Handle username conflicts
      final_username := base_username;
      username_suffix := 0;
      WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
        username_suffix := username_suffix + 1;
        final_username := base_username || username_suffix;
      END LOOP;

      -- Update the profile with generated username
      UPDATE public.profiles
      SET
        username = final_username,
        display_name = COALESCE(
          display_name,
          user_record.raw_user_meta_data->>'name',
          SPLIT_PART(user_record.email, '@', 1)
        ),
        updated_at = NOW()
      WHERE id = user_record.id;

      fixed_username_count := fixed_username_count + 1;
      RAISE NOTICE '✓ Fixed NULL username for % → %', user_record.email, final_username;

    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE WARNING '✗ Failed to fix username for %: %', user_record.email, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Part 2 Complete: % usernames fixed', fixed_username_count;
  RAISE NOTICE '';

  -- ============================================================================
  -- SUMMARY
  -- ============================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Backfill Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Profiles Created: %', created_count;
  RAISE NOTICE 'Usernames Fixed: %', fixed_username_count;
  RAISE NOTICE 'Errors: %', error_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run the diagnostic script again to verify all issues are fixed';
  RAISE NOTICE '2. Check the people page to confirm users appear';
  RAISE NOTICE '3. Consider running the prevention script to avoid future issues';
  RAISE NOTICE '========================================';
END $$;

-- Verify the fix
SELECT
  'After Backfill' as status,
  COUNT(CASE WHEN p.id IS NULL THEN 1 END) as missing_profiles,
  COUNT(CASE WHEN p.username IS NULL THEN 1 END) as null_usernames,
  COUNT(CASE WHEN p.username IS NOT NULL AND p.is_public = true THEN 1 END) as visible_on_people_page
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;
