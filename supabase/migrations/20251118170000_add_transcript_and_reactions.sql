-- Migration: Add transcript field and comment reactions system
-- This enables showing original transcripts and emoji reactions on comments

-- 1. Add transcript column to vibelogs table
ALTER TABLE public.vibelogs
ADD COLUMN IF NOT EXISTS transcript TEXT;

COMMENT ON COLUMN public.vibelogs.transcript IS 'Original transcript from voice recording (before AI enhancement)';

-- 2. Create comment_reactions table for emoji reactions
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL, -- Emoji character (👍, ❤️, 😂, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one reaction type per user per comment
  UNIQUE(comment_id, user_id, emoji)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id
  ON public.comment_reactions(comment_id);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id
  ON public.comment_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_vibelogs_transcript
  ON public.vibelogs(id) WHERE transcript IS NOT NULL;

-- 4. Add reaction_count column to comments for quick access
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS reaction_count INTEGER NOT NULL DEFAULT 0;

-- 5. Create function to update reaction count
CREATE OR REPLACE FUNCTION update_comment_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.comments
    SET reaction_count = reaction_count + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.comments
    SET reaction_count = reaction_count - 1
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to auto-update reaction count
DROP TRIGGER IF EXISTS trigger_update_comment_reaction_count ON public.comment_reactions;
CREATE TRIGGER trigger_update_comment_reaction_count
  AFTER INSERT OR DELETE ON public.comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reaction_count();

-- 7. Grant permissions
GRANT SELECT, INSERT, DELETE ON public.comment_reactions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.comment_reactions TO anon;

-- 8. Enable Row Level Security
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for comment_reactions
-- Everyone can view reactions
CREATE POLICY "Anyone can view comment reactions"
  ON public.comment_reactions
  FOR SELECT
  USING (true);

-- Authenticated users can add reactions
CREATE POLICY "Authenticated users can add reactions"
  ON public.comment_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON public.comment_reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 10. Create view for comment reactions with counts
CREATE OR REPLACE VIEW public.comment_reactions_summary AS
SELECT
  comment_id,
  emoji,
  COUNT(*) as count,
  ARRAY_AGG(user_id) as user_ids
FROM public.comment_reactions
GROUP BY comment_id, emoji;

GRANT SELECT ON public.comment_reactions_summary TO authenticated;
GRANT SELECT ON public.comment_reactions_summary TO anon;
