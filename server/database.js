const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data.json');
const backupDir = path.join(__dirname, 'backups');
const lockFile = path.join(__dirname, '.data.lock');

// Default data structure
const defaultData = {
  skills: [],
  projects: [],
  resources: [],
  activities: [],
  nextIds: { skills: 1, projects: 1, resources: 1, activities: 1 }
};

// Simple file locking mechanism
let isLocked = false;
const lockQueue = [];

function acquireLockSync() {
  // Simple synchronous lock - wait if locked
  while (isLocked) {
    // Busy wait (not ideal but works for single-process)
  }
  isLocked = true;
}

function releaseLock() {
  isLocked = false;
}

// Load data from file with error recovery
function loadData() {
  try {
    if (fs.existsSync(dbPath)) {
      const rawData = fs.readFileSync(dbPath, 'utf-8');
      const data = JSON.parse(rawData);
      // Validate data structure
      if (!data.skills || !data.projects || !data.resources || !data.activities || !data.nextIds) {
        console.warn('⚠️ Invalid data structure, attempting recovery from backup');
        return recoverFromBackup() || { ...defaultData };
      }
      return data;
    }
  } catch (error) {
    console.error('❌ Error loading data:', error.message);
    console.log('🔄 Attempting recovery from backup...');
    return recoverFromBackup() || { ...defaultData };
  }
  return { ...defaultData };
}

// Save data to file with atomic write (synchronous version)
function saveData(dataToSave) {
  try {
    const tempPath = dbPath + '.tmp';
    // Write to temp file first
    fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
    // Rename temp to actual (atomic operation on most filesystems)
    fs.renameSync(tempPath, dbPath);
  } catch (error) {
    console.error('❌ Error saving data:', error.message);
    throw new Error('Failed to save data');
  }
}

// Create backup
function createBackup() {
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    if (fs.existsSync(dbPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `data-${timestamp}.json`);
      fs.copyFileSync(dbPath, backupPath);
      
      // Keep only last 10 backups
      const backups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('data-') && f.endsWith('.json'))
        .sort()
        .reverse();
      
      backups.slice(10).forEach(old => {
        fs.unlinkSync(path.join(backupDir, old));
      });
      
      console.log(`📦 Backup created: ${backupPath}`);
      return backupPath;
    }
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
  }
  return null;
}

// Recover from latest backup
function recoverFromBackup() {
  try {
    if (!fs.existsSync(backupDir)) return null;
    
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('data-') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (backups.length === 0) return null;
    
    const latestBackup = path.join(backupDir, backups[0]);
    const rawData = fs.readFileSync(latestBackup, 'utf-8');
    const data = JSON.parse(rawData);
    
    console.log(`✅ Recovered from backup: ${latestBackup}`);
    return data;
  } catch (error) {
    console.error('❌ Recovery failed:', error.message);
    return null;
  }
}

let data = loadData();

function initialize() {
  data = loadData();
  
  // Seed initial data if empty
  if (data.skills.length === 0) {
    seedData();
  }
  
  // Create initial backup
  createBackup();
  
  // Schedule periodic backups (every 24 hours)
  if (process.env.DATA_BACKUP_ENABLED !== 'false') {
    const backupInterval = (parseInt(process.env.DATA_BACKUP_INTERVAL_HOURS) || 24) * 60 * 60 * 1000;
    setInterval(createBackup, backupInterval);
  }
  
  console.log('📦 Database initialized successfully');
}

function seedData() {
  // Seed skills
  const skills = [
    { name: 'JavaScript', category: 'language', status: 'mastered', icon: '🟨' },
    { name: 'TypeScript', category: 'language', status: 'learning', icon: '🔷' },
    { name: 'React', category: 'framework', status: 'mastered', icon: '⚛️' },
    { name: 'Node.js', category: 'runtime', status: 'learning', icon: '🟩' },
    { name: 'Python', category: 'language', status: 'want_to_learn', icon: '🐍' },
    { name: 'Rust', category: 'language', status: 'want_to_learn', icon: '🦀' },
    { name: 'Docker', category: 'tool', status: 'learning', icon: '🐳' },
    { name: 'PostgreSQL', category: 'database', status: 'mastered', icon: '🐘' }
  ];
  
  skills.forEach(skill => createSkill(skill));

  // Seed projects
  const projects = [
    { name: 'Portfolio Website', description: 'Personal portfolio showcasing my work', status: 'completed', githubUrl: 'https://github.com/user/portfolio', demoUrl: 'https://myportfolio.dev', techStack: 'React,TailwindCSS,Vite' },
    { name: 'Task Manager API', description: 'RESTful API for task management', status: 'active', githubUrl: 'https://github.com/user/task-api', demoUrl: '', techStack: 'Node.js,Express,PostgreSQL' },
    { name: 'AI Chat Bot', description: 'Conversational AI assistant', status: 'idea', githubUrl: '', demoUrl: '', techStack: 'Python,OpenAI,FastAPI' }
  ];
  
  projects.forEach(project => createProject(project));

  // Seed activities for the last 90 days
  const activityTypes = ['learning', 'coding', 'reading', 'project'];
  const today = new Date();
  
  for (let i = 0; i < 90; i++) {
    if (Math.random() > 0.4) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const numActivities = Math.floor(Math.random() * 4) + 1;
      for (let j = 0; j < numActivities; j++) {
        const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        createActivity({ date: dateStr, type, description: `${type} session` });
      }
    }
  }

  // Seed resources
  const resources = [
    { title: 'React Documentation', url: 'https://react.dev', type: 'documentation', skillId: 3, notes: 'Official React docs' },
    { title: 'JavaScript: The Good Parts', url: 'https://www.youtube.com/watch?v=hQVTIJBZook', type: 'video', skillId: 1, notes: 'Classic talk by Douglas Crockford' },
    { title: 'Node.js Crash Course', url: 'https://www.youtube.com/watch?v=fBNz5xF-Kx4', type: 'video', skillId: 4, notes: 'Traversy Media tutorial' }
  ];
  
  resources.forEach(resource => createResource(resource));

  console.log('🌱 Database seeded with initial data');
}

