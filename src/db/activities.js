import { client } from '../api/supabase_admin.js';

export async function fetchActivityById(activityId) {
  if (!client) return { data: null, error: 'Server not configured' };
  const { data, error } = await client
    .from('platform_activities')
    .select('id, platform_type, activity_type')
    .eq('id', activityId)
    .maybeSingle();

  return { activity: data, error: error?.message ?? null };
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

  return { activity: data, error: error?.message ?? null };
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
      'id, activity_id, sub_type, description, platform_activities!activity_id(activity_type)'
    )
    .in('activity_id', activityIds);

  if (error) return { data: null, error: error.message };

  const result = (data ?? []).map(({ platform_activities, ...rest }) => ({
    ...rest,
    activity_type: platform_activities?.activity_type ?? null,
  }));

  return { data: result, error: null };
}
