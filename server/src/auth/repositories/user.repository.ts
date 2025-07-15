import { db } from '../../db';
import { users } from '../../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';

// Define user interface based on DB schema structure
export interface IUser {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  organizationId: string | null;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  // Additional fields needed for our implementation
  passwordChangedAt: Date | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  resetToken: string | null;
  resetTokenExpires: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  mfaSecret: string | null;
  lastLoginIp: string | null;
  isActive: boolean;
}

// Define interface for the user repository
export interface IUserRepository {
  findByEmail(email: string): Promise<IUser | null>;
  findById(id: string): Promise<IUser | null>;
  findAll(): Promise<IUser[]>;
  findByOrganizationId(organizationId: string): Promise<IUser[]>;
  findByResetToken(token: string): Promise<IUser | null>;
  create(userData: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser>;
  update(id: string, userData: Partial<IUser>): Promise<IUser | null>;
  delete(id: string): Promise<boolean>;
  setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  clearPasswordResetToken(userId: string): Promise<void>;
  incrementFailedLoginAttempts(userId: string): Promise<void>;
  resetFailedLoginAttempts(userId: string): Promise<void>;
  lockAccount(userId: string, lockedUntil: Date): Promise<void>;
  verifyEmail(userId: string): Promise<boolean>;
  findByIds(ids: string[]): Promise<IUser[]>;
  count(filter?: Partial<Record<string, unknown>>): Promise<number>;
  exists(id: string): Promise<boolean>;
}

/**
 * User repository implementation
 * Implements user-specific operations for data access
 */
export class UserRepositoryImpl implements IUserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    if (!email) return null;
    // Use the correct query approach
    const result = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email.toLowerCase().trim())
    });
    return result as IUser | null;
  }

  async findById(id: string): Promise<IUser | null> {
    if (!id) return null;
    // Use the correct query approach
    const result = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id)
    });
    return result as IUser | null;
  }

  async findAll(): Promise<IUser[]> {
    // Use the correct query approach
    const result = await db.select().from(users);
    return result as IUser[];
  }

  async findByOrganizationId(organizationId: string): Promise<IUser[]> {
    // Use the correct property name
    const result = await db.select().from(users).where(
      eq(users.organizationId, organizationId)
    );
    return result as IUser[];
  }

  async findByResetToken(token: string): Promise<IUser | null> {
    // In a real implementation, we'd query by reset token and expiration
    const result = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.resetToken, token)
    });
    
    return result as IUser | null;
  }

  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    // Use the correct query approach
    await db
      .update(users)
      .set({
        resetToken: token,
        resetTokenExpires: expiresAt
      })
      .where(eq(users.id, userId));
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        resetToken: null,
        resetTokenExpires: null
      })
      .where(eq(users.id, userId));
  }

  async incrementFailedLoginAttempts(userId: string): Promise<void> {
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 15;

    // Get current user first
    const user = await this.findById(userId);
    if (!user) return;

    // Calculate new values
    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    let lockedUntil = user.lockedUntil;
    
    if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + (LOCKOUT_MINUTES * 60 * 1000));
    }

    // Update the user
    await db
      .update(users)
      .set({
        failedLoginAttempts: failedAttempts,
        lockedUntil: lockedUntil
      })
      .where(eq(users.id, userId));
  }

  async resetFailedLoginAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  isAccountLocked(user: IUser): boolean {
    return !!(user.lockedUntil && new Date(user.lockedUntil) > new Date());
  }

  async lockAccount(userId: string, lockedUntil: Date): Promise<void> {
    await db
      .update(users)
      .set({
        lockedUntil,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Create method
  async create(userData: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser> {
    // Create a user with default values
    const user = {
      id: uuidv4(),
      ...userData,
      email: userData.email.toLowerCase().trim(),
      emailVerified: userData.emailVerified ?? false,
      isActive: userData.isActive ?? true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // For the mock implementation, we'll just return the user as if it was inserted
    // In a real DB implementation, we would insert and return the result
    return user;
  }

  async update(id: string, userData: Partial<IUser>): Promise<IUser | null> {
    // Get the current user first
    const existingUser = await this.findById(id);
    if (!existingUser) return null;

    // Create updated user object
    const updatedUser = {
      ...existingUser,
      ...userData,
      // Ensure email is always lowercased if being updated
      ...(userData.email ? { email: userData.email.toLowerCase().trim() } : {}),
      updatedAt: new Date()
    };

    // Update in the database
    await db
      .update(users)
      .set(updatedUser)
      .where(eq(users.id, id));
    
    return updatedUser;
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Use the same pattern as other methods in the repository
      const user = await this.findById(id);
      if (!user) return false;
      
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async verifyEmail(userId: string): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({
          emailVerified: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      console.error('Error verifying email:', error);
      return false;
    }
  }

  // Additional utility methods
  async findByIds(ids: string[]): Promise<IUser[]> {
    if (ids.length === 0) return [];
    
    const result = await db
      .select()
      .from(users)
      .where(sql`${users.id} IN (${ids.join(',')})`);
      
    return result as IUser[];
  }

  async count(): Promise<number> {
    const result = await db.select({ count: sql`COUNT(*)` }).from(users);
    return Number(result[0]?.count || 0);
  }

  async exists(id: string): Promise<boolean> {
    const user = await this.findById(id);
    return !!user;
  }
}
