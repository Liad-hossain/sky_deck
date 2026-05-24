import {
  GITHUB_APP_INSTALL_URL,
  GITHUB_INSTALL_URL,
  GITHUB_DISCONNECT_URL,
} from './constants.js';

// ── Step 1: Open GitHub App install page ─────────────────────────────────────
export function redirectToGitHubInstall() {
  window.open(GITHUB_APP_INSTALL_URL, '_blank', 'noopener,noreferrer');
}

// ── Step 2: Exchange code + store installation ────────────────────────────────
export async function exchangeGitHubCode(
  code,
  installationId,
  supabaseAccessToken
) {
  const res = await fetch(GITHUB_INSTALL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAccessToken}`,
    },
    body: JSON.stringify({ code, installation_id: installationId }),
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      githubUser: null,
      error: data.error ?? 'Failed to connect GitHub.',
    };
  }

  return { githubUser: data.github_user, error: null };
}

// ── Disconnect ────────────────────────────────────────────────────────────────
export async function disconnectGitHub(supabaseAccessToken) {
  const res = await fetch(GITHUB_DISCONNECT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAccessToken}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    return { error: data.error ?? 'Failed to disconnect GitHub.' };
  }

  return { error: null };
}
