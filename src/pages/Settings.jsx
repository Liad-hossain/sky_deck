import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineCog,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineCode,
  HiOutlineDocumentText,
  HiOutlineTag,
  HiOutlineBell,
  HiOutlineChevronRight,
  HiOutlineInformationCircle,
  HiOutlineDotsVertical,
  HiOutlineMail,
  HiOutlineUserGroup,
  HiOutlineSearch,
  HiOutlineLockClosed,
} from 'react-icons/hi';
import {
  SiGithub,
  SiGitlab,
  SiJira,
  SiSlack,
  SiNotion,
  SiLinear,
} from 'react-icons/si';
import { Link } from 'react-router-dom';
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

const PLATFORM_COLORS = {
  github: 'from-gray-600 to-gray-900',
  gitlab: 'from-orange-500 to-red-600',
  jira: 'from-blue-500 to-blue-700',
  slack: 'from-purple-500 to-indigo-600',
  notion: 'from-gray-700 to-gray-900',
  linear: 'from-violet-500 to-purple-700',
};

const ACTIVITY_META = {
  PULL_REQUEST: {
    label: 'Pull Requests',
    description:
      'Track when pull requests are opened, merged, closed, or reopened across your connected repositories.',
    icon: HiOutlineCode,
    color: 'indigo',
    subtypes: ['PR_OPENED', 'PR_MERGED', 'PR_CLOSED', 'PR_REOPENED'],
    subLabels: {
      PR_OPENED: 'Opened',
      PR_MERGED: 'Merged',
      PR_CLOSED: 'Closed',
      PR_REOPENED: 'Reopened',
    },
    subColors: {
      PR_OPENED: 'emerald',
      PR_MERGED: 'purple',
      PR_CLOSED: 'red',
      PR_REOPENED: 'amber',
    },
  },
  ISSUE: {
    label: 'Issues',
    description:
      'Monitor issue creation, assignment, labeling, and resolution in your repositories.',
    icon: HiOutlineDocumentText,
    color: 'amber',
    subtypes: ['ISSUE_OPENED', 'ISSUE_CLOSED', 'ISSUE_LABELED'],
    subLabels: {
      ISSUE_OPENED: 'Opened',
      ISSUE_CLOSED: 'Closed',
      ISSUE_LABELED: 'Labeled',
    },
    subColors: {
      ISSUE_OPENED: 'amber',
      ISSUE_CLOSED: 'gray',
      ISSUE_LABELED: 'sky',
    },
  },
  PUSH: {
    label: 'Pushes',
    description:
      'Get notified whenever commits are pushed to any branch of your connected repositories.',
    icon: HiOutlineCode,
    color: 'emerald',
    subtypes: [],
    subLabels: {},
    subColors: {},
  },
  RELEASE: {
    label: 'Releases',
    description:
      'Track new releases, pre-releases, and published draft releases.',
    icon: HiOutlineTag,
    color: 'purple',
    subtypes: ['RELEASE_PUBLISHED', 'RELEASE_PRERELEASED'],
    subLabels: {
      RELEASE_PUBLISHED: 'Published',
      RELEASE_PRERELEASED: 'Pre-release',
    },
    subColors: { RELEASE_PUBLISHED: 'violet', RELEASE_PRERELEASED: 'pink' },
  },
};

