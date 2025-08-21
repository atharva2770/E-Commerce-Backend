import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let errorCode = 'INTERNAL_ERROR';

  // Log error for debugging
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        message = 'A record with this unique field already exists';
        errorCode = 'DUPLICATE_ENTRY';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        errorCode = 'NOT_FOUND';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Foreign key constraint failed';
        errorCode = 'FOREIGN_KEY_CONSTRAINT';
        break;
      default:
        statusCode = 400;
        message = 'Database operation failed';
        errorCode = 'DATABASE_ERROR';
    }
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
    errorCode = 'VALIDATION_ERROR';
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    errorCode = 'INVALID_TOKEN';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    errorCode = 'TOKEN_EXPIRED';
  }

  // Handle Cast errors (MongoDB-like, but keeping for compatibility)
  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    errorCode = 'INVALID_ID';
  }

  // Handle duplicate key errors
  if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
    statusCode = 409;
    message = 'Duplicate entry';
    errorCode = 'DUPLICATE_ENTRY';
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
  }

  // Handle unauthorized errors
  if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized access';
    errorCode = 'UNAUTHORIZED';
  }

  // Handle forbidden errors
  if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Access forbidden';
    errorCode = 'FORBIDDEN';
  }

  // Handle not found errors
  if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
    errorCode = 'NOT_FOUND';
  }

  // Handle rate limit errors
  if (error.name === 'RateLimitError') {
    statusCode = 429;
    message = 'Too many requests';
    errorCode = 'RATE_LIMIT_EXCEEDED';
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(process.env['NODE_ENV'] === 'development' && {
        stack: error.stack,
        details: error,
      }),
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const throwError = (message: string, statusCode: number = 500): never => {
  throw new CustomError(message, statusCode);
};
