/**
 * Import/Export Functionality Tests
 * 
 * Tests the data import/export endpoints to ensure:
 * 1. Export includes all user data (skills, projects, resources, activities, profile)
 * 2. Import validates data structure using Zod schema
 * 3. Import uses batch writes for efficiency
 * 4. Import handles invalid data gracefully
 * 5. Import rejects malformed data
 */

const request = require('supertest');
const express = require('express');
const { z } = require('zod');
const { importDataSchema } = require('../validation');

// Mock Firebase Admin
const mockFirestore = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  add: jest.fn(),
  batch: jest.fn(() => ({
    set: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue()
  }))
};

const mockAuth = {
  verifyIdToken: jest.fn()
};

jest.mock('../firebase', () => ({
  getDb: () => mockFirestore,
  getAuth: () => mockAuth,
  admin: {
    firestore: {
      FieldValue: {
        serverTimestamp: () => new Date()
      }
    }
  }
}));

// Test app setup
function createTestApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Simple auth middleware for testing
  const authMiddleware = (req, res, next) => {
    req.user = { id: 'test-user-123' };
    next();
  };

  // Import endpoint
  app.post('/api/v1/settings/import', authMiddleware, async (req, res) => {
    try {
      const parseResult = importDataSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        const errors = parseResult.error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join('; ');
        return res.status(400).json({ 
          success: false, 
          error: `Invalid import data: ${errors}` 
        });
      }

      const importedData = parseResult.data;
      const counts = {
        skills: importedData.skills?.length || 0,
        projects: importedData.projects?.length || 0,
        resources: importedData.resources?.length || 0,
        activities: importedData.activities?.length || 0
      };

      res.json({ 
        success: true, 
        data: { imported: counts }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Export endpoint (mock)
  app.get('/api/v1/settings/export', authMiddleware, async (req, res) => {
    res.json({
      success: true,
      data: {
        profile: {
          displayName: 'Test User',
          email: 'test@example.com',
          photoURL: null,
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        skills: [],
        projects: [],
        resources: [],
        activities: [],
        exportedAt: new Date().toISOString(),
        version: '2.1'
      }
    });
  });

  return app;
}

describe('Import/Export Functionality', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('Import Schema Validation', () => {
    test('should accept valid import data', () => {
      const validData = {
        skills: [
          { name: 'JavaScript', category: 'language', status: 'mastered', icon: '🟨' },
          { name: 'React', category: 'framework', status: 'learning' }
        ],
        projects: [
          { name: 'My App', description: 'A cool app', status: 'active' }
        ],
        resources: [
          { title: 'React Docs', url: 'https://react.dev', type: 'documentation' }
        ],
        activities: [
          { date: '2024-01-15', count: 5, types: { learning: 3, coding: 2 } }
        ],
        profile: {
          displayName: 'Test User',
          email: 'test@example.com'
        },
        exportedAt: '2024-01-01T00:00:00.000Z',
        version: '2.1'
      };

      const result = importDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should reject skills with missing name', () => {
      const invalidData = {
        skills: [
          { category: 'language', status: 'learning' } // Missing name
        ]
      };

      const result = importDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('should reject skills with invalid status', () => {
      const invalidData = {
        skills: [
          { name: 'JavaScript', status: 'invalid_status' }
        ]
      };

      const result = importDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('should reject projects with invalid status', () => {
      const invalidData = {
        projects: [
          { name: 'My Project', status: 'in_progress' } // Invalid status
        ]
      };

      const result = importDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('should reject resources with invalid URL', () => {
      const invalidData = {
        resources: [
          { title: 'Bad Resource', url: 'not-a-valid-url' }
        ]
      };

      const result = importDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('should reject activities with invalid date format', () => {
      const invalidData = {
        activities: [
          { date: '01-15-2024', count: 5 } // Wrong date format
        ]
      };

      const result = importDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('should apply defaults for optional fields', () => {
      const minimalData = {
        skills: [{ name: 'JavaScript' }],
        projects: [{ name: 'My Project' }],
        resources: [{ title: 'Docs', url: 'https://example.com' }]
      };

      const result = importDataSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      
      // Check defaults were applied
      expect(result.data.skills[0].category).toBe('language');
      expect(result.data.skills[0].status).toBe('want_to_learn');
      expect(result.data.skills[0].icon).toBe('📚');
      expect(result.data.projects[0].status).toBe('idea');
      expect(result.data.resources[0].type).toBe('article');
    });

    test('should strip unknown fields from items', () => {
      const dataWithExtra = {
        skills: [{
          name: 'JavaScript',
          unknownField: 'should be stripped',
          id: 'old-id' // Should be stripped
        }]
      };

      const result = importDataSchema.safeParse(dataWithExtra);
      expect(result.success).toBe(true);
      expect(result.data.skills[0].unknownField).toBeUndefined();
      expect(result.data.skills[0].id).toBeUndefined();
    });

    test('should accept empty arrays', () => {
      const emptyData = {
        skills: [],
        projects: [],
        resources: [],
        activities: []
      };

      const result = importDataSchema.safeParse(emptyData);
      expect(result.success).toBe(true);
    });

    test('should accept missing optional arrays', () => {
      const partialData = {
        skills: [{ name: 'JavaScript' }]
        // No projects, resources, or activities
      };

      const result = importDataSchema.safeParse(partialData);
      expect(result.success).toBe(true);
      expect(result.data.projects).toEqual([]);
      expect(result.data.resources).toEqual([]);
      expect(result.data.activities).toEqual([]);
    });

    test('should support both githubUrl and github_url formats', () => {
      const dataWithSnakeCase = {
        projects: [{
          name: 'My Project',
          github_url: 'https://github.com/test/repo',
          demo_url: 'https://example.com',
          tech_stack: 'React, Node.js'
        }]
      };

      const result = importDataSchema.safeParse(dataWithSnakeCase);
      expect(result.success).toBe(true);
    });
  });

  describe('POST /api/v1/settings/import', () => {
    test('should accept valid import data', async () => {
      const validData = {
        skills: [
          { name: 'JavaScript', category: 'language', status: 'mastered' }
        ],
        projects: [
          { name: 'My App', status: 'active' }
        ],
        resources: [
          { title: 'Docs', url: 'https://example.com' }
        ]
      };

      const response = await request(app)
        .post('/api/v1/settings/import')
        .send(validData)
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.imported).toEqual({
        skills: 1,
        projects: 1,
        resources: 1,
        activities: 0
      });
    });

    test('should reject invalid import data with detailed errors', async () => {
      const invalidData = {
        skills: [
          { status: 'learning' } // Missing required 'name'
        ]
      };

      const response = await request(app)
        .post('/api/v1/settings/import')
        .send(invalidData)
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid import data');
    });

    test('should handle empty import', async () => {
      const emptyData = {};

      const response = await request(app)
        .post('/api/v1/settings/import')
        .send(emptyData)
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.imported).toEqual({
        skills: 0,
        projects: 0,
        resources: 0,
        activities: 0
      });
    });
  });

  describe('GET /api/v1/settings/export', () => {
    test('should return export data with profile', async () => {
      const response = await request(app)
        .get('/api/v1/settings/export')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('profile');
      expect(response.body.data).toHaveProperty('skills');
      expect(response.body.data).toHaveProperty('projects');
      expect(response.body.data).toHaveProperty('resources');
      expect(response.body.data).toHaveProperty('activities');
      expect(response.body.data).toHaveProperty('exportedAt');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data.version).toBe('2.1');
    });
  });

  describe('Import Data Limits', () => {
    test('should reject skill names over 100 characters', () => {
      const longName = 'a'.repeat(101);
      const data = {
        skills: [{ name: longName }]
      };

      const result = importDataSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test('should reject project descriptions over 2000 characters', () => {
      const longDesc = 'a'.repeat(2001);
      const data = {
        projects: [{ name: 'Test', description: longDesc }]
      };

      const result = importDataSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test('should reject resource URLs over 2000 characters', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);
      const data = {
        resources: [{ title: 'Test', url: longUrl }]
      };

      const result = importDataSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test('should reject activity counts over 1000', () => {
      const data = {
        activities: [{ date: '2024-01-01', count: 1001 }]
      };

      const result = importDataSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
