import crypto from 'crypto';
import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
} from '../env_variables.js';

/**
 * Upload a file (Blob/File from a multipart request, or a Buffer) to Cloudinary
 * using a server-side signed upload. Returns the secure URL.
 */
export async function uploadFileToCloudinary(file, { folder } = {}) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return { url: null, error: 'Cloudinary not configured on server' };
  }
  if (!file) return { url: null, error: 'Missing file' };

  const timestamp = Math.round(Date.now() / 1000);

  // Build params to sign (alphabetical order, exclude file/api_key/signature).
  const params = { timestamp: String(timestamp) };
  if (folder) params.folder = folder;
  if (CLOUDINARY_UPLOAD_PRESET) params.upload_preset = CLOUDINARY_UPLOAD_PRESET;

  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const signature = crypto
    .createHash('sha1')
    .update(toSign + CLOUDINARY_API_SECRET)
    .digest('hex');

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', CLOUDINARY_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  for (const [k, v] of Object.entries(params)) {
    if (k !== 'timestamp') form.append(k, v);
  }

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: form }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        url: null,
        error: data?.error?.message ?? `Upload failed (${res.status})`,
      };
    }
    return { url: data.secure_url, error: null };
  } catch (e) {
    return { url: null, error: e.message ?? 'Upload failed' };
  }
}
