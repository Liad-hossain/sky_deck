import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlineClock,
  HiOutlineGlobe,
  HiOutlineSparkles,
  HiOutlineChartBar,
  HiOutlineLightningBolt,
  HiOutlinePencil,
  HiOutlineLink,
} from 'react-icons/hi';
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
import Navbar from '../components/Navbar';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};
const PLATFORM_META = {
  github: {
    icon: SiGithub,
    iconColor: 'text-white',
    bg: 'from-gray-700 to-gray-900',
    border: 'border-gray-500/40',
  },
  gitlab: {
    icon: SiGitlab,
    iconColor: 'text-orange-400',
    bg: 'from-orange-900/40 to-gray-900',
    border: 'border-orange-500/40',
  },
  jira: {
    icon: SiJira,
    iconColor: 'text-blue-400',
    bg: 'from-blue-900/40 to-gray-900',
    border: 'border-blue-500/40',
  },
  slack: {
    icon: SiSlack,
    iconColor: 'text-green-400',
    bg: 'from-green-900/40 to-gray-900',
    border: 'border-green-500/40',
  },
  notion: {
    icon: SiNotion,
    iconColor: 'text-white',
    bg: 'from-neutral-700 to-gray-900',
    border: 'border-neutral-500/40',
  },
  linear: {
    icon: SiLinear,
    iconColor: 'text-violet-400',
    bg: 'from-violet-900/40 to-gray-900',
    border: 'border-violet-500/40',
  },
  trello: {
    icon: SiTrello,
    iconColor: 'text-sky-400',
    bg: 'from-sky-900/40 to-gray-900',
    border: 'border-sky-500/40',
  },
  figma: {
    icon: SiFigma,
    iconColor: 'text-pink-400',
    bg: 'from-pink-900/40 to-gray-900',
    border: 'border-pink-500/40',
  },
  asana: {
    icon: SiAsana,
    iconColor: 'text-rose-400',
    bg: 'from-rose-900/40 to-gray-900',
    border: 'border-rose-500/40',
  },
  discord: {
    icon: SiDiscord,
    iconColor: 'text-indigo-400',
    bg: 'from-indigo-900/40 to-gray-900',
    border: 'border-indigo-500/40',
  },
};

