import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Layers, FolderKanban, BookOpen, Orbit, Settings } from 'lucide-react';

function Layout({ children }) {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/stack', icon: Layers, label: 'Stack Tracker' },
    { path: '/projects', icon: FolderKanban, label: 'Projects' },
    { path: '/resources', icon: BookOpen, label: 'Resources' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-800 border-r border-dark-600 p-4 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center">
            <Orbit className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">DevOrbit</h1>
            <p className="text-xs text-gray-500">Knowledge Hub</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => 
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="pt-4 border-t border-dark-600">
          <div className="glass-card p-4">
            <p className="text-sm text-gray-400">Your growth journey</p>
            <p className="text-2xl font-bold gradient-text">Keep building!</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}

export default Layout;
