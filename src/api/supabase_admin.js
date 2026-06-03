// Server-only Supabase clients. NEVER import this from frontend code.
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
} from './env_variables.js';

const commonOpts = {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
};

export const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, commonOpts)
    : null;

// Anon client for password recovery flows (setSession + updateUser)
export const supabaseAnon =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, commonOpts)
    : null;

export const isSupabaseServerConfigured = Boolean(
  SUPABASE_URL && (SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY)
);

// Build a fresh anon client. Useful when we need an isolated session
// (e.g. password recovery via setSession) so we don't pollute the shared one.
export function createAnonClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, commonOpts);
}
