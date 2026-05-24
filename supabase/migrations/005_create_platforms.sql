-- ============================================================
-- Migration: 005_create_platforms.sql
-- Stores per-user platform integration records.
-- ============================================================

create table if not exists public.platforms (
  id                uuid        primary key default gen_random_uuid(),
  primary_id        text,                        -- platform-assigned user/account ID (e.g. GitHub user id, Jira account id)
  user_id           uuid        not null references public.profiles (id) on delete cascade,
  platform_type     text        not null,        -- 'github' | 'jira' | 'slack' | 'notion' …
  title             text        not null,
  access_token      text,                        -- encrypted at rest via Supabase Vault in prod
  refresh_token     text,
  user_metadata     jsonb       not null default '{}'::jsonb,   -- platform-specific user info
  platform_metadata jsonb       not null default '{}'::jsonb,   -- workspace / org info
  is_connected      boolean     not null default false,
  is_archived       boolean     not null default false,
  connected_at      timestamptz,
  disconnected_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  UNIQUE (user_id, primary_id, platform_type)
);

comment on table public.platforms is
  'One row per (user, platform) pair. Tracks OAuth tokens and connection state.';

-- ── updated_at auto-stamp ────────────────────────────────────
drop trigger if exists trg_platforms_updated_at on public.platforms;
create trigger trg_platforms_updated_at
  before update on public.platforms
  for each row execute function public.set_updated_at();


-- ── Row Level Security ───────────────────────────────────────
alter table public.platforms enable row level security;

create policy "platforms: select own"
  on public.platforms for select
  using (auth.uid() = user_id);

create policy "platforms: insert own"
  on public.platforms for insert
  with check (auth.uid() = user_id);

create policy "platforms: update own"
  on public.platforms for update
  using (auth.uid() = user_id);

create policy "platforms: delete own"
  on public.platforms for delete
  using (auth.uid() = user_id);
