import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Sparkles, BookOpen, Target, FolderCheck, Cloud, CloudOff } from 'lucide-react';
import api from '../utils/api';
import { PageLoader, LoadingButton } from '../components/LoadingStates';
import ConfirmDialog from '../components/ConfirmDialog';
import RequireProjectLinkModal from '../components/RequireProjectLinkModal';
import { Modal } from '../components/common';

// Validation schema
const skillFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  category: z.enum(['language', 'framework', 'library', 'tool', 'database', 'runtime', 'other']),
  status: z.enum(['want_to_learn', 'learning', 'mastered']),
  icon: z.string().min(1, 'Icon is required')
});

const STATUS_CONFIG = {
  want_to_learn: { 
    label: 'Want to Learn', 
    color: 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30',
    icon: Sparkles
  },
  learning: { 
    label: 'Learning', 
    color: 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30',
    icon: BookOpen
  },
  mastered: { 
    label: 'Mastered', 
    color: 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30',
    icon: Target
  }
};

const CATEGORY_OPTIONS = [
  { value: 'language', label: 'Language' },
  { value: 'framework', label: 'Framework' },
  { value: 'library', label: 'Library' },
  { value: 'tool', label: 'Tool' },
  { value: 'database', label: 'Database' },
  { value: 'runtime', label: 'Runtime' },
  { value: 'other', label: 'Other' }
];

const ICON_OPTIONS = ['🟨', '🔷', '⚛️', '🟩', '🐍', '🦀', '🐳', '🐘', '☕', '💎', '🔶', '🟣', '📚', '⚡', '🔥', '🌐'];

// Debounce delay for batching status changes (ms)
const DEBOUNCE_DELAY = 2000;

// Cache keys for localStorage
const CACHE_KEYS = {
  skills: 'devOrbit_skills_cache',
  projects: 'devOrbit_projects_cache',
  metadata: 'devOrbit_cache_metadata',
};

// Cache TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Helper to load from localStorage
function loadFromCache(key) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const { data, timestamp } = JSON.parse(stored);
    // Return data even if stale - we'll refresh in background
    return { data, isStale: Date.now() - timestamp > CACHE_TTL };
  } catch {
    return null;
  }
}

// Helper to save to localStorage
function saveToCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    console.warn('Failed to save cache:', e);
  }
}

