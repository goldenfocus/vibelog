-- Debug script to check profile created_at dates
-- This will help identify if created_at was incorrectly updated

SELECT 
  id,
  username,
  display_name,
  created_at,
  updated_at,
  DATE_PART('day', NOW() - created_at) as days_since_created,
  DATE_PART('day', NOW() - updated_at) as days_since_updated
FROM public.profiles
WHERE username = 'vibeyang'
ORDER BY created_at;

-- Also check if there are multiple profiles with similar usernames
SELECT 
  id,
  username,
  display_name,
  created_at,
  updated_at,
  DATE_PART('day', NOW() - created_at) as days_since_created
FROM public.profiles
WHERE username LIKE '%vibe%'
ORDER BY created_at;
