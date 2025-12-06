/**
 * Stats Database Operations
 */

const { getUserCollection, safeQuery, getWeekNumber } = require('./utils');

/**
 * Get aggregated stats for a user
 */
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

/**
 * Get progress data (weekly activity breakdown)
 */
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

module.exports = {
  getStats,
  getProgressData
};