// ============ SKILLS ============
function getAllSkills() {
  return data.skills.sort((a, b) => {
    const statusOrder = { mastered: 0, learning: 1, want_to_learn: 2 };
    return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3) || a.name.localeCompare(b.name);
  });
}

function createSkill({ name, category, status, icon }) {
  const skill = {
    id: data.nextIds.skills++,
    name,
    category: category || 'language',
    status: status || 'want_to_learn',
    icon: icon || '📚',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  data.skills.push(skill);
  
  // Auto-log activity
  logActivity('learning', `Added skill: ${name}`, skill.id, null);
  
  saveData(data);
  return skill;
}

function updateSkill(id, { name, category, status, icon }) {
  const index = data.skills.findIndex(s => s.id === parseInt(id));
  if (index !== -1) {
    const oldStatus = data.skills[index].status;
    data.skills[index] = {
      ...data.skills[index],
      name,
      category,
      status,
      icon,
      updated_at: new Date().toISOString()
    };
    // Auto-log activity for status changes
    if (oldStatus !== status) {
      const statusLabels = { mastered: 'Mastered', learning: 'Started learning', want_to_learn: 'Want to learn' };
      logActivity('learning', `${statusLabels[status] || 'Updated'}: ${name}`, parseInt(id), null);
    }
    
    saveData(data);
    return data.skills[index];
  }
  return null;
}

function deleteSkill(id) {
  const skill = data.skills.find(s => s.id === parseInt(id));
  data.skills = data.skills.filter(s => s.id !== parseInt(id));
  
  if (skill) {
    logActivity('learning', `Removed skill: ${skill.name}`, null, null);
  }
  
  saveData(data);
}

// ============ PROJECTS ============
function getAllProjects() {
  return data.projects.sort((a, b) => {
    const statusOrder = { active: 0, idea: 1, completed: 2 };
    return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
  });
}

function createProject({ name, description, status, githubUrl, demoUrl, techStack }) {
  const project = {
    id: data.nextIds.projects++,
    name,
    description: description || '',
    status: status || 'idea',
    github_url: githubUrl || '',
    demo_url: demoUrl || '',
    tech_stack: techStack || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  data.projects.push(project);
  
  // Auto-log activity
  logActivity('project', `Created project: ${name}`, null, project.id);
  
  saveData(data);
  return project;
}

function updateProject(id, { name, description, status, githubUrl, demoUrl, techStack }) {
  const index = data.projects.findIndex(p => p.id === parseInt(id));
  if (index !== -1) {
    const oldStatus = data.projects[index].status;
    data.projects[index] = {
      ...data.projects[index],
      name,
      description,
      status,
      github_url: githubUrl,
      demo_url: demoUrl,
      tech_stack: techStack,
      updated_at: new Date().toISOString()
    };
    // Auto-log activity for status changes
    if (oldStatus !== status) {
      const statusLabels = { completed: 'Completed', active: 'Started working on', idea: 'Moved to ideas' };
      logActivity('project', `${statusLabels[status] || 'Updated'}: ${name}`, null, parseInt(id));
    }
    
    saveData(data);
    return data.projects[index];
  }
  return null;
}

function deleteProject(id) {
  const project = data.projects.find(p => p.id === parseInt(id));
  data.projects = data.projects.filter(p => p.id !== parseInt(id));
  
  if (project) {
    logActivity('project', `Removed project: ${project.name}`, null, null);
  }
  
  saveData(data);
}

// ============ RESOURCES ============
function getAllResources() {
  return data.resources.map(r => {
    const skill = data.skills.find(s => s.id === r.skill_id);
    const project = data.projects.find(p => p.id === r.project_id);
    return {
      ...r,
      skill_name: skill ? skill.name : null,
      project_name: project ? project.name : null
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function createResource({ title, url, type, skillId, projectId, notes }) {
  const resource = {
    id: data.nextIds.resources++,
    title,
    url,
    type: type || 'article',
    skill_id: skillId ? parseInt(skillId) : null,
    project_id: projectId ? parseInt(projectId) : null,
    notes: notes || '',
    created_at: new Date().toISOString()
  };
  data.resources.push(resource);
  
  // Auto-log activity
  logActivity('reading', `Saved resource: ${title}`, resource.skill_id, resource.project_id);
  
  saveData(data);
  return resource;
}

function updateResource(id, { title, url, type, skillId, projectId, notes }) {
  const index = data.resources.findIndex(r => r.id === parseInt(id));
  if (index !== -1) {
    data.resources[index] = {
      ...data.resources[index],
      title,
      url,
      type,
      skill_id: skillId ? parseInt(skillId) : null,
      project_id: projectId ? parseInt(projectId) : null,
      notes
    };
    saveData(data);
    return data.resources[index];
  }
  return null;
}

function deleteResource(id) {
  data.resources = data.resources.filter(r => r.id !== parseInt(id));
  saveData(data);
}

// ============ ACTIVITIES ============
function getAllActivities() {
  return data.activities.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function createActivity({ date, type, description, skillId, projectId }) {
  const activity = {
    id: data.nextIds.activities++,
    date,
    type,
    description: description || '',
    skill_id: skillId || null,
    project_id: projectId || null,
    created_at: new Date().toISOString()
  };
  data.activities.push(activity);
  saveData(data);
  return activity;
}

// Internal helper to log activities automatically (doesn't save immediately, batch with parent save)
function logActivity(type, description, skillId, projectId) {
  const today = new Date().toISOString().split('T')[0];
  const activity = {
    id: data.nextIds.activities++,
    date: today,
    type,
    description,
    skill_id: skillId || null,
    project_id: projectId || null,
    created_at: new Date().toISOString()
  };
  data.activities.push(activity);
  // Note: saveData is called by the parent function
}

function getHeatmapData() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const counts = {};
  data.activities.forEach(a => {
    if (new Date(a.date) >= oneYearAgo) {
      counts[a.date] = (counts[a.date] || 0) + 1;
    }
  });
  
  return Object.entries(counts).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
}

// ============ STATS ============
function getStats() {
  const skillsByStatus = data.skills.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});
  
  const projectsByStatus = data.projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const activeDays = new Set(
    data.activities
      .filter(a => new Date(a.date) >= thirtyDaysAgo)
      .map(a => a.date)
  ).size;

  return {
    skills: skillsByStatus,
    projects: projectsByStatus,
    resources: data.resources.length,
    totalActivities: data.activities.length,
    activeDaysLast30: activeDays
  };
}

function getProgressData() {
  const eightyFourDaysAgo = new Date();
  eightyFourDaysAgo.setDate(eightyFourDaysAgo.getDate() - 84);
  
  const weeklyActivities = [];
  const weekCounts = {};
  
  data.activities
    .filter(a => new Date(a.date) >= eightyFourDaysAgo)
    .forEach(a => {
      const date = new Date(a.date);
      const week = getWeekNumber(date);
      weekCounts[week] = (weekCounts[week] || 0) + 1;
    });
  
  Object.entries(weekCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([week, count]) => {
      weeklyActivities.push({ week, count });
    });

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
function exportData() {
  return {
    skills: data.skills,
    projects: data.projects,
    resources: data.resources,
    activities: data.activities,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };
}

function importData(importedData) {
  // Create backup before import
  createBackup();
  
  let imported = { skills: 0, projects: 0, resources: 0, activities: 0 };
  
  if (importedData.skills && Array.isArray(importedData.skills)) {
    importedData.skills.forEach(skill => {
      if (skill.name && !data.skills.find(s => s.name === skill.name)) {
        createSkill(skill);
        imported.skills++;
      }
    });
  }
  
  if (importedData.projects && Array.isArray(importedData.projects)) {
    importedData.projects.forEach(project => {
      if (project.name && !data.projects.find(p => p.name === project.name)) {
        createProject(project);
        imported.projects++;
      }
    });
  }
  
  if (importedData.resources && Array.isArray(importedData.resources)) {
    importedData.resources.forEach(resource => {
      if (resource.url && !data.resources.find(r => r.url === resource.url)) {
        createResource(resource);
        imported.resources++;
      }
    });
  }
  
  if (importedData.activities && Array.isArray(importedData.activities)) {
    importedData.activities.forEach(activity => {
      createActivity(activity);
      imported.activities++;
    });
  }
  
  return { imported };
}

// Clear all data and start fresh
function clearAllData() {
  // Create backup before clearing
  createBackup();
  
  const counts = {
    skills: data.skills.length,
    projects: data.projects.length,
    resources: data.resources.length,
    activities: data.activities.length
  };
  
  data = { ...defaultData };
  saveData(data);
  
  return { cleared: counts };
}

module.exports = {
  initialize,
  getAllSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  getAllProjects,
  createProject,
  updateProject,
  deleteProject,
  getAllResources,
  createResource,
  updateResource,
  deleteResource,
  getAllActivities,
  createActivity,
  getHeatmapData,
  getStats,
  getProgressData,
  exportData,
  importData,
  clearAllData,
  createBackup
};
