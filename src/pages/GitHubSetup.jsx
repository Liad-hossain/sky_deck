/**
 * src/pages/GitHubSetup.jsx
 *
 * Step 8-9: GitHub App installation callback page.
 *
 * GitHub redirects here after the user installs the App with:
 *   /integrations/github/setup?installation_id=12345&setup_action=install
 *
 * This page calls storeInstallation() which POSTs to /api/platforms/github/install
 * to save the installation_id in the platforms table.
 * Once stored, webhooks (push / PR / issue / release) will start flowing.
 */

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
import { storeInstallation } from '../integrations/github/index.js';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function GitHubSetup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const installationId = searchParams.get('installation_id');
    const setupAction = searchParams.get('setup_action'); // 'install' | 'update'
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setStatus('error');
      setMessage(
        errorParam === 'access_denied'
          ? 'You cancelled the GitHub App installation.'
          : `GitHub returned an error: ${errorParam}`
      );
      return;
    }

    if (!installationId) {
      setStatus('error');
      setMessage('Invalid setup callback — missing installation_id.');
      return;
    }

    if (!user) return; // wait for auth

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

        // Step 9: Save installation_id to platforms table
        const { error } = await storeInstallation(
          installationId,
          session.access_token
        );

        if (error) {
          setStatus('error');
          setMessage(error);
          return;
        }

        setStatus('success');
        toast.success('GitHub App installed — webhooks are now active!');

        // Redirect to integrations dashboard
        setTimeout(() => navigate('/integrations'), 2000);
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
        <div className="absolute -left-40 top-1/2 h-80 w-80 animate-pulse rounded-full bg-emerald-600/20 blur-3xl delay-1000" />
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
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent" />
            <h2 className="text-lg font-semibold text-white">
              Saving installation…
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Linking your GitHub App installation. Please wait.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <HiOutlineCheckCircle className="mx-auto mb-3 text-5xl text-emerald-400" />
            <h2 className="text-xl font-bold text-white">
              GitHub App Installed!
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Webhooks are now active. Push events, pull requests, issues and
              releases will be tracked automatically.
            </p>
            <p className="mt-4 text-xs text-gray-500">
              Redirecting to integrations…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <HiOutlineXCircle className="mx-auto mb-3 text-5xl text-red-400" />
            <h2 className="text-xl font-bold text-white">
              Installation Failed
            </h2>
            <p className="mt-2 text-sm text-gray-400">{message}</p>
            <div className="mt-6 flex flex-col gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/integrations')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition hover:text-white"
              >
                <HiOutlineRefresh />
                Back to Integrations
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
