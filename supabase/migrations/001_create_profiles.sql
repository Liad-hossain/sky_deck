-- ============================================================
-- Migration: 001_create_profiles.sql
-- Creates the public.profiles table that mirrors auth.users
-- and adds a trigger to auto-populate it on every new signup.
-- ============================================================

-- ── 1. profiles table ────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid        primary key references auth.users (id) on delete cascade,
  email         text        not null,
  full_name     text,
  avatar_url    text,
  status        text        not null default 'active'
                            check (status in ('active', 'suspended')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'One row per user; created automatically when a user signs up via Supabase Auth.';

-- ── 2. updated_at auto-stamp ─────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── 3. Auto-create profile on auth.users insert ──────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;   -- idempotent – safe to re-run
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 4. Row Level Security ─────────────────────────────────────
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role can do everything (needed for the trigger above)
create policy "profiles: service role full access"
  on public.profiles for all
  using (auth.role() = 'service_role');
