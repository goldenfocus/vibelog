-- Fix handle_new_user trigger for Google OAuth signup
-- This fixes the "Database error saving new user" issue

-- Root causes identified from production logs:
-- 1. Trigger used NEW.app_metadata instead of NEW.raw_app_meta_data (field name typo)
-- 2. Trigger referenced subscription_tier column that doesn't exist (production has subscription_status)
-- 3. Broken notification_preferences trigger (table doesn't exist)

-- Step 1: Remove broken notification_preferences trigger
DROP TRIGGER IF EXISTS on_user_created_notification_prefs ON auth.users;
DROP FUNCTION IF EXISTS public.create_default_notification_preferences() CASCADE;

-- Step 2: Fix handle_new_user trigger with correct field names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  username_suffix INT := 0;
BEGIN
  -- Generate base username from email or name
  base_username := COALESCE(
    LOWER(REGEXP_REPLACE(NEW.raw_user_meta_data->>'name', '[^a-zA-Z0-9]', '', 'g')),
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Handle username conflicts by adding a numeric suffix
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    username_suffix := username_suffix + 1;
    final_username := base_username || username_suffix;
  END LOOP;

  -- Insert new profile
  -- Note: subscription_status will use its default value ('active')
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
    last_sign_in_at,
    is_premium
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    SPLIT_PART(NEW.raw_app_meta_data->>'provider', ',', 1),  -- Fixed: raw_app_meta_data not app_metadata
    NEW.raw_user_meta_data->>'sub',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'given_name',
    NEW.raw_user_meta_data->>'family_name',
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->>'email',
    (NEW.raw_user_meta_data->>'email_verified')::BOOLEAN,
    NEW.raw_user_meta_data->>'locale',
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NOW(),
    FALSE  -- Everyone starts as free tier
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create profile for user % (id: %): % - %', NEW.email, NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Step 3: Ensure the trigger is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up via OAuth';
