-- Fix enhanced_comments view conflict
-- Drop the old view and recreate with correct structure

-- Drop the existing view
DROP VIEW IF EXISTS public.enhanced_comments CASCADE;

-- Recreate the view with the correct structure
CREATE OR REPLACE VIEW public.enhanced_comments AS
SELECT
  c.*,
  p.username,
  p.display_name,
  p.avatar_url,
  CASE
    WHEN c.is_mini_vibelog = true THEN
      jsonb_build_object(
        'title', c.enhanced_title,
        'content', c.enhanced_content,
        'audio_url', c.enhanced_audio_url,
        'cover_url', c.enhanced_cover_url,
        'vibe_scores', c.enhanced_vibe_scores,
        'primary_vibe', c.enhanced_primary_vibe
      )
    ELSE NULL
  END as mini_vibelog_data
FROM public.comments c
LEFT JOIN public.profiles p ON c.user_id = p.id;
