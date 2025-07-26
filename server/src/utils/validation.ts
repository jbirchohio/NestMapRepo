import { z } from 'zod';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/custom-request';

// Common validation schemas
export const paginationSchema = z.object({
  page: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().positive().default(1)
  ),
  limit: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().positive().max(100).default(10)
  ),
});

export const idParamSchema = z.object({
  id: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().positive()
  ),
});

// User-related schemas
export const userSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  ),
  role: z.enum(['user', 'admin']).default('user'),
  organizationId: z.number().int().positive().optional(),
});

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Validation middleware
export const validate = (schema: z.ZodSchema) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
    try {
      // Validate request body, query, and params
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        return res.status(400).json({
          error: 'Validation Error',
          details: result.error.errors,
          requestId: req.requestId,
        });
      }

      // Replace with validated data
      req.body = result.data.body || {};
      req.query = result.data.query || {};
      req.params = result.data.params || {};

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Type utilities
export type Pagination = z.infer<typeof paginationSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

