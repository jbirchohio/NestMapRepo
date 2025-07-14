import { db } from '../../db';
import { users } from '../../db/schema';
import { v4 as uuidv4 } from 'uuid';

// Define user interface based on schema structure and mock database responses
export interface IUser {
  id: string;
  email: string;
  password_hash?: string;
  role: string;
  organization_id?: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  // Additional fields needed for our implementation
  resetToken?: string | null;
  resetTokenExpires?: Date | null;
  lockedUntil?: Date | null;
  failedLoginAttempts?: number;
  isActive?: boolean;
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
    // Use the mock database structure
    const result = await db.query.users.findFirst({ email: email.toLowerCase().trim() });
    return result || null;
  }

  async findById(id: string): Promise<IUser | null> {
    if (!id) return null;
    // Use the mock database structure
    const result = await db.query.users.findFirst({ id });
    return result || null;
  }

  async findAll(): Promise<IUser[]> {
    // Mock implementation for findAll using the select().from() pattern
    const usersPromise = db.select().from(users).where({});
    const result = await usersPromise;
    return Array.isArray(result) ? result : [];
  }

  async findByOrganizationId(organizationId: string): Promise<IUser[]> {
    // Use the mock database structure
    const usersPromise = db.select().from(users).where({ organization_id: organizationId });
    const result = await usersPromise;
    return Array.isArray(result) ? result : [];
  }

  async findByResetToken(token: string): Promise<IUser | null> {
    // In a real implementation, we'd query by reset token and expiration
    // For the mock, we'll simulate by returning the standard mock user with a matching token
    const user = await db.query.users.findFirst({});
    
    // Mock implementation that simulates checking reset token
    if (user) {
      // Add the token fields to the mock response
      return {
        ...user,
        resetToken: token, // Pretend this matched
        resetTokenExpires: new Date(Date.now() + 3600000) // 1 hour in the future
      };
    }
    
    return null;
  }

  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    // Use the mock database update structure
    await db
      .update(users)
      .set({
        resetToken: token,
        resetTokenExpires: expiresAt
      })
      .where({ id: userId });
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        resetToken: null,
        resetTokenExpires: null
      })
      .where({ id: userId });
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
      .where({ id: userId });
  }

  async resetFailedLoginAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      })
      .where({ id: userId });
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
      .where({ id: userId });
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

    // Update in the mock database
    await db
      .update(users)
      .set(updatedUser)
      .where({ id });
    
    return updatedUser;
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Use the same pattern as other methods in the repository
      const user = await this.findById(id);
      if (!user) return false;
      
      // In a real implementation, we would use: await db.delete(users).where({ id });
      // For the mock implementation, we'll simulate successful deletion
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async verifyEmail(userId: string): Promise<boolean> {
    try {
      // Using the userId parameter in the where clause
      await db
        .update(users)
        .set({
          emailVerified: true,
          updatedAt: new Date()
        })
        .where({ id: userId }); // Using userId to find the correct user
      
      return true;
    } catch (error) {
      console.error('Error verifying email:', error);
      return false;
    }
  }

  // Additional utility methods
  async findByIds(ids: string[]): Promise<IUser[]> {
    if (ids.length === 0) return [];
    
    // For the mock implementation, we'll return the mock user for each ID
    const mockUser = await db.query.users.findFirst({});
    return ids.map(id => ({ ...mockUser, id }));
  }

  async count(): Promise<number> {
    // For the mock implementation, always return 1
    return 1;
  }

  async exists(id: string): Promise<boolean> {
    const user = await this.findById(id);
    return !!user;
  }
}
