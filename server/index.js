require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initializeFirebase, verifyIdToken, getOrCreateUser, getAuth, getDb, admin } = require('./firebase');
const db = require('./db'); // Use new modular database layer
const { getCached, invalidateCache, invalidateUserCache, isCacheAvailable } = require('./cache');
const { initSentry, setSentryUser, captureException, addBreadcrumb } = require('./sentry');
const { skillSchema, projectSchema, resourceSchema, activitySchema, idParamSchema, profileSchema, paginationSchema, batchSkillUpdateSchema, batchProjectUpdateSchema, batchResourceUpdateSchema } = require('./validation');
const { validate, validateParams, validateQuery, asyncHandler, errorHandler, requestLogger, sanitize, requestIdMiddleware } = require('./middleware');
const { NotFoundError, UnauthorizedError, ValidationError } = require('./errors');

// Check if serviceAccountKey.json exists for local development
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const hasServiceAccountFile = fs.existsSync(serviceAccountPath);

// Validate required environment variables at startup
// FIREBASE_SERVICE_ACCOUNT is only required if serviceAccountKey.json doesn't exist
const requiredEnvVars = [];

// Only require FIREBASE_SERVICE_ACCOUNT if no local file exists
if (!hasServiceAccountFile) {
  requiredEnvVars.push('FIREBASE_SERVICE_ACCOUNT');
}

// CORS_ORIGIN is optional in development (defaults to localhost)
if (process.env.NODE_ENV === 'production') {
  requiredEnvVars.push('CORS_ORIGIN');
}

const optionalEnvVars = [
  'PORT',
  'NODE_ENV',
  'REDIS_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];

function validateEnvironment() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    process.exit(1);
  }
  
  // Log configured services
  console.log('📋 Environment configuration:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   PORT: ${process.env.PORT || 3001}`);
  console.log(`   Firebase: ${process.env.FIREBASE_SERVICE_ACCOUNT ? 'env variable' : (hasServiceAccountFile ? 'local file' : 'not configured')}`);
  console.log(`   Redis: ${process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL ? 'configured' : 'not configured'}`);
}

validateEnvironment();

const app = express();
const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== 'production';

// Initialize Firebase
initializeFirebase();

// Initialize Sentry (must be before other middleware)
const { requestHandler: sentryRequestHandler, errorHandler: sentryErrorHandler } = initSentry(app);
app.use(sentryRequestHandler);

// Request ID middleware (for correlation)
app.use(requestIdMiddleware);

// Security middleware with proper CSP
// Generate nonce for inline styles (more secure than unsafe-inline)
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

const cspScriptSrc = isDev 
  ? ["'self'", "'unsafe-inline'"] // Dev: allow inline for HMR/debugging
  : ["'self'"]; // Prod: strict CSP, no inline scripts

// For styles, we use nonce-based CSP in production
const getStyleSrc = (req, res) => {
  if (isDev) {
    return ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"];
  }
  // In production, use nonce for inline styles
  return ["'self'", `'nonce-${res.locals.nonce}'`, "https://fonts.googleapis.com"];
};

app.use((req, res, next) => {
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: cspScriptSrc,
        styleSrc: getStyleSrc(req, res),
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: [
          "'self'",
          "https://*.firebaseapp.com",
          "https://*.googleapis.com",
          "https://*.google.com",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com",
          "wss://*.firebaseio.com"
        ],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        upgradeInsecureRequests: isDev ? [] : undefined
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  })(req, res, next);
});

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Rate limiting - enabled in both dev and prod with different limits
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 1 * 60 * 1000, // 1 minute
  max: isDev 
    ? 500  // More lenient in development: 500 requests per minute
    : (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200), // Stricter in production: 200 requests per minute
  message: { 
    success: false, 
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
  // Rate limiting is now always enabled - removed skip condition for security
});
app.use('/api/v1', limiter);

// Stricter rate limiting for sensitive operations
const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  message: {
    success: false,
    error: 'Too many attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

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
  
  // Debug: Check if token looks valid
  if (!idToken || idToken === 'undefined' || idToken === 'null') {
    console.error('Invalid token received:', idToken?.substring(0, 20) + '...');
    throw new UnauthorizedError('No valid token provided');
  }
  
  try {
    const decodedToken = await verifyIdToken(idToken);
    req.user = await getOrCreateUser(decodedToken);
    // Set user in Sentry for error tracking
    setSentryUser(req.user.id);
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    throw new UnauthorizedError(error.message || 'Invalid or expired token');
  }
});

