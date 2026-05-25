import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('Client bundle starting — initializing error overlay');

function ensureErrorOverlay() {
  if (document.getElementById('error-overlay')) return;
  const el = document.createElement('div');
  el.id = 'error-overlay';
  el.style.position = 'fixed';
  el.style.left = '12px';
  el.style.right = '12px';
  el.style.bottom = '12px';
  el.style.zIndex = 99999;
  el.style.background = 'rgba(10,10,10,0.9)';
  el.style.color = 'white';
  el.style.padding = '12px';
  el.style.borderRadius = '8px';
  el.style.fontFamily = 'monospace';
  el.style.fontSize = '12px';
  el.style.maxHeight = '40vh';
  el.style.overflow = 'auto';
  el.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)';
  document.body && document.body.appendChild(el);
}

function showOverlayMessage(msg) {
  try {
    ensureErrorOverlay();
    const el = document.getElementById('error-overlay');
    if (!el) return;
    const now = new Date().toISOString();
    el.innerText = `${now}\n${msg}`;
  } catch (e) {
    // ignore
  }
}

window.addEventListener('error', (ev) => {
  console.error('Unhandled error', ev.error || ev.message, ev);
  showOverlayMessage(String(ev.error || ev.message || ev));
});

window.addEventListener('unhandledrejection', (ev) => {
  console.error('Unhandled rejection', ev.reason);
  showOverlayMessage(String(ev.reason || ev));
});

(async function bootstrap() {
  try {
    try {
      const s = document.getElementById('client-status');
      if (s) s.innerText = 'Starting app...';
    } catch (e) {}
    await import('./index.css');
    const [{ default: App }, { default: ErrorBoundary }] = await Promise.all([
      import('./App'),
      import('./components/ErrorBoundary'),
    ]);

    try {
      const sup = await import('./lib/supabase');
      const s = document.getElementById('client-status');
      if (s) {
        if (!sup.isSupabaseConfigured) {
          s.innerText = `Supabase not configured — ${sup.supabaseConfigError}`;
        }
      }
    } catch (e) {
      console.error('Could not import supabase module', e);
    }

    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    try {
      const s = document.getElementById('client-status');
      if (s) s.style.display = 'none';
    } catch (e) {}
  } catch (err) {
    console.error('Failed to bootstrap app', err);
    showOverlayMessage(String(err && (err.stack || err.message || err)));
    try {
      const s = document.getElementById('client-status');
      if (s) s.innerText = 'Client error — open console';
    } catch (e) {}
  }
})();
