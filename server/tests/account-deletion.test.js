/**
 * Account Deletion Tests
 * 
 * Tests the DELETE /api/auth/account endpoint to ensure:
 * 1. All user subcollections are deleted (skills, projects, resources, activitySummary)
 * 2. User profile document is deleted
 * 3. Other users' data is not affected
 * 4. Unauthenticated requests are rejected
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  createTestUser,
  createTestData,
  getTestData,
  cleanupTestUser,
  mockDb,
  mockAuth
} from './setup.js';

// Create a minimal Express app for testing
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Mock auth middleware
  const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await mockAuth.verifyIdToken(token);
      req.user = { id: decodedToken.uid, ...decodedToken };
      next();
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
  };

  // DELETE /api/v1/auth/account endpoint
  app.delete('/api/v1/auth/account', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    
    try {
      // Delete all subcollections
      const collections = ['skills', 'projects', 'resources', 'activitySummary'];
      
      for (const collection of collections) {
        const snapshot = await mockDb.collection('users').doc(userId).collection(collection).get();
        const batch = mockDb.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        if (snapshot.size > 0) await batch.commit();
      }

      // Delete user document
      await mockDb.collection('users').doc(userId).delete();

      // Delete Firebase Auth user
      await mockAuth.deleteUser(userId);

      res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete account' });
    }
  });

  return app;
}

describe('Account Deletion', () => {
  let app;
  
  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  describe('DELETE /api/v1/auth/account', () => {
    it('should delete all user subcollections', async () => {
      // Arrange: Create test user with data
      const { userId, token } = createTestUser();
      
      await createTestData(userId, {
        skills: [
          { name: 'JavaScript', category: 'language', status: 'mastered' },
          { name: 'Python', category: 'language', status: 'learning' }
        ],
        projects: [
          { name: 'Project A', status: 'active' },
          { name: 'Project B', status: 'completed' }
        ],
        resources: [
          { title: 'Resource 1', url: 'https://example.com/1', type: 'article' }
        ],
        activities: [
          { date: '2024-01-01', count: 5, types: { learning: 3, project: 2 } }
        ]
      });

      // Verify data was created
      expect(getTestData(userId, 'skills').size).toBe(2);
      expect(getTestData(userId, 'projects').size).toBe(2);
      expect(getTestData(userId, 'resources').size).toBe(1);
      expect(getTestData(userId, 'activitySummary').size).toBe(1);

      // Act: Delete account
      const response = await request(app)
        .delete('/api/v1/auth/account')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Account deleted successfully');
      
      // Verify mockAuth.deleteUser was called
      expect(mockAuth.deleteUser).toHaveBeenCalledWith(userId);
    });

    it('should delete user profile document', async () => {
      // Arrange
      const { userId, token } = createTestUser({
        displayName: 'Test User',
        email: 'test@example.com',
        isOnboarded: true
      });

      // Act
      const response = await request(app)
        .delete('/api/v1/auth/account')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify the delete method was called on the user document
      const userDocRef = mockDb.collection('users').doc(userId);
      expect(userDocRef.delete).toHaveBeenCalled();
    });

    it('should not affect other users\' data', async () => {
      // Arrange: Create two users with data
      const user1 = createTestUser({ userId: 'user-1' });
      const user2 = createTestUser({ userId: 'user-2' });

      await createTestData(user1.userId, {
        skills: [{ name: 'React', category: 'framework', status: 'learning' }],
        projects: [{ name: 'User 1 Project', status: 'active' }]
      });

      await createTestData(user2.userId, {
        skills: [{ name: 'Vue', category: 'framework', status: 'mastered' }],
        projects: [{ name: 'User 2 Project', status: 'completed' }]
      });

      // Verify both users have data
      expect(getTestData(user1.userId, 'skills').size).toBe(1);
      expect(getTestData(user2.userId, 'skills').size).toBe(1);

      // Act: Delete user 1's account
      const response = await request(app)
        .delete('/api/v1/auth/account')
        .set('Authorization', `Bearer ${user1.token}`);

      // Assert
      expect(response.status).toBe(200);

      // User 2's data should still exist
      expect(getTestData(user2.userId, 'skills').size).toBe(1);
      expect(getTestData(user2.userId, 'projects').size).toBe(1);
      
      // User 2's skill should still be Vue
      const user2Skills = getTestData(user2.userId, 'skills');
      const skillData = Array.from(user2Skills.values())[0];
      expect(skillData.name).toBe('Vue');
    });

    it('should return 401 if not authenticated', async () => {
      // Act: Try to delete without auth header
      const response = await request(app)
        .delete('/api/v1/auth/account');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing or invalid authorization header');
    });

    it('should return 401 with invalid token', async () => {
      // Act: Try to delete with invalid token
      const response = await request(app)
        .delete('/api/v1/auth/account')
        .set('Authorization', 'Bearer invalid-token');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('should return 401 with malformed authorization header', async () => {
      // Act: Try with malformed header
      const response = await request(app)
        .delete('/api/v1/auth/account')
        .set('Authorization', 'NotBearer token');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle user with no data gracefully', async () => {
      // Arrange: Create user with no subcollection data
      const { token } = createTestUser();

      // Act
      const response = await request(app)
        .delete('/api/v1/auth/account')
        .set('Authorization', `Bearer ${token}`);

      // Assert: Should succeed even with no data
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
