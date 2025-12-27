import { Edit2, Trash2, ExternalLink, MessageSquare } from 'lucide-react';
import { TYPE_CONFIG } from './constants';
import { Resource } from './useResources';

interface ResourceCardProps {
  resource: Resource;
  onEdit: (resource: Resource) => void;
  onDelete: (resource: Resource) => void;
  onAnnotate: (resource: Resource) => void;
  getDomain: (url: string) => string;
}

/**
 * Resource card component for grid view
 */
export function ResourceCard({ 
  resource, 
  onEdit, 
  onDelete, 
  onAnnotate, 
  getDomain 
}: ResourceCardProps) {
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
            onClick={() => onAnnotate(resource)}
            className="p-1.5 hover:bg-dark-500 rounded"
            title="Notes & Highlights"
          >
            <MessageSquare className="w-3.5 h-3.5 text-light-400" />
          </button>
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
