/**
 * UndoContext - Global undo/redo functionality
 * 
 * Features:
 * - 5-second undo toast for destructive actions
 * - Undo history stack
 * - Support for skills, projects, resources
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Undo2 } from 'lucide-react';

interface UndoableAction {
  id: string;
  type: 'delete' | 'update' | 'statusChange';
  collection: 'skills' | 'projects' | 'resources';
  description: string;
  previousData: unknown;
  entityId: string;
  timestamp: number;
  timeout: number;
}

interface UndoContextValue {
  addUndoableAction: (
    action: Omit<UndoableAction, 'id' | 'timestamp' | 'timeout'>
  ) => string;
  undo: (actionId: string) => Promise<void>;
  clearAction: (actionId: string) => void;
  pendingActions: UndoableAction[];
}

const UndoContext = createContext<UndoContextValue | null>(null);

const UNDO_TIMEOUT = 5000; // 5 seconds

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [pendingActions, setPendingActions] = useState<UndoableAction[]>([]);
  const actionsRef = useRef<Map<string, UndoableAction>>(new Map());

  // Show undo toast
  const showUndoToast = useCallback((action: UndoableAction) => {
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">{action.description}</span>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              undo(action.id);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium rounded transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
        </div>
      ),
      {
        id: `undo-${action.id}`,
        duration: UNDO_TIMEOUT,
        position: 'bottom-center',
        style: {
          background: '#1F1F23',
          color: '#fff',
          border: '1px solid #27272A',
          padding: '12px 16px',
        },
      }
    );
  }, []);

  // Add an undoable action
  const addUndoableAction = useCallback((
    actionData: Omit<UndoableAction, 'id' | 'timestamp' | 'timeout'>
  ): string => {
    const id = `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set timeout to clear the action after UNDO_TIMEOUT
    const timeout = setTimeout(() => {
      clearAction(id);
    }, UNDO_TIMEOUT);

    const action: UndoableAction = {
      ...actionData,
      id,
      timestamp: Date.now(),
      timeout,
    };

    actionsRef.current.set(id, action);
    setPendingActions(prev => [...prev, action]);
    showUndoToast(action);

    return id;
  }, [showUndoToast]);

  // Perform undo
  const undo = useCallback(async (actionId: string) => {
    const action = actionsRef.current.get(actionId);
    if (!action) return;

    // Clear the timeout
    clearTimeout(action.timeout);
    
    // Remove from pending actions
    actionsRef.current.delete(actionId);
    setPendingActions(prev => prev.filter(a => a.id !== actionId));

    try {
      const { default: api } = await import('../utils/api');

      // Restore the previous state based on action type
      switch (action.type) {
        case 'delete':
          // Recreate the deleted item
          switch (action.collection) {
            case 'skills':
              await api.createSkill(action.previousData);
              break;
            case 'projects':
              await api.createProject(action.previousData);
              break;
            case 'resources':
              await api.createResource(action.previousData);
              break;
          }
          break;

        case 'update':
        case 'statusChange':
          // Restore the previous data
          switch (action.collection) {
            case 'skills':
              await api.updateSkill(action.entityId, action.previousData);
              break;
            case 'projects':
              await api.updateProject(action.entityId, action.previousData);
              break;
            case 'resources':
              await api.updateResource(action.entityId, action.previousData);
              break;
          }
          break;
      }

      toast.success('Action undone', { id: `undo-success-${actionId}` });
      
      // Dispatch custom event to notify components to refresh
      window.dispatchEvent(new CustomEvent('undo-complete', { 
        detail: { collection: action.collection, entityId: action.entityId }
      }));
    } catch (error) {
      console.error('Failed to undo action:', error);
      toast.error('Failed to undo. Please try again.');
    }
  }, []);

  // Clear an action without undoing
  const clearAction = useCallback((actionId: string) => {
    const action = actionsRef.current.get(actionId);
    if (action) {
      clearTimeout(action.timeout);
      actionsRef.current.delete(actionId);
      setPendingActions(prev => prev.filter(a => a.id !== actionId));
      toast.dismiss(`undo-${actionId}`);
    }
  }, []);

  const value: UndoContextValue = {
    addUndoableAction,
    undo,
    clearAction,
    pendingActions,
  };

  return (
    <UndoContext.Provider value={value}>
      {children}
    </UndoContext.Provider>
  );
}

export function useUndo(): UndoContextValue {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
}

export default UndoContext;
