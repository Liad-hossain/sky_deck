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

export const supabaseAnon =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, commonOpts)
    : null;

export const isSupabaseServerConfigured = Boolean(
  SUPABASE_URL && (SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY)
);

export function createAnonClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, commonOpts);
}

export const client = supabaseAdmin ?? supabaseAnon;
