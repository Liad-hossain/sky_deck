import crypto from 'crypto';

async function getFirebaseAccessToken() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase service account environment variables');
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
    scope: 'https://www.googleapis.com/auth/firebase.database',
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
  return { token: data.access_token, projectId };
}

export async function pushWebhookEntry(rawPayload, headers = {}) {
  const dbUrl = process.env.FIREBASE_DATABASE_URL; // optional override
  const { token, projectId } = await getFirebaseAccessToken();
  const baseUrl = dbUrl || `https://${projectId}.firebaseio.com`;
  const event = headers['X-GitHub-Event'] || 'unknown';

  const entry = {
    timestamp: new Date().toISOString(),
    headers,
    payload:
      typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload),
  };

  const url = `${baseUrl.replace(/\/$/, '')}/github_webhooks/${event}.json?auth=${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
}
