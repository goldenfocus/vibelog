-- Add missing columns to vibelogs table that were never applied to production
-- This migration is idempotent - safe to run multiple times

-- Add anonymous_session_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vibelogs'
        AND column_name = 'anonymous_session_id'
    ) THEN
        ALTER TABLE public.vibelogs ADD COLUMN anonymous_session_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_vibelogs_anonymous_session_id
            ON public.vibelogs(anonymous_session_id)
            WHERE anonymous_session_id IS NOT NULL;
    END IF;
END $$;

-- Add session_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vibelogs'
        AND column_name = 'session_id'
    ) THEN
        ALTER TABLE public.vibelogs ADD COLUMN session_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_vibelogs_session_id
            ON public.vibelogs(session_id)
            WHERE session_id IS NOT NULL;
    END IF;
END $$;

-- Add teaser if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vibelogs'
        AND column_name = 'teaser'
    ) THEN
        ALTER TABLE public.vibelogs ADD COLUMN teaser TEXT;
    END IF;
END $$;

-- Add cover_image_url if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vibelogs'
        AND column_name = 'cover_image_url'
    ) THEN
        ALTER TABLE public.vibelogs ADD COLUMN cover_image_url TEXT;
    END IF;
END $$;