const COLOR_MAP = {
  indigo: {
    chip: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    dot: 'bg-indigo-400',
    bar: 'from-indigo-500 to-purple-500',
    icon: 'text-indigo-400',
    active: 'bg-indigo-500',
  },
  amber: {
    chip: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
    bar: 'from-amber-500 to-orange-500',
    icon: 'text-amber-400',
    active: 'bg-amber-500',
  },
  emerald: {
    chip: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
    bar: 'from-emerald-500 to-teal-500',
    icon: 'text-emerald-400',
    active: 'bg-emerald-500',
  },
  purple: {
    chip: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400',
    bar: 'from-purple-500 to-violet-500',
    icon: 'text-purple-400',
    active: 'bg-purple-500',
  },
  red: {
    chip: 'bg-red-500/20 text-red-300 border-red-500/30',
    dot: 'bg-red-400',
    bar: 'from-red-500 to-rose-500',
    icon: 'text-red-400',
    active: 'bg-red-500',
  },
  sky: {
    chip: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    dot: 'bg-sky-400',
    bar: 'from-sky-500 to-cyan-500',
    icon: 'text-sky-400',
    active: 'bg-sky-500',
  },
  pink: {
    chip: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    dot: 'bg-pink-400',
    bar: 'from-pink-500 to-rose-500',
    icon: 'text-pink-400',
    active: 'bg-pink-500',
  },
  violet: {
    chip: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    dot: 'bg-violet-400',
    bar: 'from-violet-500 to-purple-500',
    icon: 'text-violet-400',
    active: 'bg-violet-500',
  },
  gray: {
    chip: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    dot: 'bg-gray-400',
    bar: 'from-gray-500 to-slate-600',
    icon: 'text-gray-400',
    active: 'bg-gray-500',
  },
};

function Toggle({ active, loading, onChange }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        active ? 'bg-emerald-500' : 'bg-gray-700'
      } ${loading ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          active ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function ActivityRow({
  activity,
  platformId,
  isSelected,
  onSelect,
  onToggled,
}) {
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(activity.is_active);

  const meta = ACTIVITY_META[activity.activity_type] ?? {
    label: activity.activity_type.replace(/_/g, ' '),
    color: 'gray',
    icon: HiOutlineCog,
    description: '',
    subtypes: [],
  };
  const color = COLOR_MAP[meta.color] ?? COLOR_MAP.gray;
  const Icon = meta.icon;

  const handleToggle = async () => {
    setLoading(true);
    const action = active ? 'remove' : 'add';
    const { ok, error } = await apiFetch(
      `/api/account/platforms/${platformId}/activities`,
      {
        method: 'POST',
        body: JSON.stringify({ activity_id: activity.id, action }),
      }
    );
    setLoading(false);
    if (ok) {
      const next = !active;
      setActive(next);
      onToggled?.(activity.id, next);
      toast.success(`Activity ${next ? 'enabled' : 'disabled'}`);
    } else {
      toast.error(error || 'Failed to update');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(activity)}
      className={`group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 transition-all duration-150 ${
        isSelected
          ? 'border-indigo-500/50 bg-indigo-500/10 shadow-sm shadow-indigo-500/10'
          : 'border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
      }`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b ${color.bar} opacity-70`}
      />

      <div
        className={`ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          isSelected ? 'bg-indigo-500/25' : 'bg-white/5 group-hover:bg-white/10'
        }`}
      >
        <Icon className={`h-4 w-4 ${color.icon}`} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold transition-colors ${isSelected ? 'text-white' : 'text-gray-200'}`}
        >
          {meta.label}
        </p>
        <p
          className={`text-[11px] font-medium transition-colors ${active ? 'text-emerald-400' : 'text-gray-500'}`}
        >
          <span
            className={`mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle transition-colors ${active ? 'bg-emerald-400' : 'bg-gray-600'}`}
          />
          {active ? 'Enabled' : 'Disabled'}
          {meta.subtypes?.length > 0 && (
            <span className="font-normal text-gray-500">
              {' '}
              · {meta.subtypes.length} event types
            </span>
          )}
        </p>
      </div>

      <Toggle active={active} loading={loading} onChange={handleToggle} />

      <HiOutlineChevronRight
        className={`h-4 w-4 shrink-0 transition-transform ${
          isSelected ? 'rotate-90 text-indigo-400' : 'text-gray-600'
        }`}
      />
    </motion.div>
  );
}

