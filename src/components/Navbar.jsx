import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { HiOutlineLogout, HiOutlineUser, HiViewGridAdd } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, signOut, getProfile } = useAuth();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (!user) return;
    const load = () =>
      getProfile().then(({ profile }) => {
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
        else setAvatarUrl(null);
      });
    load();
    window.addEventListener('avatar-updated', load);
    return () => window.removeEventListener('avatar-updated', load);
  }, [user]);
  const location = useLocation();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) toast.error(error.message);
    else {
      toast.success('Signed out');
      navigate('/signin');
    }
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: HiViewGridAdd },
    { to: '/profile', label: 'Profile', icon: HiOutlineUser },
  ];

  return (
    <header className="glass sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        {/* Logo */}
        <Link
          to="/dashboard"
          className="gradient-text shrink-0 text-xl font-extrabold"
        >
          Sky Deck
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="text-base" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right: avatar + sign out */}
        <div className="flex shrink-0 items-center gap-3">
          <Link
            to="/profile"
            className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-white/10 transition hover:ring-indigo-500/60"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-pink-500 text-sm font-bold text-white">
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </Link>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:border-red-500/50 hover:text-white"
          >
            <HiOutlineLogout className="text-base" />
            Sign Out
          </motion.button>
        </div>
      </div>
    </header>
  );
}
