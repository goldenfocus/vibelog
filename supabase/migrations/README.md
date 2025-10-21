# Database Migrations

This directory contains SQL migrations for the VibeLog database schema.

## How to Apply Migrations

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard/project/ogqcycqctxulcvhjeiii
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `001_anonymous_vibelogs.sql`
5. Paste into the editor
6. Click **Run** to execute

### Option 2: Via Supabase CLI

```bash
# Make sure you have Supabase CLI installed
npm install -g supabase

# Link to your project (if not already linked)
supabase link --project-ref ogqcycqctxulcvhjeiii

# Apply the migration
supabase db push
```

## Migration: 001_anonymous_vibelogs.sql

**Purpose**: Enable anonymous VibeLog creation with ownership transfer

**What it does**:
- Makes `user_id` nullable (allows anonymous posts)
- Adds `anonymous_session_id` for tracking
- Adds `public_slug` for `/v/[slug]` URLs
- Adds `redirect_to` for 301 redirects
- Adds SEO columns (`seo_title`, `seo_description`)
- Adds progressive image columns (`cover_preview_url`, `cover_placeholder`)
- Updates RLS policies to allow anonymous inserts
- Creates helper function `generate_public_slug()` for unique slug generation

**Status**: ✅ Ready to apply

## Verification

After applying the migration, verify with:

```sql
-- Check that new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vibelogs'
AND column_name IN (
  'anonymous_session_id',
  'public_slug',
  'redirect_to',
  'cover_preview_url',
  'cover_placeholder'
);

-- Check that RLS policies were updated
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'vibelogs';

-- Test the slug generator function
SELECT public.generate_public_slug('My First VibeLog Post');
```

## Rollback (if needed)

```sql
-- To rollback, run:
ALTER TABLE public.vibelogs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.vibelogs DROP COLUMN IF EXISTS anonymous_session_id;
ALTER TABLE public.vibelogs DROP COLUMN IF EXISTS public_slug;
ALTER TABLE public.vibelogs DROP COLUMN IF EXISTS redirect_to;
ALTER TABLE public.vibelogs DROP COLUMN IF EXISTS cover_preview_url;
ALTER TABLE public.vibelogs DROP COLUMN IF EXISTS cover_placeholder;
ALTER TABLE public.vibelogs DROP COLUMN IF EXISTS seo_title;
ALTER TABLE public.vibelogs DROP COLUMN IF EXISTS seo_description;
ALTER TABLE public.vibelogs DROP COLUMN IF EXISTS claimed_at;
DROP FUNCTION IF EXISTS public.generate_public_slug(TEXT);
```

## Next Steps

After migration is applied:
1. Update `app/api/save-vibelog/route.ts` to support anonymous saves
2. Create `/v/[slug]` public viewer page
3. Implement ownership claim flow
