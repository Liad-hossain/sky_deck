import { createContext, useContext, useEffect, useState } from 'react';
import {
  apiFetch,
  loadSession,
  saveSession,
  clearSession,
} from '../api/session';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = loadSession();
      if (!session?.access_token) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { ok, data } = await apiFetch('/api/session');
      if (cancelled) return;
      if (ok && data?.data?.user) setUser(data.data.user);
      else {
        clearSession();
        setUser(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signUp = async (...args) => {
    const { email, password, fullName } =
      typeof args[0] === 'object' && args[0] !== null
        ? args[0]
        : { email: args[0], password: args[1], fullName: args[2] };
    const { ok, data, error } = await apiFetch('/api/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
    if (!ok) return { data: null, error: { message: error } };
    return { data: data?.data ?? null, error: null };
  };

  const signIn = async (...args) => {
    const { email, password } =
      typeof args[0] === 'object' && args[0] !== null
        ? args[0]
        : { email: args[0], password: args[1] };
    const { ok, data, error } = await apiFetch('/api/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!ok) return { data: null, error: { message: error } };
    const payload = data?.data;
    if (payload?.session) saveSession(payload.session);
    if (payload?.user) setUser(payload.user);
    return { data: payload, error: null };
  };

  const signOut = async () => {
    await apiFetch('/api/signout', { method: 'POST' });
    clearSession();
    setUser(null);
    return { error: null };
  };

  const forgotPassword = async (email) => {
    const { ok, error } = await apiFetch('/api/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return ok ? { error: null } : { error: { message: error } };
  };

  const resetPassword = async ({
    access_token,
    refresh_token,
    newPassword,
  }) => {
    const { ok, error } = await apiFetch('/api/reset-password', {
      method: 'POST',
      body: JSON.stringify({ access_token, refresh_token, newPassword }),
    });
    return ok ? { error: null } : { error: { message: error } };
  };

  const getProfile = async () => {
    const { ok, data, error } = await apiFetch('/api/profile');
    if (!ok) return { profile: null, error: { message: error } };
    // BE returns { data: profile } or { profile }; accept either.
    return { profile: data?.profile ?? data?.data ?? null, error: null };
  };

  const updateProfile = async (updates) => {
    const { ok, data, error } = await apiFetch('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (!ok) return { profile: null, error: { message: error } };
    return {
      profile: data?.profile ?? data?.data ?? null,
      error: null,
    };
  };

  const uploadAvatar = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const { ok, data, error } = await apiFetch('/api/upload/avatar', {
      method: 'POST',
      body: fd,
    });
    if (!ok) return { url: null, error: { message: error } };
    return { url: data?.url ?? null, error: null };
  };

  const getPlatforms = async () => {
    const { ok, data, error } = await apiFetch('/api/platforms');
    if (!ok) return { platforms: [], error: { message: error } };
    return { platforms: data?.platforms ?? [], error: null };
  };

  const connectPlatform = () => {
    window.location.href = '/api/platforms/github/install-redirect';
  };

  const updatePlatformTitle = async (platformId, title) => {
    const { ok, data, error } = await apiFetch('/api/platforms', {
      method: 'PATCH',
      body: JSON.stringify({ platformId, title }),
    });
    if (!ok) return { data: null, error: { message: error } };
    return { data: data?.data ?? null, error: null };
  };

  const disconnectPlatformById = async (platformId) => {
    const { ok, error } = await apiFetch(
      `/api/platforms/disconnect/${platformId}`,
      { method: 'POST' }
    );
    return ok ? { error: null } : { error: { message: error } };
  };

  const deletePlatformById = async (platformId) => {
    const { ok, error } = await apiFetch(
      `/api/platforms/delete/${platformId}`,
      { method: 'DELETE' }
    );
    return ok ? { error: null } : { error: { message: error } };
  };

  // Legacy name kept for Integrations.jsx caller.
  const deletePlatform = deletePlatformById;
  const disconnectPlatform = disconnectPlatformById;

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    forgotPassword,
    resetPassword,
    getProfile,
    updateProfile,
    uploadAvatar,
    getPlatforms,
    connectPlatform,
    updatePlatformTitle,
    disconnectPlatformById,
    deletePlatformById,
    disconnectPlatform,
    deletePlatform,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
