/**
 * GlobalSearch - Search across skills, projects, and resources
 * 
 * Features:
 * - Real-time search across all entities
 * - Keyboard shortcuts (Cmd/Ctrl + K)
 * - Recent searches
 * - Quick actions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  X, 
  Code2, 
  FolderKanban, 
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
  BookMarked
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface SearchResult {
  id: string;
  type: 'skill' | 'project' | 'resource';
  name: string;
  description?: string;
  icon?: string;
  status?: string;
  url?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const RECENT_SEARCHES_KEY = 'devOrbit_recent_searches';
const MAX_RECENT_SEARCHES = 5;

function loadRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(searches: string[]): void {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES)));
  } catch {}
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches());
  const [allData, setAllData] = useState<{ skills: any[]; projects: any[]; resources: any[] }>({
    skills: [],
    projects: [],
    resources: []
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load all data when search opens
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setLoading(true);
        try {
          const [skills, projects, resources] = await Promise.all([
            api.getSkills(),
            api.getProjects(),
            api.getResources()
          ]);
          setAllData({ 
            skills: Array.isArray(skills) ? skills : skills.items || [],
            projects: Array.isArray(projects) ? projects : projects.items || [],
            resources: Array.isArray(resources) ? resources : resources.items || []
          });
        } catch (error) {
          console.error('Failed to load search data:', error);
        } finally {
          setLoading(false);
        }
      };
      loadData();
      inputRef.current?.focus();
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search function
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search skills
    allData.skills.forEach(skill => {
      if (
        skill.name?.toLowerCase().includes(lowerQuery) ||
        skill.category?.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: skill.id,
          type: 'skill',
          name: skill.name,
          description: `${skill.category} • ${skill.status?.replace(/_/g, ' ')}`,
          icon: skill.icon,
          status: skill.status
        });
      }
    });

    // Search projects
    allData.projects.forEach(project => {
      if (
        project.name?.toLowerCase().includes(lowerQuery) ||
        project.description?.toLowerCase().includes(lowerQuery) ||
        project.tech_stack?.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: project.id,
          type: 'project',
          name: project.name,
          description: project.description?.substring(0, 100) || project.status,
          status: project.status
        });
      }
    });

    // Search resources
    allData.resources.forEach(resource => {
      if (
        resource.title?.toLowerCase().includes(lowerQuery) ||
        resource.notes?.toLowerCase().includes(lowerQuery) ||
        resource.type?.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: resource.id,
          type: 'resource',
          name: resource.title,
          description: resource.type,
          url: resource.url
        });
      }
    });

    setResults(searchResults.slice(0, 20));
    setSelectedIndex(0);
  }, [allData]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 150);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  // Handle selection
  const handleSelect = (result: SearchResult) => {
    // Save to recent searches
    const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(newRecent);
    saveRecentSearches(newRecent);

    // Navigate to the appropriate page
    switch (result.type) {
      case 'skill':
        navigate('/stack', { state: { highlightId: result.id } });
        break;
      case 'project':
        navigate('/projects', { state: { highlightId: result.id } });
        break;
      case 'resource':
        navigate('/resources', { state: { highlightId: result.id } });
        break;
    }
    
    onClose();
  };

  // Get icon for result type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'skill': return Code2;
      case 'project': return FolderKanban;
      case 'resource': return BookOpen;
      default: return Search;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered':
      case 'completed':
        return 'text-green-400';
      case 'learning':
      case 'active':
        return 'text-blue-400';
      case 'want_to_learn':
      case 'idea':
        return 'text-yellow-400';
      default:
        return 'text-light-500';
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Search Modal */}
      <div 
        className="relative w-full max-w-2xl bg-dark-800 border border-dark-600 rounded-xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-dark-600">
          <Search className="w-5 h-5 text-light-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search skills, projects, resources..."
            className="flex-1 bg-transparent text-white text-lg placeholder:text-light-500 focus:outline-none"
            autoComplete="off"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 hover:bg-dark-600 rounded transition-colors"
            >
              <X className="w-4 h-4 text-light-500" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-dark-700 border border-dark-600 rounded text-xs text-light-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : query && results.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="w-12 h-12 text-light-500 mx-auto mb-3 opacity-50" />
              <p className="text-light-400">No results found for "{query}"</p>
              <p className="text-sm text-light-500 mt-1">Try a different search term</p>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {/* Group results by type */}
              {['skill', 'project', 'resource'].map(type => {
                const typeResults = results.filter(r => r.type === type);
                if (typeResults.length === 0) return null;
                
                const TypeIcon = getTypeIcon(type);
                return (
                  <div key={type} className="mb-2">
                    <div className="px-4 py-2 text-xs font-medium text-light-500 uppercase tracking-wide">
                      {type}s
                    </div>
                    {typeResults.map((result) => {
                      const globalIndex = results.findIndex(r => r.id === result.id);
                      const isSelected = globalIndex === selectedIndex;
                      
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                            isSelected ? 'bg-accent-primary/10' : 'hover:bg-dark-700'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-accent-primary/20' : 'bg-dark-600'
                          }`}>
                            {result.icon ? (
                              <span className="text-lg">{result.icon}</span>
                            ) : (
                              <TypeIcon className={`w-5 h-5 ${isSelected ? 'text-accent-primary' : 'text-light-400'}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white truncate">{result.name}</span>
                              {result.status && (
                                <span className={`text-xs ${getStatusColor(result.status)}`}>
                                  {result.status.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                            {result.description && (
                              <p className="text-sm text-light-500 truncate">{result.description}</p>
                            )}
                          </div>
                          <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-accent-primary' : 'text-light-500'}`} />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty state with quick actions and recent searches */
            <div className="py-4">
              {/* Quick Actions */}
              <div className="px-4 py-2 text-xs font-medium text-light-500 uppercase tracking-wide">
                Quick Actions
              </div>
              <button 
                onClick={() => { navigate('/stack'); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-white">Add New Skill</span>
                  <p className="text-sm text-light-500">Track a new technology</p>
                </div>
              </button>
              <button 
                onClick={() => { navigate('/projects'); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-white">Create Project</span>
                  <p className="text-sm text-light-500">Start a new project</p>
                </div>
              </button>
              <button 
                onClick={() => { navigate('/resources'); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <BookMarked className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-white">Save Resource</span>
                  <p className="text-sm text-light-500">Bookmark a learning resource</p>
                </div>
              </button>

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <>
                  <div className="px-4 py-2 mt-2 text-xs font-medium text-light-500 uppercase tracking-wide">
                    Recent Searches
                  </div>
                  {recentSearches.map((search, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuery(search)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-700 transition-colors"
                    >
                      <Clock className="w-4 h-4 text-light-500" />
                      <span className="text-light-400">{search}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-dark-600 text-xs text-light-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-dark-700 border border-dark-600 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-dark-700 border border-dark-600 rounded">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-dark-700 border border-dark-600 rounded">↵</kbd>
              <span>Select</span>
            </span>
          </div>
          <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Hook to manage global search state
export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    openSearch: () => setIsOpen(true),
    closeSearch: () => setIsOpen(false),
    toggleSearch: () => setIsOpen(prev => !prev)
  };
}

export default GlobalSearch;
