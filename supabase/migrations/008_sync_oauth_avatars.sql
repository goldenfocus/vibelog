-- Sync OAuth avatars to profiles table
-- This ensures avatars from Google/GitHub OAuth are stored in profiles.avatar_url

-- Function to sync avatar from auth metadata to profile
CREATE OR REPLACE FUNCTION public.sync_user_avatar()
RETURNS TRIGGER AS $$
BEGIN
  -- On user creation or update, sync avatar from raw_user_meta_data to profiles
  INSERT INTO public.profiles (id, avatar_url, updated_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    NOW()
  )
  ON CONFLICT (id)
  DO UPDATE SET
    avatar_url = COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      public.profiles.avatar_url  -- Keep existing if no new avatar
    ),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_sync_avatar ON auth.users;

-- Create trigger on auth.users to sync avatar
CREATE TRIGGER on_auth_user_created_sync_avatar
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_avatar();

-- Backfill existing users' avatars from auth metadata
UPDATE public.profiles
SET avatar_url = COALESCE(
  (SELECT COALESCE(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  ) FROM auth.users u WHERE u.id = profiles.id),
  avatar_url  -- Keep existing if no OAuth avatar
),
updated_at = NOW()
WHERE avatar_url IS NULL
  OR avatar_url = '';

-- Add comment explaining the trigger
COMMENT ON FUNCTION public.sync_user_avatar() IS 'Syncs avatar_url from auth.users.raw_user_meta_data to profiles.avatar_url on user creation/update';
