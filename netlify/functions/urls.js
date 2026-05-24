import { Hono } from 'hono';
import { githubRoutes } from '../../src/platforms/github/routes.js';

// basePath() returns a NEW instance — must be assigned, not called in-place.
const app = new Hono().basePath('/api');

app.get('/health', (c) =>
  c.json({ status: 'ok', ts: new Date().toISOString() })
);

app.route('/platforms/github', githubRoutes);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

export const handler = async (event) => {
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

  // Decode body (Netlify base64-encodes binary payloads).
  const bodyInit =
    body && isBase64Encoded ? Buffer.from(body, 'base64') : (body ?? undefined);

  const request = new Request(url, {
    method: httpMethod,
    headers,
    // GET/HEAD must not have a body.
    body: ['GET', 'HEAD'].includes(httpMethod) ? undefined : bodyInit,
  });

  const response = await app.fetch(request);

  // Flatten response headers (Headers object → plain object).
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
