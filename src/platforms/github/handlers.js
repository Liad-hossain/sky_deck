import { insertOrUpdatePlatformConnection } from '../../db/platforms.js';
import { generateGitHubAppJWT } from './utils.js';
import {
  fetchGitHubTokens,
  fetchGitHubEmails,
  fetchGitHubInstallationDetails,
} from './providers.js';

export async function handleInstallation(
  supabase,
  userId,
  code,
  installation_id
) {
  if (!installation_id) {
    return { data: null, error: 'Missing installation_id', status: 400 };
  }

  const { data: tokens, error: tokenErr } = await fetchGitHubTokens(code);
  if (tokenErr) return { data: null, error: tokenErr, status: 400 };
  const { accessToken, refreshToken } = tokens;

  const { data: emailData, error: emailErr } =
    await fetchGitHubEmails(accessToken);
  if (emailErr) return { data: null, error: emailErr, status: 502 };
  const { primaryEmail } = emailData;

  const {
    data: installation,
    error: instErr,
    status: instStatus,
  } = await fetchGitHubInstallationDetails(installation_id);
  if (instErr) return { data: null, error: instErr, status: instStatus };

  const userMetadata = {
    primary_email: primaryEmail,
    login: installation.account?.login ?? null,
    avatar_url: installation.account?.avatar_url ?? null,
    html_url: installation.account?.html_url ?? null,
    account_type: installation.account?.type ?? null,
  };

  const platformMetadata = {
    installation_id: installation.id,
    account_login: installation.account?.login ?? null,
    account_type: installation.account?.type ?? null,
    app_id: installation.app_id ?? null,
    app_slug: installation.app_slug ?? null,
    repository_selection: installation.repository_selection ?? null,
    suspended_at: installation.suspended_at ?? null,
    installed_at: installation.created_at ?? new Date().toISOString(),
    events: installation.events ?? [],
    permissions: installation.permissions ?? {},
  };

  const primaryId = String(installation.account?.id ?? '');
  const { error: dbErr } = await insertOrUpdatePlatformConnection(
    userId,
    'github',
    primaryId,
    accessToken,
    refreshToken,
    userMetadata,
    platformMetadata,
    supabase
  );

  if (dbErr) {
    console.error('handleInstallation — DB error:', dbErr);
    // DB save failed — uninstall the app so access is not left open with no record
    const appJWT = generateGitHubAppJWT();
    await fetch(`https://api.github.com/app/installations/${installation_id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${appJWT}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'sky-deck',
      },
    }).catch((e) =>
      console.warn(
        'handleInstallation — rollback uninstall failed (non-fatal):',
        e.message
      )
    );
    return {
      data: null,
      error: 'Failed to save platform connection.',
      status: 500,
    };
  }

  return { data: { github_user: userMetadata }, error: null, status: 200 };
}

export async function handleDisconnect(supabase, userId) {
  const { data: platform, error: fetchErr } = await supabase
    .from('platforms')
    .select('id, platform_metadata')
    .eq('user_id', userId)
    .eq('platform_type', 'github')
    .eq('is_connected', true)
    .maybeSingle();

  if (fetchErr || !platform) {
    return {
      data: null,
      error: 'No connected GitHub platform found.',
      status: 404,
    };
  }

  const installationId = platform.platform_metadata?.installation_id ?? null;

  if (installationId) {
    const appJWT = generateGitHubAppJWT();
    const uninstallRes = await fetch(
      `https://api.github.com/app/installations/${installationId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${appJWT}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'sky-deck',
        },
      }
    );
    if (!uninstallRes.ok && uninstallRes.status !== 204) {
      const body = await uninstallRes.json().catch(() => ({}));
      console.error('handleDisconnect — uninstall failed:', body);
      return {
        data: null,
        error: body.message ?? 'Failed to uninstall GitHub App.',
        status: uninstallRes.status,
      };
    }
  }

  const { error: updateErr } = await supabase
    .from('platforms')
    .update({
      is_connected: false,
      access_token: null,
      refresh_token: null,
      disconnected_at: new Date().toISOString(),
    })
    .eq('id', platform.id);

  if (updateErr) {
    console.error('handleDisconnect — update error:', updateErr);
    return {
      data: null,
      error: 'Failed to update platform record.',
      status: 500,
    };
  }

  return { data: { success: true }, error: null, status: 200 };
}
