import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Security parameters - follow OWASP recommendations
const PBKDF2_ITERATIONS = 310000; // OWASP recommendation as of 2023
const SALT_BYTES = 32; // 256 bits
const HASH_BYTES = 64; // 512 bits
const HASH_ALGORITHM = 'sha512';
const HASH_FORMAT_VERSION = 'v1';

/**
 * Hashes a password using PBKDF2 with configurable iterations
 * @param password The plaintext password to hash
 * @returns A string containing the hashing parameters and hash in format: v1:iterations:salt:hash
 * @throws {Error} If password is empty or hashing fails
 */
export function hashPassword(password: string): string {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  try {
    // Generate a cryptographically secure random salt
    const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
    
    // Generate the hash
    const hash = crypto.pbkdf2Sync(
      password,
      salt,
      PBKDF2_ITERATIONS,
      HASH_BYTES,
      HASH_ALGORITHM
    ).toString('hex');
    
    // Return format: version:iterations:salt:hash
    return `${HASH_FORMAT_VERSION}:${PBKDF2_ITERATIONS}:${salt}:${hash}`;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verifies a password against a stored hash
 * @param password The plaintext password to verify
 * @param hashedPassword The stored hash in format v1:iterations:salt:hash
 * @returns boolean indicating if the password matches the hash
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  if (!password || !hashedPassword) return false;
  
  try {
    // Parse the stored hash components
    const [version, iterationsStr, salt, storedHash] = hashedPassword.split(':');
    
    // Validate hash format
    if (version !== HASH_FORMAT_VERSION || !salt || !storedHash || !iterationsStr) {
      console.warn('Invalid hash format or version');
      return false;
    }
    
    const iterations = parseInt(iterationsStr, 10);
    if (isNaN(iterations) || iterations < 1) {
      console.warn('Invalid iteration count in hash');
      return false;
    }
    
    // Generate hash with the same parameters
    const verifyHash = crypto.pbkdf2Sync(
      password,
      salt,
      iterations,
      HASH_BYTES,
      HASH_ALGORITHM
    ).toString('hex');
    
    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(storedHash, 'hex'),
      Buffer.from(verifyHash, 'hex')
    );
  } catch (error) {
    // Don't leak information about the error
    console.error('Error verifying password:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Simple authentication service without external dependencies
export async function authenticateUser(email: string, password: string) {
  try {
    console.log('Authenticating user with email:', email);
    
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.log('User not found for email:', email);
      return null;
    }

    // Secure password validation
    if (!user.password_hash) {
      console.log('No password hash found for user:', email);
      return null;
    }

    // Log minimal debug info in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Password verification debug:', {
        hasPasswordHash: true,
        passwordHashPrefix: user.password_hash.substring(0, 4) + '...',
        isDevelopment: true
      });
    }
    
    const isValidPassword = verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      console.log('Invalid password for email:', email);
      return null;
    }

    console.log('Successful authentication for user:', {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      organizationId: user.organization_id,
      displayName: user.display_name
    };
  } catch (error) {
    console.error('Authentication error:', error);
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
    console.error('Get user by auth ID error:', error);
    return null;
  }
}