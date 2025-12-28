import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Github, ExternalLink } from 'lucide-react';
import { Modal } from '../../components/common';
import { LoadingButton } from '../../components/LoadingStates';
import { STATUS_CONFIG } from './constants';
import { Project, ProjectFormData } from './useProjects';

const projectFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  status: z.enum(['idea', 'active', 'completed']),
  githubUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  demoUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  techStack: z.string().max(500, 'Tech stack must be less than 500 characters').optional()
});

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => Promise<boolean>;
  editingProject: Project | null;
  defaultStatus?: 'idea' | 'active' | 'completed';
  saving: boolean;
}

/**
 * Modal for creating/editing projects
 */
export function ProjectModal({
  isOpen,
  onClose,
  onSubmit,
  editingProject,
  defaultStatus = 'idea',
  saving,
}: ProjectModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      status: defaultStatus,
      githubUrl: '',
      demoUrl: '',
      techStack: ''
    }
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingProject) {
        reset({
          name: editingProject.name,
          description: editingProject.description || '',
          status: editingProject.status,
          githubUrl: editingProject.github_url || '',
          demoUrl: editingProject.demo_url || '',
          techStack: editingProject.tech_stack || ''
        });
      } else {
        reset({
          name: '',
          description: '',
          status: defaultStatus,
          githubUrl: '',
          demoUrl: '',
          techStack: ''
        });
      }
    }
  }, [isOpen, editingProject, defaultStatus, reset]);

  const handleFormSubmit = async (data: ProjectFormData) => {
    const success = await onSubmit(data);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProject ? 'Edit Project' : 'New Project'}
      size="md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <LoadingButton 
            type="submit" 
            loading={saving} 
            disabled={saving}
            loadingText="Saving..."
            className="btn-primary flex-1"
          >
            {editingProject ? 'Update' : 'Create'} Project
          </LoadingButton>
        </div>
      </form>
    </Modal>
  );
}
