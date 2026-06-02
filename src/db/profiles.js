import {
  supabaseAdmin,
  supabaseAnon,
  createAnonClient,
} from '../api/supabase_admin.js';
import { SKY_DECK_APP_URL } from '../api/env_variables.js';

const client = supabaseAdmin ?? supabaseAnon;

function appUrl(path = '') {
  const base = (SKY_DECK_APP_URL || '').replace(/\/$/, '');
  if (!base) return undefined;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function authSignup(email, password) {
  const c = supabaseAnon ?? client;
  if (!c) return { data: null, error: 'Server not configured' };
  const { data, error } = await c.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: appUrl('/verify-email') },
  });
  return { data, error };
}

export async function authSignin(email, password) {
  const c = supabaseAnon ?? client;
  if (!c) return { data: null, error: 'Server not configured' };
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function authSignout(accessToken) {
  if (!accessToken) return { error: 'Missing access token' };
  if (!supabaseAdmin) return { error: 'Server not configured' };
  const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
  return { error: error?.message ?? null };
}

export async function authForgotPassword(email) {
  const c = supabaseAnon ?? client;
  if (!c) return { data: null, error: 'Server not configured' };
  const { data, error } = await c.auth.resetPasswordForEmail(email, {
    redirectTo: appUrl('/reset-password'),
  });
  return { data, error };
}

export async function authResetPassword(
  accessToken,
  refreshToken,
  newPassword
) {
  const c = createAnonClient();
  if (!c) return { data: null, error: 'Server not configured' };
  const { error: setErr } = await c.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
  });
  if (setErr) return { data: null, error: setErr };
  const { data, error } = await c.auth.updateUser({ password: newPassword });
  return { data, error };
}

export async function authRefreshSession(refreshToken) {
  if (!refreshToken) return { data: null, error: 'Missing refresh token' };
  const c = createAnonClient();
  if (!c) return { data: null, error: 'Server not configured' };
  const { data, error } = await c.auth.refreshSession({
    refresh_token: refreshToken,
  });
  return { data, error };
}

export async function getUserFromAuthHeader(authHeader) {
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return { user: null, error: 'Missing authorization header' };
  if (!client) return { user: null, error: 'Server not configured' };
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);
  return { user: user ?? null, error: error?.message ?? null };
}

export async function fetchUserProfile(userId) {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return { profile: data ?? null, error: error ?? null };
}

export async function updateProfileFields(userId, fields) {
  const updates = { updated_at: new Date().toISOString() };
  if (fields.full_name !== undefined) updates.full_name = fields.full_name;
  if (fields.avatar_url !== undefined) updates.avatar_url = fields.avatar_url;
  const { data, error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .maybeSingle();
  return { profile: data ?? null, error: error ?? null };
}
