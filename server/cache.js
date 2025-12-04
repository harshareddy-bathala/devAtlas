/**
 * Redis Cache Module for DevOrbit
 * 
 * Provides caching functionality with Redis, with graceful fallback
 * if Redis is unavailable.
 */

const Redis = require('ioredis');

let redis = null;
let isRedisAvailable = false;

// Initialize Redis connection
function initRedis() {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
      // Don't throw errors on connection failure
      showFriendlyErrorStack: true
    });

    redis.on('connect', () => {
      console.log('🔗 Redis connected');
      isRedisAvailable = true;
    });

    redis.on('ready', () => {
      console.log('✅ Redis ready');
      isRedisAvailable = true;
    });

    redis.on('error', (err) => {
      // Only log once per error type to avoid flooding logs
      if (isRedisAvailable) {
        console.warn('⚠️  Redis error (caching disabled):', err.message);
      }
      isRedisAvailable = false;
    });

    redis.on('close', () => {
      isRedisAvailable = false;
    });

    // Try to connect
    redis.connect().catch((err) => {
      console.warn('⚠️  Redis connection failed (caching disabled):', err.message);
      isRedisAvailable = false;
    });

    return redis;
  } catch (error) {
    console.warn('⚠️  Redis initialization failed (caching disabled):', error.message);
    isRedisAvailable = false;
    return null;
  }
}

// Initialize on module load
initRedis();

/**
 * Get cached value or fetch and cache
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch data if not cached
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @returns {Promise<any>} - Cached or freshly fetched data
 */
async function getCached(key, fetchFn, ttl = 300) {
  // If Redis is not available, just fetch directly
  if (!isRedisAvailable || !redis) {
    return fetchFn();
  }

  try {
    // Try to get from cache
    const cached = await redis.get(key);
    
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (parseError) {
        // Invalid JSON in cache, fetch fresh
        console.warn(`Invalid cache data for key ${key}, fetching fresh`);
      }
    }

    // Fetch fresh data
    const data = await fetchFn();

    // Cache the result (don't await, fire and forget)
    redis.setex(key, ttl, JSON.stringify(data)).catch((err) => {
      console.warn(`Failed to cache ${key}:`, err.message);
    });

    return data;
  } catch (error) {
    // If cache fails, fallback to direct fetch
    console.warn(`Cache error for ${key}, fetching directly:`, error.message);
    return fetchFn();
  }
}

/**
 * Invalidate cache entries matching a pattern
 * @param {string} pattern - Redis key pattern (supports * wildcard)
 * @returns {Promise<number>} - Number of keys deleted
 */
async function invalidateCache(pattern) {
  if (!isRedisAvailable || !redis) {
    return 0;
  }

  try {
    // Find all matching keys
    const keys = await redis.keys(pattern);
    
    if (keys.length === 0) {
      return 0;
    }

    // Delete all matching keys
    const deleted = await redis.del(...keys);
    return deleted;
  } catch (error) {
    console.warn(`Failed to invalidate cache pattern ${pattern}:`, error.message);
    return 0;
  }
}

/**
 * Invalidate a specific cache key
 * @param {string} key - Exact cache key
 * @returns {Promise<boolean>} - True if deleted
 */
async function invalidateKey(key) {
  if (!isRedisAvailable || !redis) {
    return false;
  }

  try {
    const result = await redis.del(key);
    return result > 0;
  } catch (error) {
    console.warn(`Failed to invalidate key ${key}:`, error.message);
    return false;
  }
}

/**
 * Invalidate all cache entries for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Number of keys deleted
 */
async function invalidateUserCache(userId) {
  return invalidateCache(`*:${userId}*`);
}

/**
 * Set a value directly in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>} - True if set successfully
 */
async function setCache(key, value, ttl = 300) {
  if (!isRedisAvailable || !redis) {
    return false;
  }

  try {
    await redis.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Failed to set cache ${key}:`, error.message);
    return false;
  }
}

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Cached value or null
 */
async function getCache(key) {
  if (!isRedisAvailable || !redis) {
    return null;
  }

  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn(`Failed to get cache ${key}:`, error.message);
    return null;
  }
}

/**
 * Check if Redis is available
 * @returns {boolean}
 */
function isCacheAvailable() {
  return isRedisAvailable;
}

/**
 * Close Redis connection (for graceful shutdown)
 */
async function closeCache() {
  if (redis) {
    await redis.quit();
    redis = null;
    isRedisAvailable = false;
  }
}

module.exports = {
  getCached,
  invalidateCache,
  invalidateKey,
  invalidateUserCache,
  setCache,
  getCache,
  isCacheAvailable,
  closeCache
};
