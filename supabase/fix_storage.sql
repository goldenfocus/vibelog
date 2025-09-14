-- Disable RLS for development on storage buckets
-- This allows the service role to upload images without policy restrictions

-- First, let's create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('vibelog-covers', 'vibelog-covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow service role to upload to the bucket
INSERT INTO storage.policies (id, bucket_id, name, type, definition, roles)
VALUES (
  'service_role_upload_vibelog_covers',
  'vibelog-covers',
  'Allow service role to upload to vibelog-covers bucket',
  'permissive',
  '(true)',
  ARRAY['service_role']
) ON CONFLICT (id) DO NOTHING;

-- Allow public read access to the bucket
INSERT INTO storage.policies (id, bucket_id, name, type, definition, roles)
VALUES (
  'public_read_vibelog_covers',
  'vibelog-covers',
  'Allow public read access to vibelog-covers bucket',
  'permissive',
  '(true)',
  ARRAY['anon', 'authenticated']
) ON CONFLICT (id) DO NOTHING;