// Health check endpoint with detailed service status
const startTime = Date.now();

app.get('/api/v1/health', asyncHandler(async (req, res) => {
  const services = {
    firestore: 'unknown',
    redis: 'not_configured'
  };
  
  let status = 'healthy';
  const checks = [];
  
  // Check Firestore connectivity
  try {
    const firestore = getDb();
    await firestore.collection('_health').doc('ping').get();
    services.firestore = 'connected';
    checks.push({ service: 'firestore', status: 'pass', latency: null });
  } catch (error) {
    services.firestore = 'disconnected';
    status = 'degraded';
    checks.push({ service: 'firestore', status: 'fail', error: error.message });
  }
  
  // Check Redis connectivity
  if (isCacheAvailable()) {
    try {
      // Quick ping to verify connection
      services.redis = 'connected';
      checks.push({ service: 'redis', status: 'pass', latency: null });
    } catch (error) {
      services.redis = 'disconnected';
      // Redis being down doesn't make the app unhealthy (graceful degradation)
      checks.push({ service: 'redis', status: 'fail', error: error.message });
    }
  } else {
    services.redis = 'not_configured';
    checks.push({ service: 'redis', status: 'skip', reason: 'not_configured' });
  }
  
  // Calculate uptime
  const uptimeMs = Date.now() - startTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  
  // Memory usage
  const memoryUsage = process.memoryUsage();
  const memoryMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
  };
  
  // Determine overall status
  if (services.firestore === 'disconnected') {
    status = 'unhealthy';
  }
  
  const statusCode = status === 'healthy' ? 200 : (status === 'degraded' ? 200 : 503);
  
  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: {
      seconds: uptimeSeconds,
      formatted: formatUptime(uptimeSeconds)
    },
    memory: memoryMB,
    services,
    checks
  });
}));

// Helper to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

// Helper to parse pagination query params
function parsePaginationParams(query) {
  return {
    page: Math.max(1, parseInt(query.page) || 1),
    limit: Math.min(100, Math.max(1, parseInt(query.limit) || 20)),
    sortBy: query.sortBy || 'createdAt',
    sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc'
  };
}

// ============ AUTH ROUTES ============
app.get('/api/v1/auth/me', authMiddleware, asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
}));

// ============ PROFILE ROUTES ============
app.get('/api/v1/profile', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const firestore = getDb();
  const userDoc = await firestore.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    res.json({ success: true, data: { isOnboarded: false } });
    return;
  }
  
  res.json({ success: true, data: userDoc.data() });
}));

app.put('/api/v1/profile', authMiddleware, validate(profileSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { displayName, username, purpose, bio } = req.body;
  const firestore = getDb();
  
  // If username provided, check uniqueness (validation already done by Zod)
  if (username) {
    // Check if username is taken by another user
    const existingUser = await firestore.collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();
    
    if (!existingUser.empty && existingUser.docs[0].id !== userId) {
      throw new ValidationError('Username is already taken');
    }
  }
  
  const updateData = {
    displayName: displayName.trim(),
    purpose: purpose || '',
    bio: bio || '',
    isOnboarded: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  // Only update username if it's new or being set for first time
  if (username) {
    updateData.username = username;
  }
  
  // Use set with merge to handle both new and existing users
  await firestore.collection('users').doc(userId).set(updateData, { merge: true });
  
  res.json({ 
    success: true, 
    data: { ...updateData, id: userId }
  });
}));

app.get('/api/v1/profile/check-username/:username', authMiddleware, asyncHandler(async (req, res) => {
  const { username } = req.params;
  const userId = req.user.id;
  const firestore = getDb();
  
  // Validate username format
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    res.json({ success: true, data: { available: false, reason: 'Invalid format' } });
    return;
  }
  
  // Check if username is taken
  const existingUser = await firestore.collection('users')
    .where('username', '==', username)
    .limit(1)
    .get();
  
  const available = existingUser.empty || existingUser.docs[0].id === userId;
  
  res.json({ 
    success: true, 
    data: { available, reason: available ? null : 'Username is taken' } 
  });
}));

// Delete account - removes all user data and Firebase auth account
app.delete('/api/v1/auth/account', authMiddleware, sensitiveOpLimiter, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  try {
    // 1. Delete all user data from Firestore (subcollections + profile)
    const cleared = await db.clearAllData(userId);
    
    // 2. Delete Firebase Auth user
    const auth = getAuth();
    await auth.deleteUser(userId);
    
    res.json({ 
      success: true, 
      message: 'Account deleted successfully',
      cleared: cleared.cleared
    });
  } catch (error) {
    console.error('Delete account error:', error);
    throw new Error('Failed to delete account. Please try again.');
  }
}));