function ActivityDetail({ activity, onClose }) {
  const [subTypes, setSubTypes] = useState([]);
  const [subLoading, setSubLoading] = useState(true);
  const [subError, setSubError] = useState(null);

  const fetchedForId = useRef(null);

  const meta = ACTIVITY_META[activity.activity_type] ?? {
    label: activity.activity_type.replace(/_/g, ' '),
    color: 'gray',
    icon: HiOutlineCog,
    description: '',
    subtypes: [],
    subLabels: {},
    subColors: {},
  };
  const color = COLOR_MAP[meta.color] ?? COLOR_MAP.gray;
  const Icon = meta.icon;

  useEffect(() => {
    if (fetchedForId.current === activity.id) return;
    fetchedForId.current = activity.id;

    setSubTypes([]);
    setSubLoading(true);
    setSubError(null);

    (async () => {
      const { ok, data, error } = await apiFetch(
        `/api/account/activity-sub-types?activity_ids=${activity.id}`
      );
      if (ok) {
        const rows = data?.activities?.[0]?.sub_types ?? [];
        setSubTypes(rows);
      } else {
        setSubError(error || 'Failed to load event types');
      }
      setSubLoading(false);
    })();
  }, [activity.id]);

  return (
    <motion.div
      key={activity.id}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className="flex h-full flex-col overflow-hidden"
    >
      <div className="flex shrink-0 items-start gap-3 border-b border-white/10 bg-[#0f0c29]/80 px-5 py-4 backdrop-blur-sm">
        <div className="min-w-0 flex-1">
          <div
            className={`mb-2 h-[2px] w-12 rounded-full bg-gradient-to-r ${color.bar}`}
          />
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
              <Icon className={`h-4 w-4 ${color.icon}`} />
            </div>
            <h2 className="text-sm font-bold text-white">{meta.label}</h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <HiOutlineX className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {/* Monitored Event Sub-types (live from API) */}
        <div className="border-white/8 rounded-xl border bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2">
            <HiOutlineBell className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Monitored Events
            </span>
            {!subLoading && subTypes.length > 0 && (
              <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-gray-500">
                {subTypes.length}
              </span>
            )}
          </div>

          {subLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            </div>
          ) : subError ? (
            <p className="text-xs text-red-400">{subError}</p>
          ) : subTypes.length === 0 ? (
            <p className="text-xs text-gray-500">
              No event types configured for this activity.
            </p>
          ) : (
            <div className="space-y-2">
              {subTypes.map((sub) => {
                const subColor =
                  COLOR_MAP[meta.subColors?.[sub.sub_type] ?? 'gray'] ??
                  COLOR_MAP.gray;
                return (
                  <div
                    key={sub.id}
                    className={`rounded-lg border px-3 py-2.5 ${subColor.chip}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${subColor.dot}`}
                      />
                      <span className="text-[11px] font-bold uppercase tracking-wide">
                        {meta.subLabels?.[sub.sub_type] ??
                          sub.sub_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {sub.description && (
                      <p className="mt-1.5 pl-3.5 text-[11px] font-normal leading-relaxed opacity-80">
                        {sub.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Invitation Tab Content ──────────────────────────────────────────────────
function InvitationTab({ platform }) {
  const [platformUsers, setPlatformUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sending, setSending] = useState(false);
  const searchTimeout = useRef(null);

  const isGitHub = platform.platform_type === 'github';
  const accountType =
    platform?.platform_metadata?.installation_details?.account?.type ??
    platform?.user_metadata?.account_type ??
    null;
  const isOrg = String(accountType).toLowerCase() === 'organization';
  const userAssociation = String(
    platform?.user_metadata?.user_association ?? ''
  ).toLowerCase();
  const isOwner = userAssociation === 'owner';

  useEffect(() => {
    if (!isGitHub || !isOrg) return;
    (async () => {
      setLoadingUsers(true);
      const { ok, data } = await apiFetch(
        `/api/account/platforms/${platform.id}/users`
      );
      if (ok) setPlatformUsers(data?.users ?? []);
      setLoadingUsers(false);
    })();
  }, [platform.id, isGitHub, isOrg]);

  const handleSearch = useCallback(
    (value) => {
      setSearchQuery(value);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (value.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      searchTimeout.current = setTimeout(async () => {
        setSearching(true);
        const { ok, data } = await apiFetch(
          `/api/account/platforms/${platform.id}/users/search?email=${encodeURIComponent(value.trim())}`
        );
        if (ok) {
          setSearchResults(data?.users ?? []);
        }
        setSearching(false);
      }, 400);
    },
    [platformUsers]
  );

  const toggleSelect = (user) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleSendInvites = async () => {
    if (selectedUsers.length === 0) return;
    setSending(true);
    const { ok, data } = await apiFetch(
      `/api/account/platforms/${platform.id}/send-invites`,
      {
        method: 'POST',
        body: JSON.stringify({ user_ids: selectedUsers.map((u) => u.id) }),
      }
    );
    setSending(false);
    if (ok) {
      const successCount = (data?.results ?? []).filter(
        (r) => r.success
      ).length;
      toast.success(
        `Invitation sent to ${successCount} user${successCount !== 1 ? 's' : ''}`
      );
      setSelectedUsers([]);
      setSearchQuery('');
      setSearchResults([]);
    } else {
      toast.error(data?.error || 'Failed to send invitations');
    }
  };

  if (!isGitHub || !isOrg || !isOwner) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <HiOutlineLockClosed className="mb-4 h-10 w-10 text-gray-700" />
        <p className="text-sm font-medium text-gray-400">Not Available</p>
        <p className="mt-2 max-w-xs text-xs text-gray-600">
          Platform invitation is only applicable for GitHub organization type
          accounts. {!isGitHub && 'This platform is not a GitHub integration.'}
          {isGitHub && !isOrg && 'This GitHub account is not an organization.'}
          {isGitHub &&
            isOrg &&
            !isOwner &&
            'Only the organization owner can manage invitations.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Current platform users */}
      <div className="flex flex-col">
        <div className="mb-2 flex items-center gap-2">
          <HiOutlineUserGroup className="h-4 w-4 text-indigo-400" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Current Users
          </p>
          {!loadingUsers && (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-gray-500">
              {platformUsers.length}
            </span>
          )}
        </div>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          </div>
        ) : platformUsers.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-600">
            No users connected to this platform yet.
          </p>
        ) : (
          <div className="border-white/8 max-h-40 space-y-1 overflow-y-auto rounded-xl border bg-white/[0.02] p-2">
            {platformUsers.map((u) => (
              <div
                key={u.user_id}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-white/5"
              >
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    className="h-6 w-6 rounded-full object-cover"
                    alt=""
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-300">
                    {(u.full_name || u.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-200">
                    {u.full_name || 'Unnamed'}
                  </p>
                  <p className="truncate text-[10px] text-gray-500">
                    {u.email}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                    u.is_connected
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-gray-500/10 text-gray-500'
                  }`}
                >
                  {u.is_connected ? 'Connected' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite section */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center gap-2">
          <HiOutlineMail className="h-4 w-4 text-purple-400" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Invite Users
          </p>
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <HiOutlineSearch className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by email address..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-xs text-white placeholder-gray-600 outline-none transition-colors focus:border-indigo-500/50 focus:bg-white/[0.06]"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            </div>
          )}
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="border-white/8 mb-3 max-h-36 space-y-1 overflow-y-auto rounded-xl border bg-white/[0.02] p-2">
            {searchResults.map((user) => {
              const isSelected = selectedUsers.some((u) => u.id === user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => toggleSelect(user)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                    isSelected
                      ? 'border border-indigo-500/30 bg-indigo-500/15'
                      : 'border border-transparent hover:bg-white/5'
                  }`}
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      className="h-6 w-6 rounded-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-[10px] font-bold text-purple-300">
                      {(user.full_name || user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-200">
                      {user.full_name || 'Unnamed'}
                    </p>
                    <p className="truncate text-[10px] text-gray-500">
                      {user.email}
                    </p>
                  </div>
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-500'
                        : 'border-gray-600 bg-transparent'
                    }`}
                  >
                    {isSelected && (
                      <HiOutlineCheck className="h-2.5 w-2.5 text-white" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {searchQuery.length >= 2 &&
          !searching &&
          searchResults.length === 0 && (
            <p className="mb-3 text-center text-[11px] text-gray-600">
              No users found matching &ldquo;{searchQuery}&rdquo;
            </p>
          )}

        {/* Selected users chips */}
        {selectedUsers.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {selectedUsers.map((user) => (
              <span
                key={user.id}
                className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-medium text-indigo-300"
              >
                {user.email}
                <button
                  onClick={() => toggleSelect(user)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-indigo-500/20"
                >
                  <HiOutlineX className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Invite button */}
        <button
          onClick={handleSendInvites}
          disabled={selectedUsers.length === 0 || sending}
          className={`mt-auto flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all ${
            selectedUsers.length > 0
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40'
              : 'cursor-not-allowed bg-white/5 text-gray-600'
          } ${sending ? 'cursor-wait opacity-70' : ''}`}
        >
          {sending ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Sending…
            </>
          ) : (
            <>
              <HiOutlineMail className="h-3.5 w-3.5" />
              Send Invitation{selectedUsers.length > 1 ? 's' : ''}{' '}
              {selectedUsers.length > 0 && `(${selectedUsers.length})`}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Platform settings view (right panel)
function PlatformSettingsView({ platform }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('activities');
  const fetched = useRef(false);

  const Icon = PLATFORM_ICONS[platform.platform_type] ?? HiOutlineCog;
  const grad =
    PLATFORM_COLORS[platform.platform_type] ?? 'from-gray-600 to-gray-900';

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    (async () => {
      setLoading(true);
      const { ok, data } = await apiFetch(
        `/api/account/platforms/${platform.id}/activities`
      );
      if (ok) setActivities(data?.activities ?? []);
      setLoading(false);
    })();
  }, [platform.id]);

  const isGitHub = platform.platform_type === 'github';
  const accountType =
    platform?.platform_metadata?.installation_details?.account?.type ??
    platform?.user_metadata?.account_type ??
    null;
  const isOrg = String(accountType).toLowerCase() === 'organization';
  const userAssociation = String(
    platform?.user_metadata?.user_association ?? ''
  ).toLowerCase();
  const isOwner = userAssociation === 'owner';
  const canSeeInvitationSettings = isGitHub && isOrg && isOwner;

  const TABS = [{ key: 'activities', label: 'Activities', icon: HiOutlineCog }];
  if (canSeeInvitationSettings) {
    TABS.push({ key: 'invitation', label: 'Invitation', icon: HiOutlineMail });
  }

  useEffect(() => {
    if (!TABS.some((tab) => tab.key === activeTab)) {
      setActiveTab('activities');
    }
  }, [activeTab, TABS]);

  return (
    <div className="flex h-full flex-col overflow-hidden p-5">
      {/* Header */}
      <div className="mb-4 flex shrink-0 items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${grad}`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold capitalize text-white">
            {platform.title || platform.platform_type}
          </h2>
          <p className="text-[11px] capitalize text-gray-500">
            {platform.platform_type} · Connected
          </p>
        </div>
        <span className="ml-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
          <HiOutlineCheck className="mr-1 inline h-3 w-3" />
          Connected
        </span>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left side settings menu */}
        <aside className="border-white/8 w-48 shrink-0 rounded-xl border bg-black/20 p-2">
          <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">
            Platform Settings
          </p>
          <div className="space-y-1">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-500/20 text-white shadow-sm shadow-indigo-500/10'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right side settings content */}
        <div className="min-h-0 min-w-0 flex-1">
          {activeTab === 'activities' && (
            <>
              <p className="mb-2 shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                Activity Settings
              </p>

              <div className="flex h-full min-h-0 gap-3">
                <div
                  className={`flex min-w-0 flex-col transition-all duration-200 ${selected ? 'w-[52%]' : 'w-full'}`}
                >
                  {loading ? (
                    <div className="flex flex-1 items-center justify-center py-10">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="border-white/8 flex flex-col items-center rounded-xl border bg-white/[0.03] py-10 text-center">
                      <HiOutlineCog className="mb-3 h-8 w-8 text-gray-700" />
                      <p className="text-sm text-gray-500">
                        No activities available
                      </p>
                      <p className="mt-1 text-xs text-gray-600">
                        This platform has no configurable activity types yet.
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                      {activities.map((act) => (
                        <ActivityRow
                          key={act.id}
                          activity={act}
                          platformId={platform.id}
                          isSelected={selected?.id === act.id}
                          onSelect={(a) =>
                            setSelected((prev) =>
                              prev?.id === a.id ? null : a
                            )
                          }
                          onToggled={(id, val) =>
                            setActivities((prev) =>
                              prev.map((a) =>
                                a.id === id ? { ...a, is_active: val } : a
                              )
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {selected && (
                    <motion.div
                      key="act-detail"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: '48%' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 38,
                      }}
                      className="flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#0f0c29]"
                      style={{ minWidth: 0 }}
                    >
                      <ActivityDetail
                        activity={selected}
                        onClose={() => setSelected(null)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {activeTab === 'invitation' && canSeeInvitationSettings && (
            <div className="h-full min-h-0 overflow-y-auto">
              <InvitationTab platform={platform} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main page
export default function Settings() {
  const { getPlatforms } = useAuth();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    (async () => {
      setLoading(true);
      const { platforms: p } = await getPlatforms();
      const connected = (p ?? []).filter((pl) => pl.is_connected);
      setPlatforms(connected);
      setSelectedPlatform(connected[0] ?? null);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#24243e] text-white">
      <Navbar />

      <div className="ml-16 flex flex-1 flex-col overflow-hidden">
        {/* Page header */}
        <div className="border-white/8 flex shrink-0 items-center gap-3 border-b bg-black/20 px-6 py-4 backdrop-blur-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700">
            <HiOutlineCog className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Settings</h1>
            <p className="text-xs text-gray-500">
              Configure activity tracking for your connected platforms
            </p>
          </div>
          {!loading && platforms.length > 0 && (
            <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-gray-400">
              {platforms.length} platform{platforms.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
            <p className="text-sm text-gray-500">Loading platforms\u2026</p>
          </div>
        ) : platforms.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <HiOutlineCog className="mb-5 h-14 w-14 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-300">
              No Connected Platforms
            </h2>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              Connect a platform from the Dashboard first before configuring
              settings.
            </p>
            <Link
              to="/dashboard"
              className="mt-6 rounded-xl bg-indigo-500/20 px-5 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/30"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Left sidebar */}
            <aside className="border-white/8 flex w-64 shrink-0 flex-col overflow-hidden border-r bg-black/20">
              <div className="px-4 pb-2 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                  Platforms
                </p>
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
                {platforms.map((p) => {
                  const isActive = selectedPlatform?.id === p.id;
                  const PIcon = PLATFORM_ICONS[p.platform_type] ?? HiOutlineCog;
                  const pGrad =
                    PLATFORM_COLORS[p.platform_type] ??
                    'from-gray-600 to-gray-900';
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlatform(p)}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                        isActive
                          ? 'bg-indigo-500/15 shadow-sm shadow-indigo-500/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${pGrad} transition-opacity ${
                          isActive
                            ? 'opacity-100'
                            : 'opacity-70 group-hover:opacity-100'
                        }`}
                      >
                        <PIcon className="h-4 w-4 text-white" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-xs font-semibold capitalize transition-colors ${
                            isActive ? 'text-white' : 'text-gray-300'
                          }`}
                        >
                          {p.title || p.platform_type}
                        </p>
                        <p className="text-[10px] capitalize text-gray-600">
                          {p.platform_type}
                        </p>
                      </div>

                      {isActive && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="border-white/8 border-t px-4 py-3">
                <p className="text-[11px] text-gray-600">
                  Only connected platforms shown
                </p>
              </div>
            </aside>

            {/* Right panel */}
            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <AnimatePresence mode="wait">
                {selectedPlatform ? (
                  <motion.div
                    key={selectedPlatform.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex h-full flex-col overflow-hidden"
                  >
                    <PlatformSettingsView
                      key={selectedPlatform.id}
                      platform={selectedPlatform}
                    />
                  </motion.div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                    <HiOutlineDotsVertical className="h-8 w-8 text-gray-700" />
                    <p className="text-sm text-gray-500">Select a platform</p>
                  </div>
                )}
              </AnimatePresence>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
