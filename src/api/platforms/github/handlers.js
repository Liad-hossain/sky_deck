import { insertOrUpdatePlatformConnection } from '../../../db/platforms.js';
import { generateGitHubAppJWT } from './utils.js';
import {
  fetchGitHubTokens,
  fetchGitHubEmails,
  fetchGitHubInstallationDetails,
} from './github_auth.js';

export async function handleInstallation(userId, code, installation_id) {
  if (!installation_id) {
    return { data: null, error: 'Missing installation_id', status: 400 };
  }

  const { data: tokens, error: tokenErr } = await fetchGitHubTokens(code);
  if (tokenErr) return { data: null, error: tokenErr, status: 400 };
  const { accessToken, refreshToken } = tokens;

  const { data: emails, error: emailErr } =
    await fetchGitHubEmails(accessToken);
  if (emailErr) return { data: null, error: emailErr, status: 502 };
  const primaryEmail = Array.isArray(emails)
    ? (emails.find((e) => e.primary && e.verified) ?? emails[0])
    : null;

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
    platformMetadata
  );

  if (dbErr) {
    const appJWT = generateGitHubAppJWT();
    await fetch(`https://api.github.com/app/installations/${installation_id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${appJWT}`,
        Accept: 'application/vnd.github+json',
      },
    }).catch(() => {});
    return {
      data: null,
      error: 'Failed to save platform connection.',
      status: 500,
    };
  }

  return { data: { github_user: userMetadata }, error: null, status: 200 };
}

export async function handleDisconnect(installationId) {
  const appJWT = generateGitHubAppJWT();
  const uninstallRes = await fetch(
    `https://api.github.com/app/installations/${installationId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${appJWT}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
      },
    }
  );

  if (!uninstallRes.ok && uninstallRes.status !== 204) {
    const body = await uninstallRes.json().catch(() => ({}));
    return {
      success: false,
      error: body.message ?? 'Failed to uninstall GitHub App.',
      status: uninstallRes.status,
    };
  }

  return { success: true, error: null, status: 200 };
}
