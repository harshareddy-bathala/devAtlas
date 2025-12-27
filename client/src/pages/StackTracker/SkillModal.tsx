import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/common';
import { LoadingButton } from '../../components/LoadingStates';
import { Skill, SkillFormData, Project } from './useSkills';
import { STATUS_CONFIG, CATEGORY_OPTIONS, ICON_OPTIONS, SkillStatus } from './constants';

const skillFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  category: z.enum(['language', 'framework', 'library', 'tool', 'database', 'runtime', 'other']),
  status: z.enum(['want_to_learn', 'learning', 'mastered']),
  icon: z.string().min(1, 'Icon is required'),
  linkedProjects: z.array(z.string()).optional().default([])
});

interface SkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SkillFormData) => Promise<void>;
  editingSkill: Skill | null;
  projects: Project[];
  saving: boolean;
  defaultStatus?: SkillStatus;
}

/**
 * Modal for creating/editing skills
 */
export function SkillModal({
  isOpen,
  onClose,
  onSubmit,
  editingSkill,
  projects,
  saving,
  defaultStatus = 'want_to_learn',
}: SkillModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<SkillFormData>({
    resolver: zodResolver(skillFormSchema),
    defaultValues: {
      name: editingSkill?.name || '',
      category: editingSkill?.category || 'language',
      status: editingSkill?.status || defaultStatus,
      icon: editingSkill?.icon || '📚',
      linkedProjects: editingSkill?.linkedProjects || []
    }
  });

  const selectedIcon = watch('icon');
  const [projectDropdownOpen, setProjectDropdownOpen] = React.useState(false);

  // Reset form when editingSkill changes
  React.useEffect(() => {
    if (isOpen) {
      const linkedProjects = Array.isArray(editingSkill?.linkedProjects)
        ? editingSkill.linkedProjects
        : (editingSkill?.linkedProjects ? Object.values(editingSkill.linkedProjects) : []);
      
      reset({
        name: editingSkill?.name || '',
        category: editingSkill?.category || 'language',
        status: editingSkill?.status || defaultStatus,
        icon: editingSkill?.icon || '📚',
        linkedProjects: linkedProjects as string[]
      });
    }
  }, [isOpen, editingSkill, defaultStatus, reset]);

  const handleClose = () => {
    setProjectDropdownOpen(false);
    reset();
    onClose();
  };

  const onFormSubmit = async (data: SkillFormData) => {
    await onSubmit(data);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingSkill ? 'Edit Skill' : 'Add New Skill'}
      size="sm"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {/* Name */}
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

        {/* Category */}
        <div>
          <label className="block text-sm text-light-400 mb-2">Category</label>
          <select {...register('category')} className="input-field">
            {CATEGORY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm text-light-400 mb-2">Status</label>
          <select {...register('status')} className="input-field">
            {(Object.entries(STATUS_CONFIG) as [SkillStatus, typeof STATUS_CONFIG[SkillStatus]][]).map(
              ([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              )
            )}
          </select>
        </div>

        {/* Link to Projects */}
        <div>
          <label className="block text-sm text-light-400 mb-2">Link to Projects</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="input-field w-full text-left flex items-center justify-between"
            >
              <span className={`truncate ${(watch('linkedProjects') || []).length === 0 ? 'text-light-500' : 'text-white'}`}>
                {(watch('linkedProjects') || []).length === 0
                  ? 'Select projects...'
                  : `${(watch('linkedProjects') || []).length} project${(watch('linkedProjects') || []).length > 1 ? 's' : ''} selected`
                }
              </span>
              <svg
                className={`w-4 h-4 text-light-500 transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {projectDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-dark-700 border border-dark-500 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {projects.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-light-500 text-center">
                    No projects available
                  </div>
                ) : (
                  projects.map(project => {
                    const isSelected = (watch('linkedProjects') || []).includes(project.id);
                    const statusConfig = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG];
                    return (
                      <label
                        key={project.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-dark-600 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const currentLinked = watch('linkedProjects') || [];
                            if (e.target.checked) {
                              setValue('linkedProjects', [...currentLinked, project.id]);
                            } else {
                              setValue('linkedProjects', currentLinked.filter(id => id !== project.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-dark-500 bg-dark-600 text-accent-primary focus:ring-2 focus:ring-accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-white truncate block">{project.name}</span>
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${statusConfig?.color || 'bg-dark-600 text-light-500'}`}>
                          {statusConfig?.label || project.status}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Icon */}
        <div>
          <label className="block text-sm text-light-400 mb-2">Icon</label>
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map(icon => (
              <button
                key={icon}
                type="button"
                onClick={() => setValue('icon', icon)}
                className={`w-10 h-10 text-xl rounded flex items-center justify-center transition-colors
                  ${selectedIcon === icon 
                    ? 'bg-accent-primary/20 ring-2 ring-accent-primary' 
                    : 'bg-dark-600 hover:bg-dark-500'
                  }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={handleClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <LoadingButton 
            type="submit" 
            loading={saving} 
            className="btn-primary flex-1"
            disabled={saving}
            loadingText={editingSkill ? 'Updating...' : 'Adding...'}
          >
            {editingSkill ? 'Update' : 'Add'} Skill
          </LoadingButton>
        </div>
      </form>
    </Modal>
  );
}
