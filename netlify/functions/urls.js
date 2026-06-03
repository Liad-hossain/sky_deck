import { Hono } from 'hono';

try {
  const ws = require('ws');
  if (ws) globalThis.WebSocket = ws;
} catch (e) {
  console.warn(
    'Optional ws transport not installed; Realtime may fail on Node <22'
  );
}

export const handler = async (event) => {
  const { githubRoutes } =
    await import('../../src/api/platforms/github/routes.js');
  const { sessionRoutes } = await import('../../src/api/session/routes.js');
  const { accountRoutes } = await import('../../src/api/account/routes.js');
  const { uploadRoutes } = await import('../../src/api/upload/routes.js');

  const app = new Hono().basePath('/api');

  app.get('/health', (c) =>
    c.json({ status: 'ok', ts: new Date().toISOString() })
  );

  // Debug endpoint: shows which env keys are loaded WITHOUT leaking values.
  // Safe to ship — only returns booleans + first/last 4 chars of each value.
  app.get('/health/secrets', async (c) => {
    const env = await import('../../src/api/env_variables.js');
    const summary = {};
    for (const [k, v] of Object.entries(env)) {
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
  app.route('/', sessionRoutes); // /signup /signin /signout /forgot-password /reset-password /refresh /session
  app.route('/account', accountRoutes); // /account/profile /account/platforms ...

  app.notFound((c) => c.json({ error: 'Not found' }, 404));

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
    body && isBase64Encoded ? Buffer.from(body, 'base64') : (body ?? undefined);

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
};
