import { body, sub } from 'framer-motion/client';
import { ActivityTypes, ActivitySubTypes } from './constants.js';

export class RepositorySchema {
  static fields = {
    id: { path: 'repository.id', default: null },
    name: { path: 'repository.name', default: null },
    full_name: { path: 'repository.full_name', default: null },
    html_url: { path: 'repository.html_url', default: null },
    api_url: { path: 'repository.url', default: null },
    description: { path: 'repository.description', default: null },
    visibility: { path: 'repository.visibility', default: null },
    forks_count: { path: 'repository.forks_count', default: 0 },
    open_issues_count: { path: 'repository.open_issues_count', default: 0 },
    watchers_count: { path: 'repository.watchers_count', default: 0 },
  };
}

export class ActorSchema {
  static fields = {
    id: { path: 'sender.id', default: null },
    name: { path: 'sender.login', default: null },
    avatar_url: { path: 'sender.avatar_url', default: null },
    html_url: { path: 'sender.html_url', default: null },
    api_url: { path: 'sender.url', default: null },
  };
}

export class BaseSchema {
  static activity_type = null;
  static activity_sub_type = null;
  static summary = '<summary>';
  static timestamp = null;

  static commonGroups = {
    installation_id: { path: 'installation.id', default: null },
    repository: RepositorySchema,
    actor: ActorSchema,
  };

  static groups = {};

  static _get(obj, dotPath, fallback) {
    return (
      dotPath.split('.').reduce((acc, part) => acc?.[part], obj) ?? fallback
    );
  }

  static _resolveField(payload, def) {
    if (def && typeof def === 'object' && 'path' in def) {
      const value = this._get(payload, def.path, def.default);
      return typeof def.transform === 'function' ? def.transform(value) : value;
    }
    if (typeof def === 'function' && def.fields) {
      return this._resolveFields(payload, def.fields);
    }
    if (def && typeof def === 'object') {
      return this._resolveFields(payload, def);
    }
    return null;
  }

  static _resolveFields(payload, fields) {
    const result = {};
    for (const [key, def] of Object.entries(fields)) {
      result[key] = this._resolveField(payload, def);
    }
    return result;
  }

  static extract(payload) {
    const result = {
      activity_type: this.activity_type,
      activity_sub_type: this.activity_sub_type,
      summary: this.summary,
      timestamp: this.timestamp
        ? this._resolveField(payload, this.timestamp)
        : null,
    };

    for (const [key, def] of Object.entries(BaseSchema.commonGroups)) {
      result[key] = this._resolveField(payload, def);
    }

    for (const [key, def] of Object.entries(this.groups)) {
      result[key] = this._resolveField(payload, def);
    }
    return result;
  }
}

export class PullRequestSchema {
  static fields = {
    action: { path: 'action', default: null },
    id: { path: 'pull_request.id', default: null },
    api_url: { path: 'pull_request.url', default: null },
    html_url: { path: 'pull_request.html_url', default: null },
    number: { path: 'pull_request.number', default: null },
    patch_url: { path: 'pull_request.patch_url', default: null },
    state: { path: 'pull_request.state', default: null },
    locked: { path: 'pull_request.locked', default: false },
    title: { path: 'pull_request.title', default: null },
    body: { path: 'pull_request.body', default: null },
    created_at: { path: 'pull_request.created_at', default: null },
    updated_at: { path: 'pull_request.updated_at', default: null },
    closed_at: { path: 'pull_request.closed_at', default: null },
    merged_at: { path: 'pull_request.merged_at', default: null },
    assignees: { path: 'pull_request.assignees', default: [] },
    requested_reviewers: {
      path: 'pull_request.requested_reviewers',
      default: [],
    },
    requested_teams: { path: 'pull_request.requested_teams', default: [] },
    labels: { path: 'pull_request.labels', default: [] },
    is_draft: { path: 'pull_request.draft', default: false },
    is_merged: { path: 'pull_request.merged', default: false },
    mergeable: { path: 'pull_request.mergeable', default: false },
    rebaseable: { path: 'pull_request.rebaseable', default: false },
    mergeable_state: { path: 'pull_request.mergeable_state', default: null },
    comments: { path: 'pull_request.comments', default: 0 },
    review_comments: { path: 'pull_request.review_comments', default: 0 },
    commits: { path: 'pull_request.commits', default: 0 },
    additions: { path: 'pull_request.additions', default: 0 },
    deletions: { path: 'pull_request.deletions', default: 0 },
    changed_files: { path: 'pull_request.changed_files', default: 0 },
    milestone: {
      id: { path: 'pull_request.milestone.id', default: null },
      title: { path: 'pull_request.milestone.title', default: null },
    },
    head: {
      label: { path: 'pull_request.head.label', default: null },
      ref: { path: 'pull_request.head.ref', default: null },
    },
    base: {
      label: { path: 'pull_request.base.label', default: null },
      ref: { path: 'pull_request.base.ref', default: null },
    },
    merged_by: {
      id: { path: 'pull_request.merged_by.id', default: null },
      name: { path: 'pull_request.merged_by.login', default: null },
      avatar_url: { path: 'pull_request.merged_by.avatar_url', default: null },
      html_url: { path: 'pull_request.merged_by.html_url', default: null },
      api_url: { path: 'pull_request.merged_by.url', default: null },
    },
    changes: { path: 'changes', default: {} },
  };
}

