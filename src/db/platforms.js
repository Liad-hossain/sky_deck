import { supabaseAdmin, supabaseAnon } from '../api/supabase_admin.js';
import { getPgPool } from './pg_client.js';

const client = supabaseAdmin ?? supabaseAnon;

export async function fetchUserPlatforms(userId, isConnected = null) {
  let query = client
    .from('platforms')
    .select(
      'id, primary_id, platform_type, title, user_metadata, platform_metadata, is_connected, connected_at, is_archived'
    )
    .eq('user_id', userId);
  if (isConnected !== null && typeof isConnected === 'boolean') {
    query = query.eq('is_connected', isConnected);
  }
  const { data, error } = await query
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
  platformMetadata = {}
) {
  const now = new Date().toISOString();

  // ── 1. Look up existing row by user_id + primary_id ──────────────────────
  const { data: existing, error: fetchErr } = await client
    .from('platforms')
    .select('id')
    .eq('user_id', userId)
    .eq('platform_type', platformType)
    .eq('primary_id', primaryId)
    .maybeSingle();

  if (fetchErr) return { error: fetchErr };

  // ── 2a. Row found → UPDATE ─────────────────────────────────────────────────
  if (existing) {
    const { error } = await client
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
  const { error } = await client.from('platforms').insert({
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

export async function fetchPlatformById(userId, platformId) {
  const { data, error } = await client
    .from('platforms')
    .select(
      'id, user_id, primary_id, platform_type, title, user_metadata, platform_metadata, is_connected, connected_at, is_archived'
    )
    .eq('id', platformId)
    .eq('user_id', userId)
    .eq('is_archived', false)
    .maybeSingle();
  return { platform: data ?? null, error: error ?? null };
}

export async function fetchPlatformByInstallationId(installationId) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `SELECT
       p.id,
       p.user_id,
       p.platform_type,
     FROM public.platforms p
     INNER JOIN public.platform_activities pa
       ON pa.platform_type = p.platform_type
     INNER JOIN public.platform_visible_activities pva
       ON pva.activity_id = pa.id
      AND pva.platform_id = p.id
     WHERE p.platform_metadata->>'installation_id' = $1
       AND p.is_connected = true
     GROUP BY p.id, p.user_id, p.platform_type, p.platform_metadata
     LIMIT 1`,
    [String(installationId)]
  );

  return { platform: rows[0] ?? null, error: null };
}

export async function updatePlatformById(userId, id, update_dict) {
  const { error } = await client
    .from('platforms')
    .update({ ...update_dict, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);
  return { error: error ?? null };
}

export async function disconnectPlatformById(userId, platformId) {
  const { error } = await client
    .from('platforms')
    .update({
      is_connected: false,
      disconnected_at: new Date().toISOString(),
      access_token: null,
      refresh_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', platformId)
    .eq('user_id', userId);
  return { error: error ?? null };
}

export async function archivePlatformById(userId, platformId) {
  const { error } = await client
    .from('platforms')
    .update({
      is_archived: true,
      updated_at: new Date().toISOString(),
      archived_at: new Date().toISOString(),
    })
    .eq('id', platformId)
    .eq('user_id', userId)
    .eq('is_connected', false);
  return { error: error ?? null };
}
