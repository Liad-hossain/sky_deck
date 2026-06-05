import { supabaseAdmin, supabaseAnon } from '../api/supabase_admin.js';
import { getPgPool } from './pg_client.js';

const client = supabaseAdmin ?? supabaseAnon;

export async function fetchActivityById(activityId) {
  if (!client) return { data: null, error: 'Server not configured' };

  const { data, error } = await client
    .from('platform_activities')
    .select('id, platform_type, activity_type')
    .eq('id', activityId)
    .maybeSingle();

  return { data, error: error?.message ?? null };
}

export async function upsertActivity(platformType, activityType) {
  if (!client) return { data: null, error: 'Server not configured' };

  const { data, error } = await client
    .from('platform_activities')
    .upsert(
      { platform_type: platformType, activity_type: activityType },
      { onConflict: 'platform_type,activity_type' }
    )
    .select()
    .single();

  return { data, error: error?.message ?? null };
}

export async function upsertSubTypes(activityId, subTypes = []) {
  if (!client) return { data: null, error: 'Server not configured' };
  if (!subTypes.length) return { data: [], error: null };

  const rows = subTypes.map((st) => ({
    activity_id: activityId,
    sub_type: st.sub_type,
    description: st.description ?? '',
  }));

  const { data, error } = await client
    .from('activity_sub_types')
    .upsert(rows, { onConflict: 'activity_id,sub_type' })
    .select();

  return { data, error: error?.message ?? null };
}

export async function getActivitiesForPlatform(platformId, platformType) {
  if (!client) return { data: null, error: 'Server not configured' };

  const { data, error } = await client
    .from('platform_activities')
    .select(
      `id, platform_type, activity_type, platform_visible_activities!left(platform_id)`
    )
    .eq('platform_type', platformType)
    .or(`platform_id.eq.${platformId},platform_id.is.null`, {
      referencedTable: 'platform_visible_activities',
    });

  if (error) return { data: null, error: error.message };

  const result = (data ?? []).map(
    ({ platform_visible_activities, ...rest }) => ({
      ...rest,
      is_active: platform_visible_activities?.length > 0,
    })
  );

  return { data: result, error: null };
}

export async function getPlatformTypeActivities(userId, platformType) {
  const pool = getPgPool();

  const { rows } = await pool.query(
    `SELECT
       p.id             AS platform_id,
       p.platform_type,
       p.title          AS platform_title,
       pa.id             AS activity_id,
       pa.activity_type
     FROM public.platforms p
     INNER JOIN public.platform_activities pa
       ON pa.platform_type = p.platform_type
     INNER JOIN public.platform_visible_activities pva
       ON pva.activity_id = pa.id
      AND pva.platform_id = p.id
     WHERE p.user_id = $1
       AND p.is_connected = true
       AND p.is_archived = false
       AND p.platform_type = $2
     ORDER BY p.connected_at DESC`,
    [userId, platformType]
  );

  return { data: rows, error: null };
}

export async function togglePlatformActivity(platformId, activityId, action) {
  if (!client) return { error: 'Server not configured' };

  if (action === 'add') {
    const { error } = await client
      .from('platform_visible_activities')
      .insert({ platform_id: platformId, activity_id: activityId })
      .select()
      .maybeSingle();
    if (error && error.code !== '23505') {
      return { error: error.message };
    }
    return { error: null };
  }

  if (action === 'remove') {
    const { error } = await client
      .from('platform_visible_activities')
      .delete()
      .eq('platform_id', platformId)
      .eq('activity_id', activityId);
    return { error: error?.message ?? null };
  }

  return { error: 'Invalid action. Use "add" or "remove".' };
}

export async function getSubTypesByActivityIds(activityIds = []) {
  if (!client) return { data: null, error: 'Server not configured' };
  if (!activityIds.length) return { data: [], error: null };

  const { data, error } = await client
    .from('activity_sub_types')
    .select(
      'id, activity_id, sub_type, description, platform_activities(activity_type)'
    )
    .in('activity_id', activityIds);

  if (error) return { data: null, error: error.message };

  const result = (data ?? []).map(({ platform_activities, ...rest }) => ({
    ...rest,
    activity_type: platform_activities?.activity_type ?? null,
  }));

  return { data: result, error: null };
}
