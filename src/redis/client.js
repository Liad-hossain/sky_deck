import crypto from 'crypto';
import {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_DATABASE_URL,
} from '../api/env_variables.js';

let cachedToken = null;
let tokenExpiresAt = 0; // epoch ms

function sanitizeDbUrl(raw) {
  return (raw || '').replace(/^["'\s]+|["',\s]+$/g, '').replace(/\/$/, '');
}

export function clearFirebaseTokenCache() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

async function getFirebaseAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return { token: cachedToken, projectId: FIREBASE_PROJECT_ID };
  }

  const projectId = FIREBASE_PROJECT_ID;
  const clientEmail = FIREBASE_CLIENT_EMAIL;
  let privateKey = FIREBASE_PRIVATE_KEY || '';
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase service account environment variables');
  }

  if (!privateKey.trimStart().startsWith('-----')) {
    privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope:
      'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
  };

  const b64url = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const signingInput = `${b64url(header)}.${b64url(claims)}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  sign.end();
  const signature = sign.sign(privateKey, 'base64');
  const signatureSafe = signature
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signingInput}.${signatureSafe}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Failed to obtain Firebase access token: ${res.status} ${body}`
    );
  }
  const data = await res.json();

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in ?? 0) * 1000;

  return { token: cachedToken, projectId };
}

export async function pushGithubWebhookEntry(
  rawPayload,
  headers = {},
  ttlSeconds = 12 * 60 * 60
) {
  try {
    const { token } = await getFirebaseAccessToken();
    const baseUrl =
      sanitizeDbUrl(FIREBASE_DATABASE_URL) ||
      sanitizeDbUrl(`https://${FIREBASE_PROJECT_ID}.firebaseio.com`);

    const getHeader = (name) => {
      return headers[name.toLowerCase()] ?? null;
    };

    const hook_id = getHeader('x-github-hook-id') || 'unknown';

    const entry = {
      hook_id,
      timestamp: new Date().toISOString(),
      expiresAt: Date.now() + ttlSeconds * 1000,
      headers,
      payload:
        typeof rawPayload === 'string'
          ? rawPayload
          : JSON.stringify(rawPayload),
    };

    const url = `${baseUrl}/github_webhook_entries.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(entry),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.log(
        `Failed to push webhook entry to Firebase: ${res.status} ${body}`
      );
      return false;
    }

    return true;
  } catch (err) {
    console.log('Error during pushGithubWebhookEntry:', err);
    return false;
  }
}

export async function cleanupGithubExpiredEntries() {
  try {
    const { token } = await getFirebaseAccessToken();
    const baseUrl =
      sanitizeDbUrl(FIREBASE_DATABASE_URL) ||
      sanitizeDbUrl(`https://${FIREBASE_PROJECT_ID}.firebaseio.com`);
    const now = Date.now();

    const queryUrl = `${baseUrl}/github_webhook_entries.json?orderBy=${encodeURIComponent('"expiresAt"')}&endAt=${now}`;
    const res = await fetch(queryUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.log(
        `cleanupGithubExpiredEntries query failed ${res.status}: ${errText}`
      );
      return 0;
    }

    const data = await res.json();
    if (!data || typeof data !== 'object') return 0;

    const keys = Object.keys(data);
    if (keys.length === 0) return 0;

    const updates = {};
    for (const key of keys) {
      updates[key] = null;
    }

    const patchUrl = `${baseUrl}/github_webhook_entries.json`;
    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    return patchRes.ok ? keys.length : 0;
  } catch (err) {
    console.log('Error during cleanupGithubExpiredEntries:', err);
    return 0;
  }
}

export async function countGithubWebhookEntries(hook_id) {
  try {
    const { token } = await getFirebaseAccessToken();
    const baseUrl =
      sanitizeDbUrl(FIREBASE_DATABASE_URL) ||
      sanitizeDbUrl(`https://${FIREBASE_PROJECT_ID}.firebaseio.com`);

    // orderBy and equalTo values must be percent-encoded
    const queryUrl = `${baseUrl}/github_webhook_entries.json?orderBy=${encodeURIComponent('"hook_id"')}&equalTo=${encodeURIComponent(`"${hook_id}"`)}&shallow=true`;
    const res = await fetch(queryUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 0;

    const data = await res.json();
    if (!data || typeof data !== 'object') return 0;

    return Object.keys(data).length;
  } catch (err) {
    console.log('Error during countGithubWebhookEntries:', err);
    return 0;
  }
}
