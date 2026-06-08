import {
  fetchUserProfile,
  updateProfileFields,
  searchProfilesByEmail,
} from '../../db/profiles.js';
import {
  fetchUserPlatforms,
  fetchPlatformById,
  fetchPlatformByAnyId,
  fetchPlatformUsers,
  updatePlatformById,
  disconnectPlatformById,
  archivePlatformById,
  createOrUpdateInvitedPlatform,
} from '../../db/platforms.js';
import { handleDisconnect } from '../platforms/github/handlers.js';
import { checkGitHubOrgMembership } from '../platforms/github/github_auth.js';
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
import { sendInvitationEmail } from '../externals/email_service.js';

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
    if (error) {
      console.log('Error fetching sub types by activity ids:', error);
      return { status: 500, body: { error: 'Something went wrong' } };
    }
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
  const limit = Math.min(parseInt(params.limit ?? '20', 10), 100);
  const offset = Math.max(parseInt(params.offset ?? '0', 10), 0);

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

export async function inviteUserToPlatform(userId, platformId, body = {}) {
  const githubUserId = body?.github_user_id;
  const githubLogin = body?.github_login;
  const targetUserId = userId;

  if (!platformId) {
    return { status: 400, body: { error: 'Missing platform id' } };
  }
  if (!targetUserId) {
    return { status: 400, body: { error: 'Missing user id' } };
  }
  if (!githubUserId) {
    return {
      status: 400,
      body: { error: 'github_user_id is required' },
    };
  }
  if (!githubLogin) {
    return {
      status: 400,
      body: { error: 'github_login is required' },
    };
  }

  try {
    const { profile, error: userErr } = await fetchUserProfile(targetUserId);
    if (userErr) {
      console.log('Error fetching target user for invite:', userErr);
      return {
        status: 500,
        body: { error: 'Something went wrong while fetching target user' },
      };
    }
    if (!profile) {
      return { status: 404, body: { error: 'Target user not found' } };
    }

    const { platform, error } = await fetchPlatformByAnyId(platformId);
    if (error) {
      console.log('Error fetching platform for invite:', error);
      return {
        status: 500,
        body: { error: 'Something went wrong while fetching platform' },
      };
    }
    if (!platform) {
      return { status: 404, body: { error: 'Platform not found' } };
    }

    if (platform.platform_type !== 'github') {
      return {
        status: 400,
        body: { error: 'Only github platform invite is supported for now' },
      };
    }

    const accountType =
      platform?.platform_metadata?.installation_details?.account?.type ??
      platform?.user_metadata?.account_type ??
      null;

    if (String(accountType).toLowerCase() !== 'organization') {
      return {
        status: 400,
        body: {
          error:
            'Invite is allowed only for github organization platforms right now',
        },
      };
    }

    const installationId = platform.platform_metadata?.installation_id;
    const orgLogin =
      platform.platform_metadata?.installation_details?.account?.login ??
      platform.user_metadata?.login ??
      null;

    if (!installationId || !orgLogin) {
      return {
        status: 500,
        body: {
          error:
            'Platform is missing GitHub installation details — cannot verify org membership',
        },
      };
    }

    const { isMember, error: memberErr } = await checkGitHubOrgMembership(
      installationId,
      orgLogin,
      githubLogin
    );

    if (memberErr) {
      console.log('Error checking GitHub org membership:', memberErr);
      return {
        status: 500,
        body: { error: 'Failed to verify organization membership on GitHub' },
      };
    }

    if (!isMember) {
      return {
        status: 403,
        body: {
          error: `User @${githubLogin} is not a member of the GitHub organization "${orgLogin}"`,
        },
      };
    }

    const { platform: invitedPlatform, error: upsertErr } =
      await createOrUpdateInvitedPlatform(targetUserId, platform, githubUserId);

    if (upsertErr) {
      console.log('Error creating invited platform:', upsertErr);
      return {
        status: 500,
        body: { error: 'Something went wrong while creating invited platform' },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        platform: invitedPlatform,
        invited: {
          target_user_id: targetUserId,
          github_user_id: githubUserId,
        },
      },
    };
  } catch (e) {
    console.log('Error inviting user to platform:', e);
    return {
      status: 500,
      body: { error: 'Something went wrong while inviting user' },
    };
  }
}

