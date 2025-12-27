import { Edit2, Trash2, GitBranch, FolderCheck } from 'lucide-react';
import { Skill } from './useSkills';
import { STATUS_CONFIG, SkillStatus } from './constants';

interface SkillCardProps {
  skill: Skill;
  isSelected: boolean;
  bulkSelectMode: boolean;
  onEdit: (skill: Skill) => void;
  onDelete: (skill: Skill) => void;
  onStatusChange: (skill: Skill, status: SkillStatus) => void;
  onShowDependencies: (skill: Skill) => void;
  onToggleSelection: (skillId: string) => void;
  linkedProjectNames: string[];
}

/**
 * Individual skill card component
 */
export function SkillCard({
  skill,
  isSelected,
  bulkSelectMode,
  onEdit,
  onDelete,
  onStatusChange,
  onShowDependencies,
  onToggleSelection,
  linkedProjectNames,
}: SkillCardProps) {
  return (
    <div
      className={`group bg-dark-700 border rounded p-3 hover:border-dark-500 transition-colors ${
        isSelected ? 'border-accent-primary' : 'border-dark-600'
      }`}
    >
      <div className="flex items-center gap-3">
        {bulkSelectMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(skill.id)}
            className="w-4 h-4 rounded border-dark-500 bg-dark-600 text-accent-primary focus:ring-2 focus:ring-accent-primary"
          />
        )}
        <span className="text-xl">{skill.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate text-white">{skill.name}</h3>
          <p className="text-xs text-light-500 capitalize">{skill.category}</p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button
            onClick={() => onShowDependencies(skill)}
            className="p-1.5 hover:bg-dark-500 rounded"
            title="Manage Dependencies"
          >
            <GitBranch className="w-3.5 h-3.5 text-light-400" />
          </button>
          <button
            onClick={() => onEdit(skill)}
            className="p-1.5 hover:bg-dark-500 rounded"
            title="Edit Skill"
          >
            <Edit2 className="w-3.5 h-3.5 text-light-400" />
          </button>
          <button
            onClick={() => onDelete(skill)}
            className="p-1.5 hover:bg-red-500/20 rounded"
            title="Delete Skill"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Linked projects for mastered skills */}
      {skill.status === 'mastered' && linkedProjectNames.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-light-500">
          <FolderCheck className="w-3 h-3 text-[#22C55E]" />
          <span className="truncate">
            {linkedProjectNames.length === 1
              ? linkedProjectNames[0]
              : `${linkedProjectNames[0]} +${linkedProjectNames.length - 1} more`}
          </span>
        </div>
      )}

      {/* Quick status change */}
      <div className="flex gap-1 mt-3 pt-2 border-t border-dark-600">
        {(Object.keys(STATUS_CONFIG) as SkillStatus[]).map((status) => {
          const config = STATUS_CONFIG[status];
          return (
            <button
              key={status}
              onClick={() => onStatusChange(skill, status)}
              className={`flex-1 text-xs py-1 rounded transition-colors ${
                skill.status === status
                  ? config.color
                  : 'bg-dark-600 text-light-500 hover:text-light-300'
              }`}
            >
              {status === 'want_to_learn' ? 'Want' : status === 'learning' ? 'Learn' : 'Done'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
