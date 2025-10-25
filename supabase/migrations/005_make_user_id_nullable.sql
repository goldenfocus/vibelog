-- Migration: Make user_id nullable for anonymous vibelog support
-- Date: 2025-01-25
-- Purpose: Fix production database to allow anonymous vibelog creation
-- This is idempotent and safe to run multiple times

-- Make user_id nullable (allows anonymous vibelogs)
ALTER TABLE public.vibelogs ALTER COLUMN user_id DROP NOT NULL;

-- Ensure RLS policies allow anonymous inserts
-- Drop old restrictive policies if they exist
DROP POLICY IF EXISTS "vibelogs insert own" ON public.vibelogs;
DROP POLICY IF EXISTS "vibelogs insert anonymous" ON public.vibelogs;
DROP POLICY IF EXISTS "vibelogs insert authenticated" ON public.vibelogs;

-- Anonymous users can INSERT with anonymous_session_id (no auth required)
CREATE POLICY "vibelogs insert anonymous"
  ON public.vibelogs
  FOR INSERT
  WITH CHECK (
    user_id IS NULL
    AND (anonymous_session_id IS NOT NULL OR session_id IS NOT NULL)
  );

-- Authenticated users can INSERT their own vibelogs
CREATE POLICY "vibelogs insert authenticated"
  ON public.vibelogs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure public vibelogs are visible
DROP POLICY IF EXISTS "vibelogs select public" ON public.vibelogs;
DROP POLICY IF EXISTS "vibelogs select own" ON public.vibelogs;
DROP POLICY IF EXISTS "vibelogs select public or own" ON public.vibelogs;

-- Anyone can SELECT published public vibelogs (including anonymous ones)
CREATE POLICY "vibelogs select public"
  ON public.vibelogs
  FOR SELECT
  USING (is_published AND is_public);

-- Authenticated users can SELECT their own vibelogs (even unpublished)
CREATE POLICY "vibelogs select own"
  ON public.vibelogs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
