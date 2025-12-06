import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Code2,
  FolderKanban,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import TimerWidget from './TimerWidget';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/stack', icon: Code2, label: 'Skills' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/resources', icon: BookOpen, label: 'Resources' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close menus on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-dark-850 border-b border-dark-600">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-dark-700 rounded text-light-500 hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-accent-primary flex items-center justify-center text-lg">
              🚀
            </div>
            <span className="font-bold text-white">DevOrbit</span>
          </div>

          <div className="w-10" />
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 w-64
          bg-dark-850 border-r border-dark-600
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="hidden lg:flex items-center gap-3 px-4 py-5 border-b border-dark-600">
            <div className="w-10 h-10 rounded bg-accent-primary flex items-center justify-center text-xl">
              🚀
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">DevOrbit</h1>
              <p className="text-xs text-light-500">Track your journey</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 mt-14 lg:mt-0">
            <ul className="space-y-1">
              {navItems.map(item => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors group ${
                        isActive
                          ? 'bg-accent-primary/10 text-accent-primary'
                          : 'text-light-500 hover:bg-dark-700 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="flex-1">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Timer Widget (Desktop only) */}
          <div className="hidden lg:block px-3 pb-4">
            <TimerWidget />
          </div>

          {/* Footer Actions */}
          <div className="px-3 py-4 border-t border-dark-600 space-y-2">
            {/* User Profile */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-3 w-full px-3 py-2 hover:bg-dark-700 rounded transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full" />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white truncate">{user.name || user.email}</p>
                    <p className="text-xs text-light-500 truncate">{user.email}</p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-light-500 transition-transform ${
                      isProfileMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Profile Dropdown */}
                {isProfileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsProfileMenuOpen(false)}
                    />
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-dark-800 border border-dark-600 rounded shadow-lg z-20">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-4 py-3 text-error hover:bg-error/10 rounded transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {/* Mobile Timer */}
        <div className="lg:hidden px-4 py-3 border-b border-dark-600 bg-dark-850">
          <TimerWidget />
        </div>

        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
