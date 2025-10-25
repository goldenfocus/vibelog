-- Migration: Add ALL missing columns for anonymous vibelog support
-- Date: 2025-01-25
-- Purpose: Comprehensive fix - adds all columns that were never applied to production
-- This is idempotent and safe to run multiple times

-- 1. Add public_slug for anonymous posts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vibelogs'
        AND column_name = 'public_slug'
    ) THEN
        ALTER TABLE public.vibelogs ADD COLUMN public_slug TEXT UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_vibelogs_public_slug
            ON public.vibelogs(public_slug)
            WHERE public_slug IS NOT NULL;
    END IF;
END $$;

-- 2. Add anonymous_session_id (if not exists from migration 004)
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

-- 3. Add session_id (if not exists from migration 004)
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

-- 4. Add teaser (if not exists from migration 004)
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

-- 5. Add cover_image_url (if not exists from migration 004)
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

-- 6. Add cover_image_alt
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vibelogs'
        AND column_name = 'cover_image_alt'
    ) THEN
        ALTER TABLE public.vibelogs ADD COLUMN cover_image_alt TEXT;
    END IF;
END $$;

-- 7. Add cover_image_width
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vibelogs'
        AND column_name = 'cover_image_width'
    ) THEN
        ALTER TABLE public.vibelogs ADD COLUMN cover_image_width INTEGER;
    END IF;
END $$;

-- 8. Add cover_image_height
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vibelogs'
        AND column_name = 'cover_image_height'
    ) THEN
        ALTER TABLE public.vibelogs ADD COLUMN cover_image_height INTEGER;
    END IF;
END $$;

-- 9. Add seo_title
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vibelogs'
        AND column_name = 'seo_title'
    ) THEN
        ALTER TABLE public.vibelogs ADD COLUMN seo_title TEXT;
    END IF;
END $$;

-- 10. Add seo_description
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vibelogs'
        AND column_name = 'seo_description'
    ) THEN
        ALTER TABLE public.vibelogs ADD COLUMN seo_description TEXT;
    END IF;
END $$;

-- Verify user_id is nullable (from migration 005)
ALTER TABLE public.vibelogs ALTER COLUMN user_id DROP NOT NULL;
