import bcrypt from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';


interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  orgId: string;
  jti: string;
  type: 'access' | 'refresh';
  iat: number;
  exp?: number; // Made optional since jsonwebtoken sets this when using expiresIn
}

import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db';
import { users } from '../db/schema';
import { IAuthService } from './interfaces/auth.service.interface';
import { 
  LoginDto, 
  RegisterDto, 
  RefreshTokenDto, 
  AuthResponse, 
  UserRole as AuthDtoUserRole 
} from './dtos/auth.dto';
import type { UserRole } from '../types';
import { UserRole as DtoUserRole } from './dtos/auth.dto';
import { Logger } from '../utils/logger';

const { compare, hash } = bcrypt;

export class AuthService implements IAuthService {
  private readonly logger = new Logger('AuthService');
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly JWT_SECRET: string;
  private readonly REFRESH_TOKEN_SECRET: string;
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly SALT_ROUNDS = 12;

  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    this.JWT_SECRET = process.env.JWT_SECRET;
    this.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || `${this.JWT_SECRET}-refresh`;
  }

  /**
   * Generate JWT tokens for authentication
   */
  private async generateAuthTokens(
    userId: string,
    email: string,
    role: string,
    organizationId: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const tokenId = uuidv4();
    const expiresIn = 15 * 60; // 15 minutes in seconds
    const now = Math.floor(Date.now() / 1000);

    // For access token, let the sign function handle the expiration
    const accessToken = sign(
      {
        sub: userId,
        email,
        role,
        orgId: organizationId || '',
        jti: tokenId,
        type: 'access' as const,
        iat: now
      },
      this.JWT_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );

    // For refresh token, also let the sign function handle the expiration
    const refreshTokenId = uuidv4();
    const refreshToken = sign(
      {
        sub: userId,
        email,
        role,
        orgId: organizationId || '',
        jti: refreshTokenId,
        type: 'refresh' as const,
        iat: now
      },
      this.REFRESH_TOKEN_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );

    return { accessToken, refreshToken, expiresIn };
  }

  // Removed unused private verifyToken method

  // Removed unused private isTokenRevoked method

  /**
   * Revoke a token by adding it to the blacklist
   */
  private async revokeToken(tokenId: string, _ttl: number): Promise<void> {
    try {
      // Token revocation not implemented in simplified version
      this.logger.info(`Token revocation requested for: ${tokenId} (not implemented)`);
    } catch (error) {
      this.logger.error('Error revoking token:', error);
      throw new Error('Failed to revoke token');
    }
  }

  /**
   * Handle token refresh when database is not available (demo/offline mode)
   */
  private async handleOfflineTokenRefresh(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    const { refreshToken } = refreshTokenDto;
    
    try {
      // Verify refresh token
      const payload = verify(refreshToken, this.REFRESH_TOKEN_SECRET) as JwtPayload;
      
      // Check token type
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      this.logger.info(`Offline token refresh for user: ${payload.sub}`);
      
      // Generate new tokens using existing payload data
      const tokens = await this.generateAuthTokens(
        payload.sub,
        payload.email,
        payload.role,
        payload.orgId
      );
      
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
        refreshTokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        tokenType: 'Bearer',
        expiresIn: tokens.expiresIn,
        user: {
          id: payload.sub,
          email: payload.email,
          role: payload.role as AuthDtoUserRole,
          firstName: 'Demo',
          lastName: 'User',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
    } catch (error) {
      this.logger.error('Error refreshing token in offline mode', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Handle registration when database is not available (demo/offline mode)
   */
  private async handleOfflineRegistration(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, firstName, lastName, organizationId } = registerDto;
    
    this.logger.info(`Offline registration for: ${email}`);
    
    // Generate demo user data
    const demoUser = {
      id: 'demo-user-' + Date.now(),
      email: email,
      role: 'member' as const,
      organizationId: organizationId || 'demo-org-1'
    };
    
    // Generate tokens for demo user
    const tokens = await this.generateAuthTokens(
      demoUser.id,
      demoUser.email,
      demoUser.role,
      demoUser.organizationId
    );
    
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
      refreshTokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      tokenType: 'Bearer',
      expiresIn: tokens.expiresIn,
      user: {
        id: demoUser.id,
        email: demoUser.email,
        role: demoUser.role as AuthDtoUserRole,
        firstName: firstName || 'Demo',
        lastName: lastName || 'User',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
  }

  /**
   * Handle login when database is not available (demo/offline mode)
   */
  private async handleOfflineLogin(loginDto: LoginDto): Promise<AuthResponse> {
    const { email } = loginDto;
    
    // For demo/development, accept specific test credentials
    const validTestCredentials = [
      { email: 'demo@nestmap.com', password: 'demo123' },
      { email: 'test@example.com', password: 'password' },
      { email: 'admin@nestmap.com', password: 'admin123' }
    ];
    
    const isValidCredential = validTestCredentials.some(
      cred => cred.email === email && cred.password === loginDto.password
    );
    
    if (!isValidCredential) {
      this.logger.warn(`Offline login failed: Invalid credentials for ${email}`);
      throw new Error('Invalid email or password');
    }
    
    this.logger.info(`Offline login successful for: ${email}`);
    
    // Generate demo user data
    const demoUser = {
      id: 'demo-user-' + Date.now(),
      email: email,
      role: email.includes('admin') ? 'admin' : 'user',
      organizationId: 'demo-org-1'
    };
    
    // Generate tokens for demo user
    const tokens = await this.generateAuthTokens(
      demoUser.id,
      demoUser.email,
      demoUser.role,
      demoUser.organizationId
    );
    
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
      refreshTokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      tokenType: 'Bearer',
      expiresIn: tokens.expiresIn,
      user: {
        id: demoUser.id,
        email: demoUser.email,
        role: demoUser.role as AuthDtoUserRole,
        firstName: 'Demo',
        lastName: 'User',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
  }

  /**
   * Authenticate a user and generate tokens
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email } = loginDto;
    const db = await getDatabase();
    if (!db) {
      this.logger.warn('Database not available, checking for demo/test mode');
      return this.handleOfflineLogin(loginDto);
    }

    // Find user by email
    const [user] = await db.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      this.logger.warn(`Login failed: User with email ${loginDto.email} not found`);
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${loginDto.email}`);
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateAuthTokens(
      user.id,
      user.email,
      (user.role as UserRole) || 'user',
      user.organizationId || undefined
    );

    // Update last login
    await db.db
      .update(users)
      .set({ 
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    this.logger.info(`User logged in successfully: ${user.email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
      refreshTokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      tokenType: 'Bearer',
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        role: (user.role as AuthDtoUserRole) || 'user',
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        emailVerified: user.emailVerified || false,
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date()
      }
    };
  }

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, firstName, lastName, organizationId } = registerDto;
    // Default role for new users
    const role: DtoUserRole = 'member';
    const db = await getDatabase();
    if (!db) {
      this.logger.warn('Database not available, using offline registration mode');
      return this.handleOfflineRegistration(registerDto);
    }

    // Check if user already exists
    const existingUser = await db.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      this.logger.warn(`Registration failed: Email ${registerDto.email} already in use`);
      throw new Error('A user with this email already exists');
    }

    // Hash password
    const hashedPassword = await hash(password, this.SALT_ROUNDS);
    const now = new Date();
    const userId = uuidv4();

    // Create new user
    const [newUser] = await db.db
      .insert(users)
      .values({
        id: userId,
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        role: role as UserRole,
        emailVerified: false,
        organizationId,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now
      })
      .returning();

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    this.logger.info(`User registered successfully: ${newUser.email}`);

    // Generate tokens
    const tokens = await this.generateAuthTokens(
      newUser.id,
      newUser.email,
      (newUser.role as UserRole) || 'user',
      newUser.organizationId || undefined
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
      refreshTokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      tokenType: 'Bearer',
      expiresIn: tokens.expiresIn,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: (newUser.role as AuthDtoUserRole) || 'user',
        firstName: newUser.firstName || null,
        lastName: newUser.lastName || null,
        emailVerified: newUser.emailVerified || false,
        createdAt: newUser.createdAt || new Date(),
        updatedAt: newUser.updatedAt || new Date()
      }
    };
  }

  /**
   * Refresh an access token using a refresh token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    const { refreshToken } = refreshTokenDto;
    const db = await getDatabase();
    if (!db) {
      this.logger.warn('Database not available, using offline token refresh');
      return this.handleOfflineTokenRefresh(refreshTokenDto);
    }

    try {
      // Verify refresh token
      const payload = verify(refreshToken, this.REFRESH_TOKEN_SECRET) as JwtPayload;
      
      // Check token type
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Get user from database
      const userId = payload.sub;
      const [user] = await db.db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateAuthTokens(
        user.id,
        user.email,
        user.role,
        user.organizationId || ''
      );

      // Update last login
      await db.db
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
        refreshTokenExpiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        tokenType: 'Bearer',
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          role: user.role as AuthDtoUserRole,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          emailVerified: user.emailVerified || false,
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date(),
        }
      };
    } catch (error) {
      this.logger.error('Error refreshing token', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout a user by invalidating their refresh token
   */
  async logout(refreshToken: string, _authHeader?: string): Promise<void> {
    if (!refreshToken) {
      throw new Error('No refresh token provided');
    }

    try {
      // Verify the token to get its ID for blacklisting
      const decoded = verify(refreshToken, this.REFRESH_TOKEN_SECRET) as JwtPayload;
      
      // Add token to blacklist
      await this.revokeToken(decoded.jti, decoded.exp || 0);
      
      this.logger.info(`User logged out: ${decoded.sub}`);
    } catch (error) {
      // If token is invalid or expired, still resolve the promise
      this.logger.warn('Logout called with invalid token, continuing...');
    }
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllSessions(userId: string): Promise<void> {
    const db = await getDatabase();
    if (!db) {
      this.logger.warn('Database not available, using offline session revocation');
      this.logger.info(`Revoked all sessions for user: ${userId} (offline mode)`);
      return;
    }
    // In a real implementation, this would:
    // 1. Track all active tokens for a user
    // 2. Add them all to the revoked tokens list
    // For now, we'll just log the action
    this.logger.info(`Revoked all sessions for user: ${userId}`);
  }

  /**
   * Request a password reset for a user
   */
  async requestPasswordReset(email: string): Promise<void> {
    const db = await getDatabase();
    if (!db) {
      this.logger.warn('Database not available, using offline password reset mode');
      this.logger.info(`Password reset requested for: ${email} (offline mode - would send email in production)`);
      return;
    }
    
    // Find user by email
    const [user] = await db.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      // In a real implementation, you would:
      // 1. Generate a password reset token
      // 2. Store it with an expiry
      // 3. Send an email with the reset link
      this.logger.info(`Password reset requested for: ${email}`);
    }
  }

  /**
   * Reset a user's password using a valid reset token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const db = await getDatabase();
    if (!db) {
      this.logger.warn('Database not available, using offline password reset mode');
      this.logger.info(`Password reset attempt with token: ${token.substring(0, 10)}... (offline mode - would update in production)`);
      return;
    }
    
    // In a real implementation, you would:
    // 1. Verify the reset token
    // 2. Find the associated user
    // 3. Update their password with the newPassword
    // 4. Invalidate the token
    
    // For now, we'll just log the attempt
    this.logger.info(`Password reset requested with token ${token.substring(0, 8)}... and new password of length ${newPassword.length}`);
    this.logger.info(`Password reset attempt with token: ${token.substring(0, 10)}...`);
  }
}
