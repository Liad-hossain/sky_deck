import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiGithub } from 'react-icons/si';
import {
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineRefresh,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { exchangeGitHubCode } from '../integrations/github/index.js';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function GitHubCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [githubUser, setGithubUser] = useState(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const installationId = searchParams.get('installation_id'); // from GitHub App install
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setStatus('error');
      setMessage(
        errorParam === 'access_denied'
          ? 'You cancelled the GitHub authorization.'
          : `GitHub returned an error: ${errorParam}`
      );
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('Invalid callback — missing authorization code.');
      return;
    }

    if (!user) return; // wait for auth to load

    async function complete() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setStatus('error');
          setMessage('Your session expired. Please sign in again.');
          return;
        }

        // Start the exchange in background (sendBeacon / fire-and-forget).
        // We don't await it so the browser and GitHub callback flow can finish
        // immediately and avoid GitHub retrying the callback.
        exchangeGitHubCode(code, installationId, session.access_token).catch(
          () => {}
        );

        // Show success immediately — the background worker will complete the
        // server-side work. We don't rely on githubUser payload here.
        setStatus('success');
        toast.success('GitHub connection in progress.');

        setTimeout(() => navigate('/dashboard'), 1500);
      } catch (e) {
        setStatus('error');
        setMessage(e.message ?? 'Something went wrong.');
      }
    }

    complete();
  }, [user]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 animate-pulse rounded-full bg-gray-600/20 blur-3xl" />
        <div className="absolute -left-40 top-1/2 h-80 w-80 animate-pulse rounded-full bg-indigo-600/20 blur-3xl delay-1000" />
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass w-full max-w-md rounded-3xl p-8 text-center"
      >
        {/* GitHub icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 shadow-lg">
          <SiGithub className="text-3xl text-white" />
        </div>

        {status === 'loading' && (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
            <h2 className="text-lg font-semibold text-white">
              Connecting GitHub…
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Exchanging authorization code. Please wait.
            </p>
          </>
        )}

        {status === 'success' && githubUser && (
          <>
            <HiOutlineCheckCircle className="mx-auto mb-3 text-5xl text-emerald-400" />
            <h2 className="text-xl font-bold text-white">GitHub Connected!</h2>
            <p className="mt-1 text-sm text-gray-400">
              Signed in as{' '}
              <span className="font-medium text-white">
                @{githubUser.login}
              </span>
            </p>
            {githubUser.avatar_url && (
              <img
                src={githubUser.avatar_url}
                alt={githubUser.login}
                className="mx-auto mt-4 h-14 w-14 rounded-full ring-2 ring-emerald-500/40"
              />
            )}
            <p className="mt-4 text-xs text-gray-500">
              Redirecting to GitHub App installation…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <HiOutlineXCircle className="mx-auto mb-3 text-5xl text-red-400" />
            <h2 className="text-xl font-bold text-white">Connection Failed</h2>
            <p className="mt-2 text-sm text-gray-400">{message}</p>
            <div className="mt-6 flex flex-col gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/integrations')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition hover:text-white"
              >
                <HiOutlineRefresh />
                Try Again
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