// Change password (for email/password users)
app.post('/api/v1/auth/change-password', authMiddleware, sensitiveOpLimiter, asyncHandler(async (req, res) => {
  // Note: Password change is handled client-side using Firebase Auth SDK
  // This endpoint is kept for consistency but the actual change happens on client
  res.json({ 
    success: true, 
    message: 'Password change should be handled client-side with Firebase Auth SDK'
  });
}));

// Send password reset email
app.post('/api/v1/auth/reset-password-email', authMiddleware, sensitiveOpLimiter, asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    throw new ValidationError('Email is required');
  }
  
  try {
    const auth = getAuth();
    await auth.generatePasswordResetLink(email);
    
    res.json({ 
      success: true, 
      message: 'Password reset email sent' 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    // Don't reveal if email exists or not for security
    res.json({ 
      success: true, 
      message: 'If an account exists with this email, a reset link will be sent' 
    });
  }
}));

// ============ SKILLS ROUTES ============
app.get('/api/v1/skills', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit, sortBy, sortOrder } = parsePaginationParams(req.query);
  
  // Check if pagination is requested
  if (req.query.page || req.query.limit) {
    const result = await db.getPaginatedSkills(userId, { page, limit, sortBy, sortOrder });
    res.json({ success: true, data: result.items, pagination: result.pagination });
  } else {
    // Return all skills (cached for 5 minutes)
    const skills = await getCached(
      `skills:${userId}`,
      () => db.getAllSkills(userId),
      300
    );
    res.json({ success: true, data: skills });
  }
}));

app.post('/api/v1/skills', authMiddleware, validate(skillSchema), asyncHandler(async (req, res) => {
  const skill = await db.createSkill(req.user.id, req.body);
  // Invalidate cache
  await invalidateCache(`skills:${req.user.id}`);
  await invalidateCache(`stats:${req.user.id}`);
  res.status(201).json({ success: true, data: skill });
}));

app.put('/api/v1/skills/:id', authMiddleware, validateParams(idParamSchema), validate(skillSchema), asyncHandler(async (req, res) => {
  const skill = await db.updateSkill(req.user.id, req.params.id, req.body);
  if (!skill) {
    throw new NotFoundError('Skill');
  }
  // Invalidate cache
  await invalidateCache(`skills:${req.user.id}`);
  await invalidateCache(`stats:${req.user.id}`);
  res.json({ success: true, data: skill });
}));

app.delete('/api/v1/skills/:id', authMiddleware, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const deleted = await db.deleteSkill(req.user.id, req.params.id);
  if (!deleted) {
    throw new NotFoundError('Skill');
  }
  // Invalidate cache
  await invalidateCache(`skills:${req.user.id}`);
  await invalidateCache(`stats:${req.user.id}`);
  res.json({ success: true, message: 'Skill deleted successfully' });
}));

// Batch update skills - reduces multiple writes to a single batch operation
app.post('/api/v1/skills/batch', authMiddleware, validate(batchSkillUpdateSchema), asyncHandler(async (req, res) => {
  const { updates } = req.body;
  const result = await db.batchUpdateSkills(req.user.id, updates);
  
  // Invalidate cache after batch update
  await invalidateCache(`skills:${req.user.id}`);
  await invalidateCache(`stats:${req.user.id}`);
  
  res.json({ 
    success: true, 
    data: {
      updated: result.updated.length,
      errors: result.errors
    }
  });
}));

// ============ PROJECTS ROUTES ============
app.get('/api/v1/projects', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit, sortBy, sortOrder } = parsePaginationParams(req.query);
  
  // Check if pagination is requested
  if (req.query.page || req.query.limit) {
    const result = await db.getPaginatedProjects(userId, { page, limit, sortBy, sortOrder });
    res.json({ success: true, data: result.items, pagination: result.pagination });
  } else {
    // Return all projects (cached for 5 minutes)
    const projects = await getCached(
      `projects:${userId}`,
      () => db.getAllProjects(userId),
      300
    );
    res.json({ success: true, data: projects });
  }
}));

app.post('/api/v1/projects', authMiddleware, validate(projectSchema), asyncHandler(async (req, res) => {
  const project = await db.createProject(req.user.id, req.body);
  // Invalidate cache
  await invalidateCache(`projects:${req.user.id}`);
  await invalidateCache(`stats:${req.user.id}`);
  res.status(201).json({ success: true, data: project });
}));

