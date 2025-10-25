-- Migration: Better username generation based on email
-- Date: 2025-01-25
-- Purpose: Generate nice usernames like "yanik77" instead of "user1761374199.491668ff3480"

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
  counter int := 0;
BEGIN
  -- Try to extract username from email first (everything before @)
  base_username := lower(split_part(coalesce(new.email, ''), '@', 1));

  -- Remove any non-alphanumeric characters
  base_username := regexp_replace(base_username, '[^a-z0-9]', '', 'g');

  -- If still empty or too short, try using name from metadata
  IF base_username IS NULL OR length(base_username) < 3 THEN
    base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'name', ''), '[^a-zA-Z0-9]', '', 'g'));
  END IF;

  -- Final fallback: use "viber" + random 4 digits
  IF base_username IS NULL OR length(base_username) < 3 THEN
    base_username := 'viber' || lpad(floor(random() * 10000)::text, 4, '0');
  END IF;

  -- Find a unique username by appending numbers if needed
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
    -- Safety exit after 100 attempts
    IF counter > 100 THEN
      final_username := base_username || lpad(floor(random() * 10000)::text, 4, '0');
      EXIT;
    END IF;
  END LOOP;

  -- Insert profile with error handling
  BEGIN
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
      last_sign_in_at
    )
    VALUES (
      new.id,
      new.email,
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
      final_username,
      coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1), 'User'),
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: minimal insert with guaranteed unique username
    RAISE WARNING 'Failed to create full profile for user %: %', new.id, SQLERRM;

    INSERT INTO public.profiles (id, email, username, display_name, last_sign_in_at)
    VALUES (
      new.id,
      new.email,
      'viber' || lpad(floor(random() * 100000)::text, 5, '0'),
      coalesce(new.raw_user_meta_data->>'name', 'Vibelogger'),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  END;

  RETURN new;
END;
$$;

-- Recreate the trigger to ensure it's using the new function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
