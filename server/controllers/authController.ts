import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { generateAuthTokens, verifyToken, revokeToken } from '../utils/secureJwt';
import { compare } from 'bcryptjs';
import { UserRole } from '../types/jwt';
import Redis from 'ioredis';

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Types based on the database schema
type User = {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  passwordHash: string;
  role: 'super_admin' | 'admin' | 'manager' | 'member' | 'guest';
  organizationId: string | null;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// JWT User type that will be attached to the request
export type JWTUser = {
  [key: string]: any;
  id: string;
  email: string;
  role: string;
  jti: string;
  organizationId?: string | null;
  organization_id?: string; // For backward compatibility
  firstName?: string | null;
  lastName?: string | null;
  passwordHash?: string;
  emailVerified?: boolean;
  isActive?: boolean;
};


// Response types
interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: Date;
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified: boolean;
  };
}

interface ErrorResponse {
  error: string;
  code?: string;
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

interface SuccessResponse {
  success: boolean;
  message?: string;
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

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase())
    }) as User | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isPasswordValid = await compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Update last login
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Generate tokens
    const { accessToken, refreshToken, accessTokenExpiresAt } = await generateAuthTokens(
      user.id,
      user.email,
      (user.role as UserRole) || 'user'
    );

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh-token'
    });

    // Return access token and user info with display name as fallback
    return res.status(200).json({
      accessToken,
      accessTokenExpiresAt,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName || user.email.split('@')[0],
        lastName: user.lastName || '',
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'An error occurred during login' });
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (req: Request, res: Response<AuthResponse | ErrorResponse>) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const result = await verifyToken(refreshToken, 'refresh');
    
    if (!result || result.expired) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token'
      });
    }

    const { payload } = result;
    
    // Find user by ID
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      return res.status(401).json({
        error: 'User not found'
      });
    }

    // Revoke the old token
    await revokeToken(refreshToken);

    // Generate new tokens
    const tokens = await generateAuthTokens(user.id, user.email, (user.role as UserRole) || 'user');

    // Set new refresh token as HTTP-only cookie

    // Return new tokens and user info
    return res.status(200).json({
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      user: {
        id: user.id,
        email: user.email,
        role: user.role || 'user',
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        emailVerified: user.emailVerified || false
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      error: 'Failed to refresh token. Please log in again.'
    });
  }
};

/**
 * Logout user
 */
export const logout = async (req: Request, res: Response<{ success: boolean } | ErrorResponse>) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(204).end();
    }

    try {
      // Verify and revoke the refresh token
      const result = await verifyToken(refreshToken, 'refresh');
      if (result && !result.expired) {
        await revokeToken(refreshToken);
      }
    } catch (error) {
      // Token verification failed, but we still want to clear the cookie
      console.error('Token verification failed during logout:', error);
    }

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      path: '/api/auth/refresh-token',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Failed to log out. Please try again.' });
  }
};

/**
 * Logout from all devices - revokes all refresh tokens for a user
 */
export const logoutAllDevices = async (req: Request, res: Response<{ success: boolean } | ErrorResponse>) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Revoke all tokens for this user
    const keys = await redis.keys(`user:${req.user.id}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      path: '/api/auth/refresh-token'
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Logout all devices error:', error);
    return res.status(500).json({ 
      error: 'An error occurred during logout from all devices'
    });
  }
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (
  req: Request<{}, {}, { email: string }>,
  res: Response<{ success: boolean; message: string } | { error: string }>
) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
        code: 'EMAIL_REQUIRED'
      });
    }
    
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);
      
    // Don't reveal if user exists or not
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      // Return success even if user doesn't exist to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }
    
    // Generate password reset token
    const { token, expiresAt } = await generatePasswordResetToken(
      user.id.toString(),
      user.email || ''
    );
    
    // In a real app, you would send an email with the reset link
    // For now, we'll just log it
    logger.info(`Password reset token for ${user.email}: ${token}`);
    
    // TODO: Send email with reset link
    // await sendPasswordResetEmail(user.email, token);
    
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
      // In development, return the token for testing
      ...(process.env.NODE_ENV !== 'production' && { token, expiresAt })
    });
    
  } catch (error) {
    logger.error('Password reset request error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while processing your request',
      code: 'PASSWORD_RESET_ERROR'
    });
  }
}

/**
 * Reset password with token
 */
interface ResetPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
}

export const resetPassword = async (
  req: Request<{}, {}, PasswordResetRequest>,
  res: Response<ResetPasswordResponse>
) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token, new password and confirm password are required', 
        code: 'MISSING_FIELDS' 
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Passwords do not match', 
        code: 'PASSWORDS_DONT_MATCH' 
      });
    }
    
    const result = await verifyPasswordResetToken(token);
    if (!result) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired token', 
        code: 'INVALID_TOKEN' 
      });
    }
    
    const { userId } = result;
    const user = await db.query.users.findFirst({ 
      where: eq(users.id, userId) 
    }) as User | undefined;
      
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found', 
        code: 'USER_NOT_FOUND' 
      });
    }
    
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    await db.update(users)
      .set({ 
        passwordHash: hashedPassword, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
      
    await revokeAllUserTokens(userId);
    
    // Clear any failed login attempts
    await redis.del(`auth:failed_attempts:${userId}`);
    
    logger.info(`Password reset successful for user: ${userId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.'
    });
    
  } catch (error) {
    logger.error('Password reset error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while resetting your password',
      code: 'PASSWORD_RESET_ERROR'
    });
  }
}
