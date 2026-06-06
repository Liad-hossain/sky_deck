import {
  PullRequestOpenedSchema,
  PullRequestSynchronizeSchema,
  PullRequestClosedSchema,
  PullRequestEditedSchema,
  PullRequestReopenedSchema,
  PushActivitySchema,
} from './schema';
import { ActivityTypes, ActivitySubTypes } from './constants';

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
    }
  } catch (e) {
    console.log('Error in parseGitHubWebhookPayload:', e);
  }
  return document;
}
