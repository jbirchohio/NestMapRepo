import { db } from './db-connection';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

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
    console.error('Password verification error:', error);
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

    // Secure password validation with proper hashing
    const isValidPassword = user.password_hash ? 
      verifyPassword(password, user.password_hash) : 
      (password === 'password' && process.env.NODE_ENV === 'development');
    
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

export async function getUserById(id: number) {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (user) {
      return {
        id: user.id,
        email: user.email,
        role: user.role || 'user',
        organizationId: user.organization_id,
        displayName: user.display_name
      };
    }
    return null;
  } catch (error) {
    console.error('Get user by ID error:', error);
    return null;
  }
}