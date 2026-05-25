import { generateGitHubAppJWT } from './utils.js';

export async function fetchGitHubTokens(code) {
  const params = new URLSearchParams({
    client_id:
      process.env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID,
    client_secret:
      process.env.GITHUB_CLIENT_SECRET || process.env.VITE_GITHUB_CLIENT_SECRET,
    redirect_uri: `${process.env.VITE_APP_URL}/integrations/github/callback`,
    code,
  });

  const url = `https://github.com/login/oauth/access_token?${params.toString()}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
    },
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
    },
  });

  if (!res.ok) {
    return { data: null, error: `Failed to fetch emails (${res.status})` };
  }

  const emails = await res.json();

  return {
    data: emails,
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
