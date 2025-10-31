-- Supabase schema for vibelog
-- Run these statements in your Supabase SQL editor or via the Supabase CLI.

-- Extensions (for UUID generation if needed)
create extension if not exists "pgcrypto";

-- Rate limiting table used by server-side limiter (lib/rateLimit.ts)
create table if not exists public.rate_limits (
  key text not null,
  ip text not null,
  window_seconds integer not null default 60,
  count integer not null default 0,
  reset_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (key, ip)
);

create index if not exists rate_limits_reset_at_idx on public.rate_limits (reset_at);

-- User profiles table to store extended user information from OAuth providers
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  -- Basic profile info
  username text unique,
  display_name text,
  full_name text,
  email text,

  -- OAuth provider data
  avatar_url text,
  provider text, -- 'google', 'apple', etc.
  provider_id text,

  -- Google-specific data
  google_name text,
  google_given_name text,
  google_family_name text,
  google_picture text,
  google_email text,
  google_verified_email boolean,
  google_locale text,

  -- User preferences
  language text default 'en',
  timezone text,

  -- Profile settings
  is_public boolean not null default true,
  allow_search boolean not null default true,

  -- Subscription info
  subscription_tier text not null default 'free', -- 'free', 'pro', 'enterprise'
  subscription_status text not null default 'active',
  subscription_expires_at timestamptz,

  -- Stats
  total_vibelogs int not null default 0,
  total_views int not null default 0,
  total_shares int not null default 0,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

-- Indexes for profiles
create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_provider_idx on public.profiles (provider, provider_id);

-- Optional RLS for rate limits if you want to protect the table
alter table public.rate_limits enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'rate_limits' and policyname = 'server can manage rate limits'
  ) then
    create policy "server can manage rate limits" on public.rate_limits
      for all to service_role using (true) with check (true);
  end if;
end $$;

-- RLS for profiles
alter table public.profiles enable row level security;

-- Users can view public profiles or their own
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles select public or own'
  ) then
    create policy "profiles select public or own" on public.profiles
      for select
      using (
        is_public or auth.uid() = id
      );
  end if;
end $$;

-- Users can insert their own profile
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles insert own'
  ) then
    create policy "profiles insert own" on public.profiles
      for insert to authenticated
      with check (auth.uid() = id);
  end if;
end $$;

-- Users can update their own profile
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles update own'
  ) then
    create policy "profiles update own" on public.profiles
      for update to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;

-- Trigger to auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    provider,
    provider_id,
    google_name,
    google_given_name,
    google_family_name,
    google_picture,
    google_email,
    google_verified_email,
    google_locale,
    username,
    display_name,
    last_sign_in_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    split_part(new.app_metadata->>'provider', ',', 1),
    new.raw_user_meta_data->>'sub',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'given_name',
    new.raw_user_meta_data->>'family_name',
    new.raw_user_meta_data->>'picture',
    new.raw_user_meta_data->>'email',
    (new.raw_user_meta_data->>'email_verified')::boolean,
    new.raw_user_meta_data->>'locale',
    -- Generate username from email or name
    coalesce(
      lower(regexp_replace(new.raw_user_meta_data->>'name', '[^a-zA-Z0-9]', '', 'g')),
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    now()
  );
  return new;
end;
$$;

-- Trigger to update profile on sign in
create or replace function public.handle_user_signin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set
    last_sign_in_at = now(),
    updated_at = now()
  where id = new.id;
  return new;
end;
$$;

-- Create triggers
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists on_auth_user_signin on auth.users;
create trigger on_auth_user_signin
  after update of last_sign_in_at on auth.users
  for each row execute procedure public.handle_user_signin();

-- Core vibelogs table (optional now, supports future Save feature)
create table if not exists public.vibelogs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  transcription text not null,
  language text not null default 'en',

  word_count int not null default 0,
  read_time int not null default 0, -- minutes
  tags text[] not null default '{}',

  audio_url text,
  audio_duration int, -- seconds

  is_public boolean not null default false,
  is_published boolean not null default false,
  slug text unique,

  view_count int not null default 0,
  share_count int not null default 0,
  like_count int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists vibelogs_user_id_idx on public.vibelogs (user_id);
create index if not exists vibelogs_created_at_idx on public.vibelogs (created_at);

-- RLS for vibelogs
alter table public.vibelogs enable row level security;

-- Owners can select their own rows, and anyone can read published public posts
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='vibelogs' and policyname='vibelogs select public or own'
  ) then
    create policy "vibelogs select public or own" on public.vibelogs
      for select
      using (
        is_published and is_public or auth.uid() = user_id
      );
  end if;
end $$;

-- Owners can insert their own
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='vibelogs' and policyname='vibelogs insert own'
  ) then
    create policy "vibelogs insert own" on public.vibelogs
      for insert to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Owners can update their own
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='vibelogs' and policyname='vibelogs update own'
  ) then
    create policy "vibelogs update own" on public.vibelogs
      for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Owners can delete their own
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='vibelogs' and policyname='vibelogs delete own'
  ) then
    create policy "vibelogs delete own" on public.vibelogs
      for delete to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- Keep updated_at fresh on update
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_vibelogs_updated_at'
  ) then
    create trigger set_vibelogs_updated_at
      before update on public.vibelogs
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

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

