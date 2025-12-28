import { createElement } from 'react';
import { Plus } from 'lucide-react';
import { Skill } from './useSkills';
import { SkillCard } from './SkillCard';
import { STATUS_CONFIG, SkillStatus } from './constants';

interface SkillColumnProps {
  status: SkillStatus;
  skills: Skill[];
  selectedSkillIds: Set<string>;
  bulkSelectMode: boolean;
  onEdit: (skill: Skill) => void;
  onDelete: (skill: Skill) => void;
  onStatusChange: (skill: Skill, status: SkillStatus) => void;
  onShowDependencies: (skill: Skill) => void;
  onToggleSelection: (skillId: string) => void;
  onAddSkill: (status: SkillStatus) => void;
  getLinkedProjectNames: (skill: Skill) => string[];
}

/**
 * Column component for a skill status
 */
export function SkillColumn({
  status,
  skills,
  selectedSkillIds,
  bulkSelectMode,
  onEdit,
  onDelete,
  onStatusChange,
  onShowDependencies,
  onToggleSelection,
  onAddSkill,
  getLinkedProjectNames,
}: SkillColumnProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="bg-dark-800 border border-dark-600 rounded p-4">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-dark-600">
        <div className={`p-2 rounded ${config.color.split(' ')[0]}`}>
          <Icon className={`w-4 h-4 ${config.color.split(' ')[1]}`} />
        </div>
        <h2 className="font-semibold text-white">{config.label}</h2>
        <span className="ml-auto text-sm text-light-500 bg-dark-700 px-2 py-0.5 rounded">
          {skills.length}
        </span>
      </div>

      {/* Skills list */}
      <div className="space-y-3 min-h-[200px]">
        {skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            isSelected={selectedSkillIds.has(skill.id)}
            bulkSelectMode={bulkSelectMode}
            onEdit={onEdit}
            onDelete={(s) => onDelete(s)}
            onStatusChange={onStatusChange}
            onShowDependencies={onShowDependencies}
            onToggleSelection={onToggleSelection}
            linkedProjectNames={getLinkedProjectNames(skill)}
          />
        ))}

        {/* Empty state */}
        {skills.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-700 flex items-center justify-center">
              {createElement(Icon, {
                className: `w-8 h-8 ${config.color.split(' ')[1]}`,
                'aria-hidden': 'true',
              })}
            </div>
            <p className="text-light-300 mb-2 font-medium">
              No {config.label.toLowerCase()} yet
            </p>
            <p className="text-sm text-light-500 mb-4">{config.description}</p>
            <button
              onClick={() => onAddSkill(status)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white rounded transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Your First Skill
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
