import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { loadFromCache, saveToCache, clearCache, CACHE_KEYS } from '../../utils/cache';
import { useUndo } from '../../contexts/UndoContext';
import { DEBOUNCE_DELAY, SkillStatus, SkillCategory } from './constants';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  status: SkillStatus;
  icon: string;
  linkedProjects?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  name: string;
  status: 'idea' | 'active' | 'completed';
}

export interface SkillFormData {
  name: string;
  category: SkillCategory;
  status: SkillStatus;
  icon: string;
  linkedProjects?: string[];
}

interface UseSkillsReturn {
  skills: Skill[];
  projects: Project[];
  loading: boolean;
  saving: boolean;
  hasPendingSync: boolean;
  groupedSkills: Record<SkillStatus, Skill[]>;
  loadSkills: () => Promise<void>;
  handleCreate: (data: SkillFormData) => Promise<Skill>;
  handleUpdate: (id: string, data: SkillFormData) => Promise<void>;
  handleDelete: (skill: Skill) => Promise<void>;
  handleStatusChange: (skill: Skill, newStatus: SkillStatus) => Promise<void>;
  handleBulkStatusChange: (ids: string[], status: SkillStatus) => Promise<void>;
  handleBulkDelete: (ids: string[]) => Promise<void>;
  handleProjectLinked: (skillId: string, linkedProjects: string[]) => void;
  getLinkedProjectNames: (skill: Skill) => string[];
  setSaving: (saving: boolean) => void;
  setSkills: React.Dispatch<React.SetStateAction<Skill[]>>;
}

/**
 * Custom hook for managing skills state and operations
 */
