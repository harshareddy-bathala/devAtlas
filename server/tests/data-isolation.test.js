/**
 * Data Isolation Tests
 * 
 * Tests that user data is properly isolated:
 * 1. User A cannot access user B's skills
 * 2. User A cannot access user B's projects
 * 3. User A cannot delete user B's resources
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  createTestUser,
  createTestData,
  getTestData,
  mockDb,
  mockAuth
} from './setup.js';

// Create a test app with routes for skills, projects, and resources
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Mock auth middleware
  const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await mockAuth.verifyIdToken(token);
      req.user = { id: decodedToken.uid, ...decodedToken };
      next();
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
  };

  // Helper to get user collection
  const getUserCollection = (userId, collection) => {
    return mockDb.collection('users').doc(userId).collection(collection);
  };

  // GET /api/v1/skills - Get current user's skills only
  app.get('/api/v1/skills', authMiddleware, async (req, res) => {
    try {
      const snapshot = await getUserCollection(req.user.id, 'skills').get();
      const skills = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, data: skills });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch skills' });
    }
  });

  // GET /api/v1/projects - Get current user's projects only
  app.get('/api/v1/projects', authMiddleware, async (req, res) => {
    try {
      const snapshot = await getUserCollection(req.user.id, 'projects').get();
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, data: projects });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
  });

  // GET /api/v1/resources - Get current user's resources only
  app.get('/api/v1/resources', authMiddleware, async (req, res) => {
    try {
      const snapshot = await getUserCollection(req.user.id, 'resources').get();
      const resources = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, data: resources });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch resources' });
    }
  });

  // DELETE /api/v1/resources/:id - Delete user's own resource only
  app.delete('/api/v1/resources/:id', authMiddleware, async (req, res) => {
    try {
      const resourceRef = getUserCollection(req.user.id, 'resources').doc(req.params.id);
      const resourceDoc = await resourceRef.get();
      
      if (!resourceDoc.exists) {
        return res.status(404).json({ success: false, error: 'Resource not found' });
      }
      
      await resourceRef.delete();
      res.json({ success: true, message: 'Resource deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete resource' });
    }
  });

  // DELETE /api/v1/skills/:id - Delete user's own skill only
  app.delete('/api/v1/skills/:id', authMiddleware, async (req, res) => {
    try {
      const skillRef = getUserCollection(req.user.id, 'skills').doc(req.params.id);
      const skillDoc = await skillRef.get();
      
      if (!skillDoc.exists) {
        return res.status(404).json({ success: false, error: 'Skill not found' });
      }
      
      await skillRef.delete();
      res.json({ success: true, message: 'Skill deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete skill' });
    }
  });

  // DELETE /api/v1/projects/:id - Delete user's own project only
  app.delete('/api/v1/projects/:id', authMiddleware, async (req, res) => {
    try {
      const projectRef = getUserCollection(req.user.id, 'projects').doc(req.params.id);
      const projectDoc = await projectRef.get();
      
      if (!projectDoc.exists) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      
      await projectRef.delete();
      res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
  });

  return app;
}

describe('Data Isolation', () => {
  let app;
  let userA;
  let userB;
  
  beforeEach(async () => {
    app = createTestApp();
    vi.clearAllMocks();
    
    // Create two test users
    userA = createTestUser({ userId: 'user-a', name: 'User A' });
    userB = createTestUser({ userId: 'user-b', name: 'User B' });
    
    // Create data for User A
    await createTestData(userA.userId, {
      skills: [
        { name: 'TypeScript', category: 'language', status: 'mastered' },
        { name: 'React', category: 'framework', status: 'learning' }
      ],
      projects: [
        { name: 'Project Alpha', status: 'active', description: 'User A project' }
      ],
      resources: [
        { title: 'User A Article', url: 'https://usera.com/article', type: 'article' }
      ]
    });
    
    // Create data for User B
    await createTestData(userB.userId, {
      skills: [
        { name: 'Python', category: 'language', status: 'mastered' },
        { name: 'Django', category: 'framework', status: 'learning' }
      ],
      projects: [
        { name: 'Project Beta', status: 'completed', description: 'User B project' }
      ],
      resources: [
        { title: 'User B Article', url: 'https://userb.com/article', type: 'article' }
      ]
    });
  });

  describe('Skills Isolation', () => {
    it('user A cannot access user B\'s skills', async () => {
      // Act: User A requests their skills
      const response = await request(app)
        .get('/api/v1/skills')
        .set('Authorization', `Bearer ${userA.token}`);

      // Assert: User A should only see their own skills
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const skills = response.body.data;
      const skillNames = skills.map(s => s.name);
      
      // Should contain User A's skills
      expect(skillNames).toContain('TypeScript');
      expect(skillNames).toContain('React');
      
      // Should NOT contain User B's skills
      expect(skillNames).not.toContain('Python');
      expect(skillNames).not.toContain('Django');
    });

    it('user B cannot access user A\'s skills', async () => {
      // Act: User B requests their skills
      const response = await request(app)
        .get('/api/v1/skills')
        .set('Authorization', `Bearer ${userB.token}`);

      // Assert: User B should only see their own skills
      expect(response.status).toBe(200);
      
      const skills = response.body.data;
      const skillNames = skills.map(s => s.name);
      
      // Should contain User B's skills
      expect(skillNames).toContain('Python');
      expect(skillNames).toContain('Django');
      
      // Should NOT contain User A's skills
      expect(skillNames).not.toContain('TypeScript');
      expect(skillNames).not.toContain('React');
    });

    it('user A cannot delete user B\'s skills', async () => {
      // Arrange: Get User B's skill ID
      const userBSkills = getTestData(userB.userId, 'skills');
      const userBSkillId = Array.from(userBSkills.keys())[0];

      // Act: User A tries to delete User B's skill
      const response = await request(app)
        .delete(`/api/v1/skills/${userBSkillId}`)
        .set('Authorization', `Bearer ${userA.token}`);

      // Assert: Should return 404 (not found in User A's collection)
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Skill not found');

      // User B's skill should still exist
      expect(getTestData(userB.userId, 'skills').size).toBe(2);
    });
  });

  describe('Projects Isolation', () => {
    it('user A cannot access user B\'s projects', async () => {
      // Act: User A requests their projects
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${userA.token}`);

      // Assert
      expect(response.status).toBe(200);
      
      const projects = response.body.data;
      const projectNames = projects.map(p => p.name);
      
      // Should contain User A's projects
      expect(projectNames).toContain('Project Alpha');
      
      // Should NOT contain User B's projects
      expect(projectNames).not.toContain('Project Beta');
    });

    it('user B cannot access user A\'s projects', async () => {
      // Act: User B requests their projects
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${userB.token}`);

      // Assert
      expect(response.status).toBe(200);
      
      const projects = response.body.data;
      const projectNames = projects.map(p => p.name);
      
      // Should contain User B's projects
      expect(projectNames).toContain('Project Beta');
      
      // Should NOT contain User A's projects
      expect(projectNames).not.toContain('Project Alpha');
    });

    it('user A cannot delete user B\'s projects', async () => {
      // Arrange: Get User B's project ID
      const userBProjects = getTestData(userB.userId, 'projects');
      const userBProjectId = Array.from(userBProjects.keys())[0];

      // Act: User A tries to delete User B's project
      const response = await request(app)
        .delete(`/api/v1/projects/${userBProjectId}`)
        .set('Authorization', `Bearer ${userA.token}`);

      // Assert: Should return 404
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');

      // User B's project should still exist
      expect(getTestData(userB.userId, 'projects').size).toBe(1);
    });
  });

  describe('Resources Isolation', () => {
    it('user A cannot access user B\'s resources', async () => {
      // Act: User A requests their resources
      const response = await request(app)
        .get('/api/v1/resources')
        .set('Authorization', `Bearer ${userA.token}`);

      // Assert
      expect(response.status).toBe(200);
      
      const resources = response.body.data;
      const resourceTitles = resources.map(r => r.title);
      
      // Should contain User A's resources
      expect(resourceTitles).toContain('User A Article');
      
      // Should NOT contain User B's resources
      expect(resourceTitles).not.toContain('User B Article');
    });

    it('user A cannot delete user B\'s resources', async () => {
      // Arrange: Get User B's resource ID
      const userBResources = getTestData(userB.userId, 'resources');
      const userBResourceId = Array.from(userBResources.keys())[0];

      // Act: User A tries to delete User B's resource
      const response = await request(app)
        .delete(`/api/v1/resources/${userBResourceId}`)
        .set('Authorization', `Bearer ${userA.token}`);

      // Assert: Should return 404 (not found in User A's collection)
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Resource not found');

      // User B's resource should still exist
      expect(getTestData(userB.userId, 'resources').size).toBe(1);
    });

    it('user B cannot delete user A\'s resources', async () => {
      // Arrange: Get User A's resource ID
      const userAResources = getTestData(userA.userId, 'resources');
      const userAResourceId = Array.from(userAResources.keys())[0];

      // Act: User B tries to delete User A's resource
      const response = await request(app)
        .delete(`/api/v1/resources/${userAResourceId}`)
        .set('Authorization', `Bearer ${userB.token}`);

      // Assert: Should return 404
      expect(response.status).toBe(404);
      
      // User A's resource should still exist
      expect(getTestData(userA.userId, 'resources').size).toBe(1);
    });
  });

  describe('Cross-user data count verification', () => {
    it('each user sees only their own data counts', async () => {
      // Add more data to User A
      await createTestData(userA.userId, {
        skills: [{ name: 'Go', category: 'language', status: 'learning' }]
      });

      // Act: Get both users' skills
      const [responseA, responseB] = await Promise.all([
        request(app)
          .get('/api/v1/skills')
          .set('Authorization', `Bearer ${userA.token}`),
        request(app)
          .get('/api/v1/skills')
          .set('Authorization', `Bearer ${userB.token}`)
      ]);

      // Assert: User A should have 3 skills, User B should have 2
      expect(responseA.body.data.length).toBe(3);
      expect(responseB.body.data.length).toBe(2);
    });
  });
});
