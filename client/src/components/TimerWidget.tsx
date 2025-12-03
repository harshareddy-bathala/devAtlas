import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, Clock, X } from 'lucide-react';
import { timeEntriesApi } from '../lib/api';
import type { TimeEntry, StartTimerInput, Skill, Project } from '../types';
import toast from 'react-hot-toast';
import { useTimerShortcuts } from '../hooks/useKeyboardShortcuts';

interface TimerWidgetProps {
  skills?: Skill[];
  projects?: Project[];
  onTimerChange?: (entry: TimeEntry | null) => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export default function TimerWidget({ skills = [], projects = [], onTimerChange }: TimerWidgetProps) {
  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showStartForm, setShowStartForm] = useState(false);
  const [formData, setFormData] = useState<StartTimerInput>({
    description: '',
    skillId: null,
    projectId: null,
  });
  const intervalRef = useRef<number | null>(null);

  // Fetch running timer on mount
  useEffect(() => {
    const fetchRunningTimer = async () => {
      try {
        const entry = await timeEntriesApi.getRunning();
        setRunningEntry(entry);
        if (entry?.currentDuration) {
          setCurrentDuration(entry.currentDuration);
        }
      } catch (error) {
        console.error('Failed to fetch running timer:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRunningTimer();
  }, []);

  // Update duration every second when timer is running
  useEffect(() => {
    if (runningEntry?.isRunning) {
      intervalRef.current = window.setInterval(() => {
        setCurrentDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [runningEntry?.isRunning]);

  const handleStart = useCallback(async () => {
    try {
      const entry = await timeEntriesApi.start(formData);
      setRunningEntry(entry);
      setCurrentDuration(0);
      setShowStartForm(false);
      setFormData({ description: '', skillId: null, projectId: null });
      onTimerChange?.(entry);
      toast.success('Timer started');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start timer');
    }
  }, [formData, onTimerChange]);

  const handleStop = useCallback(async () => {
    if (!runningEntry) return;

    try {
      const entry = await timeEntriesApi.stop();
      setRunningEntry(null);
      setCurrentDuration(0);
      onTimerChange?.(null);
      toast.success(`Timer stopped: ${formatDuration(entry.durationSeconds || 0)}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to stop timer');
    }
  }, [runningEntry, onTimerChange]);

  // Register keyboard shortcuts
  useTimerShortcuts(
    () => setShowStartForm(true),
    handleStop,
    !!runningEntry?.isRunning
  );

  if (isLoading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-8 bg-dark-600 rounded w-24"></div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      {runningEntry?.isRunning ? (
        // Timer is running
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-accent-green/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-accent-green animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent-green rounded-full animate-ping"></div>
            </div>
            <div>
              <p className="text-2xl font-mono font-bold text-white">
                {formatDuration(currentDuration)}
              </p>
              <p className="text-sm text-gray-400 truncate max-w-[200px]">
                {runningEntry.description || 'Working...'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {runningEntry.skill && (
                  <span className="text-xs px-2 py-0.5 bg-accent-blue/20 text-accent-blue rounded">
                    {runningEntry.skill.icon} {runningEntry.skill.name}
                  </span>
                )}
                {runningEntry.project && (
                  <span className="text-xs px-2 py-0.5 bg-accent-purple/20 text-accent-purple rounded">
                    {runningEntry.project.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleStop}
            className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full transition-colors"
            title="Stop timer (Alt+S)"
          >
            <Pause className="w-6 h-6" />
          </button>
        </div>
      ) : showStartForm ? (
        // Start form
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Start Timer</h3>
            <button
              onClick={() => setShowStartForm(false)}
              className="p-1 hover:bg-dark-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder="What are you working on?"
            value={formData.description || ''}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="input-field"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={formData.skillId || ''}
              onChange={e => setFormData({ ...formData, skillId: e.target.value || null })}
              className="input-field text-sm"
            >
              <option value="">Select skill...</option>
              {skills.map(skill => (
                <option key={skill.id} value={skill.id}>
                  {skill.icon} {skill.name}
                </option>
              ))}
            </select>
            <select
              value={formData.projectId || ''}
              onChange={e => setFormData({ ...formData, projectId: e.target.value || null })}
              className="input-field text-sm"
            >
              <option value="">Select project...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleStart} className="btn-primary w-full flex items-center justify-center gap-2">
            <Play className="w-4 h-4" />
            Start Timer
          </button>
        </div>
      ) : (
        // No timer running
        <button
          onClick={() => setShowStartForm(true)}
          className="flex items-center gap-4 w-full text-left hover:bg-dark-700/50 p-2 -m-2 rounded-lg transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-dark-600 flex items-center justify-center">
            <Play className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-gray-400">No timer running</p>
            <p className="text-sm text-gray-500">Click to start or press Alt+S</p>
          </div>
        </button>
      )}
    </div>
  );
}
