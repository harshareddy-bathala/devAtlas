/**
 * Projects Database Operations
 */

const { admin } = require('../firebase');
const { getUserCollection, docToData, safeQuery, sortItems, paginateArray } = require('./utils');
const { logActivity } = require('./activities');

const PROJECT_STATUS_ORDER = { active: 0, idea: 1, completed: 2 };

/**
 * Get all projects for a user
 */
async function getAllProjects(userId) {
  return safeQuery(async () => {
    const snapshot = await getUserCollection(userId, 'projects').get();
    
    return snapshot.docs.map(docToData).sort((a, b) => {
      const statusDiff = (PROJECT_STATUS_ORDER[a.status] || 3) - (PROJECT_STATUS_ORDER[b.status] || 3);
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, 'Failed to load projects');
}

/**
 * Get paginated projects for a user
 */
async function getPaginatedProjects(userId, { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
  return safeQuery(async () => {
    const snapshot = await getUserCollection(userId, 'projects').get();
    let items = snapshot.docs.map(docToData);
    
    // Sort items
    items = sortItems(items, { sortBy, sortOrder, statusOrder: PROJECT_STATUS_ORDER });
    
    // Paginate
    return paginateArray(items, { page, limit });
  }, 'Failed to load projects');
}

/**
 * Create a new project
 */
async function createProject(userId, { name, description, status, githubUrl, demoUrl, techStack, linkedSkills }) {
  const project = {
    name,
    description: description || '',
    status: status || 'idea',
    github_url: githubUrl || '',
    demo_url: demoUrl || '',
    tech_stack: techStack || '',
    linkedSkills: linkedSkills || [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await getUserCollection(userId, 'projects').add(project);
  await logActivity(userId, 'project', `Created project: ${name}`);

  return { id: docRef.id, ...project };
}

/**
 * Update an existing project
 */
async function updateProject(userId, projectId, data) {
  const projectRef = getUserCollection(userId, 'projects').doc(projectId);
  const projectDoc = await projectRef.get();

  if (!projectDoc.exists) {
    return null;
  }

  const oldData = projectDoc.data();
  const oldStatus = oldData.status;
  const updateData = {
    name: data.name,
    description: data.description || '',
    status: data.status,
    github_url: data.githubUrl || data.github_url || '',
    demo_url: data.demoUrl || data.demo_url || '',
    tech_stack: data.techStack || data.tech_stack || '',
    linkedSkills: data.linkedSkills || oldData.linkedSkills || [],
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await projectRef.update(updateData);

  // Only log completion milestone
  if (oldStatus !== data.status && data.status === 'completed') {
    await logActivity(userId, 'milestone', `Completed project: ${data.name}`);
  }

  return { id: projectId, ...oldData, ...updateData };
}

/**
 * Delete a project
 */
async function deleteProject(userId, projectId) {
  const projectRef = getUserCollection(userId, 'projects').doc(projectId);
  const projectDoc = await projectRef.get();

  if (!projectDoc.exists) {
    return false;
  }

  await projectRef.delete();
  return true;
}

/**
 * Verify that project IDs exist (for referential integrity)
 */
async function verifyProjectIds(userId, projectIds) {
  if (!projectIds || projectIds.length === 0) return [];
  
  const validIds = [];
  const projectsRef = getUserCollection(userId, 'projects');
  
  for (const projectId of projectIds.slice(0, 50)) { // Limit to 50 for performance
    try {
      const doc = await projectsRef.doc(projectId).get();
      if (doc.exists) {
        validIds.push(projectId);
      }
    } catch (e) {
      // Skip invalid IDs
    }
  }
  
  return validIds;
}

/**
 * Batch update multiple projects in a single transaction
 * This significantly reduces Firestore write operations
 * 
 * @param {string} userId - User ID
 * @param {Array<{id: string, data: Object}>} updates - Array of updates
 * @returns {Object} - Result with updated items and any errors
 */
async function batchUpdateProjects(userId, updates) {
  if (!updates || updates.length === 0) {
    return { updated: [], errors: [] };
  }

  const { getDb } = require('../firebase');
  const db = getDb();
  const batch = db.batch();
  const projectsRef = getUserCollection(userId, 'projects');
  
  const updated = [];
  const errors = [];
  const milestonesToLog = [];

  // First, verify all documents exist and prepare batch
  for (const { id, data } of updates.slice(0, 50)) { // Limit to 50
    try {
      const projectRef = projectsRef.doc(id);
      const projectDoc = await projectRef.get();
      
      if (!projectDoc.exists) {
        errors.push({ id, error: 'Project not found' });
        continue;
      }

      const oldData = projectDoc.data();
      const updateData = {
        ...data,
        // Handle both camelCase and snake_case field names
        github_url: data.githubUrl || data.github_url || oldData.github_url,
        demo_url: data.demoUrl || data.demo_url || oldData.demo_url,
        tech_stack: data.techStack || data.tech_stack || oldData.tech_stack,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Remove undefined values and camelCase versions
      delete updateData.githubUrl;
      delete updateData.demoUrl;
      delete updateData.techStack;
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      batch.update(projectRef, updateData);
      updated.push({ id, ...oldData, ...updateData });

      // Track milestone achievements
      if (oldData.status !== data.status && data.status === 'completed') {
        milestonesToLog.push({ name: data.name || oldData.name });
      }
    } catch (e) {
      errors.push({ id, error: e.message });
    }
  }

  // Commit the batch
  if (updated.length > 0) {
    await batch.commit();

    // Log milestones after successful batch commit
    for (const milestone of milestonesToLog) {
      await logActivity(userId, 'milestone', `Completed project: ${milestone.name}`);
    }
  }

  return { updated, errors };
}

module.exports = {
  getAllProjects,
  getPaginatedProjects,
  createProject,
  updateProject,
  deleteProject,
  verifyProjectIds,
  batchUpdateProjects,
  PROJECT_STATUS_ORDER
};
