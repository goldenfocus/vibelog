-- Migration: Add video generation queue
-- Safe/idempotent creation of a simple queue for async video processing

create table if not exists public.video_queue (
  id uuid primary key default gen_random_uuid(),
  vibelog_id uuid not null references public.vibelogs(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  video_request_id text,
  target_duration_seconds integer,
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists video_queue_status_created_idx on public.video_queue (status, created_at);

comment on table public.video_queue is 'Queue of vibelogs awaiting AI video generation';
comment on column public.video_queue.video_request_id is 'fal.ai request id for this job';
comment on column public.video_queue.target_duration_seconds is 'Desired video length based on tier';
