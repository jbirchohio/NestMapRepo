import { Router } from 'express';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { authenticate } from './middleware';
import { validateAndSanitizeRequest } from '../../middleware/inputValidation';
import { loginSchema, requestPasswordResetSchema, resetPasswordSchema, refreshTokenSchema, logoutSchema } from './dtos/auth.dto';

const router = Router();

// Initialize services and controllers
const authService = new AuthService();
const authController = new AuthController(authService);

// Public routes
router.post(
  '/login',
  validateAndSanitizeRequest({ body: loginSchema }),
  ...authController.login
);

router.post(
  '/refresh-token',
  validateAndSanitizeRequest({ body: refreshTokenSchema }),
  ...authController.refreshToken
);

router.post(
  '/request-password-reset',
  validateAndSanitizeRequest({ body: requestPasswordResetSchema }),
  ...authController.requestPasswordReset
);

router.post(
  '/reset-password',
  validateAndSanitizeRequest({ body: resetPasswordSchema }),
  ...authController.resetPassword
);

// Protected routes
router.post('/logout', authenticate, validateAndSanitizeRequest({ body: logoutSchema }), ...authController.logout);
router.post('/logout-all', authenticate, ...authController.logoutAllDevices);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { router as authRouter };
