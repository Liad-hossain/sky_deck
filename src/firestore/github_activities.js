import { getFirestoreClient } from './client.js';

const COLLECTION = 'github_activities';

function toFields(data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string') fields[k] = { stringValue: v };
    else if (typeof v === 'number') fields[k] = { integerValue: String(v) };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (v == null) fields[k] = { nullValue: null };
    else fields[k] = { stringValue: JSON.stringify(v) };
  }
  return fields;
}

function fromFields(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields)) {
    if ('stringValue' in v) obj[k] = v.stringValue;
    else if ('integerValue' in v) obj[k] = Number(v.integerValue);
    else if ('booleanValue' in v) obj[k] = v.booleanValue;
    else if ('nullValue' in v) obj[k] = null;
    else obj[k] = v;
  }
  return obj;
}

export async function insertGitHubActivity(activity) {
  const { token, projectId } = await getFirestoreClient();

  const doc = {
    ...activity,
    payload: JSON.stringify(activity.payload), // always store as string
    created_at: new Date().toISOString(),
  };

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${COLLECTION}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFields(doc) }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore insert failed: ${err}`);
  }

  const created = await res.json();
  // Document name format: projects/{proj}/databases/(default)/documents/{col}/{id}
  const id = created.name.split('/').pop();
  return { id, data: fromFields(created.fields) };
}

export async function fetchGitHubActivities(skyDeckUserId, limit = 50) {
  const { token, projectId } = await getFirestoreClient();

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

  const body = {
    structuredQuery: {
      from: [{ collectionId: COLLECTION }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'sky_deck_user_id' },
          op: 'EQUAL',
          value: { stringValue: skyDeckUserId },
        },
      },
      orderBy: [
        { field: { fieldPath: 'occurred_at' }, direction: 'DESCENDING' },
      ],
      limit,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore query failed: ${err}`);
  }

  const rows = await res.json();

  return rows
    .filter((r) => r.document)
    .map((r) => ({
      id: r.document.name.split('/').pop(),
      data: fromFields(r.document.fields),
    }));
}
