import {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} from '../api/env_variables';

// ── Token cache ──────────────────────────────────────────────────────────────
let cachedToken = null;
let tokenExpiresAt = 0; // epoch ms

export async function getFirestoreClient() {
  const projectId = FIREBASE_PROJECT_ID;
  const clientEmail = FIREBASE_CLIENT_EMAIL;

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return { token: cachedToken, projectId };
  }

  let privateKey = FIREBASE_PRIVATE_KEY || '';
  // Key is base64-encoded in CI — decode if it doesn't look like a PEM.
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
    scope: 'https://www.googleapis.com/auth/datastore',
  };

  const b64url = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const signingInput = `${b64url(header)}.${b64url(claims)}`;

  // Strip PEM headers and decode
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const keyBuffer = Buffer.from(keyData, 'base64');

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(signingInput)
  );

  const signature = Buffer.from(signatureBuffer)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signingInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in ?? 0) * 1000;

  return { token: cachedToken, projectId };
}
