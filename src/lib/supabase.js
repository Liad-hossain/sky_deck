import { createClient } from '@supabase/supabase-js';

// Support both client (import.meta.env) and server (process.env) environments.
function readEnvVar(name) {
  // prefer process.env for server runtime
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name];
  }
  // fallback to import.meta.env if available (browser / Vite)
  try {
    // eslint-disable-next-line no-undef
    return import.meta.env ? import.meta.env[name] : undefined;
  } catch (e) {
    // import.meta may not be available in some runtimes
  }
  // also check VITE_ prefixed names in process.env (some hosts inject them)
  if (
    typeof process !== 'undefined' &&
    process.env &&
    process.env[`VITE_${name}`]
  ) {
    return process.env[`VITE_${name}`];
  }
  return undefined;
}

const supabaseUrl =
  readEnvVar('VITE_SUPABASE_URL') || readEnvVar('SUPABASE_URL');
const supabaseAnonKey =
  readEnvVar('VITE_SUPABASE_ANON_KEY') || readEnvVar('SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseConfigError =
  'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (for dev) or SUPABASE_URL and SUPABASE_ANON_KEY (for server) in your environment.';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
