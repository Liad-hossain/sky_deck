import { PullRequestOpenedSchema } from './schema';
import { ActivityTypes, ActivitySubTypes } from './constants';

export function parseGitHubWebhookPayload(eventType, rawPayload) {
  let activity = null;
  try {
    if (
      eventType === ActivityTypes.PULL_REQUEST &&
      rawPayload?.action === ActivitySubTypes.PR_OPENED
    ) {
      activity = PullRequestOpenedSchema.extract(rawPayload);
    }
  } catch (e) {
    console.log('Error in parseGitHubWebhookPayload:', e);
  }
  return activity;
}
