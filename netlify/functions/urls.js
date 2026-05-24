import { Hono } from 'hono';
import { handle } from 'hono/netlify';

import githubRoutes from '../../src/platforms/github/routes.js';

const app = new Hono().basePath('/api');

app.get('/health', (c) =>
  c.json({ status: 'ok', ts: new Date().toISOString() })
);

app.route('/platforms/github', githubRoutes);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

export const handler = handle(app);
