-- ============================================================================
-- Universal Reactions System Migration
-- ============================================================================
-- Creates a polymorphic reaction system that works with ANY content type:
-- - Comments, Vibelogs, Chat Messages, Media, Profiles, Playlists, etc.
-- - Drop-in replacement for comment_reactions
-- - Future-proof and extensible
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: DROP OLD SYSTEM (if exists)
-- ============================================================================

DROP VIEW IF EXISTS public.comment_reactions_summary CASCADE;
DROP TRIGGER IF EXISTS trigger_update_comment_reaction_count ON public.comment_reactions CASCADE;
DROP FUNCTION IF EXISTS update_comment_reaction_count() CASCADE;
DROP TABLE IF EXISTS public.comment_reactions CASCADE;

-- ============================================================================
-- PART 2: CREATE UNIVERSAL REACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic foreign key (works with ANY content type)
  reactable_type TEXT NOT NULL,  -- 'comment', 'vibelog', 'chat_message', 'media', etc.
  reactable_id UUID NOT NULL,     -- ID of the content being reacted to

  -- Who reacted
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What reaction
  emoji TEXT NOT NULL,  -- Any emoji: 👍, ❤️, 🔥, 🎉, 😂, etc.

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one reaction per user per emoji per content
  CONSTRAINT unique_user_reaction UNIQUE(reactable_type, reactable_id, user_id, emoji)
);

-- ============================================================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite index for looking up reactions for specific content
CREATE INDEX IF NOT EXISTS idx_reactions_reactable
  ON public.reactions(reactable_type, reactable_id);

-- Index for user's reactions
CREATE INDEX IF NOT EXISTS idx_reactions_user
  ON public.reactions(user_id);

-- Index for emoji analytics
CREATE INDEX IF NOT EXISTS idx_reactions_emoji
  ON public.reactions(emoji);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_reactions_created
  ON public.reactions(created_at DESC);

-- ============================================================================
-- PART 4: CREATE AGGREGATED VIEW
-- ============================================================================

CREATE VIEW public.reactions_summary AS
SELECT
  reactable_type,
  reactable_id,
  emoji,
  COUNT(*)::INTEGER as count,
  ARRAY_AGG(user_id) as user_ids,
  MAX(created_at) as last_reacted_at
FROM public.reactions
GROUP BY reactable_type, reactable_id, emoji;

-- ============================================================================
-- PART 5: ADD REACTION_COUNT COLUMNS (Denormalized for Performance)
-- ============================================================================

-- Comments
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS reaction_count INTEGER DEFAULT 0;

-- Vibelogs
ALTER TABLE public.vibelogs
ADD COLUMN IF NOT EXISTS reaction_count INTEGER DEFAULT 0;

-- TODO: Add to other tables as needed (chat_messages, media, etc.)

-- ============================================================================
-- PART 6: CREATE TRIGGER FUNCTION TO UPDATE COUNTS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF (TG_OP = 'INSERT') THEN
    -- Dynamically update the reactable table
    IF NEW.reactable_type = 'comment' THEN
      UPDATE public.comments
      SET reaction_count = reaction_count + 1
      WHERE id = NEW.reactable_id;
    ELSIF NEW.reactable_type = 'vibelog' THEN
      UPDATE public.vibelogs
      SET reaction_count = reaction_count + 1
      WHERE id = NEW.reactable_id;
    -- Add more types here as needed
    END IF;
    RETURN NEW;

  -- Handle DELETE
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.reactable_type = 'comment' THEN
      UPDATE public.comments
      SET reaction_count = GREATEST(reaction_count - 1, 0)
      WHERE id = OLD.reactable_id;
    ELSIF OLD.reactable_type = 'vibelog' THEN
      UPDATE public.vibelogs
      SET reaction_count = GREATEST(reaction_count - 1, 0)
      WHERE id = OLD.reactable_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 7: CREATE TRIGGER
-- ============================================================================

CREATE TRIGGER trigger_update_reaction_count
  AFTER INSERT OR DELETE ON public.reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_reaction_count();

-- ============================================================================
-- PART 8: ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reactions
DROP POLICY IF EXISTS "Anyone can view reactions" ON public.reactions;
CREATE POLICY "Anyone can view reactions"
  ON public.reactions
  FOR SELECT
  USING (true);

-- Authenticated users can add reactions
DROP POLICY IF EXISTS "Authenticated users can add reactions" ON public.reactions;
CREATE POLICY "Authenticated users can add reactions"
  ON public.reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.reactions;
CREATE POLICY "Users can delete their own reactions"
  ON public.reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- PART 9: GRANT PERMISSIONS
-- ============================================================================

-- Grant table permissions
GRANT SELECT, INSERT, DELETE ON public.reactions TO authenticated;
GRANT SELECT ON public.reactions TO anon;

-- Grant view permissions
GRANT SELECT ON public.reactions_summary TO authenticated;
GRANT SELECT ON public.reactions_summary TO anon;

-- ============================================================================
-- PART 10: BACKFILL EXISTING DATA (Optional)
-- ============================================================================

-- If you have existing comment_reactions data, migrate it here
-- INSERT INTO public.reactions (reactable_type, reactable_id, user_id, emoji, created_at)
-- SELECT 'comment', comment_id, user_id, emoji, created_at
-- FROM public.comment_reactions;

-- Update reaction counts for existing data
UPDATE public.comments c
SET reaction_count = COALESCE(
  (SELECT COUNT(*) FROM public.reactions r WHERE r.reactable_type = 'comment' AND r.reactable_id = c.id),
  0
);

UPDATE public.vibelogs v
SET reaction_count = COALESCE(
  (SELECT COUNT(*) FROM public.reactions r WHERE r.reactable_type = 'vibelog' AND r.reactable_id = v.id),
  0
);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Test: Check table exists
-- SELECT COUNT(*) FROM public.reactions;

-- Test: Check view works
-- SELECT * FROM public.reactions_summary LIMIT 10;

-- Test: Add a test reaction
-- INSERT INTO public.reactions (reactable_type, reactable_id, user_id, emoji)
-- VALUES ('comment', 'some-uuid', auth.uid(), '👍');

-- Test: Check trigger updated count
-- SELECT id, reaction_count FROM public.comments WHERE id = 'some-uuid';

-- ============================================================================
-- SUCCESS! Universal Reactions System is now active
-- ============================================================================
