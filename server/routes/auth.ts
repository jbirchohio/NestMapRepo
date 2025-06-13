import { Router } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthContainer } from '../src/auth/auth.container';

// Import validation schemas from DTOs to avoid duplication
import { 
  loginSchema, 
  refreshTokenSchema, 
  logoutSchema,
  requestPasswordResetSchema,
  resetPasswordSchema 
} from '../src/auth/dtos/auth.dto';

// Import middleware
import { authRateLimit } from '../../middleware/comprehensive-rate-limiting';
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
    validateRequest({ body: loginSchema }),
    ...authContainer.authController.login
  );

  // Refresh token route
  router.post(
    '/refresh-token',
    authRateLimit, // Apply comprehensive auth rate limiting
    validateRequest({ body: refreshTokenSchema }),
    ...authContainer.authController.refreshToken
  );

  // Logout route
  router.post(
    '/logout',
    authRateLimit, // Apply comprehensive auth rate limiting
    validateRequest({ body: logoutSchema }),
    ...authContainer.authController.logout
  );

  // Password reset routes
  router.post(
    '/forgot-password',
    authRateLimit, // Apply comprehensive auth rate limiting
    validateRequest({ body: requestPasswordResetSchema }),
    ...authContainer.authController.requestPasswordReset
  );

  router.post(
    '/reset-password',
    authRateLimit, // Apply comprehensive auth rate limiting
    validateRequest({ body: resetPasswordSchema }),
    ...authContainer.authController.resetPassword
  );

  return router;
};

// For backward compatibility
export default createAuthRouter;
