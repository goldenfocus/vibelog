-- Enable public read access for storage buckets
-- This allows profile images and vibelogs to be publicly accessible

-- Create vibelogs bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('vibelogs', 'vibelogs', true)
on conflict (id) do update set public = true;

-- Drop existing policies if they exist (safe to re-run)
drop policy if exists "Public read access for vibelogs" on storage.objects;
drop policy if exists "Authenticated users can upload to own folder" on storage.objects;
drop policy if exists "Users can update own files" on storage.objects;
drop policy if exists "Users can delete own files" on storage.objects;
drop policy if exists "Public read access for tts-audio" on storage.objects;
drop policy if exists "Service role can manage TTS files" on storage.objects;

-- Allow public read access to vibelogs bucket
create policy "Public read access for vibelogs"
on storage.objects for select
using (bucket_id = 'vibelogs');

-- Allow authenticated users to upload to their own folder
create policy "Authenticated users can upload to own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'vibelogs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own files
create policy "Users can update own files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'vibelogs'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'vibelogs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
create policy "Users can delete own files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'vibelogs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Create TTS bucket if needed (for text-to-speech cache)
insert into storage.buckets (id, name, public)
values ('tts-audio', 'tts-audio', true)
on conflict (id) do update set public = true;

-- Allow public read access to TTS bucket
create policy "Public read access for tts-audio"
on storage.objects for select
using (bucket_id = 'tts-audio');

-- Only service role can manage TTS cache
create policy "Service role can manage TTS files"
on storage.objects for all
to service_role
using (bucket_id = 'tts-audio')
with check (bucket_id = 'tts-audio');
