import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { loadFromCache, saveToCache, clearCache, CACHE_KEYS } from '../../utils/cache';
import { useUndo } from '../../contexts/UndoContext';
import { DEBOUNCE_DELAY, ITEMS_PER_PAGE } from './constants';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'idea' | 'active' | 'completed';
  github_url?: string;
  demo_url?: string;
  tech_stack?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Skill {
  id: string;
  name: string;
  status: string;
  linkedProjects?: string[];
}

export interface UseProjectsReturn {
  projects: Project[];
  skills: Skill[];
  loading: boolean;
  saving: boolean;
  hasPendingSync: boolean;
  currentPage: number;
  totalPages: number;
  usePagination: boolean;
  groupedProjects: Record<string, Project[]>;
  loadProjects: (page?: number, forceRefresh?: boolean) => Promise<void>;
  handlePageChange: (page: number) => void;
  handleStatusChange: (project: Project, newStatus: string) => Promise<void>;
  handleCreate: (data: ProjectFormData) => Promise<boolean>;
  handleUpdate: (projectId: string, data: ProjectFormData) => Promise<boolean>;
  handleDelete: (project: Project, linkedSkills: Skill[]) => Promise<void>;
  getLinkedSkillsForProject: (project: Project) => Skill[];
}

export interface ProjectFormData {
  name: string;
  description?: string;
  status: 'idea' | 'active' | 'completed';
  githubUrl?: string;
  demoUrl?: string;
  techStack?: string;
}

/**
 * Custom hook for managing projects state and operations
 */
