/**
 * DevOrbit Service Worker
 * 
 * Provides offline support through:
 * - Cache-first strategy for static assets
 * - Network-first with cache fallback for API calls
 * - Background sync for offline mutations
 */

const CACHE_NAME = 'devorbit-v1';
const API_CACHE_NAME = 'devorbit-api-v1';
const OFFLINE_QUEUE_NAME = 'devorbit-offline-queue';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// API endpoints to cache (GET only)
const CACHEABLE_API_PATTERNS = [
  '/api/v1/skills',
  '/api/v1/projects',
  '/api/v1/resources',
  '/api/v1/stats',
  '/api/v1/activities/heatmap',
  '/api/v1/stats/progress',
];

// API cache TTL (5 minutes)
const API_CACHE_TTL = 5 * 60 * 1000;

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some static assets:', err);
      });
    })
  );
  
  // Activate immediately without waiting
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Take control of all clients
      self.clients.claim(),
    ])
  );
});

/**
 * Fetch event - handle requests with caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests for caching (they'll be queued if offline)
  if (request.method !== 'GET') {
    event.respondWith(handleMutation(request));
    return;
  }
  
  // API requests - network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Static assets - cache first with network fallback
  event.respondWith(handleStaticRequest(request));
});

/**
 * Handle static asset requests (cache first)
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    }).catch(() => {});
    
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline page if available
    const offlinePage = await cache.match('/');
    if (offlinePage) {
      return offlinePage;
    }
    throw error;
  }
}

/**
 * Handle API requests (network first with cache fallback)
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cache = await caches.open(API_CACHE_NAME);
  
  // Check if this endpoint is cacheable
  const isCacheable = CACHEABLE_API_PATTERNS.some((pattern) =>
    url.pathname.includes(pattern)
  );
  
  try {
    const response = await fetch(request);
    
    if (response.ok && isCacheable) {
      // Clone response and add timestamp for TTL
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-time', Date.now().toString());
      
      const body = await responseToCache.blob();
      const cachedResponse = new Response(body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers,
      });
      
      cache.put(request, cachedResponse);
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    console.log('[SW] Network failed, trying cache:', url.pathname);
    
    if (isCacheable) {
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        const cacheTime = parseInt(cachedResponse.headers.get('sw-cache-time') || '0');
        const isExpired = Date.now() - cacheTime > API_CACHE_TTL;
        
        if (!isExpired) {
          console.log('[SW] Returning cached API response:', url.pathname);
          return cachedResponse;
        } else {
          console.log('[SW] Cache expired, returning stale data:', url.pathname);
          // Still return stale data - better than nothing
          return cachedResponse;
        }
      }
    }
    
    // Return offline error response
    return new Response(
      JSON.stringify({
        success: false,
        error: 'You are offline. Please check your connection.',
        code: 'OFFLINE',
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle mutation requests (POST, PUT, DELETE)
 * Queue them if offline for background sync
 */
async function handleMutation(request) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch (error) {
    // Network failed - queue for background sync
    console.log('[SW] Queueing offline mutation:', request.url);
    
    await queueOfflineMutation(request);
    
    return new Response(
      JSON.stringify({
        success: true,
        queued: true,
        message: 'Your changes will be saved when you\'re back online.',
        code: 'QUEUED_OFFLINE',
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Queue a mutation for background sync
 */
async function queueOfflineMutation(request) {
  const url = new URL(request.url);
  const body = await request.clone().text();
  
  const mutation = {
    url: url.href,
    method: request.method,
    headers: Object.fromEntries(request.headers),
    body,
    timestamp: Date.now(),
  };
  
  // Store in IndexedDB
  const db = await openDatabase();
  const tx = db.transaction(OFFLINE_QUEUE_NAME, 'readwrite');
  const store = tx.objectStore(OFFLINE_QUEUE_NAME);
  await store.add(mutation);
  
  // Register for background sync
  if ('sync' in self.registration) {
    await self.registration.sync.register('sync-mutations');
  }
}

/**
 * Background sync event
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(processMutationQueue());
  }
});

/**
 * Process queued mutations
 */
async function processMutationQueue() {
  const db = await openDatabase();
  const tx = db.transaction(OFFLINE_QUEUE_NAME, 'readwrite');
  const store = tx.objectStore(OFFLINE_QUEUE_NAME);
  const mutations = await store.getAll();
  
  console.log(`[SW] Processing ${mutations.length} queued mutations`);
  
  for (const mutation of mutations) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.headers,
        body: mutation.body,
      });
      
      if (response.ok) {
        // Remove from queue
        const deleteTx = db.transaction(OFFLINE_QUEUE_NAME, 'readwrite');
        const deleteStore = deleteTx.objectStore(OFFLINE_QUEUE_NAME);
        await deleteStore.delete(mutation.id);
        console.log('[SW] Successfully synced mutation:', mutation.url);
      } else {
        console.error('[SW] Failed to sync mutation:', response.status);
      }
    } catch (error) {
      console.error('[SW] Error syncing mutation:', error);
      // Will retry on next sync
    }
  }
  
  // Notify clients that sync is complete
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      count: mutations.length,
    });
  });
}

/**
 * Open IndexedDB for offline queue
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('devorbit-sw', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE_NAME)) {
        db.createObjectStore(OFFLINE_QUEUE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    };
  });
}

/**
 * Handle messages from clients
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME);
      caches.delete(API_CACHE_NAME);
      event.ports[0]?.postMessage({ success: true });
      break;
    
    case 'GET_QUEUE_SIZE':
      openDatabase()
        .then((db) => {
          const tx = db.transaction(OFFLINE_QUEUE_NAME, 'readonly');
          const store = tx.objectStore(OFFLINE_QUEUE_NAME);
          return store.count();
        })
        .then((count) => {
          event.ports[0]?.postMessage({ count });
        })
        .catch((error) => {
          event.ports[0]?.postMessage({ error: error.message });
        });
      break;
  }
});

console.log('[SW] Service worker loaded');
