import { apiFetch } from '../../api/session';
import {
  GITHUB_INSTALL_URL,
  GITHUB_INSTALL_REDIRECT_URL,
  GITHUB_DISCONNECT_URL,
} from './constants.js';

// Step 1: Open the BE redirect endpoint that knows the GitHub App slug.
export function redirectToGitHubInstall() {
  window.open(GITHUB_INSTALL_REDIRECT_URL, '_blank', 'noopener,noreferrer');
}

// Step 2: Exchange code + store installation. Auth header injected by apiFetch.
export async function exchangeGitHubCode(code, installationId) {
  const { ok, data, error } = await apiFetch(GITHUB_INSTALL_URL, {
    method: 'POST',
    body: JSON.stringify({ code, installation_id: installationId }),
  });
  if (!ok) return { error: error || 'Installation failed' };
  return { data, error: null };
}

// Disconnect — server reads the user from the access token in Authorization header.
export async function disconnectGitHub() {
  const { ok, error } = await apiFetch(GITHUB_DISCONNECT_URL, {
    method: 'POST',
  });
  if (!ok) return { error: error ?? 'Failed to disconnect GitHub.' };
  return { error: null };
}
