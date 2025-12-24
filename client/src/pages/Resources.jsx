import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, ExternalLink, FileText, Video, BookOpen, Code, Link as LinkIcon, LayoutGrid, List, Cloud } from 'lucide-react';
import api from '../utils/api';
import { PageLoader, LoadingButton } from '../components/LoadingStates';
import ConfirmDialog from '../components/ConfirmDialog';
import { Modal, VirtualList } from '../components/common';
import { useVirtualization } from '../hooks';

// Validation schema
const resourceFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  url: z.string().url('Invalid URL'),
  type: z.enum(['documentation', 'video', 'course', 'article', 'tutorial', 'other']),
  skillId: z.string().optional(),
  projectId: z.string().optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

const TYPE_CONFIG = {
  documentation: { label: 'Documentation', icon: FileText, color: 'text-[#3B82F6]' },
  video: { label: 'Video', icon: Video, color: 'text-[#F59E0B]' },
  course: { label: 'Course', icon: BookOpen, color: 'text-[#8B5CF6]' },
  article: { label: 'Article', icon: FileText, color: 'text-[#06B6D4]' },
  tutorial: { label: 'Tutorial', icon: Code, color: 'text-[#22C55E]' },
  other: { label: 'Other', icon: LinkIcon, color: 'text-light-400' }
};

// Debounce delay for batching updates (ms)
const DEBOUNCE_DELAY = 2000;

// Cache keys for localStorage
const CACHE_KEYS = {
  resources: 'devOrbit_resources_cache',
  skills: 'devOrbit_skills_cache',
  projects: 'devOrbit_projects_cache',
};

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

