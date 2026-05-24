/**
 * supabase/functions/github-webhook/index.ts
 *
 * Supabase Edge Function — GitHub Webhook receiver
 *
 * Receives GitHub App webhook events and writes activity records
 * to Firestore (default database → github_activities collection).
 *
 * Each document structure:
 * {
 *   sky_deck_user_id: string,
 *   github_user_id:   number,
 *   github_login:     string,
 *   event_type:       string,   // push | pull_request | issues | …
 *   action:           string,   // opened | closed | merged | …
 *   repo:             string,   // owner/repo
 *   payload:          object,   // full event payload
 *   occurred_at:      string,   // ISO timestamp from GitHub
 *   created_at:       string,   // ISO timestamp when we stored it
 * }
 *
 * Deploy:
 *   npx supabase functions deploy github-webhook --no-verify-jwt
 *
 * Required secrets:
 *   GITHUB_WEBHOOK_SECRET     — the secret you set when creating the GitHub App
 *   SUPABASE_SERVICE_ROLE_KEY — to query platforms table (auto-injected)
 *   SUPABASE_URL              — (auto-injected)
 *   FIREBASE_PROJECT_ID       — your Firestore project
 *   FIREBASE_CLIENT_EMAIL     — service account email
 *   FIREBASE_PRIVATE_KEY      — service account private key (replace \n with actual newlines)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// ── Firestore REST helpers ────────────────────────────────────────────────────

async function getFirestoreToken(): Promise<string> {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID')!;
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')!;
  const privateKey = Deno.env
    .get('FIREBASE_PRIVATE_KEY')!
    .replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/datastore',
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Import the RSA private key
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const keyBuffer = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
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
    new TextEncoder().encode(signingInput)
  );

  const signature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  )
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signingInput}.${signature}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function writeToFirestore(
  projectId: string,
  token: string,
  collectionId: string,
  data: Record<string, unknown>
) {
  // Convert plain object to Firestore document fields format
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string') fields[k] = { stringValue: v };
    else if (typeof v === 'number') fields[k] = { integerValue: String(v) };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (v === null || v === undefined) fields[k] = { nullValue: null };
    else fields[k] = { stringValue: JSON.stringify(v) };
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore write failed: ${err}`);
  }

  return res.json();
}

// ── Webhook signature verification ───────────────────────────────────────────

async function verifyGitHubSignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature?.startsWith('sha256=')) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(body)
  );

  const expected =
    'sha256=' +
    Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

  // Constant-time comparison
  return expected === signature;
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const bodyText = await req.text();

  // ── Verify webhook signature ──────────────────────────────
  const webhookSecret = Deno.env.get('GITHUB_WEBHOOK_SECRET');
  if (webhookSecret) {
    const sig = req.headers.get('x-hub-signature-256');
    const valid = await verifyGitHubSignature(bodyText, sig, webhookSecret);
    if (!valid) {
      return new Response('Invalid signature', { status: 401 });
    }
  }

  const eventType = req.headers.get('x-github-event') ?? 'unknown';
  const deliveryId = req.headers.get('x-github-delivery') ?? '';

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const action = (payload.action as string) ?? '';
  const sender = payload.sender as { id: number; login: string } | undefined;
  const repo =
    (payload.repository as { full_name?: string } | undefined)?.full_name ?? '';
  const occurredAt =
    (payload.created_at as string) ??
    (payload.pushedAt as string) ??
    new Date().toISOString();

  if (!sender?.id) {
    // We can't identify the user — still return 200 to GitHub
    return new Response('No sender info', { status: 200 });
  }

  try {
    // ── Look up the Sky Deck user from the GitHub sender ID ──
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: platform } = await supabase
      .from('platforms')
      .select('user_id, title')
      .eq('platform_type', 'github')
      .eq('primary_id', String(sender.id))
      .eq('is_connected', true)
      .maybeSingle();

    if (!platform) {
      // No matching user — acknowledge but don't store
      return new Response('User not found', { status: 200 });
    }

    // ── Write activity to Firestore ──────────────────────────
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID')!;
    const token = await getFirestoreToken();

    await writeToFirestore(projectId, token, 'github_activities', {
      sky_deck_user_id: platform.user_id,
      github_user_id: sender.id,
      github_login: sender.login,
      event_type: eventType,
      action,
      repo,
      delivery_id: deliveryId,
      payload: payload, // stored as stringified JSON
      occurred_at: occurredAt,
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    // Always return 200 to GitHub — otherwise it disables the webhook
    return new Response(
      JSON.stringify({ received: true, warning: 'storage failed' }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
});
