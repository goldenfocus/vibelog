-- Migration: Add anonymous user support to vibelogs (FIXED)
-- Allows saving vibelogs before sign-in with session_id, transfer ownership on sign-in

-- 1. Add session_id column for anonymous users
alter table public.vibelogs
  add column if not exists session_id text;

-- 2. Add teaser column
alter table public.vibelogs
  add column if not exists teaser text;

-- 3. Add cover_image_url column (already exists, skip error)
alter table public.vibelogs
  add column if not exists cover_image_url text;

-- 4. Make user_id nullable (allow anonymous vibelogs)
alter table public.vibelogs
  alter column user_id drop not null;

-- 5. Before adding constraint, ensure all existing rows have user_id
-- (Don't add constraint yet if there are rows with both null)

-- 6. Add index on session_id for quick lookups
create index if not exists vibelogs_session_id_idx on public.vibelogs (session_id);

-- 7. Update RLS policies to allow anonymous INSERT

-- Drop old policies
drop policy if exists "vibelogs select public or own" on public.vibelogs;
drop policy if exists "vibelogs select own" on public.vibelogs;
drop policy if exists "vibelogs select public" on public.vibelogs;
drop policy if exists "vibelogs insert own" on public.vibelogs;
drop policy if exists "vibelogs insert anonymous" on public.vibelogs;
drop policy if exists "vibelogs insert authenticated" on public.vibelogs;
drop policy if exists "vibelogs update own" on public.vibelogs;
drop policy if exists "vibelogs delete own" on public.vibelogs;
drop policy if exists "vibelogs service role update" on public.vibelogs;

-- Anyone can SELECT published public vibelogs
create policy "vibelogs select public"
  on public.vibelogs
  for select
  using (is_published and is_public);

-- Authenticated users can SELECT their own vibelogs
create policy "vibelogs select own"
  on public.vibelogs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Anonymous users can INSERT with session_id (no auth required)
create policy "vibelogs insert anonymous"
  on public.vibelogs
  for insert
  with check (user_id is null and session_id is not null);

-- Authenticated users can INSERT with user_id
create policy "vibelogs insert authenticated"
  on public.vibelogs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Authenticated users can UPDATE their own vibelogs
create policy "vibelogs update own"
  on public.vibelogs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Authenticated users can DELETE their own vibelogs
create policy "vibelogs delete own"
  on public.vibelogs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Service role can UPDATE any vibelog (for ownership transfer)
create policy "vibelogs service role update"
  on public.vibelogs
  for update
  to service_role
  using (true)
  with check (true);

-- 8. Create function to transfer vibelogs from session to user
create or replace function public.transfer_session_vibelogs(
  p_session_id text,
  p_user_id uuid
)
returns int
language plpgsql
security definer
as $$
declare
  transferred_count int;
begin
  -- Transfer all vibelogs from session_id to user_id
  update public.vibelogs
  set
    user_id = p_user_id,
    session_id = null,
    updated_at = now()
  where session_id = p_session_id;

  get diagnostics transferred_count = row_count;
  return transferred_count;
end;
$$;

-- Grant execute permission on transfer function
grant execute on function public.transfer_session_vibelogs(text, uuid) to authenticated;
grant execute on function public.transfer_session_vibelogs(text, uuid) to service_role;
