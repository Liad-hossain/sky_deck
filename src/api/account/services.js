import { fetchUserProfile, updateProfileFields } from '../../db/profiles.js';
import {
  fetchUserPlatforms,
  fetchPlatformById,
  updatePlatformById,
  disconnectPlatformById,
  archivePlatformById,
} from '../../db/platforms.js';
import { handleDisconnect } from '../platforms/github/handlers.js';

export async function fetchProfile(userId) {
  let data = null;
  try {
    const result = await fetchUserProfile(userId);
    data = result.profile;
  } catch (e) {
    return {
      status: 500,
      body: { error: 'Something went wrong while fetching profile.' },
    };
  }

  return { status: 200, body: { profile: data ?? null } };
}

export async function updateProfile(userId, body) {
  const updates = {};
  if (body.full_name) updates.full_name = body.full_name;
  if (body.avatar_url) updates.avatar_url = body.avatar_url;
  updates.updated_at = new Date().toISOString();

  try {
    await updateProfileFields(userId, updates);
  } catch (e) {
    return {
      status: 500,
      body: { error: 'Something went wrong while updating profile' },
    };
  }

  return { status: 200, body: { success: true } };
}

export async function fetchPlatforms(userId, params = {}) {
  let platforms = [];
  try {
    let result;
    if (params.is_connected !== undefined) {
      result = await fetchUserPlatforms(userId, params.is_connected);
    } else {
      result = await fetchUserPlatforms(userId);
    }
    platforms = result.platforms ?? [];
  } catch (e) {
    return {
      status: 500,
      body: { error: 'Something went wrong while fetching platforms.' },
    };
  }

  return { status: 200, body: { platforms: platforms ?? [] } };
}

export async function updatePlatform(userId, { platformId, title }) {
  if (!platformId)
    return { status: 400, body: { error: 'Missing platform id' } };

  if (!title)
    return { status: 400, body: { error: 'Platform title cannot be empty!!' } };

  try {
    await updatePlatformById(userId, platformId, { title });
  } catch (e) {
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
    platform = await fetchPlatformById(userId, platformId);
    if (!platform.platform) {
      return { status: 404, body: { error: 'Platform not found' } };
    }
    platform = platform.platform;

    if (!platform.is_connected) {
      return {
        status: 400,
        body: { error: 'Platform is already disconnected' },
      };
    }
  } catch (e) {
    return {
      status: 500,
      body: { error: 'Something went wrong while fetching platform' },
    };
  }

  const { success, error, status } = await handleDisconnect(
    platform.platform_metadata?.installation_id
  );
  if (!success)
    return { status: 500, body: { error: 'Failed to disconnect platform: ' } };

  try {
    await disconnectPlatformById(userId, platformId);
  } catch (e) {
    return {
      status: 500,
      body: { error: 'Something went wrong while disconnecting platform' },
    };
  }

  return { status: 202, body: { success: true } };
}

export async function deletePlatform(userId, platformId) {
  if (!platformId)
    return { status: 400, body: { error: 'Missing platform id' } };
  try {
    await archivePlatformById(userId, platformId);
  } catch (e) {
    return {
      status: 500,
      body: { error: 'Something went wrong while deleting platform' },
    };
  }

  return { status: 200, body: { success: true } };
}
