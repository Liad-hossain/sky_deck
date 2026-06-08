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
  fetchPlatformActivityFeeds,
  fetchSubTypesByActivityIds,
  inviteUserToPlatform,
  getPlatformUsers,
  searchUsers,
  sendPlatformInvites,
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

api.post(
  '/platforms/:platformId/invite',
  authenticateUser(async (c, user) => {
    const platformId = c.req.param('platformId');
    const body = await c.req.json().catch(() => ({}));
    const result = await inviteUserToPlatform(user.id, platformId, body);
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
    const result = await fetchPlatformActivityFeeds(
      user.id,
      platformId,
      activityId,
      c.req.query()
    );
    return c.json(result.body, result.status);
  })
);

// ── Platform Users (all users who share this platform) ─────────────────────
api.get(
  '/platforms/:platformId/users',
  authenticateUser(async (c, user) => {
    const platformId = c.req.param('platformId');
    const result = await getPlatformUsers(user.id, platformId);
    return c.json(result.body, result.status);
  })
);

// ── Search Users by Email ──────────────────────────────────────────────────
api.get(
  '/users/search',
  authenticateUser(async (c) => {
    const url = new URL(c.req.url, 'http://localhost');
    const email = url.searchParams.get('email') ?? '';
    const result = await searchUsers(email);
    return c.json(result.body, result.status);
  })
);

// ── Send Platform Invitations (emails) ─────────────────────────────────────
api.post(
  '/platforms/:platformId/send-invites',
  authenticateUser(async (c, user) => {
    const platformId = c.req.param('platformId');
    const body = await c.req.json().catch(() => ({}));
    const result = await sendPlatformInvites(user.id, platformId, body);
    return c.json(result.body, result.status);
  })
);

export { api as default };
export { api as accountRoutes };
