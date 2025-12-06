/**
 * Database Utilities
 * 
 * Shared helper functions for database operations.
 */

const { getDb } = require('../firebase');

/**
 * Wrapper to handle Firestore errors with better messages
 */
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

/**
 * Helper to get user's subcollection reference
 */
function getUserCollection(userId, collection) {
  const db = getDb();
  return db.collection('users').doc(userId).collection(collection);
}

/**
 * Helper to convert Firestore doc to plain object
 */
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

/**
 * Helper to get today's date string in YYYY-MM-DD format
 */
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Calculate week number for a given date
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-${String(Math.ceil((((d - yearStart) / 86400000) + 1) / 7)).padStart(2, '0')}`;
}

/**
 * Generic pagination helper
 */
function paginateArray(items, { page = 1, limit = 20 } = {}) {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
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
}

/**
 * Sort helper for various field types
 */
function sortItems(items, { sortBy = 'createdAt', sortOrder = 'desc', statusOrder = null } = {}) {
  return [...items].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    // Handle dates
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      aVal = new Date(aVal || 0).getTime();
      bVal = new Date(bVal || 0).getTime();
    }
    
    // Handle status with custom order
    if (sortBy === 'status' && statusOrder) {
      aVal = statusOrder[aVal] ?? 999;
      bVal = statusOrder[bVal] ?? 999;
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    }
    return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
  });
}

module.exports = {
  safeQuery,
  getUserCollection,
  docToData,
  getTodayStr,
  getWeekNumber,
  paginateArray,
  sortItems
};
