/**
 * GoalsWidget - Displays and manages learning goals
 * 
 * Features:
 * - Create/edit goals with deadlines
 * - Milestone tracking
 * - Progress visualization
 * - Link skills and projects to goals
 */

import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar, 
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Pause,
  Play,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { useGoals, Goal, GoalInput } from '../contexts/GoalsContext';
import { Modal } from './common';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface GoalsWidgetProps {
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  showCreateButton?: boolean;
}

export function GoalsWidget({ 
  expanded = false, 
  onExpandChange,
  showCreateButton = true 
}: GoalsWidgetProps) {
  const { goals, loading, createGoal, deleteGoal, toggleMilestone } = useGoals();
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const toggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandChange?.(newExpanded);
  };

  // Sort goals: active first, then by target date
  const sortedGoals = [...goals].sort((a, b) => {
    const statusOrder = { active: 0, overdue: 1, paused: 2, completed: 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
  });

  const activeGoals = sortedGoals.filter(g => g.status === 'active' || g.status === 'overdue');
  const completedGoals = sortedGoals.filter(g => g.status === 'completed');

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b border-dark-600 cursor-pointer hover:bg-dark-700/50 transition-colors"
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-purple-500/10">
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Learning Goals</h3>
            <p className="text-xs text-light-500">
              {activeGoals.length} active • {completedGoals.length} completed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showCreateButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingGoal(null);
                setShowModal(true);
              }}
              className="p-2 hover:bg-dark-600 rounded transition-colors"
              title="Add Goal"
            >
              <Plus className="w-4 h-4 text-light-400" />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-light-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-light-500" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : goals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-light-500/50 mx-auto mb-3" />
              <p className="text-light-400 mb-2">No goals yet</p>
              <p className="text-sm text-light-500 mb-4">Set learning goals to track your progress</p>
              <button
                onClick={() => {
                  setEditingGoal(null);
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Your First Goal
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Goals */}
              {activeGoals.map(goal => (
                <GoalCard 
                  key={goal.id} 
                  goal={goal}
                  onEdit={() => {
                    setEditingGoal(goal);
                    setShowModal(true);
                  }}
                  onDelete={() => deleteGoal(goal.id)}
                  onToggleMilestone={(milestoneId) => toggleMilestone(goal.id, milestoneId)}
                />
              ))}

              {/* Completed Goals */}
              {completedGoals.length > 0 && (
                <div className="pt-4 border-t border-dark-600">
                  <h4 className="text-sm font-medium text-light-500 mb-3">Completed</h4>
                  {completedGoals.slice(0, 3).map(goal => (
                    <GoalCard 
                      key={goal.id} 
                      goal={goal}
                      onEdit={() => {
                        setEditingGoal(goal);
                        setShowModal(true);
                      }}
                      onDelete={() => deleteGoal(goal.id)}
                      onToggleMilestone={(milestoneId) => toggleMilestone(goal.id, milestoneId)}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Goal Modal */}
      {showModal && (
        <GoalModal
          goal={editingGoal}
          onClose={() => {
            setShowModal(false);
            setEditingGoal(null);
          }}
          onSave={async (data) => {
            await createGoal(data);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

interface GoalCardProps {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onToggleMilestone: (milestoneId: string) => void;
  compact?: boolean;
}

function GoalCard({ goal, onEdit, onDelete, onToggleMilestone, compact = false }: GoalCardProps) {
  const [showMilestones, setShowMilestones] = useState(!compact);
  
  const daysRemaining = Math.ceil(
    (new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const statusConfig = {
    active: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Play },
    overdue: { color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertCircle },
    paused: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Pause },
    completed: { color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle2 }
  };

  const config = statusConfig[goal.status];
  const StatusIcon = config.icon;

  return (
    <div className={`bg-dark-700/50 border border-dark-600 rounded-lg p-4 ${compact ? 'opacity-75' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon className={`w-4 h-4 ${config.color}`} />
            <h4 className="font-medium text-white truncate">{goal.title}</h4>
          </div>
          {goal.description && !compact && (
            <p className="text-sm text-light-500 line-clamp-2">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-dark-600 rounded transition-colors"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5 text-light-500" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-500/10 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-light-500">Progress</span>
          <span className={config.color}>{goal.progress}%</span>
        </div>
        <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              goal.status === 'completed' ? 'bg-green-500' :
              goal.status === 'overdue' ? 'bg-red-500' :
              'bg-accent-primary'
            }`}
            style={{ width: `${goal.progress}%` }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-light-500 mb-3">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(goal.targetDate).toLocaleDateString()}
        </span>
        {goal.status !== 'completed' && (
          <span className={`flex items-center gap-1 ${daysRemaining < 0 ? 'text-red-400' : daysRemaining < 7 ? 'text-yellow-400' : ''}`}>
            <Clock className="w-3.5 h-3.5" />
            {daysRemaining < 0 
              ? `${Math.abs(daysRemaining)} days overdue` 
              : `${daysRemaining} days left`}
          </span>
        )}
      </div>

      {/* Milestones */}
      {goal.milestones.length > 0 && (
        <div>
          <button
            onClick={() => setShowMilestones(!showMilestones)}
            className="flex items-center gap-2 text-xs text-light-500 hover:text-light-300 transition-colors mb-2"
          >
            {showMilestones ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {goal.milestones.filter(m => m.completed).length}/{goal.milestones.length} milestones
          </button>
          
          {showMilestones && (
            <div className="space-y-1.5 pl-1">
              {goal.milestones.map(milestone => (
                <button
                  key={milestone.id}
                  onClick={() => onToggleMilestone(milestone.id)}
                  className="flex items-center gap-2 w-full text-left group"
                >
                  {milestone.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-light-500 group-hover:text-accent-primary flex-shrink-0" />
                  )}
                  <span className={`text-sm ${milestone.completed ? 'text-light-500 line-through' : 'text-light-300'}`}>
                    {milestone.title}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface GoalModalProps {
  goal: Goal | null;
  onClose: () => void;
  onSave: (data: GoalInput) => Promise<void>;
}

function GoalModal({ goal, onClose, onSave }: GoalModalProps) {
  const [title, setTitle] = useState(goal?.title || '');
  const [description, setDescription] = useState(goal?.description || '');
  const [targetDate, setTargetDate] = useState(
    goal?.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : ''
  );
  const [milestones, setMilestones] = useState<string[]>(
    goal?.milestones.map(m => m.title) || ['']
  );
  const [skills, setSkills] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(goal?.skillIds || []);
  const [selectedProjects, setSelectedProjects] = useState<string[]>(goal?.projectIds || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [skillsData, projectsData] = await Promise.all([
          api.getSkills(),
          api.getProjects()
        ]);
        setSkills(Array.isArray(skillsData) ? skillsData : skillsData.items || []);
        setProjects(Array.isArray(projectsData) ? projectsData : projectsData.items || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Please enter a goal title');
      return;
    }
    if (!targetDate) {
      toast.error('Please select a target date');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        targetDate,
        skillIds: selectedSkills,
        projectIds: selectedProjects,
        milestones: milestones.filter(m => m.trim()).map(m => ({ title: m.trim() }))
      });
    } catch (error) {
      toast.error('Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const addMilestone = () => {
    setMilestones([...milestones, '']);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, value: string) => {
    const updated = [...milestones];
    updated[index] = value;
    setMilestones(updated);
  };

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title={goal ? 'Edit Goal' : 'Create Learning Goal'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-light-400 mb-1">Goal Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Master React by end of month"
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded focus:border-accent-primary focus:ring-1 focus:ring-accent-primary text-white placeholder:text-light-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-light-400 mb-1">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What do you want to achieve?"
            rows={2}
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded focus:border-accent-primary focus:ring-1 focus:ring-accent-primary text-white placeholder:text-light-500 resize-none"
          />
        </div>

        {/* Target Date */}
        <div>
          <label className="block text-sm font-medium text-light-400 mb-1">Target Date</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded focus:border-accent-primary focus:ring-1 focus:ring-accent-primary text-white"
          />
        </div>

        {/* Milestones */}
        <div>
          <label className="block text-sm font-medium text-light-400 mb-2">Milestones</label>
          <div className="space-y-2">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={milestone}
                  onChange={(e) => updateMilestone(index, e.target.value)}
                  placeholder={`Milestone ${index + 1}`}
                  className="flex-1 px-3 py-2 bg-dark-700 border border-dark-600 rounded focus:border-accent-primary focus:ring-1 focus:ring-accent-primary text-white placeholder:text-light-500"
                />
                <button
                  type="button"
                  onClick={() => removeMilestone(index)}
                  className="p-2 hover:bg-dark-600 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-light-500" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addMilestone}
              className="flex items-center gap-2 text-sm text-accent-primary hover:text-accent-primary-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Milestone
            </button>
          </div>
        </div>

        {/* Link Skills */}
        <div>
          <label className="block text-sm font-medium text-light-400 mb-2">Link Skills (Optional)</label>
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, 10).map(skill => (
              <button
                key={skill.id}
                type="button"
                onClick={() => {
                  setSelectedSkills(prev => 
                    prev.includes(skill.id) 
                      ? prev.filter(id => id !== skill.id)
                      : [...prev, skill.id]
                  );
                }}
                className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                  selectedSkills.includes(skill.id)
                    ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                    : 'bg-dark-700 border-dark-600 text-light-400 hover:border-dark-500'
                }`}
              >
                {skill.icon} {skill.name}
              </button>
            ))}
          </div>
        </div>

        {/* Link Projects */}
        <div>
          <label className="block text-sm font-medium text-light-400 mb-2">Link Projects (Optional)</label>
          <div className="flex flex-wrap gap-2">
            {projects.slice(0, 10).map(project => (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  setSelectedProjects(prev => 
                    prev.includes(project.id) 
                      ? prev.filter(id => id !== project.id)
                      : [...prev, project.id]
                  );
                }}
                className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                  selectedProjects.includes(project.id)
                    ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                    : 'bg-dark-700 border-dark-600 text-light-400 hover:border-dark-500'
                }`}
              >
                {project.name}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-dark-600">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-light-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover disabled:opacity-50 text-white font-medium rounded transition-colors"
          >
            {saving ? 'Saving...' : goal ? 'Update Goal' : 'Create Goal'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default GoalsWidget;
