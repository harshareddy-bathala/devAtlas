import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authRateLimiter, passwordResetLimiter } from '../middleware/rate-limit.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createLogger } from '../lib/logger.js';
import { z } from 'zod';

const logger = createLogger('auth');
export const authRouter = Router();

// Schemas
const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(100).optional(),
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Sign up with email/password
authRouter.post(
  '/signup',
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = signUpSchema.parse(req.body);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      logger.warn({ msg: 'Signup failed', email, error: error.message });
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'AUTH_ERROR',
      });
      return;
    }

    logger.info({ msg: 'User signed up', email });

    res.status(201).json({
      success: true,
      data: {
        user: data.user,
        session: data.session,
        message: 'Please check your email to verify your account',
      },
    });
  })
);

// Sign in with email/password
authRouter.post(
  '/signin',
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = signInSchema.parse(req.body);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.warn({ msg: 'Signin failed', email, error: error.message });
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    logger.info({ msg: 'User signed in', email });

    res.json({
      success: true,
      data: {
        user: data.user,
        session: data.session,
      },
    });
  })
);

// Sign in with OAuth provider
authRouter.post(
  '/oauth/:provider',
  asyncHandler(async (req: Request, res: Response) => {
    const provider = req.params.provider as 'github' | 'google';
    const redirectTo = req.body.redirectTo || `${process.env.CLIENT_URL}/auth/callback`;

    if (!['github', 'google'].includes(provider)) {
      res.status(400).json({
        success: false,
        error: 'Invalid OAuth provider',
        code: 'INVALID_PROVIDER',
      });
      return;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        scopes: provider === 'github' ? 'read:user user:email' : undefined,
      },
    });

    if (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'OAUTH_ERROR',
      });
      return;
    }

    res.json({
      success: true,
      data: { url: data.url },
    });
  })
);

// Sign out
authRouter.post(
  '/signout',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (token) {
      await supabase.auth.signOut();
    }

    logger.info({ msg: 'User signed out', userId: req.userId });

    res.json({
      success: true,
      message: 'Signed out successfully',
    });
  })
);

// Get current user
authRouter.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        theme: true,
        preferences: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  })
);

// Update current user
authRouter.patch(
  '/me',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const updateSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      theme: z.enum(['DARK', 'LIGHT', 'SYSTEM']).optional(),
      preferences: z.record(z.unknown()).optional(),
    });

    const data = updateSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        theme: true,
        preferences: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  })
);

// Request password reset
authRouter.post(
  '/reset-password',
  passwordResetLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = resetPasswordSchema.parse(req.body);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CLIENT_URL}/auth/reset-password`,
    });

    if (error) {
      logger.warn({ msg: 'Password reset request failed', email, error: error.message });
    }

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link',
    });
  })
);

// Update password (after reset)
authRouter.post(
  '/update-password',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { password } = updatePasswordSchema.parse(req.body);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'PASSWORD_UPDATE_ERROR',
      });
      return;
    }

    logger.info({ msg: 'Password updated', userId: req.userId });

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  })
);

// Refresh session
authRouter.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN',
      });
      return;
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        session: data.session,
        user: data.user,
      },
    });
  })
);
