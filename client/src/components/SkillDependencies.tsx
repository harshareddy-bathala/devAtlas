/**
 * SkillDependencies - Manage and visualize skill prerequisites
 * 
 * Features:
 * - Define prerequisite skills
 * - Visual dependency graph
 * - Learning path suggestions
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  GitBranch, 
  Plus, 
  X, 
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import api from '../utils/api';

interface SkillDependency {
  skillId: string;
  prerequisiteIds: string[];
}

interface SkillDependenciesProps {
  skillId: string;
  skillName: string;
  onUpdate?: () => void;
}

const DEPENDENCIES_KEY = 'devOrbit_skill_dependencies';

function loadDependencies(): SkillDependency[] {
  try {
    const stored = localStorage.getItem(DEPENDENCIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveDependencies(deps: SkillDependency[]): void {
  try {
    localStorage.setItem(DEPENDENCIES_KEY, JSON.stringify(deps));
  } catch {}
}

export function SkillDependencies({ skillId, skillName, onUpdate }: SkillDependenciesProps) {
  const [dependencies, setDependencies] = useState<SkillDependency[]>(loadDependencies());
  const [skills, setSkills] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get prerequisites for this skill
  const skillDependency = dependencies.find(d => d.skillId === skillId);
  const prerequisiteIds = skillDependency?.prerequisiteIds || [];

  // Load all skills
  useEffect(() => {
    const loadSkills = async () => {
      try {
        const data = await api.getSkills();
        setSkills(Array.isArray(data) ? data : data.items || []);
      } catch (error) {
        console.error('Failed to load skills:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSkills();
  }, []);

  // Get prerequisite skill objects
  const prerequisites = useMemo(() => 
    skills.filter(s => prerequisiteIds.includes(s.id)),
    [skills, prerequisiteIds]
  );

  // Get available skills (not this skill, not already a prerequisite)
  const availableSkills = useMemo(() => 
    skills.filter(s => s.id !== skillId && !prerequisiteIds.includes(s.id)),
    [skills, skillId, prerequisiteIds]
  );

  // Check if prerequisites are completed
  const incompletePrereqs = prerequisites.filter(s => s.status !== 'mastered');
  const allPrereqsComplete = incompletePrereqs.length === 0 && prerequisites.length > 0;

  const addPrerequisite = (prereqId: string) => {
    const existing = dependencies.find(d => d.skillId === skillId);
    let updated: SkillDependency[];
    
    if (existing) {
      updated = dependencies.map(d => 
        d.skillId === skillId 
          ? { ...d, prerequisiteIds: [...d.prerequisiteIds, prereqId] }
          : d
      );
    } else {
      updated = [...dependencies, { skillId, prerequisiteIds: [prereqId] }];
    }
    
    setDependencies(updated);
    saveDependencies(updated);
    onUpdate?.();
  };

  const removePrerequisite = (prereqId: string) => {
    const updated = dependencies.map(d => 
      d.skillId === skillId 
        ? { ...d, prerequisiteIds: d.prerequisiteIds.filter(id => id !== prereqId) }
        : d
    ).filter(d => d.prerequisiteIds.length > 0);
    
    setDependencies(updated);
    saveDependencies(updated);
    onUpdate?.();
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-32 bg-dark-600 rounded" />
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-dark-600">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-light-500 hover:text-light-300 transition-colors w-full"
      >
        <GitBranch className="w-4 h-4" />
        <span>Prerequisites</span>
        {prerequisites.length > 0 && (
          <span className="px-1.5 py-0.5 bg-dark-600 rounded text-xs">
            {prerequisites.length}
          </span>
        )}
        {incompletePrereqs.length > 0 && (
          <AlertCircle className="w-3.5 h-3.5 text-yellow-400 ml-auto" />
        )}
        {allPrereqsComplete && (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 ml-auto" />
        )}
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 ml-auto" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-auto" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {/* Prerequisites List */}
          {prerequisites.length > 0 ? (
            <div className="space-y-2">
              {prerequisites.map(prereq => (
                <div 
                  key={prereq.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                    prereq.status === 'mastered'
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-dark-700 border-dark-600'
                  }`}
                >
                  <span className="text-lg">{prereq.icon}</span>
                  <span className="flex-1 text-sm text-light-300">{prereq.name}</span>
                  {prereq.status === 'mastered' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : prereq.status === 'learning' ? (
                    <Sparkles className="w-4 h-4 text-blue-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                  )}
                  <button
                    onClick={() => removePrerequisite(prereq.id)}
                    className="p-1 hover:bg-dark-600 rounded transition-colors"
                    title="Remove prerequisite"
                  >
                    <X className="w-3.5 h-3.5 text-light-500" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-light-500 py-2">
              No prerequisites defined for {skillName}
            </p>
          )}

          {/* Add Prerequisite */}
          {showPicker ? (
            <div className="bg-dark-700 border border-dark-600 rounded-lg p-2">
              <div className="text-xs text-light-500 mb-2">Select prerequisite skill:</div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {availableSkills.length > 0 ? (
                  availableSkills.map(skill => (
                    <button
                      key={skill.id}
                      onClick={() => {
                        addPrerequisite(skill.id);
                        setShowPicker(false);
                      }}
                      className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-dark-600 rounded transition-colors text-left"
                    >
                      <span className="text-base">{skill.icon}</span>
                      <span className="text-sm text-light-300">{skill.name}</span>
                      <span className="text-xs text-light-500 ml-auto">{skill.category}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-light-500 py-2 text-center">
                    No more skills available
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowPicker(false)}
                className="mt-2 text-xs text-light-500 hover:text-light-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-2 text-xs text-accent-primary hover:text-accent-primary-hover transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add prerequisite
            </button>
          )}

          {/* Status Message */}
          {incompletePrereqs.length > 0 && (
            <div className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
              <p className="text-xs text-yellow-300">
                Complete {incompletePrereqs.length} prerequisite{incompletePrereqs.length > 1 ? 's' : ''} before mastering {skillName}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Hook to get all dependencies
export function useSkillDependencies() {
  const [dependencies, setDependencies] = useState<SkillDependency[]>(loadDependencies());

  const refresh = () => {
    setDependencies(loadDependencies());
  };

  const getPrerequisites = (skillId: string): string[] => {
    const dep = dependencies.find(d => d.skillId === skillId);
    return dep?.prerequisiteIds || [];
  };

  const getDependents = (skillId: string): string[] => {
    return dependencies
      .filter(d => d.prerequisiteIds.includes(skillId))
      .map(d => d.skillId);
  };

  return {
    dependencies,
    getPrerequisites,
    getDependents,
    refresh
  };
}

// Visual Dependency Tree Component
interface DependencyTreeProps {
  skills: any[];
  dependencies: SkillDependency[];
}

export function DependencyTree({ skills, dependencies }: DependencyTreeProps) {
  // Build a tree structure
  const buildTree = () => {
    const nodes = skills.map(skill => {
      const prereqs = dependencies.find(d => d.skillId === skill.id)?.prerequisiteIds || [];
      return {
        ...skill,
        prerequisites: prereqs,
        level: 0
      };
    });

    // Calculate levels based on dependencies
    let changed = true;
    while (changed) {
      changed = false;
      nodes.forEach(node => {
        if (node.prerequisites.length > 0) {
          const maxPrereqLevel = Math.max(
            ...node.prerequisites.map((prereqId: string) => {
              const prereq = nodes.find(n => n.id === prereqId);
              return prereq ? prereq.level : 0;
            })
          );
          const newLevel = maxPrereqLevel + 1;
          if (newLevel > node.level) {
            node.level = newLevel;
            changed = true;
          }
        }
      });
    }

    return nodes;
  };

  const treeNodes = buildTree();
  const maxLevel = Math.max(...treeNodes.map(n => n.level), 0);

  // Group by level
  const levels = Array.from({ length: maxLevel + 1 }, (_, i) => 
    treeNodes.filter(n => n.level === i)
  );

  if (dependencies.length === 0) {
    return (
      <div className="text-center py-8 text-light-500">
        <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No skill dependencies defined yet</p>
        <p className="text-sm mt-1">Add prerequisites to skills to see the learning path</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-8 min-w-max py-4">
        {levels.map((levelSkills, levelIndex) => (
          <div key={levelIndex} className="flex flex-col gap-3">
            <div className="text-xs text-light-500 text-center mb-2">
              {levelIndex === 0 ? 'Fundamentals' : `Level ${levelIndex}`}
            </div>
            {levelSkills.map(skill => (
              <div
                key={skill.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  skill.status === 'mastered'
                    ? 'bg-green-500/10 border-green-500/30'
                    : skill.status === 'learning'
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-dark-700 border-dark-600'
                }`}
              >
                <span className="text-lg">{skill.icon}</span>
                <span className="text-sm text-light-300">{skill.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SkillDependencies;