export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [usePagination, setUsePagination] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  
  const dataFetched = useRef(false);
  const pendingChangesRef = useRef(new Map<string, Partial<Project>>());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { addUndoableAction } = useUndo();

  const loadProjects = useCallback(async (page = 1, forceRefresh = false) => {
    try {
      // Load from cache first for instant UI (unless force refresh)
      if (!forceRefresh) {
        const cachedProjects = loadFromCache<Project[]>(CACHE_KEYS.projects);
        const cachedSkills = loadFromCache<Skill[]>(CACHE_KEYS.skills);
        if (cachedProjects?.data && !usePagination) {
          setProjects(cachedProjects.data);
          setLoading(false);
        }
        if (cachedSkills?.data) {
          setSkills(cachedSkills.data);
        }
        if (cachedProjects && !cachedProjects.isStale) return;
      }
      
      // Fetch projects and skills
      const [projectsResult, skillsResult] = await Promise.all([
        usePagination 
          ? api.getProjects({ page, limit: ITEMS_PER_PAGE })
          : api.getProjects(),
        api.getSkills()
      ]);
      
      // Handle projects
      if (usePagination && projectsResult.pagination) {
        setProjects(projectsResult.items || projectsResult);
        setTotalPages(projectsResult.pagination.totalPages);
        setCurrentPage(projectsResult.pagination.page);
      } else {
        const projectList = Array.isArray(projectsResult) ? projectsResult : (projectsResult.items || []);
        setProjects(projectList);
        saveToCache(CACHE_KEYS.projects, projectList);
        
        if (projectList.length > 50) {
          setUsePagination(true);
        }
      }
      
      // Handle skills
      const skillList = Array.isArray(skillsResult) ? skillsResult : (skillsResult.items || []);
      setSkills(skillList);
      saveToCache(CACHE_KEYS.skills, skillList);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [usePagination]);

  // Initial load
  useEffect(() => {
    if (dataFetched.current) return;
    dataFetched.current = true;
    loadProjects(currentPage);
  }, [loadProjects, currentPage]);

  // Sync pending changes when user leaves page
  useEffect(() => {
    const syncPendingChanges = async () => {
      if (pendingChangesRef.current.size === 0) return;
      
      const updates = Array.from(pendingChangesRef.current.entries()).map(([id, data]) => ({
        id,
        data
      }));
      
      try {
        await api.batchUpdateProjects(updates);
        pendingChangesRef.current.clear();
        setHasPendingSync(false);
        saveToCache(CACHE_KEYS.projects, projects);
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
  }, [projects]);

  // Debounced batch sync function
  const scheduleBatchSync = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(async () => {
      if (pendingChangesRef.current.size === 0) return;
      
      const updates = Array.from(pendingChangesRef.current.entries()).map(([id, data]) => ({
        id,
        data
      }));
      
      try {
        await api.batchUpdateProjects(updates);
        pendingChangesRef.current.clear();
        setHasPendingSync(false);
        toast.success(`Synced ${updates.length} change${updates.length > 1 ? 's' : ''}`);
        saveToCache(CACHE_KEYS.projects, projects);
      } catch (error) {
        console.error('Batch sync failed:', error);
        toast.error('Failed to sync changes. Will retry...');
      }
    }, DEBOUNCE_DELAY);
  }, [projects]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadProjects(page);
  };

  const handleStatusChange = async (project: Project, newStatus: string) => {
    if (project.status === newStatus) return;
    
    // If moving to completed, require at least one link
    if (newStatus === 'completed') {
      const hasGithubUrl = project.github_url && project.github_url.trim() !== '';
      const hasDemoUrl = project.demo_url && project.demo_url.trim() !== '';
      
      if (!hasGithubUrl && !hasDemoUrl) {
        toast.error('Add a GitHub URL or Demo URL to mark as completed');
        return;
      }
    }
    
    // Optimistic update
    setProjects(prevProjects => {
      const updated = prevProjects.map(p => 
        p.id === project.id ? { ...p, status: newStatus as Project['status'] } : p
      );
      saveToCache(CACHE_KEYS.projects, updated);
      return updated;
    });
    
    // Queue the change for batch sync
    pendingChangesRef.current.set(project.id, { 
      name: project.name,
      description: project.description,
      status: newStatus as Project['status'],
      github_url: project.github_url,
      demo_url: project.demo_url,
      tech_stack: project.tech_stack
    });
    
    setHasPendingSync(true);
    scheduleBatchSync();
  };

  const handleCreate = async (data: ProjectFormData): Promise<boolean> => {
    // Validate: completed projects must have at least one link
    if (data.status === 'completed') {
      if (!data.githubUrl?.trim() && !data.demoUrl?.trim()) {
        toast.error('Completed projects require a GitHub URL or Demo URL');
        return false;
      }
    }
    
    setSaving(true);
    try {
      const newProject = await api.createProject(data);
      
      setProjects(prev => {
        const updated = [...prev, newProject];
        saveToCache(CACHE_KEYS.projects, updated);
        return updated;
      });
      
      toast.success('Project added successfully');
      return true;
    } catch (error: any) {
      clearCache(CACHE_KEYS.projects);
      loadProjects(currentPage, true);
      toast.error(error.message || 'Failed to save project');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (projectId: string, data: ProjectFormData): Promise<boolean> => {
    // Validate: completed projects must have at least one link
    if (data.status === 'completed') {
      if (!data.githubUrl?.trim() && !data.demoUrl?.trim()) {
        toast.error('Completed projects require a GitHub URL or Demo URL');
        return false;
      }
    }
    
    setSaving(true);
    try {
      // Optimistic update
      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, ...data } : p
      ));
      
      await api.updateProject(projectId, data);
      
      setProjects(prev => {
        saveToCache(CACHE_KEYS.projects, prev);
        return prev;
      });
      
      toast.success('Project updated successfully');
      return true;
    } catch (error: any) {
      clearCache(CACHE_KEYS.projects);
      loadProjects(currentPage, true);
      toast.error(error.message || 'Failed to save project');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project: Project, linkedSkills: Skill[]) => {
    const projectId = project.id;
    const projectName = project.name;
    
    // Unlink skills if needed
    if (linkedSkills.length > 0) {
      setSkills(prev => {
        const updated = prev.map(skill => {
          const skillLinkedProjects: string[] = Array.isArray(skill.linkedProjects) 
            ? skill.linkedProjects 
            : (skill.linkedProjects ? Object.values(skill.linkedProjects) as string[] : []);
          if (skillLinkedProjects.includes(projectId)) {
            const newLinkedProjects = skillLinkedProjects.filter(id => id !== projectId);
            const newStatus = skill.status === 'mastered' && newLinkedProjects.length === 0 
              ? 'learning' 
              : skill.status;
            return { ...skill, linkedProjects: newLinkedProjects, status: newStatus };
          }
          return skill;
        });
        saveToCache(CACHE_KEYS.skills, updated);
        return updated;
      });
      
      // Unlink skills on server
      for (const skill of linkedSkills) {
        const skillLinkedProjects: string[] = Array.isArray(skill.linkedProjects) 
          ? skill.linkedProjects 
          : (skill.linkedProjects ? Object.values(skill.linkedProjects) as string[] : []);
        const newLinkedProjects = skillLinkedProjects.filter(id => id !== projectId);
        const newStatus = skill.status === 'mastered' && newLinkedProjects.length === 0 
          ? 'learning' 
          : skill.status;
        api.updateSkill(skill.id, {
          ...skill,
          linkedProjects: newLinkedProjects,
          status: newStatus
        }).catch(err => console.warn('Failed to unlink skill:', err));
      }
    }
    
    // Optimistic delete
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== projectId);
      saveToCache(CACHE_KEYS.projects, updated);
      return updated;
    });
    
    pendingChangesRef.current.delete(projectId);
    
    try {
      await api.deleteProject(projectId);
      
      addUndoableAction({
        type: 'delete',
        collection: 'projects',
        description: `Deleted project "${projectName}"`,
        previousData: project,
        entityId: projectId,
      });
    } catch (error: any) {
      clearCache(CACHE_KEYS.projects);
      loadProjects(currentPage, true);
      toast.error(error.message || 'Failed to delete project');
    }
  };

  const getLinkedSkillsForProject = (project: Project): Skill[] => {
    return skills.filter(skill => {
      const skillLinkedProjects: string[] = Array.isArray(skill.linkedProjects) 
        ? skill.linkedProjects 
        : (skill.linkedProjects ? Object.values(skill.linkedProjects) as string[] : []);
      return skillLinkedProjects.includes(project.id);
    });
  };

  // Listen for undo events
  useEffect(() => {
    const handleUndo = (event: CustomEvent) => {
      if (event.detail?.collection === 'projects') {
        loadProjects(currentPage, true);
      }
    };
    window.addEventListener('undo-complete', handleUndo as EventListener);
    return () => window.removeEventListener('undo-complete', handleUndo as EventListener);
  }, [currentPage, loadProjects]);

  const groupedProjects = {
    idea: projects.filter(p => p.status === 'idea'),
    active: projects.filter(p => p.status === 'active'),
    completed: projects.filter(p => p.status === 'completed')
  };

  return {
    projects,
    skills,
    loading,
    saving,
    hasPendingSync,
    currentPage,
    totalPages,
    usePagination,
    groupedProjects,
    loadProjects,
    handlePageChange,
    handleStatusChange,
    handleCreate,
    handleUpdate,
    handleDelete,
    getLinkedSkillsForProject,
  };
}
