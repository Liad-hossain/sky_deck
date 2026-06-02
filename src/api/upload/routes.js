import { Hono } from 'hono';
import { authenticateUser } from '../authentication.js';
import { uploadFileToCloudinary } from './services.js';

const upload = new Hono();

// POST /api/upload/avatar — multipart/form-data with field "file"
upload.post(
  '/avatar',
  authenticateUser(async (c, user) => {
    let body;
    try {
      body = await c.req.parseBody();
    } catch (e) {
      return c.json({ error: 'Invalid multipart body' }, 400);
    }
    const file = body?.file;
    if (!file) return c.json({ error: 'Missing file' }, 400);

    const { url, error } = await uploadFileToCloudinary(file, {
      folder: `avatars/${user.id}`,
    });
    if (error) return c.json({ error }, 500);
    return c.json({ url });
  })
);

export { upload as default };
export { upload as uploadRoutes };
