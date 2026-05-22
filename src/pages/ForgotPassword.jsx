import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineMail, HiOutlineArrowLeft } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await forgotPassword(email);
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
          <div className="mb-4 text-6xl">📬</div>
          <h2 className="mb-3 text-2xl font-bold text-white">
            Reset link sent!
          </h2>
          <p className="mb-2 text-gray-300">
            We sent a password reset link to{' '}
            <span className="font-medium text-indigo-400">{email}</span>.
          </p>
          <p className="mb-6 text-sm text-gray-500">
            Check your inbox and click the link to set a new password. The link
            expires in 1 hour.
          </p>
          <Link
            to="/signin"
            className="inline-flex items-center gap-2 text-indigo-400 transition hover:text-indigo-300"
          >
            <HiOutlineArrowLeft />
            Back to Sign In
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
          <div className="mb-3 text-4xl">🔑</div>
          <h1 className="text-2xl font-extrabold text-white">
            Forgot password?
          </h1>
          <p className="mt-2 text-gray-400">
            Enter your email and we'll send you a reset link.
          </p>
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
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </motion.button>
        </form>

        <p className="mt-6 text-center">
          <Link
            to="/signin"
            className="inline-flex items-center gap-2 text-sm text-indigo-400 transition hover:text-indigo-300"
          >
            <HiOutlineArrowLeft />
            Back to Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
