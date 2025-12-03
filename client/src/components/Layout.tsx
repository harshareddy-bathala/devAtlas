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
  Keyboard,
  User,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import ShortcutsHelp, { useShortcutsHelp } from './ShortcutsHelp';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import TimerWidget from './TimerWidget';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', shortcut: 'G D' },
  { to: '/skills', icon: Code2, label: 'Skills', shortcut: 'G S' },
  { to: '/projects', icon: FolderKanban, label: 'Projects', shortcut: 'G P' },
  { to: '/resources', icon: BookOpen, label: 'Resources', shortcut: 'G R' },
  { to: '/settings', icon: Settings, label: 'Settings', shortcut: 'G T' },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const shortcutsHelp = useShortcutsHelp();

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

  // Register navigation shortcuts
  useKeyboardShortcuts([
    { key: 'd', modifiers: [], action: () => navigate('/'), description: 'Go to Dashboard', scope: 'global' },
    { key: 's', modifiers: [], action: () => navigate('/skills'), description: 'Go to Skills', scope: 'global' },
    { key: 'p', modifiers: [], action: () => navigate('/projects'), description: 'Go to Projects', scope: 'global' },
    { key: 'r', modifiers: [], action: () => navigate('/resources'), description: 'Go to Resources', scope: 'global' },
    { key: 't', modifiers: [], action: () => navigate('/settings'), description: 'Go to Settings', scope: 'global' },
  ]);

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
    <div className="min-h-screen bg-light-100 dark:bg-dark-900 text-gray-900 dark:text-white transition-colors">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-dark-600">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-lg">
              🚀
            </div>
            <span className="font-bold">DevOrbit</span>
          </div>

          <div className="w-10" />
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 w-64
          bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-600
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="hidden lg:flex items-center gap-3 px-4 py-5 border-b border-gray-200 dark:border-dark-600">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-xl">
              🚀
            </div>
            <div>
              <h1 className="font-bold text-lg">DevOrbit</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Track your journey</p>
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
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                        isActive
                          ? 'bg-accent-blue/10 text-accent-blue'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="flex-1">{item.label}</span>
                    <span className="hidden lg:block text-xs text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400">
                      {item.shortcut}
                    </span>
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
          <div className="px-3 py-4 border-t border-gray-200 dark:border-dark-600 space-y-2">
            {/* Shortcuts */}
            <button
              onClick={shortcutsHelp.open}
              className="flex items-center gap-3 w-full px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              <Keyboard className="w-5 h-5" />
              <span>Shortcuts</span>
              <span className="ml-auto text-xs text-gray-400">?</span>
            </button>

            {/* User Profile */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${
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
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-lg shadow-xl z-20">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
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
        <div className="lg:hidden px-4 py-3 border-b border-gray-200 dark:border-dark-600 bg-white/50 dark:bg-dark-800/50">
          <TimerWidget />
        </div>

        <div className="p-4 lg:p-8">{children}</div>
      </main>

      {/* Keyboard Shortcuts Help Modal */}
      <ShortcutsHelp isOpen={shortcutsHelp.isOpen} onClose={shortcutsHelp.close} />
    </div>
  );
}
