import { createClient } from '@supabase/supabase-js';

const _metaUrl = (() => {
  try {
    return import.meta.env.VITE_SUPABASE_URL;
  } catch (_) {
    return undefined;
  }
})();

const _metaAnonKey = (() => {
  try {
    return import.meta.env.VITE_SUPABASE_ANON_KEY;
  } catch (_) {
    return undefined;
  }
})();

// Safely read server process env (only available in Node). In the browser
// `process` is undefined and referencing it directly throws. Use
// typeof checks so this module can be imported in the client bundle.
const safeProcessEnv =
  typeof process !== 'undefined' && process && process.env ? process.env : {};

// Server reads from safeProcessEnv; browser falls back to Vite's import.meta.env
const supabaseUrl =
  safeProcessEnv.VITE_SUPABASE_URL || safeProcessEnv.SUPABASE_URL || _metaUrl;

const supabaseAnonKey =
  safeProcessEnv.VITE_SUPABASE_ANON_KEY ||
  safeProcessEnv.SUPABASE_ANON_KEY ||
  _metaAnonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseConfigError =
  'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file and restart the dev server.';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Create a server-side admin client when a service role key is available.
// This client should only be used in server/runtime code (Netlify functions).
const serviceRoleKey = safeProcessEnv.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;
