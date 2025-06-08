import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { rateLimiterMiddleware } from '../middleware/rateLimit';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Define validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const refreshTokenSchema = z.object({
  refreshToken: z.string()
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

// Public routes
router.post(
  '/login',
  rateLimiterMiddleware,
  validateRequest({ body: loginSchema }),
  authController.login
);

router.post(
  '/refresh-token',
  rateLimiterMiddleware,
  validateRequest({ body: refreshTokenSchema }),
  authController.refreshToken
);

// Protected routes (require authentication)
router.post('/logout', authController.logout);

// Password reset routes
router.post(
  '/forgot-password',
  rateLimiterMiddleware,
  validateRequest({ body: forgotPasswordSchema }),
  (_req: import('express').Request, res: import('express').Response) => 
    res.status(501).json({ message: 'Not implemented' })
);

router.post(
  '/reset-password',
  rateLimiterMiddleware,
  validateRequest({ body: resetPasswordSchema }),
  (_req: import('express').Request, res: import('express').Response) => 
    res.status(501).json({ message: 'Not implemented' })
);

export default router;
