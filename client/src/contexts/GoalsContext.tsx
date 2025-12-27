/**
 * GoalsContext - Goal setting and tracking
 * 
 * Features:
 * - Create learning goals with deadlines
 * - Track progress towards goals
 * - Milestone tracking
 * - Goal completion notifications
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export interface GoalMilestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  skillIds: string[];
  projectIds: string[];
  milestones: GoalMilestone[];
  progress: number; // 0-100
  status: 'active' | 'completed' | 'overdue' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export interface GoalInput {
  title: string;
  description?: string;
  targetDate: string;
  skillIds?: string[];
  projectIds?: string[];
  milestones?: { title: string }[];
}

interface GoalsContextValue {
  goals: Goal[];
  loading: boolean;
  createGoal: (data: GoalInput) => Promise<Goal>;
  updateGoal: (id: string, data: Partial<GoalInput>) => Promise<Goal>;
  deleteGoal: (id: string) => Promise<void>;
  toggleMilestone: (goalId: string, milestoneId: string) => Promise<void>;
  refreshGoals: () => Promise<void>;
}

const GoalsContext = createContext<GoalsContextValue | null>(null);

const GOALS_STORAGE_KEY = 'devOrbit_goals';

// Local storage helpers
function loadGoalsFromStorage(): Goal[] {
  try {
    const stored = localStorage.getItem(GOALS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveGoalsToStorage(goals: Goal[]): void {
  try {
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
  } catch {}
}

// Calculate goal progress based on milestones and linked items
function calculateProgress(goal: Goal, skills: any[], projects: any[]): number {
  let totalWeight = 0;
  let completedWeight = 0;

  // Milestones contribute 40% of progress
  if (goal.milestones.length > 0) {
    const milestoneWeight = 40;
    totalWeight += milestoneWeight;
    const completedMilestones = goal.milestones.filter(m => m.completed).length;
    completedWeight += (completedMilestones / goal.milestones.length) * milestoneWeight;
  }

  // Skills contribute 30% of progress
  if (goal.skillIds.length > 0) {
    const skillWeight = 30;
    totalWeight += skillWeight;
    const linkedSkills = skills.filter(s => goal.skillIds.includes(s.id));
    const masteredSkills = linkedSkills.filter(s => s.status === 'mastered');
    if (linkedSkills.length > 0) {
      completedWeight += (masteredSkills.length / linkedSkills.length) * skillWeight;
    }
  }

  // Projects contribute 30% of progress
  if (goal.projectIds.length > 0) {
    const projectWeight = 30;
    totalWeight += projectWeight;
    const linkedProjects = projects.filter(p => goal.projectIds.includes(p.id));
    const completedProjects = linkedProjects.filter(p => p.status === 'completed');
    if (linkedProjects.length > 0) {
      completedWeight += (completedProjects.length / linkedProjects.length) * projectWeight;
    }
  }

  // If no items, just use milestones
  if (totalWeight === 0) {
    return 0;
  }

  return Math.round((completedWeight / totalWeight) * 100);
}

// Determine goal status
function determineStatus(goal: Goal): Goal['status'] {
  if (goal.progress === 100) return 'completed';
  if (new Date(goal.targetDate) < new Date() && goal.progress < 100) return 'overdue';
  return goal.status === 'paused' ? 'paused' : 'active';
}

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>(loadGoalsFromStorage());
  const [loading, setLoading] = useState(false);

  // Refresh goals and recalculate progress
  const refreshGoals = useCallback(async () => {
    setLoading(true);
    try {
      const [skills, projects] = await Promise.all([
        api.getSkills(),
        api.getProjects()
      ]);

      const skillsList = Array.isArray(skills) ? skills : skills.items || [];
      const projectsList = Array.isArray(projects) ? projects : projects.items || [];

      setGoals(prev => {
        const updated = prev.map(goal => {
          const progress = calculateProgress(goal, skillsList, projectsList);
          const status = determineStatus({ ...goal, progress });
          return { ...goal, progress, status };
        });
        saveGoalsToStorage(updated);
        return updated;
      });
    } catch (error) {
      console.error('Failed to refresh goals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load goals on mount
  useEffect(() => {
    refreshGoals();
  }, [refreshGoals]);

  // Create a new goal
  const createGoal = useCallback(async (data: GoalInput): Promise<Goal> => {
    const goal: Goal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: data.title,
      description: data.description || '',
      targetDate: data.targetDate,
      skillIds: data.skillIds || [],
      projectIds: data.projectIds || [],
      milestones: (data.milestones || []).map((m, idx) => ({
        id: `milestone_${Date.now()}_${idx}`,
        title: m.title,
        completed: false,
        completedAt: null
      })),
      progress: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setGoals(prev => {
      const updated = [...prev, goal];
      saveGoalsToStorage(updated);
      return updated;
    });

    toast.success('Goal created!');
    return goal;
  }, []);

  // Update a goal
  const updateGoal = useCallback(async (id: string, data: Partial<GoalInput>): Promise<Goal> => {
    return new Promise((resolve, reject) => {
      setGoals(prev => {
        const goalIndex = prev.findIndex(g => g.id === id);
        if (goalIndex === -1) {
          reject(new Error('Goal not found'));
          return prev;
        }

        const oldGoal = prev[goalIndex];
        if (!oldGoal) {
          reject(new Error('Goal not found'));
          return prev;
        }

        const milestones = data.milestones 
          ? data.milestones.map((m, idx) => ({
              id: `milestone_${Date.now()}_${idx}`,
              title: m.title || '',
              completed: false,
              completedAt: null
            }))
          : oldGoal.milestones;

        const updatedGoal: Goal = {
          id: oldGoal.id,
          title: data.title ?? oldGoal.title,
          description: data.description ?? oldGoal.description,
          targetDate: data.targetDate ?? oldGoal.targetDate,
          status: oldGoal.status,
          skillIds: data.skillIds ?? oldGoal.skillIds,
          projectIds: data.projectIds ?? oldGoal.projectIds,
          createdAt: oldGoal.createdAt,
          updatedAt: new Date().toISOString(),
          milestones,
          progress: oldGoal.progress
        };

        updatedGoal.status = determineStatus(updatedGoal);

        const updated = [...prev];
        updated[goalIndex] = updatedGoal;
        saveGoalsToStorage(updated);
        resolve(updatedGoal);
        return updated;
      });
    });
  }, []);

  // Delete a goal
  const deleteGoal = useCallback(async (id: string): Promise<void> => {
    setGoals(prev => {
      const updated = prev.filter(g => g.id !== id);
      saveGoalsToStorage(updated);
      return updated;
    });
    toast.success('Goal deleted');
  }, []);

  // Toggle milestone completion
  const toggleMilestone = useCallback(async (goalId: string, milestoneId: string): Promise<void> => {
    setGoals(prev => {
      const goalIndex = prev.findIndex(g => g.id === goalId);
      if (goalIndex === -1) return prev;

      const goal = prev[goalIndex];
      if (!goal) return prev;

      const milestoneIndex = goal.milestones.findIndex(m => m.id === milestoneId);
      if (milestoneIndex === -1) return prev;

      const milestone = goal.milestones[milestoneIndex];
      if (!milestone) return prev;

      const updatedMilestone: GoalMilestone = {
        id: milestone.id,
        title: milestone.title,
        completed: !milestone.completed,
        completedAt: !milestone.completed ? new Date().toISOString() : null
      };

      const updatedMilestones = [...goal.milestones];
      updatedMilestones[milestoneIndex] = updatedMilestone;

      const completedMilestones = updatedMilestones.filter(m => m.completed).length;
      const progress = Math.round((completedMilestones / updatedMilestones.length) * 100);

      const updatedGoal: Goal = {
        ...goal,
        milestones: updatedMilestones,
        updatedAt: new Date().toISOString(),
        progress,
        status: 'active' as const
      };

      // Recalculate status
      updatedGoal.status = determineStatus(updatedGoal);

      const updated = [...prev];
      updated[goalIndex] = updatedGoal;
      saveGoalsToStorage(updated);

      // Show celebration for milestone completion
      if (updatedMilestone.completed) {
        toast.success(`Milestone completed: ${updatedMilestone.title}`, { 
          icon: '🎯',
          duration: 3000
        });
      }

      // Show celebration for goal completion
      if (updatedGoal.progress === 100) {
        toast.success(`Goal achieved: ${updatedGoal.title}! 🎉`, {
          duration: 5000
        });
      }

      return updated;
    });
  }, []);

  const value: GoalsContextValue = {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    toggleMilestone,
    refreshGoals
  };

  return (
    <GoalsContext.Provider value={value}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals(): GoalsContextValue {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within a GoalsProvider');
  }
  return context;
}

export default GoalsContext;
