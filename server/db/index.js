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
const goals = require('./goals');
const dependencies = require('./dependencies');
const categories = require('./categories');
const collaboration = require('./collaboration');
const { getUserCollection, docToData, safeQuery } = require('./utils');

module.exports = {
  // Skills
  getAllSkills: skills.getAllSkills,
  getPaginatedSkills: skills.getPaginatedSkills,
  createSkill: skills.createSkill,
  updateSkill: skills.updateSkill,
  deleteSkill: skills.deleteSkill,
  batchUpdateSkills: skills.batchUpdateSkills,
  
  // Projects
  getAllProjects: projects.getAllProjects,
  getPaginatedProjects: projects.getPaginatedProjects,
  createProject: projects.createProject,
  updateProject: projects.updateProject,
  deleteProject: projects.deleteProject,
  batchUpdateProjects: projects.batchUpdateProjects,
  
  // Resources
  getAllResources: resources.getAllResources,
  getPaginatedResources: resources.getPaginatedResources,
  createResource: resources.createResource,
  updateResource: resources.updateResource,
  deleteResource: resources.deleteResource,
  batchUpdateResources: resources.batchUpdateResources,
  
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
  
  // Goals
  getGoals: goals.getGoals,
  getGoal: goals.getGoal,
  createGoal: goals.createGoal,
  updateGoal: goals.updateGoal,
  deleteGoal: goals.deleteGoal,
  updateMilestone: goals.updateMilestone,
  
  // Skill Dependencies
  getDependencies: dependencies.getDependencies,
  getSkillDependencies: dependencies.getSkillDependencies,
  setSkillDependencies: dependencies.setSkillDependencies,
  addPrerequisite: dependencies.addPrerequisite,
  removePrerequisite: dependencies.removePrerequisite,
  getDependents: dependencies.getDependents,
  
  // Custom Categories
  getCategories: categories.getCategories,
  getCategory: categories.getCategory,
  createCategory: categories.createCategory,
  updateCategory: categories.updateCategory,
  deleteCategory: categories.deleteCategory,
  reorderCategories: categories.reorderCategories,
  
  // Collaboration - Public Profile
  getPublicProfile: collaboration.getPublicProfile,
  getPublicProfileBySlug: collaboration.getPublicProfileBySlug,
  updatePublicProfile: collaboration.updatePublicProfile,
  
  // Collaboration - Study Groups
  getUserStudyGroups: collaboration.getUserStudyGroups,
  getStudyGroup: collaboration.getStudyGroup,
  createStudyGroup: collaboration.createStudyGroup,
  joinStudyGroup: collaboration.joinStudyGroup,
  leaveStudyGroup: collaboration.leaveStudyGroup,
  deleteStudyGroup: collaboration.deleteStudyGroup,
  
  // Collaboration - Progress Sharing
  createShare: collaboration.createShare,
  getShare: collaboration.getShare,
  getUserShares: collaboration.getUserShares,
  revokeShare: collaboration.revokeShare,
  
  // Utilities (exposed for testing)
  utils: {
    getUserCollection,
    docToData,
    safeQuery
  }
};
