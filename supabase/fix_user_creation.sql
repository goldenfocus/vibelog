-- Fix user creation issues that cause "Database error saving new user"
-- Run this in your Supabase SQL editor

-- 1. Update the handle_new_user function to be more robust
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
  -- Generate base username from email or name
  base_username := coalesce(
    lower(regexp_replace(coalesce(new.raw_user_meta_data->>'name', ''), '[^a-zA-Z0-9]', '', 'g')),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  -- Ensure base_username is not empty
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user' || extract(epoch from now())::text;
  END IF;

  -- Find a unique username
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
    -- Safety exit after 100 attempts
    IF counter > 100 THEN
      final_username := 'user' || extract(epoch from now())::text || random()::text;
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
      new.raw_user_meta_data->>'avatar_url',
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
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;

    -- Try a minimal insert as fallback
    INSERT INTO public.profiles (id, email, username, display_name, last_sign_in_at)
    VALUES (
      new.id,
      new.email,
      'user' || extract(epoch from now())::text || substr(md5(random()::text), 1, 6),
      coalesce(new.raw_user_meta_data->>'name', 'User'),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  END;

  RETURN new;
END;
$$;

-- 2. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Ensure RLS policies are correct for authenticated users
-- Drop and recreate the insert policy to be more permissive
DROP POLICY IF EXISTS "profiles insert own" ON public.profiles;
CREATE POLICY "profiles insert own" ON public.profiles
  FOR INSERT TO authenticated, service_role
  WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

-- 4. Allow service_role to manage profiles (for the trigger)
GRANT ALL ON TABLE public.profiles TO service_role;

-- 5. Create a function to test user creation manually
CREATE OR REPLACE FUNCTION public.test_user_creation(test_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- This simulates what happens during user creation
  INSERT INTO public.profiles (
    id,
    email,
    username,
    display_name,
    last_sign_in_at
  )
  VALUES (
    gen_random_uuid(),
    test_email,
    'test' || extract(epoch from now())::text,
    'Test User',
    now()
  )
  RETURNING jsonb_build_object(
    'success', true,
    'id', id,
    'username', username,
    'email', email
  ) INTO result;

  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_user_creation(text) TO service_role;