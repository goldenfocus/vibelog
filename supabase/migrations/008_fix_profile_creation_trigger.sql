-- Migration: Fix profile creation trigger to handle username conflicts
-- Date: 2025-11-02
-- Description: Updates handle_new_user() trigger to automatically append numeric
-- suffixes when username conflicts occur, preventing signup failures

-- Drop and recreate the trigger function with conflict handling
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  username_suffix int := 0;
begin
  -- Generate base username from email or name
  base_username := coalesce(
    lower(regexp_replace(new.raw_user_meta_data->>'name', '[^a-zA-Z0-9]', '', 'g')),
    split_part(new.email, '@', 1)
  );

  -- Handle username conflicts by adding a numeric suffix
  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    username_suffix := username_suffix + 1;
    final_username := base_username || username_suffix;
  end loop;

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
    final_username,  -- Use conflict-free username
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    now()
  );
  return new;
exception
  when others then
    -- Log error but don't fail user creation
    raise warning 'Failed to create profile for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- Backfill missing profiles for existing users
do $$
declare
  user_record record;
  base_username text;
  final_username text;
  username_suffix int;
begin
  for user_record in (
    select u.id, u.email, u.raw_user_meta_data, u.created_at
    from auth.users u
    left join public.profiles p on u.id = p.id
    where p.id is null
  ) loop
    -- Generate base username
    base_username := coalesce(
      lower(regexp_replace(user_record.raw_user_meta_data->>'name', '[^a-zA-Z0-9]', '', 'g')),
      split_part(user_record.email, '@', 1)
    );

    -- Handle username conflicts
    final_username := base_username;
    username_suffix := 0;
    while exists (select 1 from public.profiles where username = final_username) loop
      username_suffix := username_suffix + 1;
      final_username := base_username || username_suffix;
    end loop;

    -- Create missing profile
    insert into public.profiles (
      id,
      email,
      full_name,
      avatar_url,
      username,
      display_name,
      created_at,
      updated_at,
      last_sign_in_at
    )
    values (
      user_record.id,
      user_record.email,
      coalesce(user_record.raw_user_meta_data->>'full_name', user_record.raw_user_meta_data->>'name'),
      user_record.raw_user_meta_data->>'avatar_url',
      final_username,
      coalesce(user_record.raw_user_meta_data->>'name', split_part(user_record.email, '@', 1)),
      user_record.created_at,
      now(),
      now()
    );

    raise notice 'Created profile for user % with username %', user_record.email, final_username;
  end loop;
end $$;
