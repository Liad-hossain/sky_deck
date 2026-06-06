import {
  PullRequestOpenedSchema,
  PullRequestSynchronizeSchema,
  PullRequestClosedSchema,
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
      }
    }
  } catch (e) {
    console.log('Error in parseGitHubWebhookPayload:', e);
  }
  return document;
}
