-- Backfill public_slug for anonymous vibelogs that don't have one
-- This fixes vibelogs created before public_slug was properly implemented

-- Function to generate a slug from title
create or replace function generate_slug_from_title(title_text text, vibelog_id uuid)
returns text
language plpgsql
as $$
declare
  slug_text text;
  slug_base text;
  short_id text;
begin
  -- Convert title to lowercase and replace spaces/special chars with hyphens
  slug_base := lower(regexp_replace(title_text, '[^a-zA-Z0-9]+', '-', 'g'));

  -- Remove leading/trailing hyphens
  slug_base := trim(both '-' from slug_base);

  -- Limit to 50 characters
  slug_base := substring(slug_base from 1 for 50);

  -- Get first 8 characters of UUID as short ID
  short_id := substring(vibelog_id::text from 1 for 8);

  -- Combine base slug with short ID
  slug_text := slug_base || '-' || short_id;

  return slug_text;
end;
$$;

-- Update anonymous vibelogs that are missing public_slug
update vibelogs
set public_slug = generate_slug_from_title(title, id)
where user_id is null
  and public_slug is null
  and title is not null;

-- Log how many rows were updated
do $$
declare
  updated_count integer;
begin
  select count(*) into updated_count
  from vibelogs
  where user_id is null
    and public_slug is not null;

  raise notice 'Updated % anonymous vibelogs with public_slug', updated_count;
end;
$$;

-- Drop the temporary function
drop function if exists generate_slug_from_title(text, uuid);
