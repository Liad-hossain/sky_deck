import { Hono } from 'hono';
import { handleInstallation } from './handlers.js';
import { authenticateUser } from '../../authentication.js';

const github = new Hono();

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
  // TODO: verify x-hub-signature-256 -> look up platform by installation_id -> insertGitHubActivity()
  return c.json({ success: true });
});

export { github as default };
export { github as githubRoutes };
