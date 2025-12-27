/**
 * Skill Dependencies Database Operations
 * 
 * Handles prerequisite relationships between skills
 */

const { getDb } = require('../firebase');
const { NotFoundError } = require('../errors');

/**
 * Get all dependencies for a user's skills
 */
async function getDependencies(userId) {
  const db = getDb();
  const depsRef = db.collection('users').doc(userId).collection('skillDependencies');
  const snapshot = await depsRef.get();
  
  // Return as a map: { skillId: [prerequisiteSkillIds] }
  const dependencies = {};
  snapshot.docs.forEach(doc => {
    dependencies[doc.id] = doc.data().prerequisites || [];
  });
  
  return dependencies;
}

/**
 * Get dependencies for a specific skill
 */
async function getSkillDependencies(userId, skillId) {
  const db = getDb();
  const depRef = db.collection('users').doc(userId).collection('skillDependencies').doc(skillId);
  const doc = await depRef.get();
  
  if (!doc.exists) {
    return { skillId, prerequisites: [] };
  }
  
  return { skillId, prerequisites: doc.data().prerequisites || [] };
}

/**
 * Set dependencies for a skill
 */
async function setSkillDependencies(userId, skillId, prerequisites) {
  const db = getDb();
  const depRef = db.collection('users').doc(userId).collection('skillDependencies').doc(skillId);
  
  await depRef.set({
    prerequisites,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  
  return { skillId, prerequisites };
}

/**
 * Add a prerequisite to a skill
 */
async function addPrerequisite(userId, skillId, prerequisiteId) {
  const db = getDb();
  const depRef = db.collection('users').doc(userId).collection('skillDependencies').doc(skillId);
  
  const doc = await depRef.get();
  const current = doc.exists ? doc.data().prerequisites || [] : [];
  
  if (current.includes(prerequisiteId)) {
    return { skillId, prerequisites: current };
  }
  
  // Check for circular dependency
  const prereqDep = await getSkillDependencies(userId, prerequisiteId);
  if (prereqDep.prerequisites.includes(skillId)) {
    throw new Error('Circular dependency detected');
  }
  
  const updated = [...current, prerequisiteId];
  
  await depRef.set({
    prerequisites: updated,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  
  return { skillId, prerequisites: updated };
}

/**
 * Remove a prerequisite from a skill
 */
async function removePrerequisite(userId, skillId, prerequisiteId) {
  const db = getDb();
  const depRef = db.collection('users').doc(userId).collection('skillDependencies').doc(skillId);
  
  const doc = await depRef.get();
  if (!doc.exists) {
    return { skillId, prerequisites: [] };
  }
  
  const current = doc.data().prerequisites || [];
  const updated = current.filter(id => id !== prerequisiteId);
  
  await depRef.update({
    prerequisites: updated,
    updatedAt: new Date().toISOString()
  });
  
  return { skillId, prerequisites: updated };
}

/**
 * Get skills that depend on a given skill (reverse lookup)
 */
async function getDependents(userId, skillId) {
  const db = getDb();
  const depsRef = db.collection('users').doc(userId).collection('skillDependencies');
  const snapshot = await depsRef.where('prerequisites', 'array-contains', skillId).get();
  
  return snapshot.docs.map(doc => doc.id);
}

module.exports = {
  getDependencies,
  getSkillDependencies,
  setSkillDependencies,
  addPrerequisite,
  removePrerequisite,
  getDependents
};
