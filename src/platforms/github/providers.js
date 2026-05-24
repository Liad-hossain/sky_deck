import { generateGitHubAppJWT } from './utils.js';

export async function fetchGitHubTokens(code) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.VITE_GITHUB_CLIENT_ID,
      client_secret: process.env.VITE_GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await res.json();

  if (tokenData.error || !tokenData.access_token) {
    return {
      data: null,
      error: tokenData.error_description ?? 'Token exchange failed',
    };
  }

  return {
    data: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
    },
    error: null,
  };
}

export async function fetchGitHubEmails(accessToken) {
  const res = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'sky-deck',
    },
  });

  if (!res.ok) {
    return { data: null, error: `Failed to fetch emails (${res.status})` };
  }

  const emails = await res.json();

  const primaryEmailObj = Array.isArray(emails)
    ? (emails.find((e) => e.primary && e.verified) ?? emails[0])
    : null;

  return {
    data: { primaryEmail: primaryEmailObj?.email ?? null },
    error: null,
  };
}

export async function fetchGitHubInstallationDetails(installationId) {
  const appJWT = generateGitHubAppJWT();

  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}`,
    {
      headers: {
        Authorization: `Bearer ${appJWT}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'sky-deck',
      },
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      data: null,
      error: body.message ?? `Failed to fetch installation (${res.status})`,
      status: res.status,
    };
  }

  const installation = await res.json();
  return { data: installation, error: null, status: 200 };
}
