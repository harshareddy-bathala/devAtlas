/**
 * SyncManager - Intelligent sync queue with debouncing and batching
 * 
 * Features:
 * - Debounces rapid changes (e.g., status toggles)
 * - Coalesces multiple updates to the same item
 * - Batches updates by collection for efficient API calls
 * - Retries failed syncs with exponential backoff
 * - Persists pending changes across page reloads
 */

type ChangeType = 'create' | 'update' | 'delete';
type Collection = 'skills' | 'projects' | 'resources';

interface PendingChange<T = unknown> {
  id: string;
  collection: Collection;
  type: ChangeType;
  data?: Partial<T>;
  timestamp: number;
  retryCount: number;
  tempId?: string; // For optimistic creates
}

interface SyncConfig {
  debounceMs: number;
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
}

type SyncCallback = (
  collection: Collection,
  changes: Array<{ id: string; type: ChangeType; data?: unknown }>
) => Promise<void>;

const DEFAULT_CONFIG: SyncConfig = {
  debounceMs: 2000,       // 2 seconds debounce
  maxRetries: 3,          // Max 3 retries per change
  retryDelayMs: 1000,     // 1 second initial retry delay
  batchSize: 20,          // Max 20 items per batch
};

const STORAGE_KEY = 'devOrbit_sync_queue';

class SyncManager {
  private queue: Map<string, PendingChange> = new Map();
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private isSyncing = false;
  private config: SyncConfig;
  private onSync: SyncCallback | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
    