export default function Dashboard() {
  const {
    user,
    updatePlatformTitle,
    disconnectPlatformById,
    deletePlatformById,
    connectPlatform,
  } = useAuth();
  const [profile, setProfile] = useState(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [menuOpenFor, setMenuOpenFor] = useState(null); // platform id
  const menuRefMap = useRef({});
  const menuDropdownRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);
  const menuOpenTimeoutRef = useRef(null);
  const [editModal, setEditModal] = useState(null); // { id, title }
  const [confirmModal, setConfirmModal] = useState(null); // { mode: 'disconnect'|'delete', id }
  const [busy, setBusy] = useState(false);
  // ...useAuth functions are already destructured above

  function ConfirmInput({ onConfirm, onCancel, busy }) {
    const [input, setInput] = useState('');
    return (
      <div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
        />
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(input)}
            disabled={busy}
            className="flex-1 rounded-xl bg-amber-500/20 px-4 py-2 text-sm text-amber-400"
          >
            Confirm
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Fetch profile and platforms from server APIs
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const [profRes, platRes] = await Promise.all([
          fetch('/api/profile', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch('/api/platforms', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ]);

        const profData = await profRes.json().catch(() => ({}));
        const platData = await platRes.json().catch(() => ({}));

        setProfile(profData.profile ?? null);
        setConnectedPlatforms(platData.platforms ?? []);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error loading Dashboard data:', err);
      }
    })();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function onDocClick(ev) {
      // Close menu when clicking outside
      if (!menuOpenFor) return;
      const btn = menuRefMap.current[menuOpenFor];
      const menuEl = menuDropdownRef.current;
      // if click inside button or inside menu, ignore
      if (btn && btn.contains(ev.target)) return;
      if (menuEl && menuEl.contains(ev.target)) return;
      setMenuOpenFor(null);
      setMenuPos(null);
    }
    function onKey(ev) {
      if (ev.key === 'Escape') setMenuOpenFor(null);
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
      if (menuOpenTimeoutRef.current) {
        clearTimeout(menuOpenTimeoutRef.current);
        menuOpenTimeoutRef.current = null;
      }
    };
  }, [menuOpenFor]);

  useEffect(() => {
    // menu state changed (no-op)
  }, [menuOpenFor, menuPos]);

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  const displayName = profile?.full_name || user?.email?.split('@')[0] || '?';

  return (
    <div className="flex min-h-screen pb-12">
      {/* Floating animated orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 animate-pulse rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -left-40 top-1/2 h-80 w-80 animate-pulse rounded-full bg-pink-600/20 blur-3xl delay-1000" />
        <div className="delay-2000 absolute bottom-0 right-1/3 h-72 w-72 animate-pulse rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <Navbar />

      <main className="ml-16 flex-1 px-6 pt-8">
        <div className="mx-auto max-w-7xl">
          {/* Welcome */}
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-10"
          >
            <h2 className="text-3xl font-bold text-white">
              Welcome back, {displayName} 👋
            </h2>
            <p className="mt-1 text-gray-400">
              Here's your activity command center.
            </p>
          </motion.section>

          {/* Profile Card */}
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass mb-8 flex flex-wrap items-center gap-6 rounded-2xl p-6"
          >
            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-2xl font-bold text-white shadow-lg shadow-indigo-500/30 ring-2 ring-white/10">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                user?.email?.[0]?.toUpperCase() || '?'
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 text-white">
                <HiOutlineUser className="text-indigo-400" />
                <span className="font-medium">{displayName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <HiOutlineMail className="text-purple-400" />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <HiOutlineClock className="text-pink-400" />
                <span>Member since {createdAt}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                ● Active
              </div>
              <Link
                to="/profile"
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:border-indigo-500/50 hover:text-white"
              >
                <HiOutlinePencil className="text-sm" />
                Edit Profile
              </Link>
            </div>
          </motion.section>

          {/* Stats */}
          <motion.section
            variants={container}
            initial="hidden"
            animate="show"
            className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                label: 'Connected Platforms',
                value: connectedPlatforms.filter((p) => p.is_connected).length,
                icon: HiOutlineGlobe,
                color: 'from-indigo-500 to-blue-500',
              },
              {
                label: 'Activities Tracked',
                value: 0,
                icon: HiOutlineChartBar,
                color: 'from-purple-500 to-pink-500',
              },
              {
                label: 'AI Summaries',
                value: 0,
                icon: HiOutlineSparkles,
                color: 'from-amber-500 to-orange-500',
              },
              {
                label: 'Uptime',
                value: '—',
                icon: HiOutlineLightningBolt,
                color: 'from-emerald-500 to-teal-500',
              },
            ].map((card) => (
              <motion.div
                key={card.label}
                variants={item}
                whileHover={{ y: -4, scale: 1.02 }}
                className="glass cursor-default rounded-2xl p-5"
              >
                <div
                  className={`h-10 w-10 rounded-xl bg-gradient-to-br ${card.color} mb-3 flex items-center justify-center shadow-lg`}
                >
                  <card.icon className="text-xl text-white" />
                </div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="mt-1 text-sm text-gray-400">{card.label}</p>
              </motion.div>
            ))}
          </motion.section>

          {/* Connected Platforms */}
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                Connected Platforms
              </h3>
              <Link
                to="/integrations"
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:border-indigo-500/50 hover:text-white"
              >
                <HiOutlineLink className="text-sm" />
                Manage
              </Link>
            </div>

            {connectedPlatforms.length === 0 ? (
              <div className="glass rounded-2xl border border-dashed border-white/10 p-10 text-center">
                <p className="text-gray-400">No platforms connected yet.</p>
                <Link
                  to="/integrations"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500/20"
                >
                  <HiOutlineLink />
                  Connect a platform
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {connectedPlatforms.map((platform) => {
                  const meta = PLATFORM_META[platform.platform_type] ?? {
                    icon: HiOutlineGlobe,
                    iconColor: 'text-gray-300',
                    bg: 'from-gray-700 to-gray-900',
                    border: 'border-gray-500/40',
                  };
                  const Icon = meta.icon;
                  const displayTitle =
                    platform.title && platform.title.length > 20
                      ? `${platform.title.slice(0, 20)}…`
                      : platform.title;

                  return (
                    <motion.div
                      key={platform.id}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className={`glass rounded-2xl border p-6 ${meta.border} relative`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${meta.bg} flex-shrink-0 shadow-lg`}
                          >
                            <Icon className={`text-xl ${meta.iconColor}`} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate font-semibold text-white">
                              {displayTitle}
                            </h4>
                            <div className="truncate text-xs text-gray-400">
                              {platform.primary_id}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div
                            className={`mb-1 rounded-full px-2 py-0.5 text-xs font-medium ${platform.is_connected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}
                          >
                            {platform.is_connected
                              ? 'Connected'
                              : 'Disconnected'}
                          </div>
                          <div>
                            <button
                              type="button"
                              ref={(el) =>
                                (menuRefMap.current[platform.id] = el)
                              }
                              onPointerDown={(e) => {
                                // Prevent document click from closing immediately
                                e.preventDefault();
                                e.stopPropagation();
                                const isOpen = menuOpenFor === platform.id;
                                if (isOpen) {
                                  setMenuOpenFor(null);
                                  setMenuPos(null);
                                  return;
                                }
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                const menuWidth = 144;
                                const left = Math.max(
                                  8,
                                  rect.right + window.scrollX - menuWidth
                                );
                                const top = rect.bottom + window.scrollY + 6;
                                setMenuPos({ left, top });
                                setMenuOpenFor(platform.id);
                              }}
                              className="relative z-30 rounded-full p-1 text-gray-400 hover:text-white"
                              aria-label="Open menu"
                            >
                              ⋯
                            </button>

                            {menuOpenFor === platform.id &&
                              menuPos &&
                              typeof document !== 'undefined' &&
                              createPortal(
                                <div
                                  ref={menuDropdownRef}
                                  className="fixed z-50 w-44 rounded-md p-1 text-sm shadow-lg"
                                  style={{
                                    left: menuPos.left,
                                    top: menuPos.top,
                                    backgroundColor: '#000000',
                                    color: '#ffffff',
                                    minWidth: '180px',
                                    padding: '6px',
                                  }}
                                >
                                  <button
                                    onClick={() =>
                                      setEditModal({
                                        id: platform.id,
                                        title: platform.title,
                                      })
                                    }
                                    className="block w-full px-2 py-1 text-left text-sm text-white hover:bg-gray-800"
                                  >
                                    Edit
                                  </button>
                                  {platform.is_connected ? (
                                    <>
                                      <button
                                        onClick={() =>
                                          setConfirmModal({
                                            mode: 'disconnect',
                                            id: platform.id,
                                          })
                                        }
                                        className="block w-full px-2 py-1 text-left text-sm text-white hover:bg-gray-800"
                                      >
                                        Disconnect
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={async () => {
                                          await connectPlatform(
                                            platform.platform_type
                                          );
                                          setMenuOpenFor(null);
                                          setMenuPos(null);
                                        }}
                                        className="block w-full px-2 py-1 text-left text-sm text-white hover:bg-gray-800"
                                      >
                                        Connect
                                      </button>
                                      <button
                                        onClick={() =>
                                          setConfirmModal({
                                            mode: 'delete',
                                            id: platform.id,
                                          })
                                        }
                                        className="block w-full px-2 py-1 text-left text-sm text-white hover:bg-gray-800"
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>,
                                document.body
                              )}
                          </div>
                        </div>
                      </div>
                      {platform.is_connected && platform.connected_at && (
                        <p className="text-xs text-gray-500">
                          Connected{' '}
                          {new Date(platform.connected_at).toLocaleDateString(
                            'en-US',
                            { month: 'short', day: 'numeric', year: 'numeric' }
                          )}
                        </p>
                      )}
                      {!platform.is_connected && platform.disconnected_at && (
                        <p className="text-xs text-gray-500">
                          Disconnected{' '}
                          {new Date(
                            platform.disconnected_at
                          ).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>

          {/* Edit modal */}
          {editModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="glass w-full max-w-md rounded-2xl p-6">
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Edit platform title
                </h3>
                <input
                  value={editModal.title}
                  onChange={(e) =>
                    setEditModal({ ...editModal, title: e.target.value })
                  }
                  className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditModal(null)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!editModal.title || !editModal.title.trim()) return;
                      setBusy(true);
                      const { error } = await updatePlatformTitle(
                        editModal.id,
                        editModal.title.trim()
                      );
                      setBusy(false);
                      if (error) {
                        toast.error(
                          error.message || 'Failed to update platform'
                        );
                        return;
                      }
                      // update local state optimistically
                      setConnectedPlatforms((items) =>
                        items.map((p) =>
                          p.id === editModal.id
                            ? { ...p, title: editModal.title.trim() }
                            : p
                        )
                      );
                      toast.success('Platform updated');
                      setEditModal(null);
                    }}
                    disabled={
                      !editModal.title || !editModal.title.trim() || busy
                    }
                    className="flex-1 rounded-xl bg-indigo-500/20 px-4 py-2 text-sm text-indigo-300 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm modal for disconnect/delete */}
          {confirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="glass w-full max-w-md rounded-2xl p-6">
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {confirmModal.mode === 'delete' ? 'Delete' : 'Disconnect'}{' '}
                  platform?
                </h3>
                <p className="mb-4 text-sm text-gray-400">
                  Type{' '}
                  <span className="font-mono font-bold text-white">
                    {confirmModal.mode === 'delete' ? 'DELETE' : 'DISCONNECT'}
                  </span>{' '}
                  to confirm
                </p>
                <ConfirmInput
                  onConfirm={async (val) => {
                    if (
                      val !==
                      (confirmModal.mode === 'delete' ? 'DELETE' : 'DISCONNECT')
                    )
                      return;
                    setBusy(true);
                    try {
                      if (confirmModal.mode === 'disconnect') {
                        const { error } = await disconnectPlatformById(
                          confirmModal.id
                        );
                        if (error) throw error;
                        toast.success('Platform disconnected');
                        // optimistic update: mark platform as disconnected
                        setConnectedPlatforms((items) =>
                          items.map((p) =>
                            p.id === confirmModal.id
                              ? {
                                  ...p,
                                  is_connected: false,
                                  disconnected_at: new Date().toISOString(),
                                }
                              : p
                          )
                        );
                      } else {
                        const { error } = await deletePlatformById(
                          confirmModal.id
                        );
                        if (error) throw error;
                        toast.success('Platform deleted');
                        // optimistic update: remove platform from list
                        setConnectedPlatforms((items) =>
                          items.filter((p) => p.id !== confirmModal.id)
                        );
                      }
                    } catch (err) {
                      toast.error(err.message || 'Operation failed');
                      setBusy(false);
                      return;
                    }
                    setBusy(false);
                    setConfirmModal(null);
                  }}
                  busy={busy}
                  onCancel={() => setConfirmModal(null)}
                />
              </div>
            </div>
          )}

          {/* AI Summary Teaser */}
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="glass mt-10 rounded-2xl border border-dashed border-indigo-500/30 p-8 text-center"
          >
            <div className="mb-3 text-4xl">🤖</div>
            <h3 className="mb-2 text-xl font-bold text-white">
              AI Activity Summary
            </h3>
            <p className="mx-auto max-w-md text-gray-400">
              Connect a platform and select a date range to generate an
              AI-powered summary of your activities. Coming soon!
            </p>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
