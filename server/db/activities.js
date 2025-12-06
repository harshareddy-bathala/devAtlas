/**
 * Activities Database Operations
 * 
 * Uses daily activity summaries for efficient storage and querying.
 */

const { getDb, admin } = require('../firebase');
const { getUserCollection, docToData, safeQuery, getTodayStr } = require('./utils');

/**
 * Log an activity (updates daily summary)
 * Instead of creating individual activity documents, we update a daily summary
 */
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

/**
 * Get all activities (daily summaries) for a user
 */
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

/**
 * Create an activity (redirects to logActivity for efficiency)
 */
async function createActivity(userId, { date, type, description }) {
  await logActivity(userId, type, description);
  return { date, type, description };
}

/**
 * Get heatmap data for the last year
 */
async function getHeatmapData(userId) {
  return safeQuery(async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    // Use Firestore query filter instead of client-side filtering
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

/**
 * Get cached heatmap data with tiered TTLs
 * Historical data (>30 days old) rarely changes, so can be cached longer
 */
async function getHeatmapDataCached(userId, getCached) {
  const today = getTodayStr();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  // Get historical data (cached for 24 hours)
  const historicalData = await getCached(
    `heatmap:historical:${userId}`,
    async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

      const snapshot = await getUserCollection(userId, 'activitySummary')
        .where('date', '>=', oneYearAgoStr)
        .where('date', '<', thirtyDaysAgoStr)
        .orderBy('date', 'asc')
        .get();

      return snapshot.docs.map(doc => ({ 
        date: doc.data().date, 
        count: doc.data().count 
      }));
    },
    86400 // 24 hours
  );

  // Get recent data (cached for 5 minutes)
  const recentData = await getCached(
    `heatmap:recent:${userId}`,
    async () => {
      const snapshot = await getUserCollection(userId, 'activitySummary')
        .where('date', '>=', thirtyDaysAgoStr)
        .orderBy('date', 'asc')
        .get();

      return snapshot.docs.map(doc => ({ 
        date: doc.data().date, 
        count: doc.data().count 
      }));
    },
    300 // 5 minutes
  );

  return [...historicalData, ...recentData];
}

module.exports = {
  logActivity,
  getAllActivities,
  createActivity,
  getHeatmapData,
  getHeatmapDataCached
};
