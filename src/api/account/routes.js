import { Hono } from 'hono';
import {
  fetchProfile,
  updateProfile,
  fetchPlatforms,
  updatePlatform,
  disconnectPlatform,
  deletePlatform,
} from './services.js';
import { authenticateUser } from '../authentication.js';

const api = new Hono();

// ── Profile ─────────────────────────────────────
api.get(
  '/profile',
  authenticateUser(async (c, user) => {
    const result = await fetchProfile(user.id);
    return c.json(result.body, result.status);
  })
);

api.patch(
  '/profile',
  authenticateUser(async (c, user) => {
    const body = await c.req.json().catch(() => ({}));
    const result = await updateProfile(user.id, body);
    return c.json(result.body, result.status);
  })
);

// ── Platforms ───────────────────────────────────
api.get(
  '/platforms',
  authenticateUser(async (c, user) => {
    const url = new URL(c.req.url, 'http://localhost');
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const result = await fetchPlatforms(user.id, queryParams);
    return c.json(result.body, result.status);
  })
);

api.patch(
  '/platforms',
  authenticateUser(async (c, user) => {
    const body = await c.req.json().catch(() => ({}));
    const result = await updatePlatform(user.id, body);
    return c.json(result.body, result.status);
  })
);

api.post(
  '/platforms/disconnect/:platformId',
  authenticateUser(async (c, user) => {
    const platformId = c.req.param('platformId');
    const result = await disconnectPlatform(user.id, platformId);
    return c.json(result.body, result.status);
  })
);

api.delete(
  '/platforms/delete/:platformId',
  authenticateUser(async (c, user) => {
    const platformId = c.req.param('platformId');
    const result = await deletePlatform(user.id, platformId);
    return c.json(result.body, result.status);
  })
);

export { api as default };
export { api as accountRoutes };
