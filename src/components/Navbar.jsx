import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineLogout,
  HiViewGridAdd,
  HiOutlineLink,
  HiOutlineCog,
} from 'react-icons/hi';
import { SiGithub } from 'react-icons/si';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const avatarUrl = profile?.avatar_url || null;

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
    { to: '/github-activities', label: 'GitHub Activities', icon: SiGithub },
    { to: '/integrations', label: 'Integrations', icon: HiOutlineLink },
    { to: '/settings', label: 'Settings', icon: HiOutlineCog },
  ];

  return (
    <aside className="glass fixed left-0 top-0 z-50 flex h-full w-16 flex-col items-center py-5">
      {/* Logo */}
      <Link
        to="/dashboard"
        className="gradient-text mb-8 text-center text-xs font-extrabold leading-tight"
        title="Sky Deck"
      >
        SD
      </Link>

      {/* Nav links */}
      <nav className="flex flex-1 flex-col items-center gap-2">
        {navLinks.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              title={label}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon />
            </Link>
          );
        })}
      </nav>

      {/* Bottom: avatar + sign out */}
      <div className="flex flex-col items-center gap-3">
        <Link
          to="/profile"
          title="Profile"
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
          title="Sign Out"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-gray-300 transition hover:border-red-500/50 hover:text-white"
        >
          <HiOutlineLogout />
        </motion.button>
      </div>
    </aside>
  );
}
