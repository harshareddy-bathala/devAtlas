require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initializeFirebase, verifyIdToken, getOrCreateUser } = require('./firebase');
const db = require('./firestore');
const { skillSchema, projectSchema, resourceSchema, activitySchema, idParamSchema } = require('./validation');
const { validate, validateParams, asyncHandler, errorHandler, requestLogger, sanitize } = require('./middleware');
const { NotFoundError, UnauthorizedError } = require('./errors');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Firebase
initializeFirebase();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
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

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging
app.use(requestLogger);

// Sanitize inputs
app.use(sanitize);

// Auth middleware - verifies Firebase ID token
const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await verifyIdToken(idToken);
    req.user = await getOrCreateUser(decodedToken);
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ AUTH ROUTES ============
app.get('/api/auth/me', authMiddleware, asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
}));

// ============ SKILLS ROUTES ============
app.get('/api/skills', authMiddleware, asyncHandler(async (req, res) => {
  const skills = await db.getAllSkills(req.user.id);
  res.json({ success: true, data: skills });
}));

app.post('/api/skills', authMiddleware, validate(skillSchema), asyncHandler(async (req, res) => {
  const skill = await db.createSkill(req.user.id, req.body);
  res.status(201).json({ success: true, data: skill });
}));

app.put('/api/skills/:id', authMiddleware, validateParams(idParamSchema), validate(skillSchema), asyncHandler(async (req, res) => {
  const skill = await db.updateSkill(req.user.id, req.params.id, req.body);
  if (!skill) {
    throw new NotFoundError('Skill');
  }
  res.json({ success: true, data: skill });
}));

app.delete('/api/skills/:id', authMiddleware, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const deleted = await db.deleteSkill(req.user.id, req.params.id);
  if (!deleted) {
    throw new NotFoundError('Skill');
  }
  res.json({ success: true, message: 'Skill deleted successfully' });
}));

// ============ PROJECTS ROUTES ============
app.get('/api/projects', authMiddleware, asyncHandler(async (req, res) => {
  const projects = await db.getAllProjects(req.user.id);
  res.json({ success: true, data: projects });
}));

app.post('/api/projects', authMiddleware, validate(projectSchema), asyncHandler(async (req, res) => {
  const project = await db.createProject(req.user.id, req.body);
  res.status(201).json({ success: true, data: project });
}));

app.put('/api/projects/:id', authMiddleware, validateParams(idParamSchema), validate(projectSchema), asyncHandler(async (req, res) => {
  const project = await db.updateProject(req.user.id, req.params.id, req.body);
  if (!project) {
    throw new NotFoundError('Project');
  }
  res.json({ success: true, data: project });
}));

app.delete('/api/projects/:id', authMiddleware, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const deleted = await db.deleteProject(req.user.id, req.params.id);
  if (!deleted) {
    throw new NotFoundError('Project');
  }
  res.json({ success: true, message: 'Project deleted successfully' });
}));

// ============ RESOURCES ROUTES ============
app.get('/api/resources', authMiddleware, asyncHandler(async (req, res) => {
  const resources = await db.getAllResources(req.user.id);
  res.json({ success: true, data: resources });
}));

app.post('/api/resources', authMiddleware, validate(resourceSchema), asyncHandler(async (req, res) => {
  const resource = await db.createResource(req.user.id, req.body);
  res.status(201).json({ success: true, data: resource });
}));

app.put('/api/resources/:id', authMiddleware, validateParams(idParamSchema), validate(resourceSchema), asyncHandler(async (req, res) => {
  const resource = await db.updateResource(req.user.id, req.params.id, req.body);
  if (!resource) {
    throw new NotFoundError('Resource');
  }
  res.json({ success: true, data: resource });
}));

app.delete('/api/resources/:id', authMiddleware, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const deleted = await db.deleteResource(req.user.id, req.params.id);
  if (!deleted) {
    throw new NotFoundError('Resource');
  }
  res.json({ success: true, message: 'Resource deleted successfully' });
}));

// ============ ACTIVITIES ROUTES ============
app.get('/api/activities', authMiddleware, asyncHandler(async (req, res) => {
  const activities = await db.getAllActivities(req.user.id);
  res.json({ success: true, data: activities });
}));

app.post('/api/activities', authMiddleware, validate(activitySchema), asyncHandler(async (req, res) => {
  const activity = await db.createActivity(req.user.id, req.body);
  res.status(201).json({ success: true, data: activity });
}));

app.get('/api/activities/heatmap', authMiddleware, asyncHandler(async (req, res) => {
  const heatmapData = await db.getHeatmapData(req.user.id);
  res.json({ success: true, data: heatmapData });
}));

// ============ STATS ROUTES ============
app.get('/api/stats', authMiddleware, asyncHandler(async (req, res) => {
  const stats = await db.getStats(req.user.id);
  res.json({ success: true, data: stats });
}));

app.get('/api/stats/progress', authMiddleware, asyncHandler(async (req, res) => {
  const progress = await db.getProgressData(req.user.id);
  res.json({ success: true, data: progress });
}));

// ============ DATA EXPORT/IMPORT ============
app.get('/api/export', authMiddleware, asyncHandler(async (req, res) => {
  const exportData = await db.exportData(req.user.id);
  res.json({ success: true, data: exportData });
}));

app.post('/api/import', authMiddleware, asyncHandler(async (req, res) => {
  const result = await db.importData(req.user.id, req.body);
  res.json({ success: true, message: 'Data imported successfully', ...result });
}));

app.delete('/api/data', authMiddleware, asyncHandler(async (req, res) => {
  const result = await db.clearAllData(req.user.id);
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
  console.log(`🔥 Using Firebase/Firestore`);
});
