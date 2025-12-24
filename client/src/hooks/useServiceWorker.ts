/**
 * useServiceWorker - Hook for service worker management
 * 
 * Features:
 * - Registers and updates service worker
 * - Tracks online/offline status
 * - Monitors pending offline mutations
 * - Handles sync completion notifications
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface ServiceWorkerState {
  isOnline: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  pendingMutations: number;
  lastSyncTime: Date | null;
}

interface UseServiceWorkerReturn extends ServiceWorkerState {
  update: () => void;
  clearCache: () => Promise<void>;
  forcSync: () => Promise<void>;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [state, setState] = useState<ServiceWorkerState>({
    isOnline: navigator.onLine,
    isRegistered: false,
    isUpdateAvailable: false,
    pendingMutations: 0,
    lastSyncTime: null,
  });
  
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  
  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
    };
    
    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Register service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.log('[SW] Service workers not supported');
      return;
    }
    
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        
        registrationRef.current = registration;
        setState((prev) => ({ ...prev, isRegistered: true }));
        
        console.log('[SW] Service worker registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                waitingWorkerRef.current = newWorker;
                setState((prev) => ({ ...prev, isUpdateAvailable: true }));
                console.log('[SW] New version available');
              }
            });
          }
        });
        
        // Check for waiting worker on load
        if (registration.waiting) {
          waitingWorkerRef.current = registration.waiting;
          setState((prev) => ({ ...prev, isUpdateAvailable: true }));
        }
        
      } catch (error) {
        console.error('[SW] Registration failed:', error);
      }
    };
    
    registerSW();
    
    // Listen for messages from service worker
    const handleMessage = (event: MessageEvent) => {
      const { type, count } = event.data || {};
      
      if (type === 'SYNC_COMPLETE') {
        setState((prev) => ({
          ...prev,
          pendingMutations: 0,
          lastSyncTime: new Date(),
        }));
        console.log(`[SW] Synced ${count} mutations`);
      }
    };
    
    navigator.serviceWorker.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);
  
  // Poll for pending mutations count
  useEffect(() => {
    if (!registrationRef.current?.active) return;
    
    const checkQueueSize = async () => {
      try {
        const messageChannel = new MessageChannel();
        
        const countPromise = new Promise<number>((resolve) => {
          messageChannel.port1.onmessage = (event) => {
            resolve(event.data?.count || 0);
          };
        });
        
        registrationRef.current?.active?.postMessage(
          { type: 'GET_QUEUE_SIZE' },
          [messageChannel.port2]
        );
        
        const count = await countPromise;
        setState((prev) => ({ ...prev, pendingMutations: count }));
      } catch (error) {
        console.warn('[SW] Failed to get queue size:', error);
      }
    };
    
    // Check immediately and then every 30 seconds
    checkQueueSize();
    const interval = setInterval(checkQueueSize, 30000);
    
    return () => clearInterval(interval);
  }, [state.isRegistered]);
  
  // Update service worker
  const update = useCallback(() => {
    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, []);
  
  // Clear cache
  const clearCache = useCallback(async () => {
    if (!registrationRef.current?.active) return;
    
    const messageChannel = new MessageChannel();
    
    return new Promise<void>((resolve, reject) => {
      messageChannel.port1.onmessage = (event) => {
        if (event.data?.success) {
          resolve();
        } else {
          reject(new Error(event.data?.error || 'Failed to clear cache'));
        }
      };
      
      registrationRef.current?.active?.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    });
  }, []);
  
  // Force sync
  const forcSync = useCallback(async () => {
    if (registrationRef.current && 'sync' in registrationRef.current) {
      await (registrationRef.current as ServiceWorkerRegistration & {
        sync: { register: (tag: string) => Promise<void> };
      }).sync.register('sync-mutations');
    }
  }, []);
  
  return {
    ...state,
    update,
    clearCache,
    forcSync,
  };
}

export default useServiceWorker;
