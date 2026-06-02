import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// Supabase recovery puts tokens in the URL hash:
//   #access_token=...&refresh_token=...&type=recovery
function parseHashTokens() {
  if (typeof window === 'undefined') return {};
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return {};
  const params = new URLSearchParams(hash);
  return {
    access_token: params.get('access_token') ?? '',
    refresh_token: params.get('refresh_token') ?? '',
    type: params.get('type') ?? '',
  };
}

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState(null);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = parseHashTokens();
    if (t.access_token && t.type === 'recovery') {
      setTokens(t);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tokens?.access_token) {
      toast.error('Recovery token missing — open the link from your email.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error } = await resetPassword({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      newPassword: password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated! Please sign in.');
      // Clear the hash so tokens aren't retained.
      window.history.replaceState(null, '', window.location.pathname);
      navigate('/signin');
    }
  };

  if (!tokens) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass w-full max-w-md rounded-3xl p-10 text-center"
        >
          <div className="mb-4 text-6xl">⏳</div>
          <h2 className="mb-3 text-xl font-bold text-white">
            Waiting for reset token…
          </h2>
          <p className="text-sm text-gray-400">
            Please open this page by clicking the link in your password reset
            email. If you arrived here directly, go back and request a new reset
            link.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="glass w-full max-w-md rounded-3xl p-10"
      >
        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl">🔒</div>
          <h1 className="text-2xl font-extrabold text-white">
            Set new password
          </h1>
          <p className="mt-2 text-gray-400">Choose a strong password.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-4 top-3.5 text-lg text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-white placeholder-gray-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-2.5 p-1.5 text-gray-400 transition hover:text-indigo-300"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <HiOutlineEyeOff className="text-lg" />
              ) : (
                <HiOutlineEye className="text-lg" />
              )}
            </button>
          </div>
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-4 top-3.5 text-lg text-gray-400" />
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-white placeholder-gray-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((p) => !p)}
              className="absolute right-3 top-2.5 p-1.5 text-gray-400 transition hover:text-indigo-300"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? (
                <HiOutlineEyeOff className="text-lg" />
              ) : (
                <HiOutlineEye className="text-lg" />
              )}
            </button>
          </div>

          {password.length > 0 && (
            <p
              className={`pl-1 text-xs ${password.length >= 8 ? 'text-emerald-400' : 'text-amber-400'}`}
            >
              {password.length < 6
                ? 'Too short'
                : password.length < 8
                  ? 'Acceptable — 8+ characters recommended'
                  : 'Strong password ✓'}
            </p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
