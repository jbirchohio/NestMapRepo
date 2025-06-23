import { Router } from 'express';
import type { ConfigService } from '@nestjs/config';
import { z } from 'zod';

// Import from src directory
import { authContainer } from '../src/auth/auth.container.js';
import { authRateLimit } from '../middleware/comprehensive-rate-limiting.js';

// Define auth schemas using Zod
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshTokenSchema = z.object({
  refreshToken: z.string()
});

const requestPasswordResetSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8)
});

const logoutSchema = z.object({
  refreshToken: z.string().optional()
});

// Define types for auth controller methods
type AuthController = {
  login: [
    (req: any, res: any, next: any) => Promise<void>,
    (req: any, res: any, next: any) => Promise<void>
  ];
  refreshToken: [(req: any, res: any, next: any) => Promise<void>];
  logout: [(req: any, res: any, next: any) => Promise<void>];
  requestPasswordReset: [(req: any, res: any, next: any) => Promise<void>];
  resetPassword: [(req: any, res: any, next: any) => Promise<void>];
};
// Request validation middleware
const validateRequest = (schema: z.ZodSchema) => 
  (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };

export const createAuthRouter = (): Router => {
    const router = Router();
    
    // Get auth controller from the singleton container
    const authController = authContainer.authController;
    
    // Register auth routes
    // Login route
    router.post('/login', 
      authRateLimit, // Apply comprehensive auth rate limiting
      validateRequest(loginSchema), 
      ...authController.login
    );
    
    // Refresh token route
    router.post('/refresh-token', 
      authRateLimit, // Apply comprehensive auth rate limiting
      validateRequest(refreshTokenSchema), 
      ...authController.refreshToken
    );
    
    // Logout route
    router.post('/logout', 
      authRateLimit, // Apply comprehensive auth rate limiting
      validateRequest(logoutSchema), 
      ...authController.logout
    );
    
    // Request password reset route
    router.post('/request-password-reset', 
      authRateLimit, // Apply comprehensive auth rate limiting
      validateRequest(requestPasswordResetSchema), 
      ...authController.requestPasswordReset
    );
    
    // Reset password route
    router.post('/reset-password', 
      authRateLimit, // Apply comprehensive auth rate limiting
      validateRequest(resetPasswordSchema), 
      ...authController.resetPassword
    );
    
    return router;
};
// For backward compatibility
export default createAuthRouter;
