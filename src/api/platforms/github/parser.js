import { PullRequestOpenedSchema } from './schema';
import { ActivityTypes, ActivitySubTypes } from './constants';

export function parseGitHubWebhookPayload(eventType, rawPayload) {
  let document = null;
  try {
    if (
      eventType === ActivityTypes.PULL_REQUEST &&
      rawPayload?.action === ActivitySubTypes.PR_OPENED
    ) {
      document = PullRequestOpenedSchema.extract(rawPayload);
    }
  } catch (e) {
    console.log('Error in parseGitHubWebhookPayload:', e);
  }
  return document;
}
