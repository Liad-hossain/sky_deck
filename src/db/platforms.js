import { supabase } from '../lib/supabase';

export async function fetchAllPlatforms(userId) {
  const { data, error } = await supabase
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('created_at', { ascending: true });
  return { platforms: data ?? [], error: error ?? null };
}

export async function fetchConnectedPlatforms(userId) {
  const { data, error } = await supabase
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('is_connected', true)
    .eq('is_archived', false)
    .order('connected_at', { ascending: false });
  return { platforms: data ?? [], error: error ?? null };
}

export async function insertOrUpdatePlatformConnection(
  userId,
  platformType,
  primaryId,
  accessToken = null,
  refreshToken = null,
  userMetadata = {},
  platformMetadata = {},
  client
) {
  const sb = client ?? supabase;
  const now = new Date().toISOString();

  // ── 1. Look up existing row by user_id + primary_id ──────────────────────
  const { data: existing, error: fetchErr } = await sb
    .from('platforms')
    .select('id')
    .eq('user_id', userId)
    .eq('platform_type', platformType)
    .eq('primary_id', primaryId)
    .maybeSingle();

  if (fetchErr) return { error: fetchErr };

  // ── 2a. Row found → UPDATE ─────────────────────────────────────────────────
  if (existing) {
    const { error } = await sb
      .from('platforms')
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        user_metadata: userMetadata,
        platform_metadata: platformMetadata,
        is_connected: true,
        is_archived: false,
        connected_at: now,
        disconnected_at: null,
        updated_at: now,
      })
      .eq('id', existing.id);
    return { error: error ?? null };
  }

  // ── 2b. No row found → INSERT ──────────────────────────────────────────────
  const { error } = await sb.from('platforms').insert({
    user_id: userId,
    platform_type: platformType,
    title: `${primaryId}_${userId}_${platformType}`,
    primary_id: primaryId,
    access_token: accessToken,
    refresh_token: refreshToken,
    user_metadata: userMetadata,
    platform_metadata: platformMetadata,
    is_connected: true,
    is_archived: false,
    connected_at: now,
    created_at: now,
    updated_at: now,
  });
  return { error: error ?? null };
}

export async function removePlatformConnection(userId, platformType) {
  const { error } = await supabase
    .from('platforms')
    .update({
      is_connected: false,
      disconnected_at: new Date().toISOString(),
      access_token: null,
      refresh_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('platform_type', platformType);
  return { error: error ?? null };
}

export async function archivePlatform(userId, platformType) {
  const { error } = await supabase
    .from('platforms')
    .update({
      is_archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('platform_type', platformType)
    .eq('is_connected', false); // safety: only archive if already disconnected
  return { error: error ?? null };
}
