-- Fix RLS policies to allow presigned URL uploads
-- Presigned URLs bypass authentication, so we need to allow anon role

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;

-- Allow uploads via presigned URLs (anon role) + authenticated users
CREATE POLICY "Allow presigned uploads"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'vibelogs'
);
