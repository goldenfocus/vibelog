-- Add tone and content preference columns to support customizable writing styles
-- This allows users to control how their vibelogs are generated

-- Add tone preferences to profiles table
alter table public.profiles
  add column if not exists default_writing_tone text default 'authentic',
  add column if not exists keep_filler_words boolean default false,
  add column if not exists voice_cloning_enabled boolean default true;

-- Add check constraint to ensure valid tone values
alter table public.profiles
  add constraint valid_writing_tone check (
    default_writing_tone in (
      'authentic',
      'professional',
      'casual',
      'humorous',
      'inspiring',
      'analytical',
      'storytelling',
      'dramatic',
      'poetic'
    )
  );

-- Create index for faster tone queries (useful for analytics)
create index if not exists profiles_default_writing_tone_idx on public.profiles (default_writing_tone);

-- Add comments for documentation
comment on column public.profiles.default_writing_tone is 'Default tone for vibelog generation (authentic, professional, casual, humorous, inspiring, analytical, storytelling, dramatic, poetic)';
comment on column public.profiles.keep_filler_words is 'Whether to preserve filler words (ums, ahs) in transcriptions for authentic feel';
comment on column public.profiles.voice_cloning_enabled is 'Whether voice cloning is enabled for this user';
