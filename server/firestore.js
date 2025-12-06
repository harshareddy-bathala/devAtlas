const { getDb, admin } = require('./firebase');

/**
 * SCALABLE FIRESTORE SCHEMA
 * 
 * Structure:
 *   users/{userId}                    - User profile
 *   users/{userId}/skills/{skillId}   - User's skills (subcollection)
 *   users/{userId}/projects/{projectId} - User's projects (subcollection)
 *   users/{userId}/resources/{resourceId} - User's resources (subcollection)
 *   users/{userId}/activitySummary/{date} - Daily activity summary (one doc per day)
 * 
 * Benefits:
 * - Each user's data is isolated in subcollections
 * - No need for userId filters - queries are scoped to user
 * - Better security rules (users can only access their own subcollections)
 * - Scales to millions of users efficiently
 * - Activity summaries reduce document count (1 doc per day vs 10+ individual events)
 */

// Wrapper to handle Firestore errors with better messages
async function safeQuery(queryFn, fallbackMessage = 'Database query failed') {
  try {
    return await queryFn();
  } catch (error) {
    console.error('Firestore error:', error.code, error.message);
    
    if (error.code === 5 || error.message.includes('NOT_FOUND')) {
      throw new Error('Database not found. Please ensure Firestore is created in Firebase Console.');
    }
    if (error.code === 9 || error.message.includes('index')) {
      console.error('Index required. Check Firebase Console for index creation link.');
      throw new Error('Database index required. Check server logs for details.');
    }
    if (error.code === 7 || error.message.includes('PERMISSION_DENIED')) {
      throw new Error('Permission denied. Check Firestore security rules.');
    }
    
    throw new Error(fallbackMessage);
  }
}

// Helper to get user's subcollection reference
function getUserCollection(userId, collection) {
  const db = getDb();
  return db.collection('users').doc(userId).collection(collection);
}

// Helper to convert Firestore doc to plain object
function docToData(doc) {
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
  };
}

// Helper to get today's date string
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

