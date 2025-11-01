-- Add voice_clone_id columns to support voice cloning feature
-- This allows storing ElevenLabs voice clone IDs for users and vibelogs

-- Add voice_clone_id to profiles table
alter table public.profiles
  add column if not exists voice_clone_id text,
  add column if not exists voice_clone_name text;

-- Add voice_clone_id to vibelogs table
alter table public.vibelogs
  add column if not exists voice_clone_id text;

-- Create indexes for faster lookups
create index if not exists profiles_voice_clone_id_idx on public.profiles (voice_clone_id)
  where voice_clone_id is not null;

create index if not exists vibelogs_voice_clone_id_idx on public.vibelogs (voice_clone_id)
  where voice_clone_id is not null;

-- Add comments for documentation
comment on column public.profiles.voice_clone_id is 'ElevenLabs voice clone ID for this user';
comment on column public.profiles.voice_clone_name is 'Name of the cloned voice';
comment on column public.vibelogs.voice_clone_id is 'ElevenLabs voice clone ID used to generate audio for this vibelog';

