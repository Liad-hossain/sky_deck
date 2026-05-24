import { Hono } from 'hono';

import githubRoutes from '../../src/platforms/github/routes.js';

const app = new Hono();
// mount routes under /api
app.basePath('/api');

app.get('/health', (c) =>
  c.json({ status: 'ok', ts: new Date().toISOString() })
);

app.route('/platforms/github', githubRoutes);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Netlify invokes functions with (event, context). Convert to a Request and call app.fetch
export const handler = async (event, context) => {
  const {
    httpMethod,
    path,
    headers = {},
    body,
    isBase64Encoded,
    rawQuery,
  } = event;

  // Construct URL for Request; Netlify's event may not include host, use a placeholder
  const url = new URL(
    path + (rawQuery ? `?${rawQuery}` : ''),
    `https://example.com`
  );

  const reqInit = {
    method: httpMethod,
    headers,
    body: isBase64Encoded && body ? Buffer.from(body, 'base64') : body,
  };

  const request = new Request(url.toString(), reqInit);

  const response = await app.fetch(request);

  const respHeaders = {};
  response.headers.forEach((v, k) => (respHeaders[k] = v));
  const respBody = await response.text();

  return {
    statusCode: response.status,
    headers: respHeaders,
    body: respBody,
  };
};
