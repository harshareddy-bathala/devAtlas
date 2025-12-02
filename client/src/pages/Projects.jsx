import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Github, ExternalLink, Lightbulb, Rocket, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import { PageLoader, LoadingButton } from '../components/LoadingStates';
import ConfirmDialog from '../components/ConfirmDialog';

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
    color: 'bg-accent-orange/20 text-accent-orange border-accent-orange/30',
    icon: Lightbulb,
    description: 'Future project concepts'
  },
  active: { 
    label: 'In Progress', 
    color: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
    icon: Rocket,
    description: 'Currently building'
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-accent-green/20 text-accent-green border-accent-green/30',
    icon: CheckCircle,
    description: 'Shipped & done'
  }
};

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, project: null });

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

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      toast.error(error.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const openModal = (project = null) => {
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
        status: 'idea',
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
    setSaving(true);
    try {
      if (editingProject) {
        await api.updateProject(editingProject.id, data);
        toast.success('Project updated successfully');
      } else {
        await api.createProject(data);
        toast.success('Project created successfully');
      }
      loadProjects();
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
      loadProjects();
    } catch (error) {
      toast.error(error.message || 'Failed to delete project');
    }
  };

  const handleStatusChange = async (project, newStatus) => {
    try {
      await api.updateProject(project.id, { 
        name: project.name,
        description: project.description,
        status: newStatus,
        githubUrl: project.github_url,
        demoUrl: project.demo_url,
        techStack: project.tech_stack
      });
      toast.success(`Moved to ${STATUS_CONFIG[newStatus].label}`);
      loadProjects();
    } catch (error) {
      toast.error(error.message || 'Failed to update project status');
    }
  };

  const groupedProjects = {
    idea: projects.filter(p => p.status === 'idea'),
    active: projects.filter(p => p.status === 'active'),
    completed: projects.filter(p => p.status === 'completed')
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Projects</h1>
          <p className="text-gray-400">From idea to deployment - track your builds</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Kanban-style columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const Icon = config.icon;
          const statusProjects = groupedProjects[status];
          
          return (
            <div key={status} className="glass-card p-4">
              <div className={`flex items-center gap-2 mb-4 pb-3 border-b border-dark-600`}>
                <div className={`p-2 rounded-lg ${config.color.split(' ')[0]}`}>
                  <Icon className={`w-4 h-4 ${config.color.split(' ')[1]}`} />
                </div>
                <div>
                  <h2 className="font-semibold">{config.label}</h2>
                  <p className="text-xs text-gray-500">{config.description}</p>
                </div>
                <span className="ml-auto text-sm text-gray-500 bg-dark-600 px-2 py-0.5 rounded-full">
                  {statusProjects.length}
                </span>
              </div>
              
              <div className="space-y-3 min-h-[200px]">
                {statusProjects.map(project => (
                  <div 
                    key={project.id} 
                    className="group bg-dark-700/50 rounded-lg p-4 hover:bg-dark-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium">{project.name}</h3>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button 
                          onClick={() => openModal(project)}
                          className="p-1.5 hover:bg-dark-500 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gray-400" />
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
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{project.description}</p>
                    )}
                    
                    {/* Tech Stack */}
                    {project.tech_stack && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {project.tech_stack.split(',').map((tech, i) => (
                          <span 
                            key={i} 
                            className="text-xs px-2 py-0.5 bg-dark-600 rounded-full text-gray-300"
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
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
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
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
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
                              : 'bg-dark-600 text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                
                {statusProjects.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No projects here yet</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {editingProject ? 'Edit Project' : 'New Project'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-dark-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Project Name</label>
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
                <label className="block text-sm text-gray-400 mb-2">Description</label>
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
                <label className="block text-sm text-gray-400 mb-2">Status</label>
                <select {...register('status')} className="input-field">
                  {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">
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
                <label className="block text-sm text-gray-400 mb-2">
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
                <label className="block text-sm text-gray-400 mb-2">Tech Stack</label>
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
          </div>
        </div>
      )}

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
    </div>
  );
}

export default Projects;
