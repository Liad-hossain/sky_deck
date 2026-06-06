// Backend profile + platforms processing.
import { fetchUserProfile, updateProfileFields } from '../../db/profiles.js';
import {
  fetchUserPlatforms,
  fetchPlatformById,
  updatePlatformById,
  disconnectPlatformById,
  archivePlatformById,
} from '../../db/platforms.js';
import { handleDisconnect } from '../platforms/github/handlers.js';
import {
  fetchGitHubActivities,
  countGitHubActivities,
} from '../../firestore/github_activities.js';
import {
  fetchActivityById,
  getActivitiesForPlatform,
  togglePlatformActivity,
  getSubTypesByActivityIds,
} from '../../db/activities.js';

export async function fetchProfile(userId) {
  try {
    const { profile } = await fetchUserProfile(userId);
    return { status: 200, body: { profile: profile ?? null } };
  } catch (e) {
    console.log('Error fetching profile:', e);
    return {
      status: 500,
      body: { error: 'Something went wrong while fetching profile.' },
    };
  }
}

export async function updateProfile(userId, body) {
  const updates = {};
  if (body?.full_name !== undefined) updates.full_name = body.full_name;
  if (body?.avatar_url !== undefined) updates.avatar_url = body.avatar_url;

  try {
    const { error } = await updateProfileFields(userId, updates);
    if (error) {
      console.log('Error updating profile:', error);
      return {
        status: 500,
        body: { error: 'Something went wrong while updating profile' },
      };
    }
  } catch (e) {
    console.log('Exception Error updating profile:', e);
    return {
      status: 500,
      body: { error: 'Something went wrong while updating profile' },
    };
  }

  return { status: 200, body: { success: true } };
}

export async function fetchPlatforms(userId, params = {}) {
  try {
    let result;
    if (params.is_connected !== undefined) {
      const flag =
        params.is_connected === 'true' || params.is_connected === true;
      result = await fetchUserPlatforms(userId, flag);
    } else {
      result = await fetchUserPlatforms(userId);
    }
    return { status: 200, body: { platforms: result.platforms ?? [] } };
  } catch (e) {
    console.log('Error fetching platforms:', e);
    return {
      status: 500,
      body: { error: 'Something went wrong while fetching platforms.' },
    };
  }
}

export async function updatePlatform(userId, { platformId, title } = {}) {
  if (!platformId)
    return { status: 400, body: { error: 'Missing platform id' } };
  if (!title)
    return { status: 400, body: { error: 'Platform title cannot be empty!!' } };

  try {
    const { error } = await updatePlatformById(userId, platformId, { title });
    if (error) {
      console.log('Error updating platform:', error);
      return {
        status: 500,
        body: { error: 'Something went wrong while updating platform' },
      };
    }
  } catch (e) {
    console.log('Exception Error updating platform:', e);
    return {
      status: 500,
      body: { error: 'Something went wrong while updating platform' },
    };
  }

  return { status: 200, body: { success: true } };
}

export async function disconnectPlatform(userId, platformId) {
  if (!platformId)
    return { status: 400, body: { error: 'Missing platform id' } };

  let platform = null;
  try {
    const r = await fetchPlatformById(userId, platformId);
    if (!r.platform)
      return { status: 404, body: { error: 'Platform not found' } };
    platform = r.platform;
    if (!platform.is_connected)
      return {
        status: 400,
        body: { error: 'Platform is already disconnected' },
      };
  } catch (e) {
    console.log('Error fetching platform for disconnect:', e);
    return {
      status: 500,
      body: { error: 'Something went wrong while fetching platform' },
    };
  }

  const { success } = await handleDisconnect(
    platform.platform_metadata?.installation_id
  );
  if (!success)
    return { status: 500, body: { error: 'Failed to disconnect platform' } };

  try {
    const { error } = await disconnectPlatformById(userId, platformId);
    if (error)
      return {
        status: 500,
        body: { error: 'Something went wrong while disconnecting platform' },
      };
  } catch (e) {
    return {
      status: 500,
      body: { error: 'Something went wrong while disconnecting platform' },
    };
  }

  return { status: 202, body: { success: true } };
}

export async function deletePlatform(userId, platformId) {
  let id = platformId;
  if (id && typeof id === 'object') id = id.id ?? null;
  if (!id || typeof id !== 'string')
    return { status: 400, body: { error: 'Missing or invalid platform id' } };

  try {
    const { error } = await archivePlatformById(userId, id);
    if (error) {
      console.log('Error archiving platform:', error);
      return {
        status: 500,
        body: { error: 'Something went wrong while deleting platform' },
      };
    }
  } catch (e) {
    console.log('Exception while deleting platform:', e);
    return {
      status: 500,
      body: { error: 'Something went wrong while deleting platform' },
    };
  }

  return { status: 200, body: { success: true } };
}

export async function fetchPlatformActivities(userId, platformId) {
  try {
    const { platform, error: pErr } = await fetchPlatformById(
      userId,
      platformId
    );

    if (pErr) {
      console.log('Error fetching platform:', pErr);
      return {
        status: 500,
        body: { error: 'Something went wrong while fetching platform' },
      };
    }
    if (!platform) {
      return { status: 404, body: { error: 'Platform not found' } };
    }

    const { data, error } = await getActivitiesForPlatform(
      platformId,
      platform.platform_type
    );
    if (error) {
      return { status: 500, body: { error } };
    }

    return { status: 200, body: { activities: data } };
  } catch (e) {
    console.log('Error fetching platform activities:', e);
    return { status: 500, body: { error: 'Something went wrong' } };
  }
}

