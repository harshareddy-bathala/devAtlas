import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Layers, 
  FolderKanban, 
  BookOpen, 
  Orbit, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import SignOutModal from './SignOutModal';

function Layout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { user, signOut, profileLoading } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      setShowSignOutModal(false);
    }
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/stack', icon: Layers, label: 'Stack Tracker' },
    { path: '/projects', icon: FolderKanban, label: 'Projects' },
    { path: '/resources', icon: BookOpen, label: 'Resources' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex min-h-screen bg-dark-900">
      {/* Sidebar */}
      <aside
        style={{ width: isCollapsed ? '72px' : '240px' }}
        className="fixed left-0 top-0 h-screen bg-dark-850 border-r border-dark-600/50 flex flex-col z-40 transition-[width] duration-200 overflow-x-hidden"
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 p-4 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
            <Orbit className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-white">DevOrbit</h1>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-dark-700 border border-dark-500 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-dark-600 transition-colors z-50"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path || 
              (path !== '/' && location.pathname.startsWith(path));
            
            return (
              <NavLink
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative
                  ${isActive 
                    ? 'bg-primary-500/10 text-primary-400' 
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-500 rounded-r-full" />
                )}
                
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-400' : ''}`} />
                
                {!isCollapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">{label}</span>
                )}

                {isCollapsed && (
                  <div className="fixed left-[72px] px-3 py-1.5 bg-dark-700 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60] border border-dark-500 shadow-lg">
                    {label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Footer */}
        <div className="p-3 border-t border-dark-600/50">
          <div className={`flex items-center gap-3 p-2 rounded-lg bg-dark-800/50 mb-2 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {profileLoading ? (
                <div className="w-4 h-4 rounded-full bg-primary-400 animate-pulse" />
              ) : user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full rounded-lg object-cover" />
              ) : user?.name ? (
                user.name.charAt(0).toUpperCase()
              ) : (
                'U'
              )}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                {profileLoading ? (
                  <>
                    <div className="h-4 w-20 bg-dark-600 rounded animate-pulse mb-1" />
                    <div className="h-3 w-28 bg-dark-700 rounded animate-pulse" />
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowSignOutModal(true)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-error hover:bg-error/10 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Sign Out Modal */}
      <SignOutModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleSignOut}
        loading={signingOut}
      />

      {/* Main Content */}
      <main
        style={{ marginLeft: isCollapsed ? '72px' : '240px' }}
        className="flex-1 min-h-screen transition-[margin] duration-200"
      >
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
