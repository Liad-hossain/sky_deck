-- ============================================================
-- Migration: 004_create_audit_logs.sql
-- Security audit trail for auth and connection events.
-- ============================================================

create table if not exists public.audit_logs (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references public.profiles (id) on delete set null,
  action       text        not null,   -- 'signup' | 'signin' | 'signout' | 'connect_platform' …
  entity_type  text,
  entity_id    text,
  ip_address   text,
  user_agent   text,
  metadata     jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

comment on table public.audit_logs is
  'Immutable audit trail. Rows are never updated or deleted.';

create index if not exists idx_audit_logs_user_id
  on public.audit_logs (user_id, created_at desc);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs (created_at desc);

-- RLS: users can only read their own audit rows; no self-insert/update/delete
alter table public.audit_logs enable row level security;

create policy "audit_logs: select own"
  on public.audit_logs for select
  using (auth.uid() = user_id);

-- Only service role may insert (triggered server-side, not from the browser)
-- INSERT policies must use WITH CHECK, not USING (USING is for row visibility only)
create policy "audit_logs: service role insert"
  on public.audit_logs for insert
  with check (auth.role() = 'service_role');
