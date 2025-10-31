-- Backfill script: Sync existing profile.total_views from vibelogs
-- Run this after applying the migration to sync existing data
-- Usage: Run this in your Supabase SQL editor or via CLI
--
-- IMPORTANT: Run the migration file first: supabase/migrations/001_sync_profile_total_views.sql
-- This script assumes those functions already exist.

-- Ensure the sync function exists (in case migration wasn't fully applied)
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

-- Ensure the backfill function exists
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

-- Now run the backfill to update all existing profiles
SELECT public.backfill_profile_total_views();

-- Verify the results
SELECT 
  p.id,
  p.username,
  p.display_name,
  p.total_views as profile_total_views,
  COALESCE(SUM(v.view_count), 0) as calculated_total_views
FROM public.profiles p
LEFT JOIN public.vibelogs v 
  ON v.user_id = p.id 
  AND v.is_published = true 
  AND v.is_public = true
GROUP BY p.id, p.username, p.display_name, p.total_views
ORDER BY calculated_total_views DESC;

