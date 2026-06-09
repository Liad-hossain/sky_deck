import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
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
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // ── Session init ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = loadSession();
      if (!session?.access_token) {
        if (!cancelled) {
          setLoading(false);
          setProfileLoading(false);
        }
        return;
      }
      const { ok, data } = await apiFetch('/api/session');
      if (cancelled) return;
      if (ok && data?.data?.user) {
        setUser(data.data.user);
      } else {
        clearSession();
        setUser(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setProfile(null);
    };
    window.addEventListener('sky-deck:session-expired', handleExpired);
    return () =>
      window.removeEventListener('sky-deck:session-expired', handleExpired);
  }, []);

  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      const { ok, data } = await apiFetch('/api/account/profile');
      if (cancelled) return;
      if (ok) setProfile(data?.profile ?? data?.data ?? null);
      setProfileLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ── Refresh helpers (for after mutations) ──
  const refreshProfile = useCallback(async () => {
    const { ok, data } = await apiFetch('/api/account/profile');
    if (ok) setProfile(data?.profile ?? data?.data ?? null);
    return ok
      ? { profile: data?.profile ?? data?.data ?? null, error: null }
      : { profile: null, error: 'Failed' };
  }, []);

  const refreshPlatforms = useCallback(async () => {
    const { ok, data } = await apiFetch('/api/account/platforms');
    return ok
      ? { platforms: data?.platforms ?? [], error: null }
      : { platforms: [], error: 'Failed' };
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

  const resendConfirmation = async (email) => {
    const { ok, error } = await apiFetch('/api/resend-confirmation', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return ok ? { error: null } : { error: { message: error } };
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

  const getProfile = useCallback(async () => {
    return { profile, error: null };
  }, [profile]);

  const updateProfile = async (updates) => {
    const { ok, data, error } = await apiFetch('/api/account/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (!ok) return { profile: null, error: { message: error } };
    const updated = data?.profile ?? data?.data ?? null;
    setProfile(updated);
    return { profile: updated, error: null };
  };

  const uploadAvatar = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const { ok, data, error } = await apiFetch('/api/upload/avatar', {
      method: 'POST',
      body: fd,
    });
    if (!ok) return { url: null, error: { message: error } };
    const url = data?.url ?? null;
    if (url) setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    return { url, error: null };
  };

  const getPlatforms = useCallback(async () => {
    const { ok, data, error } = await apiFetch('/api/account/platforms');
    if (!ok) return { platforms: [], error: { message: error } };
    return { platforms: data?.platforms ?? [], error: null };
  }, []);

  const connectPlatform = () => {
    window.location.href = '/api/platforms/github/install-redirect';
  };

  const updatePlatformTitle = async (platformId, title) => {
    const { ok, data, error } = await apiFetch('/api/account/platforms', {
      method: 'PATCH',
      body: JSON.stringify({ platformId, title }),
    });
    if (!ok) return { data: null, error: { message: error } };
    return { data: data?.data ?? null, error: null };
  };

  const disconnectPlatformById = async (platformId) => {
    const { ok, error } = await apiFetch(
      `/api/account/platforms/disconnect/${platformId}`,
      { method: 'POST' }
    );
    return ok ? { error: null } : { error: { message: error } };
  };

  const deletePlatformById = async (platformId) => {
    const { ok, error } = await apiFetch(
      `/api/account/platforms/delete/${platformId}`,
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
    profile,
    profileLoading,
    signUp,
    signIn,
    signOut,
    forgotPassword,
    resetPassword,
    resendConfirmation,
    getProfile,
    updateProfile,
    uploadAvatar,
    getPlatforms,
    refreshProfile,
    refreshPlatforms,
    connectPlatform,
    updatePlatformTitle,
    disconnectPlatformById,
    deletePlatformById,
    disconnectPlatform,
    deletePlatform,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
