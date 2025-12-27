/**
 * ConnectionContext - Manages network connection state and sync queue
 * 
 * Features:
 * - Real-time online/offline detection
 * - Automatic retry queue for failed operations
 * - Backend health checks
 * - Sync status tracking
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: 'skills' | 'projects' | 'resources' | 'activities';
  data?: unknown;
  entityId?: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface ConnectionState {
  isOnline: boolean;
  isBackendReachable: boolean;
  lastChecked: Date | null;
  pendingOperations: PendingOperation[];
  isSyncing: boolean;
  lastSyncTime: Date | null;
  connectionQuality: 'good' | 'slow' | 'poor' | 'offline';
}

interface ConnectionContextValue extends ConnectionState {
  checkConnection: () => Promise<boolean>;
  addPendingOperation: (op: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>) => string;
  removePendingOperation: (id: string) => void;
  retryPendingOperations: () => Promise<void>;
  clearPendingOperations: () => void;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

const STORAGE_KEY = 'devOrbit_pending_operations';
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const RETRY_DELAY_BASE = 1000; // 1 second base delay

// Load pending operations from localStorage
function loadPendingOperations(): PendingOperation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Save pending operations to localStorage
function savePendingOperations(operations: PendingOperation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
  } catch (e) {
    console.warn('Failed to save pending operations:', e);
  }
}

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConnectionState>({
    isOnline: navigator.onLine,
    isBackendReachable: true,
    lastChecked: null,
    pendingOperations: loadPendingOperations(),
    isSyncing: false,
    lastSyncTime: null,
    connectionQuality: navigator.onLine ? 'good' : 'offline',
  });

  const healthCheckIntervalRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);

  // Check backend health
  const checkConnection = useCallback(async (): Promise<boolean> => {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/health`,
        { 
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store'
        }
      );
      
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      
      let connectionQuality: 'good' | 'slow' | 'poor' | 'offline' = 'good';
      if (latency > 3000) connectionQuality = 'poor';
      else if (latency > 1000) connectionQuality = 'slow';
      
      setState(prev => ({
        ...prev,
        isOnline: true,
        isBackendReachable: response.ok,
        lastChecked: new Date(),
        connectionQuality,
      }));
      
      return response.ok;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isBackendReachable: false,
        lastChecked: new Date(),
        connectionQuality: prev.isOnline ? 'poor' : 'offline',
      }));
      return false;
    }
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      toast.success('Back online!', { id: 'connection-status' });
      checkConnection();
      
      // Attempt to sync pending operations
      if (state.pendingOperations.length > 0) {
        retryPendingOperations();
      }
    };

    const handleOffline = () => {
      setState(prev => ({ 
        ...prev, 
        isOnline: false, 
        isBackendReachable: false,
        connectionQuality: 'offline'
      }));
      toast.error('You\'re offline. Changes will be saved locally.', { 
        id: 'connection-status',
        duration: 5000 
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection, state.pendingOperations.length]);

  // Periodic health checks
  useEffect(() => {
    // Initial check
    checkConnection();

    // Set up interval
    healthCheckIntervalRef.current = setInterval(checkConnection, HEALTH_CHECK_INTERVAL);

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [checkConnection]);

  // Add a pending operation
  const addPendingOperation = useCallback((
    op: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>
  ): string => {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const operation: PendingOperation = {
      ...op,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 5,
    };

    setState(prev => {
      const newOperations = [...prev.pendingOperations, operation];
      savePendingOperations(newOperations);
      return { ...prev, pendingOperations: newOperations };
    });

    return id;
  }, []);

  // Remove a pending operation
  const removePendingOperation = useCallback((id: string) => {
    setState(prev => {
      const newOperations = prev.pendingOperations.filter(op => op.id !== id);
      savePendingOperations(newOperations);
      return { ...prev, pendingOperations: newOperations };
    });
  }, []);

  // Retry all pending operations
  const retryPendingOperations = useCallback(async () => {
    if (state.isSyncing || state.pendingOperations.length === 0) return;

    setState(prev => ({ ...prev, isSyncing: true }));

    const { default: api } = await import('../utils/api');
    const successfulOps: string[] = [];
    const failedOps: PendingOperation[] = [];

    for (const op of state.pendingOperations) {
      try {
        // Execute the operation based on type and collection
        switch (op.collection) {
          case 'skills':
            if (op.type === 'create') await api.createSkill(op.data);
            else if (op.type === 'update') await api.updateSkill(op.entityId!, op.data);
            else if (op.type === 'delete') await api.deleteSkill(op.entityId!);
            break;
          case 'projects':
            if (op.type === 'create') await api.createProject(op.data);
            else if (op.type === 'update') await api.updateProject(op.entityId!, op.data);
            else if (op.type === 'delete') await api.deleteProject(op.entityId!);
            break;
          case 'resources':
            if (op.type === 'create') await api.createResource(op.data);
            else if (op.type === 'update') await api.updateResource(op.entityId!, op.data);
            else if (op.type === 'delete') await api.deleteResource(op.entityId!);
            break;
        }
        successfulOps.push(op.id);
      } catch (error) {
        // Increment retry count
        const updatedOp = { ...op, retryCount: op.retryCount + 1 };
        if (updatedOp.retryCount < updatedOp.maxRetries) {
          failedOps.push(updatedOp);
        } else {
          console.error(`Operation ${op.id} failed after ${op.maxRetries} retries`);
        }
      }
    }

    // Update state
    setState(prev => {
      const newOperations = prev.pendingOperations
        .filter(op => !successfulOps.includes(op.id))
        .map(op => failedOps.find(f => f.id === op.id) || op);
      
      savePendingOperations(newOperations);
      
      return {
        ...prev,
        pendingOperations: newOperations,
        isSyncing: false,
        lastSyncTime: successfulOps.length > 0 ? new Date() : prev.lastSyncTime,
      };
    });

    if (successfulOps.length > 0) {
      toast.success(`Synced ${successfulOps.length} pending change${successfulOps.length > 1 ? 's' : ''}`);
    }

    // Schedule retry for failed operations
    if (failedOps.length > 0 && failedOps[0]) {
      const nextRetryDelay = RETRY_DELAY_BASE * Math.pow(2, Math.min(failedOps[0].retryCount, 5));
      retryTimeoutRef.current = setTimeout(retryPendingOperations, nextRetryDelay);
    }
  }, [state.isSyncing, state.pendingOperations]);

  // Clear all pending operations
  const clearPendingOperations = useCallback(() => {
    setState(prev => {
      savePendingOperations([]);
      return { ...prev, pendingOperations: [] };
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const value: ConnectionContextValue = {
    ...state,
    checkConnection,
    addPendingOperation,
    removePendingOperation,
    retryPendingOperations,
    clearPendingOperations,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection(): ConnectionContextValue {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}

export default ConnectionContext;
