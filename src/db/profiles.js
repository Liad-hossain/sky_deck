import { supabase } from '../lib/supabase';

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { profile: data ?? null, error: error ?? null };
}

export async function updateProfileFields(userId, fields) {
  const updates = { updated_at: new Date().toISOString() };
  if (fields.full_name !== undefined) updates.full_name = fields.full_name;
  if (fields.avatar_url !== undefined) updates.avatar_url = fields.avatar_url;

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  return { error: error ?? null };
}
