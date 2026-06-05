import { Hono } from 'hono';
import {
  fetchProfile,
  updateProfile,
  fetchPlatforms,
  updatePlatform,
  disconnectPlatform,
  deletePlatform,
  fetchPlatformActivities,
  toggleActivity,
  fetchActivitiesByPlatformType,
  fetchPlatformActivityFeeds,
  fetchSubTypesByActivityIds,
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

// ── Platform Activities ─────────────────────────
api.get(
  '/platforms/:platformId/activities',
  authenticateUser(async (c, user) => {
    const platformId = c.req.param('platformId');
    const result = await fetchPlatformActivities(user.id, platformId);
    return c.json(result.body, result.status);
  })
);

api.post(
  '/platforms/:platformId/activities',
  authenticateUser(async (c, user) => {
    const platformId = c.req.param('platformId');
    const body = await c.req.json().catch(() => ({}));
    const result = await toggleActivity(user.id, platformId, body);
    return c.json(result.body, result.status);
  })
);

// ── Activity Types by platform_type ──────────────
api.get(
  '/platforms/:platformType/activities',
  authenticateUser(async (c, user) => {
    const platformType = c.req.param('platformType');
    const result = await fetchActivitiesByPlatformType(user.id, platformType);
    return c.json(result.body, result.status);
  })
);

// GET /api/account/activity-sub-types?activity_ids=uuid1,uuid2,uuid3
api.get(
  '/activity-sub-types',
  authenticateUser(async (c) => {
    const url = new URL(c.req.url, 'http://localhost');
    const raw = url.searchParams.get('activity_ids') ?? '';
    const activityIds = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const result = await fetchSubTypesByActivityIds(activityIds);
    return c.json(result.body, result.status);
  })
);

// ── Activity Feed by platform_id ───────────────
api.get(
  '/platforms/:platformId/activitiy-feeds/:activityId',
  authenticateUser(async (c, user) => {
    const platformId = c.req.param('platformId');
    const activityId = c.req.param('activityId');
    const url = new URL(c.req.url, 'http://localhost');
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') ?? '20', 10),
      100
    );
    const offset = Math.max(
      parseInt(url.searchParams.get('offset') ?? '0', 10),
      0
    );
    const result = await fetchPlatformActivityFeeds(
      user.id,
      platformId,
      activityId,
      limit,
      offset
    );
    return c.json(result.body, result.status);
  })
);

export { api as default };
export { api as accountRoutes };
