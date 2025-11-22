-- Fix handle_new_user trigger to include new profile columns
-- This fixes the "Database error saving new user" issue for Google OAuth signups

-- Drop and recreate the trigger function with all current profile columns
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

  -- Insert new profile with all required columns
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
    is_premium,
    subscription_tier
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    SPLIT_PART(NEW.app_metadata->>'provider', ',', 1),
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
    FALSE,  -- is_premium defaults to FALSE
    'free'  -- subscription_tier defaults to 'free'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up via OAuth';
