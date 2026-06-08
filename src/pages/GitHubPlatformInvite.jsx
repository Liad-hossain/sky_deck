import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiGithub } from 'react-icons/si';
import {
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineRefresh,
} from 'react-icons/hi';
import { apiFetch } from '../api/session';

export default function GitHubPlatformInvite() {
  const { platformId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const started = useRef(false);

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('Preparing invite flow...');

  const redirectUri = useMemo(() => {
    if (!platformId) return '';
    return `${window.location.origin}/github/${platformId}/invite`;
  }, [platformId]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const oauthError = searchParams.get('error');
    if (oauthError) {
      setStatus('error');
      setMessage(
        oauthError === 'access_denied'
          ? 'GitHub login was cancelled.'
          : `GitHub returned an error: ${oauthError}`
      );
      return;
    }

    const code = searchParams.get('code');
    if (!code) {
      // Start GitHub OAuth login for this page.
      const url = `/api/platforms/github/oauth-login-redirect?redirect_uri=${encodeURIComponent(
        redirectUri
      )}`;
      window.location.href = url;
      return;
    }

    (async () => {
      try {
        setMessage('Verifying your GitHub account...');
        const userResp = await apiFetch('/api/platforms/github/oauth-user', {
          method: 'POST',
          body: JSON.stringify({ code, redirect_uri: redirectUri }),
        });

        if (!userResp.ok || !userResp.data?.github_user_id) {
          setStatus('error');
          setMessage(userResp.error ?? 'Could not resolve GitHub user id.');
          return;
        }

        setMessage('Linking you to the platform...');
        const inviteResp = await apiFetch(
          `/api/account/platforms/${platformId}/invite`,
          {
            method: 'POST',
            body: JSON.stringify({
              github_user_id: userResp.data.github_user_id,
              github_login: userResp.data.github_login,
            }),
          }
        );

        if (!inviteResp.ok) {
          setStatus('error');
          setMessage(inviteResp.error ?? 'Invite linking failed.');
          return;
        }

        setStatus('success');
        setMessage('You have been added to this GitHub platform.');
        setTimeout(() => navigate('/integrations'), 1500);
      } catch (e) {
        setStatus('error');
        setMessage(e?.message ?? 'Something went wrong.');
      }
    })();
  }, [navigate, platformId, redirectUri, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 animate-pulse rounded-full bg-gray-600/20 blur-3xl" />
        <div className="absolute -left-40 top-1/2 h-80 w-80 animate-pulse rounded-full bg-indigo-600/20 blur-3xl delay-1000" />
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass w-full max-w-md rounded-3xl p-8 text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 shadow-lg">
          <SiGithub className="text-3xl text-white" />
        </div>

        {status === 'loading' && (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
            <h2 className="text-lg font-semibold text-white">
              Processing invite…
            </h2>
            <p className="mt-1 text-sm text-gray-400">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <HiOutlineCheckCircle className="mx-auto mb-3 text-5xl text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Invite accepted</h2>
            <p className="mt-2 text-sm text-gray-400">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <HiOutlineXCircle className="mx-auto mb-3 text-5xl text-red-400" />
            <h2 className="text-xl font-bold text-white">Invite failed</h2>
            <p className="mt-2 text-sm text-gray-400">{message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 hover:text-white"
            >
              <HiOutlineRefresh /> Retry
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
