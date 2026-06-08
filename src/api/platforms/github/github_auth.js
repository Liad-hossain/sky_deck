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

export async function fetchGitHubUserFromOAuthCode(code, redirectUri) {
  if (!code) {
    return { data: null, error: 'Missing code', status: 400 };
  }

  const url = `https://github.com/login/oauth/access_token?client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`;

  const tokenRes = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/vnd.github+json' },
  });

  const tokenData = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !tokenData?.access_token) {
    return {
      data: null,
      error:
        tokenData?.error_description ||
        tokenData?.error ||
        `Token exchange failed (${tokenRes.status})`,
      status: tokenRes.status,
    };
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  const userData = await userRes.json().catch(() => null);
  if (!userRes.ok || !userData?.id) {
    return {
      data: null,
      error:
        userData?.message || `Failed to fetch github user (${userRes.status})`,
      status: userRes.status,
    };
  }

  return {
    data: {
      github_user_id: userData.id,
      github_login: userData.login ?? null,
    },
    error: null,
    status: 200,
  };
}

export async function checkGitHubOrgMembership(
  installationId,
  orgLogin,
  githubLogin
) {
  const { data: tokenData, error: tokenErr } =
    await fetchInstallationAccessToken(installationId);
  if (tokenErr || !tokenData?.accessToken) {
    return {
      isMember: false,
      error: tokenErr ?? 'Failed to obtain installation access token',
    };
  }

  const res = await fetch(
    `https://api.github.com/orgs/${orgLogin}/members/${githubLogin}`,
    {
      headers: {
        Authorization: `Bearer ${tokenData.accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );

  if (res.status === 204) return { isMember: true, error: null };
  if (res.status === 404) return { isMember: false, error: null };

  return { isMember: false, error: null };
}
