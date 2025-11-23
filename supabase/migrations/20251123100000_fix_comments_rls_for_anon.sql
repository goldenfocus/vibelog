-- ============================================================================
-- FIX COMMENTS RLS: Allow anonymous users to view public comments
-- ============================================================================
-- Issue: Comments on public vibelogs are not showing up on home page
-- Root cause: RLS policy doesn't explicitly grant access to 'anon' role
-- Solution: Drop and recreate policy with explicit role grants
-- ============================================================================

-- Drop the old policy if it exists
DROP POLICY IF EXISTS "comments select public or own" ON public.comments;

-- Create new policy that explicitly allows both authenticated and anonymous users
CREATE POLICY "comments_select_public_or_own" ON public.comments
  FOR SELECT
  TO authenticated, anon  -- Explicitly grant to both roles
  USING (
    -- Can view if vibelog is public and published, or if user owns the comment, or if user owns the vibelog
    EXISTS (
      SELECT 1 FROM public.vibelogs
      WHERE vibelogs.id = comments.vibelog_id
        AND (
          -- Public vibelogs: accessible to everyone (including anon)
          (vibelogs.is_published = true AND vibelogs.is_public = true)
          -- OR owner of the vibelog (authenticated only)
          OR vibelogs.user_id = auth.uid()
          -- OR owner of the comment (authenticated only)
          OR comments.user_id = auth.uid()
        )
    )
    -- Also allow if comment itself is marked as public
    OR comments.is_public = true
  );

-- ============================================================================
-- ADDITIONAL FIX: Ensure comments on public vibelogs are marked public
-- ============================================================================

-- Update existing comments to be public if they're on public vibelogs
UPDATE public.comments
SET is_public = true
WHERE is_public IS NULL
  AND EXISTS (
    SELECT 1 FROM public.vibelogs
    WHERE vibelogs.id = comments.vibelog_id
      AND vibelogs.is_published = true
      AND vibelogs.is_public = true
  );

-- Set default to true for new comments (already done in previous migration, but ensuring)
ALTER TABLE public.comments ALTER COLUMN is_public SET DEFAULT true;
