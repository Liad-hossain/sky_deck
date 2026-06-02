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

// ──────────────── Profile ────────────────

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
      return {
        status: 500,
        body: { error: 'Something went wrong while updating profile' },
      };
    }
  } catch (e) {
    console.log('Error updating profile:', e);
    return {
      status: 500,
      body: { error: 'Something went wrong while updating profile' },
    };
  }

  return { status: 200, body: { success: true } };
}

// ──────────────── Platforms ────────────────

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
    if (error)
      return {
        status: 500,
        body: { error: 'Something went wrong while updating platform' },
      };
  } catch (e) {
    console.log('Error updating platform:', e);
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
    if (error)
      return {
        status: 500,
        body: { error: 'Something went wrong while deleting platform' },
      };
  } catch (e) {
    console.log('Exception while deleting platform:', e);
    return {
      status: 500,
      body: { error: 'Something went wrong while deleting platform' },
    };
  }

  return { status: 200, body: { success: true } };
}
