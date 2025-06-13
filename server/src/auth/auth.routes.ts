import { Router } from 'express';

import { 
  login, 
  refreshToken, 
  logout, 
  logoutAllDevices, 
  requestPasswordReset, 
  resetPassword 
} from './auth.controller';
import { authenticate } from './middleware';
import { validateAndSanitizeRequest } from '../../middleware/inputValidation';
import { loginSchema, requestPasswordResetSchema, resetPasswordSchema, refreshTokenSchema, logoutSchema } from './dtos/auth.dto';

const router = Router();

// Public routes
router.post(
  '/login',
  validateAndSanitizeRequest({ body: loginSchema }),
  login
);

router.post(
  '/refresh-token',
  validateAndSanitizeRequest({ body: refreshTokenSchema }),
  refreshToken
);

router.post(
  '/request-password-reset',
  validateAndSanitizeRequest({ body: requestPasswordResetSchema }),
  requestPasswordReset
);

router.post(
  '/reset-password',
  validateAndSanitizeRequest({ body: resetPasswordSchema }),
  resetPassword
);

// Protected routes
router.post('/logout', authenticate, validateAndSanitizeRequest({ body: logoutSchema }), logout);
router.post('/logout-all', authenticate, logoutAllDevices);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { router as authRouter };
