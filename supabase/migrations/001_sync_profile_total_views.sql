-- Migration: Sync profile.total_views from vibelogs.view_count
-- This ensures that profile.total_views is always accurate by aggregating from vibelogs

-- Function to sync profile.total_views from vibelogs
-- This aggregates view_count from all published public vibelogs for a user
create or replace function public.sync_profile_total_views(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_total_views int;
begin
  -- Calculate total views from all published public vibelogs for this user
  select coalesce(sum(view_count), 0)
  into v_total_views
  from public.vibelogs
  where user_id = p_user_id
    and is_published = true
    and is_public = true;

  -- Update the profile's total_views
  update public.profiles
  set total_views = v_total_views
  where id = p_user_id;
end;
$$;

-- Function to sync profile.total_views when vibelogs.view_count changes
-- This trigger function updates the profile when a vibelog's view_count changes
create or replace function public.update_profile_total_views_on_view_count_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Only update if view_count actually changed and vibelog is published/public
  if (tg_op = 'UPDATE' and (old.view_count is distinct from new.view_count)) or tg_op = 'INSERT' then
    -- Update profile for the vibelog owner
    if new.user_id is not null then
      perform public.sync_profile_total_views(new.user_id);
    end if;
  end if;

  if tg_op = 'DELETE' and old.user_id is not null then
    -- If vibelog is deleted, sync the profile to recalculate total
    perform public.sync_profile_total_views(old.user_id);
  end if;

  return coalesce(new, old);
end;
$$;

-- Trigger to automatically update profile.total_views when vibelogs.view_count changes
drop trigger if exists update_profile_total_views_on_vibelog_change on public.vibelogs;
create trigger update_profile_total_views_on_vibelog_change
  after insert or update of view_count or delete on public.vibelogs
  for each row
  execute function public.update_profile_total_views_on_view_count_change();

-- Function to backfill profile.total_views for all users
-- Call this once to sync existing data: SELECT public.backfill_profile_total_views();
create or replace function public.backfill_profile_total_views()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  user_record record;
begin
  -- Loop through all profiles and sync their total_views
  for user_record in select id from public.profiles loop
    perform public.sync_profile_total_views(user_record.id);
  end loop;
end;
$$;

-- Function to increment view_count (bypasses RLS for view tracking)
-- This allows anyone (including anonymous users) to increment view_count
create or replace function public.increment_vibelog_view_count(p_vibelog_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.vibelogs
  set view_count = view_count + 1
  where id = p_vibelog_id;
end;
$$;

-- Grant execute permission to everyone (including anonymous users)
grant execute on function public.increment_vibelog_view_count(uuid) to anon, authenticated;

