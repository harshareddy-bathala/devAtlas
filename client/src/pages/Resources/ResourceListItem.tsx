import { Edit2, Trash2, ExternalLink, MessageSquare } from 'lucide-react';
import { TYPE_CONFIG } from './constants';
import { Resource } from './useResources';

interface ResourceListItemProps {
  resource: Resource;
  onEdit: (resource: Resource) => void;
  onDelete: (resource: Resource) => void;
  onAnnotate: (resource: Resource) => void;
  getDomain: (url: string) => string;
}

/**
 * Resource list item component for list view
 */
export function ResourceListItem({ 
  resource, 
  onEdit, 
  onDelete, 
  onAnnotate, 
  getDomain 
}: ResourceListItemProps) {
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
          onClick={() => onAnnotate(resource)}
          className="p-2 hover:bg-dark-600 rounded transition-colors opacity-0 group-hover:opacity-100"
          title="Notes & Highlights"
        >
          <MessageSquare className="w-4 h-4 text-light-400" />
        </button>
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