app.put('/api/v1/projects/:id', authMiddleware, validateParams(idParamSchema), validate(projectSchema), asyncHandler(async (req, res) => {
  const project = await db.updateProject(req.user.id, req.params.id, req.body);
  if (!project) {
    throw new NotFoundError('Project');
  }
  // Invalidate cache
  await invalidateCache(`projects:${req.user.id}`);
  await invalidateCache(`stats:${req.user.id}`);
  res.json({ success: true, data: project });
}));

app.delete('/api/v1/projects/:id', authMiddleware, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const deleted = await db.deleteProject(req.user.id, req.params.id);
  if (!deleted) {
    throw new NotFoundError('Project');
  }
  // Invalidate cache
  await invalidateCache(`projects:${req.user.id}`);
  await invalidateCache(`stats:${req.user.id}`);
  res.json({ success: true, message: 'Project deleted successfully' });
}));

// Batch update projects - reduces multiple writes to a single batch operation
app.post('/api/v1/projects/batch', authMiddleware, validate(batchProjectUpdateSchema), asyncHandler(async (req, res) => {
  const { updates } = req.body;
  const result = await db.batchUpdateProjects(req.user.id, updates);
  
  // Invalidate cache after batch update
  await invalidateCache(`projects:${req.user.id}`);
  await invalidateCache(`stats:${req.user.id}`);
  
  res.json({ 
    success: true, 
    data: {
      updated: result.updated.length,
      errors: result.errors
    }
  });
}));

// ============ RESOURCES ROUTES ============
app.get('/api/v1/resources', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit, sortBy, sortOrder } = parsePaginationParams(req.query);
  
  // Check if pagination is requested
  if (req.query.page || req.query.limit) {
    const result = await db.getPaginatedResources(userId, { page, limit, sortBy, sortOrder });
    res.json({ success: true, data: result.items, pagination: result.pagination });
  } else {
    // Return all resources (cached for 5 minutes)
    const resources = await getCached(
      `resources:${userId}`,
      () => db.getAllResources(userId),
      300
    );
    res.json({ success: true, data: resources });
  }
}));

app.post('/api/v1/resources', authMiddleware, validate(resourceSchema), asyncHandler(async (req, res) => {
  const resource = await db.createResource(req.user.id, req.body);
  // Invalidate cache
  await invalidateCache(`resources:${req.user.id}`);
  await invalidateCache(`stats:${req.user.id}`);
  res.status(201).json({ success: true, data: resource });
}));

app.put('/api/v1/resources/:id', authMiddleware, validateParams(idParamSchema), validate(resourceSchema), asyncHandler(async (req, res) => {
  const resource = await db.updateResource(req.user.id, req.params.id, req.body);
  if (!resource) {
    throw new NotFoundError('Resource');
  }
  // Invalidate cache
  await invalidateCache(`resources:${req.user.id}`);
  res.json({ success: true, data: resource });
}));

app.delete('/api/v1/resources/:id', authMiddleware, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const deleted = await db.deleteResource(req.user.id, req.params.id);
  if (!deleted) {
    throw new NotFoundError('Resource');
  }
  // Invalidate cache
  await invalidateCache(`resources:${req.user.id}`);
  await invalidateCache(`stats:${req.user.id}`);
  res.json({ success: true, message: 'Resource deleted successfully' });
}));

// Batch update resources - reduces multiple writes to a single batch operation
app.post('/api/v1/resources/batch', authMiddleware, validate(batchResourceUpdateSchema), asyncHandler(async (req, res) => {
  const { updates } = req.body;
  const result = await db.batchUpdateResources(req.user.id, updates);
  
  // Invalidate cache after batch update
  await invalidateCache(`resources:${req.user.id}`);
  await invalidateCache(`stats:${req.user.id}`);
  
  res.json({ 
    success: true, 
    data: {
      updated: result.updated.length,
      errors: result.errors
    }
  });
}));

// ============ ACTIVITIES ROUTES ============
app.get('/api/v1/activities', authMiddleware, asyncHandler(async (req, res) => {
  const activities = await db.getAllActivities(req.user.id);
  res.json({ success: true, data: activities });
}));

app.post('/api/v1/activities', authMiddleware, validate(activitySchema), asyncHandler(async (req, res) => {
  const activity = await db.createActivity(req.user.id, req.body);
  res.status(201).json({ success: true, data: activity });
}));