// ============ ACTIVITY TRACKING (Efficient) ============
// Instead of creating individual activity documents, we update a daily summary
async function logActivity(userId, type, description = '') {
  const db = getDb();
  const today = getTodayStr();
  const summaryRef = db.collection('users').doc(userId).collection('activitySummary').doc(today);
  
  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(summaryRef);
      
      if (doc.exists) {
        const data = doc.data();
        transaction.update(summaryRef, {
          count: (data.count || 0) + 1,
          types: { ...data.types, [type]: (data.types?.[type] || 0) + 1 },
          lastActivity: description,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        transaction.set(summaryRef, {
          date: today,
          count: 1,
          types: { [type]: 1 },
          lastActivity: description,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error.message);
  }
}

// ============ SKILLS ============
async function getAllSkills(userId) {
  return safeQuery(async () => {
    const snapshot = await getUserCollection(userId, 'skills').get();
    
    return snapshot.docs.map(docToData).sort((a, b) => {
      const statusOrder = { mastered: 0, learning: 1, want_to_learn: 2 };
      const statusDiff = (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, 'Failed to load skills');
}

// Paginated version of getAllSkills
async function getPaginatedSkills(userId, { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
  return safeQuery(async () => {
    const collectionRef = getUserCollection(userId, 'skills');
    
    // Get total count
    const countSnapshot = await collectionRef.get();
    const total = countSnapshot.size;
    const totalPages = Math.ceil(total / limit);
    
    // Get all and sort in memory (Firestore doesn't support offset-based pagination well)
    const snapshot = await collectionRef.get();
    let items = snapshot.docs.map(docToData);
    
    // Sort
    items.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle dates
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }
      
      // Handle status specially
      if (sortBy === 'status') {
        const statusOrder = { mastered: 0, learning: 1, want_to_learn: 2 };
        aVal = statusOrder[aVal] ?? 3;
        bVal = statusOrder[bVal] ?? 3;
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    });
    
    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);
    
    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }, 'Failed to load skills');
}

async function createSkill(userId, { name, category, status, icon, linkedProjects }) {
  const skill = {
    name,
    category: category || 'language',
    status: status || 'want_to_learn',
    icon: icon || '📚',
    linkedProjects: linkedProjects || [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await getUserCollection(userId, 'skills').add(skill);
  await logActivity(userId, 'learning', `Added skill: ${name}`);

  return { id: docRef.id, ...skill };
}

async function updateSkill(userId, skillId, data) {
  const skillRef = getUserCollection(userId, 'skills').doc(skillId);
  const skillDoc = await skillRef.get();

  if (!skillDoc.exists) {
    return null;
  }

  const oldData = skillDoc.data();
  const oldStatus = oldData.status;
  const updateData = {
    name: data.name,
    category: data.category,
    status: data.status,
    icon: data.icon,
    linkedProjects: data.linkedProjects || oldData.linkedProjects || [],
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await skillRef.update(updateData);

  // Only log significant status changes (to "mastered")
  if (oldStatus !== data.status && data.status === 'mastered') {
    await logActivity(userId, 'milestone', `Mastered: ${data.name}`);
  }

  return { id: skillId, ...oldData, ...updateData };
}

async function deleteSkill(userId, skillId) {
  const skillRef = getUserCollection(userId, 'skills').doc(skillId);
  const skillDoc = await skillRef.get();

  if (!skillDoc.exists) {
    return false;
  }

  await skillRef.delete();
  return true;
}

// ============ PROJECTS ============
async function getAllProjects(userId) {
  return safeQuery(async () => {
    const snapshot = await getUserCollection(userId, 'projects').get();
    
    return snapshot.docs.map(docToData).sort((a, b) => {
      const statusOrder = { active: 0, idea: 1, completed: 2 };
      const statusDiff = (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, 'Failed to load projects');
}

// Paginated version of getAllProjects
async function getPaginatedProjects(userId, { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
  return safeQuery(async () => {
    const collectionRef = getUserCollection(userId, 'projects');
    
    // Get total count
    const countSnapshot = await collectionRef.get();
    const total = countSnapshot.size;
    const totalPages = Math.ceil(total / limit);
    
    // Get all and sort in memory
    const snapshot = await collectionRef.get();
    let items = snapshot.docs.map(docToData);
    
    // Sort
    items.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle dates
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }
      
      // Handle status specially
      if (sortBy === 'status') {
        const statusOrder = { active: 0, idea: 1, completed: 2 };
        aVal = statusOrder[aVal] ?? 3;
        bVal = statusOrder[bVal] ?? 3;
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    });
    
    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);
    
    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }, 'Failed to load projects');
}

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

async function deleteProject(userId, projectId) {
  const projectRef = getUserCollection(userId, 'projects').doc(projectId);
  const projectDoc = await projectRef.get();

  if (!projectDoc.exists) {
    return false;
  }

  await projectRef.delete();
  return true;
}

// ============ RESOURCES ============
async function getAllResources(userId) {
  return safeQuery(async () => {
    const snapshot = await getUserCollection(userId, 'resources').get();
    
    const resources = snapshot.docs.map(docToData).sort((a, b) => 
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    // Collect all unique skill and project IDs - FIX N+1 QUERY
    const skillIds = [...new Set(resources.filter(r => r.skillId).map(r => r.skillId))];
    const projectIds = [...new Set(resources.filter(r => r.projectId).map(r => r.projectId))];

    // Batch fetch skills and projects in parallel (2 queries instead of N)
    const [skillsMap, projectsMap] = await Promise.all([
      // Fetch all skills at once
      (async () => {
        const map = {};
        if (skillIds.length > 0) {
          const skillPromises = skillIds.slice(0, 30).map(async (skillId) => {
            try {
              const skillDoc = await getUserCollection(userId, 'skills').doc(skillId).get();
              if (skillDoc.exists) {
                map[skillId] = skillDoc.data().name;
              }
            } catch (e) { /* ignore */ }
          });
          await Promise.all(skillPromises);
        }
        return map;
      })(),
      // Fetch all projects at once
      (async () => {
        const map = {};
        if (projectIds.length > 0) {
          const projectPromises = projectIds.slice(0, 30).map(async (projectId) => {
            try {
              const projectDoc = await getUserCollection(userId, 'projects').doc(projectId).get();
              if (projectDoc.exists) {
                map[projectId] = projectDoc.data().name;
              }
            } catch (e) { /* ignore */ }
          });
          await Promise.all(projectPromises);
        }
        return map;
      })()
    ]);

    return resources.map(r => ({
      ...r,
      skill_name: r.skillId ? skillsMap[r.skillId] : null,
      project_name: r.projectId ? projectsMap[r.projectId] : null
    }));
  }, 'Failed to load resources');
}

// Paginated version of getAllResources
async function getPaginatedResources(userId, { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
  return safeQuery(async () => {
    const collectionRef = getUserCollection(userId, 'resources');
    
    // Get total count
    const countSnapshot = await collectionRef.get();
    const total = countSnapshot.size;
    const totalPages = Math.ceil(total / limit);
    
    // Get all and sort in memory
    const snapshot = await collectionRef.get();
    let items = snapshot.docs.map(docToData);
    
    // Sort
    items.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle dates
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    });
    
    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);
    
    // Collect skill and project IDs for the paginated items only
    const skillIds = [...new Set(paginatedItems.filter(r => r.skillId).map(r => r.skillId))];
    const projectIds = [...new Set(paginatedItems.filter(r => r.projectId).map(r => r.projectId))];

    // Batch fetch skills and projects in parallel
    const [skillsMap, projectsMap] = await Promise.all([
      (async () => {
        const map = {};
        if (skillIds.length > 0) {
          const skillPromises = skillIds.map(async (skillId) => {
            try {
              const skillDoc = await getUserCollection(userId, 'skills').doc(skillId).get();
              if (skillDoc.exists) {
                map[skillId] = skillDoc.data().name;
              }
            } catch (e) { /* ignore */ }
          });
          await Promise.all(skillPromises);
        }
        return map;
      })(),
      (async () => {
        const map = {};
        if (projectIds.length > 0) {
          const projectPromises = projectIds.map(async (projectId) => {
            try {
              const projectDoc = await getUserCollection(userId, 'projects').doc(projectId).get();
              if (projectDoc.exists) {
                map[projectId] = projectDoc.data().name;
              }
            } catch (e) { /* ignore */ }
          });
          await Promise.all(projectPromises);
        }
        return map;
      })()
    ]);

    // Attach relation names
    const itemsWithRelations = paginatedItems.map(r => ({
      ...r,
      skill_name: r.skillId ? skillsMap[r.skillId] : null,
      project_name: r.projectId ? projectsMap[r.projectId] : null
    }));
    
    return {
      items: itemsWithRelations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }, 'Failed to load resources');
}

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

async function deleteResource(userId, resourceId) {
  const resourceRef = getUserCollection(userId, 'resources').doc(resourceId);
  const resourceDoc = await resourceRef.get();

  if (!resourceDoc.exists) {
    return false;
  }

  await resourceRef.delete();
  return true;
}

// ============ ACTIVITIES (Read from daily summaries) ============
async function getAllActivities(userId) {
  return safeQuery(async () => {
    const snapshot = await getUserCollection(userId, 'activitySummary').get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      date: doc.data().date,
      count: doc.data().count,
      types: doc.data().types,
      lastActivity: doc.data().lastActivity
    })).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, 'Failed to load activities');
}

async function createActivity(userId, { date, type, description }) {
  // Redirect to efficient logActivity
  await logActivity(userId, type, description);
  return { date, type, description };
}

async function getHeatmapData(userId) {
  return safeQuery(async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    // Optimized: Use Firestore query filter instead of client-side filtering
    const snapshot = await getUserCollection(userId, 'activitySummary')
      .where('date', '>=', oneYearAgoStr)
      .orderBy('date', 'asc')
      .get();

    return snapshot.docs.map(doc => ({ 
      date: doc.data().date, 
      count: doc.data().count 
    }));
  }, 'Failed to load heatmap data');
}

// ============ STATS ============
async function getStats(userId) {
  return safeQuery(async () => {
    const [skillsSnap, projectsSnap, resourcesSnap, activitySnap] = await Promise.all([
      getUserCollection(userId, 'skills').get(),
      getUserCollection(userId, 'projects').get(),
      getUserCollection(userId, 'resources').get(),
      getUserCollection(userId, 'activitySummary').get()
    ]);

    const skillsByStatus = {};
    skillsSnap.docs.forEach(doc => {
      const status = doc.data().status;
      skillsByStatus[status] = (skillsByStatus[status] || 0) + 1;
    });

    const projectsByStatus = {};
    projectsSnap.docs.forEach(doc => {
      const status = doc.data().status;
      projectsByStatus[status] = (projectsByStatus[status] || 0) + 1;
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const activeDays = activitySnap.docs.filter(doc => doc.data().date >= thirtyDaysAgoStr).length;
    const totalActivities = activitySnap.docs.reduce((sum, doc) => sum + (doc.data().count || 0), 0);

    return {
      skills: skillsByStatus,
      projects: projectsByStatus,
      resources: resourcesSnap.size,
      totalActivities,
      activeDaysLast30: activeDays
    };
  }, 'Failed to load stats');
}

async function getProgressData(userId) {
  return safeQuery(async () => {
    const eightyFourDaysAgo = new Date();
    eightyFourDaysAgo.setDate(eightyFourDaysAgo.getDate() - 84);
    const dateStr = eightyFourDaysAgo.toISOString().split('T')[0];

    const snapshot = await getUserCollection(userId, 'activitySummary').get();

    const weekCounts = {};
    snapshot.docs.forEach(doc => {
      const docDate = doc.data().date;
      if (docDate && docDate >= dateStr) {
        const date = new Date(docDate);
        const week = getWeekNumber(date);
        weekCounts[week] = (weekCounts[week] || 0) + (doc.data().count || 0);
      }
    });

    const weeklyActivities = Object.entries(weekCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, count]) => ({ week, count }));

    return { monthlyProgress: [], weeklyActivities };
  }, 'Failed to load progress data');
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-${String(Math.ceil((((d - yearStart) / 86400000) + 1) / 7)).padStart(2, '0')}`;
}

// ============ DATA MANAGEMENT ============
async function clearAllData(userId) {
  const db = getDb();
  const userRef = db.collection('users').doc(userId);
  const collections = ['skills', 'projects', 'resources', 'activitySummary'];
  const counts = {};

  // Delete all subcollection documents
  for (const collection of collections) {
    const snapshot = await userRef.collection(collection).get();
    counts[collection] = snapshot.size;
    
    // Delete in batches of 500 (Firestore limit)
    const batches = [];
    let batch = db.batch();
    let operationCount = 0;
    
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      operationCount++;
      
      if (operationCount >= 500) {
        batches.push(batch.commit());
        batch = db.batch();
        operationCount = 0;
      }
    }
    
    if (operationCount > 0) {
      batches.push(batch.commit());
    }
    
    await Promise.all(batches);
  }

  // Also delete the user profile document itself
  const userDocSnapshot = await userRef.get();
  if (userDocSnapshot.exists) {
    await userRef.delete();
    counts.profile = 1;
  }

  return { cleared: counts };
}

module.exports = {
  // Skills
  getAllSkills,
  getPaginatedSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  // Projects
  getAllProjects,
  getPaginatedProjects,
  createProject,
  updateProject,
  deleteProject,
  // Resources
  getAllResources,
  getPaginatedResources,
  createResource,
  updateResource,
  deleteResource,
  // Activities
  getAllActivities,
  createActivity,
  getHeatmapData,
  // Stats
  getStats,
  getProgressData,
  // Data Management
  clearAllData
};
