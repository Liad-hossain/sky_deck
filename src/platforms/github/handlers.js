import { insertOrUpdatePlatformConnection } from '../../db/platforms.js';
import { generateGitHubAppJWT } from './utils.js';
import {
  fetchGitHubTokens,
  fetchGitHubEmails,
  fetchGitHubInstallationDetails,
} from './github_auth.js';

export async function handleInstallation(
  supabase,
  userId,
  code,
  installation_id
) {
  if (!installation_id) {
    return { data: null, error: 'Missing installation_id', status: 400 };
  }

  console.log(
    `handleInstallation — code: ${code}, installation_id: ${installation_id}`
  );

  const { data: tokens, error: tokenErr } = await fetchGitHubTokens(code);
  if (tokenErr) return { data: null, error: tokenErr, status: 400 };
  const { accessToken, refreshToken } = tokens;

  console.log(
    `Tokens fetched successfully. Access Token: ${accessToken}, Refresh Token: ${refreshToken}`
  );

  const { data: emails, error: emailErr } =
    await fetchGitHubEmails(accessToken);
  if (emailErr) return { data: null, error: emailErr, status: 502 };
  const primaryEmail = Array.isArray(emails)
    ? (emails.find((e) => e.primary && e.verified) ?? emails[0])
    : null;

  console.log(`Email data: ${JSON.stringify(emails)}`);

  const {
    data: installation,
    error: instErr,
    status: instStatus,
  } = await fetchGitHubInstallationDetails(installation_id);
  if (instErr) return { data: null, error: instErr, status: instStatus };

  console.log(
    `Installation details fetched successfully: ${JSON.stringify(installation)}`
  );

  const userMetadata = {
    primary_email: primaryEmail,
    login: installation.account?.login ?? null,
    avatar_url: installation.account?.avatar_url ?? null,
    html_url: installation.account?.html_url ?? null,
    account_type: installation.account?.type ?? null,
  };

  const platformMetadata = {
    installation_id: installation.id,
    installation_details: installation,
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