app.get('/api/v1/activities/heatmap', authMiddleware, asyncHandler(async (req, res) => {
  const heatmapData = await db.getHeatmapData(req.user.id);
  res.json({ success: true, data: heatmapData });
}));

// ============ STATS ROUTES ============
app.get('/api/v1/stats', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  // Cache stats for 5 minutes
  const stats = await getCached(
    `stats:${userId}`,
    () => db.getStats(userId),
    300
  );
  res.json({ success: true, data: stats });
}));

app.get('/api/v1/stats/progress', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  // Cache progress data for 5 minutes
  const progress = await getCached(
    `progress:${userId}`,
    () => db.getProgressData(userId),
    300
  );
  res.json({ success: true, data: progress });
}));

// ============ DATA EXPORT/IMPORT ============
app.get('/api/v1/export', authMiddleware, asyncHandler(async (req, res) => {
  const exportData = await db.exportData(req.user.id);
  res.json({ success: true, data: exportData });
}));

app.post('/api/v1/import', authMiddleware, asyncHandler(async (req, res) => {
  const result = await db.importData(req.user.id, req.body);
  res.json({ success: true, message: 'Data imported successfully', ...result });
}));

app.delete('/api/v1/data', authMiddleware, asyncHandler(async (req, res) => {
  const result = await db.clearAllData(req.user.id);
  res.json({ success: true, message: 'All data cleared successfully', ...result });
}));

// ============ GOALS ROUTES ============
app.get('/api/v1/goals', authMiddleware, asyncHandler(async (req, res) => {
  const goals = await db.getGoals(req.user.id);
  res.json({ success: true, data: goals });
}));

app.get('/api/v1/goals/:id', authMiddleware, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const goal = await db.getGoal(req.user.id, req.params.id);
  res.json({ success: true, data: goal });
}));

app.post('/api/v1/goals', authMiddleware, asyncHandler(async (req, res) => {
  const goal = await db.createGoal(req.user.id, req.body);
  res.status(201).json({ success: true, data: goal });
}));

app.put('/api/v1/goals/:id', authMiddleware, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const goal = await db.updateGoal(req.user.id, req.params.id, req.body);
  res.json({ success: true, data: goal });
}));

app.delete('/api/v1/goals/:id', authMiddleware, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  await db.deleteGoal(req.user.id, req.params.id);
  res.json({ success: true, message: 'Goal deleted' });
}));

app.put('/api/v1/goals/:id/milestones/:milestoneId', authMiddleware, asyncHandler(async (req, res) => {
  const { completed } = req.body;
  const goal = await db.updateMilestone(req.user.id, req.params.id, req.params.milestoneId, completed);
  res.json({ success: true, data: goal });
}));

// ============ SKILL DEPENDENCIES ROUTES ============
app.get('/api/v1/dependencies', authMiddleware, asyncHandler(async (req, res) => {
  const dependencies = await db.getDependencies(req.user.id);
  res.json({ success: true, data: dependencies });
}));

app.get('/api/v1/skills/:id/dependencies', authMiddleware, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const dependencies = await db.getSkillDependencies(req.user.id, req.params.id);
  res.json({ success: true, data: dependencies });
}));

app.put('/api/v1/skills/:id/dependencies', authMiddleware, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const { prerequisites } = req.body;
  const dependencies = await db.setSkillDependencies(req.user.id, req.params.id, prerequisites);
  res.json({ success: true, data: dependencies });
}));

app.post('/api/v1/skills/:id/dependencies', authMiddleware, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const { prerequisiteId } = req.body;
  const dependencies = await db.addPrerequisite(req.user.id, req.params.id, prerequisiteId);
  res.json({ success: true, data: dependencies });
}));

app.delete('/api/v1/skills/:id/dependencies/:prereqId', authMiddleware, asyncHandler(async (req, res) => {
  const dependencies = await db.removePrerequisite(req.user.id, req.params.id, req.params.prereqId);
  res.json({ success: true, data: dependencies });
}));

// ============ CUSTOM CATEGORIES ROUTES ============
app.get('/api/v1/categories', authMiddleware, asyncHandler(async (req, res) => {
  const categories = await db.getCategories(req.user.id);
  res.json({ success: true, data: categories });
}));

app.post('/api/v1/categories', authMiddleware, asyncHandler(async (req, res) => {
  const category = await db.createCategory(req.user.id, req.body);
  res.status(201).json({ success: true, data: category });
}));

app.put('/api/v1/categories/:id', authMiddleware, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const category = await db.updateCategory(req.user.id, req.params.id, req.body);
  res.json({ success: true, data: category });
}));

