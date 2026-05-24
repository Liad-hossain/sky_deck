import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

import githubRoutes from '../../src/platforms/github/routes.js';

// basePath() returns a NEW Hono instance — must be assigned, not called in-place.
const app = new Hono().basePath('/api');

app.get('/health', (c) =>
  c.json({ status: 'ok', ts: new Date().toISOString() })
);

app.route('/platforms/github', githubRoutes);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Netlify Functions run on AWS Lambda (Node.js). Use hono/aws-lambda — NOT hono/netlify
// (hono/netlify is only for Netlify Edge Functions, which run on Deno).
export const handler = handle(app);