export async function toggleActivity(userId, platformId, body) {
  const { activity_id: activityId, action } = body;
  if (!activityId || !['add', 'remove'].includes(action)) {
    return {
      status: 400,
      body: { error: 'activity_id and action (add|remove) required' },
    };
  }

  try {
    const { platform, error: pErr } = await fetchPlatformById(
      userId,
      platformId
    );
    if (pErr || !platform) {
      return { status: 404, body: { error: 'Platform not found' } };
    }

    const { error } = await togglePlatformActivity(
      platformId,
      activityId,
      action
    );
    if (error) {
      console.log('Error toggling platform activity:', error);
      return { status: 500, body: { error } };
    }

    return { status: 200, body: { success: true } };
  } catch (e) {
    console.log('Error toggling platform activity:', e);
    return { status: 500, body: { error: 'Something went wrong' } };
  }
}

export async function fetchSubTypesByActivityIds(activityIds = []) {
  if (!activityIds.length) {
    return { status: 400, body: { error: 'No activity_ids provided' } };
  }

  try {
    const { data, error } = await getSubTypesByActivityIds(activityIds);
    if (error) return { status: 500, body: { error } };
    let activitySubTypeMap = {};
    data.forEach((row) => {
      const { id, activity_id, sub_type, description, activity_type } = row;
      if (!activitySubTypeMap[activity_id]) {
        activitySubTypeMap[activity_id] = { activity_type, sub_types: [] };
      }
      activitySubTypeMap[activity_id].sub_types.push({
        id,
        sub_type,
        description,
      });
    });

    return {
      status: 200,
      body: { activities: Object.values(activitySubTypeMap) },
    };
  } catch (e) {
    console.log('Error fetching sub types by activity ids:', e);
    return { status: 500, body: { error: 'Something went wrong' } };
  }
}

const FEED_FETCHERS = {
  github: (userId, platformId, activityType, limit, offset, startTs, endTs) =>
    fetchGitHubActivities(
      userId,
      platformId,
      activityType,
      limit,
      offset,
      startTs,
      endTs
    ),
};

const FEED_COUNT_FETCHERS = {
  github: (userId, platformId, activityType, startTs, endTs) =>
    countGitHubActivities(userId, platformId, activityType, startTs, endTs),
};

export async function fetchPlatformActivityFeeds(
  userId,
  platformId,
  activityId,
  params = {}
) {
  // ── Parse & validate params ───────────────────────────────────────────────
  const limit = Math.min(parseInt(params.limit ?? '20', 10), 100);
  const offset = Math.max(parseInt(params.offset ?? '0', 10), 0);

  // Convert ISO UTC strings to Unix ms timestamps
  let startTs = null;
  let endTs = null;
  if (params.start) {
    startTs = new Date(params.start).getTime();
    if (isNaN(startTs)) {
      return {
        status: 400,
        body: {
          error:
            'Invalid start datetime. Use UTC ISO format e.g. 2026-06-05T00:00:00Z',
        },
      };
    }
  }
  if (params.end) {
    endTs = new Date(params.end).getTime();
    if (isNaN(endTs)) {
      return {
        status: 400,
        body: {
          error:
            'Invalid end datetime. Use UTC ISO format e.g. 2026-06-05T23:59:59Z',
        },
      };
    }
  }
  if (startTs !== null && endTs !== null && startTs > endTs) {
    return { status: 400, body: { error: 'start must be before end' } };
  }

  if (!platformId) {
    return { status: 400, body: { error: 'Missing platform_id' } };
  }
  const { platform, error } = await fetchPlatformById(userId, platformId);
  if (error) {
    console.log('Error fetching platform:', error);
    return {
      status: 500,
      body: { error: 'Something went wrong while fetching activitiy feeds' },
    };
  }

  if (!platform) {
    return { status: 404, body: { error: 'Platform not found' } };
  }

  const { activity, err } = await fetchActivityById(activityId);
  if (err) {
    console.log('Error fetching activity by id:', err);
    return {
      status: 500,
      body: { error: 'Something went wrong while fetching activity details' },
    };
  }

  if (!activity) {
    return { status: 404, body: { error: 'Activity not found' } };
  }

  if (activity.platform_type !== platform.platform_type) {
    return {
      status: 400,
      body: { error: 'Activity does not belong to the platform' },
    };
  }

  const fetcher = FEED_FETCHERS[platform.platform_type];
  const countFetcher = FEED_COUNT_FETCHERS[platform.platform_type];
  if (!fetcher || !countFetcher) {
    return {
      status: 400,
      body: { error: `Unsupported platform_type: ${platform.platform_type}` },
    };
  }

  try {
    const activities = await fetcher(
      userId,
      platformId,
      activity.activity_type,
      limit,
      offset,
      startTs,
      endTs
    );
    const total_count = await countFetcher(
      userId,
      platformId,
      activity.activity_type,
      startTs,
      endTs
    );
    return { status: 200, body: { activities, total_count, limit, offset } };
  } catch (e) {
    console.log(`Error fetching ${platform.platform_type} feed:`, e);
    return { status: 500, body: { error: 'Something went wrong' } };
  }
}