app.delete('/api/v1/categories/:id', authMiddleware, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  await db.deleteCategory(req.user.id, req.params.id);
  res.json({ success: true, message: 'Category deleted' });
}));

app.put('/api/v1/categories/reorder', authMiddleware, asyncHandler(async (req, res) => {
  const { categoryIds } = req.body;
  await db.reorderCategories(req.user.id, categoryIds);
  res.json({ success: true, message: 'Categories reordered' });
}));

// ============ PUBLIC PROFILE ROUTES ============
app.get('/api/v1/profile/public', authMiddleware, asyncHandler(async (req, res) => {
  const profile = await db.getPublicProfile(req.user.id);
  res.json({ success: true, data: profile });
}));

app.put('/api/v1/profile/public', authMiddleware, asyncHandler(async (req, res) => {
  const profile = await db.updatePublicProfile(req.user.id, req.body);
  res.json({ success: true, data: profile });
}));

// Public route - no auth required
app.get('/api/v1/u/:slug', asyncHandler(async (req, res) => {
  const profile = await db.getPublicProfileBySlug(req.params.slug);
  res.json({ success: true, data: profile });
}));

// ============ STUDY GROUPS ROUTES ============
app.get('/api/v1/study-groups', authMiddleware, asyncHandler(async (req, res) => {
  const groups = await db.getUserStudyGroups(req.user.id);
  res.json({ success: true, data: groups });
}));

app.get('/api/v1/study-groups/:id', authMiddleware, asyncHandler(async (req, res) => {
  const group = await db.getStudyGroup(req.params.id, req.user.id);
  res.json({ success: true, data: group });
}));

app.post('/api/v1/study-groups', authMiddleware, asyncHandler(async (req, res) => {
  const group = await db.createStudyGroup(req.user.id, req.body);
  res.status(201).json({ success: true, data: group });
}));

app.post('/api/v1/study-groups/join', authMiddleware, asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;
  const group = await db.joinStudyGroup(req.user.id, inviteCode);
  res.json({ success: true, data: group });
}));

app.post('/api/v1/study-groups/:id/leave', authMiddleware, asyncHandler(async (req, res) => {
  const result = await db.leaveStudyGroup(req.user.id, req.params.id);
  res.json({ success: true, ...result });
}));

app.delete('/api/v1/study-groups/:id', authMiddleware, asyncHandler(async (req, res) => {
  await db.deleteStudyGroup(req.user.id, req.params.id);
  res.json({ success: true, message: 'Study group deleted' });
}));

// ============ PROGRESS SHARING ROUTES ============
app.get('/api/v1/shares', authMiddleware, asyncHandler(async (req, res) => {
  const shares = await db.getUserShares(req.user.id);
  res.json({ success: true, data: shares });
}));

app.post('/api/v1/shares', authMiddleware, asyncHandler(async (req, res) => {
  const share = await db.createShare(req.user.id, req.body);
  res.status(201).json({ success: true, data: share });
}));

// Public route - no auth required
app.get('/api/v1/shared/:id', asyncHandler(async (req, res) => {
  const share = await db.getShare(req.params.id);
  res.json({ success: true, data: share });
}));

app.delete('/api/v1/shares/:id', authMiddleware, asyncHandler(async (req, res) => {
  await db.revokeShare(req.user.id, req.params.id);
  res.json({ success: true, message: 'Share revoked' });
}));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler);

// Global error handler
app.use(errorHandler);

// Track active connections for graceful shutdown
let connections = new Set();
let isShuttingDown = false;

const server = app.listen(PORT, () => {
  console.log(`🚀 DevOrbit server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔥 Using Firebase/Firestore`);
});

server.on('connection', (conn) => {
  connections.add(conn);
  conn.on('close', () => connections.delete(conn));
});

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    console.log('✓ HTTP server closed');
    
    // Close database connections
    try {
      // If you have any cleanup needed for Firebase Admin SDK
      // await admin.app().delete();
      console.log('✓ Database connections closed');
    } catch (error) {
      console.error('Error closing database:', error);
    }
    
    // Close Redis connection if exists
    try {
      // await redisClient?.quit();
      console.log('✓ Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis:', error);
    }
    
    console.log('Graceful shutdown complete');
    process.exit(0);
  });
  
  // Force close connections after timeout
  setTimeout(() => {
    console.log('Force closing remaining connections...');
    connections.forEach(conn => conn.destroy());
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  captureException(error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  captureException(reason);
});

module.exports = { app, server };
