import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function VerifyEmail() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass w-full max-w-md rounded-3xl p-10 text-center"
      >
        <div className="mb-4 text-6xl">🎉</div>
        <h2 className="mb-3 text-2xl font-bold text-white">Email Verified!</h2>
        <p className="mb-6 text-gray-300">
          Your account is now active. You can sign in and start using Sky Deck.
        </p>
        <Link
          to="/signin"
          className="inline-block rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 px-6 py-3 font-semibold text-white transition hover:opacity-90"
        >
          Go to Sign In
        </Link>
      </motion.div>
    </div>
  );
}
