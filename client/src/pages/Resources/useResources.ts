import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { loadFromCache, saveToCache, clearCache, CACHE_KEYS } from '../../utils/cache';
import { useUndo } from '../../contexts/UndoContext';

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: 'documentation' | 'video' | 'course' | 'article' | 'tutorial' | 'other';
  skill_id?: string;
  skill_name?: string;
  project_id?: string;
  project_name?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Skill {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface ResourceFormData {
  title: string;
  url: string;
  type: Resource['type'];
  skillId?: string;
  projectId?: string;
  notes?: string;
}

export interface UseResourcesReturn {
  resources: Resource[];
  skills: Skill[];
  projects: Project[];
  loading: boolean;
  saving: boolean;
  hasPendingSync: boolean;
  filter: string;
  viewMode: 'grid' | 'list';
  filteredResources: Resource[];
  setFilter: (filter: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  loadData: () => Promise<void>;
  handleCreate: (data: ResourceFormData) => Promise<boolean>;
  handleUpdate: (resourceId: string, data: ResourceFormData) => Promise<boolean>;
  handleDelete: (resource: Resource) => Promise<void>;
  getDomain: (url: string) => string;
}

/**
 * Custom hook for managing resources state and operations
 */
export function useResources(): UseResourcesReturn {
  const [resources, setResources] = useState<Resource[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [hasPendingSync, setHasPendingSync] = useState(false);
  
  const dataFetched = useRef(false);
  const pendingChangesRef = useRef(new Map<string, Partial<Resource>>());
  
  const { addUndoableAction } = useUndo();

  const loadData = useCallback(async () => {
    try {
      // Load from cache first
      const cachedResources = loadFromCache<Resource[]>(CACHE_KEYS.resources);
      const cachedSkills = loadFromCache<Skill[]>(CACHE_KEYS.skills);
      const cachedProjects = loadFromCache<Project[]>(CACHE_KEYS.projects);
      
      if (cachedResources?.data) {
        setResources(cachedResources.data);
        setLoading(false);
      }
      if (cachedSkills?.data) setSkills(cachedSkills.data);
      if (cachedProjects?.data) setProjects(cachedProjects.data);
      
      // Fetch fresh data
      const [resourcesData, skillsData, projectsData] = await Promise.all([
        api.getResources(),
        api.getSkills(),
        api.getProjects()
      ]);
      
      setResources(resourcesData);
      setSkills(skillsData);
      setProjects(projectsData);
      
      // Update cache
      saveToCache(CACHE_KEYS.resources, resourcesData);
      saveToCache(CACHE_KEYS.skills, skillsData);
      saveToCache(CACHE_KEYS.projects, projectsData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (dataFetched.current) return;
    dataFetched.current = true;
    loadData();
  }, [loadData]);

  // Sync pending changes when user leaves page
  useEffect(() => {
    const syncPendingChanges = async () => {
      if (pendingChangesRef.current.size === 0) return;
      
      const updates = Array.from(pendingChangesRef.current.entries()).map(([id, data]) => ({
        id,
        data
      }));
      
      try {
        await api.batchUpdateResources(updates);
        pendingChangesRef.current.clear();
        setHasPendingSync(false);
        saveToCache(CACHE_KEYS.resources, resources);
      } catch (error) {
        console.error('Failed to sync pending changes:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        syncPendingChanges();
      }
    };

    const handleBeforeUnload = () => {
      syncPendingChanges();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      syncPendingChanges();
    };
  }, [resources]);

  // Listen for undo events
  useEffect(() => {
    const handleUndo = async (event: CustomEvent) => {
      const { type, entity, data } = event.detail;
      if (entity !== 'resource') return;
      
      if (type === 'delete' && data) {
        try {
          const restored = await api.createResource(data);
          setResources(prev => {
            const updated = [...prev, restored];
            saveToCache(CACHE_KEYS.resources, updated);
            return updated;
          });
          toast.success(`Restored "${data.title}"`);
        } catch (error) {
          toast.error('Failed to restore resource');
        }
      }
    };

    window.addEventListener('undo-action', handleUndo as unknown as EventListener);
    return () => window.removeEventListener('undo-action', handleUndo as unknown as EventListener);
  }, []);

  const handleCreate = async (data: ResourceFormData): Promise<boolean> => {
    setSaving(true);
    try {
      const sanitizedData = {
        ...data,
        url: data.url.trim(),
      };
      
      const newResource = await api.createResource(sanitizedData);
      
      setResources(prev => {
        const updated = [...prev, newResource];
        saveToCache(CACHE_KEYS.resources, updated);
        return updated;
      });
      
      toast.success('Resource added successfully');
      return true;
    } catch (error: any) {
      clearCache(CACHE_KEYS.resources);
      loadData();
      toast.error(error.message || 'Failed to save resource');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (resourceId: string, data: ResourceFormData): Promise<boolean> => {
    setSaving(true);
    try {
      const sanitizedData = {
        ...data,
        url: data.url.trim(),
      };
      
      // Optimistic update
      setResources(prev => {
        const updated = prev.map(r => r.id === resourceId ? { ...r, ...sanitizedData } : r);
        saveToCache(CACHE_KEYS.resources, updated);
        return updated;
      });
      
      await api.updateResource(resourceId, sanitizedData);
      toast.success('Resource updated successfully');
      return true;
    } catch (error: any) {
      clearCache(CACHE_KEYS.resources);
      loadData();
      toast.error(error.message || 'Failed to save resource');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (resource: Resource) => {
    const resourceId = resource.id;
    const resourceTitle = resource.title;
    
    // Optimistic delete
    setResources(prev => {
      const updated = prev.filter(r => r.id !== resourceId);
      saveToCache(CACHE_KEYS.resources, updated);
      return updated;
    });
    
    pendingChangesRef.current.delete(resourceId);
    
    try {
      await api.deleteResource(resourceId);
      
      addUndoableAction({
        type: 'delete',
        collection: 'resources',
        entityId: resourceId,
        description: `Deleted "${resourceTitle}"`,
        previousData: resource,
      });
    } catch (error: any) {
      clearCache(CACHE_KEYS.resources);
      loadData();
      toast.error(error.message || 'Failed to delete resource');
    }
  };

  const getDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  // Filter resources
  const filteredResources = filter === 'all' 
    ? resources 
    : resources.filter(r => r.type === filter);

  return {
    resources,
    skills,
    projects,
    loading,
    saving,
    hasPendingSync,
    filter,
    viewMode,
    filteredResources,
    setFilter,
    setViewMode,
    loadData,
    handleCreate,
    handleUpdate,
    handleDelete,
    getDomain,
  };
}
