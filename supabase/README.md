# Sky Deck — Supabase Migrations

## Migration files

| File | What it creates |
| ---- | --------------- |
| `001_create_profiles.sql` | `profiles` table + auto-create trigger on signup + RLS |
| `002_create_platform_connections.sql` | `platform_connections` table + RLS |
| `003_create_activities.sql` | `activities` table + indexes + RLS |
| `004_create_audit_logs.sql` | `audit_logs` table + RLS |
| `seed.sql` | Local dev seed data (safe no-op) |

---

## Apply via npm scripts (recommended)

The Supabase CLI is installed as a local dev dependency (`npm install --save-dev supabase`).
Use the scripts in `package.json`:

```bash
# 1. Log in to Supabase
npm run db:login

# 2. Link to your project (replace <ref> with your project ref from the Supabase URL)
#    e.g. if URL is https://dhghfwkbzwcodthezwbm.supabase.co, ref = dhghfwkbzwcodthezwbm
npx supabase link --project-ref <ref>

# 3. Push all migrations to your remote Supabase project
npm run db:push
```

---

## Apply via Supabase SQL Editor (no CLI needed)

1. Go to your Supabase project → **SQL Editor**.
2. Paste and run each file **in order**: 001 → 002 → 003 → 004.

---

## How the signup trigger works

```text
User signs up (Supabase Auth)
        │
        ▼
  auth.users row inserted
        │
        ▼
  trg_on_auth_user_created fires
        │
        ▼
  public.profiles row auto-created
  (id, email, full_name, avatar_url)
```

No frontend code needed — the DB trigger runs automatically on every signup.

---

## Row Level Security summary

| Table | Allowed operations |
| ----- | ------------------ |
| `profiles` | Read & update **own row** |
| `platform_connections` | Full CRUD on **own rows** |
| `activities` | Read & insert **own rows** |
| `audit_logs` | Read **own rows** (insert via service role only) |
