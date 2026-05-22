import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlineClock,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineCamera,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, getProfile, updateProfile, uploadAvatar } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Load profile on mount
  useEffect(() => {
    (async () => {
      const { profile: p, error } = await getProfile();
      if (error) toast.error('Could not load profile');
      else {
        setProfile(p);
        setFullName(p?.full_name ?? '');
        setAvatarPreview(p?.avatar_url ?? null);
      }
      setLoadingProfile(false);
    })();
  }, []);

  // ── Full name save ─────────────────────────────────────────
  const handleSaveName = async () => {
    setSavingName(true);
    const { error } = await updateProfile({ full_name: fullName.trim() });
    setSavingName(false);
    if (error) {
      toast.error(error.message);
    } else {
      setProfile((p) => ({ ...p, full_name: fullName.trim() }));
      setEditingName(false);
      toast.success('Name updated!');
    }
  };

  const handleCancelName = () => {
    setFullName(profile?.full_name ?? '');
    setEditingName(false);
  };

  // ── Avatar upload ──────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    setUploadingAvatar(true);
    const { url, error: uploadError } = await uploadAvatar(file);
    if (uploadError) {
      toast.error('Avatar upload failed');
      setAvatarPreview(profile?.avatar_url ?? null);
      setUploadingAvatar(false);
      return;
    }

    const { error: saveError } = await updateProfile({ avatar_url: url });
    setUploadingAvatar(false);
    if (saveError) {
      toast.error(saveError.message);
    } else {
      setProfile((p) => ({ ...p, avatar_url: url }));
      setAvatarPreview(url);
      toast.success('Avatar updated!');
      window.dispatchEvent(new Event('avatar-updated'));
    }
  };

  const joinedAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  return (
    <div className="min-h-screen pb-16">
      {/* Orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 animate-pulse rounded-full bg-pink-600/20 blur-3xl" />
        <div className="absolute -left-40 bottom-0 h-80 w-80 animate-pulse rounded-full bg-indigo-600/20 blur-3xl delay-1000" />
      </div>

      <Navbar />

      <main className="mx-auto mt-10 max-w-3xl space-y-6 px-6">
        {/* Page title */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1 className="text-2xl font-bold text-white">Your Profile</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage your account details and avatar.
          </p>
        </motion.div>

        {loadingProfile ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* ── Avatar card ───────────────────────────────── */}
            <motion.section
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="glass flex flex-col items-center gap-8 rounded-2xl p-8 sm:flex-row"
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-4xl font-bold text-white shadow-xl shadow-indigo-500/20 ring-4 ring-white/10">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (user?.email?.[0]?.toUpperCase() ?? '?')
                  )}
                </div>

                {/* Upload overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-white shadow-lg transition hover:scale-110 disabled:opacity-50"
                  title="Upload new avatar"
                >
                  {uploadingAvatar ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <HiOutlineCamera className="text-base" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Info */}
              <div className="flex-1 space-y-1 text-center sm:text-left">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                  Profile picture
                </p>
                <p className="text-lg font-semibold text-white">
                  {profile?.full_name ||
                    user?.email?.split('@')[0] ||
                    'No name set'}
                </p>
                <p className="text-sm text-gray-400">{user?.email}</p>
                <p className="mt-1 text-xs text-gray-600">
                  JPG, PNG, WebP or GIF · Max 2 MB
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-indigo-500/50 hover:text-white disabled:opacity-40"
                >
                  {uploadingAvatar ? 'Uploading…' : 'Change avatar'}
                </motion.button>
              </div>
            </motion.section>

            {/* ── Details card ──────────────────────────────── */}
            <motion.section
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="glass divide-y divide-white/5 rounded-2xl"
            >
              {/* Full name row */}
              <div className="flex items-center gap-4 px-6 py-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15">
                  <HiOutlineUser className="text-lg text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                    Full name
                  </p>
                  <AnimatePresence mode="wait">
                    {editingName ? (
                      <motion.div
                        key="edit"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="flex items-center gap-2"
                      >
                        <input
                          autoFocus
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName();
                            if (e.key === 'Escape') handleCancelName();
                          }}
                          placeholder="Enter your full name"
                          className="flex-1 rounded-xl border border-indigo-500/40 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={handleSaveName}
                          disabled={savingName}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 transition hover:bg-emerald-500/30 disabled:opacity-50"
                        >
                          {savingName ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                          ) : (
                            <HiOutlineCheck className="text-base" />
                          )}
                        </button>
                        <button
                          onClick={handleCancelName}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
                        >
                          <HiOutlineX className="text-base" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.p
                        key="display"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="truncate text-sm text-white"
                      >
                        {profile?.full_name || (
                          <span className="italic text-gray-500">Not set</span>
                        )}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                {!editingName && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white"
                    title="Edit name"
                  >
                    <HiOutlinePencil className="text-sm" />
                  </button>
                )}
              </div>

              {/* Email row */}
              <div className="flex items-center gap-4 px-6 py-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/15">
                  <HiOutlineMail className="text-lg text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                    Email address
                  </p>
                  <p className="truncate text-sm text-white">{user?.email}</p>
                </div>
                <span className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                  Verified
                </span>
              </div>

              {/* Member since */}
              <div className="flex items-center gap-4 px-6 py-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-500/15">
                  <HiOutlineClock className="text-lg text-pink-400" />
                </div>
                <div className="flex-1">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                    Member since
                  </p>
                  <p className="text-sm text-white">{joinedAt}</p>
                </div>
              </div>

              {/* Account status */}
              <div className="flex items-center gap-4 px-6 py-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                  <HiOutlineShieldCheck className="text-lg text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                    Account status
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    <p className="text-sm font-medium capitalize text-emerald-400">
                      {profile?.status ?? 'Active'}
                    </p>
                  </div>
                </div>
              </div>

              {/* User ID */}
              <div className="flex items-center gap-4 px-6 py-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                  <HiOutlineShieldCheck className="text-lg text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                    User ID
                  </p>
                  <p className="truncate font-mono text-xs text-gray-400">
                    {user?.id}
                  </p>
                </div>
              </div>
            </motion.section>
          </>
        )}
      </main>
    </div>
  );
}
