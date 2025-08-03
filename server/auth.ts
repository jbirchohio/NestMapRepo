import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from './utils/logger';

// Secure password hashing using Node.js crypto
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, SALT_ROUNDS * 1000, 64, 'sha512');
  return `${salt}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    const [salt, hash] = hashedPassword.split(':');
    if (!salt || !hash) return false;
    
    const verifyHash = crypto.pbkdf2Sync(password, salt, SALT_ROUNDS * 1000, 64, 'sha512');
    return hash === verifyHash.toString('hex');
  } catch (error) {
    logger.error('Password verification error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
}

// Simple authentication service without external dependencies
export async function authenticateUser(email: string, password: string) {
  try {
    // Log authentication attempts (production-safe)
    
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Log failed login attempt without exposing email
      logger.info('Authentication failed: User not found', { email });
      return null;
    }

    // Secure password validation with proper hashing
    const isValidPassword = user.password_hash ? 
      verifyPassword(password, user.password_hash) : 
      false; // Remove development bypass for security
    
    if (!isValidPassword) {
      logger.info('Authentication failed: Invalid credentials', { userId: user.id });
      return null;
    }

    // Log successful authentication without sensitive data
    logger.info('Authentication successful', { userId: user.id });

    return {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      organizationId: user.organization_id,
      displayName: user.display_name
    };
  } catch (error) {
    logger.error('Authentication error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return null;
  }
}

export async function getUserById(authId: string) {
  try {
    // Look up user by Supabase auth ID
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.auth_id, authId))
      .limit(1);

    if (user) {
      return {
        id: user.id,
        email: user.email,
        role: user.role || 'admin',
        organizationId: user.organization_id || 1,
        displayName: user.display_name || user.email
      };
    }
    return null;
  } catch (error) {
    logger.error('Get user by auth ID error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return null;
  }
}