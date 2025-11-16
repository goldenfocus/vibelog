-- Migration: Enhanced Comments with Mini Vibelog Support
-- Adds AI-generated content for audio comments and enhanced display features

-- Add columns to existing comments table for enhanced functionality
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS enhanced_content text,
ADD COLUMN IF NOT EXISTS enhanced_title text,
ADD COLUMN IF NOT EXISTS enhanced_audio_url text,
ADD COLUMN IF NOT EXISTS enhanced_cover_url text,
ADD COLUMN IF NOT EXISTS enhanced_vibe_scores jsonb,
ADD COLUMN IF NOT EXISTS enhanced_primary_vibe text,
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'idle' CHECK (processing_status IN ('idle', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS processing_error text,
ADD COLUMN IF NOT EXISTS is_mini_vibelog boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS thread_position integer DEFAULT 0;

-- Create index for mini vibelog queries
CREATE INDEX IF NOT EXISTS comments_mini_vibelog_idx ON public.comments (vibelog_id, is_mini_vibelog) WHERE is_mini_vibelog = true;

-- Create index for threaded comments
CREATE INDEX IF NOT EXISTS comments_parent_idx ON public.comments (parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- Create index for processing status
CREATE INDEX IF NOT EXISTS comments_processing_idx ON public.comments (processing_status);

-- Update RLS policies to handle enhanced features
-- (Existing policies remain, no changes needed for enhanced columns)

-- Create function to automatically set is_mini_vibelog flag
CREATE OR REPLACE FUNCTION set_mini_vibelog_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark as mini vibelog if it has audio content and enhanced processing
  IF NEW.audio_url IS NOT NULL AND NEW.enhanced_content IS NULL THEN
    NEW.is_mini_vibelog := true;
    NEW.processing_status := 'processing';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for mini vibelog flag
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_mini_vibelog_trigger'
  ) THEN
    CREATE TRIGGER set_mini_vibelog_trigger
      BEFORE INSERT OR UPDATE ON public.comments
      FOR EACH ROW
      EXECUTE FUNCTION set_mini_vibelog_flag();
  END IF;
END $$;

-- Create view for enhanced comments with mini vibelog data
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
