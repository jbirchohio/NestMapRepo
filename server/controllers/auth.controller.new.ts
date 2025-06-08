import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { generateAuthTokens, verifyToken, revokeToken, revokeAllUserTokens, TokenPayload } from '../utils/jwt';
import { logger } from '../utils/logger';
import { rateLimiterMiddleware } from '../middleware/rateLimit';

// Input validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters long'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  organizationName: z.string().optional(),
});

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
export const login = [
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
        logger.warn('Invalid login attempt', { userId: user.id });
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate tokens
      const {
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
      } = await generateAuthTokens(user.id, user.email, user.role);

      // Update last login
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      logger.info('User logged in successfully', { userId: user.id });

      // Return tokens and user info
      return res.json({
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
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
export const logout = async (
  req: Request,
  res: Response<{ success: boolean } | { error: string }>
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    const decoded = await verifyToken(token, 'access');
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Add token to blacklist
    await revokeToken(decoded.payload.userId, decoded.payload.jti);

    logger.info('User logged out', { userId: decoded.payload.userId });
    return res.json({ success: true });
  } catch (error) {
    logger.error('Logout error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (
  req: Request<{}, {}, { refreshToken: string }>,
  res: Response<AuthResponse | { error: string }>
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token
    const decoded = await verifyToken(refreshToken, 'refresh');
    if (!decoded || decoded.expired) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken, accessTokenExpiresAt } =
      await generateAuthTokens(
        decoded.payload.userId,
        decoded.payload.email,
        decoded.payload.role
      );

    // Revoke the old refresh token
    await revokeToken(decoded.payload.userId, decoded.payload.jti);

    logger.info('Token refreshed', { userId: decoded.payload.userId });

    return res.json({
      accessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresAt,
      user: {
        id: decoded.payload.userId,
        email: decoded.payload.email,
        role: decoded.payload.role,
      },
    });
  } catch (error) {
    logger.error('Token refresh error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
};
