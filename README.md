# Sky Deck

Activity intelligence dashboard — deployed on Netlify, powered by Supabase.

## Quick Start

```bash
npm install
cp .env.example .env   # fill in your Supabase credentials
npm run dev
```

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL** and **anon public key** into `.env`.
3. In Supabase Dashboard → Authentication → Settings:
   - Enable **Email** provider.
   - Set **Site URL** to your Netlify URL (or `http://localhost:5173` for dev).
   - Set **Redirect URLs** to include `http://localhost:5173/dashboard` and your production URL.
4. Supabase handles email verification emails automatically via its built-in SMTP (or configure a custom SMTP under Auth → SMTP Settings).

## Deploy to Netlify

1. Push repo to GitHub.
2. Connect repo in Netlify.
3. Build command: `npm run build` | Publish dir: `dist`.
4. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Deploy!

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + Framer Motion
- **Auth & DB**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Hosting**: Netlify (static SPA)
