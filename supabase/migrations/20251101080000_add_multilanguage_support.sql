-- ============================================================================
-- MIGRATION: Add Multi-Language Support to Vibelogs
-- ============================================================================
-- Purpose: Enable storing original language, translations, and language metadata
-- Phase: 1 of Multi-Language + AEO Implementation
-- ============================================================================

-- Add language detection and translation columns
ALTER TABLE public.vibelogs
ADD COLUMN IF NOT EXISTS original_language TEXT,
ADD COLUMN IF NOT EXISTS detected_confidence FLOAT,
ADD COLUMN IF NOT EXISTS available_languages TEXT[],
ADD COLUMN IF NOT EXISTS translations JSONB;

-- Add comments for documentation
COMMENT ON COLUMN public.vibelogs.original_language IS 'ISO 639-1 language code detected by Whisper (e.g., "fr", "en", "es")';
COMMENT ON COLUMN public.vibelogs.detected_confidence IS 'Whisper language detection confidence (0-1)';
COMMENT ON COLUMN public.vibelogs.available_languages IS 'Array of language codes available for this vibelog (e.g., {"en","fr","es"})';
COMMENT ON COLUMN public.vibelogs.translations IS 'JSONB object storing translations: { "es": { "title": "...", "content": "...", "seo_description": "..." }, "fr": { ... } }';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vibelogs_original_language ON public.vibelogs(original_language);
CREATE INDEX IF NOT EXISTS idx_vibelogs_available_languages ON public.vibelogs USING GIN(available_languages);
CREATE INDEX IF NOT EXISTS idx_vibelogs_translations ON public.vibelogs USING GIN(translations);

-- Add constraint to ensure original_language is valid ISO 639-1 code
ALTER TABLE public.vibelogs
ADD CONSTRAINT check_valid_language_code
CHECK (
  original_language IS NULL OR
  original_language ~ '^[a-z]{2}$'
);

-- Add constraint to ensure detected_confidence is between 0 and 1
ALTER TABLE public.vibelogs
ADD CONSTRAINT check_confidence_range
CHECK (
  detected_confidence IS NULL OR
  (detected_confidence >= 0 AND detected_confidence <= 1)
);

-- ============================================================================
-- JSONB Structure Documentation
-- ============================================================================
-- The translations JSONB column will follow this structure:
--
-- {
--   "es": {
--     "title": "Translated title in Spanish",
--     "content": "Translated content in Spanish",
--     "seo_title": "SEO title in Spanish",
--     "seo_description": "SEO description in Spanish",
--     "tags": ["tag1_es", "tag2_es"],
--     "translated_at": "2025-01-15T10:30:00Z",
--     "translation_model": "gpt-4o-mini"
--   },
--   "fr": {
--     "title": "Translated title in French",
--     "content": "Translated content in French",
--     ...
--   },
--   ...
-- }
--
-- Supported language codes (Vibelog official languages):
-- - en: English
-- - es: Spanish
-- - fr: French
-- - de: German
-- - vi: Vietnamese
-- - zh: Chinese (Simplified)
-- ============================================================================

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vibelogs'
  AND column_name IN (
    'original_language',
    'detected_confidence',
    'available_languages',
    'translations'
  )
ORDER BY ordinal_position;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Multi-Language Support Migration Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Added columns:';
  RAISE NOTICE '  - original_language (TEXT)';
  RAISE NOTICE '  - detected_confidence (FLOAT)';
  RAISE NOTICE '  - available_languages (TEXT[])';
  RAISE NOTICE '  - translations (JSONB)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created indexes:';
  RAISE NOTICE '  - idx_vibelogs_original_language';
  RAISE NOTICE '  - idx_vibelogs_available_languages (GIN)';
  RAISE NOTICE '  - idx_vibelogs_translations (GIN)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update TypeScript types in types/database.ts';
  RAISE NOTICE '  2. Modify transcribe API to preserve language detection';
  RAISE NOTICE '  3. Modify generate API to create content in original language';
  RAISE NOTICE '  4. Create translation API endpoint';
  RAISE NOTICE '========================================';
END $$;
