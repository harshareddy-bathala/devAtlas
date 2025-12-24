/**
 * Database Layer - Main Entry Point
 * 
 * Exports all database operations from domain-specific modules.
 * This modular approach makes the codebase easier to maintain and test.
 */

const skills = require('./skills');
const projects = require('./projects');
const resources = require('./resources');
const activities = require('./activities');
const stats = require('./stats');
const dataManagement = require('./dataManagement');
const { getUserCollection, docToData, safeQuery } = require('./utils');

module.exports = {
  // Skills
  getAllSkills: skills.getAllSkills,
  getPaginatedSkills: skills.getPaginatedSkills,
  createSkill: skills.createSkill,
  updateSkill: skills.updateSkill,
  deleteSkill: skills.deleteSkill,
  
  // Projects
  getAllProjects: projects.getAllProjects,
  getPaginatedProjects: projects.getPaginatedProjects,
  createProject: projects.createProject,
  updateProject: projects.updateProject,
  deleteProject: projects.deleteProject,
  
  // Resources
  getAllResources: resources.getAllResources,
  getPaginatedResources: resources.getPaginatedResources,
  createResource: resources.createResource,
  updateResource: resources.updateResource,
  deleteResource: resources.deleteResource,
  
  // Activities
  getAllActivities: activities.getAllActivities,
  createActivity: activities.createActivity,
  getHeatmapData: activities.getHeatmapData,
  logActivity: activities.logActivity,
  
  // Stats
  getStats: stats.getStats,
  getProgressData: stats.getProgressData,
  
  // Data Management
  clearAllData: dataManagement.clearAllData,
  exportData: dataManagement.exportData,
  importData: dataManagement.importData,
  
  // Utilities (exposed for testing)
  utils: {
    getUserCollection,
    docToData,
    safeQuery
  }
};
