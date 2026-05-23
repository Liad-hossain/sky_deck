import { useEffect, useState } from 'react';
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
} from 'react-icons/hi';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

const statCards = [
  {
    label: 'Connected Platforms',
    value: '0',
    icon: HiOutlineGlobe,
    color: 'from-indigo-500 to-blue-500',
  },
  {
    label: 'Activities Tracked',
    value: '0',
    icon: HiOutlineChartBar,
    color: 'from-purple-500 to-pink-500',
  },
  {
    label: 'AI Summaries',
    value: '0',
    icon: HiOutlineSparkles,
    color: 'from-amber-500 to-orange-500',
  },
  {
    label: 'Uptime',
    value: '—',
    icon: HiOutlineLightningBolt,
    color: 'from-emerald-500 to-teal-500',
  },
];

const platformCards = [
  {
    name: 'GitHub',
    emoji: '🐙',
    status: 'Coming soon',
    color: 'border-gray-600',
  },
  {
    name: 'Jira',
    emoji: '📋',
    status: 'Coming soon',
    color: 'border-blue-600',
  },
  {
    name: 'Slack',
    emoji: '💬',
    status: 'Coming soon',
    color: 'border-green-600',
  },
];

export default function Dashboard() {
  const { user, getProfile } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    getProfile().then(({ profile: p }) => p && setProfile(p));
  }, []);

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
            {statCards.map((card) => (
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

          {/* Platforms */}
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="mb-4 text-xl font-bold text-white">Platforms</h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {platformCards.map((platform) => (
                <motion.div
                  key={platform.name}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={`glass rounded-2xl border-t-2 p-6 text-center ${platform.color} cursor-default`}
                >
                  <div className="mb-3 text-4xl">{platform.emoji}</div>
                  <h4 className="text-lg font-semibold text-white">
                    {platform.name}
                  </h4>
                  <span className="mt-2 inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400">
                    {platform.status}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.section>

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
