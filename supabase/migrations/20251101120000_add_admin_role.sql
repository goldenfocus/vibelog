-- Migration: Add Admin Role
-- Description: Add is_admin column to profiles table for admin permissions

-- Add is_admin column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;

-- Create index for fast admin checks (only index true values for efficiency)
CREATE INDEX IF NOT EXISTS profiles_is_admin_idx
ON public.profiles (is_admin)
WHERE is_admin = true;

-- Comment on column
COMMENT ON COLUMN public.profiles.is_admin IS 'Whether the user has admin privileges';

-- Note: To set specific users as admins, run queries like:
-- UPDATE public.profiles SET is_admin = true WHERE email = 'admin@example.com';
-- Or manually set is_admin = true in Supabase dashboard for specific user IDs
