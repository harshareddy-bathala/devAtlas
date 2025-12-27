import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Search,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Code2,
  FolderKanban,
  BookOpen,
  Bookmark,
  Moon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationsPanel } from './NotificationsPanel';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function TopNavbar() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isPersonalMenuOpen, setIsPersonalMenuOpen] = useState(false);
  const [isPersonalMenuClicked, setIsPersonalMenuClicked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const personalMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsProfileMenuOpen(false);
        setIsPersonalMenuOpen(false);
        setShowSearchResults(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search function
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    setShowSearchResults(true);

    try {
      const [skills, projects, resources] = await Promise.all([
        api.getSkills(),
        api.getProjects(),
        api.getResources()
      ]);

      const skillsArray = Array.isArray(skills) ? skills : skills.items || [];
      const projectsArray = Array.isArray(projects) ? projects : projects.items || [];
      const resourcesArray = Array.isArray(resources) ? resources : resources.items || [];

      const lowerQuery = query.toLowerCase();

      const matchedSkills = skillsArray
        .filter((item: any) => 
          item.name?.toLowerCase().includes(lowerQuery) ||
          item.description?.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 5)
        .map((item: any) => ({ ...item, type: 'skill' }));

      const matchedProjects = projectsArray
        .filter((item: any) => 
          item.name?.toLowerCase().includes(lowerQuery) ||
          item.description?.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 5)
        .map((item: any) => ({ ...item, type: 'project' }));

      const matchedResources = resourcesArray
        .filter((item: any) => 
          item.title?.toLowerCase().includes(lowerQuery) ||
          item.description?.toLowerCase().includes(lowerQuery) ||
          item.url?.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 5)
        .map((item: any) => ({ ...item, type: 'resource' }));

      setSearchResults([...matchedSkills, ...matchedProjects, ...matchedResources]);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleResultClick = (result: any) => {
    setShowSearchResults(false);
    setSearchQuery('');

    if (result.type === 'skill') {
      navigate('/stack');
    } else if (result.type === 'project') {
      navigate('/projects');
    } else if (result.type === 'resource') {
      navigate('/resources');
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'skill': return <Code2 className="w-4 h-4" />;
      case 'project': return <FolderKanban className="w-4 h-4" />;
      case 'resource': return <BookOpen className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

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
    <>
      {/* Fixed Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-850 border-b border-dark-600 h-[70px]">
        <div className="h-full max-w-[1600px] mx-auto px-6 flex items-center justify-between">
          
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-dark-700 rounded text-light-500 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            
            <NavLink to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-accent-primary flex items-center justify-center text-lg">
                🚀
              </div>
              <span className="font-bold text-white text-lg hidden sm:inline">DevOrbit</span>
            </NavLink>
          </div>

          {/* Center: Navigation Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-8">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors relative pb-1 ${
                  isActive
                    ? 'text-[#a78bfa]'
                    : 'text-[#a0aec0] hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  Dashboard
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent-primary" />
                  )}
                </>
              )}
            </NavLink>

            <NavLink
              to="/explore"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors relative pb-1 ${
                  isActive
                    ? 'text-accent-primary'
                    : 'text-light-500 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  Explore Courses
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent-primary" />
                  )}
                </>
              )}
            </NavLink>

            {/* Personal Dropdown */}
            <div 
              className="relative" 
              ref={personalMenuRef}
              onMouseEnter={() => {
                if (!isPersonalMenuClicked) {
                  setIsPersonalMenuOpen(true);
                }
              }}
              onMouseLeave={() => {
                if (!isPersonalMenuClicked) {
                  setIsPersonalMenuOpen(false);
                }
              }}
            >
              <button
                onClick={() => {
                  if (isPersonalMenuClicked) {
                    // If already clicked (sticky), close it
                    setIsPersonalMenuClicked(false);
                    setIsPersonalMenuOpen(false);
                  } else {
                    // If not clicked, make it sticky
                    setIsPersonalMenuClicked(true);
                    setIsPersonalMenuOpen(true);
                  }
                }}
                className="flex items-center gap-1 text-sm font-medium text-light-500 hover:text-white transition-colors py-2"
              >
                Personal
                <ChevronDown className={`w-4 h-4 transition-transform ${isPersonalMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isPersonalMenuOpen && (
                <>
                  {isPersonalMenuClicked && (
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => {
                        setIsPersonalMenuOpen(false);
                        setIsPersonalMenuClicked(false);
                      }}
                    />
                  )}
                  <div className="absolute top-full pt-2 right-0 w-48 z-20">
                    <div className="bg-dark-800 border border-dark-600 rounded-lg shadow-lg overflow-hidden">
                    <NavLink
                      to="/stack"
                      onClick={() => {
                        setIsPersonalMenuOpen(false);
                        setIsPersonalMenuClicked(false);
                      }}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                          isActive
                            ? 'bg-accent-primary/10 text-accent-primary'
                            : 'text-light-500 hover:bg-dark-700 hover:text-white'
                        }`
                      }
                    >
                      <Code2 className="w-4 h-4" />
                      Skills
                    </NavLink>
                    <NavLink
                      to="/projects"
                      onClick={() => {
                        setIsPersonalMenuOpen(false);
                        setIsPersonalMenuClicked(false);
                      }}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                          isActive
                            ? 'bg-accent-primary/10 text-accent-primary'
                            : 'text-light-500 hover:bg-dark-700 hover:text-white'
                        }`
                      }
                    >
                      <FolderKanban className="w-4 h-4" />
                      Projects
                    </NavLink>
                    <NavLink
                      to="/resources"
                      onClick={() => {
                        setIsPersonalMenuOpen(false);
                        setIsPersonalMenuClicked(false);
                      }}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                          isActive
                            ? 'bg-accent-primary/10 text-accent-primary'
                            : 'text-light-500 hover:bg-dark-700 hover:text-white'
                        }`
                      }
                    >
                      <BookOpen className="w-4 h-4" />
                      Resources
                    </NavLink>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Search, Notifications, User */}
          <div className="flex items-center gap-4">
            {/* Inline Search */}
            <div className="relative hidden md:block" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search skills, projects, resources..."
                  className="w-64 lg:w-80 pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-white placeholder-light-500 focus:outline-none focus:border-accent-primary transition-colors"
                />
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-dark-800 border border-dark-600 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
                  {searchLoading ? (
                    <div className="px-4 py-8 text-center text-light-500">
                      <div className="inline-block w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((result, index) => (
                        <button
                          key={`${result.type}-${result.id || index}`}
                          onClick={() => handleResultClick(result)}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-dark-700 transition-colors text-left"
                        >
                          <div className="mt-0.5 text-accent-primary">
                            {getResultIcon(result.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-white truncate">
                                {result.name || result.title}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-dark-600 text-light-500 rounded-full capitalize">
                                {result.type}
                              </span>
                            </div>
                            {(result.description || result.url) && (
                              <p className="text-xs text-light-500 truncate">
                                {result.description || result.url}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery ? (
                    <div className="px-4 py-8 text-center text-light-500 text-sm">
                      No results found for "{searchQuery}"
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Notifications */}
            <NotificationsPanel />

            {/* User Avatar */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 p-1 hover:bg-dark-700 rounded transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full" />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                </button>

                {isProfileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsProfileMenuOpen(false)}
                    />
                    <div className="absolute top-full mt-2 right-0 w-64 bg-dark-800 border border-dark-600 rounded-xl shadow-lg z-20 overflow-hidden">
                      {/* User Info Header */}
                      <div className="px-4 py-4 border-b border-dark-600 bg-dark-700/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-accent-primary flex items-center justify-center">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full" />
                            ) : (
                              <User className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user.name || 'User'}</p>
                            <p className="text-xs text-light-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Menu Items */}
                      <div className="py-2">
                        <NavLink
                          to="/profile"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-light-400 hover:bg-dark-700 hover:text-white transition-colors"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </NavLink>
                        <NavLink
                          to="/resources"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-light-400 hover:bg-dark-700 hover:text-white transition-colors"
                        >
                          <Bookmark className="w-4 h-4" />
                          Bookmarks
                        </NavLink>
                        <NavLink
                          to="/account"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-light-400 hover:bg-dark-700 hover:text-white transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Account
                        </NavLink>
                      </div>
                      
                      {/* Theme Toggle */}
                      <div className="border-t border-dark-600 py-2">
                        <button
                          onClick={() => {
                            toast('Theme switching coming soon!', { icon: '🌙' });
                          }}
                          className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-light-400 hover:bg-dark-700 hover:text-white transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Moon className="w-4 h-4" />
                            Switch theme
                          </div>
                          <span className="text-xs text-light-500 bg-dark-600 px-2 py-0.5 rounded">
                            Dark
                          </span>
                        </button>
                      </div>
                      
                      {/* Sign Out */}
                      <div className="border-t border-dark-600 py-2">
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            handleSignOut();
                          }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-4 py-3 border-t border-dark-600">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-white placeholder-light-500 focus:outline-none focus:border-accent-primary"
            />
          </div>
          {showSearchResults && searchResults.length > 0 && (
            <div className="mt-2 bg-dark-800 border border-dark-600 rounded-lg max-h-60 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.type}-${result.id || index}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-start gap-3 px-3 py-2 hover:bg-dark-700 transition-colors text-left"
                >
                  <div className="mt-0.5 text-accent-primary text-sm">
                    {getResultIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {result.name || result.title}
                    </div>
                    <span className="text-xs text-light-500 capitalize">
                      {result.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="lg:hidden fixed top-[70px] left-0 right-0 z-40 bg-dark-850 border-b border-dark-600 shadow-lg">
            <nav className="px-4 py-4">
              <NavLink
                to="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 text-sm font-medium rounded transition-colors ${
                    isActive
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-light-500 hover:bg-dark-800 hover:text-white'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/explore"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 text-sm font-medium rounded transition-colors ${
                    isActive
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-light-500 hover:bg-dark-800 hover:text-white'
                  }`
                }
              >
                Explore Courses
              </NavLink>
              <div className="mt-2 pt-2 border-t border-dark-600">
                <p className="px-4 py-2 text-xs font-semibold text-light-500 uppercase">Personal</p>
                <NavLink
                  to="/stack"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      isActive
                        ? 'bg-accent-primary/10 text-accent-primary'
                        : 'text-light-500 hover:bg-dark-800 hover:text-white'
                    }`
                  }
                >
                  <Code2 className="w-4 h-4" />
                  Skills
                </NavLink>
                <NavLink
                  to="/projects"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      isActive
                        ? 'bg-accent-primary/10 text-accent-primary'
                        : 'text-light-500 hover:bg-dark-800 hover:text-white'
                    }`
                  }
                >
                  <FolderKanban className="w-4 h-4" />
                  Projects
                </NavLink>
                <NavLink
                  to="/resources"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      isActive
                        ? 'bg-accent-primary/10 text-accent-primary'
                        : 'text-light-500 hover:bg-dark-800 hover:text-white'
                    }`
                  }
                >
                  <BookOpen className="w-4 h-4" />
                  Resources
                </NavLink>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
