/**
 * Test Setup for DevOrbit Server
 * 
 * Provides mock implementations for Firebase Admin SDK
 * and helper functions for creating test data.
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// ============ MOCK DATA STORE ============
// In-memory store for mock Firestore data
const mockDataStore = {
  users: new Map(),
  collections: new Map()
};

// Helper to get collection path
function getCollectionPath(userId, collection) {
  return `users/${userId}/${collection}`;
}

// ============ MOCK FIRESTORE ============
const createMockDocRef = (path, id) => {
  return {
    id,
    path: `${path}/${id}`,
    get: vi.fn(async () => {
      const collectionData = mockDataStore.collections.get(path) || new Map();
      const docData = collectionData.get(id);
      return {
        exists: !!docData,
        id,
        data: () => docData || null,
        ref: { id, path: `${path}/${id}` }
      };
    }),
    set: vi.fn(async (data, options = {}) => {
      const collectionData = mockDataStore.collections.get(path) || new Map();
      if (options.merge) {
        const existing = collectionData.get(id) || {};
        collectionData.set(id, { ...existing, ...data });
      } else {
        collectionData.set(id, data);
      }
      mockDataStore.collections.set(path, collectionData);
    }),
    update: vi.fn(async (data) => {
      const collectionData = mockDataStore.collections.get(path) || new Map();
      const existing = collectionData.get(id) || {};
      collectionData.set(id, { ...existing, ...data });
      mockDataStore.collections.set(path, collectionData);
    }),
    delete: vi.fn(async () => {
      const collectionData = mockDataStore.collections.get(path) || new Map();
      collectionData.delete(id);
      mockDataStore.collections.set(path, collectionData);
    })
  };
};

const createMockCollectionRef = (path) => {
  return {
    doc: vi.fn((id) => createMockDocRef(path, id || `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)),
    add: vi.fn(async (data) => {
      const id = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const collectionData = mockDataStore.collections.get(path) || new Map();
      collectionData.set(id, data);
      mockDataStore.collections.set(path, collectionData);
      return { id };
    }),
    get: vi.fn(async () => {
      const collectionData = mockDataStore.collections.get(path) || new Map();
      const docs = Array.from(collectionData.entries()).map(([id, data]) => ({
        id,
        exists: true,
        data: () => data,
        ref: { id, path: `${path}/${id}` }
      }));
      return {
        docs,
        size: docs.length,
        empty: docs.length === 0
      };
    }),
    where: vi.fn(() => createMockCollectionRef(path)),
    orderBy: vi.fn(() => createMockCollectionRef(path)),
    limit: vi.fn(() => createMockCollectionRef(path))
  };
};

const mockDb = {
  collection: vi.fn((name) => {
    if (name === 'users') {
      return {
        doc: vi.fn((userId) => ({
          ...createMockDocRef('users', userId),
          collection: vi.fn((subCollection) => createMockCollectionRef(getCollectionPath(userId, subCollection)))
        }))
      };
    }
    return createMockCollectionRef(name);
  }),
  batch: vi.fn(() => ({
    delete: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn(async () => {})
  })),
  runTransaction: vi.fn(async (fn) => {
    const transaction = {
      get: vi.fn(async (ref) => ref.get()),
      set: vi.fn((ref, data) => ref.set(data)),
      update: vi.fn((ref, data) => ref.update(data)),
      delete: vi.fn((ref) => ref.delete())
    };
    return fn(transaction);
  }),
  settings: vi.fn()
};

// ============ MOCK AUTH ============
const mockUsers = new Map();

const mockAuth = {
  verifyIdToken: vi.fn(async (token) => {
    // Parse mock token format: 'test-token-{userId}'
    const match = token.match(/^test-token-(.+)$/);
    if (!match) {
      throw new Error('Invalid token');
    }
    const userId = match[1];
    const user = mockUsers.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      uid: userId,
      email: user.email,
      name: user.name
    };
  }),
  deleteUser: vi.fn(async (userId) => {
    mockUsers.delete(userId);
  }),
  generatePasswordResetLink: vi.fn(async () => 'https://mock-reset-link.com'),
  createUser: vi.fn(async (data) => {
    const userId = `user-${Date.now()}`;
    mockUsers.set(userId, data);
    return { uid: userId };
  })
};

// ============ MOCK FIREBASE ADMIN ============
const mockAdmin = {
  firestore: {
    FieldValue: {
      serverTimestamp: vi.fn(() => new Date().toISOString()),
      increment: vi.fn((n) => n),
      arrayUnion: vi.fn((...args) => args),
      arrayRemove: vi.fn((...args) => args)
    }
  }
};

// ============ MOCK MODULES ============
vi.mock('../firebase', () => ({
  initializeFirebase: vi.fn(() => ({ db: mockDb, auth: mockAuth })),
  getDb: vi.fn(() => mockDb),
  getAuth: vi.fn(() => mockAuth),
  verifyIdToken: vi.fn(async (token) => mockAuth.verifyIdToken(token)),
  getOrCreateUser: vi.fn(async (decodedToken) => {
    const userId = decodedToken.uid;
    const userData = mockUsers.get(userId) || {
      email: decodedToken.email,
      name: decodedToken.name || 'Test User'
    };
    return { id: userId, ...userData };
  }),
  admin: mockAdmin
}));

// ============ HELPER FUNCTIONS ============

/**
 * Create a test user in the mock auth system
 * @param {object} options - User options
 * @returns {object} - User data with token
 */
