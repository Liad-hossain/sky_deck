import { Hono } from 'hono';
import { handleInstallation, handleWebhookPayload } from './handlers.js';
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
  try {
    const raw = await c.req.text();
    const headersObj = {};
    for (const [k, v] of c.req.headers) {
      headersObj[k] = v;
    }
    await handleWebhookPayload(raw, headersObj);
    return c.json({ success: true });
  } catch (e) {
    console.error('Webhook handler error:', e);
    return c.json({ success: false, error: String(e) }, 500);
  }
});

export { github as default };
export { github as githubRoutes };
