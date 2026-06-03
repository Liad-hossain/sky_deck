import { Hono } from 'hono';

console.log('[urls] module loaded, cwd=', process.cwd());

let appPromise = null;

async function buildApp() {
  const [
    { githubRoutes },
    { sessionRoutes },
    { accountRoutes },
    { uploadRoutes },
    envVars,
  ] = await Promise.all([
    import('../../src/api/platforms/github/routes.js'),
    import('../../src/api/session/routes.js'),
    import('../../src/api/account/routes.js'),
    import('../../src/api/upload/routes.js'),
    import('../../src/api/env_variables.js'),
  ]);

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
  return app;
}

export const handler = async (event) => {
  try {
    if (!appPromise) appPromise = buildApp();
    const app = await appPromise;

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
    appPromise = null;
    console.error('[urls] handler crashed:', err?.stack ?? err);
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
