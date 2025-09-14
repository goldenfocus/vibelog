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

-- RLS for rate limits - allow service role and anonymous access for rate limiting
alter table public.rate_limits enable row level security;

-- Service role can do everything
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'rate_limits' and policyname = 'service_role can manage rate limits'
  ) then
    create policy "service_role can manage rate limits" on public.rate_limits
      for all to service_role using (true) with check (true);
  end if;
end $$;

-- Allow anonymous and authenticated users to insert/update rate limit records
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'rate_limits' and policyname = 'allow rate limit operations'
  ) then
    create policy "allow rate limit operations" on public.rate_limits
      for all using (true) with check (true);
  end if;
end $$;

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

-- Storage bucket setup for cover images
insert into storage.buckets (id, name, public) values ('covers', 'covers', true) on conflict do nothing;

