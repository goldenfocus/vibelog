-- Add username_changed_at column to track when username was last changed
-- This is referenced in OnboardingModal but missing from schema

alter table public.profiles
add column if not exists username_changed_at timestamptz;

-- Add comment for documentation
comment on column public.profiles.username_changed_at is 'Timestamp when username was last changed. Null means username has never been changed.';