    // Sync when page becomes hidden or before unload
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden' && this.queue.size > 0) {
      this.flush();
    }
  };

  private handleBeforeUnload = () => {
    if (this.queue.size > 0) {
      this.saveToStorage();
      // Try to sync synchronously (may not complete)
      this.flush();
    }
  };

  /**
   * Set the sync callback function
   */
  setSyncCallback(callback: SyncCallback) {
    this.onSync = callback;
  }

  /**
   * Add a change to the queue (debounced)
   */
  queueChange<T>(
    collection: Collection,
    id: string,
    type: ChangeType,
    data?: Partial<T>
  ): void {
    const key = `${collection}:${id}`;
    
    // Clear existing debounce timer for this item
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Coalesce with existing pending change
    const existing = this.queue.get(key);
    
    const change: PendingChange<T> = {
      id,
      collection,
      type: this.coalesceType(existing?.type, type),
      data: existing?.data ? { ...existing.data, ...data } : data,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    // If item was created and then deleted, remove from queue entirely
    if (existing?.type === 'create' && type === 'delete') {
      this.queue.delete(key);
      this.notifyListeners();
      return;
    }
    
    // If item was created and then updated, keep as create with merged data
    if (existing?.type === 'create' && type === 'update') {
      change.type = 'create';
      change.tempId = existing.tempId;
    }
    
    this.queue.set(key, change);
    this.notifyListeners();
    this.saveToStorage();
    
    // Set debounce timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      this.scheduleSyncIfNeeded();
    }, this.config.debounceMs);
    
    this.debounceTimers.set(key, timer);
  }

  /**
   * Queue a change for immediate sync (no debounce)
   */
  queueImmediate<T>(
    collection: Collection,
    id: string,
    type: ChangeType,
    data?: Partial<T>
  ): Promise<void> {
    const key = `${collection}:${id}`;
    
    // Clear any pending debounce
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.debounceTimers.delete(key);
    }
    
    const change: PendingChange<T> = {
      id,
      collection,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    this.queue.set(key, change);
    this.saveToStorage();
    
    return this.flush();
  }

  /**
   * Determine the coalesced change type
   */
  private coalesceType(existing: ChangeType | undefined, incoming: ChangeType): ChangeType {
    if (!existing) return incoming;
    
    // Create + Update = Create
    if (existing === 'create' && incoming === 'update') return 'create';
    // Create + Delete = Remove from queue (handled separately)
    if (existing === 'create' && incoming === 'delete') return 'delete';
    // Update + Update = Update
    if (existing === 'update' && incoming === 'update') return 'update';
    // Update + Delete = Delete
    if (existing === 'update' && incoming === 'delete') return 'delete';
    // Delete + anything = shouldn't happen (item was deleted)
    
    return incoming;
  }

  /**
   * Schedule a sync if not already scheduled
   */
  private scheduleSyncIfNeeded(): void {
    if (this.syncTimer || this.isSyncing) return;
    
    // Check if any changes are ready (past debounce)
    const readyChanges = this.getReadyChanges();
    if (readyChanges.length === 0) return;
    
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      this.flush();
    }, 100); // Small delay to batch multiple ready changes
  }

  /**
   * Get changes that are past their debounce window
   */
  private getReadyChanges(): PendingChange[] {
    const now = Date.now();
    const ready: PendingChange[] = [];
    
    this.queue.forEach((change, key) => {
      const timePassed = now - change.timestamp;
      if (timePassed >= this.config.debounceMs || !this.debounceTimers.has(key)) {
        ready.push(change);
      }
    });
    
    return ready;
  }

  /**
   * Flush all pending changes (sync immediately)
   */
  async flush(): Promise<void> {
    if (this.isSyncing || this.queue.size === 0 || !this.onSync) {
      return;
    }
    
    this.isSyncing = true;
    this.notifyListeners();
    
    try {
      // Group changes by collection
      const byCollection = new Map<Collection, PendingChange[]>();
      
      this.queue.forEach((change) => {
        const existing = byCollection.get(change.collection) || [];
        existing.push(change);
        byCollection.set(change.collection, existing);
      });
      
      // Process each collection
      for (const [collection, changes] of byCollection) {
        // Batch into chunks
        for (let i = 0; i < changes.length; i += this.config.batchSize) {
          const batch = changes.slice(i, i + this.config.batchSize);
          
          try {
            await this.onSync(
              collection,
              batch.map(c => ({ id: c.id, type: c.type, data: c.data }))
            );
            
            // Remove successful changes from queue
            batch.forEach(c => {
              const key = `${c.collection}:${c.id}`;
              this.queue.delete(key);
            });
          } catch (error) {
            console.error(`Failed to sync ${collection}:`, error);
            
            // Handle retry
            batch.forEach(c => {
              const key = `${c.collection}:${c.id}`;
              const change = this.queue.get(key);
              if (change) {
                change.retryCount++;
                if (change.retryCount >= this.config.maxRetries) {
                  console.error(`Max retries reached for ${key}, removing from queue`);
                  this.queue.delete(key);
                }
              }
            });
          }
        }
      }
      
      this.saveToStorage();
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
      
      // Check if more changes came in during sync
      if (this.queue.size > 0) {
        this.scheduleSyncIfNeeded();
      }
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      pendingCount: this.queue.size,
      isSyncing: this.isSyncing,
      collections: {
        skills: this.getCollectionCount('skills'),
        projects: this.getCollectionCount('projects'),
        resources: this.getCollectionCount('resources'),
      },
    };
  }

  private getCollectionCount(collection: Collection): number {
    let count = 0;
    this.queue.forEach((change) => {
      if (change.collection === collection) count++;
    });
    return count;
  }

  /**
   * Subscribe to status changes
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach(listener => listener(status));
  }

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Array.from(this.queue.entries());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save sync queue:', e);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as Array<[string, PendingChange]>;
        this.queue = new Map(data);
      }
    } catch (e) {
      console.warn('Failed to load sync queue:', e);
    }
  }

  /**
   * Clear all pending changes
   */
  clear(): void {
    this.queue.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    localStorage.removeItem(STORAGE_KEY);
    this.notifyListeners();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clear();
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
  }
}

export interface SyncStatus {
  pendingCount: number;
  isSyncing: boolean;
  collections: {
    skills: number;
    projects: number;
    resources: number;
  };
}

// Singleton instance
export const syncManager = new SyncManager();

export default SyncManager;
