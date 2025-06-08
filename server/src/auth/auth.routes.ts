import { Router } from 'express';
import { body } from 'express-validator';
import { 
  login, 
  refreshToken, 
  logout, 
  logoutAllDevices, 
  requestPasswordReset, 
  resetPassword 
} from './auth.controller';
import { authenticate } from './middleware';
import { validateRequest } from '../../middleware/validate-request';

const router = Router();

// Public routes
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email must be valid'),
    body('password').trim().notEmpty().withMessage('You must supply a password')
  ],
  validateRequest,
  login
);

router.post(
  '/refresh-token',
  refreshToken
);

router.post(
  '/request-password-reset',
  [
    body('email').isEmail().withMessage('Email must be valid')
  ],
  validateRequest,
  requestPasswordReset
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  validateRequest,
  resetPassword
);

// Protected routes
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAllDevices);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { router as authRouter };
