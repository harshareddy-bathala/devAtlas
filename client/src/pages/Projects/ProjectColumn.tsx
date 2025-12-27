import { Plus } from 'lucide-react';
import { STATUS_CONFIG, ProjectStatus } from './constants';
import { Project } from './useProjects';
import { ProjectCard } from './ProjectCard';

interface ProjectColumnProps {
  status: ProjectStatus;
  projects: Project[];
  saving: boolean;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onStatusChange: (project: Project, status: string) => void;
  onAddNew: (status: ProjectStatus) => void;
}

/**
 * Kanban-style column for projects
 */
export function ProjectColumn({
  status,
  projects,
  saving,
  onEdit,
  onDelete,
  onStatusChange,
  onAddNew,
}: ProjectColumnProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  
  return (
    <div className="bg-dark-800 border border-dark-600 rounded p-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-dark-600">
        <div className={`p-2 rounded ${config.color.split(' ')[0]}`}>
          <Icon className={`w-4 h-4 ${config.color.split(' ')[1]}`} />
        </div>
        <div>
          <h2 className="font-semibold text-white">{config.label}</h2>
          <p className="text-xs text-light-500">{config.description}</p>
        </div>
        <span className="ml-auto text-sm text-light-500 bg-dark-700 px-2 py-0.5 rounded">
          {projects.length}
        </span>
      </div>
      
      <div className="space-y-3 min-h-[200px]">
        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            saving={saving}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        ))}
        
        {projects.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-700 flex items-center justify-center">
              <Icon 
                className={`w-8 h-8 ${config.color.split(' ')[1]}`}
                aria-hidden="true"
              />
            </div>
            <p className="text-light-300 mb-2 font-medium">No {config.label.toLowerCase()} yet</p>
            <p className="text-sm text-light-500 mb-4">{config.description}</p>
            <button
              onClick={() => onAddNew(status)}
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
}
