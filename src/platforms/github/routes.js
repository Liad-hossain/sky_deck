import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { handleInstallation, handleDisconnect } from './handlers.js';

const github = new Hono();

// ── Shared: verify Supabase JWT, return { user, supabase } ────────────────────
async function getUser(authHeader) {
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return { user: null, error: 'Missing authorization header' };

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  return { user: user ?? null, supabase, error: error?.message ?? null };
}

// ── POST /api/platforms/github/install ───────────────────────────────────
github.post('/install', async (c) => {
  const {
    user,
    supabase,
    error: authErr,
  } = await getUser(c.req.header('Authorization'));
  if (authErr || !user)
    return c.json({ error: authErr ?? 'Unauthorized' }, 401);

  const { code, installation_id } = await c.req.json();
  if (!code) return c.json({ error: 'Missing code' }, 400);

  const { data, error, status } = await handleInstallation(
    supabase,
    user.id,
    code,
    installation_id
  );
  return c.json(error ? { error } : data, status);
});

// ── POST /api/platforms/github/webhook ───────────────────────────────────────
github.post('/webhook', async (c) => {
  // TODO: verify x-hub-signature-256 -> look up platform by installation_id -> insertGitHubActivity()
  return c.json({ success: true });
});

// ── POST /api/platforms/github/disconnect ────────────────────────────────────
github.post('/disconnect', async (c) => {
  const {
    user,
    supabase,
    error: authErr,
  } = await getUser(c.req.header('Authorization'));
  if (authErr || !user)
    return c.json({ error: authErr ?? 'Unauthorized' }, 401);

  const { data, error, status } = await handleDisconnect(supabase, user.id);
  return c.json(error ? { error } : data, status);
});

export default github;
