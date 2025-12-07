-- Migration: Sync profile.total_vibelogs from vibelogs count
-- This ensures that profile.total_vibelogs is always accurate by counting published public vibelogs

-- Function to sync profile.total_vibelogs from vibelogs
-- This counts all published public vibelogs for a user
create or replace function public.sync_profile_total_vibelogs(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_total_vibelogs int;
begin
  -- Count total published public vibelogs for this user
  select coalesce(count(*), 0)
  into v_total_vibelogs
  from public.vibelogs
  where user_id = p_user_id
    and is_published = true
    and is_public = true;

  -- Update the profile's total_vibelogs
  update public.profiles
  set total_vibelogs = v_total_vibelogs
  where id = p_user_id;
end;
$$;

-- Function to sync profile.total_vibelogs when vibelogs are created/updated/deleted
-- This trigger function updates the profile when a vibelog's publication status changes
create or replace function public.update_profile_total_vibelogs_on_vibelog_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Handle INSERT or UPDATE
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    -- Update profile for the vibelog owner
    if new.user_id is not null then
      perform public.sync_profile_total_vibelogs(new.user_id);
    end if;
  end if;

  -- Handle DELETE
  if tg_op = 'DELETE' and old.user_id is not null then
    -- If vibelog is deleted, sync the profile to recalculate total
    perform public.sync_profile_total_vibelogs(old.user_id);
  end if;

  return coalesce(new, old);
end;
$$;

-- Trigger to automatically update profile.total_vibelogs when vibelogs are created/updated/deleted
drop trigger if exists update_profile_total_vibelogs_on_vibelog_change on public.vibelogs;
create trigger update_profile_total_vibelogs_on_vibelog_change
  after insert or update of is_published, is_public or delete on public.vibelogs
  for each row
  execute function public.update_profile_total_vibelogs_on_vibelog_change();

-- Function to backfill profile.total_vibelogs for all users
-- Call this once to sync existing data: SELECT public.backfill_profile_total_vibelogs();
create or replace function public.backfill_profile_total_vibelogs()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  user_record record;
begin
  -- Loop through all profiles and sync their total_vibelogs
  for user_record in select id from public.profiles loop
    perform public.sync_profile_total_vibelogs(user_record.id);
  end loop;
end;
$$;
