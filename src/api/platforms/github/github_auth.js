import { generateGitHubAppJWT } from './utils.js';
import {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  SKY_DECK_APP_URL,
} from '../../env_variables.js';

export async function fetchGitHubTokens(code) {
  const redirectUri = `${SKY_DECK_APP_URL}integrations/github/callback`;

  const url = `https://github.com/login/oauth/access_token?client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}&redirect_uri=${redirectUri}&code=${code}`;
  // debug logs removed

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  const tokenData = await res.json().catch((err) => {
    console.error('Failed to parse token response JSON:', err);
    return null;
  });

  if (!res.ok || (tokenData && tokenData.error)) {
    console.error('GitHub token exchange failed', {
      status: res.status,
      statusText: res.statusText,
      body: tokenData,
    });
  }

  if (!tokenData || tokenData.error || !tokenData.access_token) {
    return {
      data: null,
      error:
        tokenData?.error_description ||
        tokenData?.error ||
        'Token exchange failed',
      status: res.status,
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

export async function fetchInstallationAccessToken(installationId) {
  const appJWT = generateGitHubAppJWT();

  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${appJWT}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'sky-deck',
      },
    }
  );

  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    return {
      data: null,
      error:
        data?.message ?? `Failed to create installation token (${res.status})`,
      status: res.status,
    };
  }

  return { data: { accessToken: data.token }, error: null, status: res.status };
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
