-- Migration: add requested timestamp for video generation
alter table public.vibelogs
  add column if not exists video_requested_at timestamptz;

comment on column public.vibelogs.video_requested_at is 'Timestamp when video generation was last requested';
