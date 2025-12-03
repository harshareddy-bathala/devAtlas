import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';
import type { User } from '../types/index.js';

const logger = createLogger('auth');

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedError('Invalid authorization format. Use: Bearer <token>');
    }

    // Verify token with Supabase
    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !supabaseUser) {
      logger.warn({
        msg: 'Token verification failed',
        error: error?.message,
      });
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Get or create user in our database
    let user = await prisma.user.findUnique({
      where: { email: supabaseUser.email! },
    });

    if (!user) {
      // Create user on first login
      user = await prisma.user.create({
        data: {
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
          avatarUrl: supabaseUser.user_metadata?.avatar_url,
          provider: supabaseUser.app_metadata?.provider || 'email',
          providerId: supabaseUser.id,
        },
      });

      logger.info({
        msg: 'New user created',
        userId: user.id,
        email: user.email,
        provider: user.provider,
      });
    } else {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    next(error);
  }
}

// Optional auth - doesn't fail if no token, but attaches user if present
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      return next();
    }

    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser(token);

    if (supabaseUser) {
      const user = await prisma.user.findUnique({
        where: { email: supabaseUser.email! },
      });

      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    }

    next();
  } catch {
    // Silently continue without auth
    next();
  }
}

// Role-based access control
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
}
