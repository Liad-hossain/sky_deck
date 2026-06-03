// Server-only env loader. Never import this file from frontend code.
// Priority: secrets.json (written by CI/CD) → process.env (local dev with .env).
import { readFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

dotenv.config();

// ── Load single secrets.json written by CI/CD ────────────────
// Netlify bundles functions and may run them from a subdirectory, so we try
// several candidate paths. The repo path is added via `included_files` in
// netlify.toml so the JSON ships alongside the bundled function.
const CANDIDATE_PATHS = [
  resolve(process.cwd(), 'netlify/functions/secrets/secrets.json'),
  resolve(process.cwd(), '../netlify/functions/secrets/secrets.json'),
  resolve(process.cwd(), '../../netlify/functions/secrets/secrets.json'),
  // Netlify production layout — repo root is mirrored under /var/task.
  '/var/task/netlify/functions/secrets/secrets.json',
];

let secrets = {};
let loadedFrom = null;
for (const p of CANDIDATE_PATHS) {
  try {
    secrets = JSON.parse(readFileSync(p, 'utf-8'));
    loadedFrom = p;
    break;
  } catch {
    // try next
  }
}
if (process.env.SKY_DECK_DEBUG_SECRETS === '1') {
  // eslint-disable-next-line no-console
  console.log(
    '[env] secrets loaded from:',
    loadedFrom ?? '(none — using process.env)'
  );
  // eslint-disable-next-line no-console
  console.log('[env] secret keys present:', Object.keys(secrets));
}

// ── Resolve each key: secrets.json → process.env ─────────────
const get = (key) => secrets[key] || process.env[key] || '';

const SUPABASE_URL = get('SUPABASE_URL');
const SUPABASE_ANON_KEY = get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = get('SUPABASE_SERVICE_ROLE_KEY');

const CLOUDINARY_CLOUD_NAME = get('CLOUDINARY_CLOUD_NAME');
const CLOUDINARY_API_KEY = get('CLOUDINARY_API_KEY');
const CLOUDINARY_API_SECRET = get('CLOUDINARY_API_SECRET');
const CLOUDINARY_UPLOAD_PRESET = get('CLOUDINARY_UPLOAD_PRESET');

const GITHUB_CLIENT_ID = get('GITHUB_CLIENT_ID');
const GITHUB_CLIENT_SECRET = get('GITHUB_CLIENT_SECRET');
const GITHUB_APP_SLUG = get('GITHUB_APP_SLUG');
const GITHUB_APP_ID = get('GITHUB_APP_ID');
const GITHUB_APP_PRIVATE_KEY = get('GITHUB_APP_PRIVATE_KEY');
const GITHUB_WEBHOOK_SECRET = get('GITHUB_WEBHOOK_SECRET');

const FIREBASE_PROJECT_ID = get('FIREBASE_PROJECT_ID');
const FIREBASE_CLIENT_EMAIL = get('FIREBASE_CLIENT_EMAIL');
const FIREBASE_PRIVATE_KEY = get('FIREBASE_PRIVATE_KEY');
const FIREBASE_DATABASE_URL = get('FIREBASE_DATABASE_URL');

const SKY_DECK_APP_URL = get('SKY_DECK_APP_URL');

export {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_APP_SLUG,
  GITHUB_APP_ID,
  GITHUB_APP_PRIVATE_KEY,
  GITHUB_WEBHOOK_SECRET,
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_DATABASE_URL,
  SKY_DECK_APP_URL,
};
