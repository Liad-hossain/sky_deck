// Public endpoints. The backend owns the GitHub App slug and creds.
export const GITHUB_INSTALL_URL = '/api/platforms/github/install';
export const GITHUB_INSTALL_REDIRECT_URL =
  '/api/platforms/github/install-redirect';
export const GITHUB_DISCONNECT_URL = '/api/platforms/github/disconnect';
export const GITHUB_CALLBACK_PATH = '/integrations/github/callback';
export const GITHUB_API_BASE = 'https://api.github.com';
