import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { rateLimiter } from './middleware/rate-limit.middleware.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { skillsRouter } from './routes/skills.routes.js';
import { projectsRouter } from './routes/projects.routes.js';
import { resourcesRouter } from './routes/resources.routes.js';
import { activitiesRouter } from './routes/activities.routes.js';
import { tagsRouter } from './routes/tags.routes.js';
import { timeEntriesRouter } from './routes/time-entries.routes.js';
import { statsRouter } from './routes/stats.routes.js';
import type { Application } from 'express';

const app: Application = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet for security headers
app.use(
  helmet({
    contentSecurityPolicy: isProduction,
    crossOriginEmbedderPolicy: isProduction,
  })
);

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// Trust proxy for rate limiting behind reverse proxy
if (isProduction) {
  app.set('trust proxy', 1);
}

// ============================================
// PARSING & LOGGING
// ============================================

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging with Pino
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req: any) => req.url === '/api/health',
    },
    customLogLevel: (_req: any, res: any, err: any) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req: any, res: any) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (_req: any, res: any, err: any) => {
      return `Request failed: ${err?.message || res.statusCode}`;
    },
  })
);

// ============================================
// RATE LIMITING
// ============================================

// Apply rate limiting to API routes
app.use('/api', rateLimiter);

// ============================================
// ROUTES
// ============================================

// Public routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

// Protected routes (require authentication)
app.use('/api/skills', authMiddleware, skillsRouter);
app.use('/api/projects', authMiddleware, projectsRouter);
app.use('/api/resources', authMiddleware, resourcesRouter);
app.use('/api/activities', authMiddleware, activitiesRouter);
app.use('/api/tags', authMiddleware, tagsRouter);
app.use('/api/time-entries', authMiddleware, timeEntriesRouter);
app.use('/api/stats', authMiddleware, statsRouter);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// SERVER START
// ============================================

const server = app.listen(PORT, () => {
  logger.info({
    msg: '🚀 DevOrbit server started',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
  });
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info({ msg: `${signal} received, shutting down gracefully...` });
  server.close(() => {
    logger.info({ msg: 'HTTP server closed' });
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error({ msg: 'Forced shutdown after timeout' });
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app };
