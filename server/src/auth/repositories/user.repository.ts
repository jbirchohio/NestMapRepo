import { getDatabase } from '../../db';
import { users } from '../../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../../db/schema';
import { eq } from '../../utils/drizzle-shim';
import { sql } from '../../utils/drizzle-shim';

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
  private async getDb() {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database connection not initialized');
    }
    return db;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    if (!email) return null;
    const db = await this.getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);
    return (user as IUser) || null;
  }

  async findById(id: string): Promise<IUser | null> {
    if (!id) return null;
    const db = await this.getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return (user as IUser) || null;
  }

  async findAll(): Promise<IUser[]> {
    const db = await this.getDb();
    const result = await db
      .select()
      .from(users);
    return result as IUser[];
  }

  async findByOrganizationId(organizationId: string): Promise<IUser[]> {
    if (!organizationId) return [];
    const db = await this.getDb();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId));
    return result as IUser[];
  }

  async findByResetToken(token: string): Promise<IUser | null> {
    if (!token) return null;
    const db = await this.getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.resetToken, token))
      .limit(1);
    return (user as IUser) || null;
  }

  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    const db = await this.getDb();
    await db
      .update(users)
      .set({
        resetToken: token,
        resetTokenExpires: expiresAt,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    const db = await this.getDb();
    await db
      .update(users)
      .set({
        resetToken: null,
        resetTokenExpires: null,
        updatedAt: new Date()
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
    const db = await this.getDb();
    await db
      .update(users)
      .set({
        failedLoginAttempts: failedAttempts,
        lockedUntil: lockedUntil,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async resetFailedLoginAttempts(userId: string): Promise<void> {
    const db = await this.getDb();
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  isAccountLocked(user: IUser): boolean {
    return !!(user.lockedUntil && new Date(user.lockedUntil) > new Date());
  }

  async lockAccount(userId: string, lockedUntil: Date): Promise<void> {
    const db = await this.getDb();
    await db
      .update(users)
      .set({
        lockedUntil,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Create method - real database implementation
  async create(userData: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser> {
    const userId = uuidv4();
    const now = new Date();
    
    // Create user data with generated ID and timestamps
    const userToInsert = {
      id: userId,
      ...userData,
      email: userData.email.toLowerCase().trim(),
      emailVerified: userData.emailVerified ?? false,
      isActive: userData.isActive ?? true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now
    };

    try {
      // Insert into database and return the created user
      const db = await this.getDb();
      const [insertedUser] = await db
        .insert(users)
        .values(userToInsert)
        .returning();
      
      return insertedUser as IUser;
    } catch (error) {
      console.error('Error creating user:', error);
      
      // Check for unique constraint violations
      if (error instanceof Error && error.message.includes('unique')) {
        if (error.message.includes('email')) {
          throw new Error('Email already exists');
        }
        if (error.message.includes('username')) {
          throw new Error('Username already exists');
        }
      }
      
      throw new Error('Failed to create user');
    }
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
    const db = await this.getDb();
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
      
      const db = await this.getDb();
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async verifyEmail(userId: string): Promise<boolean> {
    try {
      const db = await this.getDb();
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
    
    const db = await this.getDb();
    // Use parameterized query for better security
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await db
      .select()
      .from(users)
      .where(sql`${users.id} IN (${sql.raw(placeholders)})`, [...ids]);
      
    return result as IUser[];
  }

  async count(filter?: Partial<Record<string, unknown>>): Promise<number> {
    const db = await this.getDb();
    let query = db.select({ count: sql<number>`count(*)` }).from(users);
    
    // Apply filters if provided
    if (filter) {
      const conditions = Object.entries(filter).map(([key, value]) => {
        return sql`${users[key as keyof typeof users]} = ${value}`;
      });
      
      if (conditions.length > 0) {
        query = query.where(sql.join(conditions, ' AND '));
      }
    }
    
    const result = await query;
    return result[0]?.count ?? 0;
  }

  async exists(id: string): Promise<boolean> {
    if (!id) return false;
    const db = await this.getDb();
    const [result] = await db
      .select({ exists: sql<boolean>`1` })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return !!result?.exists;
  }
}



