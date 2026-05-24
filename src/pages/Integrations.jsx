import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SiGithub,
  SiGitlab,
  SiJira,
  SiSlack,
  SiNotion,
  SiLinear,
  SiTrello,
  SiFigma,
  SiAsana,
  SiDiscord,
} from 'react-icons/si';
import {
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineTrash,
  HiOutlineExclamation,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  redirectToGitHubInstall,
  disconnectGitHub,
} from '../integrations/github/index.js';
import { supabase } from '../lib/supabase';

// ── Confirmation modal ────────────────────────────────────────────────────────
function ConfirmModal({ open, onClose, onConfirm, mode, platformName, busy }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const keyword = mode === 'disconnect' ? 'DISCONNECT' : 'DELETE';
  const isDelete = mode === 'delete';

  useEffect(() => {
    if (open) {
      setInput('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="glass w-full max-w-md rounded-2xl p-6"
        >
          <div className="mb-4 flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDelete ? 'bg-red-500/20' : 'bg-amber-500/20'}`}
            >
              <HiOutlineExclamation
                className={`text-xl ${isDelete ? 'text-red-400' : 'text-amber-400'}`}
              />
            </div>
            <div>
              <h3 className="font-semibold text-white">
                {isDelete ? 'Delete' : 'Disconnect'} {platformName}?
              </h3>
              <p className="text-xs text-gray-400">
                This action cannot be undone easily.
              </p>
            </div>
          </div>

          <p className="mb-4 text-sm text-gray-400">
            {isDelete
              ? `Deleting will archive this integration and remove all stored credentials. You must disconnect first before deleting.`
              : `Disconnecting will revoke the OAuth token with ${platformName} — no further webhook events will be received.`}
          </p>

          <p className="mb-2 text-xs text-gray-500">
            Type{' '}
            <span className="font-mono font-bold text-white">{keyword}</span> to
            confirm:
          </p>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder={keyword}
            className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-mono text-sm text-white placeholder-gray-600 outline-none focus:border-white/30"
          />

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-400 transition hover:text-white"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              disabled={input !== keyword || busy}
              onClick={onConfirm}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                isDelete
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
              }`}
            >
              {busy ? 'Please wait…' : isDelete ? 'Delete' : 'Disconnect'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const SUPPORTED_PLATFORMS = [
  {
    key: 'github',
    name: 'GitHub',
    description: 'Track commits, pull requests, issues and reviews.',
    icon: SiGithub,
    iconColor: 'text-white',
    bgColor: 'from-gray-700 to-gray-900',
    borderColor: 'border-gray-500/40',
    comingSoon: false,
  },
  {
    key: 'gitlab',
    name: 'GitLab',
    description: 'Monitor pipelines, merge requests and milestones.',
    icon: SiGitlab,
    iconColor: 'text-orange-400',
    bgColor: 'from-orange-900/40 to-gray-900',
    borderColor: 'border-orange-500/40',
    comingSoon: true,
  },
  {
    key: 'jira',
    name: 'Jira',
    description: 'Sync sprints, tickets and project progress.',
    icon: SiJira,
    iconColor: 'text-blue-400',
    bgColor: 'from-blue-900/40 to-gray-900',
    borderColor: 'border-blue-500/40',
    comingSoon: true,
  },
  {
    key: 'slack',
    name: 'Slack',
    description: 'Aggregate channel activity and highlight mentions.',
    icon: SiSlack,
    iconColor: 'text-green-400',
    bgColor: 'from-green-900/40 to-gray-900',
    borderColor: 'border-green-500/40',
    comingSoon: true,
  },
  {
    key: 'notion',
    name: 'Notion',
    description: 'Pull page edits, comments and database changes.',
    icon: SiNotion,
    iconColor: 'text-white',
    bgColor: 'from-neutral-700 to-gray-900',
    borderColor: 'border-neutral-500/40',
    comingSoon: true,
  },
  {
    key: 'linear',
    name: 'Linear',
    description: 'Sync issues, cycles and roadmap updates.',
    icon: SiLinear,
    iconColor: 'text-violet-400',
    bgColor: 'from-violet-900/40 to-gray-900',
    borderColor: 'border-violet-500/40',
    comingSoon: true,
  },
  {
    key: 'trello',
    name: 'Trello',
    description: 'Track board activity, card moves and due dates.',
    icon: SiTrello,
    iconColor: 'text-sky-400',
    bgColor: 'from-sky-900/40 to-gray-900',
    borderColor: 'border-sky-500/40',
    comingSoon: true,
  },
  {
    key: 'figma',
    name: 'Figma',
    description: 'Monitor design file changes and comments.',
    icon: SiFigma,
    iconColor: 'text-pink-400',
    bgColor: 'from-pink-900/40 to-gray-900',
    borderColor: 'border-pink-500/40',
    comingSoon: true,
  },
  {
    key: 'asana',
    name: 'Asana',
    description: 'Aggregate task completions, projects and timelines.',
    icon: SiAsana,
    iconColor: 'text-rose-400',
    bgColor: 'from-rose-900/40 to-gray-900',
    borderColor: 'border-rose-500/40',
    comingSoon: true,
  },
  {
    key: 'discord',
    name: 'Discord',
    description: 'Capture server activity and channel messages.',
    icon: SiDiscord,
    iconColor: 'text-indigo-400',
    bgColor: 'from-indigo-900/40 to-gray-900',
    borderColor: 'border-indigo-500/40',
    comingSoon: true,
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { y: 16, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

export default function Integrations() {
  const { getPlatforms, deletePlatform, user } = useAuth();
  const [connected, setConnected] = useState({}); // { platform_type: row }
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Modal state
  const [modal, setModal] = useState(null); // { mode: 'disconnect'|'delete', platform }

  const load = async () => {
    setLoading(true);
    const { platforms } = await getPlatforms();
    const map = {};
    platforms.forEach((p) => (map[p.platform_type] = p));
    setConnected(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleConnect = async (platform) => {
    if (platform.key === 'github') {
      redirectToGitHubInstall(); // opens in new tab
      return;
    }
    toast(`${platform.name} integration coming soon!`);
  };

  const handleDisconnectConfirm = async () => {
    const platform = modal.platform;
    setBusy(true);
    try {
      // For GitHub: call Edge Function to revoke token + update DB
      if (platform.key === 'github') {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const { error } = await disconnectGitHub(session.access_token);
        if (error) {
          toast.error(error);
          return;
        }
      }
      // For other platforms (future): add their revocation here
      toast.success(`${platform.name} disconnected`);
      setModal(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const platform = modal.platform;
    const row = connected[platform.key];

    if (row?.is_connected) {
      toast.error('Please disconnect before deleting.');
      setModal(null);
      return;
    }

    setBusy(true);
    try {
      const { error } = await deletePlatform(platform.key);
      if (error) {
        toast.error(`Failed to delete: ${error.message}`);
        return;
      }
      toast.success(`${platform.name} deleted`);
      setModal(null);
      await load();
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="flex min-h-screen pb-12">
        {/* Orbs */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-40 -top-40 h-96 w-96 animate-pulse rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute -left-40 top-1/3 h-80 w-80 animate-pulse rounded-full bg-indigo-600/20 blur-3xl delay-1000" />
        </div>

        <Navbar />

        <main className="ml-16 flex-1 px-6 pt-8">
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold text-white">Integrations</h1>
              <p className="mt-1 text-gray-400">
                Connect your tools to start tracking activity across platforms.
              </p>
            </motion.div>

            {/* Platform grid */}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
              </div>
            ) : (
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {SUPPORTED_PLATFORMS.map((platform) => {
                  const row = connected[platform.key];
                  const isConnected = !!row?.is_connected;
                  // Row exists in DB but is_connected=false → disconnected (can delete)
                  const hasRow = !!row;
                  const Icon = platform.icon;

                  return (
                    <motion.div
                      key={platform.key}
                      variants={item}
                      whileHover={{ y: -4 }}
                      className={`glass rounded-2xl border p-6 transition ${platform.borderColor} ${platform.comingSoon ? 'opacity-60' : ''}`}
                    >
                      {/* Icon + status badge */}
                      <div className="mb-4 flex items-start justify-between">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${platform.bgColor} shadow-lg`}
                        >
                          <Icon className={`text-2xl ${platform.iconColor}`} />
                        </div>
                        {platform.comingSoon ? (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
                            Coming Soon
                          </span>
                        ) : isConnected ? (
                          <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                            <HiOutlineCheckCircle className="text-sm" />
                            Connected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-500">
                            <HiOutlineXCircle className="text-sm" />
                            Not connected
                          </span>
                        )}
                      </div>

                      <h3 className="mb-1 text-base font-semibold text-white">
                        {platform.name}
                      </h3>
                      <p className="mb-5 text-sm leading-relaxed text-gray-400">
                        {platform.description}
                      </p>

                      {/* Connected-at info */}
                      {!platform.comingSoon &&
                        isConnected &&
                        row?.connected_at && (
                          <p className="mb-3 text-xs text-gray-500">
                            Since{' '}
                            {new Date(row.connected_at).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }
                            )}
                          </p>
                        )}

                      {platform.comingSoon ? (
                        <div className="w-full cursor-not-allowed rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-center text-sm font-medium text-gray-600">
                          Not available yet
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {/* Connect / Disconnect button */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            disabled={busy}
                            onClick={() =>
                              isConnected
                                ? setModal({ mode: 'disconnect', platform })
                                : handleConnect(platform)
                            }
                            className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                              isConnected
                                ? 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                : 'border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20'
                            }`}
                          >
                            {isConnected ? 'Disconnect' : 'Connect'}
                          </motion.button>

                          {/* Delete button — only shown when row exists in DB */}
                          {hasRow && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              disabled={busy || isConnected}
                              title={
                                isConnected
                                  ? 'Disconnect first before deleting'
                                  : 'Delete integration record'
                              }
                              onClick={() =>
                                setModal({ mode: 'delete', platform })
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-500 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <HiOutlineTrash className="text-base" />
                            </motion.button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </main>
      </div>

      {/* Confirmation modal */}
      <AnimatePresence>
        {modal && (
          <ConfirmModal
            open={!!modal}
            mode={modal.mode}
            platformName={modal.platform.name}
            busy={busy}
            onClose={() => setModal(null)}
            onConfirm={
              modal.mode === 'disconnect'
                ? handleDisconnectConfirm
                : handleDeleteConfirm
            }
          />
        )}
      </AnimatePresence>
    </>
  );
}
