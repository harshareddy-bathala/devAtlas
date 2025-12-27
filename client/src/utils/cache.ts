/**
 * Shared Cache Utilities
 * 
 * Provides a unified caching layer for localStorage with TTL support.
 * Used across Projects, Resources, and StackTracker components.
 */

/** Default cache time-to-live in milliseconds (5 minutes) */
export const CACHE_TTL = 5 * 60 * 1000;

/** Cache keys used throughout the application */
export const CACHE_KEYS = {
  skills: 'devOrbit_skills_cache',
  projects: 'devOrbit_projects_cache',
  resources: 'devOrbit_resources_cache',
  stats: 'devOrbit_stats_cache',
  metadata: 'devOrbit_cache_metadata',
} as const;

/** Type for cache key values */
export type CacheKey = typeof CACHE_KEYS[keyof typeof CACHE_KEYS];

/** Structure of a cached entry */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** Result from loading cache with staleness indicator */
export interface CacheResult<T> {
  data: T;
  isStale: boolean;
}

/**
 * Load data from localStorage cache
 * @param key - The cache key to load from
 * @param ttl - Optional custom TTL (defaults to CACHE_TTL)
 * @returns CacheResult with data and staleness flag, or null if not found/invalid
 */
export function loadFromCache<T>(key: string, ttl: number = CACHE_TTL): CacheResult<T> | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored) as CacheEntry<T>;
    
    // Validate structure
    if (!parsed || typeof parsed.timestamp !== 'number' || parsed.data === undefined) {
      return null;
    }
    
    const isStale = Date.now() - parsed.timestamp > ttl;
    return { data: parsed.data, isStale };
  } catch (error) {
    // Invalid JSON or other error - treat as cache miss
    console.warn('Failed to load from cache:', error);
    return null;
  }
}

/**
 * Save data to localStorage cache
 * @param key - The cache key to save to
 * @param data - The data to cache
 */
export function saveToCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    // Storage full or other error
    console.warn('Failed to save to cache:', error);
  }
}

/**
 * Clear a specific cache entry
 * @param key - The cache key to clear
 */
export function clearCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    // Silently fail - not critical
    console.warn('Failed to clear cache:', error);
  }
}

/**
 * Clear all DevOrbit caches
 */
export function clearAllCaches(): void {
  Object.values(CACHE_KEYS).forEach(key => {
    clearCache(key);
  });
}

/**
 * Check if a cache entry exists and is not stale
 * @param key - The cache key to check
 * @param ttl - Optional custom TTL
 * @returns true if cache is valid and not stale
 */
export function isCacheValid(key: string, ttl: number = CACHE_TTL): boolean {
  const result = loadFromCache(key, ttl);
  return result !== null && !result.isStale;
}

/**
 * Get cache age in milliseconds
 * @param key - The cache key to check
 * @returns Age in milliseconds, or null if not cached
 */
export function getCacheAge(key: string): number | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored) as CacheEntry<unknown>;
    if (!parsed || typeof parsed.timestamp !== 'number') return null;
    
    return Date.now() - parsed.timestamp;
  } catch {
    return null;
  }
}

/**
 * Invalidate cache if it's older than the given timestamp
 * Useful for cache invalidation based on server-side changes
 * @param key - The cache key to check
 * @param invalidateAfter - Timestamp after which cache should be invalidated
 */
export function invalidateCacheIfOlderThan(key: string, invalidateAfter: number): boolean {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return false;
    
    const parsed = JSON.parse(stored) as CacheEntry<unknown>;
    if (parsed.timestamp < invalidateAfter) {
      clearCache(key);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
