import {
  PullRequestOpenedSchema,
  PullRequestSynchronizeSchema,
  PullRequestClosedSchema,
  PullRequestEditedSchema,
  PullRequestReopenedSchema,
  PushActivitySchema,
  PullRequestReviewSubmittedSchema,
  PullRequestReviewEditedSchema,
  PullRequestReviewDismissedSchema,
} from './schema.js';
import { ActivityTypes, ActivitySubTypes } from './constants.js';

export function parseGitHubWebhookPayload(eventType, rawPayload) {
  let document = null;
  try {
    if (eventType === ActivityTypes.PULL_REQUEST) {
      if (rawPayload?.action === ActivitySubTypes.PR_OPENED) {
        document = PullRequestOpenedSchema.extract(rawPayload);
      } else if (rawPayload?.action === ActivitySubTypes.PR_SYNCHRONIZE) {
        document = PullRequestSynchronizeSchema.extract(rawPayload);
      } else if (rawPayload?.action === ActivitySubTypes.PR_CLOSED) {
        document = PullRequestClosedSchema.extract(rawPayload);
      } else if (rawPayload?.action === ActivitySubTypes.PR_REOPENED) {
        document = PullRequestReopenedSchema.extract(rawPayload);
      } else if (rawPayload?.action === ActivitySubTypes.PR_EDITED) {
        document = PullRequestEditedSchema.extract(rawPayload);
      }
    } else if (eventType === ActivityTypes.PUSH) {
      document = PushActivitySchema.extract(rawPayload);
    } else if (eventType === ActivityTypes.PULL_REQUEST_REVIEW) {
      if (rawPayload?.action === ActivitySubTypes.PR_REVIEW_SUBMITTED) {
        document = PullRequestReviewSubmittedSchema.extract(rawPayload);
      } else if (rawPayload?.action === ActivitySubTypes.PR_REVIEW_EDITED) {
        document = PullRequestReviewEditedSchema.extract(rawPayload);
      } else if (rawPayload?.action === ActivitySubTypes.PR_REVIEW_DISMISSED) {
        document = PullRequestReviewDismissedSchema.extract(rawPayload);
      }
    }
  } catch (e) {
    console.log('Error in parseGitHubWebhookPayload:', e);
  }
  return document;
}