function StackTracker() {
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, skill: null });
  const [requireProjectModal, setRequireProjectModal] = useState({ open: false, skill: null });
  const dataFetched = useRef(false);
  
  // Pending changes tracking for debounced batch updates
  const pendingChangesRef = useRef(new Map());
  const debounceTimerRef = useRef(null);
  const [hasPendingSync, setHasPendingSync] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(skillFormSchema),
    defaultValues: {
      name: '',
      category: 'language',
      status: 'want_to_learn',
      icon: '📚'
    }
  });

  const selectedIcon = watch('icon');

  const loadSkills = useCallback(async () => {
    try {
      // Load from cache first for instant UI
      const cachedSkills = loadFromCache(CACHE_KEYS.skills);
      const cachedProjects = loadFromCache(CACHE_KEYS.projects);
      
      if (cachedSkills?.data) {
        setSkills(cachedSkills.data);
        setLoading(false);
      }
      if (cachedProjects?.data) {
        setProjects(cachedProjects.data);
      }
      
      // Fetch fresh data (in background if we had cache)
      const [skillsData, projectsData] = await Promise.all([
        api.getSkills(),
        api.getProjects()
      ]);
      
      setSkills(skillsData);
      setProjects(projectsData);
      
      // Update cache
      saveToCache(CACHE_KEYS.skills, skillsData);
      saveToCache(CACHE_KEYS.projects, projectsData);
    } catch (error) {
      toast.error(error.message || 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (dataFetched.current) return;
    dataFetched.current = true;
    loadSkills();
  }, [loadSkills]);

  // Sync pending changes when user leaves page or tab becomes hidden
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
        // Update cache after successful sync
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
      // Sync on unmount
      syncPendingChanges();
    };
  }, [skills]);

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
        // Update cache after successful sync
        saveToCache(CACHE_KEYS.skills, skills);
      } catch (error) {
        console.error('Batch sync failed:', error);
        toast.error('Failed to sync changes. Will retry...');
      }
    }, DEBOUNCE_DELAY);
  }, [skills]);

  const openModal = (skill = null) => {
    if (skill) {
      setEditingSkill(skill);
      reset({
        name: skill.name,
        category: skill.category,
        status: skill.status,
        icon: skill.icon
      });
    } else {
      setEditingSkill(null);
      reset({ name: '', category: 'language', status: 'want_to_learn', icon: '📚' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSkill(null);
    reset();
  };

  const onSubmit = async (data) => {
    // Check if trying to set status to mastered and skill doesn't have linked completed project
    if (data.status === 'mastered') {
      const linkedProjects = editingSkill?.linkedProjects || [];
      const completedProjectIds = projects.filter(p => p.status === 'completed').map(p => p.id);
      const hasLinkedCompletedProject = linkedProjects.some(id => completedProjectIds.includes(id));
      
      if (!hasLinkedCompletedProject) {
        // Close current modal and open require project modal
        closeModal();
        setRequireProjectModal({ 
          open: true, 
          skill: editingSkill ? { ...editingSkill, ...data } : { ...data, id: null }
        });
        toast('Please link a completed project first to mark as Mastered', { icon: '⚠️' });
        return;
      }
    }

    setSaving(true);
    try {
      if (editingSkill) {
        await api.updateSkill(editingSkill.id, data);
        toast.success('Skill updated successfully');
      } else {
        await api.createSkill(data);
        toast.success('Skill added successfully');
      }
      loadSkills();
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Failed to save skill');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.skill) return;
    
    try {
      await api.deleteSkill(deleteConfirm.skill.id);
      toast.success('Skill deleted successfully');
      loadSkills();
    } catch (error) {
      toast.error(error.message || 'Failed to delete skill');
    }
  };

  const handleStatusChange = async (skill, newStatus) => {
    // Don't do anything if already in this status
    if (skill.status === newStatus) return;
    
    // Check if trying to mark as mastered - need to verify linked completed project
    if (newStatus === 'mastered') {
      const linkedProjects = skill.linkedProjects || [];
      const completedProjectIds = projects.filter(p => p.status === 'completed').map(p => p.id);
      const hasLinkedCompletedProject = linkedProjects.some(id => completedProjectIds.includes(id));
      
      if (!hasLinkedCompletedProject) {
        // Open modal to require linking a project
        setRequireProjectModal({ open: true, skill });
        return;
      }
    }
    
    // Optimistic update - update UI immediately (no waiting!)
    setSkills(prevSkills => {
      const updated = prevSkills.map(s => 
        s.id === skill.id ? { ...s, status: newStatus } : s
      );
      // Update cache immediately for persistence
      saveToCache(CACHE_KEYS.skills, updated);
      return updated;
    });
    
    // Queue the change for batch sync (debounced)
    const linkedProjects = Array.isArray(skill.linkedProjects) 
      ? skill.linkedProjects 
      : (skill.linkedProjects ? Object.values(skill.linkedProjects) : []);
    
    pendingChangesRef.current.set(skill.id, {
      name: skill.name,
      category: skill.category,
      status: newStatus,
      icon: skill.icon || '📚',
      linkedProjects: linkedProjects
    });
    
    setHasPendingSync(true);
    
    // Schedule batch sync (will debounce multiple rapid changes)
    scheduleBatchSync();
  };

  const handleProjectLinked = (skillId, linkedProjects) => {
    // Update local state after project is linked and skill is marked as mastered
    setSkills(skills.map(s => 
      s.id === skillId ? { ...s, status: 'mastered', linkedProjects } : s
    ));
  };

  // Helper to get linked project names for a skill
  const getLinkedProjectNames = (skill) => {
    const linkedIds = skill.linkedProjects || [];
    return projects
      .filter(p => linkedIds.includes(p.id) && p.status === 'completed')
      .map(p => p.name);
  };

  const groupedSkills = {
    want_to_learn: skills.filter(s => s.status === 'want_to_learn'),
    learning: skills.filter(s => s.status === 'learning'),
    mastered: skills.filter(s => s.status === 'mastered')
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">Stack Tracker</h1>
          <p className="text-light-500">Track your technology journey from interest to mastery</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sync status indicator */}
          {hasPendingSync && (
            <div className="flex items-center gap-2 text-sm text-light-500 bg-dark-700 px-3 py-1.5 rounded">
              <Cloud className="w-4 h-4 animate-pulse text-accent-primary" />
              <span>Syncing...</span>
            </div>
          )}
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Skill
          </button>
        </div>
      </div>

      {/* Kanban-style columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const Icon = config.icon;
          const statusSkills = groupedSkills[status];
          
          return (
            <div key={status} className="bg-dark-800 border border-dark-600 rounded p-4">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-dark-600">
                <div className={`p-2 rounded ${config.color.split(' ')[0]}`}>
                  <Icon className={`w-4 h-4 ${config.color.split(' ')[1]}`} />
                </div>
                <h2 className="font-semibold text-white">{config.label}</h2>
                <span className="ml-auto text-sm text-light-500 bg-dark-700 px-2 py-0.5 rounded">
                  {statusSkills.length}
                </span>
              </div>
              
              <div className="space-y-3 min-h-[200px]">
                {statusSkills.map(skill => {
                  const linkedProjectNames = getLinkedProjectNames(skill);
                  
                  return (
                  <div 
                    key={skill.id} 
                    className="group bg-dark-700 border border-dark-600 rounded p-3 hover:border-dark-500 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{skill.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate text-white">{skill.name}</h3>
                        <p className="text-xs text-light-500 capitalize">{skill.category}</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button 
                          onClick={() => openModal(skill)}
                          className="p-1.5 hover:bg-dark-500 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-light-400" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm({ open: true, skill })}
                          className="p-1.5 hover:bg-red-500/20 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Show linked projects for mastered skills */}
                    {skill.status === 'mastered' && linkedProjectNames.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-light-500">
                        <FolderCheck className="w-3 h-3 text-[#22C55E]" />
                        <span className="truncate">
                          {linkedProjectNames.length === 1 
                            ? linkedProjectNames[0] 
                            : `${linkedProjectNames[0]} +${linkedProjectNames.length - 1} more`}
                        </span>
                      </div>
                    )}
                    
                    {/* Quick status change */}
                    <div className="flex gap-1 mt-3 pt-2 border-t border-dark-600">
                      {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(skill, s)}
                          className={`flex-1 text-xs py-1 rounded transition-colors ${
                            skill.status === s 
                              ? c.color 
                              : 'bg-dark-600 text-light-500 hover:text-light-300'
                          }`}
                        >
                          {s === 'want_to_learn' ? 'Want' : s === 'learning' ? 'Learn' : 'Done'}
                        </button>
                      ))}
                    </div>
                  </div>
                  );
                })}
                
                {statusSkills.length === 0 && (
                  <div className="text-center py-12 px-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-700 flex items-center justify-center">
                      {React.createElement(STATUS_CONFIG[status].icon, { 
                        className: `w-8 h-8 ${STATUS_CONFIG[status].color.split(' ')[1]}`,
                        'aria-hidden': 'true'
                      })}
                    </div>
                    <p className="text-light-300 mb-2 font-medium">No {STATUS_CONFIG[status].label.toLowerCase()} yet</p>
                    <p className="text-sm text-light-500 mb-4">{STATUS_CONFIG[status].description}</p>
                    <button
                      onClick={() => {
                        setEditingSkill(null);
                        reset({ status, name: '', category: 'language', icon: '📚' });
                        setShowModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white rounded transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Your First Skill
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingSkill ? 'Edit Skill' : 'Add New Skill'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-light-400 mb-2">Name</label>
            <input
              type="text"
              {...register('name')}
              className={`input-field ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="e.g., JavaScript, React, Docker"
            />
            {errors.name && (
              <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm text-light-400 mb-2">Category</label>
            <select {...register('category')} className="input-field">
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-light-400 mb-2">Status</label>
            <select {...register('status')} className="input-field">
              {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-light-400 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setValue('icon', icon)}
                  className={`w-10 h-10 text-xl rounded flex items-center justify-center transition-colors
                    ${selectedIcon === icon ? 'bg-accent-primary/20 ring-2 ring-accent-primary' : 'bg-dark-600 hover:bg-dark-500'}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">
              Cancel
            </button>
            <LoadingButton type="submit" loading={saving} className="btn-primary flex-1">
              {editingSkill ? 'Update' : 'Add'} Skill
            </LoadingButton>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, skill: null })}
        onConfirm={handleDelete}
        title="Delete Skill"
        message={`Are you sure you want to delete "${deleteConfirm.skill?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Require Project Link Modal */}
      <RequireProjectLinkModal
        isOpen={requireProjectModal.open}
        onClose={() => setRequireProjectModal({ open: false, skill: null })}
        skill={requireProjectModal.skill}
        onLinked={(linkedProjects) => {
          if (requireProjectModal.skill) {
            handleProjectLinked(requireProjectModal.skill.id, linkedProjects);
          }
        }}
      />
    </div>
  );
}

export default StackTracker;
