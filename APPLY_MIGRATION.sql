-- =====================================================================
-- COPY AND PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR
-- =====================================================================
-- This adds:
-- 1. transcript column to vibelogs
-- 2. comment_reactions table with emoji support
-- 3. Auto-updating reaction counts
-- 4. Proper permissions and RLS policies
-- =====================================================================

BEGIN;

-- 1. Add transcript column
ALTER TABLE public.vibelogs
ADD COLUMN IF NOT EXISTS transcript TEXT;

COMMENT ON COLUMN public.vibelogs.transcript IS 'Original transcript from voice recording (before AI enhancement)';

CREATE INDEX IF NOT EXISTS idx_vibelogs_transcript ON public.vibelogs(id) WHERE transcript IS NOT NULL;

-- 2. Drop existing objects (for clean re-run)
DROP VIEW IF EXISTS public.comment_reactions_summary CASCADE;
DROP TRIGGER IF EXISTS trigger_update_comment_reaction_count ON public.comment_reactions CASCADE;
DROP FUNCTION IF EXISTS update_comment_reaction_count() CASCADE;

-- 3. Create or replace comment_reactions table
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_comment_emoji UNIQUE(comment_id, user_id, emoji)
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON public.comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON public.comment_reactions(user_id);

-- 5. Add reaction_count column to comments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'reaction_count'
  ) THEN
    ALTER TABLE public.comments ADD COLUMN reaction_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 6. Create trigger function
CREATE OR REPLACE FUNCTION update_comment_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.comments SET reaction_count = reaction_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.comments SET reaction_count = GREATEST(reaction_count - 1, 0) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger
CREATE TRIGGER trigger_update_comment_reaction_count
  AFTER INSERT OR DELETE ON public.comment_reactions
  FOR EACH ROW EXECUTE FUNCTION update_comment_reaction_count();

-- 8. Create view
CREATE VIEW public.comment_reactions_summary AS
SELECT comment_id, emoji, COUNT(*)::INTEGER as count, ARRAY_AGG(user_id) as user_ids
FROM public.comment_reactions GROUP BY comment_id, emoji;

-- 9. Grant permissions
GRANT SELECT, INSERT, DELETE ON public.comment_reactions TO authenticated;
GRANT SELECT ON public.comment_reactions TO anon;
GRANT SELECT ON public.comment_reactions_summary TO authenticated;
GRANT SELECT ON public.comment_reactions_summary TO anon;

-- 10. Enable RLS
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies
DROP POLICY IF EXISTS "Anyone can view comment reactions" ON public.comment_reactions;
CREATE POLICY "Anyone can view comment reactions" ON public.comment_reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can add reactions" ON public.comment_reactions;
CREATE POLICY "Authenticated users can add reactions" ON public.comment_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.comment_reactions;
CREATE POLICY "Users can delete their own reactions" ON public.comment_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

COMMIT;

-- Done! Verify with:
-- SELECT COUNT(*) FROM public.comment_reactions;
-- SELECT * FROM public.comment_reactions_summary LIMIT 1;
