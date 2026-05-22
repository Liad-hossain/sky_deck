import { createContext, useContext, useEffect, useState } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  supabaseConfigError,
} from '../lib/supabase';
import { uploadToCloudinary } from '../lib/cloudinary';

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

    const updates = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updates.full_name = full_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    return { error };
  };

  // Fetch the profile row for the current user
  const getProfile = async () => {
    if (!isSupabaseConfigured || !supabase || !user) {
      return { profile: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return { profile: data, error };
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
