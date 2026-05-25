import { supabase, supabaseAdmin } from '../lib/supabase.js';

const client = supabaseAdmin ?? supabase;

export async function getUserFromAuthHeader(authHeader) {
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return { user: null, error: 'Missing authorization header' };

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

  const { error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return { profile: data ?? null, error: error ?? null };
}
