-- Debug script: Check vibelogs and their status
-- This will help us understand why views aren't being counted

-- 1. Check total vibelogs and their publication status
SELECT 
  COUNT(*) as total_vibelogs,
  COUNT(*) FILTER (WHERE is_published = true) as published_count,
  COUNT(*) FILTER (WHERE is_public = true) as public_count,
  COUNT(*) FILTER (WHERE is_published = true AND is_public = true) as published_and_public,
  SUM(view_count) FILTER (WHERE is_published = true AND is_public = true) as total_views_on_published_public
FROM public.vibelogs;

-- 2. Check vibelogs per user with their status
SELECT 
  v.user_id,
  p.username,
  p.display_name,
  COUNT(*) as total_vibelogs,
  COUNT(*) FILTER (WHERE v.is_published = true) as published_count,
  COUNT(*) FILTER (WHERE v.is_public = true) as public_count,
  COUNT(*) FILTER (WHERE v.is_published = true AND v.is_public = true) as published_and_public_count,
  SUM(v.view_count) FILTER (WHERE v.is_published = true AND v.is_public = true) as total_views
FROM public.vibelogs v
LEFT JOIN public.profiles p ON p.id = v.user_id
GROUP BY v.user_id, p.username, p.display_name
ORDER BY total_vibelogs DESC;

-- 3. Show sample vibelogs with their full status
SELECT 
  v.id,
  v.title,
  v.user_id,
  p.username,
  v.is_published,
  v.is_public,
  v.view_count,
  v.created_at,
  v.published_at
FROM public.vibelogs v
LEFT JOIN public.profiles p ON p.id = v.user_id
ORDER BY v.created_at DESC
LIMIT 20;

