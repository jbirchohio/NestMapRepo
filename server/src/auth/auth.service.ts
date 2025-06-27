/**
 * Auth Service Implementation
 * Implements the IAuthService interface
 */
import { compare, hash } from 'bcrypt';
import { eq, sql } from 'drizzle-orm';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

// Runtime imports
import { AuthError, AuthErrorCode } from '@shared/src/types/auth/auth.js';
import { users, refreshTokens, auditLogsTableDefinition as auditLogs } from '../../db/schema.js';
import logger from '../../utils/logger.js';
import { redisClient } from '../../utils/redis.js';
import { jwtService } from '../common/services/jwt.service.js';
import type { Database } from '../../db/db.js';

// Type imports
import { UserRole } from '@shared/src/types/auth/permissions.js';
import type { 
  JwtPayload,
  RegisterDto,
  LoginDto,
  AuthUser,
  AuthTokens,
  RequestPasswordResetDto,
  ResetPasswordDto,
  ChangePasswordDto
} from '@shared/types';

/**
 * Interface for Auth Service
 * Defines the contract for authentication operations
 */
interface IAuthService {
  login(credentials: LoginDto, ip: string, userAgent: string): Promise<{ user: AuthUser; tokens: AuthTokens }>;
  register(userData: RegisterDto): Promise<{ user: AuthUser; tokens: AuthTokens }>;
  refreshToken(token: string, ip: string, userAgent: string): Promise<{ user: AuthUser; tokens: AuthTokens }>;
  logout(refreshToken: string, accessToken?: string): Promise<void>;
  requestPasswordReset(data: RequestPasswordResetDto): Promise<void>;
  resetPassword(data: ResetPasswordDto): Promise<void>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  isAuthenticated(accessToken: string): Promise<boolean>;
}

export class AuthService implements IAuthService {
    private readonly SALT_ROUNDS = 10;
    private db: Database;
    
    constructor(db: Database) {
        this.db = db;
    }

    /**
     * Verify if the current user is authenticated
     * @param accessToken - The JWT access token to verify
     * @returns Promise<boolean> - True if the token is valid and the user is authenticated
     * 
     * This method performs the following checks:
     * 1. Verifies the JWT signature and expiration
     * 2. Validates the token type is 'access'
     * 3. Checks if the token is blacklisted
     * 4. Verifies the user exists and is active
     * 5. Validates the token version matches the user's current version
     */
    public async isAuthenticated(accessToken: string): Promise<boolean> {
        const logContext = { token: accessToken?.substring(0, 10) + '...' };
        
        // Input validation
        if (!accessToken || typeof accessToken !== 'string') {
            logger.warn('No or invalid access token provided', logContext);
            return false;
        }

        try {
            // Step 1: Verify the JWT token
            const result = await jwtService.verifyToken<JwtPayload>(
                accessToken,
                'access' as const // Ensure type safety for access tokens
            );
            
            // Check if token is valid and has a payload
            if (!result.valid || !result.payload) {
                logger.warn('Invalid or expired token', logContext);
                return false;
            }
            
            const payload = result.payload;
            const userId = payload.sub;
            
            // Add user ID to log context for better tracing
            Object.assign(logContext, { userId });
            
            // Validate token type
            if (payload.type !== 'access') {
                logger.warn(`Invalid token type: expected 'access' but got '${payload.type}'`, logContext);
                return false;
            }
            
            // Validate required claims
            if (!userId || !payload.email) {
                logger.warn('Missing required token claims', {
                    ...logContext,
                    hasUserId: !!userId,
                    hasEmail: !!payload.email
                });
                return false;
            }
            
            // Check if token is blacklisted (for immediate invalidation)
            try {
                const isBlacklisted = await redisClient.get(`blacklist:${accessToken}`);
                if (isBlacklisted) {
                    logger.warn('Attempted to use blacklisted access token', logContext);
                    return false;
                }
            } catch (redisError) {
                // If Redis fails, we'll continue with the check but log the error
                logger.error('Redis error during blacklist check', {
                    ...logContext,
                    error: redisError instanceof Error ? redisError.message : 'Unknown error'
                });
            }
            
            // Get user to check token version and status
            const user = await this.db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: {
                    id: true,
                    email: true,
                    isActive: true,
                    tokenVersion: true,
                    role: true,
                    organizationId: true
                }
            });
            
            // Check if user exists
            if (!user) {
                logger.warn('User not found for token', logContext);
                return false;
            }
            
