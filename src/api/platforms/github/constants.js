export class ActivityTypes {
  static PULL_REQUEST = 'pull_request';
  static PUSH = 'push';
  static PULL_REQUEST_REVIEW = 'pull_request_review';
}

export class ActivitySubTypes {
  // Pull Request sub-types
  static PR_OPENED = 'opened';
  static PR_CLOSED = 'closed';
  static PR_REOPENED = 'reopened';
  static PR_SYNCHRONIZE = 'synchronize';
  static PR_EDITED = 'edited';

  // Push sub-types
  static PUSH = 'push';

  // Pull Request Review sub-types
  static PR_REVIEW_SUBMITTED = 'submitted';
  static PR_REVIEW_EDITED = 'edited';
  static PR_REVIEW_DISMISSED = 'dismissed';
}
