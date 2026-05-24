export const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
export const GITHUB_APP_SLUG = import.meta.env.VITE_GITHUB_APP_SLUG;

export const GITHUB_CALLBACK_PATH = '/integrations/github/callback';
export const GITHUB_CALLBACK_URL = `${import.meta.env.VITE_APP_URL}${GITHUB_CALLBACK_PATH}`;

export const GITHUB_APP_INSTALL_URL = `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`;

export const GITHUB_API_BASE = 'https://api.github.com';

export const GITHUB_INSTALL_URL = '/api/platforms/github/install';
export const GITHUB_DISCONNECT_URL = '/api/platforms/github/disconnect';
