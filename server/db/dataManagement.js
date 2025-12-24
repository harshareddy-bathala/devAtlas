/**
 * Data Management Operations
 * 
 * Handles bulk data operations like clearing, export, and import.
 */

const { getDb, admin } = require('../firebase');
const { getUserCollection, docToData } = require('./utils');

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

  // Track what we've deleted for potential rollback info
  const deletedData = {};

  for (const collection of collections) {
    try {
      const snapshot = await userRef.collection(collection).get();
      counts[collection] = snapshot.size;
      
      if (snapshot.size === 0) continue;

      // Store data for potential recovery (in case of partial failure)
      deletedData[collection] = snapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));

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

/**
 * Export all user data
 */
async function exportData(userId) {
  const db = getDb();
  const userRef = db.collection('users').doc(userId);

  const [profile, skills, projects, resources, activities] = await Promise.all([
    userRef.get(),
    userRef.collection('skills').get(),
    userRef.collection('projects').get(),
    userRef.collection('resources').get(),
    userRef.collection('activitySummary').get()
  ]);

  return {
    exportedAt: new Date().toISOString(),
    version: '2.0.0',
    profile: profile.exists ? profile.data() : null,
    skills: skills.docs.map(docToData),
    projects: projects.docs.map(docToData),
    resources: resources.docs.map(docToData),
    activities: activities.docs.map(doc => ({
      date: doc.data().date,
      count: doc.data().count,
      types: doc.data().types,
      lastActivity: doc.data().lastActivity
    }))
  };
}

/**
 * Import user data (with validation)
 */
async function importData(userId, data) {
  const db = getDb();
  const userRef = db.collection('users').doc(userId);
  const counts = { skills: 0, projects: 0, resources: 0, activities: 0 };
  const errors = [];

  // Import skills
  if (data.skills && Array.isArray(data.skills)) {
    for (const skill of data.skills) {
      try {
        await userRef.collection('skills').add({
          name: skill.name,
          category: skill.category || 'language',
          status: skill.status || 'want_to_learn',
          icon: skill.icon || '📚',
          linkedProjects: skill.linkedProjects || [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        counts.skills++;
      } catch (e) {
        errors.push({ type: 'skill', name: skill.name, error: e.message });
      }
    }
  }

  // Import projects
  if (data.projects && Array.isArray(data.projects)) {
    for (const project of data.projects) {
      try {
        await userRef.collection('projects').add({
          name: project.name,
          description: project.description || '',
          status: project.status || 'idea',
          github_url: project.githubUrl || project.github_url || '',
          demo_url: project.demoUrl || project.demo_url || '',
          tech_stack: project.techStack || project.tech_stack || '',
          linkedSkills: project.linkedSkills || [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        counts.projects++;
      } catch (e) {
        errors.push({ type: 'project', name: project.name, error: e.message });
      }
    }
  }

  // Import resources
  if (data.resources && Array.isArray(data.resources)) {
    for (const resource of data.resources) {
      try {
        await userRef.collection('resources').add({
          title: resource.title,
          url: resource.url,
          type: resource.type || 'article',
          skillId: resource.skillId || null,
          projectId: resource.projectId || null,
          notes: resource.notes || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        counts.resources++;
      } catch (e) {
        errors.push({ type: 'resource', name: resource.title, error: e.message });
      }
    }
  }

  // Import activities
  if (data.activities && Array.isArray(data.activities)) {
    for (const activity of data.activities) {
      try {
        if (activity.date) {
          await userRef.collection('activitySummary').doc(activity.date).set({
            date: activity.date,
            count: activity.count || 1,
            types: activity.types || {},
            lastActivity: activity.lastActivity || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          counts.activities++;
        }
      } catch (e) {
        errors.push({ type: 'activity', date: activity.date, error: e.message });
      }
    }
  }

  return { 
    imported: counts,
    errors: errors.length > 0 ? errors : undefined
  };
}

module.exports = {
  clearAllData,
  exportData,
  importData
};
