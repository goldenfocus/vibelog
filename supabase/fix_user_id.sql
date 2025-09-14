-- Fix user_id constraint to support anonymous users
-- Run this in your Supabase SQL editor

-- First, drop the foreign key constraint
ALTER TABLE public.vibelogs DROP CONSTRAINT IF EXISTS vibelogs_user_id_fkey;

-- Make user_id nullable
ALTER TABLE public.vibelogs ALTER COLUMN user_id DROP NOT NULL;