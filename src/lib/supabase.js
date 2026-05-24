import { createClient } from '@supabase/supabase-js';

const _metaUrl = (() => {
  try {
    return import.meta.env.VITE_SUPABASE_URL;
  } catch (_) {}
})();

const _metaAnonKey = (() => {
  try {
    return import.meta.env.VITE_SUPABASE_ANON_KEY;
  } catch (_) {}
})();

// Server reads from process.env; browser falls through to the _meta* values
// captured above by Vite's static replacement.
const supabaseUrl =
  process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL || _metaUrl;

const supabaseAnonKey =
  process.env?.VITE_SUPABASE_ANON_KEY ||
  process.env?.SUPABASE_ANON_KEY ||
  _metaAnonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseConfigError =
  'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file and restart the dev server.';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
