import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiCheck,
  HiX,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// ── Password strength rules ──────────────────────────────────
const RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  {
    id: 'uppercase',
    label: 'One uppercase letter (A–Z)',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter (a–z)',
    test: (p) => /[a-z]/.test(p),
  },
  { id: 'number', label: 'One number (0–9)', test: (p) => /[0-9]/.test(p) },
  {
    id: 'special',
    label: 'One special character (!@#$…)',
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

function getStrength(password) {
  const passed = RULES.filter((r) => r.test(password)).length;
  if (passed <= 1)
    return { score: passed, label: 'Very weak', color: 'bg-red-500' };
  if (passed === 2)
    return { score: passed, label: 'Weak', color: 'bg-orange-500' };
  if (passed === 3)
    return { score: passed, label: 'Fair', color: 'bg-yellow-500' };
  if (passed === 4)
    return { score: passed, label: 'Strong', color: 'bg-blue-500' };
  return { score: passed, label: 'Very strong', color: 'bg-emerald-500' };
}

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { signUp } = useAuth();

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleResend = async () => {
    setResending(true);
    const { error } = await signUp(email, password);
    setResending(false);
    if (error && !error.message.toLowerCase().includes('already registered')) {
      toast.error(error.message);
    } else {
      toast.success('Verification email resent!');
      setResendCooldown(60); // 60-second cooldown
    }
  };

  const strength = useMemo(() => getStrength(password), [password]);
  const allRulesPassed = RULES.every((r) => r.test(password));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!allRulesPassed) {
      toast.error('Please choose a stronger password');
      setPasswordTouched(true);
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass w-full max-w-md rounded-3xl p-10 text-center"
        >
          <div className="mb-4 text-6xl">✉️</div>
          <h2 className="mb-3 text-2xl font-bold text-white">
            Check your inbox!
          </h2>
          <p className="mb-2 text-gray-300">
            We sent a verification link to{' '}
            <span className="break-all font-medium text-indigo-400">
              {email}
            </span>
            .
          </p>
          <p className="mb-8 text-sm text-gray-500">
            Click the link in the email to activate your account. Check your
            spam folder if you don't see it within a few minutes.
          </p>

          {/* Resend button */}
          <motion.button
            whileHover={{ scale: resendCooldown > 0 ? 1 : 1.02 }}
            whileTap={{ scale: resendCooldown > 0 ? 1 : 0.98 }}
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="mb-4 w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {resending
              ? 'Resending…'
              : resendCooldown > 0
                ? `Resend available in ${resendCooldown}s`
                : 'Resend Verification Email'}
          </motion.button>

          <Link
            to="/signin"
            className="inline-block text-sm text-gray-400 transition hover:text-indigo-300"
          >
            ← Back to Sign In
          </Link>
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
          <h1 className="gradient-text text-3xl font-extrabold">Sky Deck</h1>
          <p className="mt-2 text-gray-400">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <HiOutlineMail className="absolute left-4 top-3.5 text-lg text-gray-400" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-white placeholder-gray-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-4 top-3.5 text-lg text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordTouched(true);
              }}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-white placeholder-gray-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
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

          {/* Strength meter — shown as soon as user starts typing */}
          <AnimatePresence>
            {passwordTouched && password.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-2 px-1"
              >
                {/* Segmented bar */}
                <div className="flex h-1.5 gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-all duration-300 ${
                        i < strength.score ? strength.color : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <p
                  className={`text-xs font-medium ${
                    strength.score <= 1
                      ? 'text-red-400'
                      : strength.score === 2
                        ? 'text-orange-400'
                        : strength.score === 3
                          ? 'text-yellow-400'
                          : strength.score === 4
                            ? 'text-blue-400'
                            : 'text-emerald-400'
                  }`}
                >
                  {strength.label}
                </p>

                {/* Per-rule checklist */}
                <ul className="space-y-1 pt-1">
                  {RULES.map((rule) => {
                    const ok = rule.test(password);
                    return (
                      <li
                        key={rule.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        {ok ? (
                          <HiCheck className="shrink-0 text-emerald-400" />
                        ) : (
                          <HiX className="shrink-0 text-red-400/70" />
                        )}
                        <span
                          className={ok ? 'text-emerald-400' : 'text-gray-500'}
                        >
                          {rule.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-4 top-3.5 text-lg text-gray-400" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-white placeholder-gray-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-2.5 p-1.5 text-gray-400 transition hover:text-indigo-300"
              aria-label={
                showConfirmPassword
                  ? 'Hide confirm password'
                  : 'Show confirm password'
              }
            >
              {showConfirmPassword ? (
                <HiOutlineEyeOff className="text-lg" />
              ) : (
                <HiOutlineEye className="text-lg" />
              )}
            </button>
          </div>
          <motion.button
            whileHover={{ scale: allRulesPassed ? 1.02 : 1 }}
            whileTap={{ scale: allRulesPassed ? 0.98 : 1 }}
            type="submit"
            disabled={loading || !allRulesPassed}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </motion.button>
        </form>

        <p className="mt-6 text-center text-gray-400">
          Already have an account?{' '}
          <Link
            to="/signin"
            className="font-medium text-indigo-400 transition hover:text-indigo-300"
          >
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