export function useSkills(): UseSkillsReturn {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState(false);

  const dataFetched = useRef(false);
  const pendingChangesRef = useRef(new Map<string, Partial<Skill>>());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { addUndoableAction } = useUndo();

  const loadSkills = useCallback(async () => {
    try {
      // Load from cache first
      const cachedSkills = loadFromCache<Skill[]>(CACHE_KEYS.skills);
      const cachedProjects = loadFromCache<Project[]>(CACHE_KEYS.projects);

      if (cachedSkills?.data) {
        setSkills(cachedSkills.data);
        setLoading(false);
      }
      if (cachedProjects?.data) {
        setProjects(cachedProjects.data);
      }

      // Fetch fresh data
      const [skillsData, projectsData] = await Promise.all([
        api.getSkills(),
        api.getProjects()
      ]);

      setSkills(skillsData);
      setProjects(projectsData);
      saveToCache(CACHE_KEYS.skills, skillsData);
      saveToCache(CACHE_KEYS.projects, projectsData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (dataFetched.current) return;
    dataFetched.current = true;
    loadSkills();
  }, [loadSkills]);

  // Sync pending changes on visibility change or unload
  useEffect(() => {
    const syncPendingChanges = async () => {
      if (pendingChangesRef.current.size === 0) return;

      const updates = Array.from(pendingChangesRef.current.entries()).map(([id, data]) => ({
        id,
        data
      }));

      try {
        await api.batchUpdateSkills(updates);
        pendingChangesRef.current.clear();
        setHasPendingSync(false);
        saveToCache(CACHE_KEYS.skills, skills);
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
  }, [skills]);

  // Listen for undo events
  useEffect(() => {
    const handleUndo = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.collection === 'skills') {
        loadSkills();
      }
    };
    window.addEventListener('undo-complete', handleUndo);
    return () => window.removeEventListener('undo-complete', handleUndo);
  }, [loadSkills]);

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
        await api.batchUpdateSkills(updates);
        pendingChangesRef.current.clear();
        setHasPendingSync(false);
        toast.success(`Synced ${updates.length} change${updates.length > 1 ? 's' : ''}`);
        saveToCache(CACHE_KEYS.skills, skills);
      } catch (error) {
        console.error('Batch sync failed:', error);
        toast.error('Failed to sync changes. Will retry...');
      }
    }, DEBOUNCE_DELAY);
  }, [skills]);

  const handleCreate = async (data: SkillFormData): Promise<Skill> => {
    const newSkill = await api.createSkill(data);
    setSkills(prev => {
      const updated = [...prev, newSkill];
      saveToCache(CACHE_KEYS.skills, updated);
      return updated;
    });
    return newSkill;
  };

  const handleUpdate = async (id: string, data: SkillFormData): Promise<void> => {
    const skill = skills.find(s => s.id === id);
    if (!skill) return;

    // Optimistic update
    setSkills(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...data } : s);
      saveToCache(CACHE_KEYS.skills, updated);
      return updated;
    });

    await api.updateSkill(id, data);
  };

  const handleDelete = async (skill: Skill): Promise<void> => {
    const skillId = skill.id;
    const skillName = skill.name;

    // Optimistic delete
    setSkills(prev => {
      const updated = prev.filter(s => s.id !== skillId);
      saveToCache(CACHE_KEYS.skills, updated);
      return updated;
    });

    pendingChangesRef.current.delete(skillId);

    try {
      await api.deleteSkill(skillId);

      addUndoableAction({
        type: 'delete',
        collection: 'skills',
        description: `Deleted skill "${skillName}"`,
        previousData: skill,
        entityId: skillId,
      });
    } catch (error: any) {
      clearCache(CACHE_KEYS.skills);
      loadSkills();
      toast.error(error.message || 'Failed to delete skill');
    }
  };

  const handleStatusChange = async (skill: Skill, newStatus: SkillStatus): Promise<void> => {
    if (skill.status === newStatus) return;

    // Check mastered requirement
    if (newStatus === 'mastered') {
      const linkedProjects = skill.linkedProjects || [];
      const completedProjectIds = projects.filter(p => p.status === 'completed').map(p => p.id);
      const hasLinkedCompletedProject = linkedProjects.some(id => completedProjectIds.includes(id));

      if (!hasLinkedCompletedProject) {
        // Return early - caller should handle showing the project link modal
        throw new Error('NEEDS_PROJECT_LINK');
      }
    }

    // If moving away from mastered, unlink projects
    const shouldUnlinkProjects = skill.status === 'mastered' && 
      (newStatus === 'learning' || newStatus === 'want_to_learn');
    const newLinkedProjects = shouldUnlinkProjects ? [] : (skill.linkedProjects || []);

    // Optimistic update
    setSkills(prevSkills => {
      const updated = prevSkills.map(s =>
        s.id === skill.id ? { ...s, status: newStatus, linkedProjects: newLinkedProjects } : s
      );
      saveToCache(CACHE_KEYS.skills, updated);
      return updated;
    });

    // Queue change for batch sync
    pendingChangesRef.current.set(skill.id, {
      name: skill.name,
      category: skill.category,
      status: newStatus,
      icon: skill.icon || '📚',
      linkedProjects: newLinkedProjects
    });

    setHasPendingSync(true);
    scheduleBatchSync();
  };

  const handleBulkStatusChange = async (ids: string[], status: SkillStatus): Promise<void> => {
    // Optimistic update
    setSkills(prev => {
      const updated = prev.map(s => ids.includes(s.id) ? { ...s, status } : s);
      saveToCache(CACHE_KEYS.skills, updated);
      return updated;
    });

    try {
      await api.batchUpdateSkills(ids.map(id => ({ id, data: { status } })));
    } catch (error) {
      loadSkills();
      throw error;
    }
  };

  const handleBulkDelete = async (ids: string[]): Promise<void> => {
    // Optimistic delete
    setSkills(prev => {
      const updated = prev.filter(s => !ids.includes(s.id));
      saveToCache(CACHE_KEYS.skills, updated);
      return updated;
    });

    try {
      await Promise.all(ids.map(id => api.deleteSkill(id)));
    } catch (error) {
      loadSkills();
      throw error;
    }
  };

  const handleProjectLinked = (skillId: string, linkedProjects: string[]): void => {
    setSkills(skills.map(s =>
      s.id === skillId ? { ...s, status: 'mastered' as SkillStatus, linkedProjects } : s
    ));
  };

  const getLinkedProjectNames = (skill: Skill): string[] => {
    const linkedIds = skill.linkedProjects || [];
    return projects
      .filter(p => linkedIds.includes(p.id) && p.status === 'completed')
      .map(p => p.name);
  };

  // Grouped skills by status
  const groupedSkills: Record<SkillStatus, Skill[]> = {
    want_to_learn: skills.filter(s => s.status === 'want_to_learn'),
    learning: skills.filter(s => s.status === 'learning'),
    mastered: skills.filter(s => s.status === 'mastered')
  };

  return {
    skills,
    projects,
    loading,
    saving,
    hasPendingSync,
    groupedSkills,
    loadSkills,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleStatusChange,
    handleBulkStatusChange,
    handleBulkDelete,
    handleProjectLinked,
    getLinkedProjectNames,
    setSaving,
    setSkills,
  };
}
