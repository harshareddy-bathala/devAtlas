/**
 * Resources Database Operations
 */

const { admin } = require('../firebase');
const { getUserCollection, docToData, safeQuery, sortItems, paginateArray } = require('./utils');
const { logActivity } = require('./activities');

/**
 * Get all resources for a user with related skill/project names
 */
async function getAllResources(userId) {
  return safeQuery(async () => {
    const snapshot = await getUserCollection(userId, 'resources').get();
    
    const resources = snapshot.docs.map(docToData).sort((a, b) => 
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    // Collect all unique skill and project IDs
    const skillIds = [...new Set(resources.filter(r => r.skillId).map(r => r.skillId))];
    const projectIds = [...new Set(resources.filter(r => r.projectId).map(r => r.projectId))];

    // Batch fetch skills and projects in parallel
    const [skillsMap, projectsMap] = await Promise.all([
      fetchNameMap(userId, 'skills', skillIds),
      fetchNameMap(userId, 'projects', projectIds)
    ]);

    return resources.map(r => ({
      ...r,
      skill_name: r.skillId ? skillsMap[r.skillId] : null,
      project_name: r.projectId ? projectsMap[r.projectId] : null
    }));
  }, 'Failed to load resources');
}

/**
 * Get paginated resources for a user
 */
async function getPaginatedResources(userId, { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
  return safeQuery(async () => {
    const snapshot = await getUserCollection(userId, 'resources').get();
    let items = snapshot.docs.map(docToData);
    
    // Sort items
    items = sortItems(items, { sortBy, sortOrder });
    
    // Paginate first to reduce lookups
    const result = paginateArray(items, { page, limit });
    
    // Collect skill and project IDs for the paginated items only
    const skillIds = [...new Set(result.items.filter(r => r.skillId).map(r => r.skillId))];
    const projectIds = [...new Set(result.items.filter(r => r.projectId).map(r => r.projectId))];

    // Batch fetch skills and projects in parallel
    const [skillsMap, projectsMap] = await Promise.all([
      fetchNameMap(userId, 'skills', skillIds),
      fetchNameMap(userId, 'projects', projectIds)
    ]);

    // Attach relation names
    result.items = result.items.map(r => ({
      ...r,
      skill_name: r.skillId ? skillsMap[r.skillId] : null,
      project_name: r.projectId ? projectsMap[r.projectId] : null
    }));
    
    return result;
  }, 'Failed to load resources');
}

/**
 * Helper to fetch name map for a collection
 */
async function fetchNameMap(userId, collection, ids) {
  const map = {};
  if (!ids || ids.length === 0) return map;
  
  const collectionRef = getUserCollection(userId, collection);
  const promises = ids.slice(0, 30).map(async (id) => {
    try {
      const doc = await collectionRef.doc(id).get();
      if (doc.exists) {
        map[id] = doc.data().name;
      }
    } catch (e) {
      // Ignore errors for individual lookups
    }
  });
  
  await Promise.all(promises);
  return map;
}

/**
 * Create a new resource
 */
async function createResource(userId, { title, url, type, skillId, projectId, notes }) {
  const resource = {
    title,
    url,
    type: type || 'article',
    skillId: skillId || null,
    projectId: projectId || null,
    notes: notes || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await getUserCollection(userId, 'resources').add(resource);
  await logActivity(userId, 'reading', `Saved resource: ${title}`);

  return { id: docRef.id, ...resource };
}

/**
 * Update an existing resource
 */
async function updateResource(userId, resourceId, data) {
  const resourceRef = getUserCollection(userId, 'resources').doc(resourceId);
  const resourceDoc = await resourceRef.get();

  if (!resourceDoc.exists) {
    return null;
  }

  const updateData = {
    title: data.title,
    url: data.url,
    type: data.type,
    skillId: data.skillId || null,
    projectId: data.projectId || null,
    notes: data.notes || ''
  };

  await resourceRef.update(updateData);
  return { id: resourceId, ...resourceDoc.data(), ...updateData };
}

/**
 * Delete a resource
 */
async function deleteResource(userId, resourceId) {
  const resourceRef = getUserCollection(userId, 'resources').doc(resourceId);
  const resourceDoc = await resourceRef.get();

  if (!resourceDoc.exists) {
    return false;
  }

  await resourceRef.delete();
  return true;
}

module.exports = {
  getAllResources,
  getPaginatedResources,
  createResource,
  updateResource,
  deleteResource
};
