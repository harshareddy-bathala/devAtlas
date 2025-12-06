/**
 * Time Entries API
 * Stub implementation for timer functionality
 * TODO: Implement backend endpoints for full timer support
 */

import type { TimeEntry, StartTimerInput } from '../types';

// Re-export main API for convenience
export { default as api, ApiError, clearTokenCache } from '../utils/api';

/**
 * Time Entries API - Currently uses local storage as a stub
 * until backend endpoints are implemented
 */
const STORAGE_KEY = 'devOrbit_runningTimer';

function getStoredTimer(): TimeEntry | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const entry = JSON.parse(stored) as TimeEntry;
    // Calculate current duration
    if (entry.startTime && entry.isRunning) {
      const startTime = new Date(entry.startTime).getTime();
      const now = Date.now();
      entry.currentDuration = Math.floor((now - startTime) / 1000);
    }
    return entry;
  } catch {
    return null;
  }
}

function storeTimer(entry: TimeEntry | null): void {
  if (entry) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const timeEntriesApi = {
  /**
   * Get the currently running timer entry
   */
  async getRunning(): Promise<TimeEntry | null> {
    return getStoredTimer();
  },

  /**
   * Start a new timer
   */
  async start(input: StartTimerInput): Promise<TimeEntry> {
    const entry: TimeEntry = {
      id: `timer_${Date.now()}`,
      description: input.description || null,
      skillId: input.skillId || null,
      projectId: input.projectId || null,
      startTime: new Date().toISOString(),
      endTime: null,
      durationSeconds: null,
      isRunning: true,
      notes: null,
      tags: [],
      currentDuration: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storeTimer(entry);
    return entry;
  },

  /**
   * Stop the currently running timer
   */
  async stop(id?: string): Promise<TimeEntry> {
    const entry = getStoredTimer();
    if (!entry || (id && entry.id !== id)) {
      throw new Error('Timer not found');
    }
    
    const endTime = new Date();
    const startTime = new Date(entry.startTime);
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    
    const stoppedEntry: TimeEntry = {
      ...entry,
      endTime: endTime.toISOString(),
      durationSeconds,
      isRunning: false,
      currentDuration: durationSeconds,
      updatedAt: endTime.toISOString(),
    };
    
    // Clear the running timer
    storeTimer(null);
    
    // In a real implementation, this would save to the backend
    console.log('Timer stopped:', stoppedEntry);
    
    return stoppedEntry;
  },

  /**
   * Discard the currently running timer without saving
   */
  async discard(id: string): Promise<void> {
    const entry = getStoredTimer();
    if (entry && entry.id === id) {
      storeTimer(null);
    }
  },

  /**
   * Get time entries for a date range
   */
  async getEntries(_params?: {
    startDate?: string;
    endDate?: string;
    skillId?: string;
    projectId?: string;
  }): Promise<TimeEntry[]> {
    // Stub: Return empty array until backend is implemented
    return [];
  },

  /**
   * Delete a time entry
   */
  async delete(_id: string): Promise<void> {
    // Stub: No-op until backend is implemented
  },

  /**
   * Update a time entry
   */
  async update(_id: string, _data: Partial<TimeEntry>): Promise<TimeEntry> {
    // Stub: Return empty entry until backend is implemented
    throw new Error('Not implemented');
  },
};

export default timeEntriesApi;
