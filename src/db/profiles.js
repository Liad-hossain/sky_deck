import { supabaseAdmin, client } from '../api/supabase_admin.js';
import { SKY_DECK_APP_URL } from '../api/env_variables.js';

function appUrl(path = '') {
  const base = (SKY_DECK_APP_URL || '').replace(/\/$/, '');
  if (!base) return undefined;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function authSignup(email, password) {
  if (!client) return { data: null, error: 'Server not configured' };
  const admin = supabaseAdmin?.auth?.admin;

  if (admin) {
    const { data: listData } = await admin.listUsers({ perPage: 1000 });
    const existing = (listData?.users ?? []).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existing) {
      if (existing.email_confirmed_at) {
        return {
          data: null,
          error: { message: 'An account with this email already exists.' },
        };
      }
      const { error: deleteError } = await admin.deleteUser(existing.id);
      if (deleteError) {
        console.error('Error deleting unconfirmed user:', deleteError);
        return { data: null, error: deleteError };
      }
    }

    const { data: createData, error: createError } = await admin.createUser({
      email,
      password,
      email_confirm: false,
    });
    if (createError) return { data: null, error: createError };

    const { data: linkData, error: linkError } = await admin.generateLink({
      type: 'signup',
      email,
      password,
      options: { redirectTo: appUrl('/verify-email') },
    });
    if (linkError) return { data: null, error: linkError };

    return {
      data: {
        user: createData.user ?? null,
        confirmationLink: linkData.properties?.action_link ?? null,
      },
      error: null,
    };
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectUrl ?? appUrl('/verify-email') },
  });
  return { data: { user: data?.user ?? null, confirmationLink: null }, error };
}

export async function authResendConfirmation(email, redirectUrl) {
  if (!client) return { data: null, error: 'Server not configured' };

  const admin = supabaseAdmin?.auth?.admin;
  if (admin) {
    // Find the user — resend only makes sense for unconfirmed accounts
    const { data: listData } = await admin.listUsers({ perPage: 1000 });
    const existing = (listData?.users ?? []).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!existing) {
      return {
        data: null,
        error: { message: 'No account found for this email.' },
      };
    }
    if (existing.email_confirmed_at) {
      return {
        data: null,
        error: { message: 'This email is already confirmed.' },
      };
    }

    // Delete the unconfirmed user so we can re-create with email_confirm: false
    // and issue a completely fresh token (prevents stale-link confusion).
    await admin.deleteUser(existing.id);

    const { data: createData, error: createError } = await admin.createUser({
      email,
      password: existing.encrypted_password ?? '', // preserve existing password hash when possible
      email_confirm: false,
    });
    if (createError) return { data: null, error: createError };

    const { data: linkData, error: linkError } = await admin.generateLink({
      type: 'signup',
      email,
      options: { redirectTo: redirectUrl ?? appUrl('/verify-email') },
    });
    if (linkError) return { data: null, error: linkError };

    return {
      data: {
        user: createData.user ?? null,
        confirmationLink: linkData.properties?.action_link ?? null,
      },
      error: null,
    };
  }

  // Fallback: use auth.resend (subject to Supabase rate limits)
  const { data, error } = await client.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: redirectUrl ?? appUrl('/verify-email') },
  });
  return { data, error };
}

export async function authSignin(email, password) {
  if (!client) return { data: null, error: 'Server not configured' };
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function authSignout(accessToken) {
  if (!accessToken) return { error: 'Missing access token' };
  if (!client) return { error: 'Server not configured' };
  const { error } = await client.auth.admin.signOut(accessToken);
  return { error: error?.message ?? null };
}

export async function authForgotPassword(email, redirectUrl) {
  if (!client) return { data: null, error: 'Server not configured' };
  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl ?? appUrl('/reset-password'),
  });
  return { data, error };
}

export async function authResetPassword(
  accessToken,
  refreshToken,
  newPassword
) {
  if (!client) return { data: null, error: 'Server not configured' };
  const { error: setErr } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
  });
  if (setErr) return { data: null, error: setErr };
  const { data, error } = await c.auth.updateUser({ password: newPassword });
  return { data, error };
}

export async function authRefreshSession(refreshToken) {
  if (!refreshToken) return { data: null, error: 'Missing refresh token' };
  if (!client) return { data: null, error: 'Server not configured' };
  const { data, error } = await client.auth.refreshSession({
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

export async function searchProfilesByEmail(keyword) {
  if (!keyword || keyword.trim().length < 2) {
    return { profiles: [], error: null };
  }
  const { data, error } = await client
    .from('profiles')
    .select('id, email, full_name, avatar_url')
    .ilike('email', `%${keyword.trim()}%`)
    .limit(20);
  return { profiles: data ?? [], error: error ?? null };
}
