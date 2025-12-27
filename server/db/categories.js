/**
 * Custom Categories Database Operations
 * 
 * Handles user-defined skill categories
 */

const { getDb } = require('../firebase');
const { NotFoundError } = require('../errors');

/**
 * Get all custom categories for a user
 */
async function getCategories(userId) {
  const db = getDb();
  const catsRef = db.collection('users').doc(userId).collection('customCategories');
  const snapshot = await catsRef.orderBy('order', 'asc').get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Get a specific category
 */
async function getCategory(userId, categoryId) {
  const db = getDb();
  const catRef = db.collection('users').doc(userId).collection('customCategories').doc(categoryId);
  const doc = await catRef.get();
  
  if (!doc.exists) {
    throw new NotFoundError('Category not found');
  }
  
  return { id: doc.id, ...doc.data() };
}

/**
 * Create a new category
 */
async function createCategory(userId, categoryData) {
  const db = getDb();
  const catsRef = db.collection('users').doc(userId).collection('customCategories');
  
  // Get the highest order number
  const snapshot = await catsRef.orderBy('order', 'desc').limit(1).get();
  const maxOrder = snapshot.empty ? 0 : (snapshot.docs[0].data().order || 0);
  
  const category = {
    ...categoryData,
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const docRef = await catsRef.add(category);
  return { id: docRef.id, ...category };
}

/**
 * Update a category
 */
async function updateCategory(userId, categoryId, categoryData) {
  const db = getDb();
  const catRef = db.collection('users').doc(userId).collection('customCategories').doc(categoryId);
  
  const doc = await catRef.get();
  if (!doc.exists) {
    throw new NotFoundError('Category not found');
  }
  
  const updatedCategory = {
    ...categoryData,
    updatedAt: new Date().toISOString()
  };
  
  await catRef.update(updatedCategory);
  return { id: categoryId, ...doc.data(), ...updatedCategory };
}

/**
 * Delete a category
 */
async function deleteCategory(userId, categoryId) {
  const db = getDb();
  const catRef = db.collection('users').doc(userId).collection('customCategories').doc(categoryId);
  
  const doc = await catRef.get();
  if (!doc.exists) {
    throw new NotFoundError('Category not found');
  }
  
  await catRef.delete();
  return { success: true };
}

/**
 * Reorder categories
 */
async function reorderCategories(userId, categoryIds) {
  const db = getDb();
  const batch = db.batch();
  
  categoryIds.forEach((categoryId, index) => {
    const catRef = db.collection('users').doc(userId).collection('customCategories').doc(categoryId);
    batch.update(catRef, { order: index, updatedAt: new Date().toISOString() });
  });
  
  await batch.commit();
  return { success: true };
}

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
};
