import { Request, Response } from 'express';
import { compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { users } from '../../db/schema';
import { decode } from 'jsonwebtoken';
import { 
  generateAuthTokens, 
  revokeToken,
  revokeAllUserTokens,
  verifyToken
} from './jwt';
import { logger } from '../../utils/logger';
import { UserRole } from './types';

// Response types
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    organizationId?: string | null;
  };
}

interface ErrorResponse {
  error: string;
  code?: string;
  message?: string;
}

// Request types
interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  password: string;
  organizationName?: string;
}

interface PasswordResetRequest {
  token: string;
  newPassword: string;
}

/**
 * Login user
 */
export const login = async (
  req: Request<{}, {}, LoginRequest>,
  res: Response<AuthResponse | ErrorResponse>
) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (!user || !user.password_hash) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const tokens = await generateAuthTokens(
      user.id,
      user.email,
      (user.role as UserRole) || 'user',
      user.organization_id || undefined
    );

    // Update last login
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Set HTTP-only cookie for refresh token
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return response
    return res.status(200).json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (
  req: Request,
  res: Response<AuthResponse | ErrorResponse>
) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token is required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Verify refresh token
    const result = await verifyToken(refreshToken, 'refresh');
    
    if (!result.valid || !result.payload) {
      return res.status(401).json({
        error: result.error || 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
        expired: result.expired
      });
    }

    // Get user from database
    const [user] = await db.select().from(users).where(eq(users.id, result.payload.sub));

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Generate new tokens
    const tokens = await generateAuthTokens(
      user.id,
      user.email,
      (user.role as UserRole) || 'user',
      user.organization_id || undefined
    );

    // Set HTTP-only cookie for refresh token
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(200).json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      }
    });

  } catch (error) {
    logger.error('Refresh token error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Logout user
 */
export const logout = async (
  req: Request,
  res: Response<{ success: boolean } | ErrorResponse>
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      const decoded = decode(token, { json: true }) as { jti?: string; exp?: number } | null;
      
      if (decoded?.jti && decoded.exp) {
        // Calculate token TTL in seconds
        const ttl = Math.ceil((decoded.exp * 1000 - Date.now()) / 1000);
        if (ttl > 0) {
          await revokeToken(decoded.jti, ttl);
        }
      }
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    return res.status(200).json({ success: true });

  } catch (error) {
    logger.error('Logout error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Logout from all devices
 */
export const logoutAllDevices = async (
  req: Request,
  res: Response<{ success: boolean } | ErrorResponse>
) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Revoke all user tokens
    await revokeAllUserTokens(user.id);
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    return res.status(200).json({ success: true });

  } catch (error) {
    logger.error('Logout all devices error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (
  req: Request<{}, {}, { email: string }>,
  res: Response<{ success: boolean; message: string } | ErrorResponse>
) => {
  try {
    const { email } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (user) {
      // In a real app, you would:
      // 1. Generate a password reset token
      // 2. Send an email with the reset link
      // 3. Return success (don't leak if email exists)
      logger.info(`Password reset requested for: ${email}`);
    }

    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    logger.error('Password reset request error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (
  req: Request<{}, {}, PasswordResetRequest>,
  res: Response<{ success: boolean; message?: string } | ErrorResponse>
) => {
  try {
    const { token, newPassword } = req.body;

    // In a real implementation, you would:
    // 1. Verify the reset token
    // 2. Update the user's password
    // 3. Invalidate the used token
    
    logger.info(`Password reset attempt with token: ${token.substring(0, 10)}...`);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully.'
    });

  } catch (error) {
    logger.error('Password reset error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};
