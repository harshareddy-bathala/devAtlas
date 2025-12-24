/**
 * DataCacheContext - Global data cache with localStorage persistence
 * 
 * Features:
 * - localStorage caching for instant load times
 * - Optimistic updates for immediate UI feedback
 * - Debounced writes to reduce Firestore operations
 * - Automatic background sync
 * - Offline support via cached data
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

// Types
export interface Skill {
  id: string;
  name: string;
  category: string;
  status: 'want_to_learn' | 'learning' | 'mastered';
  icon: string;
  linkedProjects?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'idea' | 'active' | 'completed';
  github_url?: string;
  demo_url?: string;
  tech_stack?: string;
  linkedSkills?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: string;
  status: 'saved' | 'in_progress' | 'completed';
  notes?: string;
  skillIds?: string[];
  projectIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface CacheState {
  skills: Skill[];
  projects: Project[];
  resources: Resource[];
  stats: Record<string, unknown> | null;
  heatmapData: unknown[] | null;
  progressData: unknown | null;
  
  // Loading states
  loading: {
    skills: boolean;
    projects: boolean;
    resources: boolean;
    stats: boolean;
  };
  
  // Cache metadata
  lastFetched: {
    skills: number | null;
    projects: number | null;
    resources: number | null;
    stats: number | null;
  };
  
  // Pending changes (for batch sync)
  pendingChanges: {
    skills: Map<string, { type: 'update' | 'delete'; data?: Partial<Skill>; timestamp: number }>;
    projects: Map<string, { type: 'update' | 'delete'; data?: Partial<Project>; timestamp: number }>;
    resources: Map<string, { type: 'update' | 'delete'; data?: Partial<Resource>; timestamp: number }>;
  };
  
  // Sync status
  isSyncing: boolean;
  lastSyncError: string | null;
}

type CacheAction =
  | { type: 'SET_SKILLS'; payload: Skill[] }
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'SET_RESOURCES'; payload: Resource[] }
  | { type: 'SET_STATS'; payload: Record<string, unknown> }
  | { type: 'SET_HEATMAP_DATA'; payload: unknown[] }
  | { type: 'SET_PROGRESS_DATA'; payload: unknown }
  | { type: 'SET_LOADING'; payload: { key: keyof CacheState['loading']; value: boolean } }
  | { type: 'UPDATE_SKILL'; payload: { id: string; data: Partial<Skill> } }
  | { type: 'UPDATE_PROJECT'; payload: { id: string; data: Partial<Project> } }
  | { type: 'UPDATE_RESOURCE'; payload: { id: string; data: Partial<Resource> } }
  | { type: 'ADD_SKILL'; payload: Skill }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'ADD_RESOURCE'; payload: Resource }
  | { type: 'DELETE_SKILL'; payload: string }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'DELETE_RESOURCE'; payload: string }
  | { type: 'QUEUE_CHANGE'; payload: { collection: 'skills' | 'projects' | 'resources'; id: string; type: 'update' | 'delete'; data?: unknown } }
  | { type: 'CLEAR_PENDING'; payload: { collection: 'skills' | 'projects' | 'resources'; ids: string[] } }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_SYNC_ERROR'; payload: string | null }
  | { type: 'RESET_CACHE' };

// localStorage keys
const CACHE_KEYS = {
  skills: 'devOrbit_cache_skills',
  projects: 'devOrbit_cache_projects',
  resources: 'devOrbit_cache_resources',
  stats: 'devOrbit_cache_stats',
  metadata: 'devOrbit_cache_metadata',
  pendingChanges: 'devOrbit_pending_changes',
};

// Cache TTL in milliseconds (5 minutes for fresh data, but use stale data immediately)
const CACHE_TTL = 5 * 60 * 1000;
const DEBOUNCE_DELAY = 2000; // 2 seconds debounce for writes

// Initial state
const initialState: CacheState = {
  skills: [],
  projects: [],
  resources: [],
  stats: null,
  heatmapData: null,
  progressData: null,
  loading: {
    skills: false,
    projects: false,
    resources: false,
    stats: false,
  },
  lastFetched: {
    skills: null,
    projects: null,
    resources: null,
    stats: null,
  },
  pendingChanges: {
    skills: new Map(),
    projects: new Map(),
    resources: new Map(),
  },
  isSyncing: false,
  lastSyncError: null,
};

// Reducer
function cacheReducer(state: CacheState, action: CacheAction): CacheState {
  switch (action.type) {
    case 'SET_SKILLS':
      return {
        ...state,
        skills: action.payload,
        lastFetched: { ...state.lastFetched, skills: Date.now() },
      };
    
    case 'SET_PROJECTS':
      return {
        ...state,
        projects: action.payload,
        lastFetched: { ...state.lastFetched, projects: Date.now() },
      };
    
    case 'SET_RESOURCES':
      return {
        ...state,
        resources: action.payload,
        lastFetched: { ...state.lastFetched, resources: Date.now() },
      };
    
    case 'SET_STATS':
      return {
        ...state,
        stats: action.payload,
        lastFetched: { ...state.lastFetched, stats: Date.now() },
      };
    
    case 'SET_HEATMAP_DATA':
      return { ...state, heatmapData: action.payload };
    
    case 'SET_PROGRESS_DATA':
      return { ...state, progressData: action.payload };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value },
      };
    
    case 'UPDATE_SKILL': {
      const skills = state.skills.map(s =>
        s.id === action.payload.id ? { ...s, ...action.payload.data, updatedAt: new Date().toISOString() } : s
      );
      return { ...state, skills };
    }
    
    case 'UPDATE_PROJECT': {
      const projects = state.projects.map(p =>
        p.id === action.payload.id ? { ...p, ...action.payload.data, updatedAt: new Date().toISOString() } : p
      );
      return { ...state, projects };
    }
    
    case 'UPDATE_RESOURCE': {
      const resources = state.resources.map(r =>
        r.id === action.payload.id ? { ...r, ...action.payload.data, updatedAt: new Date().toISOString() } : r
      );
      return { ...state, resources };
    }
    
    case 'ADD_SKILL':
      return { ...state, skills: [action.payload, ...state.skills] };
    
    case 'ADD_PROJECT':
      return { ...state, projects: [action.payload, ...state.projects] };
    
    case 'ADD_RESOURCE':
      return { ...state, resources: [action.payload, ...state.resources] };
    
    case 'DELETE_SKILL':
      return { ...state, skills: state.skills.filter(s => s.id !== action.payload) };
    
    case 'DELETE_PROJECT':
      return { ...state, projects: state.projects.filter(p => p.id !== action.payload) };
    
    case 'DELETE_RESOURCE':
      return { ...state, resources: state.resources.filter(r => r.id !== action.payload) };
    
    case 'QUEUE_CHANGE': {
      const { collection, id, type, data } = action.payload;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newPendingChanges = { ...state.pendingChanges } as any;
      const existingMap = newPendingChanges[collection];
      const collectionMap = new Map(existingMap);
      collectionMap.set(id, { type, data, timestamp: Date.now() });
      newPendingChanges[collection] = collectionMap;
      return { ...state, pendingChanges: newPendingChanges };
    }
    
    case 'CLEAR_PENDING': {
      const { collection, ids } = action.payload;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newPendingChanges = { ...state.pendingChanges } as any;
      const existingMap = newPendingChanges[collection];
      const collectionMap = new Map(existingMap);
      ids.forEach(id => collectionMap.delete(id));
      newPendingChanges[collection] = collectionMap;
      return { ...state, pendingChanges: newPendingChanges };
    }
    
    case 'SET_SYNCING':
      return { ...state, isSyncing: action.payload };
    
    case 'SET_SYNC_ERROR':
      return { ...state, lastSyncError: action.payload };
    
    case 'RESET_CACHE':
      return initialState;
    
    default:
      return state;
  }
}

// Context
interface DataCacheContextValue {
  state: CacheState;
  
  // Data fetching (with cache)
  fetchSkills: (forceRefresh?: boolean) => Promise<Skill[]>;
  fetchProjects: (forceRefresh?: boolean) => Promise<Project[]>;
  fetchResources: (forceRefresh?: boolean) => Promise<Resource[]>;
  fetchStats: (forceRefresh?: boolean) => Promise<Record<string, unknown>>;
  fetchHeatmapData: () => Promise<unknown[]>;
  fetchProgressData: () => Promise<unknown>;
  
  // Optimistic updates (debounced sync)
  updateSkill: (id: string, data: Partial<Skill>, immediate?: boolean) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>, immediate?: boolean) => Promise<void>;
  updateResource: (id: string, data: Partial<Resource>, immediate?: boolean) => Promise<void>;
  
  // CRUD operations
  createSkill: (data: Omit<Skill, 'id'>) => Promise<Skill>;
  createProject: (data: Omit<Project, 'id'>) => Promise<Project>;
  createResource: (data: Omit<Resource, 'id'>) => Promise<Resource>;
  deleteSkill: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  
  // Sync control
  syncPendingChanges: () => Promise<void>;
  hasPendingChanges: boolean;
  
  // Cache management
  invalidateCache: (collection?: 'skills' | 'projects' | 'resources' | 'stats' | 'all') => void;
  clearAllCache: () => void;
}

const DataCacheContext = createContext<DataCacheContextValue | null>(null);

// Helper: Load from localStorage
function loadFromStorage<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// Helper: Save to localStorage
function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

// Provider
export function DataCacheProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(cacheReducer, initialState);
  
  // Debounce timers
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncInProgressRef = useRef(false);
  
  // Load cached data on mount
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'RESET_CACHE' });
      return;
    }
    
    // Load from localStorage immediately for instant UI
    const cachedSkills = loadFromStorage<Skill[]>(CACHE_KEYS.skills);
    const cachedProjects = loadFromStorage<Project[]>(CACHE_KEYS.projects);
    const cachedResources = loadFromStorage<Resource[]>(CACHE_KEYS.resources);
    const cachedStats = loadFromStorage<Record<string, unknown>>(CACHE_KEYS.stats);
    
    if (cachedSkills) dispatch({ type: 'SET_SKILLS', payload: cachedSkills });
    if (cachedProjects) dispatch({ type: 'SET_PROJECTS', payload: cachedProjects });
    if (cachedResources) dispatch({ type: 'SET_RESOURCES', payload: cachedResources });
    if (cachedStats) dispatch({ type: 'SET_STATS', payload: cachedStats });
    
    // Load pending changes
    const pending = loadFromStorage<{
      skills: Array<[string, { type: 'update' | 'delete'; data?: Partial<Skill>; timestamp: number }]>;
      projects: Array<[string, { type: 'update' | 'delete'; data?: Partial<Project>; timestamp: number }]>;
      resources: Array<[string, { type: 'update' | 'delete'; data?: Partial<Resource>; timestamp: number }]>;
    }>(CACHE_KEYS.pendingChanges);
    
    if (pending) {
      pending.skills?.forEach(([id, change]) => {
        dispatch({ type: 'QUEUE_CHANGE', payload: { collection: 'skills', id, ...change } });
      });
      pending.projects?.forEach(([id, change]) => {
        dispatch({ type: 'QUEUE_CHANGE', payload: { collection: 'projects', id, ...change } });
      });
      pending.resources?.forEach(([id, change]) => {
        dispatch({ type: 'QUEUE_CHANGE', payload: { collection: 'resources', id, ...change } });
      });
    }
  }, [user]);
  
  // Persist cache to localStorage when data changes
  useEffect(() => {
    if (state.skills.length > 0) {
      saveToStorage(CACHE_KEYS.skills, state.skills);
    }
  }, [state.skills]);
  
  useEffect(() => {
    if (state.projects.length > 0) {
      saveToStorage(CACHE_KEYS.projects, state.projects);
    }
  }, [state.projects]);
  
  useEffect(() => {
    if (state.resources.length > 0) {
      saveToStorage(CACHE_KEYS.resources, state.resources);
    }
  }, [state.resources]);
  
  useEffect(() => {
    if (state.stats) {
      saveToStorage(CACHE_KEYS.stats, state.stats);
    }
  }, [state.stats]);
  
  // Persist pending changes
  useEffect(() => {
    const pending = {
      skills: Array.from(state.pendingChanges.skills.entries()),
      projects: Array.from(state.pendingChanges.projects.entries()),
      resources: Array.from(state.pendingChanges.resources.entries()),
    };
    saveToStorage(CACHE_KEYS.pendingChanges, pending);
  }, [state.pendingChanges]);
  
  // Sync pending changes with debounce
  const scheduleSyncRef = useRef<() => void>();
  
  const syncPendingChanges = useCallback(async () => {
    if (syncInProgressRef.current) return;
    
    const hasSkillChanges = state.pendingChanges.skills.size > 0;
    const hasProjectChanges = state.pendingChanges.projects.size > 0;
    const hasResourceChanges = state.pendingChanges.resources.size > 0;
    
    if (!hasSkillChanges && !hasProjectChanges && !hasResourceChanges) {
      return;
    }
    
    syncInProgressRef.current = true;
    dispatch({ type: 'SET_SYNCING', payload: true });
    dispatch({ type: 'SET_SYNC_ERROR', payload: null });
    
    try {
      // Batch sync skills
      if (hasSkillChanges) {
        const updates: Array<{ id: string; data: Partial<Skill> }> = [];
        const deletes: string[] = [];
        
        state.pendingChanges.skills.forEach((change, id) => {
          if (change.type === 'update' && change.data) {
            updates.push({ id, data: change.data });
          } else if (change.type === 'delete') {
            deletes.push(id);
          }
        });
        
        if (updates.length > 0) {
          await api.batchUpdateSkills(updates);
        }
        for (const id of deletes) {
          await api.deleteSkill(id);
        }
        
        dispatch({ type: 'CLEAR_PENDING', payload: { collection: 'skills', ids: Array.from(state.pendingChanges.skills.keys()) } });
      }
      
      // Batch sync projects
      if (hasProjectChanges) {
        const updates: Array<{ id: string; data: Partial<Project> }> = [];
        const deletes: string[] = [];
        
        state.pendingChanges.projects.forEach((change, id) => {
          if (change.type === 'update' && change.data) {
            updates.push({ id, data: change.data });
          } else if (change.type === 'delete') {
            deletes.push(id);
          }
        });
        
        if (updates.length > 0) {
          await api.batchUpdateProjects(updates);
        }
        for (const id of deletes) {
          await api.deleteProject(id);
        }
        
        dispatch({ type: 'CLEAR_PENDING', payload: { collection: 'projects', ids: Array.from(state.pendingChanges.projects.keys()) } });
      }
      
      // Batch sync resources
      if (hasResourceChanges) {
        const updates: Array<{ id: string; data: Partial<Resource> }> = [];
        const deletes: string[] = [];
        
        state.pendingChanges.resources.forEach((change, id) => {
          if (change.type === 'update' && change.data) {
            updates.push({ id, data: change.data });
          } else if (change.type === 'delete') {
            deletes.push(id);
          }
        });
        
        if (updates.length > 0) {
          await api.batchUpdateResources(updates);
        }
        for (const id of deletes) {
          await api.deleteResource(id);
        }
        
        dispatch({ type: 'CLEAR_PENDING', payload: { collection: 'resources', ids: Array.from(state.pendingChanges.resources.keys()) } });
      }
      
      // Invalidate stats cache after successful sync
      dispatch({ type: 'SET_STATS', payload: state.stats || {} });
      
    } catch (error) {
      console.error('Sync failed:', error);
      dispatch({ type: 'SET_SYNC_ERROR', payload: (error as Error).message });
    } finally {
      syncInProgressRef.current = false;
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }, [state.pendingChanges, state.stats]);
  
  // Schedule sync with debounce
  const scheduleSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = setTimeout(() => {
      syncPendingChanges();
    }, DEBOUNCE_DELAY);
  }, [syncPendingChanges]);
  
  scheduleSyncRef.current = scheduleSync;
  
  // Sync on visibility change (when user leaves/returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Sync immediately when user leaves the tab
        syncPendingChanges();
      }
    };
    
    const handleBeforeUnload = () => {
      // Sync before page unload
      syncPendingChanges();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [syncPendingChanges]);
  
  // Check if cache is stale
  const isCacheStale = useCallback((key: keyof CacheState['lastFetched']) => {
    const lastFetched = state.lastFetched[key];
    if (!lastFetched) return true;
    return Date.now() - lastFetched > CACHE_TTL;
  }, [state.lastFetched]);
  
  // Fetch skills with cache
  const fetchSkills = useCallback(async (forceRefresh = false): Promise<Skill[]> => {
    // Return cached data if fresh
    if (!forceRefresh && state.skills.length > 0 && !isCacheStale('skills')) {
      return state.skills;
    }
    
    // If we have stale cached data, return it and refresh in background
    const hasCachedData = state.skills.length > 0;
    
    if (!forceRefresh && hasCachedData) {
      // Background refresh
      dispatch({ type: 'SET_LOADING', payload: { key: 'skills', value: true } });
      api.getSkills().then(skills => {
        const skillsArray = Array.isArray(skills) ? skills : skills.items || [];
        dispatch({ type: 'SET_SKILLS', payload: skillsArray });
      }).finally(() => {
        dispatch({ type: 'SET_LOADING', payload: { key: 'skills', value: false } });
      });
      return state.skills;
    }
    
    // Fresh fetch
    dispatch({ type: 'SET_LOADING', payload: { key: 'skills', value: true } });
    try {
      const skills = await api.getSkills();
      const skillsArray = Array.isArray(skills) ? skills : skills.items || [];
      dispatch({ type: 'SET_SKILLS', payload: skillsArray });
      return skillsArray;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'skills', value: false } });
    }
  }, [state.skills, isCacheStale]);
  
  // Fetch projects with cache
  const fetchProjects = useCallback(async (forceRefresh = false): Promise<Project[]> => {
    if (!forceRefresh && state.projects.length > 0 && !isCacheStale('projects')) {
      return state.projects;
    }
    
    const hasCachedData = state.projects.length > 0;
    
    if (!forceRefresh && hasCachedData) {
      dispatch({ type: 'SET_LOADING', payload: { key: 'projects', value: true } });
      api.getProjects().then(projects => {
        const projectsArray = Array.isArray(projects) ? projects : projects.items || [];
        dispatch({ type: 'SET_PROJECTS', payload: projectsArray });
      }).finally(() => {
        dispatch({ type: 'SET_LOADING', payload: { key: 'projects', value: false } });
      });
      return state.projects;
    }
    
    dispatch({ type: 'SET_LOADING', payload: { key: 'projects', value: true } });
    try {
      const projects = await api.getProjects();
      const projectsArray = Array.isArray(projects) ? projects : projects.items || [];
      dispatch({ type: 'SET_PROJECTS', payload: projectsArray });
      return projectsArray;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'projects', value: false } });
    }
  }, [state.projects, isCacheStale]);
  
  // Fetch resources with cache
  const fetchResources = useCallback(async (forceRefresh = false): Promise<Resource[]> => {
    if (!forceRefresh && state.resources.length > 0 && !isCacheStale('resources')) {
      return state.resources;
    }
    
    const hasCachedData = state.resources.length > 0;
    
    if (!forceRefresh && hasCachedData) {
      dispatch({ type: 'SET_LOADING', payload: { key: 'resources', value: true } });
      api.getResources().then(resources => {
        const resourcesArray = Array.isArray(resources) ? resources : resources.items || [];
        dispatch({ type: 'SET_RESOURCES', payload: resourcesArray });
      }).finally(() => {
        dispatch({ type: 'SET_LOADING', payload: { key: 'resources', value: false } });
      });
      return state.resources;
    }
    
    dispatch({ type: 'SET_LOADING', payload: { key: 'resources', value: true } });
    try {
      const resources = await api.getResources();
      const resourcesArray = Array.isArray(resources) ? resources : resources.items || [];
      dispatch({ type: 'SET_RESOURCES', payload: resourcesArray });
      return resourcesArray;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'resources', value: false } });
    }
  }, [state.resources, isCacheStale]);
  
  // Fetch stats with cache
  const fetchStats = useCallback(async (forceRefresh = false): Promise<Record<string, unknown>> => {
    if (!forceRefresh && state.stats && !isCacheStale('stats')) {
      return state.stats;
    }
    
    dispatch({ type: 'SET_LOADING', payload: { key: 'stats', value: true } });
    try {
      const stats = await api.getStats();
      dispatch({ type: 'SET_STATS', payload: stats });
      return stats;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'stats', value: false } });
    }
  }, [state.stats, isCacheStale]);
  
  // Fetch heatmap data
  const fetchHeatmapData = useCallback(async (): Promise<unknown[]> => {
    if (state.heatmapData) {
      // Background refresh
      api.getHeatmapData().then(data => {
        dispatch({ type: 'SET_HEATMAP_DATA', payload: data });
      });
      return state.heatmapData;
    }
    
    const data = await api.getHeatmapData();
    dispatch({ type: 'SET_HEATMAP_DATA', payload: data });
    return data;
  }, [state.heatmapData]);
  
  // Fetch progress data
  const fetchProgressData = useCallback(async (): Promise<unknown> => {
    if (state.progressData) {
      // Background refresh
      api.getProgressData().then(data => {
        dispatch({ type: 'SET_PROGRESS_DATA', payload: data });
      });
      return state.progressData;
    }
    
    const data = await api.getProgressData();
    dispatch({ type: 'SET_PROGRESS_DATA', payload: data });
    return data;
  }, [state.progressData]);
  
  // Optimistic update for skills
  const updateSkill = useCallback(async (id: string, data: Partial<Skill>, immediate = false) => {
    // Apply optimistic update immediately
    dispatch({ type: 'UPDATE_SKILL', payload: { id, data } });
    
    // Queue change for sync
    dispatch({ type: 'QUEUE_CHANGE', payload: { collection: 'skills', id, type: 'update', data } });
    
    if (immediate) {
      // Sync immediately for critical updates
      await api.updateSkill(id, data as Skill);
      dispatch({ type: 'CLEAR_PENDING', payload: { collection: 'skills', ids: [id] } });
    } else {
      // Schedule debounced sync
      scheduleSyncRef.current?.();
    }
  }, []);
  
  // Optimistic update for projects
  const updateProject = useCallback(async (id: string, data: Partial<Project>, immediate = false) => {
    dispatch({ type: 'UPDATE_PROJECT', payload: { id, data } });
    dispatch({ type: 'QUEUE_CHANGE', payload: { collection: 'projects', id, type: 'update', data } });
    
    if (immediate) {
      await api.updateProject(id, data as Project);
      dispatch({ type: 'CLEAR_PENDING', payload: { collection: 'projects', ids: [id] } });
    } else {
      scheduleSyncRef.current?.();
    }
  }, []);
  
  // Optimistic update for resources
  const updateResource = useCallback(async (id: string, data: Partial<Resource>, immediate = false) => {
    dispatch({ type: 'UPDATE_RESOURCE', payload: { id, data } });
    dispatch({ type: 'QUEUE_CHANGE', payload: { collection: 'resources', id, type: 'update', data } });
    
    if (immediate) {
      await api.updateResource(id, data as Resource);
      dispatch({ type: 'CLEAR_PENDING', payload: { collection: 'resources', ids: [id] } });
    } else {
      scheduleSyncRef.current?.();
    }
  }, []);
  
  // Create operations (immediate, not debounced)
  const createSkill = useCallback(async (data: Omit<Skill, 'id'>): Promise<Skill> => {
    const skill = await api.createSkill(data);
    dispatch({ type: 'ADD_SKILL', payload: skill });
    return skill;
  }, []);
  
  const createProject = useCallback(async (data: Omit<Project, 'id'>): Promise<Project> => {
    const project = await api.createProject(data);
    dispatch({ type: 'ADD_PROJECT', payload: project });
    return project;
  }, []);
  
  const createResource = useCallback(async (data: Omit<Resource, 'id'>): Promise<Resource> => {
    const resource = await api.createResource(data);
    dispatch({ type: 'ADD_RESOURCE', payload: resource });
    return resource;
  }, []);
  
  // Delete operations (optimistic with immediate sync)
  const deleteSkill = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_SKILL', payload: id });
    await api.deleteSkill(id);
  }, []);
  
  const deleteProject = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_PROJECT', payload: id });
    await api.deleteProject(id);
  }, []);
  
  const deleteResource = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_RESOURCE', payload: id });
    await api.deleteResource(id);
  }, []);
  
  // Cache invalidation
  const invalidateCache = useCallback((collection?: 'skills' | 'projects' | 'resources' | 'stats' | 'all') => {
    if (collection === 'all' || !collection) {
      localStorage.removeItem(CACHE_KEYS.skills);
      localStorage.removeItem(CACHE_KEYS.projects);
      localStorage.removeItem(CACHE_KEYS.resources);
      localStorage.removeItem(CACHE_KEYS.stats);
    } else {
      localStorage.removeItem(CACHE_KEYS[collection]);
    }
  }, []);
  
  const clearAllCache = useCallback(() => {
    Object.values(CACHE_KEYS).forEach(key => localStorage.removeItem(key));
    dispatch({ type: 'RESET_CACHE' });
  }, []);
  
  const hasPendingChanges = 
    state.pendingChanges.skills.size > 0 ||
    state.pendingChanges.projects.size > 0 ||
    state.pendingChanges.resources.size > 0;
  
  const value: DataCacheContextValue = {
    state,
    fetchSkills,
    fetchProjects,
    fetchResources,
    fetchStats,
    fetchHeatmapData,
    fetchProgressData,
    updateSkill,
    updateProject,
    updateResource,
    createSkill,
    createProject,
    createResource,
    deleteSkill,
    deleteProject,
    deleteResource,
    syncPendingChanges,
    hasPendingChanges,
    invalidateCache,
    clearAllCache,
  };
  
  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
}

// Hook
export function useDataCache() {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
}

export default DataCacheContext;
