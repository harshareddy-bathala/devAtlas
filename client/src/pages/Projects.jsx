import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Github, ExternalLink, Lightbulb, Rocket, CheckCircle, Cloud } from 'lucide-react';
import api from '../utils/api';
import { PageLoader, LoadingButton } from '../components/LoadingStates';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination.tsx';
import { Modal } from '../components/common';

// Validation schema
const projectFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  status: z.enum(['idea', 'active', 'completed']),
  githubUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  demoUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  techStack: z.string().max(500, 'Tech stack must be less than 500 characters').optional()
});

const STATUS_CONFIG = {
  idea: { 
    label: 'Ideas', 
    color: 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30',
    icon: Lightbulb,
    description: 'Future project concepts'
  },
  active: { 
    label: 'In Progress', 
    color: 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30',
    icon: Rocket,
    description: 'Currently building'
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30',
    icon: CheckCircle,
    description: 'Shipped & done'
  }
};

// Debounce delay for batching status changes (ms)
const DEBOUNCE_DELAY = 2000;

// Cache key for localStorage
const PROJECTS_CACHE_KEY = 'devOrbit_projects_cache';

// Helper to load from localStorage
function loadFromCache(key) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const { data, timestamp } = JSON.parse(stored);
    return { data, isStale: Date.now() - timestamp > 5 * 60 * 1000 };
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

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, project: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [usePagination, setUsePagination] = useState(false);
  const dataFetched = useRef(false);
  const ITEMS_PER_PAGE = 12;
  
  // Pending changes tracking for debounced batch updates
  const pendingChangesRef = useRef(new Map());
  const debounceTimerRef = useRef(null);
  const [hasPendingSync, setHasPendingSync] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'idea',
      githubUrl: '',
      demoUrl: '',
      techStack: ''
    }
  });

  const loadProjects = useCallback(async (page = 1) => {
    try {
      // Load from cache first for instant UI
      const cached = loadFromCache(PROJECTS_CACHE_KEY);
      if (cached?.data && !usePagination) {
        setProjects(cached.data);
        setLoading(false);
        // If cache is fresh, skip network fetch
        if (!cached.isStale) return;
      }
      
      // Use pagination for large datasets
      if (usePagination) {
        const response = await api.getProjects({ page, limit: ITEMS_PER_PAGE });
        if (response.pagination) {
          setProjects(response.items || response);
          setTotalPages(response.pagination.totalPages);
          setCurrentPage(response.pagination.page);
        } else {
          setProjects(Array.isArray(response) ? response : response.items || []);
        }
      } else {
        // Fetch all projects (for kanban view)
        const data = await api.getProjects();
        const projectList = Array.isArray(data) ? data : (data.items || []);
        setProjects(projectList);
        
        // Update cache
        saveToCache(PROJECTS_CACHE_KEY, projectList);
        
        // Enable pagination if we have many projects
        if (projectList.length > 50) {
          setUsePagination(true);
        }
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [usePagination]);

  useEffect(() => {
    if (dataFetched.current) return;
    dataFetched.current = true;
    loadProjects(currentPage);
  }, [loadProjects, currentPage]);

  // Sync pending changes when user leaves page or tab becomes hidden
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
        saveToCache(PROJECTS_CACHE_KEY, projects);
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
        saveToCache(PROJECTS_CACHE_KEY, projects);
      } catch (error) {
        console.error('Batch sync failed:', error);
        toast.error('Failed to sync changes. Will retry...');
      }
    }, DEBOUNCE_DELAY);
  }, [projects]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadProjects(page);
  };

  const openModal = (project = null, statusOverride = null) => {
    if (project) {
      setEditingProject(project);
      reset({
        name: project.name,
        description: project.description || '',
        status: project.status,
        githubUrl: project.github_url || '',
        demoUrl: project.demo_url || '',
        techStack: project.tech_stack || ''
      });
    } else {
      setEditingProject(null);
      reset({
        name: '',
        description: '',
        status: statusOverride || 'idea',
        githubUrl: '',
        demoUrl: '',
        techStack: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProject(null);
    reset();
  };

  const onSubmit = async (data) => {
    // Validate: completed projects must have at least one link
    if (data.status === 'completed') {
      const hasGithubUrl = data.githubUrl && data.githubUrl.trim() !== '';
      const hasDemoUrl = data.demoUrl && data.demoUrl.trim() !== '';
      
      if (!hasGithubUrl && !hasDemoUrl) {
        toast.error('Completed projects require a GitHub URL or Demo URL');
        return;
      }
    }
    
    setSaving(true);
    try {
      if (editingProject) {
        await api.updateProject(editingProject.id, data);
        toast.success('Project updated successfully');
      } else {
        await api.createProject(data);
        toast.success('Project created successfully');
      }
      loadProjects(currentPage);
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.project) return;
    
    try {
      await api.deleteProject(deleteConfirm.project.id);
      toast.success('Project deleted successfully');
      loadProjects(currentPage);
    } catch (error) {
      toast.error(error.message || 'Failed to delete project');
    }
  };

  const handleStatusChange = async (project, newStatus) => {
    // Don't do anything if already in this status
    if (project.status === newStatus) return;
    
    // If moving to completed, require at least one link (repo or demo)
    if (newStatus === 'completed') {
      const hasGithubUrl = project.github_url && project.github_url.trim() !== '';
      const hasDemoUrl = project.demo_url && project.demo_url.trim() !== '';
      
      if (!hasGithubUrl && !hasDemoUrl) {
        // Show toast and open edit modal for the project
        toast.error('Add a GitHub URL or Demo URL to mark as completed');
        openModal(project);
        return;
      }
    }
    
    // Optimistic update - update UI immediately (no waiting!)
    setProjects(prevProjects => {
      const updated = prevProjects.map(p => 
        p.id === project.id ? { ...p, status: newStatus } : p
      );
      // Update cache immediately for persistence
      saveToCache(PROJECTS_CACHE_KEY, updated);
      return updated;
    });
    
    // Queue the change for batch sync (debounced)
    pendingChangesRef.current.set(project.id, { 
      name: project.name,
      description: project.description,
      status: newStatus,
      githubUrl: project.github_url,
      demoUrl: project.demo_url,
      techStack: project.tech_stack
    });
    
    setHasPendingSync(true);
    
    // Schedule batch sync (will debounce multiple rapid changes)
    scheduleBatchSync();
  };

  const groupedProjects = {
    idea: projects.filter(p => p.status === 'idea'),
    active: projects.filter(p => p.status === 'active'),
    completed: projects.filter(p => p.status === 'completed')
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
          <h1 className="text-3xl font-bold mb-2 text-white">Projects</h1>
          <p className="text-light-500">From idea to deployment - track your builds</p>
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
            New Project
          </button>
        </div>
      </div>

      {/* Kanban-style columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const Icon = config.icon;
          const statusProjects = groupedProjects[status];
          
          return (
            <div key={status} className="bg-dark-800 border border-dark-600 rounded p-4">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-dark-600">
                <div className={`p-2 rounded ${config.color.split(' ')[0]}`}>
                  <Icon className={`w-4 h-4 ${config.color.split(' ')[1]}`} />
                </div>
                <div>
                  <h2 className="font-semibold text-white">{config.label}</h2>
                  <p className="text-xs text-light-500">{config.description}</p>
                </div>
                <span className="ml-auto text-sm text-light-500 bg-dark-700 px-2 py-0.5 rounded">
                  {statusProjects.length}
                </span>
              </div>
              
              <div className="space-y-3 min-h-[200px]">
                {statusProjects.map(project => (
                  <div 
                    key={project.id} 
                    className="group bg-dark-700 border border-dark-600 rounded p-4 hover:border-dark-500 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-white">{project.name}</h3>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button 
                          onClick={() => openModal(project)}
                          className="p-1.5 hover:bg-dark-500 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-light-400" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm({ open: true, project })}
                          className="p-1.5 hover:bg-red-500/20 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                    
                    {project.description && (
                      <p className="text-sm text-light-500 mb-3 line-clamp-2">{project.description}</p>
                    )}
                    
                    {/* Tech Stack */}
                    {project.tech_stack && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {project.tech_stack.split(',').map((tech, i) => (
                          <span 
                            key={i} 
                            className="text-xs px-2 py-0.5 bg-dark-600 rounded text-light-300"
                          >
                            {tech.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Links */}
                    <div className="flex gap-2">
                      {project.github_url && (
                        <a 
                          href={project.github_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-light-400 hover:text-white transition-colors"
                        >
                          <Github className="w-3.5 h-3.5" />
                          GitHub
                        </a>
                      )}
                      {project.demo_url && (
                        <a 
                          href={project.demo_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-light-400 hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Demo
                        </a>
                      )}
                    </div>
                    
                    {/* Quick status change */}
                    <div className="flex gap-1 mt-3 pt-3 border-t border-dark-600">
                      {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(project, s)}
                          className={`flex-1 text-xs py-1 rounded transition-colors ${
                            project.status === s 
                              ? c.color 
                              : 'bg-dark-600 text-light-500 hover:text-light-300'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                
                {statusProjects.length === 0 && (
                  <div className="text-center py-12 px-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-700 flex items-center justify-center">
                      {React.createElement(config.icon, { 
                        className: `w-8 h-8 ${config.color.split(' ')[1]}`,
                        'aria-hidden': 'true'
                      })}
                    </div>
                    <p className="text-light-300 mb-2 font-medium">No {config.label.toLowerCase()} yet</p>
                    <p className="text-sm text-light-500 mb-4">{config.description}</p>
                    <button
                      onClick={() => openModal(null, status)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white rounded transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Your First {status === 'idea' ? 'Idea' : 'Project'}
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
        title={editingProject ? 'Edit Project' : 'New Project'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-light-400 mb-2">Project Name</label>
            <input
              type="text"
              {...register('name')}
              className={`input-field ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="My Awesome Project"
            />
            {errors.name && (
              <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm text-light-400 mb-2">Description</label>
            <textarea
              {...register('description')}
              className={`input-field min-h-[80px] resize-none ${errors.description ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Brief description of your project..."
            />
            {errors.description && (
              <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>
            )}
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
            <label className="block text-sm text-light-400 mb-2">
              <Github className="w-4 h-4 inline mr-1" />
              GitHub URL
            </label>
            <input
              type="url"
              {...register('githubUrl')}
              className={`input-field ${errors.githubUrl ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="https://github.com/username/repo"
            />
            {errors.githubUrl && (
              <p className="text-red-400 text-xs mt-1">{errors.githubUrl.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm text-light-400 mb-2">
              <ExternalLink className="w-4 h-4 inline mr-1" />
              Demo URL
            </label>
            <input
              type="url"
              {...register('demoUrl')}
              className={`input-field ${errors.demoUrl ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="https://my-project.vercel.app"
            />
            {errors.demoUrl && (
              <p className="text-red-400 text-xs mt-1">{errors.demoUrl.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm text-light-400 mb-2">Tech Stack</label>
            <input
              type="text"
              {...register('techStack')}
              className={`input-field ${errors.techStack ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="React, Node.js, PostgreSQL (comma-separated)"
            />
            {errors.techStack && (
              <p className="text-red-400 text-xs mt-1">{errors.techStack.message}</p>
            )}
          </div>
          
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">
              Cancel
            </button>
            <LoadingButton type="submit" loading={saving} className="btn-primary flex-1">
              {editingProject ? 'Update' : 'Create'} Project
            </LoadingButton>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, project: null })}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteConfirm.project?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Pagination - shown when pagination is enabled */}
      {usePagination && totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

export default Projects;
