import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/common';
import { LoadingButton } from '../../components/LoadingStates';
import { TYPE_CONFIG } from './constants';
import { Resource, ResourceFormData, Skill, Project } from './useResources';

const resourceFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  url: z.string().url('Invalid URL'),
  type: z.enum(['documentation', 'video', 'course', 'article', 'tutorial', 'other']),
  skillId: z.string().optional(),
  projectId: z.string().optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ResourceFormData) => Promise<boolean>;
  editingResource: Resource | null;
  skills: Skill[];
  projects: Project[];
  saving: boolean;
}

/**
 * Modal for creating/editing resources
 */
export function ResourceModal({
  isOpen,
  onClose,
  onSubmit,
  editingResource,
  skills,
  projects,
  saving,
}: ResourceModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ResourceFormData>({
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

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingResource) {
        reset({
          title: editingResource.title,
          url: editingResource.url,
          type: editingResource.type,
          skillId: editingResource.skill_id || '',
          projectId: editingResource.project_id || '',
          notes: editingResource.notes || ''
        });
      } else {
        reset({
          title: '',
          url: '',
          type: 'article',
          skillId: '',
          projectId: '',
          notes: ''
        });
      }
    }
  }, [isOpen, editingResource, reset]);

  const handleFormSubmit = async (data: ResourceFormData) => {
    const success = await onSubmit(data);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingResource ? 'Edit Resource' : 'Add Resource'}
      size="md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm text-light-400 mb-2">Title</label>
          <input
            type="text"
            {...register('title')}
            className={`input-field ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Resource title"
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
            placeholder="https://..."
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
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-light-400 mb-2">Link to Skill</label>
            <select {...register('skillId')} className="input-field">
              <option value="">None</option>
              {skills.map(skill => (
                <option key={skill.id} value={skill.id}>{skill.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-light-400 mb-2">Link to Project</label>
            <select {...register('projectId')} className="input-field">
              <option value="">None</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm text-light-400 mb-2">Notes</label>
          <textarea
            {...register('notes')}
            className={`input-field min-h-[80px] resize-none ${errors.notes ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Optional notes..."
          />
          {errors.notes && (
            <p className="text-red-400 text-xs mt-1">{errors.notes.message}</p>
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
            {editingResource ? 'Update' : 'Add'} Resource
          </LoadingButton>
        </div>
      </form>
    </Modal>
  );
}
