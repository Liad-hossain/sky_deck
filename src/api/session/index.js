// Frontend HTTP helper — no Supabase / no env / no DB.
// Manages session storage and Authorization header.
const KEY = 'sky-deck.session';

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  if (!session) {
    localStorage.removeItem(KEY);
    return;
  }
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

async function refreshSession() {
  const session = loadSession();
  if (!session?.refresh_token) return null;
  try {
    const res = await fetch('/api/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.data?.session) return null;
    saveSession(body.data.session);
    return body.data.session;
  } catch {
    return null;
  }
}

/**
 * Authenticated fetch. Auto-refreshes session on 401 once.
 * Returns { ok, status, data, error }.
 */
export async function apiFetch(path, options = {}) {
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  let session = loadSession();

  const buildHeaders = (s) => {
    const h = new Headers(options.headers || {});
    if (!isFormData && options.body && !h.has('Content-Type'))
      h.set('Content-Type', 'application/json');
    if (s?.access_token && !h.has('Authorization'))
      h.set('Authorization', `Bearer ${s.access_token}`);
    return h;
  };

  let res = await fetch(path, { ...options, headers: buildHeaders(session) });

  if (res.status === 401 && session?.refresh_token) {
    const fresh = await refreshSession();
    if (fresh) {
      res = await fetch(path, { ...options, headers: buildHeaders(fresh) });
    }
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* not JSON */
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      data,
      error: data?.error ?? `Request failed (${res.status})`,
    };
  }
  return { ok: true, status: res.status, data, error: null };
}
