import { Hono } from 'hono';
import { handleInstallation, handleWebhookPayload } from './handlers.js';
import { fetchGitHubUserFromOAuthCode } from './github_auth.js';
import { authenticateUser } from '../../authentication.js';
import { GITHUB_APP_SLUG, GITHUB_CLIENT_ID } from '../../env_variables.js';

const github = new Hono();

// ── GET /api/platforms/github/install-redirect ────────────────────────────
github.get('/install-redirect', (c) => {
  if (!GITHUB_APP_SLUG)
    return c.json({ error: 'GitHub App not configured on server' }, 500);
  return c.redirect(
    `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`,
    302
  );
});

// ── GET /api/platforms/github/oauth-login-redirect ─────────────────────────
github.get('/oauth-login-redirect', (c) => {
  const redirectUri = c.req.query('redirect_uri');
  const state = c.req.query('state');
  if (!redirectUri) return c.json({ error: 'Missing redirect_uri' }, 400);
  if (!GITHUB_CLIENT_ID)
    return c.json({ error: 'GitHub OAuth not configured on server' }, 500);

  let authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
    GITHUB_CLIENT_ID
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user`;
  if (state) authorizeUrl += `&state=${encodeURIComponent(state)}`;

  return c.redirect(authorizeUrl, 302);
});

// ── POST /api/platforms/github/oauth-user ──────────────────────────────────
github.post(
  '/oauth-user',
  authenticateUser(async (c) => {
    const { code, redirect_uri } = await c.req.json().catch(() => ({}));
    if (!code || !redirect_uri) {
      return c.json({ error: 'code and redirect_uri are required' }, 400);
    }

    const { data, error, status } = await fetchGitHubUserFromOAuthCode(
      code,
      redirect_uri
    );
    return c.json(error ? { error } : data, status ?? 200);
  })
);

// ── POST /api/platforms/github/install ───────────────────────────────────
github.post(
  '/install',
  authenticateUser(async (c, user) => {
    const { code, installation_id } = await c.req.json();
    if (!code) return c.json({ error: 'Missing code' }, 400);

    const { data, error, status } = await handleInstallation(
      user.id,
      code,
      installation_id
    );
    return c.json(error ? { error } : data, status);
  })
);

// ── POST /api/platforms/github/webhook ───────────────────────────────────────
github.post('/webhook', async (c) => {
  try {
    const payload = await c.req.json();
    const headersObj = {};
    c.req.raw.headers.forEach((v, k) => {
      headersObj[k] = v;
    });
    await handleWebhookPayload(payload, headersObj);
    return c.json({ success: true });
  } catch (e) {
    console.error('Webhook handler error:', e);
    return c.json({ success: false, error: String(e) }, 500);
  }
});

export { github as default };
export { github as githubRoutes };
