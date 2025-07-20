import { Router } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthContainer } from '../src/auth/auth.container';

// Import validation schemas from DTOs to avoid duplication
import { 
  loginSchema,
  registerSchema,
  refreshTokenSchema, 
  logoutSchema,
  requestPasswordResetSchema,
  resetPasswordSchema 
} from '../src/auth/validation/auth.schemas';

// Import middleware
import { authRateLimit } from '../middleware/comprehensive-rate-limiting';
import { validateRequest } from '../src/auth/middleware/validation.middleware';

export const createAuthRouter = (configService: ConfigService): Router => {
  const router = Router();
  
  // Initialize auth container with required dependencies
  const authContainer = new AuthContainer({
    configService,
  });

  // Register auth routes
  // Login route
  router.post(
    '/login',
    authRateLimit, // Apply comprehensive auth rate limiting
    validateRequest(loginSchema),
    ...authContainer.authController.login
  );

  // Register route
  router.post(
    '/register',
    authRateLimit, // Apply comprehensive auth rate limiting
    validateRequest(registerSchema),
    ...authContainer.authController.register
  );

  // Refresh token route
  router.post(
    '/refresh-token',
    authRateLimit, // Apply comprehensive auth rate limiting
    validateRequest(refreshTokenSchema),
    ...authContainer.authController.refreshToken
  );

  // Logout route
  router.post(
    '/logout',
    authRateLimit, // Apply comprehensive auth rate limiting
    validateRequest(logoutSchema),
    ...authContainer.authController.logout
  );

  // Password reset routes
  router.post(
    '/forgot-password',
    authRateLimit, // Apply comprehensive auth rate limiting
    validateRequest(requestPasswordResetSchema),
    ...authContainer.authController.requestPasswordReset
  );

  router.post(
    '/reset-password',
    authRateLimit, // Apply comprehensive auth rate limiting
    validateRequest(resetPasswordSchema),
    ...authContainer.authController.resetPassword
  );

  return router;
};

// For backward compatibility
export default createAuthRouter;
