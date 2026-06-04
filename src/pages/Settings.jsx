import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineCog,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
} from 'react-icons/hi';
import {
  SiGithub,
  SiGitlab,
  SiJira,
  SiSlack,
  SiNotion,
  SiLinear,
} from 'react-icons/si';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/session/index.js';
import toast from 'react-hot-toast';

const PLATFORM_ICONS = {
  github: SiGithub,
  gitlab: SiGitlab,
  jira: SiJira,
  slack: SiSlack,
  notion: SiNotion,
  linear: SiLinear,
};

function ActivityToggle({ activity, platformId, onToggled }) {
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(activity.is_active);

  const handleToggle = async () => {
    setLoading(true);
    const action = active ? 'remove' : 'add';
    const { ok, data, error } = await apiFetch(
      `/api/account/platforms/${platformId}/activities`,
      {
        method: 'POST',
        body: JSON.stringify({ activity_id: activity.id, action }),
      }
    );
    setLoading(false);

    if (ok) {
      setActive(!active);
      onToggled?.(activity.id, !active);
      toast.success(`Activity ${!active ? 'enabled' : 'disabled'}`);
    } else {
      toast.error(error || 'Failed to update activity');
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <div>
        <p className="text-sm font-medium capitalize text-white">
          {activity.activity_type.replace(/_/g, ' ')}
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          active ? 'bg-indigo-500' : 'bg-gray-600'
        } ${loading ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            active ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function PlatformSettings({ platform }) {
  const [expanded, setExpanded] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  const fetchActivities = async () => {
    if (fetched.current) return;
    fetched.current = true;
    setLoading(true);
    const { ok, data } = await apiFetch(
      `/api/account/platforms/${platform.id}/activities`
    );
    if (ok) {
      setActivities(data?.activities ?? []);
    }
    setLoading(false);
  };

  const handleExpand = () => {
    if (!expanded) fetchActivities();
    setExpanded(!expanded);
  };

  const Icon = PLATFORM_ICONS[platform.platform_type] || HiOutlineCog;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md"
    >
      {/* Header */}
      <button
        onClick={handleExpand}
        className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-indigo-400" />
          <div className="text-left">
            <p className="text-sm font-semibold text-white">
              {platform.title || platform.platform_type}
            </p>
            <p className="text-xs capitalize text-gray-400">
              {platform.platform_type} •{' '}
              {platform.is_connected ? (
                <span className="text-green-400">Connected</span>
              ) : (
                <span className="text-yellow-400">Disconnected</span>
              )}
            </p>
          </div>
        </div>
        {expanded ? (
          <HiOutlineChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <HiOutlineChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="border-t border-white/10 px-5 py-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Activity Visibility
          </h4>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-gray-500">No activities available.</p>
          ) : (
            <div className="space-y-2">
              {activities.map((activity) => (
                <ActivityToggle
                  key={activity.id}
                  activity={activity}
                  platformId={platform.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function Settings() {
  const { getPlatforms } = useAuth();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    (async () => {
      setLoading(true);
      const { platforms: p } = await getPlatforms();
      setPlatforms(p ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#24243e] text-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <HiOutlineCog className="h-7 w-7 text-indigo-400" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="border-3 h-8 w-8 animate-spin rounded-full border-indigo-400 border-t-transparent" />
          </div>
        ) : platforms.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-gray-400">
              No platforms found. Connect a platform first from the Dashboard.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {platforms.map((platform) => (
              <PlatformSettings key={platform.id} platform={platform} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
