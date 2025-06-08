import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { generateAuthTokens, verifyToken, revokeToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { rateLimiterMiddleware } from '../middleware/rateLimit';

// Input validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

// Schema for user registration (unused but kept for reference)
// const registerSchema = z.object({
//   email: z.string().email('Invalid email address'),
//   username: z.string().min(3, 'Username must be at least 3 characters long'),
//   firstName: z.string().optional(),
//   lastName: z.string().optional(),
//   password: z.string().min(8, 'Password must be at least 8 characters long'),
//   organizationName: z.string().optional(),
// });

// Response types
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified: boolean;
  };
}

/**
 * Login user
 */
const login = [
  validateRequest({ body: loginSchema }),
  rateLimiterMiddleware,
  async (req: Request, res: Response<AuthResponse | { error: string }>) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        logger.warn('Login attempt with non-existent email', { email });
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify password
      const isPasswordValid = await compare(password, user.passwordHash);
      if (!isPasswordValid) {
        logger.warn('Invalid login attempt', { email });
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate tokens
      const tokens = await generateAuthTokens(
        user.id,
        user.email,
        user.role || 'user'
      );
      const { accessToken, refreshToken, accessTokenExpiresAt } = tokens;

      logger.info('User logged in successfully', { userId: user.id });

      return res.status(200).json({
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        user: {
          id: user.id,
          email: user.email,
          role: user.role || 'user',
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified || false,
        },
      });
    } catch (error) {
      logger.error('Login error', { error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
];

/**
 * Logout user
 */
const logout = async (
  req: Request,
  res: Response<{ success: boolean } | { error: string }>
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    await revokeToken(token, 'access');

    // If there's a refresh token in the body, revoke it too
    if (req.body.refreshToken) {
      await revokeToken(req.body.refreshToken, 'refresh');
    }

    logger.info('User logged out successfully');
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Logout error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (req: Request, res: Response<AuthResponse | { error: string }>) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify the refresh token
    const result = await verifyToken(refreshToken, 'refresh');
    if (!result || !result.payload.userId) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Get user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, result.payload.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new tokens
    const tokens = await generateAuthTokens(
      user.id,
      user.email,
      user.role || 'user'
    );
    const { accessToken: newAccessToken, refreshToken: newRefreshToken, accessTokenExpiresAt } = tokens;

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresAt,
      user: {
        id: user.id,
        email: user.email,
        role: user.role || 'user',
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified || false,
      },
    });
  } catch (error) {
    logger.error('Token refresh error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Export all controller functions
export default {
  login,
  logout,
  refreshToken
};
