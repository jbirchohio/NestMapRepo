import { hash, compare } from 'bcrypt';
import { jwtUtils } from '../utils/jwt.js';
import { eq, and, gt } from '../utils/drizzle-shim';
import { v4 as uuidv4 } from 'uuid';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomBytes } from 'crypto';
import { users, refreshTokens } from '../db/schema.js';
import { IAuthService } from './interfaces/auth.service.interface.js';
import { 
  RefreshTokenDto, 
  AuthResponse,
  UserRole,
  LoginDto,
  RegisterDto,
  UserResponse
} from './dtos/auth.dto.js';
import { logger } from '../utils/logger.js';
import { addDays, addHours } from 'date-fns';
import { EmailService } from '../services/email.service';

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const client = postgres(connectionString);
const db = drizzle(client);

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  orgId: string;
  jti: string;
  type: 'access' | 'refresh';
  iat: number;
  exp?: number;
}

export class AuthService implements IAuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly JWT_SECRET = process.env.JWT_SECRET;
  private readonly REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
  private readonly logger = logger;
  private readonly emailService = new EmailService();

  constructor() {
    if (!this.JWT_SECRET || !this.REFRESH_TOKEN_SECRET) {
      throw new Error('JWT secrets are not properly configured');
    }
  }

  private async generateAuthTokens(
    userId: string,
    email: string,
    role: string,
    organizationId: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const tokenId = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const accessToken = await jwtUtils.sign(
      {
        sub: userId,
        email,
        role,
        orgId: organizationId || '',
        jti: tokenId,
        type: 'access',
        iat: now
      },
      this.JWT_SECRET!,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );

    const refreshTokenId = uuidv4();
    const refreshToken = await jwtUtils.sign(
      {
        sub: userId,
        email,
        role,
        orgId: organizationId || '',
        jti: refreshTokenId,
        type: 'refresh',
        iat: now
      },
      this.REFRESH_TOKEN_SECRET!,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );

    const expiresIn = 15 * 60; // 15 minutes in seconds
    return { accessToken, refreshToken, expiresIn };
  }

  async verifyToken(token: string, secretOrPublicKey: string): Promise<JwtPayload> {
    try {
      const result = await jwtUtils.verify(token, secretOrPublicKey);
      
      // Handle case where the token is a string (unlikely with our setup)
      if (typeof result === 'string') {
        try {
          return JSON.parse(result) as JwtPayload;
        } catch (parseError) {
          throw new Error(`Invalid token format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
      }
      
      // Ensure we have the required fields for JwtPayload
      if (!result.sub || !result.email || !result.role) {
        throw new Error('Invalid token payload');
      }
      
      return result as unknown as JwtPayload;
    } catch (error) {
      if (error instanceof Error) {
        await this.handleTokenError(error, token);
      } else {
        this.logger.error('Unknown error during token verification', { token: token.slice(0, 10) + '...' });
        throw new Error('Token verification failed');
      }
      throw new Error('Token verification failed'); // This line is unreachable but satisfies TypeScript
    }
  }

  private async handleTokenError(error: Error, token: string): Promise<never> {
    this.logger.error('Token verification failed', { 
      error: error.message, 
      token: token.slice(0, 10) + '...' 
    });
    throw new Error('Invalid token');
  }

  async decodeToken(token: string): Promise<JwtPayload | null> {
    try {
      return jwtUtils.decode(token) as JwtPayload;
    } catch (err) {
      this.logger.error('Token decoding failed', { error: err });
      return null;
    }
  }

  private async revokeToken(tokenId: string, ttl: number): Promise<void> {
    this.logger.info(`Token revocation requested for: ${tokenId} with TTL: ${ttl}`);
    try {
      await db
        .update(refreshTokens)
        .set({ 
          revoked: true, 
          revokedAt: new Date() 
        })
        .where(eq(refreshTokens.id, tokenId));
    } catch (err) {
      this.logger.error('Error revoking token:', { error: String(err) });
      throw new Error('Failed to revoke token');
    }
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    const { refreshToken } = refreshTokenDto;

    try {
      const decoded = await this.verifyToken(refreshToken, this.REFRESH_TOKEN_SECRET!);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.sub))
        .limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      const tokens = await this.generateAuthTokens(
        user.id,
        user.email,
        user.role,
        user.organizationId || ''
      );

      await db
        .update(users)
        .set({
          lastLoginAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: Date.now() + (tokens.expiresIn * 1000),
        refreshTokenExpiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
        tokenType: 'Bearer',
        expiresIn: tokens.expiresIn,
        user: this.mapUserToResponse(user)
      };
    } catch (error) {
      this.logger.error('Error refreshing token', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      throw new Error('No refresh token provided');
    }

    try {
      const decoded = await this.verifyToken(refreshToken, this.REFRESH_TOKEN_SECRET!);
      await this.revokeToken(decoded.jti, decoded.exp || 0);
      this.logger.info(`User logged out: ${decoded.sub}`);
    } catch {
      this.logger.warn('Logout called with invalid token, continuing...');
    }
  }

  private async saveRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
    ip: string,
    userAgent: string
  ): Promise<void> {
    await db.insert(refreshTokens).values({
      userId,
      token,
      expiresAt,
      ipAddress: ip,
      userAgent
    });
  }

  async login(loginData: LoginDto, ip: string, userAgent: string): Promise<AuthResponse> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, loginData.email))
        .limit(1);

      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isPasswordValid = await compare(loginData.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      const tokens = await this.generateAuthTokens(
        user.id,
        user.email,
        user.role,
        user.organizationId || ''
      );

      await db
        .update(users)
        .set({
          lastLoginAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      await this.saveRefreshToken(user.id, tokens.refreshToken, addDays(new Date(), 7), ip, userAgent);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: Date.now() + (tokens.expiresIn * 1000),
        refreshTokenExpiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
        tokenType: 'Bearer',
        expiresIn: tokens.expiresIn,
        user: this.mapUserToResponse(user)
      };
    } catch (error) {
      this.logger.error('Login failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: loginData.email,
        ip,
        userAgent
      });
      throw new Error('Login failed');
    }
  }

  async register(registerData: RegisterDto, ip: string, userAgent: string): Promise<AuthResponse> {
    try {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, registerData.email))
        .limit(1);

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      const hashedPassword = await hash(registerData.password, this.SALT_ROUNDS);

      const { email, firstName, lastName } = registerData;
      const username = email.split('@')[0];

      const newUser = await db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            email,
            username,
            passwordHash: hashedPassword,
            firstName,
            lastName,
            role: 'member',
            emailVerified: false,
            isActive: true,
            lastLoginAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        return user;
      });

      const tokens = await this.generateAuthTokens(
        newUser.id,
        newUser.email,
        newUser.role || 'member',
        newUser.organizationId || ''
      );

      await this.saveRefreshToken(newUser.id, tokens.refreshToken, addDays(new Date(), 7), ip, userAgent);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: Date.now() + (tokens.expiresIn * 1000),
        refreshTokenExpiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
        tokenType: 'Bearer',
        expiresIn: tokens.expiresIn,
        user: this.mapUserToResponse(newUser)
      };
    } catch (error) {
      this.logger.error('Registration failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        email: registerData.email,
        ip,
        userAgent
      });
      throw new Error('Registration failed');
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return; // Don't reveal if user exists
      }

      const resetToken = randomBytes(32).toString('hex');
      const resetTokenExpires = addHours(new Date(), 1);

      await db
        .update(users)
        .set({
          resetToken,
          resetTokenExpires,
          updatedAt: new Date()
        })
        .where(eq(users.email, email));

      // Send password reset email
      await this.emailService.sendPasswordResetEmail({
        userEmail: email,
        resetToken,
        baseUrl: process.env.BASE_URL || 'http://localhost:3000'
      });
      
      this.logger.info(`Password reset email sent to user: ${user.id}`);
    } catch (error) {
      this.logger.error('Error requesting password reset', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email
      });
      throw new Error('Failed to request password reset');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.resetToken, token),
            users.resetTokenExpires ? gt(users.resetTokenExpires, new Date()) : undefined
          )
        )
        .limit(1);

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      const hashedPassword = await hash(newPassword, this.SALT_ROUNDS);

      await db
        .update(users)
        .set({
          passwordHash: hashedPassword,
          resetToken: null,
          resetTokenExpires: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      await this.revokeAllSessions(user.id);
      this.logger.info(`Password reset for user: ${user.id}`);
    } catch (error) {
      this.logger.error('Error resetting password', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to reset password');
    }
  }

  async revokeAllSessions(userId: string): Promise<void> {
    try {
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, userId));
      
      this.logger.info(`Revoked all sessions for user: ${userId}`);
    } catch (error) {
      this.logger.error('Error revoking all sessions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw new Error('Failed to revoke all sessions');
    }
  }

  private mapUserToResponse(user: {
    id: string;
    email: string;
    role?: 'super_admin' | 'admin' | 'manager' | 'member' | 'guest';
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): UserResponse {
    return {
      id: user.id,
      email: user.email,
      role: (user.role as UserRole) || 'member',
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      emailVerified: user.emailVerified || false,
      createdAt: user.createdAt || new Date(),
      updatedAt: user.updatedAt || new Date()
    };
  }
}

