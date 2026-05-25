import { getUserFromAuthHeader } from '../db/profiles.js';

export function authenticateUser(handler) {
  return async (c) => {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getUserFromAuthHeader(authHeader);
    if (error || !user) return c.json({ error: error ?? 'Unauthorized' }, 401);
    return handler(c, user);
  };
}
