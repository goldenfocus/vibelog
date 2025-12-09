-- Migration: Add Vibe Communication Engine tables
-- Created: 2024-01-XX
-- Description: Adds tables for vibe detection, transmission, and OS layer state

-- Vibe analysis results (stored for history and analytics)
create table if not exists public.vibe_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  
  -- Analysis data (JSONB for flexibility)
  scores jsonb not null, -- VibeScores object
  primary_vibe text not null,
  confidence numeric(3, 2) not null default 0.5,
  micro_vibes jsonb default '{}',
  hidden_vibes jsonb default '{}',
  
  -- Metadata
  text_length integer,
  language text,
  model_version text not null default '1.0.0',
  processing_time_ms integer,
  
  -- Context
  source text, -- 'message' | 'vibelog' | 'interaction' | 'manual'
  source_id uuid, -- Reference to vibelog, message, etc.
  
  -- Timestamps
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists vibe_analyses_user_id_idx on public.vibe_analyses (user_id);
create index if not exists vibe_analyses_detected_at_idx on public.vibe_analyses (detected_at desc);
create index if not exists vibe_analyses_primary_vibe_idx on public.vibe_analyses (primary_vibe);
create index if not exists vibe_analyses_source_idx on public.vibe_analyses (source, source_id);

-- Vibe packets (VTP protocol)
create table if not exists public.vibe_packets (
  id uuid primary key default gen_random_uuid(),
  packet_id text unique not null, -- VTP packet ID
  
  -- Packet data
  text text not null,
  sender_id uuid references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete set null,
  
  -- Vibe analysis (reference to vibe_analyses or inline)
  vibe_analysis_id uuid references public.vibe_analyses(id) on delete set null,
  vibe_data jsonb, -- Inline vibe data if not referenced
  
  -- Sender mood signature
  sender_mood_signature jsonb,
  
  -- VTP metadata
  vtp_version text not null default '1.0.0',
  expires_at timestamptz,
  
  -- Status
  delivered boolean not null default false,
  read boolean not null default false,
  
  -- Timestamps
  timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists vibe_packets_sender_id_idx on public.vibe_packets (sender_id);
create index if not exists vibe_packets_recipient_id_idx on public.vibe_packets (recipient_id);
create index if not exists vibe_packets_packet_id_idx on public.vibe_packets (packet_id);
create index if not exists vibe_packets_timestamp_idx on public.vibe_packets (timestamp desc);

-- User vibe state (OS layer)
create table if not exists public.user_vibe_states (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  
  -- Current state
  current_vibe jsonb not null, -- VibeScores object
  primary_vibe text not null default 'neutral',
  
  -- Thresholds
  doomscroll_block_threshold integer not null default 75,
  vibe_rave_trigger_threshold integer not null default 80,
  clarity_mode_trigger_threshold integer not null default 70,
  
  -- OS settings
  vibe_monitoring_enabled boolean not null default true,
  blocking_enabled boolean not null default true,
  ui_enhancements_enabled boolean not null default true,
  privacy_mode text not null default 'partial', -- 'full' | 'partial' | 'off'
  
  -- Session tracking
  session_start timestamptz not null default now(),
  last_updated timestamptz not null default now()
);

create index if not exists user_vibe_states_primary_vibe_idx on public.user_vibe_states (primary_vibe);
create index if not exists user_vibe_states_last_updated_idx on public.user_vibe_states (last_updated desc);

-- Vibe history (for timeline view)
create table if not exists public.vibe_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  
  -- Reference to analysis
  vibe_analysis_id uuid references public.vibe_analyses(id) on delete cascade,
  
  -- Context
  context_source text, -- 'message' | 'vibelog' | 'interaction' | 'manual'
  context_source_id uuid,
  
  -- Timestamp
  timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists vibe_history_user_id_idx on public.vibe_history (user_id);
create index if not exists vibe_history_timestamp_idx on public.vibe_history (timestamp desc);
create index if not exists vibe_history_vibe_analysis_id_idx on public.vibe_history (vibe_analysis_id);

-- Custom vibe profiles
create table if not exists public.custom_vibe_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  
  profile_name text not null,
  
  -- Custom vibe definitions
  custom_vibes jsonb default '[]',
  
  -- Detection preferences (sensitivity multipliers)
  sensitivity jsonb default '{}',
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_vibe_profiles_user_id_idx on public.custom_vibe_profiles (user_id);

-- RLS Policies

-- Vibe analyses: users can see their own and public ones (if privacy allows)
alter table public.vibe_analyses enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vibe_analyses' and policyname = 'users can view own analyses'
  ) then
    create policy "users can view own analyses" on public.vibe_analyses
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vibe_analyses' and policyname = 'users can insert own analyses'
  ) then
    create policy "users can insert own analyses" on public.vibe_analyses
      for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Vibe packets: users can see their own sent/received packets
alter table public.vibe_packets enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vibe_packets' and policyname = 'users can view own packets'
  ) then
    create policy "users can view own packets" on public.vibe_packets
      for select
      using (auth.uid() = sender_id or auth.uid() = recipient_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vibe_packets' and policyname = 'users can send packets'
  ) then
    create policy "users can send packets" on public.vibe_packets
      for insert
      with check (auth.uid() = sender_id);
  end if;
end $$;

-- User vibe states: users can only see/modify their own
alter table public.user_vibe_states enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_vibe_states' and policyname = 'users can manage own state'
  ) then
    create policy "users can manage own state" on public.user_vibe_states
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Vibe history: users can see their own
alter table public.vibe_history enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vibe_history' and policyname = 'users can view own history'
  ) then
    create policy "users can view own history" on public.vibe_history
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vibe_history' and policyname = 'users can insert own history'
  ) then
    create policy "users can insert own history" on public.vibe_history
      for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Custom vibe profiles: users can manage their own
alter table public.custom_vibe_profiles enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'custom_vibe_profiles' and policyname = 'users can manage own profiles'
  ) then
    create policy "users can manage own profiles" on public.custom_vibe_profiles
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

