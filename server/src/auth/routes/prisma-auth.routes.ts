import { Router } from 'express';
import { prismaAuthController } from '../controllers/prisma-auth.controller.js';
import { prismaAuthAdapter } from '../prisma-auth.adapter.js';
import { validate } from '../../middleware/validation.middleware.js';
import { 
  loginSchema, 
  registerSchema, 
  changePasswordSchema, 
  requestPasswordResetSchema, 
  resetPasswordSchema 
} from '@shared/validations/auth.schemas.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterDto'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/register', validate(registerSchema), prismaAuthController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginDto'
 *     responses:
 *       200:
 *         description: Authentication successful
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: refreshToken=abc123; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(loginSchema), prismaAuthController.login);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: refreshToken=abc123; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh-token', prismaAuthController.refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out the current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 */
router.post('/logout', prismaAuthController.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/me',
  prismaAuthAdapter.authenticate(),
  prismaAuthController.getCurrentUser
);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordDto'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 */
router.post(
  '/change-password',
  prismaAuthAdapter.authenticate(),
  validate(changePasswordSchema),
  prismaAuthController.changePassword
);

/**
 * @swagger
 * /auth/request-password-reset:
 *   post:
 *     summary: Request password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RequestPasswordResetDto'
 *     responses:
 *       200:
 *         description: If the email exists, a reset link has been sent
 */
router.post(
  '/request-password-reset',
  validate(requestPasswordResetSchema),
  prismaAuthController.requestPasswordReset
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordDto'
 *     responses:
 *       200:
 *         description: Password has been reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  prismaAuthController.resetPassword
);

export default router;
