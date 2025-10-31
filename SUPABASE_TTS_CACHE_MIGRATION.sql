-- TTS Cache Migration
-- Run this in Supabase SQL Editor to enable TTS caching
-- This will make TTS playback instant for repeated content and save API credits

-- TTS cache table for storing generated text-to-speech audio
create table if not exists public.tts_cache (
  id uuid primary key default gen_random_uuid(),
  content_hash text unique not null, -- SHA256 hash of (text + voice)
  text_content text not null,
  voice text not null default 'shimmer',
  audio_url text not null,
  audio_size_bytes bigint,
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now(),
  access_count int not null default 0
);

-- Index for fast lookups by content hash
create index if not exists tts_cache_content_hash_idx on public.tts_cache (content_hash);
-- Index for cleanup of old cache entries
create index if not exists tts_cache_last_accessed_idx on public.tts_cache (last_accessed_at);

-- RLS for tts_cache - public read access (anyone can use cached TTS)
alter table public.tts_cache enable row level security;

-- Anyone can read from cache (public benefit)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tts_cache' and policyname='tts_cache select public'
  ) then
    create policy "tts_cache select public" on public.tts_cache
      for select
      using (true);
  end if;
end $$;

-- Only service role can insert/update (for API caching)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tts_cache' and policyname='tts_cache manage service role'
  ) then
    create policy "tts_cache manage service role" on public.tts_cache
      for all to service_role
      using (true)
      with check (true);
  end if;
end $$;

-- Function to update last_accessed_at and increment access_count
create or replace function public.increment_tts_cache_access(p_content_hash text)
returns void
language plpgsql
security definer
as $$
begin
  update public.tts_cache
  set
    last_accessed_at = now(),
    access_count = access_count + 1
  where content_hash = p_content_hash;
end;
$$;
