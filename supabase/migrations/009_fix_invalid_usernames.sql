-- Fix usernames that contain dots or look like domains
-- Convert "www.yanik.com" → "yanik" or similar

UPDATE profiles
SET
  username = CASE
    -- If username contains dots (like domain), extract the meaningful part
    WHEN username LIKE '%.%' THEN
      regexp_replace(
        -- Remove www., .com, .io, etc
        regexp_replace(username, '\.(com|io|net|org|co|dev)$', '', 'i'),
        '^(www\.)', '', 'i'
      )
    -- If username has special chars, clean it
    WHEN username ~ '[^a-z0-9_]' THEN
      lower(regexp_replace(username, '[^a-z0-9]', '', 'g'))
    ELSE username
  END,
  updated_at = NOW()
WHERE
  -- Only update usernames with dots or special characters
  username LIKE '%.%' OR username ~ '[^a-z0-9_]';

-- Ensure no duplicates after cleanup by appending numbers
DO $$
DECLARE
  dup RECORD;
  new_username text;
  counter int;
BEGIN
  FOR dup IN
    SELECT username, array_agg(id) as ids
    FROM profiles
    GROUP BY username
    HAVING count(*) > 1
  LOOP
    counter := 1;
    -- Keep first occurrence, rename others
    FOREACH dup.id IN ARRAY dup.ids[2:array_length(dup.ids, 1)]
    LOOP
      new_username := dup.username || counter::text;
      -- Find next available number
      WHILE EXISTS (SELECT 1 FROM profiles WHERE username = new_username) LOOP
        counter := counter + 1;
        new_username := dup.username || counter::text;
      END LOOP;

      UPDATE profiles SET username = new_username, updated_at = NOW()
      WHERE id = dup.id;

      counter := counter + 1;
    END LOOP;
  END LOOP;
END;
$$;

-- Show affected rows
SELECT
  id,
  username,
  display_name,
  email,
  updated_at
FROM profiles
ORDER BY updated_at DESC
LIMIT 20;