export async function getPlatformUsers(userId, platformId) {
  try {
    const { platform, error: pErr } = await fetchPlatformById(
      userId,
      platformId
    );
    if (pErr) {
      return { status: 500, body: { error: 'Error fetching platform' } };
    }
    if (!platform) {
      return { status: 404, body: { error: 'Platform not found' } };
    }

    const { users, error } = await fetchPlatformUsers(
      platform.primary_id,
      platform.platform_type
    );
    if (error) {
      console.log('Error fetching platform users:', error);
      return { status: 500, body: { error: 'Error fetching platform users' } };
    }

    const result = users.map((u) => ({
      platform_row_id: u.id,
      user_id: u.user_id,
      is_connected: u.is_connected,
      connected_at: u.connected_at,
      email: u.profiles?.email ?? null,
      full_name: u.profiles?.full_name ?? null,
      avatar_url: u.profiles?.avatar_url ?? null,
    }));

    return { status: 200, body: { users: result, platform } };
  } catch (e) {
    console.log('Error in getPlatformUsers:', e);
    return { status: 500, body: { error: 'Something went wrong' } };
  }
}

export async function searchUsers(keyword) {
  try {
    const { profiles, error } = await searchProfilesByEmail(keyword);
    if (error) {
      console.log('Error searching users:', error);
      return { status: 500, body: { error: 'Search failed' } };
    }
    return { status: 200, body: { users: profiles } };
  } catch (e) {
    console.log('Error in searchUsers:', e);
    return { status: 500, body: { error: 'Something went wrong' } };
  }
}

export async function sendPlatformInvites(userId, platformId, body = {}) {
  const { user_ids = [] } = body;

  if (!platformId) {
    return { status: 400, body: { error: 'Missing platform id' } };
  }
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return { status: 400, body: { error: 'user_ids array is required' } };
  }

  try {
    const { platform, error: pErr } = await fetchPlatformById(
      userId,
      platformId
    );
    if (pErr) {
      return { status: 500, body: { error: 'Error fetching platform' } };
    }
    if (!platform) {
      return { status: 404, body: { error: 'Platform not found' } };
    }

    if (platform.platform_type !== 'github') {
      return {
        status: 400,
        body: { error: 'Only github platform invite is supported' },
      };
    }

    const accountType =
      platform?.platform_metadata?.installation_details?.account?.type ??
      platform?.user_metadata?.account_type ??
      null;

    if (String(accountType).toLowerCase() !== 'organization') {
      return {
        status: 400,
        body: { error: 'Invite is only available for organization accounts' },
      };
    }

    const { profile: inviterProfile } = await fetchUserProfile(userId);
    const inviterName =
      inviterProfile?.full_name || inviterProfile?.email || 'A team member';

    const results = [];
    for (const targetId of user_ids) {
      const { profile: targetProfile, error: tErr } =
        await fetchUserProfile(targetId);
      if (tErr || !targetProfile) {
        results.push({
          user_id: targetId,
          success: false,
          error: 'User not found',
        });
        continue;
      }

      const emailResult = await sendInvitationEmail({
        toEmail: targetProfile.email,
        inviterName,
        platformTitle: platform.title || platform.platform_type,
        platformId,
      });

      results.push({
        user_id: targetId,
        email: targetProfile.email,
        success: emailResult.success,
        error: emailResult.error ?? null,
      });
    }

    return { status: 200, body: { success: true, results } };
  } catch (e) {
    console.log('Error sending platform invites:', e);
    return { status: 500, body: { error: 'Something went wrong' } };
  }
}
