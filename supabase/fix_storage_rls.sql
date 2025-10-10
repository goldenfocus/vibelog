-- Fix storage bucket RLS policies for vibelog-covers bucket
-- This allows uploads from both authenticated users and service_role

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "vibelog-covers public read" ON storage.objects;
DROP POLICY IF EXISTS "vibelog-covers authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "vibelog-covers service role all" ON storage.objects;
DROP POLICY IF EXISTS "vibelog-covers anon read" ON storage.objects;

-- Policy: Anyone can read public files
CREATE POLICY "vibelog-covers public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vibelog-covers');

-- Policy: Authenticated users can upload their own files
CREATE POLICY "vibelog-covers authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vibelog-covers'
  AND (
    -- Allow uploads to user's own directory
    (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  ) OR (
    -- Allow uploads to covers directory
    (storage.foldername(name))[1] = 'covers'
  ) OR (
    -- Allow uploads to posts directory
    (storage.foldername(name))[1] = 'posts'
  ) OR (
    -- Allow uploads to sessions directory (for anonymous users)
    (storage.foldername(name))[1] = 'sessions'
  )
);

-- Policy: Service role has full access
CREATE POLICY "vibelog-covers service role all"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'vibelog-covers')
WITH CHECK (bucket_id = 'vibelog-covers');

-- Policy: Anonymous users can upload to sessions directory
CREATE POLICY "vibelog-covers anon upload"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'vibelog-covers'
  AND (storage.foldername(name))[1] = 'sessions'
);

-- Update bucket to ensure it exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vibelog-covers',
  'vibelog-covers',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4'];
