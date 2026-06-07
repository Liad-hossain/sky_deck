import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { upsertActivity, upsertSubTypes } from '../../../db/activities.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const activitiesData = JSON.parse(
  readFileSync(join(__dirname, 'activities.json'), 'utf-8')
);

async function syncGitHubActivities() {
  const platformType = 'github';
  const results = [];
  const errors = [];

  for (const [, entry] of Object.entries(activitiesData)) {
    const { activity_type, sub_types } = entry;

    const { activity, error: actError } = await upsertActivity(
      platformType,
      activity_type
    );
    if (actError) {
      errors.push(`${activity_type}: ${actError}`);
      continue;
    }

    const mapped = (sub_types ?? []).map((st) => ({
      sub_type: st.name,
      description: st.description ?? '',
    }));

    if (mapped.length) {
      const { error: subError } = await upsertSubTypes(activity.id, mapped);
      if (subError) {
        errors.push(`${activity_type} sub_types: ${subError}`);
        continue;
      }
    }

    results.push({
      activity_type,
      id: activity.id,
      subTypesCount: mapped.length,
    });
  }

  return { results, errors };
}

const { results, errors } = await syncGitHubActivities();
console.log('Synced:', results);
if (errors.length) console.error('Errors:', errors);
