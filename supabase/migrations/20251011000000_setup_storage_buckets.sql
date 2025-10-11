-- Create storage buckets for audio/video uploads
-- This allows unlimited file sizes by uploading directly to Supabase Storage

-- Create vibelogs bucket for audio, video, and images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vibelogs',
  'vibelogs',
  false, -- Private by default, controlled by RLS
  524288000, -- 500MB max file size (enough for 30min video)
  ARRAY[
    'audio/webm',
    'audio/wav',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/x-wav',
    'video/webm',
    'video/mp4',
    'video/quicktime',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for vibelogs bucket

-- Policy 1: Users can upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vibelogs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vibelogs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vibelogs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vibelogs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 5: Public read for published vibelogs (optional, for sharing)
CREATE POLICY "Public can read published files"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'vibelogs' AND
  (storage.foldername(name))[2] = 'public'
);
