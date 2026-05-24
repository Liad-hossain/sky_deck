import { createContext, useContext, useEffect, useState } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  supabaseConfigError,
} from '../lib/supabase';
import { uploadToCloudinary } from '../lib/cloudinary';
import {
  fetchProfile,
  updateProfileFields,
  fetchAllPlatforms,
  fetchConnectedPlatforms,
  insertOrUpdatePlatformConnection,
  removePlatformConnection,
  archivePlatform,
} from '../db';

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

    // Safety timeout — if getSession never resolves (network issue etc.)
    // we still stop showing the spinner after 8 seconds.
    const timeout = setTimeout(() => setLoading(false), 8000);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
        clearTimeout(timeout);
      })
      .catch(() => {
        // Network / Supabase error — clear loading so the app renders
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

  // Upload avatar to Cloudinary and update profile row
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

  // Update full_name and/or avatar_url in public.profiles
  const updateProfile = async ({ full_name, avatar_url }) => {
    if (!isSupabaseConfigured || !supabase || !user) {
      return { error: new Error('Not authenticated') };
    }
    return updateProfileFields(user.id, { full_name, avatar_url });
  };

  // Fetch the profile row for the current user
  const getProfile = async () => {
    if (!isSupabaseConfigured || !supabase || !user) {
      return { profile: null, error: new Error('Not authenticated') };
    }
    return fetchProfile(user.id);
  };

  // Fetch all non-archived platform rows (connected + disconnected)
  const getPlatforms = async () => {
    if (!isSupabaseConfigured || !supabase || !user) {
      return { platforms: [], error: new Error('Not authenticated') };
    }
    return fetchAllPlatforms(user.id);
  };

  // Fetch only actively connected platforms
  const getConnectedPlatforms = async () => {
    if (!isSupabaseConfigured || !supabase || !user) {
      return { platforms: [], error: new Error('Not authenticated') };
    }
    return fetchConnectedPlatforms(user.id);
  };

  // Upsert a platform connection (connect / re-connect)
  const connectPlatform = async (
    platformType,
    primaryId,
    accessToken = null,
    refreshToken = null,
    userMetadata = {},
    platformMetadata = {}
  ) => {
    if (!isSupabaseConfigured || !supabase || !user) {
      return { error: new Error('Not authenticated') };
    }
    return insertOrUpdatePlatformConnection(
      user.id,
      platformType,
      primaryId,
      accessToken,
      refreshToken,
      userMetadata,
      platformMetadata
    );
  };

  // Mark a platform as disconnected (keeps the row for audit)
  const disconnectPlatform = async (platformType) => {
    if (!isSupabaseConfigured || !supabase || !user) {
      return { error: new Error('Not authenticated') };
    }
    return removePlatformConnection(user.id, platformType);
  };

  // Soft-delete a platform (sets is_archived = true, row is never removed)
  // Platform must be disconnected first.
  const deletePlatform = async (platformType) => {
    if (!isSupabaseConfigured || !supabase || !user) {
      return { error: new Error('Not authenticated') };
    }
    return archivePlatform(user.id, platformType);
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
        getConnectedPlatforms,
        connectPlatform,
        disconnectPlatform,
        deletePlatform,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
