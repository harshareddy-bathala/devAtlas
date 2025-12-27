/**
 * Skills Database Operations
 */

const { admin } = require('../firebase');
const { getUserCollection, docToData, safeQuery, sortItems, paginateArray } = require('./utils');
const { logActivity } = require('./activities');

const SKILL_STATUS_ORDER = { mastered: 0, learning: 1, want_to_learn: 2 };

/**
 * Get all skills for a user
 */
async function getAllSkills(userId) {
  return safeQuery(async () => {
    const snapshot = await getUserCollection(userId, 'skills').get();
    
    return snapshot.docs.map(docToData).sort((a, b) => {
      const statusDiff = (SKILL_STATUS_ORDER[a.status] || 3) - (SKILL_STATUS_ORDER[b.status] || 3);
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, 'Failed to load skills');
}

/**
 * Get paginated skills for a user
 */
async function getPaginatedSkills(userId, { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
  return safeQuery(async () => {
    const snapshot = await getUserCollection(userId, 'skills').get();
    let items = snapshot.docs.map(docToData);
    
    // Sort items
    items = sortItems(items, { sortBy, sortOrder, statusOrder: SKILL_STATUS_ORDER });
    
    // Paginate
    return paginateArray(items, { page, limit });
  }, 'Failed to load skills');
}

/**
 * Create a new skill
 */
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

/**
 * Update an existing skill
 */
async function updateSkill(userId, skillId, data) {
  const skillRef = getUserCollection(userId, 'skills').doc(skillId);
  const skillDoc = await skillRef.get();

  if (!skillDoc.exists) {
    return null;
  }

  const oldData = skillDoc.data();
  const oldStatus = oldData.status;
  const newLinkedProjects = data.linkedProjects || oldData.linkedProjects || [];
  const updateData = {
    name: data.name,
    category: data.category,
    status: data.status,
    icon: data.icon,
    linkedProjects: newLinkedProjects,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await skillRef.update(updateData);

  // Auto-update tech stack of linked projects with this skill name
  if (newLinkedProjects.length > 0 && data.name) {
    const projectsRef = getUserCollection(userId, 'projects');
    const batch = admin.firestore().batch();
    let batchCount = 0;
    
    for (const projectId of newLinkedProjects) {
      try {
        const projectDoc = await projectsRef.doc(projectId).get();
        if (projectDoc.exists) {
          const projectData = projectDoc.data();
          const techStack = projectData.tech_stack || '';
          const skillName = data.name.toLowerCase();
          
          // Check if skill is already in tech stack (case insensitive)
          const techStackLower = techStack.toLowerCase();
          if (!techStackLower.includes(skillName)) {
            // Add skill to tech stack
            const newTechStack = techStack 
              ? `${techStack}, ${data.name}` 
              : data.name;
            batch.update(projectsRef.doc(projectId), { 
              tech_stack: newTechStack,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            batchCount++;
          }
        }
      } catch (err) {
        console.warn(`Failed to update tech stack for project ${projectId}:`, err.message);
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
  }

  // Only log significant status changes (to "mastered")
  if (oldStatus !== data.status && data.status === 'mastered') {
    await logActivity(userId, 'milestone', `Mastered: ${data.name}`);
  }

  return { id: skillId, ...oldData, ...updateData };
}

/**
 * Delete a skill
 */
async function deleteSkill(userId, skillId) {
  const skillRef = getUserCollection(userId, 'skills').doc(skillId);
  const skillDoc = await skillRef.get();

  if (!skillDoc.exists) {
    return false;
  }

  await skillRef.delete();
  return true;
}

/**
 * Verify that skill IDs exist (for referential integrity)
 */
async function verifySkillIds(userId, skillIds) {
  if (!skillIds || skillIds.length === 0) return [];
  
  const validIds = [];
  const skillsRef = getUserCollection(userId, 'skills');
  
  for (const skillId of skillIds.slice(0, 50)) { // Limit to 50 for performance
    try {
      const doc = await skillsRef.doc(skillId).get();
      if (doc.exists) {
        validIds.push(skillId);
      }
    } catch (e) {
      // Skip invalid IDs
    }
  }
  
  return validIds;
}

/**
 * Batch update multiple skills in a single transaction
 * This significantly reduces Firestore write operations
 * 
 * @param {string} userId - User ID
 * @param {Array<{id: string, data: Object}>} updates - Array of updates
 * @returns {Object} - Result with updated items and any errors
 */
async function batchUpdateSkills(userId, updates) {
  if (!updates || updates.length === 0) {
    return { updated: [], errors: [] };
  }

  const { getDb } = require('../firebase');
  const db = getDb();
  const batch = db.batch();
  const skillsRef = getUserCollection(userId, 'skills');
  
  const updated = [];
  const errors = [];
  const milestonesToLog = [];

  // First, verify all documents exist and prepare batch
  for (const { id, data } of updates.slice(0, 50)) { // Limit to 50
    try {
      const skillRef = skillsRef.doc(id);
      const skillDoc = await skillRef.get();
      
      if (!skillDoc.exists) {
        errors.push({ id, error: 'Skill not found' });
        continue;
      }

      const oldData = skillDoc.data();
      const updateData = {
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      batch.update(skillRef, updateData);
      updated.push({ id, ...oldData, ...updateData });

      // Track milestone achievements
      if (oldData.status !== data.status && data.status === 'mastered') {
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
      await logActivity(userId, 'milestone', `Mastered: ${milestone.name}`);
    }
  }

  return { updated, errors };
}

module.exports = {
  getAllSkills,
  getPaginatedSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  verifySkillIds,
  batchUpdateSkills,
  SKILL_STATUS_ORDER
};
