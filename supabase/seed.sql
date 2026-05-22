-- ============================================================
-- seed.sql  –  local development data only
-- Run AFTER all migrations. NOT applied in production.
-- ============================================================

-- Profiles are auto-created by the trigger in 001_create_profiles.sql
-- when a user signs up via Supabase Auth, so nothing to seed here.

-- Uncomment below to add a test platform connection for local dev:
--
-- insert into public.platform_connections (user_id, platform, account_identifier)
-- values ('<paste-a-real-auth-user-id>', 'github', 'test-username')
-- on conflict do nothing;
