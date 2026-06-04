import { Hono } from 'hono';
import { cleanupGithubExpiredEntries } from '../../redis/client.js';

const tasks = new Hono();

// POST /api/tasks/cleanup-github-webhooks
tasks.post('/cleanup-github-webhooks', async (c) => {
  try {
    const deleted = await cleanupGithubExpiredEntries();
    return c.json({ success: true, deletedCount: deleted });
  } catch (e) {
    console.error('Github webhook cleanup error:', e);
    return c.json({ error: e.message }, 500);
  }
});

export { tasks as taskRoutes };
