-- Migration: Create comments table for vibelogs
-- Allows users to comment on vibelogs with text or voice

-- Create comments table
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  vibelog_id uuid not null references public.vibelogs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Comment content
  content text, -- Text content (optional if audio_url is provided)
  audio_url text, -- URL to audio file for voice comments
  voice_id text, -- Voice clone ID used for TTS (if text comment was converted to voice)
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for efficient queries
create index if not exists comments_vibelog_id_idx on public.comments (vibelog_id);
create index if not exists comments_user_id_idx on public.comments (user_id);
create index if not exists comments_created_at_idx on public.comments (created_at);

-- Enable RLS
alter table public.comments enable row level security;

-- Anyone can view comments on public vibelogs or their own comments
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments select public or own'
  ) then
    create policy "comments select public or own" on public.comments
      for select
      using (
        -- Can view if vibelog is public and published, or if user owns the comment, or if user owns the vibelog
        exists (
          select 1 from public.vibelogs
          where vibelogs.id = comments.vibelog_id
            and (
              (vibelogs.is_published = true and vibelogs.is_public = true)
              or vibelogs.user_id = auth.uid()
              or comments.user_id = auth.uid()
            )
        )
      );
  end if;
end $$;

-- Authenticated users can insert their own comments
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments insert authenticated'
  ) then
    create policy "comments insert authenticated" on public.comments
      for insert to authenticated
      with check (
        auth.uid() = user_id
        and exists (
          select 1 from public.vibelogs
          where vibelogs.id = comments.vibelog_id
            and (
              vibelogs.is_published = true
              or vibelogs.user_id = auth.uid()
            )
        )
      );
  end if;
end $$;

-- Users can update their own comments
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments update own'
  ) then
    create policy "comments update own" on public.comments
      for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Users can delete their own comments
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments delete own'
  ) then
    create policy "comments delete own" on public.comments
      for delete to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- Trigger to update updated_at on comment updates
do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_comments_updated_at'
  ) then
    create trigger set_comments_updated_at
      before update on public.comments
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

