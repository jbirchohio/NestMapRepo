import { hash, compare } from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { SALT_ROUNDS } from '../config/constants.js';
import { logger } from './logger.js';
import { users } from '@shared/schema';
import { dbService } from '../services/database.service.js';
import { eq, and, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

// Constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

// Types
export type AuthUser = Omit<InferSelectModel<typeof users>, 'password_hash' | 'auth_id' | 'organization_id'> & {
  password_hash: string | null;
  auth_id: string;
  organization_id: number | null;
  email_verified?: boolean;
  is_active?: boolean;
  failed_login_attempts?: number | null;
  last_failed_login?: Date | null;
};

/**
 * Hash a password using bcrypt
 * @param password - The plain text password to hash
 * @returns A promise that resolves to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await hash(password, SALT_ROUNDS);
  } catch (error) {
    logger.error('Error hashing password', { error });
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against a hash using bcrypt
 * @param password - The plain text password to verify
 * @param hashedPassword - The hashed password to verify against
 * @returns A promise that resolves to a boolean indicating if the password is valid
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    return await compare(password, hashedPassword);
  } catch (error) {
    logger.error('Error verifying password', { error });
    return false;
  }
}

/**
 * Generate a random alphanumeric string of a given length
 * @param length - The length of the random string to generate
 * @returns A random alphanumeric string
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charsLength = chars.length;
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * charsLength));
  }
  
  return result;
}

/**
 * Generate a secure random token
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a secure random token for password reset
 */
export function generatePasswordResetToken(): { token: string; expires: Date } {
  const token = randomBytes(32).toString('hex');
  const hashedToken = createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  return {
    token: hashedToken,
    expires
  };
}

/**
 * Find user by email
 * @param email - The email address to search for
 * @returns A promise that resolves to the user if found, null otherwise
 */
export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  try {
    const db = dbService.getDrizzle();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user ? mapDbUserToAuthUser(user) : null;
  } catch (error) {
    logger.error('Error finding user by email', { error, email });
    return null;
  }
}

/**
 * Map database user to AuthUser type
 */
function mapDbUserToAuthUser(dbUser: InferSelectModel<typeof users>): AuthUser {
  return {
    ...dbUser,
    email_verified: 'email_verified' in dbUser ? Boolean(dbUser.email_verified) : false,
    is_active: 'is_active' in dbUser ? Boolean(dbUser.is_active) : true,
  };
}

/**
 * Check if an account is locked based on failed login attempts
 * @param user - The user object to check
 * @returns A boolean indicating if the account is locked
 */
export function isAccountLocked(user: Pick<AuthUser, 'failed_login_attempts' | 'last_failed_login'> | null): boolean {
  if (!user) return false;
  
  // If user has fewer than max failed attempts, account is not locked
  if ((user.failed_login_attempts || 0) < MAX_FAILED_ATTEMPTS) {
    return false;
  }
  
  // If no last failed login time, can't determine lockout status
  if (!user.last_failed_login) {
    return false;
  }
  
  const lockoutTimeMs = LOCKOUT_MINUTES * 60 * 1000;
  const now = Date.now();
  const lastFailedTime = new Date(user.last_failed_login).getTime();
  
  // Check if still within lockout period
  return (now - lastFailedTime) < lockoutTimeMs;
}

/**
 * Get the remaining lockout time in minutes
 * @param lastFailedLogin - The timestamp of the last failed login
 * @returns The remaining lockout time in minutes, or 0 if not locked
 */
export function getRemainingLockoutTime(lastFailedLogin?: Date | null): number {
  if (!lastFailedLogin) return 0;
  
  const lockoutEnd = new Date(lastFailedLogin).getTime() + (LOCKOUT_MINUTES * 60 * 1000);
  const now = Date.now();
  
  if (now >= lockoutEnd) return 0;
  
  return Math.ceil((lockoutEnd - now) / (60 * 1000));
}

/**
 * Update user's failed login attempts
 */
export async function updateFailedLoginAttempts(
  userId: number,
  attempts: number,
  lastAttempt: Date
): Promise<void> {
  try {
    await dbService.getDrizzle()
      .update(users)
      .set({
        failed_login_attempts: attempts,
        last_failed_login: lastAttempt
      })
      .where(eq(users.id, userId));
  } catch (error) {
    logger.error('Error updating failed login attempts', { error, userId });
    throw new Error('Failed to update login attempts');
  }
}

/**
 * Reset user's failed login attempts
 */
export async function resetFailedLoginAttempts(userId: number): Promise<void> {
  try {
    await dbService.getDrizzle()
      .update(users)
      .set({
        failed_login_attempts: 0,
        last_failed_login: null
      })
      .where(eq(users.id, userId));
  } catch (error) {
    logger.error('Error resetting failed login attempts', { error, userId });
    throw new Error('Failed to reset login attempts');
  }
}
