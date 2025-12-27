import { Edit2, Trash2, Github, ExternalLink } from 'lucide-react';
import { STATUS_CONFIG } from './constants';
import { Project } from './useProjects';

interface ProjectCardProps {
  project: Project;
  saving: boolean;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onStatusChange: (project: Project, status: string) => void;
}

/**
 * Individual project card component
 */
export function ProjectCard({ 
  project, 
  saving, 
  onEdit, 
  onDelete, 
  onStatusChange 
}: ProjectCardProps) {
  return (
    <div 
      className="group bg-dark-700 border border-dark-600 rounded p-4 hover:border-dark-500 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-white">{project.name}</h3>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button 
            onClick={() => onEdit(project)}
            className="p-1.5 hover:bg-dark-500 rounded disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1 focus-visible:ring-offset-dark-700"
            disabled={saving}
            aria-label={`Edit ${project.name}`}
          >
            <Edit2 className="w-3.5 h-3.5 text-light-400" />
          </button>
          <button 
            onClick={() => onDelete(project)}
            className="p-1.5 hover:bg-red-500/20 rounded disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-dark-700"
            disabled={saving}
            aria-label={`Delete ${project.name}`}
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
            onClick={() => onStatusChange(project, s)}
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
  );
}
