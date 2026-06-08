import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SiGithub } from 'react-icons/si';
import {
  HiOutlineExternalLink,
  HiOutlineX,
  HiOutlineClock,
  HiOutlineUser,
  HiOutlineDatabase,
  HiOutlineCode,
  HiOutlineTag,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineRefresh,
  HiOutlineCheck,
  HiOutlineDotsVertical,
  HiOutlineSparkles,
} from 'react-icons/hi';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiFetch } from '../api/session/index.js';
import toast from 'react-hot-toast';

// ─── Utilities ────────────────────────────────────────────────────────────────

function tryParse(val) {
  if (val == null) return {};
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
}

function tryParseArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val !== 'string') return [];
  try {
    const p = JSON.parse(val);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function timeAgo(tsMs) {
  if (!tsMs) return '—';
  const diff = Date.now() - Number(tsMs);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(Number(tsMs)).toLocaleDateString();
}

function fmtDate(v) {
  if (!v || v === 'null') return null;
  const d = new Date(v);
  if (isNaN(d)) return null;
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ─── Design tokens ────────────────────────────────────────────────────────────

// Keys must match the actual activity_sub_type values stored in Firestore/DB
// (ActivitySubTypes constants: 'opened', 'closed', 'reopened', 'synchronize', 'edited', 'push')
const SUB_TYPE = {
  opened: {
    label: 'Opened',
    dot: 'bg-emerald-400',
    chip: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    bar: 'from-emerald-500 to-teal-500',
    cardBorder: 'border-emerald-500/25',
    cardBg: 'bg-emerald-500/[0.06]',
    descColor: 'text-emerald-300/70',
  },
  closed: {
    label: 'Closed',
    dot: 'bg-red-400',
    chip: 'bg-red-500/20 text-red-300 border-red-500/30',
    bar: 'from-red-500 to-rose-500',
    cardBorder: 'border-red-500/25',
    cardBg: 'bg-red-500/[0.06]',
    descColor: 'text-red-300/70',
  },
  reopened: {
    label: 'Reopened',
    dot: 'bg-amber-400',
    chip: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    bar: 'from-amber-500 to-orange-500',
    cardBorder: 'border-amber-500/25',
    cardBg: 'bg-amber-500/[0.06]',
    descColor: 'text-amber-300/70',
  },
  edited: {
    label: 'Edited',
    dot: 'bg-sky-400',
    chip: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    bar: 'from-sky-500 to-cyan-500',
    cardBorder: 'border-sky-500/25',
    cardBg: 'bg-sky-500/[0.06]',
    descColor: 'text-sky-300/70',
  },
  synchronize: {
    label: 'Synchronize',
    dot: 'bg-blue-400',
    chip: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    bar: 'from-blue-500 to-indigo-500',
    cardBorder: 'border-blue-500/25',
    cardBg: 'bg-blue-500/[0.06]',
    descColor: 'text-blue-300/70',
  },
  push: {
    label: 'Push',
    dot: 'bg-teal-400',
    chip: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    bar: 'from-teal-500 to-emerald-500',
    cardBorder: 'border-teal-500/25',
    cardBg: 'bg-teal-500/[0.06]',
    descColor: 'text-teal-300/70',
  },
  submitted: {
    label: 'Submitted',
    dot: 'bg-purple-400',
    chip: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    bar: 'from-purple-500 to-violet-500',
    cardBorder: 'border-purple-500/25',
    cardBg: 'bg-purple-500/[0.06]',
    descColor: 'text-purple-300/70',
  },
};

const ACTIVITY_LABELS = {
  PULL_REQUEST: 'Pull Requests',
  ISSUE: 'Issues',
  PUSH: 'Pushes',
  RELEASE: 'Releases',
};

const PAGE_SIZE = 20;

// ─── Chips ────────────────────────────────────────────────────────────────────

function SubTypeChip({ subType }) {
  const t = SUB_TYPE[subType] ?? {
    label: (subType ?? '').replace(/_/g, ' '),
    dot: 'bg-gray-400',
    chip: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${t.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {t.label}
    </span>
  );
}

function StateChip({ state, isMerged, isDraft }) {
  if (isMerged)
    return (
      <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
        Merged
      </span>
    );
  if (isDraft)
    return (
      <span className="rounded-full border border-gray-500/30 bg-gray-500/15 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
        Draft
      </span>
    );
  if (state === 'open')
    return (
      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
        Open
      </span>
    );
  if (state === 'closed')
    return (
      <span className="rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
        Closed
      </span>
    );
  return null;
}

// ─── Activity Card ────────────────────────────────────────────────────────────

function ActivityCard({ item, onExpand, isSelected, subTypeDesc }) {
  const repo = tryParse(item.repository);
  const actor = tryParse(item.actor);
  const pr = tryParse(item.pull_request);
  const isPR = item.activity_type === 'pull_request';
  const st = SUB_TYPE[item.activity_sub_type] ?? {
    bar: 'from-gray-500 to-slate-600',
    cardBorder: 'border-gray-500/20',
    cardBg: 'bg-gray-500/[0.04]',
    descColor: 'text-gray-400/70',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onExpand(item)}
      className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all duration-150 ${
        isSelected
          ? 'border-indigo-500/60 bg-indigo-500/10 shadow-md shadow-indigo-500/10'
          : `${st.cardBorder} ${st.cardBg} hover:brightness-110`
      }`}
    >
      {/* gradient left accent */}
      <div
        className={`absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b ${st.bar}`}
      />

      <div className="px-3.5 py-3 pl-5">
        {/* chips + time */}
        <div className="flex flex-wrap items-center gap-1.5">
          <SubTypeChip subType={item.activity_sub_type} />
          {isPR && pr && (
            <StateChip
              state={pr.state}
              isMerged={pr.is_merged}
              isDraft={pr.is_draft}
            />
          )}
          <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-gray-600">
            <HiOutlineClock className="h-3 w-3" />
            {timeAgo(item.timestamp)}
          </span>
        </div>

        {/* sub_type description */}
        <p
          className={`mt-1.5 line-clamp-2 text-xs leading-relaxed ${st.descColor}`}
        >
          {subTypeDesc ||
            (item.activity_sub_type ?? 'Activity').replace(/_/g, ' ')}
        </p>

        {/* actor + repo */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {actor?.avatar_url && (
            <img
              src={actor.avatar_url}
              alt=""
              className="h-3.5 w-3.5 rounded-full ring-1 ring-white/20"
            />
          )}
          <span className="text-[11px] text-gray-500">
            {actor?.name ?? '—'}
          </span>
          {repo?.full_name && (
            <span className="text-[11px] text-sky-500/70">
              · {repo.full_name}
            </span>
          )}
        </div>

        {/* PR mini-stats */}
        {isPR && pr && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
            {pr.additions != null && (
              <span className="font-semibold text-emerald-400">
                +{pr.additions}
              </span>
            )}
            {pr.deletions != null && (
              <span className="font-semibold text-red-400">
                −{pr.deletions}
              </span>
            )}
            {pr.commits != null && (
              <span className="text-gray-600">{pr.commits} commits</span>
            )}
            {(pr.head?.ref || pr.base?.ref) && (
              <span className="ml-auto flex items-center gap-1 font-mono">
                <span className="rounded bg-sky-500/10 px-1 py-0.5 text-sky-400">
                  {pr.head?.ref}
                </span>
                <span className="text-gray-700">→</span>
                <span className="rounded bg-indigo-500/10 px-1 py-0.5 text-indigo-400">
                  {pr.base?.ref}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }) {
  return (
    <div className="border-white/8 overflow-hidden rounded-xl border bg-white/[0.03]">
      <div className="border-white/8 flex items-center gap-2 border-b bg-white/[0.03] px-4 py-2.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-indigo-400" />}
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          {title}
        </span>
      </div>
      <div className="p-4 text-xs">{children}</div>
    </div>
  );
}

function Row({ label, value, mono = false }) {
  if (value == null || value === '' || value === 'null') return null;
  return (
    <div className="flex gap-3 py-[3px]">
      <span className="w-28 shrink-0 text-gray-500">{label}</span>
      <span
        className={`flex-1 break-words text-gray-200 ${mono ? 'font-mono' : ''}`}
      >
        {String(value)}
      </span>
    </div>
  );
}

function ActivityDetail({ item, onClose }) {
  const repo = tryParse(item.repository);
  const actor = tryParse(item.actor);
  const pr = tryParse(item.pull_request);
  const review = tryParse(item.pull_request_review);
  const pushEvent = tryParse(item.push_event);
  const isPR = item.activity_type === 'pull_request';
  const isPRReview = item.activity_type === 'pull_request_review';
  const isPush = item.activity_type === 'push';
  const labels = tryParseArray(pr?.labels);
  const reviewers = tryParseArray(pr?.requested_reviewers);
  const assignees = tryParseArray(pr?.assignees);
  const commits = tryParseArray(pushEvent?.commits);
  const st = SUB_TYPE[item.activity_sub_type];

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className="flex h-full flex-col overflow-hidden"
    >
      {/* Sticky header */}
      <div className="flex shrink-0 items-start gap-3 border-b border-white/10 bg-[#0f0c29]/80 px-5 py-4 backdrop-blur-sm">
        <div className="min-w-0 flex-1">
          {/* Gradient title bar */}
          <div
            className={`mb-2 h-[2px] w-12 rounded-full bg-gradient-to-r ${st?.bar ?? 'from-indigo-500 to-purple-500'}`}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <SubTypeChip subType={item.activity_sub_type} />
            {isPR && pr && (
              <StateChip
                state={pr.state}
                isMerged={pr.is_merged}
                isDraft={pr.is_draft}
              />
            )}
            <span className="ml-auto text-[10px] text-gray-500">
              {timeAgo(item.timestamp)}
            </span>
          </div>
          <h2 className="mt-2 text-sm font-bold leading-snug text-white">
            {isPR && pr?.number ? (
              <>
                <span className="text-indigo-400">#{pr.number}</span>{' '}
                {pr.title || 'Untitled'}
              </>
            ) : isPush ? (
              <span className="text-gray-300">
                {repo?.full_name || 'Push Event'}
              </span>
            ) : (
              <span className="text-gray-300">
                {repo?.full_name ||
                  (item.activity_sub_type ?? 'Activity').replace(/_/g, ' ')}
              </span>
            )}
          </h2>
          {pr?.html_url && (
            <a
              href={pr.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
              onClick={(e) => e.stopPropagation()}
            >
              <HiOutlineExternalLink className="h-3 w-3" /> Open on GitHub
            </a>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <HiOutlineX className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {/* AI Summary — shown inside detail, not on card */}
        {item.summary && (
          <Section title="AI Summary" icon={HiOutlineSparkles}>
            <p className="leading-relaxed text-gray-300">{item.summary}</p>
          </Section>
        )}

        {/* Author */}
        <Section title="Author" icon={HiOutlineUser}>
          {actor && (
            <div className="mb-3 flex items-center gap-3">
              {actor.avatar_url && (
                <img
                  src={actor.avatar_url}
                  alt=""
                  className="h-9 w-9 rounded-full ring-2 ring-indigo-500/30"
                />
              )}
              <div>
                <p className="font-semibold text-white">{actor.name ?? '—'}</p>
                {actor.html_url && (
                  <a
                    href={actor.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    <HiOutlineExternalLink className="h-3 w-3" /> View on GitHub
                  </a>
                )}
              </div>
            </div>
          )}
          <div className="space-y-0.5 border-t border-white/5 pt-2">
            <Row label="Created" value={fmtDate(pr?.created_at)} />
            <Row label="Updated" value={fmtDate(pr?.updated_at)} />
            <Row label="Closed" value={fmtDate(pr?.closed_at)} />
            <Row label="Merged" value={fmtDate(pr?.merged_at)} />
          </div>
          {labels.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-white/5 pt-2.5">
              {labels.map((l, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-indigo-300"
                >
                  <HiOutlineTag className="h-3 w-3" />
                  {typeof l === 'object' ? l.name : l}
                </span>
              ))}
            </div>
          )}
        </Section>

        {/* Repository */}
        {repo && Object.keys(repo).length > 0 && (
          <Section title="Repository" icon={HiOutlineDatabase}>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-white">
                {repo.full_name || repo.name || '—'}
              </span>
              {repo.html_url && (
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                >
                  <HiOutlineExternalLink className="h-3 w-3" /> Open
                </a>
              )}
            </div>
            {repo.description && (
              <p className="mb-3 text-gray-400">{repo.description}</p>
            )}
            <div className="grid grid-cols-2 gap-x-4">
              <Row label="Visibility" value={repo.visibility} />
              <Row label="Forks" value={repo.forks_count} />
              <Row label="Open issues" value={repo.open_issues_count} />
              <Row label="Watchers" value={repo.watchers_count} />
            </div>
          </Section>
        )}

        {/* PR details */}
        {isPR && pr && (
          <Section title="Pull Request Details" icon={HiOutlineCode}>
            {/* Branch flow */}
            {(pr.head?.ref || pr.base?.ref) && (
              <div className="border-white/8 mb-4 flex items-center gap-2 rounded-lg border bg-black/20 px-4 py-2.5 font-mono text-xs">
                <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-300">
                  {pr.head?.ref ?? '—'}
                </span>
                <span className="text-gray-600">→</span>
                <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-indigo-300">
                  {pr.base?.ref ?? '—'}
                </span>
              </div>
            )}

            {/* Stats grid */}
            <div className="mb-3 grid grid-cols-3 gap-2">
              {[
                {
                  label: 'Commits',
                  value: pr.commits,
                  color: 'text-indigo-300',
                },
                {
                  label: 'Files',
                  value: pr.changed_files,
                  color: 'text-sky-300',
                },
                {
                  label: 'Additions',
                  value: pr.additions != null ? `+${pr.additions}` : null,
                  color: 'text-emerald-300',
                },
                {
                  label: 'Deletions',
                  value: pr.deletions != null ? `−${pr.deletions}` : null,
                  color: 'text-red-300',
                },
                {
                  label: 'Comments',
                  value: pr.comments,
                  color: 'text-gray-300',
                },
                {
                  label: 'Reviews',
                  value: pr.review_comments,
                  color: 'text-gray-300',
                },
              ]
                .filter((s) => s.value != null)
                .map((s) => (
                  <div
                    key={s.label}
                    className="border-white/8 flex flex-col items-center rounded-lg border bg-black/20 py-2"
                  >
                    <span className={`text-sm font-bold ${s.color}`}>
                      {s.value}
                    </span>
                    <span className="mt-0.5 text-[10px] text-gray-500">
                      {s.label}
                    </span>
                  </div>
                ))}
            </div>

            <div className="space-y-0.5">
              <Row label="Mergeable" value={pr.mergeable_state} />
              <Row label="Draft" value={pr.is_draft ? 'Yes' : null} />
              <Row label="Locked" value={pr.locked ? 'Yes' : null} />
              {pr.milestone?.title && (
                <Row label="Milestone" value={pr.milestone.title} />
              )}
            </div>

            {/* Edited changes (shown only in right detail panel) */}
            {item.activity_sub_type === 'edited' &&
              pr?.changes &&
              Object.keys(pr.changes).length > 0 && (
                <div className="mt-3 border-t border-white/5 pt-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Edited Fields
                  </p>
                  <div className="space-y-2 text-[11px]">
                    {pr.changes.title?.from && (
                      <div className="border-white/8 flex items-start gap-1.5 rounded-lg border bg-black/20 px-2.5 py-2">
                        <span className="mt-0.5 shrink-0 text-gray-500">
                          title
                        </span>
                        <span className="truncate font-mono text-red-400/80 line-through">
                          {pr.changes.title.from}
                        </span>
                        <span className="shrink-0 text-gray-600">→</span>
                        <span className="truncate font-mono text-sky-300">
                          {pr.title}
                        </span>
                      </div>
                    )}

                    {pr.changes.base?.ref?.from && (
                      <div className="border-white/8 flex items-center gap-1.5 rounded-lg border bg-black/20 px-2.5 py-2">
                        <span className="shrink-0 text-gray-500">base</span>
                        <span className="rounded bg-red-500/10 px-1 py-0.5 font-mono text-red-400/80 line-through">
                          {pr.changes.base.ref.from}
                        </span>
                        <span className="text-gray-600">→</span>
                        <span className="rounded bg-indigo-500/10 px-1 py-0.5 font-mono text-indigo-300">
                          {pr.base?.ref}
                        </span>
                      </div>
                    )}

                    {pr.changes.body?.from != null && (
                      <div className="border-white/8 flex items-center gap-2 rounded-lg border bg-black/20 px-2.5 py-2">
                        <span className="text-gray-500">description</span>
                        <span className="text-sky-400">updated</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            {/* Merged by */}
            {pr.merged_by?.name && (
              <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
                <span className="text-gray-500">Merged by</span>
                {pr.merged_by.avatar_url && (
                  <img
                    src={pr.merged_by.avatar_url}
                    className="h-4 w-4 rounded-full"
                    alt=""
                  />
                )}
                <span className="font-medium text-purple-300">
                  {pr.merged_by.name}
                </span>
                {pr.merged_by.html_url && (
                  <a
                    href={pr.merged_by.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-indigo-400 hover:text-indigo-300"
                  >
                    <HiOutlineExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Reviewers */}
            {reviewers.length > 0 && (
              <div className="mt-3 border-t border-white/5 pt-3">
                <p className="mb-1.5 text-[10px] uppercase tracking-wide text-gray-500">
                  Requested Reviewers
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {reviewers.map((r, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-gray-300"
                    >
                      {r?.avatar_url && (
                        <img
                          src={r.avatar_url}
                          className="h-3 w-3 rounded-full"
                          alt=""
                        />
                      )}
                      {r?.login ?? r?.name ?? String(r)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Assignees */}
            {assignees.length > 0 && (
              <div className="mt-3 border-t border-white/5 pt-3">
                <p className="mb-1.5 text-[10px] uppercase tracking-wide text-gray-500">
                  Assignees
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {assignees.map((a, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-gray-300"
                    >
                      {a?.avatar_url && (
                        <img
                          src={a.avatar_url}
                          className="h-3 w-3 rounded-full"
                          alt=""
                        />
                      )}
                      {a?.login ?? a?.name ?? String(a)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Pull request review details */}
        {isPRReview && review && (
          <Section title="Review Details" icon={HiOutlineCode}>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {review.action && (
                <span className="rounded-full border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-300">
                  {String(review.action).replace(/_/g, ' ')}
                </span>
              )}
              {review.state && (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-300">
                  {String(review.state).replace(/_/g, ' ')}
                </span>
              )}
            </div>

            {review.body && (
              <div className="border-white/8 mb-3 rounded-lg border bg-black/20 px-3 py-2.5 text-[12px] leading-relaxed text-gray-300">
                {review.body}
              </div>
            )}

            <div className="space-y-0.5 border-t border-white/5 pt-2">
              <Row label="Submitted" value={fmtDate(review.submitted_at)} />
              <Row label="Updated" value={fmtDate(review.updated_at)} />
              <Row label="Review ID" value={review.id} mono />
              <Row label="Commit ID" value={review.commit_id} mono />
            </div>

            {review.html_url && (
              <a
                href={review.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
              >
                <HiOutlineExternalLink className="h-3 w-3" /> Open Review on
                GitHub
              </a>
            )}
          </Section>
        )}

        {/* Push Details */}
        {isPush && pushEvent && (
          <Section title="Push Details" icon={HiOutlineCode}>
            {/* flags */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {pushEvent.forced && (
                <span className="rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                  Force Push
                </span>
              )}
              {pushEvent.created && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  New Branch
                </span>
              )}
              {pushEvent.deleted && (
                <span className="rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                  Branch Deleted
                </span>
              )}
            </div>

            {/* compare url */}
            {pushEvent.compare_url && (
              <div className="mb-3">
                <a
                  href={pushEvent.compare_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                >
                  <HiOutlineExternalLink className="h-3 w-3" /> View diff on
                  GitHub
                </a>
              </div>
            )}

            {/* commits */}
            {commits.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  {commits.length} Commit{commits.length !== 1 ? 's' : ''}
                </p>
                {commits.map((commit, i) => (
                  <div
                    key={commit.id ?? i}
                    className="border-white/8 rounded-lg border bg-black/20 p-3"
                  >
                    {/* message + link */}
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <p className="flex-1 text-xs font-medium leading-snug text-white/90">
                        {commit.message || '(no message)'}
                      </p>
                      {commit.url && (
                        <a
                          href={commit.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-indigo-400 hover:text-indigo-300"
                        >
                          <HiOutlineExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {/* author */}
                    {commit.author?.name && (
                      <p className="mb-2 text-[10px] text-gray-500">
                        by {commit.author.name}
                        {commit.author.username
                          ? ` (${commit.author.username})`
                          : ''}
                      </p>
                    )}
                    {/* file changes */}
                    <div className="space-y-1.5">
                      {commit.added?.length > 0 && (
                        <div className="flex items-start gap-1.5">
                          <span className="mt-0.5 shrink-0 text-[10px] font-bold text-emerald-400">
                            +{commit.added.length}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {commit.added.map((f, j) => (
                              <span
                                key={j}
                                className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] text-emerald-300"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {commit.modified?.length > 0 && (
                        <div className="flex items-start gap-1.5">
                          <span className="mt-0.5 shrink-0 text-[10px] font-bold text-amber-400">
                            ~{commit.modified.length}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {commit.modified.map((f, j) => (
                              <span
                                key={j}
                                className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] text-amber-300"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {commit.removed?.length > 0 && (
                        <div className="flex items-start gap-1.5">
                          <span className="mt-0.5 shrink-0 text-[10px] font-bold text-red-400">
                            -{commit.removed.length}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {commit.removed.map((f, j) => (
                              <span
                                key={j}
                                className="rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-[9px] text-red-300"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}
      </div>
    </motion.div>
  );
}

// ─── Feed view (card list) ────────────────────────────────────────────────────

function ActivityFeed({ platformId, activity }) {
  const [feed, setFeed] = useState({
    items: [],
    total: 0,
    offset: 0,
    loading: false,
    error: null,
  });
  const [selected, setSelected] = useState(null);
  const [subTypeMap, setSubTypeMap] = useState({});
  const loaded = useRef(new Set());
  const subTypeFetched = useRef(false);

  // Fetch sub_type descriptions — guarded by ref to prevent StrictMode double-invoke
  useEffect(() => {
    if (subTypeFetched.current) return;
    subTypeFetched.current = true;
    (async () => {
      const { ok, data } = await apiFetch(
        `/api/account/activity-sub-types?activity_ids=${activity.activity_id}`
      );
      if (ok) {
        const subs = data?.activities?.[0]?.sub_types ?? [];
        const map = {};
        for (const s of subs) map[s.sub_type] = s.description ?? '';
        setSubTypeMap(map);
      }
    })();
  }, [activity.activity_id]);

  const load = useCallback(
    async (offset = 0) => {
      const key = `${activity.activity_id}:${offset}`;
      if (loaded.current.has(key)) return;
      loaded.current.add(key);
      setFeed((prev) => ({ ...prev, loading: true, error: null }));
      const qs = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      const { ok, data, error } = await apiFetch(
        `/api/account/platforms/${platformId}/activitiy-feeds/${activity.activity_id}?${qs}`
      );
      if (ok) {
        setFeed({
          items: data?.activities ?? [],
          total: data?.total_count ?? 0,
          offset,
          loading: false,
          error: null,
        });
      } else {
        loaded.current.delete(key);
        setFeed((prev) => ({
          ...prev,
          loading: false,
          error: error || 'Failed to load',
        }));
      }
    },
    [platformId, activity.activity_id]
  );

  useEffect(() => {
    load(0);
  }, [load]);

  const totalPages = Math.ceil(feed.total / PAGE_SIZE);
  const currentPage = Math.floor(feed.offset / PAGE_SIZE);
  const retry = () => {
    loaded.current.delete(`${activity.activity_id}:${feed.offset}`);
    load(feed.offset);
  };

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* ── Card list ─────────────────────────────────────── */}
      <div
        className={`flex flex-col transition-all duration-200 ${selected ? 'w-[52%]' : 'w-full'} min-w-0`}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between px-0.5">
          <span className="text-xs text-gray-500">
            {feed.loading ? 'Loading…' : `${feed.total} total`}
          </span>
          <button
            onClick={retry}
            title="Refresh"
            className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/5 text-gray-500 hover:text-white"
          >
            <HiOutlineRefresh className="h-3 w-3" />
          </button>
        </div>

        {feed.loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            <p className="text-xs text-gray-500">Loading…</p>
          </div>
        ) : feed.error ? (
          <div className="flex flex-col items-center rounded-xl border border-red-500/20 bg-red-500/5 py-8 text-center">
            <p className="text-sm text-red-400">{feed.error}</p>
            <button
              onClick={retry}
              className="mt-3 text-xs text-red-300 underline"
            >
              Retry
            </button>
          </div>
        ) : !feed.items.length ? (
          <div className="flex flex-col items-center py-12 text-center">
            <SiGithub className="mb-3 h-8 w-8 text-gray-700" />
            <p className="text-sm text-gray-500">No activities yet</p>
            <p className="mt-1 text-xs text-gray-600">
              Events will appear here once they occur.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {feed.items.map((item) => (
                <ActivityCard
                  key={item.id}
                  item={item}
                  onExpand={setSelected}
                  isSelected={selected?.id === item.id}
                  subTypeDesc={subTypeMap[item.activity_sub_type] ?? ''}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  disabled={currentPage === 0}
                  onClick={() => load((currentPage - 1) * PAGE_SIZE)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
                >
                  <HiOutlineChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs text-gray-500">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => load((currentPage + 1) * PAGE_SIZE)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
                >
                  <HiOutlineChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Detail panel ──────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="detail-panel"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '48%' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 38 }}
            className="ml-3 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#0f0c29]"
            style={{ minWidth: 0 }}
          >
            <ActivityDetail item={selected} onClose={() => setSelected(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Platform view ────────────────────────────────────────────────────────────

function PlatformView({ platform }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const activities = platform.activities ?? [];
  const active = activities[activeIdx] ?? null;

  if (!activities.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <SiGithub className="mb-4 h-10 w-10 text-gray-700" />
        <p className="text-sm font-medium text-gray-400">
          No activities enabled
        </p>
        <p className="mt-1 text-xs text-gray-600">
          Enable activities in{' '}
          <Link
            to="/settings"
            className="text-indigo-400 hover:text-indigo-300"
          >
            Settings
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Activity-type tab bar */}
      <div className="border-white/8 mb-4 flex items-center gap-0 border-b">
        {activities.map((act, idx) => {
          const isActive = idx === activeIdx;
          return (
            <button
              key={act.activity_id}
              onClick={() => setActiveIdx(idx)}
              className={`relative px-4 py-2.5 text-xs font-medium transition-colors ${
                isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {ACTIVITY_LABELS[act.activity_type] ??
                act.activity_type.replace(/_/g, ' ')}
              {isActive && (
                <motion.div
                  layoutId={`act-tab-${platform.id}`}
                  className="absolute inset-x-0 bottom-0 h-[2px] rounded-t bg-gradient-to-r from-indigo-500 to-purple-500"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      {active && (
        <div className="min-h-0 flex-1">
          <ActivityFeed
            key={active.activity_id}
            platformId={platform.id}
            activity={active}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GitHubActivities() {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    (async () => {
      setLoading(true);
      const {
        ok: pOk,
        data: pData,
        error: pErr,
      } = await apiFetch('/api/account/platforms?is_connected=true');
      if (!pOk) {
        toast.error(pErr || 'Failed to load platforms');
        setLoading(false);
        return;
      }

      const githubPlatforms = (pData?.platforms ?? []).filter(
        (p) => p.platform_type === 'github'
      );
      if (!githubPlatforms.length) {
        setPlatforms([]);
        setLoading(false);
        return;
      }

      const results = await Promise.all(
        githubPlatforms.map(async (p) => {
          const { ok, data } = await apiFetch(
            `/api/account/platforms/${p.id}/activities`
          );
          const activities = ok
            ? (data?.activities ?? [])
                .filter((a) => a.is_active)
                .map((a) => ({
                  activity_id: a.id,
                  activity_type: a.activity_type,
                }))
            : [];
          return {
            id: p.id,
            title: p.title,
            platform_type: p.platform_type,
            activities,
          };
        })
      );

      setPlatforms(results);
      setSelectedPlatform(results[0] ?? null);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#24243e] text-white">
      <Navbar />

      {/* ── Main area (after navbar) ──────────────────────── */}
      <div className="ml-16 flex flex-1 flex-col overflow-hidden">
        {/* Page header */}
        <div className="border-white/8 flex shrink-0 items-center gap-3 border-b bg-black/20 px-6 py-4 backdrop-blur-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gray-600 to-gray-900">
            <SiGithub className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">GitHub Activities</h1>
            <p className="text-xs text-gray-500">
              Monitor events across your connected GitHub integrations
            </p>
          </div>
          {!loading && platforms.length > 0 && (
            <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-gray-400">
              {platforms.length} platform{platforms.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* ── Content ──────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
            <p className="text-sm text-gray-500">Loading platforms…</p>
          </div>
        ) : platforms.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <SiGithub className="mb-5 h-14 w-14 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-300">
              No GitHub Platforms Found
            </h2>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              Connect a GitHub integration from the Dashboard, then enable
              activity types in Settings.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                to="/dashboard"
                className="rounded-xl bg-indigo-500/20 px-5 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/30"
              >
                Go to Dashboard
              </Link>
              <Link
                to="/settings"
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-gray-300 hover:bg-white/10"
              >
                Settings
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* ── Left sidebar: platform list ─────────────── */}
            <aside className="border-white/8 flex w-64 shrink-0 flex-col overflow-hidden border-r bg-black/20">
              <div className="px-4 pb-2 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                  Platforms
                </p>
              </div>
              <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
                {platforms.map((p) => {
                  const isActive = selectedPlatform?.id === p.id;
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
                      {/* Icon */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          isActive
                            ? 'bg-indigo-500/30'
                            : 'bg-white/[0.06] group-hover:bg-white/10'
                        }`}
                      >
                        <SiGithub className="h-4 w-4 text-white" />
                      </div>

                      {/* Name + count */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-xs font-semibold transition-colors ${isActive ? 'text-white' : 'text-gray-300'}`}
                        >
                          {p.title || p.id}
                        </p>
                        <p className="text-[10px] text-gray-600">
                          {p.activities.length} type
                          {p.activities.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Active dot */}
                      {isActive && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bottom hint */}
              <div className="border-white/8 border-t px-4 py-3">
                <Link
                  to="/settings"
                  className="flex items-center gap-2 text-[11px] text-gray-600 transition-colors hover:text-gray-400"
                >
                  Manage activity types →
                </Link>
              </div>
            </aside>

            {/* ── Right panel: activities ─────────────────── */}
            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {selectedPlatform ? (
                <div className="flex h-full flex-col overflow-hidden p-5">
                  {/* Platform title row */}
                  <div className="mb-4 flex shrink-0 items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gray-600 to-gray-900">
                      <SiGithub className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">
                        {selectedPlatform.title || selectedPlatform.id}
                      </h2>
                      <p className="text-[11px] text-gray-500">
                        GitHub · Connected
                      </p>
                    </div>
                    <span className="ml-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
                      <HiOutlineCheck className="mr-1 inline h-3 w-3" />
                      Connected
                    </span>
                  </div>

                  {/* Feed (fills rest of panel) */}
                  <div className="min-h-0 flex-1">
                    <PlatformView
                      key={selectedPlatform.id}
                      platform={selectedPlatform}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                  <HiOutlineDotsVertical className="h-8 w-8 text-gray-700" />
                  <p className="text-sm text-gray-500">Select a platform</p>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