export function createTestUser(options = {}) {
  const userId = options.userId || `test-user-${Date.now()}`;
  const userData = {
    email: options.email || `${userId}@test.com`,
    name: options.name || 'Test User',
    displayName: options.displayName || 'Test User',
    isOnboarded: options.isOnboarded !== undefined ? options.isOnboarded : true,
    createdAt: new Date().toISOString(),
    ...options
  };

  // Add to mock users
  mockUsers.set(userId, userData);

  // Add user document to mock Firestore
  const usersCollection = mockDataStore.collections.get('users') || new Map();
  usersCollection.set(userId, userData);
  mockDataStore.collections.set('users', usersCollection);

  return {
    userId,
    token: `test-token-${userId}`,
    userData
  };
}

/**
 * Create test data for a user
 * @param {string} userId - User ID
 * @param {object} data - Data to create
 * @returns {object} - Created data IDs
 */
export async function createTestData(userId, data = {}) {
  const createdIds = {
    skills: [],
    projects: [],
    resources: [],
    activities: []
  };

  // Create skills
  if (data.skills) {
    const skillsPath = getCollectionPath(userId, 'skills');
    const skillsCollection = mockDataStore.collections.get(skillsPath) || new Map();
    
    for (const skill of data.skills) {
      const skillId = `skill-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      skillsCollection.set(skillId, {
        ...skill,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      createdIds.skills.push(skillId);
    }
    
    mockDataStore.collections.set(skillsPath, skillsCollection);
  }

  // Create projects
  if (data.projects) {
    const projectsPath = getCollectionPath(userId, 'projects');
    const projectsCollection = mockDataStore.collections.get(projectsPath) || new Map();
    
    for (const project of data.projects) {
      const projectId = `project-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      projectsCollection.set(projectId, {
        ...project,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      createdIds.projects.push(projectId);
    }
    
    mockDataStore.collections.set(projectsPath, projectsCollection);
  }

  // Create resources
  if (data.resources) {
    const resourcesPath = getCollectionPath(userId, 'resources');
    const resourcesCollection = mockDataStore.collections.get(resourcesPath) || new Map();
    
    for (const resource of data.resources) {
      const resourceId = `resource-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      resourcesCollection.set(resourceId, {
        ...resource,
        createdAt: new Date().toISOString()
      });
      createdIds.resources.push(resourceId);
    }
    
    mockDataStore.collections.set(resourcesPath, resourcesCollection);
  }

  // Create activity summaries
  if (data.activities) {
    const activitiesPath = getCollectionPath(userId, 'activitySummary');
    const activitiesCollection = mockDataStore.collections.get(activitiesPath) || new Map();
    
    for (const activity of data.activities) {
      const activityId = activity.date || new Date().toISOString().split('T')[0];
      activitiesCollection.set(activityId, {
        ...activity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      createdIds.activities.push(activityId);
    }
    
    mockDataStore.collections.set(activitiesPath, activitiesCollection);
  }

  return createdIds;
}

/**
 * Get test data for a user
 * @param {string} userId - User ID
 * @param {string} collection - Collection name
 * @returns {Map} - Collection data
 */
export function getTestData(userId, collection) {
  const path = getCollectionPath(userId, collection);
  return mockDataStore.collections.get(path) || new Map();
}

/**
 * Clean up test user and their data
 * @param {string} userId - User ID to clean up
 */
export function cleanupTestUser(userId) {
  // Remove from mock users
  mockUsers.delete(userId);

  // Remove user document
  const usersCollection = mockDataStore.collections.get('users') || new Map();
  usersCollection.delete(userId);
  mockDataStore.collections.set('users', usersCollection);

  // Remove all subcollections
  const collections = ['skills', 'projects', 'resources', 'activitySummary'];
  for (const collection of collections) {
    const path = getCollectionPath(userId, collection);
    mockDataStore.collections.delete(path);
  }
}

/**
 * Clear all test data
 */
export function clearAllTestData() {
  mockUsers.clear();
  mockDataStore.users.clear();
  mockDataStore.collections.clear();
}

// ============ LIFECYCLE HOOKS ============
beforeAll(() => {
  // Reset mocks before all tests
  vi.clearAllMocks();
});

afterEach(() => {
  // Clear all test data after each test
  clearAllTestData();
});

afterAll(() => {
  // Clean up after all tests
  vi.restoreAllMocks();
});

// ============ EXPORTS ============
export {
  mockDb,
  mockAuth,
  mockAdmin,
  mockDataStore,
  mockUsers
};
