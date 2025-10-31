-- Create vibelog_likes table for tracking user likes
create table if not exists public.vibelog_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vibelog_id uuid not null references public.vibelogs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, vibelog_id) -- Prevent duplicate likes
);

-- Indexes for fast lookups
create index if not exists vibelog_likes_user_id_idx on public.vibelog_likes (user_id);
create index if not exists vibelog_likes_vibelog_id_idx on public.vibelog_likes (vibelog_id);
create index if not exists vibelog_likes_created_at_idx on public.vibelog_likes (created_at);

-- RLS for vibelog_likes
alter table public.vibelog_likes enable row level security;

-- Users can view all likes (for counts)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='vibelog_likes' and policyname='vibelog_likes select public'
  ) then
    create policy "vibelog_likes select public" on public.vibelog_likes
      for select
      using (true);
  end if;
end $$;

-- Users can insert their own likes
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='vibelog_likes' and policyname='vibelog_likes insert own'
  ) then
    create policy "vibelog_likes insert own" on public.vibelog_likes
      for insert to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Users can delete their own likes
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='vibelog_likes' and policyname='vibelog_likes delete own'
  ) then
    create policy "vibelog_likes delete own" on public.vibelog_likes
      for delete to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- Function to update like_count when a like is added/removed
create or replace function public.update_vibelog_like_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.vibelogs
    set like_count = like_count + 1
    where id = new.vibelog_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.vibelogs
    set like_count = greatest(0, like_count - 1)
    where id = old.vibelog_id;
    return old;
  end if;
  return null;
end;
$$;

-- Trigger to update like_count
drop trigger if exists update_vibelog_like_count_trigger on public.vibelog_likes;
create trigger update_vibelog_like_count_trigger
  after insert or delete on public.vibelog_likes
  for each row
  execute function public.update_vibelog_like_count();