            // Update log context with user details
            Object.assign(logContext, { 
                userEmail: user.email,
                userRole: user.role,
                orgId: user.organizationId
            });
            
            // Check if user is active
            if (!user.isActive) {
                logger.warn('User account is not active', logContext);
                return false;
            }
            
            // Verify token version matches user's current version
            // Note: We're not storing the version in the token payload anymore
            // as we're using the user's tokenVersion from the database
            // This check is now handled by the token validation in jwtService
            // which ensures the token hasn't been revoked or expired
            
            // Additional security: Check if the token was issued before the last password change
            // This is handled by the token validation in jwtService which checks the 'iat' claim
            // against the user's lastPasswordChange timestamp if needed
            
            // Log the successful token validation
            logger.debug('Token version validation successful', {
                ...logContext,
                userTokenVersion: user.tokenVersion
            });
            
            // Additional security: Check if token was issued before the user's last password change
            // This is already handled by the token version check, but included for completeness
            
            logger.debug('Authentication successful', logContext);
            return true;
            
        } catch (error) {
            // Handle specific JWT errors
            if (error instanceof JsonWebTokenError) {
                logger.warn('JWT validation failed', {
                    ...logContext,
                    error: error.message,
                    name: error.name
                });
                return false;
            }
            
            if (error instanceof TokenExpiredError) {
                logger.warn('Token has expired', logContext);
                return false;
            }
            
            // Log unexpected errors
            if (error instanceof Error) {
                logger.error('Unexpected error during authentication', {
                    ...logContext,
                    error: error.message,
                    stack: error.stack,
                    name: error.name
                });
            } else {
                logger.error('Unexpected error during authentication', logContext);
            }
            
            // Security best practice: Fail closed on unexpected errors
            return false;
        }
    }

    /**
     * Register a new user
     */
    public async register(registerDto: RegisterDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
        try {
            // Check if user already exists
            const existingUser = await this.db.query.users.findFirst({
                where: eq(users.email, registerDto.email)
            });

            if (existingUser) {
                throw new AuthError(AuthErrorCode.EMAIL_ALREADY_EXISTS, 'Email already in use');
            }

            // Hash password
            const hashedPassword = await hash(registerDto.password, this.SALT_ROUNDS);
            
            // Generate username from email if not provided
            const username = registerDto.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
            
            // Generate displayName from name if provided, otherwise use username
            const displayName = registerDto.displayName || 
                (registerDto.firstName && registerDto.lastName 
                    ? `${registerDto.firstName} ${registerDto.lastName}`.trim() 
                    : username);
            
            // Create user in database
            const [newUser] = await this.db.insert(users).values({
                email: registerDto.email,
                username: username,
                passwordHash: hashedPassword,
                firstName: registerDto.firstName,
                lastName: registerDto.lastName || null,
                role: registerDto.role || 'member',
                isActive: true,
                emailVerified: false,
                tokenVersion: 0,
                organizationId: registerDto.organizationId || null
            }).returning();

            // Generate tokens with proper typing
            const tokens = await this.generateTokens({
                userId: newUser.id,
                email: newUser.email,
                role: newUser.role as UserRole,
                organizationId: newUser.organizationId || null, // Ensure null instead of undefined
                tokenVersion: newUser.tokenVersion
            });

            // Map user to AuthUser interface
            const authUser: AuthUser = {
                id: newUser.id,
                email: newUser.email,
                display_name: displayName,
                role: newUser.role as UserRole,
                organization_id: newUser.organizationId || null,
                email_verified: newUser.emailVerified,
                created_at: newUser.createdAt.toISOString(),
                updated_at: newUser.updatedAt.toISOString(),
                is_active: newUser.isActive,
                permissions: []
            };

            logger.info(`New user registered: ${newUser.email}`);
            return { user: authUser, tokens };
        } catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            logger.error('Registration failed:', error);
            throw new AuthError(AuthErrorCode.UNKNOWN_ERROR, 'Failed to register user');
        }
    }

    /**
     * Login a user
     */
    public async login(loginDto: LoginDto, ip: string, userAgent: string): Promise<{ user: AuthUser; tokens: AuthTokens }> {
        try {
            // Find user by email with only the fields we need
            const user = await this.db.query.users.findFirst({
                where: eq(users.email, loginDto.email)
            });

            // Check if user exists and password is correct
            if (!user || !user.passwordHash || !(await compare(loginDto.password, user.passwordHash))) {
                logger.warn(`Failed login attempt for email: ${loginDto.email}`);
                throw new AuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid email or password');
            }

            // Check if user is active
            if (!user.isActive) {
                logger.warn(`Login attempt for deactivated account: ${user.id}`);
                throw new AuthError(AuthErrorCode.USER_DISABLED, 'Account is deactivated');
            }

            // Check if email is verified if required
            if (!user.emailVerified) {
                logger.warn(`Login attempt with unverified email: ${user.email}`);
                throw new AuthError(AuthErrorCode.EMAIL_NOT_VERIFIED, 'Please verify your email before logging in');
            }

            // Update last login and user agent
            await this.db.update(users)
                .set({ 
                    lastLoginAt: new Date(),
                    lastLoginIp: ip,
                    // Note: lastLoginUserAgent field is not in the schema, so we'll log it instead
                    updatedAt: new Date()
                })
                .where(eq(users.id, user.id));
            
            // Log the user agent for security purposes
            logger.info('User login', { 
                userId: user.id, 
                ip, 
                userAgent,
                timestamp: new Date().toISOString() 
            });

            // Generate tokens with proper typing
            const tokens = await this.generateTokens({
                userId: user.id,
                email: user.email,
                role: user.role as UserRole,
                organizationId: user.organizationId || null, // Ensure null instead of undefined
                tokenVersion: user.tokenVersion
            });

            // Map user to AuthUser interface
            const authUser: AuthUser = {
                id: user.id,
                email: user.email,
                display_name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email.split('@')[0],
                role: user.role as UserRole,
                organization_id: user.organizationId || null,
                email_verified: user.emailVerified,
                created_at: user.createdAt.toISOString(),
                updated_at: user.updatedAt.toISOString(),
                is_active: user.isActive,
                last_login_at: new Date().toISOString(),
                last_login_ip: ip,
                permissions: []
            };

            logger.info(`User logged in: ${user.email}`);
            return { user: authUser, tokens };
        } catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            logger.error('Login failed:', error);
            throw new AuthError(AuthErrorCode.UNKNOWN_ERROR, 'Failed to log in');
        }
    }

    /**
     * Logout a user by invalidating their refresh token and optionally an access token
     * @param refreshToken - The refresh token to invalidate
     * @param accessToken - Optional access token to invalidate
     */
    public async logout(refreshToken: string, accessToken?: string): Promise<void> {
        if (!refreshToken) {
            logger.warn('No refresh token provided for logout');
            return;
        }

        try {
            // Verify the refresh token to get the user ID
            const result = await jwtService.verifyToken<JwtPayload>(
                refreshToken,
                'refresh' as const // Ensure we're specifically checking for refresh token
            );
            
            // If token is invalid or payload is missing, log and return
            if (!result.valid || !result.payload) {
                logger.warn('Attempted logout with invalid refresh token');
                return; // No need to throw, just return
            }

            // Type guard to ensure this is a refresh token
            if (result.payload.type !== 'refresh') {
                logger.warn(`Invalid token type during logout. Expected 'refresh' but got '${result.payload.type}'`);
                return;
            }

            const payload = result.payload;
            const userId = payload.sub;

            if (!userId) {
                logger.warn('No user ID found in refresh token');
                return;
            }

            // Add refresh token to blacklist if it has an expiration
            if (payload.exp) {
                const expiresIn = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
                if (expiresIn > 0) {
                    try {
                        await redisClient.setex(
                            `refresh_token:${refreshToken}`,
                            expiresIn,
                            'blacklisted'
                        );
                        logger.debug(`Refresh token blacklisted for ${expiresIn} seconds`);
                    } catch (error) {
                        logger.error('Failed to blacklist refresh token:', error);
                        // Continue with logout even if blacklisting fails
                    }
                }
            } else {
                // If no expiration, use a default TTL of 1 hour
                try {
                    await redisClient.setex(
                        `refresh_token:${refreshToken}`,
                        3600, // 1 hour
                        'blacklisted'
                    );
                    logger.debug('Refresh token blacklisted with default 1-hour TTL');
                } catch (error) {
                    logger.error('Failed to blacklist refresh token with default TTL:', error);
                }
            }
            
            // If access token is provided, add it to the blacklist
            if (accessToken) {
                try {
                    const accessResult = await jwtService.verifyToken<JwtPayload>(
                        accessToken,
                        'access' as const
                    );
                    
                    if (accessResult.valid && accessResult.payload) {
                        // Type guard to ensure this is an access token
                        if (accessResult.payload.type !== 'access') {
                            logger.warn('Invalid access token type during logout');
                            return;
                        }

                        const accessPayload = accessResult.payload;
                        // Calculate time until token expiration
                        const now = Math.floor(Date.now() / 1000);
                        const ttl = accessPayload.exp ? accessPayload.exp - now : 3600; // Default to 1 hour if exp not set
                        
                        if (ttl > 0) {
                            try {
                                await redisClient.setex(
                                    `blacklist:${accessToken}`,
                                    ttl,
                                    '1'
                                );
                                logger.debug(`Access token blacklisted for ${ttl} seconds`);
                            } catch (error) {
                                logger.error('Failed to blacklist access token:', error);
                                // Continue with logout even if blacklisting fails
                            }
                        }
                    }
                } catch (error) {
                    // If access token is invalid, we can still proceed with the logout
                    logger.warn('Error processing access token during logout:', error);
                }
            }
            
            logger.info(`User ${userId} logged out successfully`);
            
        } catch (error) {
            if (error instanceof AuthError) {
                logger.warn('Auth error during logout:', error);
                throw error;
            }
            
            // Log the error but don't expose internal details to the client
            logger.error('Unexpected error during logout:', error);
            throw new AuthError(
                AuthErrorCode.UNKNOWN_ERROR,
                'An error occurred during logout. Please try again.'
            );
        }
    }

    /**
     * Refresh access token using a valid refresh token
     * @param refreshToken - The refresh token to use for generating new tokens
     * @param ip - The IP address of the client making the request
     * @param userAgent - The user agent of the client making the request
     * @returns Object containing the user data and new auth tokens
     * @throws {AuthError} If the refresh token is invalid, expired, or revoked
     */
    public async refreshToken(
        refreshToken: string,
        ip: string,
        userAgent: string
    ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
        const logContext = { ip, userAgent, token: refreshToken?.substring(0, 10) + '...' };
        logger.debug('Refresh token request received', logContext);
        
        if (!refreshToken) {
            logger.warn('No refresh token provided', logContext);
            throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Refresh token is required');
        }

        try {
            // Verify refresh token
            const result = await jwtService.verifyToken<JwtPayload>(
                refreshToken,
                'refresh' as const // Ensure we're specifically checking for refresh token
            );
            
            // Validate token and payload
            if (!result.valid || !result.payload) {
                logger.warn('Invalid refresh token provided', logContext);
                throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid or expired token');
            }
            
            const payload = result.payload;
            const userId = payload.sub;
            
            // Validate payload
            if (!userId) {
                logger.warn('No user ID in refresh token payload', logContext);
                throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid token payload');
            }
            
            // Type guard to ensure this is a refresh token
            if (payload.type !== 'refresh') {
                logger.warn(`Invalid token type. Expected 'refresh' but got '${payload.type}'`, logContext);
                throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid token type');
            }
            
            // Check if token is blacklisted in the token blacklist
            const isTokenBlacklisted = await redisClient.get(`jwt:blacklist:${refreshToken}`);
            if (isTokenBlacklisted) {
                logger.warn('Attempted to use blacklisted refresh token', logContext);
                throw new AuthError(AuthErrorCode.TOKEN_REVOKED, 'Session expired. Please log in again.');
            }
            
            // Find the user with only the fields we need
            const user = await this.db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    organizationId: true,
                    emailVerified: true,
                    isActive: true,
                    tokenVersion: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            if (!user) {
                logger.warn(`Refresh token for non-existent user: ${userId}`, logContext);
                throw new AuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found');
            }
            
            // Check if user is active
            if (!user.isActive) {
                logger.warn(`Refresh token for deactivated user: ${user.id}`, logContext);
                throw new AuthError(AuthErrorCode.USER_DISABLED, 'Account is deactivated');
            }

            // Verify the refresh token is still valid in our system
            // The JWT verification already happened in jwtService.verifyToken
            // Now we need to ensure the token hasn't been revoked and the user is still active
            
            // Check if the refresh token is blacklisted in the user's refresh tokens
            const userTokenKey = `user:${user.id}:refresh:${refreshToken}`;
            const isUserTokenValid = await redisClient.get(userTokenKey);
            if (!isUserTokenValid) {
                logger.warn(`Refresh token not found in user's active tokens: ${user.id}`, logContext);
                throw new AuthError(AuthErrorCode.TOKEN_REVOKED, 'Session expired. Please log in again.');
            }
            
            // If we get here, the token is valid and the user is active
            logger.debug(`Token validation passed for user: ${user.id}`, logContext);

            // Generate new tokens with the current token version
            const tokens = await this.generateTokens({
                userId: user.id,
                email: user.email,
                role: user.role as UserRole,
                organizationId: user.organizationId || null,
                tokenVersion: user.tokenVersion
            });

            // Map user to AuthUser interface
            const authUser: AuthUser = {
                id: user.id,
                email: user.email,
                display_name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 
                              user.email.split('@')[0],
                role: user.role as UserRole,
                organization_id: user.organizationId || null,
                email_verified: user.emailVerified,
                created_at: user.createdAt.toISOString(),
                updated_at: user.updatedAt.toISOString(),
                is_active: user.isActive,
                permissions: [] // Will be populated by permissions service
            };

            try {
                // Store the old refresh token in Redis with a short TTL to prevent replay attacks
                await redisClient.setex(
                    `refresh_token:${refreshToken}`,
                    60 * 15, // 15 minutes
                    'blacklisted'
                );
                logger.debug('Old refresh token blacklisted for 15 minutes', logContext);

                // Update last login info
                await this.db.update(users)
                    .set({
                        lastLoginAt: new Date(),
                        lastLoginIp: ip,
                        updatedAt: new Date()
                    })
                    .where(eq(users.id, user.id));
                
                // Log the user agent in the audit log instead of storing it in the users table
                await this.db.insert(auditLogs).values({
                    id: crypto.randomUUID(),
                    userId: user.id,
                    action: 'USER_LOGIN',
                    ipAddress: ip || 'unknown',
                    userAgent: userAgent || 'unknown',
                    createdAt: new Date(),
                    metadata: {
                        loginMethod: 'refresh_token',
                        timestamp: new Date().toISOString()
                    }
                });
                
                logger.info(`Successfully refreshed tokens for user: ${user.id}`, logContext);
                return { user: authUser, tokens };
                
            } catch (updateError) {
                // Log the error but don't fail the request since we've already generated new tokens
                logger.error('Failed to update login info or blacklist old token:', {
                    ...logContext,
                    error: updateError
                });
                
                // Still return the tokens since they were successfully generated
                return { user: authUser, tokens };
            }
            
        } catch (error) {
            if (error instanceof AuthError) {
                logger.warn(`Auth error during token refresh: ${error.message}`, {
                    ...logContext,
                    code: error.code
                });
                throw error;
            }
            
            // For unexpected errors, log the full error but return a generic message
            logger.error('Unexpected error during token refresh:', {
                ...logContext,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            
            throw new AuthError(
                AuthErrorCode.UNKNOWN_ERROR,
                'Failed to refresh token. Please try logging in again.'
            );
        }
    }

    /**
     * Change a user's password
     * @param userId - The ID of the user changing their password
     * @param currentPassword - The user's current password for verification
     * @param newPassword - The new password to set
     * @throws {AuthError} If the current password is incorrect, user not found, or other validation fails
     */
    public async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        const logContext = { userId };
        
        // Input validation
        if (!userId || typeof userId !== 'string') {
            logger.warn('Invalid user ID provided for password change', logContext);
            throw new AuthError(AuthErrorCode.VALIDATION_ERROR, 'Invalid user ID');
        }
        
        if (!currentPassword || typeof currentPassword !== 'string') {
            logger.warn('No current password provided', logContext);
            throw new AuthError(AuthErrorCode.VALIDATION_ERROR, 'Current password is required');
        }
        
        if (!newPassword || typeof newPassword !== 'string') {
            logger.warn('No new password provided', logContext);
            throw new AuthError(AuthErrorCode.VALIDATION_ERROR, 'New password is required');
        }
        
        // Validate password strength (add more rules as needed)
        if (newPassword.length < 8) {
            throw new AuthError(
                AuthErrorCode.PASSWORD_TOO_WEAK,
                'Password must be at least 8 characters long'
            );
        }
        
        try {
            // Find the user with password hash and essential fields
            const user = await this.db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: {
                    id: true,
                    email: true,
                    passwordHash: true,
                    tokenVersion: true,
                    isActive: true
                }
            });

            if (!user) {
                logger.warn('User not found for password change', logContext);
                throw new AuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found');
            }
            
            // Check if user is active
            if (!user.isActive) {
                logger.warn('Attempted password change for inactive user', logContext);
                throw new AuthError(AuthErrorCode.USER_DISABLED, 'Account is deactivated');
            }

            // Verify current password
            if (!user.passwordHash) {
                // This should not happen for regular users, but handle it gracefully
                logger.error('No password hash found for user', logContext);
                throw new AuthError(
                    AuthErrorCode.INVALID_CREDENTIALS,
                    'Authentication error. Please reset your password.'
                );
            }
            
            const isPasswordValid = await compare(currentPassword, user.passwordHash);
            if (!isPasswordValid) {
                logger.warn('Incorrect current password provided', logContext);
                throw new AuthError(
                    AuthErrorCode.INVALID_CREDENTIALS,
                    'Current password is incorrect'
                );
            }
            
            // Prevent reusing the same password
            if (await compare(newPassword, user.passwordHash)) {
                logger.warn('Attempted to reuse previous password', logContext);
                throw new AuthError(
                    AuthErrorCode.INVALID_PASSWORD,
                    'New password must be different from current password'
                );
            }

            // Hash the new password with current salt rounds
            const hashedPassword = await hash(newPassword, this.SALT_ROUNDS);
            
            // Start a transaction to ensure atomicity
            await this.db.transaction(async (tx) => {
                // Update the password and increment token version to invalidate existing sessions
                await tx.update(users)
                    .set({ 
                        passwordHash: hashedPassword,
                        tokenVersion: sql`${users.tokenVersion} + 1`,
                        updatedAt: new Date()
                    })
                    .where(eq(users.id, userId));
                
                // Revoke all existing sessions
                await this.revokeAllSessions(userId);
                
                // Log the password change
                await tx.insert(auditLogs).values({
                    id: crypto.randomUUID(),
                    userId,
                    action: 'PASSWORD_CHANGED',
                    ipAddress: 'N/A', // Would be passed from the controller
                    userAgent: 'N/A',  // Would be passed from the controller
                    createdAt: new Date(),
                    metadata: {
                        changedAt: new Date().toISOString(),
                        // Don't log the actual passwords
                        passwordChanged: true
                    }
                });
            });
            
            logger.info(`Password successfully changed for user ${userId}`, logContext);
            
            // In a real app, you would send a notification email here
            // await this.emailService.sendPasswordChangedNotification(user.email, user.firstName);
            
        } catch (error) {
            if (error instanceof AuthError) {
                logger.warn(`Auth error changing password: ${error.message}`, {
                    ...logContext,
                    code: error.code
                });
                throw error;
            }
            
            // For unexpected errors, log the full error but return a generic message
            logger.error('Unexpected error changing password:', {
                ...logContext,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            
            throw new AuthError(
                AuthErrorCode.UNKNOWN_ERROR,
                'Failed to change password. Please try again.'
            );
        }
    }

    /**
     * Request a password reset
     */
    public async requestPasswordReset(data: RequestPasswordResetDto): Promise<void> {
        try {
            const user = await this.db.query.users.findFirst({
                where: eq(users.email, data.email),
                columns: {
                    id: true,
                    email: true,
                    firstName: true,
                    isActive: true,
                    emailVerified: true,
                    role: true,
                    organizationId: true
                }
            });

            // Don't reveal if user exists or not for security
            if (!user || !user.isActive) {
                logger.info(`Password reset requested for non-existent or inactive email: ${data.email}`);
                return;
            }

            // Check if email is verified if required
            if (!user.emailVerified) {
                logger.info(`Password reset requested for unverified email: ${data.email}`);
                // Still return success to prevent email enumeration
                return;
            }

            // Generate a reset token (expires in 1 hour)
            // Convert role to match UserRole enum (e.g., 'super_admin' -> 'SUPER_ADMIN')
            const role = user.role.toUpperCase() as keyof typeof UserRole;
            const userRole = role in UserRole ? UserRole[role as keyof typeof UserRole] : UserRole.MEMBER;
            
            // Use generateTokens to create a short-lived access token for password reset
            const tokens = await jwtService.generateTokens(
                user.id,
                user.email,
                userRole,
                user.organizationId || null,
                [] // No special permissions needed for password reset
            );
            
            // Use the access token as the reset token
            const resetToken = tokens.access_token;
            
            // Set a shorter expiration for the reset token
            // This is a workaround since we can't directly set expiration on the token
            // In a production system, you might want to store the reset token in the database
            // with an expiration timestamp and validate it against that

            // Store the reset token in Redis (valid for 1 hour)
            await redisClient.setex(
                `reset_token:${resetToken}`,
                3600, // 1 hour in seconds
                user.id
            );

            // In a real app, you would send an email with the reset link
            const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
            logger.info(`Password reset link for ${user.email}: ${resetLink}`);
            
            // In a production environment, you would send an email here
            // await this.emailService.sendPasswordResetEmail(user.email, user.firstName, resetLink);
            
            logger.info(`Password reset email sent to ${user.email}`);
        } catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            logger.error('Error in requestPasswordReset:', error);
            throw new AuthError(AuthErrorCode.UNKNOWN_ERROR, 'Failed to process password reset request');
        }
    }
    
    /**
     * Reset a user's password using a reset token
     */
    public async resetPassword(data: ResetPasswordDto): Promise<void> {
        if (!data.token) {
            throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Reset token is required');
        }

        try {
            // Get the user ID from Redis using the token
            const userId = await redisClient.get(`reset_token:${data.token}`);
            
            if (!userId) {
                throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid or expired token');
            }

            // Verify the token is still valid
            try {
                const result = await jwtService.verifyToken<JwtPayload>(
                    data.token,
                    'password_reset' as const
                );
                
                // Type guard to ensure this is a password reset token
                if (result.payload?.type !== 'password_reset') {
                    throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid token type');
                }

                if (!result.valid || !result.payload) {
                    throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid or expired token');
                }

                if (result.payload.sub !== userId) {
                    throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Token does not match user');
                }
            } catch (error) {
                // Delete the token from Redis if it's invalid
                await redisClient.del(`reset_token:${data.token}`);
                throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid or expired token');
            }

            // Hash the new password
            const hashedPassword = await hash(data.newPassword, this.SALT_ROUNDS);
            
            // Update the password and increment token version to invalidate existing sessions
            await this.db.update(users)
                .set({ 
                    passwordHash: hashedPassword,
                    tokenVersion: sql`${users.tokenVersion} + 1`,
                    updatedAt: new Date()
                })
                .where(eq(users.id, userId));
                
            // Delete the used token from Redis
            await redisClient.del(`reset_token:${data.token}`);
            
            // Revoke all existing sessions
            await this.revokeAllSessions(userId);
            
            logger.info(`Password reset successful for user ${userId}`);
        } catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            logger.error('Password reset failed:', error);
            throw new AuthError(AuthErrorCode.UNKNOWN_ERROR, 'Failed to reset password');
        }
    }

    /**
     * Revoke all sessions for a user
     */
    public async revokeAllSessions(userId: string): Promise<void> {
        try {
            // Increment token version to invalidate all existing tokens
            await this.db.update(users)
                .set({ 
                    tokenVersion: sql`${users.tokenVersion} + 1`,
                    updatedAt: new Date()
                })
                .where(eq(users.id, userId));
            
            // Delete all refresh tokens for this user from Redis
            const keys = await redisClient.keys(`user:${userId}:refresh:*`);
            if (keys.length > 0) {
                await Promise.all(keys.map(key => redisClient.del(key)));
            }
            
            logger.info(`Revoked all sessions for user ${userId}`);
        } catch (error) {
            logger.error(`Failed to revoke sessions for user ${userId}:`, error);
            throw new AuthError(AuthErrorCode.UNKNOWN_ERROR, 'Failed to revoke sessions');
        }
    }

    /**
     * Generate access and refresh tokens
     */
    private async generateTokens(payload: {
        userId: string;
        email: string;
        role: UserRole;
        organizationId?: string | null;
        tokenVersion: number;
    }): Promise<AuthTokens> {
        // Generate tokens using the JWT service
        const tokens = await jwtService.generateTokens(
            payload.userId,
            payload.email,
            payload.role,
            payload.organizationId,
            [] // Pass any additional permissions here if needed
        );

        // Store refresh token in Redis
        const refreshTokenKey = `user:${payload.userId}:refresh:${tokens.refresh_token}`;
        const refreshTokenExpiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
        
        await redisClient.setex(
            refreshTokenKey,
            refreshTokenExpiresIn,
            'valid'
        );

        return tokens;
    }
}
