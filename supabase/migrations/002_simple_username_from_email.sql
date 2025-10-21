-- Simple username generation from email (MVP approach)
-- No username reservation, no redirects (for later)
-- Date: 2025-10-21

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
  counter int := 1;
BEGIN
  -- Extract username from email (part before @)
  base_username := lower(split_part(coalesce(new.email, ''), '@', 1));

  -- Remove any non-alphanumeric characters
  base_username := regexp_replace(base_username, '[^a-z0-9]', '', 'g');

  -- Fallback if empty
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user';
  END IF;

  -- Find unique username by appending numbers
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    final_username := base_username || counter::text;
    counter := counter + 1;
    -- Safety exit after 1000 attempts
    IF counter > 1000 THEN
      final_username := 'user' || floor(random() * 999999)::text;
      EXIT;
    END IF;
  END LOOP;

  -- Insert profile with email-based username
  INSERT INTO public.profiles (
    id,
    email,
    username,
    display_name,
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
    last_sign_in_at,
    username_changed_at
  )
  VALUES (
    new.id,
    new.email,
    final_username,
    coalesce(new.raw_user_meta_data->>'name', final_username),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    split_part(coalesce(new.app_metadata->>'provider', 'email'), ',', 1),
    new.raw_user_meta_data->>'sub',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'given_name',
    new.raw_user_meta_data->>'family_name',
    new.raw_user_meta_data->>'picture',
    new.raw_user_meta_data->>'email',
    CASE
      WHEN new.raw_user_meta_data->>'email_verified' IS NULL THEN NULL
      ELSE (new.raw_user_meta_data->>'email_verified')::boolean
    END,
    new.raw_user_meta_data->>'locale',
    now(),
    NULL  -- username_changed_at starts as NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    last_sign_in_at = now(),
    updated_at = now();

  RETURN new;
END;
$$;

-- Add username_changed_at column to track one-time change
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username_changed_at timestamptz;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Comment for documentation
COMMENT ON COLUMN public.profiles.username_changed_at IS 'Timestamp when user changed their username (NULL = never changed, can change once)';
