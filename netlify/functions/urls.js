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
  const githubModule = await import('../../src/api/platforms/github/routes.js');
  const accountModule = await import('../../src/api/account/routes.js');

  const githubRoutes = githubModule.githubRoutes ?? githubModule.default ?? githubModule.github ?? null;
  const apiRoutes = accountModule.default ?? accountModule.api ?? null;

  const app = new Hono().basePath('/api');

  app.get('/health', (c) =>
    c.json({ status: 'ok', ts: new Date().toISOString() })
  );
  if (githubRoutes) {
    app.route('/platforms/github', githubRoutes);
  } else {
    console.warn('GitHub routes not found - skipping mount');
  }

  if (apiRoutes) {
    app.route('/', apiRoutes); // mount API routes at /api/*
  } else {
    console.warn('Account API routes not found - skipping mount');
  }

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
