import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('error-handler');

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Array<{ field: string; message: string }>;
  stack?: string;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  // Log the error
  logger.error({
    msg: 'Request error',
    error: err.message,
    code: err instanceof AppError ? err.code : 'UNKNOWN',
    path: req.path,
    method: req.method,
    stack: isProduction ? undefined : err.stack,
  });

  // Handle known operational errors
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: err.message,
      code: err.code,
    };

    if (err.errors) {
      response.details = err.errors;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    };

    res.status(400).json(response);
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as { code?: string; meta?: { target?: string[] } };
    let message = 'Database operation failed';
    let statusCode = 500;

    if (prismaError.code === 'P2002') {
      message = `Unique constraint violation on ${prismaError.meta?.target?.join(', ') || 'field'}`;
      statusCode = 409;
    } else if (prismaError.code === 'P2025') {
      message = 'Record not found';
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      error: message,
      code: 'DATABASE_ERROR',
    });
    return;
  }

  // Handle unknown errors
  const response: ErrorResponse = {
    success: false,
    error: isProduction ? 'An unexpected error occurred' : err.message,
    code: 'INTERNAL_ERROR',
  };

  if (!isProduction) {
    response.stack = err.stack;
  }

  res.status(500).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
}

// Async handler wrapper
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
