/**
 * Stats Database Operations
 */

const { getUserCollection, safeQuery, getWeekNumber } = require('./utils');

/**
 * Get the date string for 30 days ago
 * @returns {string} Date in YYYY-MM-DD format
 */
function getThirtyDaysAgoStr() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate current streak from activity data
 * @param {Array} activityDates - Array of date strings (YYYY-MM-DD)
 * @returns {number} Current streak count
 */
function calculateStreak(activityDates) {
  if (!activityDates.length) return 0;
  
  // Sort dates in descending order
  const sortedDates = [...activityDates].sort((a, b) => b.localeCompare(a));
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // Streak must start from today or yesterday
  const latestDate = sortedDates[0];
  if (latestDate !== todayStr && latestDate !== yesterdayStr) {
    return 0;
  }
  
  let streak = 1;
  let currentDate = new Date(latestDate);
  
  for (let i = 1; i < sortedDates.length; i++) {
    const expectedPrevDate = new Date(currentDate);
    expectedPrevDate.setDate(expectedPrevDate.getDate() - 1);
    const expectedPrevStr = expectedPrevDate.toISOString().split('T')[0];
    
    if (sortedDates[i] === expectedPrevStr) {
      streak++;
      currentDate = expectedPrevDate;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Get aggregated stats for a user with optimized queries
 * Uses select() to minimize data transfer by only fetching required fields
 */
async function getStats(userId) {
  return safeQuery(async () => {
    const thirtyDaysAgoStr = getThirtyDaysAgoStr();
    
    // Use select() to only fetch the fields we need - reduces data transfer
    const [skillsSnap, projectsSnap, resourcesSnap, activitySnap] = await Promise.all([
      getUserCollection(userId, 'skills').select('status').get(),
      getUserCollection(userId, 'projects').select('status').get(),
      getUserCollection(userId, 'resources').select().get(), // Just need count
      getUserCollection(userId, 'activitySummary')
        .where('date', '>=', thirtyDaysAgoStr)
        .select('date', 'count')
        .get()
    ]);

    // Count skills by status
    const skillsByStatus = {};
    skillsSnap.docs.forEach(doc => {
      const status = doc.data().status;
      if (status) {
        skillsByStatus[status] = (skillsByStatus[status] || 0) + 1;
      }
    });

    // Count projects by status
    const projectsByStatus = {};
    projectsSnap.docs.forEach(doc => {
      const status = doc.data().status;
      if (status) {
        projectsByStatus[status] = (projectsByStatus[status] || 0) + 1;
      }
    });

    // Calculate activity metrics from filtered results (already filtered by date in query)
    const activityDates = activitySnap.docs.map(doc => doc.data().date).filter(Boolean);
    const activeDays = activitySnap.docs.length;
    const totalActivities = activitySnap.docs.reduce(
      (sum, doc) => sum + (doc.data().count || 0), 
      0
    );
    const currentStreak = calculateStreak(activityDates);

    return {
      skills: skillsByStatus,
      projects: projectsByStatus,
      resources: resourcesSnap.size,
      totalActivities,
      activeDaysLast30: activeDays,
      currentStreak
    };
  }, 'Failed to load stats');
}

/**
 * Get progress data (weekly activity breakdown + skill/project completion progress)
 * Uses optimized queries with select() and where() clauses
 */
async function getProgressData(userId) {
  return safeQuery(async () => {
    const eightyFourDaysAgo = new Date();
    eightyFourDaysAgo.setDate(eightyFourDaysAgo.getDate() - 84);
    const dateStr = eightyFourDaysAgo.toISOString().split('T')[0];

    // Fetch activity data
    const activitySnap = await getUserCollection(userId, 'activitySummary')
      .where('date', '>=', dateStr)
      .select('date', 'count')
      .get();

    // Fetch skills to calculate progress based on mastery
    const skillsSnap = await getUserCollection(userId, 'skills')
      .select('status', 'updatedAt')
      .get();

    // Fetch projects to calculate progress based on completion
    const projectsSnap = await getUserCollection(userId, 'projects')
      .select('status', 'completedAt', 'updatedAt')
      .get();

    const weekCounts = {};
    const weekProgress = {};
    
    // Count activities per week
    activitySnap.docs.forEach(doc => {
      const docDate = doc.data().date;
      if (docDate) {
        const date = new Date(docDate);
        const week = getWeekNumber(date);
        weekCounts[week] = (weekCounts[week] || 0) + (doc.data().count || 0);
      }
    });

    // Calculate progress: skills marked as mastered
    skillsSnap.docs.forEach(doc => {
      const skill = doc.data();
      // Check for both lowercase (current) and uppercase (legacy) status
      const isMastered = skill.status === 'mastered' || skill.status === 'MASTERED';
      if (isMastered && skill.updatedAt) {
        const date = new Date(skill.updatedAt);
        if (date >= eightyFourDaysAgo) {
          const week = getWeekNumber(date);
          weekProgress[week] = (weekProgress[week] || 0) + 1;
        }
      }
    });

    // Add projects marked as completed
    projectsSnap.docs.forEach(doc => {
      const project = doc.data();
      const dateToUse = project.completedAt || project.updatedAt;
      if (project.status === 'completed' && dateToUse) {
        const date = new Date(dateToUse);
        if (date >= eightyFourDaysAgo) {
          const week = getWeekNumber(date);
          weekProgress[week] = (weekProgress[week] || 0) + 2; // Projects count as 2 progress points
        }
      }
    });

    // Merge activities and progress data
    const allWeeks = new Set([...Object.keys(weekCounts), ...Object.keys(weekProgress)]);
    const weeklyActivities = Array.from(allWeeks)
      .sort((a, b) => a.localeCompare(b))
      .map(week => ({ 
        week, 
        count: weekCounts[week] || 0,
        progress: weekProgress[week] || 0
      }));

    return { monthlyProgress: [], weeklyActivities };
  }, 'Failed to load progress data');
}

module.exports = {
  getStats,
  getProgressData
};
