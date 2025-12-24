/**
 * Redis Cache Module for DevOrbit
 * 
 * Provides caching functionality with Upstash Redis (serverless) or ioredis (local),
 * with graceful fallback if Redis is unavailable.
 * 
 * Priority:
 * 1. Upstash Redis (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 * 2. ioredis (REDIS_URL or localhost:6379)
 * 3. No caching (graceful fallback)
 */

// Try to import Upstash Redis, fallback to ioredis
let Redis;
let isUpstash = false;

try {
  // Check if Upstash credentials are available
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    Redis = require('@upstash/redis').Redis;
    isUpstash = true;
  } else {
    Redis = require('ioredis');
  }
} catch (error) {
  try {
    Redis = require('ioredis');
  } catch (e) {
    console.warn('⚠️  No Redis client available (caching disabled)');
    Redis = null;
  }
}

let redis = null;
let isRedisAvailable = false;

// Initialize Redis connection
function initRedis() {
  if (redis) return redis;

  try {
    if (isUpstash) {
      // Upstash Redis (serverless, REST-based)
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      
      // Upstash is always available once initialized (REST-based, no persistent connection)
      isRedisAvailable = true;
      console.log('✅ Upstash Redis initialized (serverless)');
      return redis;
    }
    
    // Fallback to ioredis for local development
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
      // Don't throw errors on connection failure
      showFriendlyErrorStack: true
    });

    redis.on('connect', () => {
      console.log('🔗 Redis connected (ioredis)');
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

    // Cache the result - use appropriate method based on client type
    // Upstash uses set() with ex option, ioredis uses setex()
    try {
      if (isUpstash) {
        await redis.set(key, JSON.stringify(data), { ex: ttl });
      } else {
        redis.setex(key, ttl, JSON.stringify(data)).catch((err) => {
          console.warn(`Failed to cache ${key}:`, err.message);
        });
      }
    } catch (cacheErr) {
      console.warn(`Failed to cache ${key}:`, cacheErr.message);
    }

    return data;
  } catch (error) {
    // If cache fails, fallback to direct fetch
    console.warn(`Cache error for ${key}, fetching directly:`, error.message);
    return fetchFn();
  }
}

/**
 * Invalidate cache entries matching a pattern
 * Uses SCAN for production safety (O(1) per iteration instead of O(n) with keys())
 * @param {string} pattern - Redis key pattern (supports * wildcard)
 * @returns {Promise<number>} - Number of keys deleted
 */
async function invalidateCache(pattern) {
  if (!isRedisAvailable || !redis) {
    return 0;
  }

  try {
    const keysToDelete = [];
    
    if (isUpstash) {
      // Upstash doesn't support SCAN, but it's serverless so keys() is acceptable
      const keys = await redis.keys(pattern);
      if (keys && keys.length > 0) {
        keysToDelete.push(...keys);
      }
    } else {
      // For ioredis, use SCAN for production safety
      // SCAN is O(1) per iteration and doesn't block the server
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100 // Process 100 keys per iteration
        );
        cursor = nextCursor;
        if (keys && keys.length > 0) {
          keysToDelete.push(...keys);
        }
      } while (cursor !== '0');
    }
    
    if (keysToDelete.length === 0) {
      return 0;
    }

    // Delete in batches to avoid overwhelming Redis
    const batchSize = 100;
    let totalDeleted = 0;
    
    for (let i = 0; i < keysToDelete.length; i += batchSize) {
      const batch = keysToDelete.slice(i, i + batchSize);
      const deleted = await redis.del(...batch);
      totalDeleted += typeof deleted === 'number' ? deleted : batch.length;
    }
    
    return totalDeleted;
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
    if (isUpstash) {
      await redis.set(key, JSON.stringify(value), { ex: ttl });
    } else {
      await redis.setex(key, ttl, JSON.stringify(value));
    }
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
 * Note: Upstash is REST-based and doesn't require connection cleanup
 */
async function closeCache() {
  if (redis) {
    // Only ioredis has a quit method - Upstash is REST-based
    if (!isUpstash && typeof redis.quit === 'function') {
      await redis.quit();
    }
    redis = null;
    isRedisAvailable = false;
  }
}

/**
 * Test Redis connection health
 * @returns {Promise<{status: string, test: string|null, type: string|null}>}
 */
async function testCacheHealth() {
  if (!isRedisAvailable || !redis) {
    return { status: 'not_configured', test: null, type: null };
  }

  try {
    const testKey = 'health_check';
    const testValue = 'ok';
    
    // Set a test value with short TTL
    if (isUpstash) {
      await redis.set(testKey, testValue, { ex: 10 });
    } else {
      await redis.setex(testKey, 10, testValue);
    }
    
    // Read it back
    const result = await redis.get(testKey);
    
    if (result === testValue) {
      return { 
        status: 'connected', 
        test: 'passed', 
        type: isUpstash ? 'upstash' : 'ioredis' 
      };
    } else {
      return { status: 'error', test: 'value_mismatch', type: isUpstash ? 'upstash' : 'ioredis' };
    }
  } catch (error) {
    return { status: 'error', test: error.message, type: isUpstash ? 'upstash' : 'ioredis' };
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
  closeCache,
  testCacheHealth
};
