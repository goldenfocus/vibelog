-- Migration: Update Comments RLS Policy for Visibility Filters
--
-- This migration updates the comments RLS policy to respect the is_public
-- and moderation_status fields that were added in migration 20251118073934
--
-- Context: Comments weren't showing on home page because RLS policy only
-- checked vibelog visibility, not comment-specific visibility flags

-- Drop the old policy
DROP POLICY IF EXISTS "comments select public or own" ON public.comments;

-- Create updated policy that checks both comment AND vibelog visibility
CREATE POLICY "comments select public or own" ON public.comments
  FOR SELECT
  USING (
    (
      -- Public comments: must be public AND approved moderation
      is_public = true
      AND moderation_status = 'approved'
      -- AND parent vibelog must be public and published
      AND EXISTS (
        SELECT 1 FROM public.vibelogs
        WHERE vibelogs.id = comments.vibelog_id
          AND vibelogs.is_published = true
          AND vibelogs.is_public = true
      )
    )
    OR
    -- Users can always see their own comments (regardless of status)
    auth.uid() = user_id
    OR
    -- Vibelog owners can see all comments on their vibelogs
    EXISTS (
      SELECT 1 FROM public.vibelogs
      WHERE vibelogs.id = comments.vibelog_id
        AND vibelogs.user_id = auth.uid()
    )
  );

-- Add helpful comment for future reference
COMMENT ON POLICY "comments select public or own" ON public.comments IS
  'Users can view: (1) public approved comments on public vibelogs, (2) their own comments, or (3) all comments on vibelogs they own';
