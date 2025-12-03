const { getDb, admin } = require('./firebase');

// Collection names
const COLLECTIONS = {
  USERS: 'users',
  SKILLS: 'skills',
  PROJECTS: 'projects',
  RESOURCES: 'resources',
  ACTIVITIES: 'activities'
};

// Helper to convert Firestore doc to plain object
function docToData(doc) {
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    // Convert Firestore Timestamps to ISO strings
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
  };
}

// ============ SKILLS ============
async function getAllSkills(userId) {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTIONS.SKILLS)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(docToData).sort((a, b) => {
    const statusOrder = { mastered: 0, learning: 1, want_to_learn: 2 };
    return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
  });
}

async function createSkill(userId, { name, category, status, icon }) {
  const db = getDb();
  const skill = {
    userId,
    name,
    category: category || 'language',
    status: status || 'want_to_learn',
    icon: icon || '📚',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await db.collection(COLLECTIONS.SKILLS).add(skill);
  
  // Auto-log activity
  await createActivity(userId, {
    date: new Date().toISOString().split('T')[0],
    type: 'learning',
    description: `Added skill: ${name}`,
    skillId: docRef.id
  });

  return { id: docRef.id, ...skill };
}

async function updateSkill(userId, skillId, data) {
  const db = getDb();
  const skillRef = db.collection(COLLECTIONS.SKILLS).doc(skillId);
  const skillDoc = await skillRef.get();

  if (!skillDoc.exists || skillDoc.data().userId !== userId) {
    return null;
  }

  const oldStatus = skillDoc.data().status;
  const updateData = {
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await skillRef.update(updateData);

  // Log status change
  if (oldStatus !== data.status) {
    const statusLabels = { mastered: 'Mastered', learning: 'Started learning', want_to_learn: 'Want to learn' };
    await createActivity(userId, {
      date: new Date().toISOString().split('T')[0],
      type: 'learning',
      description: `${statusLabels[data.status] || 'Updated'}: ${data.name}`,
      skillId
    });
  }

  return { id: skillId, ...skillDoc.data(), ...updateData };
}

async function deleteSkill(userId, skillId) {
  const db = getDb();
  const skillRef = db.collection(COLLECTIONS.SKILLS).doc(skillId);
  const skillDoc = await skillRef.get();

  if (!skillDoc.exists || skillDoc.data().userId !== userId) {
    return false;
  }

  const skillName = skillDoc.data().name;
  await skillRef.delete();

  await createActivity(userId, {
    date: new Date().toISOString().split('T')[0],
    type: 'learning',
    description: `Removed skill: ${skillName}`
  });

  return true;
}

// ============ PROJECTS ============
async function getAllProjects(userId) {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTIONS.PROJECTS)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(docToData).sort((a, b) => {
    const statusOrder = { active: 0, idea: 1, completed: 2 };
    return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
  });
}

async function createProject(userId, { name, description, status, githubUrl, demoUrl, techStack }) {
  const db = getDb();
  const project = {
    userId,
    name,
    description: description || '',
    status: status || 'idea',
    githubUrl: githubUrl || '',
    demoUrl: demoUrl || '',
    techStack: techStack || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await db.collection(COLLECTIONS.PROJECTS).add(project);

  await createActivity(userId, {
    date: new Date().toISOString().split('T')[0],
    type: 'project',
    description: `Created project: ${name}`,
    projectId: docRef.id
  });

  return { id: docRef.id, ...project };
}

async function updateProject(userId, projectId, data) {
  const db = getDb();
  const projectRef = db.collection(COLLECTIONS.PROJECTS).doc(projectId);
  const projectDoc = await projectRef.get();

  if (!projectDoc.exists || projectDoc.data().userId !== userId) {
    return null;
  }

  const oldStatus = projectDoc.data().status;
  const updateData = {
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await projectRef.update(updateData);

  if (oldStatus !== data.status) {
    const statusLabels = { completed: 'Completed', active: 'Started working on', idea: 'Moved to ideas' };
    await createActivity(userId, {
      date: new Date().toISOString().split('T')[0],
      type: 'project',
      description: `${statusLabels[data.status] || 'Updated'}: ${data.name}`,
      projectId
    });
  }

  return { id: projectId, ...projectDoc.data(), ...updateData };
}

async function deleteProject(userId, projectId) {
  const db = getDb();
  const projectRef = db.collection(COLLECTIONS.PROJECTS).doc(projectId);
  const projectDoc = await projectRef.get();

  if (!projectDoc.exists || projectDoc.data().userId !== userId) {
    return false;
  }

  const projectName = projectDoc.data().name;
  await projectRef.delete();

  await createActivity(userId, {
    date: new Date().toISOString().split('T')[0],
    type: 'project',
    description: `Removed project: ${projectName}`
  });

  return true;
}

// ============ RESOURCES ============
async function getAllResources(userId) {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTIONS.RESOURCES)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  const resources = snapshot.docs.map(docToData);

  // Fetch related skills and projects
  const skillIds = [...new Set(resources.filter(r => r.skillId).map(r => r.skillId))];
  const projectIds = [...new Set(resources.filter(r => r.projectId).map(r => r.projectId))];

  const [skillsSnap, projectsSnap] = await Promise.all([
    skillIds.length > 0
      ? db.collection(COLLECTIONS.SKILLS).where(admin.firestore.FieldPath.documentId(), 'in', skillIds.slice(0, 10)).get()
      : Promise.resolve({ docs: [] }),
    projectIds.length > 0
      ? db.collection(COLLECTIONS.PROJECTS).where(admin.firestore.FieldPath.documentId(), 'in', projectIds.slice(0, 10)).get()
      : Promise.resolve({ docs: [] })
  ]);

  const skillsMap = Object.fromEntries(skillsSnap.docs.map(d => [d.id, d.data().name]));
  const projectsMap = Object.fromEntries(projectsSnap.docs.map(d => [d.id, d.data().name]));

  return resources.map(r => ({
    ...r,
    skillName: r.skillId ? skillsMap[r.skillId] : null,
    projectName: r.projectId ? projectsMap[r.projectId] : null
  }));
}

async function createResource(userId, { title, url, type, skillId, projectId, notes }) {
  const db = getDb();
  const resource = {
    userId,
    title,
    url,
    type: type || 'article',
    skillId: skillId || null,
    projectId: projectId || null,
    notes: notes || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await db.collection(COLLECTIONS.RESOURCES).add(resource);

  await createActivity(userId, {
    date: new Date().toISOString().split('T')[0],
    type: 'reading',
    description: `Saved resource: ${title}`,
    skillId,
    projectId
  });

  return { id: docRef.id, ...resource };
}

async function updateResource(userId, resourceId, data) {
  const db = getDb();
  const resourceRef = db.collection(COLLECTIONS.RESOURCES).doc(resourceId);
  const resourceDoc = await resourceRef.get();

  if (!resourceDoc.exists || resourceDoc.data().userId !== userId) {
    return null;
  }

  await resourceRef.update(data);
  return { id: resourceId, ...resourceDoc.data(), ...data };
}

async function deleteResource(userId, resourceId) {
  const db = getDb();
  const resourceRef = db.collection(COLLECTIONS.RESOURCES).doc(resourceId);
  const resourceDoc = await resourceRef.get();

  if (!resourceDoc.exists || resourceDoc.data().userId !== userId) {
    return false;
  }

  await resourceRef.delete();
  return true;
}

// ============ ACTIVITIES ============
async function getAllActivities(userId) {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTIONS.ACTIVITIES)
    .where('userId', '==', userId)
    .orderBy('date', 'desc')
    .limit(500)
    .get();

  return snapshot.docs.map(docToData);
}

async function createActivity(userId, { date, type, description, skillId, projectId }) {
  const db = getDb();
  const activity = {
    userId,
    date,
    type,
    description: description || '',
    skillId: skillId || null,
    projectId: projectId || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await db.collection(COLLECTIONS.ACTIVITIES).add(activity);
  return { id: docRef.id, ...activity };
}

async function getHeatmapData(userId) {
  const db = getDb();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

  const snapshot = await db
    .collection(COLLECTIONS.ACTIVITIES)
    .where('userId', '==', userId)
    .where('date', '>=', oneYearAgoStr)
    .get();

  const counts = {};
  snapshot.docs.forEach(doc => {
    const date = doc.data().date;
    counts[date] = (counts[date] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ============ STATS ============
async function getStats(userId) {
  const db = getDb();

  const [skillsSnap, projectsSnap, resourcesSnap, activitiesSnap] = await Promise.all([
    db.collection(COLLECTIONS.SKILLS).where('userId', '==', userId).get(),
    db.collection(COLLECTIONS.PROJECTS).where('userId', '==', userId).get(),
    db.collection(COLLECTIONS.RESOURCES).where('userId', '==', userId).get(),
    db.collection(COLLECTIONS.ACTIVITIES).where('userId', '==', userId).get()
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

  const activeDays = new Set(
    activitiesSnap.docs
      .filter(doc => doc.data().date >= thirtyDaysAgoStr)
      .map(doc => doc.data().date)
  ).size;

  return {
    skills: skillsByStatus,
    projects: projectsByStatus,
    resources: resourcesSnap.size,
    totalActivities: activitiesSnap.size,
    activeDaysLast30: activeDays
  };
}

async function getProgressData(userId) {
  const db = getDb();
  const eightyFourDaysAgo = new Date();
  eightyFourDaysAgo.setDate(eightyFourDaysAgo.getDate() - 84);
  const dateStr = eightyFourDaysAgo.toISOString().split('T')[0];

  const snapshot = await db
    .collection(COLLECTIONS.ACTIVITIES)
    .where('userId', '==', userId)
    .where('date', '>=', dateStr)
    .get();

  const weekCounts = {};
  snapshot.docs.forEach(doc => {
    const date = new Date(doc.data().date);
    const week = getWeekNumber(date);
    weekCounts[week] = (weekCounts[week] || 0) + 1;
  });

  const weeklyActivities = Object.entries(weekCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, count]) => ({ week, count }));

  return { monthlyProgress: [], weeklyActivities };
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-${String(Math.ceil((((d - yearStart) / 86400000) + 1) / 7)).padStart(2, '0')}`;
}

// ============ EXPORT/IMPORT ============
async function exportData(userId) {
  const [skills, projects, resources, activities] = await Promise.all([
    getAllSkills(userId),
    getAllProjects(userId),
    getAllResources(userId),
    getAllActivities(userId)
  ]);

  return {
    skills,
    projects,
    resources,
    activities,
    exportedAt: new Date().toISOString(),
    version: '2.0'
  };
}

async function importData(userId, importedData) {
  const imported = { skills: 0, projects: 0, resources: 0, activities: 0 };

  if (importedData.skills && Array.isArray(importedData.skills)) {
    for (const skill of importedData.skills) {
      if (skill.name) {
        await createSkill(userId, skill);
        imported.skills++;
      }
    }
  }

  if (importedData.projects && Array.isArray(importedData.projects)) {
    for (const project of importedData.projects) {
      if (project.name) {
        await createProject(userId, project);
        imported.projects++;
      }
    }
  }

  if (importedData.resources && Array.isArray(importedData.resources)) {
    for (const resource of importedData.resources) {
      if (resource.url) {
        await createResource(userId, resource);
        imported.resources++;
      }
    }
  }

  return { imported };
}

async function clearAllData(userId) {
  const db = getDb();
  const batch = db.batch();

  const collections = [COLLECTIONS.SKILLS, COLLECTIONS.PROJECTS, COLLECTIONS.RESOURCES, COLLECTIONS.ACTIVITIES];
  const counts = {};

  for (const collection of collections) {
    const snapshot = await db.collection(collection).where('userId', '==', userId).get();
    counts[collection] = snapshot.size;
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
  }

  await batch.commit();
  return { cleared: counts };
}

module.exports = {
  // Skills
  getAllSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  // Projects
  getAllProjects,
  createProject,
  updateProject,
  deleteProject,
  // Resources
  getAllResources,
  createResource,
  updateResource,
  deleteResource,
  // Activities
  getAllActivities,
  createActivity,
  getHeatmapData,
  // Stats
  getStats,
  getProgressData,
  // Export/Import
  exportData,
  importData,
  clearAllData
};
