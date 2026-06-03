import { Hono } from 'hono';
import { githubRoutes } from '../../src/api/platforms/github/routes.js';
import { sessionRoutes } from '../../src/api/session/routes.js';
import { accountRoutes } from '../../src/api/account/routes.js';
import { uploadRoutes } from '../../src/api/upload/routes.js';
import * as envVars from '../../src/api/env_variables.js';

const app = new Hono().basePath('/api');

app.get('/health', (c) =>
  c.json({ status: 'ok', ts: new Date().toISOString() })
);

app.get('/health/secrets', (c) => {
  const summary = {};
  for (const [k, v] of Object.entries(envVars)) {
    if (typeof v !== 'string') continue;
    summary[k] = v
      ? {
          present: true,
          length: v.length,
          peek: `${v.slice(0, 4)}…${v.slice(-4)}`,
        }
      : { present: false };
  }
  return c.json({ cwd: process.cwd(), summary });
});

app.route('/platforms/github', githubRoutes);
app.route('/upload', uploadRoutes);
app.route('/', sessionRoutes);
app.route('/account', accountRoutes);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

export const handler = async (event) => {
  try {
    const {
      httpMethod,
      path,
      queryStringParameters,
      headers = {},
      body,
      isBase64Encoded,
    } = event;

    const qs = queryStringParameters
      ? '?' + new URLSearchParams(queryStringParameters).toString()
      : '';
    const url = `https://netlify.local${path}${qs}`;

    const bodyInit =
      body && isBase64Encoded
        ? Buffer.from(body, 'base64')
        : (body ?? undefined);

    const request = new Request(url, {
      method: httpMethod,
      headers,
      body: ['GET', 'HEAD'].includes(httpMethod) ? undefined : bodyInit,
    });

    const response = await app.fetch(request);

    const respHeaders = {};
    response.headers.forEach((value, key) => {
      respHeaders[key] = value;
    });

    return {
      statusCode: response.status,
      headers: respHeaders,
      body: await response.text(),
    };
  } catch (err) {
    console.error('[urls] handler crashed:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: err?.message ?? String(err),
        stack: err?.stack,
      }),
    };
  }
};
