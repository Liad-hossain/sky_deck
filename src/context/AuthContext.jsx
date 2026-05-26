import { createContext, useContext, useEffect, useState } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  supabaseConfigError,
} from '../lib/supabase';
import { uploadToCloudinary } from '../lib/cloudinary';
import { redirectToGitHubInstall } from '../integrations/github/index.js';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const timeout = setTimeout(() => setLoading(false), 8000);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
        clearTimeout(timeout);
      })
      .catch(() => {
        setLoading(false);
        clearTimeout(timeout);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false); // always unblock on any auth state change
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signUp = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      return { data: null, error: new Error(supabaseConfigError) };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });
    return { data, error };
  };

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      return { data: null, error: new Error(supabaseConfigError) };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error(supabaseConfigError) };
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const forgotPassword = async (email) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error(supabaseConfigError) };
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  };

  const resetPassword = async (newPassword) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error(supabaseConfigError) };
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  };

  const uploadAvatar = async (file) => {
    if (!user) {
      return { url: null, error: new Error('Not authenticated') };
    }
    try {
      const url = await uploadToCloudinary(file);
      const { error: saveError } = await updateProfile({ avatar_url: url });
      if (saveError) return { url: null, error: saveError };
      return { url, error: null };
    } catch (error) {
      return { url: null, error };
    }
  };

  const updateProfile = async ({ full_name, avatar_url }) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Not authenticated') };
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { error: new Error('Not authenticated') };
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ full_name, avatar_url }),
    });
    const data = await res.json();
    return { error: data.error ? new Error(data.error) : null };
  };

  const getProfile = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return { profile: null, error: new Error('Not authenticated') };
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session)
      return { profile: null, error: new Error('Not authenticated') };
    const res = await fetch('/api/profile', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    return {
      profile: data.profile ?? null,
      error: data.error ? new Error(data.error) : null,
    };
  };

  const getPlatforms = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return { platforms: [], error: new Error('Not authenticated') };
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session)
      return { platforms: [], error: new Error('Not authenticated') };
    const res = await fetch('/api/platforms', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    return {
      platforms: data.platforms ?? [],
      error: data.error ? new Error(data.error) : null,
    };
  };

  // getConnectedPlatforms removed - not used anywhere in the codebase

  const connectPlatform = async (platformType) => {
    if (platformType === 'github') {
      redirectToGitHubInstall();
      return { error: null };
    }

    return {
      error: new Error(
        'connectPlatform must be performed via server-side install flow'
      ),
    };
  };

  const disconnectPlatform = async (platformType) => {
    if (!isSupabaseConfigured || !supabase || !user) {
      return { error: new Error('Not authenticated') };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const listRes = await fetch('/api/platforms', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const listData = await listRes.json().catch(() => ({}));
    const row = (listData.platforms ?? []).find(
      (p) =>
        p.platform_type === platformType && p.is_connected && !p.is_archived
    );
    if (!row) return { error: new Error('No connected platform found') };

    const res = await fetch(`/api/platforms/disconnect/${row.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    return { error: data.error ? new Error(data.error) : null };
  };

  const updatePlatformTitle = async (id, title) => {
    if (!isSupabaseConfigured || !supabase)
      return { error: new Error('Not authenticated') };
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { error: new Error('Not authenticated') };
    const res = await fetch('/api/platforms', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ platformId: id, title }),
    });
    const data = await res.json();
    return { error: data.error ? new Error(data.error) : null };
  };

  const disconnectPlatformByIdClient = async (id) => {
    if (!isSupabaseConfigured || !supabase)
      return { error: new Error('Not authenticated') };
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { error: new Error('Not authenticated') };
    const res = await fetch(`/api/platforms/disconnect/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    return { error: data.error ? new Error(data.error) : null };
  };

  const deletePlatformByIdClient = async (id) => {
    if (!isSupabaseConfigured || !supabase)
      return { error: new Error('Not authenticated') };
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { error: new Error('Not authenticated') };
    const res = await fetch(`/api/platforms/delete/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    return { error: data.error ? new Error(data.error) : null };
  };

  const deletePlatform = async (platformType) => {
    if (!isSupabaseConfigured || !supabase || !user) {
      return { error: new Error('Not authenticated') };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch('/api/platforms', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    const row = (data.platforms ?? []).find(
      (p) => p.platform_type === platformType && !p.is_archived
    );
    if (!row) return { error: new Error('Platform not found') };
    if (row.is_connected)
      return { error: new Error('Please disconnect before deleting.') };
    return deletePlatformByIdClient(row.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
        forgotPassword,
        resetPassword,
        uploadAvatar,
        updateProfile,
        getProfile,
        getPlatforms,
        connectPlatform,
        disconnectPlatform,
        updatePlatformTitle,
        disconnectPlatformById: disconnectPlatformByIdClient,
        deletePlatformById: deletePlatformByIdClient,
        deletePlatform,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