// Resource Card Component (for grid view)
function ResourceCard({ resource, onEdit, onDelete, getDomain }) {
  const typeConfig = TYPE_CONFIG[resource.type] || TYPE_CONFIG.other;
  const Icon = typeConfig.icon;
  
  return (
    <div className="bg-dark-800 border border-dark-600 rounded p-4 group hover:border-dark-500 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded bg-dark-700">
          <Icon className={`w-4 h-4 ${typeConfig.color}`} />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button 
            onClick={() => onEdit(resource)}
            className="p-1.5 hover:bg-dark-500 rounded"
          >
            <Edit2 className="w-3.5 h-3.5 text-light-400" />
          </button>
          <button 
            onClick={() => onDelete(resource)}
            className="p-1.5 hover:bg-red-500/20 rounded"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
      
      <h3 className="font-medium mb-1 line-clamp-2 text-white">{resource.title}</h3>
      <p className="text-xs text-light-500 mb-3">{getDomain(resource.url)}</p>
      
      {resource.notes && (
        <p className="text-sm text-light-400 mb-3 line-clamp-2">{resource.notes}</p>
      )}
      
      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {resource.skill_name && (
          <span className="text-xs px-2 py-0.5 bg-[#3B82F6]/15 text-[#3B82F6] rounded">
            {resource.skill_name}
          </span>
        )}
        {resource.project_name && (
          <span className="text-xs px-2 py-0.5 bg-[#8B5CF6]/15 text-[#8B5CF6] rounded">
            {resource.project_name}
          </span>
        )}
      </div>
      
      <a 
        href={resource.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-sm text-[#06B6D4] hover:text-[#3B82F6] transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Open Resource
      </a>
    </div>
  );
}

// Resource List Item Component (for list view - virtualized)
function ResourceListItem({ resource, onEdit, onDelete, getDomain }) {
  const typeConfig = TYPE_CONFIG[resource.type] || TYPE_CONFIG.other;
  const Icon = typeConfig.icon;
  
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-dark-700 transition-colors group h-[120px]">
      <div className="p-2 rounded bg-dark-700 shrink-0">
        <Icon className={`w-5 h-5 ${typeConfig.color}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate text-white">{resource.title}</h3>
        <p className="text-xs text-light-500">{getDomain(resource.url)}</p>
        
        {resource.notes && (
          <p className="text-sm text-light-400 mt-1 line-clamp-1">{resource.notes}</p>
        )}
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded bg-dark-600 ${typeConfig.color}`}>
            {typeConfig.label}
          </span>
          {resource.skill_name && (
            <span className="text-xs px-2 py-0.5 bg-[#3B82F6]/15 text-[#3B82F6] rounded">
              {resource.skill_name}
            </span>
          )}
          {resource.project_name && (
            <span className="text-xs px-2 py-0.5 bg-[#8B5CF6]/15 text-[#8B5CF6] rounded">
              {resource.project_name}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <a 
          href={resource.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 hover:bg-dark-600 rounded transition-colors"
          title="Open Resource"
        >
          <ExternalLink className="w-4 h-4 text-[#06B6D4]" />
        </a>
        <button 
          onClick={() => onEdit(resource)}
          className="p-2 hover:bg-dark-600 rounded transition-colors opacity-0 group-hover:opacity-100"
          title="Edit"
        >
          <Edit2 className="w-4 h-4 text-light-400" />
        </button>
        <button 
          onClick={() => onDelete(resource)}
          className="p-2 hover:bg-red-500/20 rounded transition-colors opacity-0 group-hover:opacity-100"
          title="Delete"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );
}

function Resources() {
  const [resources, setResources] = useState([]);
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, resource: null });
  const dataFetched = useRef(false);
  
  // Pending changes tracking for debounced batch updates
  const pendingChangesRef = useRef(new Map());
  const debounceTimerRef = useRef(null);
  const [hasPendingSync, setHasPendingSync] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      title: '',
      url: '',
      type: 'article',
      skillId: '',
      projectId: '',
      notes: ''
    }
  });

  const loadData = useCallback(async () => {
    try {
      // Load from cache first for instant UI
      const cachedResources = loadFromCache(CACHE_KEYS.resources);
      const cachedSkills = loadFromCache(CACHE_KEYS.skills);
      const cachedProjects = loadFromCache(CACHE_KEYS.projects);
      
      if (cachedResources?.data) {
        setResources(cachedResources.data);
        setLoading(false);
      }
      if (cachedSkills?.data) setSkills(cachedSkills.data);
      if (cachedProjects?.data) setProjects(cachedProjects.data);
      
      // Fetch fresh data (in background if we had cache)
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
    } catch (error) {
      toast.error(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (dataFetched.current) return;
    dataFetched.current = true;
    loadData();
  }, [loadData]);

  // Sync pending changes when user leaves page or tab becomes hidden
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
        await api.batchUpdateResources(updates);
        pendingChangesRef.current.clear();
        setHasPendingSync(false);
        toast.success(`Synced ${updates.length} change${updates.length > 1 ? 's' : ''}`);
        saveToCache(CACHE_KEYS.resources, resources);
      } catch (error) {
        console.error('Batch sync failed:', error);
        toast.error('Failed to sync changes. Will retry...');
      }
    }, DEBOUNCE_DELAY);
  }, [resources]);

  const openModal = (resource = null) => {
    if (resource) {
      setEditingResource(resource);
      reset({
        title: resource.title,
        url: resource.url,
        type: resource.type,
        skillId: resource.skill_id || '',
        projectId: resource.project_id || '',
        notes: resource.notes || ''
      });
    } else {
      setEditingResource(null);
      reset({
        title: '',
        url: '',
        type: 'article',
        skillId: '',
        projectId: '',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingResource(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // Ensure URL is properly formatted (not HTML-encoded)
      const sanitizedData = {
        ...data,
        url: data.url.trim(), // Just trim, don't encode
      };
      
      if (editingResource) {
        await api.updateResource(editingResource.id, sanitizedData);
        toast.success('Resource updated successfully');
      } else {
        await api.createResource(sanitizedData);
        toast.success('Resource added successfully');
      }
      loadData();
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.resource) return;
    
    try {
      await api.deleteResource(deleteConfirm.resource.id);
      // Track resource deletion
      resourceEvents.deleted();
      toast.success('Resource deleted successfully');
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to delete resource');
    }
  };

  const filteredResources = filter === 'all' 
    ? resources 
    : resources.filter(r => r.type === filter);

  // Determine if virtualization should be used (for list view with many items)
  const { shouldVirtualize, virtualListConfig } = useVirtualization(filteredResources, {
    threshold: 50,
    itemHeight: 120, // Approximate height of a resource list item
    overscan: 5
  });

  // Auto-switch to list view if there are many resources
  useEffect(() => {
    if (filteredResources.length > 100 && viewMode === 'grid') {
      setViewMode('list');
    }
  }, [filteredResources.length, viewMode]);

  const getDomain = (url) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
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
          <h1 className="text-3xl font-bold mb-2 text-white">Resources</h1>
          <p className="text-light-500">Your learning library - courses, docs, and tutorials</p>
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
            Add Resource
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded text-sm transition-colors ${
              filter === 'all' 
                ? 'bg-accent-primary text-white' 
                : 'bg-dark-700 text-light-400 hover:text-white'
            }`}
          >
            All ({resources.length})
          </button>
          {Object.entries(TYPE_CONFIG).map(([type, config]) => {
            const count = resources.filter(r => r.type === type).length;
            if (count === 0) return null;
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
                  filter === type 
                    ? 'bg-accent-primary text-white' 
                    : 'bg-dark-700 text-light-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {config.label} ({count})
              </button>
            );
          })}
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex gap-1 bg-dark-700 rounded p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'grid' 
                ? 'bg-dark-600 text-white' 
                : 'text-light-400 hover:text-white'
            }`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list' 
                ? 'bg-dark-600 text-white' 
                : 'text-light-400 hover:text-white'
            }`}
            title="List view (virtualized for large datasets)"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Resources View */}
      {viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map(resource => (
            <ResourceCard 
              key={resource.id} 
              resource={resource} 
              onEdit={openModal} 
              onDelete={(r) => setDeleteConfirm({ open: true, resource: r })}
              getDomain={getDomain}
            />
          ))}
          
          {filteredResources.length === 0 && (
            <div className="col-span-full text-center py-16 px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-700 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-accent-primary" aria-hidden="true" />
              </div>
              <p className="text-light-300 mb-2 font-medium">
                {resources.length === 0 ? 'No resources yet' : 'No resources match your filters'}
              </p>
              <p className="text-sm text-light-500 mb-4">
                {resources.length === 0 
                  ? 'Save helpful links, docs, videos, and courses here' 
                  : 'Try adjusting your search or filters'}
              </p>
              {resources.length === 0 && (
                <button
                  onClick={() => {
                    setEditingResource(null);
                    reset({ title: '', url: '', type: 'article', skillId: '', projectId: '', notes: '' });
                    setShowModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white rounded transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Resource
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        // List View (virtualized for large datasets)
        <div className="bg-dark-800 border border-dark-600 rounded overflow-hidden">
          {shouldVirtualize && virtualListConfig ? (
            <VirtualList
              items={filteredResources}
              itemHeight={virtualListConfig.itemHeight}
              overscan={virtualListConfig.overscan}
              className="h-[600px]"
              keyExtractor={(item) => item.id}
              renderItem={(resource) => (
                <ResourceListItem 
                  resource={resource} 
                  onEdit={openModal} 
                  onDelete={(r) => setDeleteConfirm({ open: true, resource: r })}
                  getDomain={getDomain}
                />
              )}
            />
          ) : (
            <div className="divide-y divide-dark-600">
              {filteredResources.map(resource => (
                <ResourceListItem 
                  key={resource.id}
                  resource={resource} 
                  onEdit={openModal} 
                  onDelete={(r) => setDeleteConfirm({ open: true, resource: r })}
                  getDomain={getDomain}
                />
              ))}
            </div>
          )}
          
          {filteredResources.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-700 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-accent-primary" aria-hidden="true" />
              </div>
              <p className="text-light-300 mb-2 font-medium">
                {resources.length === 0 ? 'No resources yet' : 'No resources match your filters'}
              </p>
              <p className="text-sm text-light-500 mb-4">
                {resources.length === 0 
                  ? 'Save helpful links, docs, videos, and courses here' 
                  : 'Try adjusting your search or filters'}
              </p>
              {resources.length === 0 && (
                <button
                  onClick={() => {
                    setEditingResource(null);
                    reset({ title: '', url: '', type: 'article', skillId: '', projectId: '', notes: '' });
                    setShowModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white rounded transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Resource
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingResource ? 'Edit Resource' : 'Add Resource'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-light-400 mb-2">Title</label>
            <input
              type="text"
              {...register('title')}
              className={`input-field ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="React Documentation"
            />
            {errors.title && (
              <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm text-light-400 mb-2">URL</label>
            <input
              type="url"
              {...register('url')}
              className={`input-field ${errors.url ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="https://react.dev"
            />
            {errors.url && (
              <p className="text-red-400 text-xs mt-1">{errors.url.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm text-light-400 mb-2">Type</label>
            <select {...register('type')} className="input-field">
              {Object.entries(TYPE_CONFIG).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-light-400 mb-2">Link to Skill (optional)</label>
            <select {...register('skillId')} className="input-field">
              <option value="">None</option>
              {skills.map(skill => (
                <option key={skill.id} value={skill.id}>
                  {skill.icon} {skill.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-light-400 mb-2">Link to Project (optional)</label>
            <select {...register('projectId')} className="input-field">
              <option value="">None</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-light-400 mb-2">Notes</label>
            <textarea
              {...register('notes')}
              className={`input-field min-h-[80px] resize-none ${errors.notes ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="What did you learn from this resource?"
            />
            {errors.notes && (
              <p className="text-red-400 text-xs mt-1">{errors.notes.message}</p>
            )}
          </div>
          
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">
              Cancel
            </button>
            <LoadingButton type="submit" loading={saving} className="btn-primary flex-1">
              {editingResource ? 'Update' : 'Add'} Resource
            </LoadingButton>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, resource: null })}
        onConfirm={handleDelete}
        title="Delete Resource"
        message={`Are you sure you want to delete "${deleteConfirm.resource?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

export default Resources;
