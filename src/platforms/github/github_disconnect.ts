/**
 * supabase/functions/github-disconnect.ts
 *
 * Supabase Edge Function — GitHub disconnect
 *
 * Called when a user disconnects GitHub from Sky Deck.
 * 1. Verifies the Sky Deck JWT
 * 2. Loads the stored access_token from the platforms row
 * 3. Revokes the token with GitHub so no further webhooks arrive
 * 4. Sets is_connected = false, clears tokens in DB
 *
 * Deploy:
 *   npx supabase functions deploy github-disconnect --no-verify-jwt
 *
 * Required secrets:
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 *   SUPABASE_URL              (auto-injected)
 *   SUPABASE_SERVICE_ROLE_KEY (auto-injected)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // ── 1. Verify Sky Deck JWT ────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return error(401, 'Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const jwt = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: jwtError,
    } = await supabase.auth.getUser(jwt);
    if (jwtError || !user) {
      return error(401, 'Invalid or expired session');
    }

    // ── 2. Load the platform row to get the stored token ─────
    const { data: platform, error: fetchError } = await supabase
      .from('platforms')
      .select('access_token, primary_id, is_connected')
      .eq('user_id', user.id)
      .eq('platform_type', 'github')
      .maybeSingle();

    if (fetchError) {
      return error(500, `DB error: ${fetchError.message}`);
    }

    if (!platform) {
      return error(404, 'GitHub integration not found');
    }

    if (!platform.is_connected) {
      return error(400, 'GitHub is already disconnected');
    }

    // ── 3. Revoke the GitHub token ────────────────────────────
    // DELETE /applications/{client_id}/token revokes the OAuth token
    // This stops GitHub from sending further webhooks for this installation
    if (platform.access_token) {
      const clientId = Deno.env.get('GITHUB_CLIENT_ID')!;
      const clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET')!;
      const credentials = btoa(`${clientId}:${clientSecret}`);

      await fetch(`https://api.github.com/applications/${clientId}/token`, {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'SkyDeck',
        },
        body: JSON.stringify({ access_token: platform.access_token }),
      });
      // We ignore revocation errors — even if GitHub fails we still disconnect locally
    }

    // ── 4. Update DB — mark disconnected, clear tokens ───────
    const { error: updateError } = await supabase
      .from('platforms')
      .update({
        is_connected: false,
        disconnected_at: new Date().toISOString(),
        access_token: null,
        refresh_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('platform_type', 'github');

    if (updateError) {
      return error(500, `Failed to update DB: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ disconnected: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : 'Internal server error');
  }
});

function error(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
