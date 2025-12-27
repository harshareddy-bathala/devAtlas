/**
 * Goals Database Operations
 * 
 * Handles CRUD operations for user goals and milestones
 */

const { getDb } = require('../firebase');
const { NotFoundError } = require('../errors');

/**
 * Get all goals for a user
 */
async function getGoals(userId) {
  const db = getDb();
  const goalsRef = db.collection('users').doc(userId).collection('goals');
  const snapshot = await goalsRef.orderBy('createdAt', 'desc').get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Get a specific goal
 */
async function getGoal(userId, goalId) {
  const db = getDb();
  const goalRef = db.collection('users').doc(userId).collection('goals').doc(goalId);
  const doc = await goalRef.get();
  
  if (!doc.exists) {
    throw new NotFoundError('Goal not found');
  }
  
  return { id: doc.id, ...doc.data() };
}

/**
 * Create a new goal
 */
async function createGoal(userId, goalData) {
  const db = getDb();
  const goalsRef = db.collection('users').doc(userId).collection('goals');
  
  const goal = {
    ...goalData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const docRef = await goalsRef.add(goal);
  return { id: docRef.id, ...goal };
}

/**
 * Update a goal
 */
async function updateGoal(userId, goalId, goalData) {
  const db = getDb();
  const goalRef = db.collection('users').doc(userId).collection('goals').doc(goalId);
  
  const doc = await goalRef.get();
  if (!doc.exists) {
    throw new NotFoundError('Goal not found');
  }
  
  const updatedGoal = {
    ...goalData,
    updatedAt: new Date().toISOString()
  };
  
  await goalRef.update(updatedGoal);
  return { id: goalId, ...doc.data(), ...updatedGoal };
}

/**
 * Delete a goal
 */
async function deleteGoal(userId, goalId) {
  const db = getDb();
  const goalRef = db.collection('users').doc(userId).collection('goals').doc(goalId);
  
  const doc = await goalRef.get();
  if (!doc.exists) {
    throw new NotFoundError('Goal not found');
  }
  
  await goalRef.delete();
  return { success: true };
}

/**
 * Update milestone completion status
 */
async function updateMilestone(userId, goalId, milestoneId, completed) {
  const db = getDb();
  const goalRef = db.collection('users').doc(userId).collection('goals').doc(goalId);
  
  const doc = await goalRef.get();
  if (!doc.exists) {
    throw new NotFoundError('Goal not found');
  }
  
  const goal = doc.data();
  const milestones = goal.milestones || [];
  const milestoneIndex = milestones.findIndex(m => m.id === milestoneId);
  
  if (milestoneIndex === -1) {
    throw new NotFoundError('Milestone not found');
  }
  
  milestones[milestoneIndex] = {
    ...milestones[milestoneIndex],
    completed,
    completedAt: completed ? new Date().toISOString() : null
  };
  
  await goalRef.update({
    milestones,
    updatedAt: new Date().toISOString()
  });
  
  return { id: goalId, ...goal, milestones };
}

module.exports = {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  updateMilestone
};
