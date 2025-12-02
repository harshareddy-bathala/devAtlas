require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./database');
const { skillSchema, projectSchema, resourceSchema, activitySchema, idParamSchema } = require('./validation');
const { validate, validateParams, asyncHandler, errorHandler, requestLogger, sanitize } = require('./middleware');
const { NotFoundError } = require('./errors');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { 
    success: false, 
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging
app.use(requestLogger);

// Sanitize all inputs
app.use(sanitize);

// Initialize database
db.initialize();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ SKILLS ROUTES ============
app.get('/api/skills', asyncHandler(async (req, res) => {
  const skills = db.getAllSkills();
  res.json({ success: true, data: skills });
}));

app.post('/api/skills', validate(skillSchema), asyncHandler(async (req, res) => {
  const skill = db.createSkill(req.body);
  res.status(201).json({ success: true, data: skill });
}));

app.put('/api/skills/:id', validateParams(idParamSchema), validate(skillSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const skill = db.updateSkill(id, req.body);
  if (!skill) {
    throw new NotFoundError('Skill');
  }
  res.json({ success: true, data: skill });
}));

app.delete('/api/skills/:id', validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  db.deleteSkill(id);
  res.json({ success: true, message: 'Skill deleted successfully' });
}));

// ============ PROJECTS ROUTES ============
app.get('/api/projects', asyncHandler(async (req, res) => {
  const projects = db.getAllProjects();
  res.json({ success: true, data: projects });
}));

app.post('/api/projects', validate(projectSchema), asyncHandler(async (req, res) => {
  const project = db.createProject(req.body);
  res.status(201).json({ success: true, data: project });
}));

app.put('/api/projects/:id', validateParams(idParamSchema), validate(projectSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = db.updateProject(id, req.body);
  if (!project) {
    throw new NotFoundError('Project');
  }
  res.json({ success: true, data: project });
}));

app.delete('/api/projects/:id', validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  db.deleteProject(id);
  res.json({ success: true, message: 'Project deleted successfully' });
}));

// ============ RESOURCES ROUTES ============
app.get('/api/resources', asyncHandler(async (req, res) => {
  const resources = db.getAllResources();
  res.json({ success: true, data: resources });
}));

app.post('/api/resources', validate(resourceSchema), asyncHandler(async (req, res) => {
  const resource = db.createResource(req.body);
  res.status(201).json({ success: true, data: resource });
}));

app.put('/api/resources/:id', validateParams(idParamSchema), validate(resourceSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const resource = db.updateResource(id, req.body);
  if (!resource) {
    throw new NotFoundError('Resource');
  }
  res.json({ success: true, data: resource });
}));

app.delete('/api/resources/:id', validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  db.deleteResource(id);
  res.json({ success: true, message: 'Resource deleted successfully' });
}));

// ============ ACTIVITIES ROUTES ============
app.get('/api/activities', asyncHandler(async (req, res) => {
  const activities = db.getAllActivities();
  res.json({ success: true, data: activities });
}));

app.post('/api/activities', validate(activitySchema), asyncHandler(async (req, res) => {
  const activity = db.createActivity(req.body);
  res.status(201).json({ success: true, data: activity });
}));

app.get('/api/activities/heatmap', asyncHandler(async (req, res) => {
  const heatmapData = db.getHeatmapData();
  res.json({ success: true, data: heatmapData });
}));

// ============ STATS ROUTES ============
app.get('/api/stats', asyncHandler(async (req, res) => {
  const stats = db.getStats();
  res.json({ success: true, data: stats });
}));

app.get('/api/stats/progress', asyncHandler(async (req, res) => {
  const progress = db.getProgressData();
  res.json({ success: true, data: progress });
}));

// ============ DATA EXPORT/IMPORT ============
app.get('/api/export', asyncHandler(async (req, res) => {
  const exportData = db.exportData();
  res.json({ success: true, data: exportData, exportedAt: new Date().toISOString() });
}));

app.post('/api/import', asyncHandler(async (req, res) => {
  const result = db.importData(req.body);
  res.json({ success: true, message: 'Data imported successfully', ...result });
}));

app.delete('/api/data', asyncHandler(async (req, res) => {
  const result = db.clearAllData();
  res.json({ success: true, message: 'All data cleared successfully', ...result });
}));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 DevOrbit server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
