console.log('[urls] module loaded, cwd=', process.cwd());

let appPromise = null;

function isHonoRouter(value) {
  return Boolean(
    value && typeof value === 'object' && Array.isArray(value.routes)
  );
}

function resolveRouter(mod, exportName) {
  const candidates = [
    mod?.[exportName],
    mod?.default,
    mod?.default?.[exportName],
    mod?.default?.default,
  ];
  return candidates.find((c) => isHonoRouter(c)) ?? null;
}

async function buildApp() {
  const { Hono } = await import('hono');

  const [githubMod, sessionMod, accountMod, uploadMod, taskMod] =
    await Promise.all([
      import('../../src/api/platforms/github/routes.js'),
      import('../../src/api/session/routes.js'),
      import('../../src/api/account/routes.js'),
      import('../../src/api/upload/routes.js'),
      import('../../src/api/tasks/routes.js'),
    ]);


  const githubRoutes = resolveRouter(githubMod, 'githubRoutes');
  const sessionRoutes = resolveRouter(sessionMod, 'sessionRoutes');
  const accountRoutes = resolveRouter(accountMod, 'accountRoutes');
  const uploadRoutes = resolveRouter(uploadMod, 'uploadRoutes');
  const taskRoutes = resolveRouter(taskMod, 'taskRoutes');

  const mounts = [
    ['githubRoutes', githubRoutes],
    ['sessionRoutes', sessionRoutes],
    ['accountRoutes', accountRoutes],
    ['uploadRoutes', uploadRoutes],
    ['taskRoutes', taskRoutes],
  ];
  for (const [name, route] of mounts) {
    if (!isHonoRouter(route)) {
      throw new Error(
        `[urls] ${name} is invalid; available exports=${JSON.stringify(
          Object.keys(
            {
              githubRoutes: githubMod,
              sessionRoutes: sessionMod,
              accountRoutes: accountMod,
              uploadRoutes: uploadMod,
              taskRoutes: taskMod,
            }[name] ?? {}
          )
        )}; defaultExports=${JSON.stringify(
          Object.keys(
            {
              githubRoutes: githubMod,
              sessionRoutes: sessionMod,
              accountRoutes: accountMod,
              uploadRoutes: uploadMod,
              taskRoutes: taskMod,
            }[name]?.default ?? {}
          )
        )}`
      );
    }
  }

  const app = new Hono().basePath('/api');

  app.get('/health', (c) =>
    c.json({ status: 'ok', ts: new Date().toISOString() })
  );

  app.route('/platforms/github', githubRoutes);
  app.route('/upload', uploadRoutes);
  app.route('/tasks', taskRoutes);
  app.route('/', sessionRoutes);
  app.route('/account', accountRoutes);
  app.notFound((c) => c.json({ error: 'Not found' }, 404));
  return app;
}

exports.handler = async (event) => {
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

    const functionPrefix = '/.netlify/functions/urls';
    const requestPath = path.startsWith(functionPrefix)
      ? `/api${path.slice(functionPrefix.length)}`
      : path;

    const qs = queryStringParameters
      ? '?' + new URLSearchParams(queryStringParameters).toString()
      : '';
    const url = `https://netlify.local${requestPath}${qs}`;

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