export class PullRequestOpenedSchema extends BaseSchema {
  static activity_type = ActivityTypes.PULL_REQUEST;
  static activity_sub_type = ActivitySubTypes.PR_OPENED;
  static timestamp = {
    path: 'pull_request.created_at',
    default: null,
    transform: (v) => (v ? new Date(v).getTime() : null),
  };

  static groups = {
    pull_request: PullRequestSchema,
  };
}

export class PullRequestSynchronizeSchema extends BaseSchema {
  static activity_type = ActivityTypes.PULL_REQUEST;
  static activity_sub_type = ActivitySubTypes.PR_SYNCHRONIZE;
  static timestamp = {
    path: 'pull_request.updated_at',
    default: null,
    transform: (v) => (v ? new Date(v).getTime() : null),
  };

  static groups = {
    pull_request: PullRequestSchema,
  };
}

export class PullRequestClosedSchema extends BaseSchema {
  static activity_type = ActivityTypes.PULL_REQUEST;
  static activity_sub_type = ActivitySubTypes.PR_CLOSED;
  static timestamp = {
    path: 'pull_request.closed_at',
    default: null,
    transform: (v) => (v ? new Date(v).getTime() : null),
  };

  static groups = {
    pull_request: PullRequestSchema,
  };
}

export class PullRequestReopenedSchema extends BaseSchema {
  static activity_type = ActivityTypes.PULL_REQUEST;
  static activity_sub_type = ActivitySubTypes.PR_REOPENED;
  static timestamp = {
    path: 'pull_request.updated_at',
    default: null,
    transform: (v) => (v ? new Date(v).getTime() : null),
  };

  static groups = {
    pull_request: PullRequestSchema,
  };
}

export class PullRequestEditedSchema extends BaseSchema {
  static activity_type = ActivityTypes.PULL_REQUEST;
  static activity_sub_type = ActivitySubTypes.PR_EDITED;
  static timestamp = {
    path: 'pull_request.updated_at',
    default: null,
    transform: (v) => (v ? new Date(v).getTime() : null),
  };

  static groups = {
    pull_request: PullRequestSchema,
  };
}

export class CommitSchema {
  static fields = {
    id: { path: 'id', default: null },
    message: { path: 'message', default: null },
    timestamp: { path: 'timestamp', default: null },
    url: { path: 'url', default: null },
    added: { path: 'added', default: [] },
    removed: { path: 'removed', default: [] },
    modified: { path: 'modified', default: [] },
  };
}

export class PushEventSchema {
  static fields = {
    ref: { path: 'ref', default: null },
    before: { path: 'before', default: null },
    after: { path: 'after', default: null },
    created: { path: 'created', default: false },
    deleted: { path: 'deleted', default: false },
    forced: { path: 'forced', default: false },
    base_ref: { path: 'base_ref', default: null },
    compare_url: { path: 'compare', default: null },
    commits: {
      path: 'commits',
      default: [],
      transform: (commits) =>
        (commits ?? []).map((c) =>
          BaseSchema._resolveFields(c, CommitSchema.fields)
        ),
    },
  };
}

export class PushActivitySchema extends BaseSchema {
  static activity_type = ActivityTypes.PUSH;
  static activity_sub_type = ActivitySubTypes.PUSH;
  static timestamp = {
    path: 'head_commit.timestamp',
    default: null,
    transform: (v) => {
      if (!v) return null;
      const hasOffset = /[Zz]|[+\-]\d{2}:?\d{2}$/.test(v);
      const normalized = hasOffset ? v : `${v}Z`;
      const ms = new Date(normalized).getTime();
      return isNaN(ms) ? null : ms;
    },
  };

  static groups = {
    push_event: PushEventSchema,
  };
}

class PullRequestReviewSchema {
  static fields = {
    author_association: { path: 'review.author_association', default: null },
    body: { path: 'review.body', default: null },
    commit_id: { path: 'review.commit_id', default: null },
    html_url: { path: 'review.html_url', default: null },
    id: { path: 'review.id', default: null },
    pull_request_url: { path: 'review.pull_request_url', default: null },
    pull_request_title: { path: 'pull_request.title', default: null },
    state: { path: 'review.state', default: null },
    submitted_at: { path: 'review.submitted_at', default: null },
    updated_at: { path: 'review.updated_at', default: null },
  };
}

export class PullRequestReviewSubmittedSchema extends BaseSchema {
  static activity_type = ActivityTypes.PULL_REQUEST_REVIEW;
  static activity_sub_type = ActivitySubTypes.PR_REVIEW_SUBMITTED;
  static timestamp = {
    path: 'pull_request_review.submitted_at',
    default: null,
    transform: (v) => (v ? new Date(v).getTime() : null),
  };

  static groups = {
    pull_request_review: PullRequestReviewSchema,
  };
}
