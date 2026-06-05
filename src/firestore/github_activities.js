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

export async function insertGitHubActivity(document) {
  const { token, projectId } = await getFirestoreClient();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${COLLECTION}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFields({ ...document }) }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore insert failed: ${err}`);
  }

  const created = await res.json();
  const id = created.name.split('/').pop();
  return { id, data: fromFields(created.fields) };
}

export async function fetchGitHubActivities(
  skyDeckUserId,
  platformId,
  activityType,
  limit = 20,
  offset = 0
) {
  const { token, projectId } = await getFirestoreClient();

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

  const body = {
    structuredQuery: {
      from: [{ collectionId: COLLECTION }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'sky_deck_user_id' },
                op: 'EQUAL',
                value: { stringValue: skyDeckUserId },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: 'platform_id' },
                op: 'EQUAL',
                value: { stringValue: platformId },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: 'activity_type' },
                op: 'EQUAL',
                value: { stringValue: activityType },
              },
            },
          ],
        },
      },
      orderBy: [
        { field: { fieldPath: 'occurred_at' }, direction: 'DESCENDING' },
      ],
      offset,
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
      ...fromFields(r.document.fields),
    }));
}

export async function countGitHubActivities(
  skyDeckUserId,
  platformId,
  activityType
) {
  const { token, projectId } = await getFirestoreClient();

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runAggregationQuery`;

  const body = {
    structuredAggregationQuery: {
      structuredQuery: {
        from: [{ collectionId: COLLECTION }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'sky_deck_user_id' },
                  op: 'EQUAL',
                  value: { stringValue: skyDeckUserId },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'platform_id' },
                  op: 'EQUAL',
                  value: { stringValue: platformId },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'activity_type' },
                  op: 'EQUAL',
                  value: { stringValue: activityType },
                },
              },
            ],
          },
        },
      },
      aggregations: [{ alias: 'count', count: {} }],
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
    throw new Error(`Firestore aggregation query failed: ${err}`);
  }

  const rows = await res.json();
  const count = rows?.[0]?.result?.aggregateFields?.count?.integerValue;
  return Number(count ?? 0);
}
