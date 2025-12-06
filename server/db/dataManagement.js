/**
 * Data Management Operations
 * 
 * Handles bulk data operations like clearing user data.
 */

const { getDb } = require('../firebase');

/**
 * Clear all data for a user using a transaction-like approach
 * Uses batched writes for atomicity within each collection
 */
async function clearAllData(userId) {
  const db = getDb();
  const userRef = db.collection('users').doc(userId);
  const collections = ['skills', 'projects', 'resources', 'activitySummary'];
  const counts = {};
  const errors = [];

  for (const collection of collections) {
    try {
      const snapshot = await userRef.collection(collection).get();
      counts[collection] = snapshot.size;
      
      if (snapshot.size === 0) continue;

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
    } catch (error) {
      console.error(`Failed to clear ${collection}:`, error.message);
      errors.push({ collection, error: error.message });
    }
  }

  // Also delete the user profile document itself
  try {
    const userDocSnapshot = await userRef.get();
    if (userDocSnapshot.exists) {
      await userRef.delete();
      counts.profile = 1;
    }
  } catch (error) {
    console.error('Failed to delete user profile:', error.message);
    errors.push({ collection: 'profile', error: error.message });
  }

  // If there were errors, include them in the response
  if (errors.length > 0) {
    return { 
      cleared: counts, 
      errors,
      partialSuccess: true,
      message: 'Some data could not be deleted. Please try again.'
    };
  }

  return { cleared: counts };
}

module.exports = {
  clearAllData
};
