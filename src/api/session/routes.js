import { Hono } from 'hono';
import {
  signupUser,
  signinUser,
  signoutUser,
  forgotPasswordRequest,
  resetPasswordRequest,
  refreshSession,
  getSessionUser,
} from './services.js';
import { authenticateUser } from '../authentication.js';

const api = new Hono();

api.post('/signup', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = await signupUser(body);
  return c.json(result.body, result.status);
});

api.post('/signin', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = await signinUser(body);
  return c.json(result.body, result.status);
});

api.post(
  '/signout',
  authenticateUser(async (c) => {
    const auth = c.req.header('Authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    const result = await signoutUser(token);
    return c.json(result.body, result.status);
  })
);

api.post('/forgot-password', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = await forgotPasswordRequest(body);
  return c.json(result.body, result.status);
});

api.post('/reset-password', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = await resetPasswordRequest(body);
  return c.json(result.body, result.status);
});

api.post('/refresh', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = await refreshSession(body);
  return c.json(result.body, result.status);
});

api.get(
  '/session',
  authenticateUser(async (c, user) => {
    const result = await getSessionUser(user);
    return c.json(result.body, result.status);
  })
);

export { api as default };
export { api as sessionRoutes };
