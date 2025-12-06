require('dotenv').config();

// Initialize Sentry FIRST - before any other imports for proper instrumentation
const { initSentry, setupSentryErrorHandler, setSentryUser, captureException, addBreadcrumb } = require('./sentry');
initSentry();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { initializeFirebase, verifyIdToken, getOrCreateUser, getAuth, getDb, admin } = require('./firebase');
const db = require('./db'); // Use new modular database layer
const { getCached, invalidateCache, invalidateUserCache, isCacheAvailable, testCacheHealth } = require('./cache');
const { skillSchema, projectSchema, resourceSchema, activitySchema, idParamSchema, profileSchema, paginationSchema } = require('./validation');
const { validate, validateParams, validateQuery, asyncHandler, errorHandler, requestLogger, sanitize, requestIdMiddleware } = require('./middleware');
const { NotFoundError, UnauthorizedError, ValidationError } = require('./errors');

const app = express();
const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== 'production';

// Trust proxy - important for accurate IP detection behind reverse proxies (DigitalOcean, etc.)
// This allows express-rate-limit to correctly identify client IPs from X-Forwarded-For header
app.set('trust proxy', 1);

// Initialize Firebase
initializeFirebase();

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
  const cspConfig = {
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
    objectSrc: ["'none'"]
  };
  
  // Only add upgradeInsecureRequests in production
  if (!isDev) {
    cspConfig.upgradeInsecureRequests = [];
  }
  
  helmet({
    contentSecurityPolicy: {
      directives: cspConfig
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
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
      // Perform actual health check using testCacheHealth
      const cacheHealth = await testCacheHealth();
      if (cacheHealth.status === 'connected') {
        services.redis = 'connected';
        checks.push({ 
          service: 'redis', 
          status: 'pass', 
          latency: null,
          type: cacheHealth.type 
        });
      } else {
        services.redis = 'disconnected';
        checks.push({ 
          service: 'redis', 
          status: 'fail', 
          error: cacheHealth.test,
          type: cacheHealth.type 
        });
      }
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

// Dedicated cache health check endpoint
app.get('/api/v1/cache-health', asyncHandler(async (req, res) => {
  const cacheHealth = await testCacheHealth();
  res.json({
    success: true,
    data: cacheHealth
  });
}));

// Sentry test endpoint - triggers a test error for verification
app.get('/api/v1/sentry-test', asyncHandler(async (req, res) => {
  // This will be caught by Sentry error handler
  throw new Error('Sentry test error from DevOrbit backend');
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

// 404 handler with helpful API version message
app.use((req, res) => {
  // Check if the request is to /api/ without /v1
  if (req.path.startsWith('/api/') && !req.path.startsWith('/api/v1/')) {
    return res.status(404).json({ 
      success: false, 
      error: 'API version required. Use /api/v1/ prefix',
      code: 'API_VERSION_MISSING',
      hint: 'Update VITE_API_URL to include /v1 (e.g., http://localhost:3001/api/v1)'
    });
  }
  
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Sentry error handler (must be before other error handlers)
// In Sentry v8+, we use setupExpressErrorHandler instead of middleware
setupSentryErrorHandler(app);

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 DevOrbit server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔥 Using Firebase/Firestore`);
});
