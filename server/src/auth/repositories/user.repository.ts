import { eq, sql, and, gte, inArray } from 'drizzle-orm';
import { db } from '../../../db/db.js';
import { users } from '../../../db/schema.js';
import { UserRepository as CommonUserRepository } from '../../common/repositories/user/user.repository.interface.js';
import { User } from '../../../db/schema.js';
import { hash, compare } from 'bcrypt';
import { BaseRepositoryImpl } from '../../common/repositories/base.repository.js';
import { Injectable } from '@nestjs/common';
import { logger } from '../../../utils/logger.js';
import { UserBookingPreferences } from '../../common/interfaces/booking.interfaces.js';

/**
 * User repository implementation that extends the base repository implementation
 * Implements user-specific operations in addition to common CRUD operations
 */
@Injectable()
export class UserRepositoryImpl extends BaseRepositoryImpl<User, string, Omit<User, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>> implements CommonUserRepository {
  private readonly logger = logger;

  constructor() {
    super('User', users, users.id);
  }

  async findByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);
    
    return user || null;
  }

  async findById(id: string): Promise<User | null> {
    if (!id) return null;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return user || null;
  }

  async findAll(): Promise<User[]> {
    return await db.select().from(users);
  }

  async findByOrganizationId(organizationId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId));
  }

  async findByResetToken(token: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.resetToken, token),
          gte(users.resetTokenExpires, new Date())
        )
      )
      .limit(1);

    return user || null;
  }

  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
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

    await db.execute(
      sql`UPDATE ${users} 
          SET 
            failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE 
              WHEN failed_login_attempts + 1 >= ${MAX_LOGIN_ATTEMPTS} 
              THEN NOW() + INTERVAL '${LOCKOUT_MINUTES} minutes' 
              ELSE locked_until 
            END
          WHERE id = ${userId}`
    );
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

  async updateLastLogin(userId: string, ipAddress: string): Promise<void> {
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress
      })
      .where(eq(users.id, userId));
  }

  isAccountLocked(user: User): boolean {
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

  // Create method that matches the common interface
  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const hashedPassword = userData.passwordHash ? await hash(userData.passwordHash, 10) : '';
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        passwordHash: hashedPassword,
        email: userData.email.toLowerCase().trim(),
        emailVerified: false,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    if (!user) {
      throw new Error('Failed to create user');
    }
    
    return user;
  }

  async update(id: string, userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
        // Ensure email is always lowercased if being updated
        ...(userData.email ? { email: userData.email.toLowerCase().trim() } : {})
      })
      .where(eq(users.id, id))
      .returning();
    
    return user || null;
  }

  async delete(id: string): Promise<boolean> {
    const [user] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    
    return !!user;
  }

  async verifyEmail(userId: string): Promise<boolean> {
    const [user] = await db
      .update(users)
      .set({
        emailVerified: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({ emailVerified: users.emailVerified });
    
    return user?.emailVerified ?? false;
  }

  // Additional utility methods
  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return await db
      .select()
      .from(users)
      .where(inArray(users.id, ids));
  }

  async count(filter?: Partial<User>): Promise<number> {
    const query = db.select({ count: sql<number>`count(*)` }).from(users);
    
    if (filter) {
      // Add where conditions based on filter
      const conditions = Object.entries(filter)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => eq((users as any)[key], value));
      
      if (conditions.length > 0) {
        query.where(and(...conditions));
      }
    }
    
    const result = await query;
    return result[0]?.count ?? 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.id, id));
    
    return (result[0]?.count ?? 0) > 0;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    const isMatch = await compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return false;
    }

    return this.setPassword(userId, newPassword);
  }

  // Add missing method from common interface
  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          passwordHash: passwordHash, 
          updatedAt: new Date(),
          // Reset security-related fields when password is updated
          failedLoginAttempts: 0,
          lockedUntil: null
        })
        .where(eq(users.id, id))
        .returning();
      
      return !!updatedUser;
    } catch (error) {
      this.logger.error(`Failed to update password for user ${id}`, error);
      return false;
    }
  }

  // Add missing method from common interface
  async updateLastLogin(id: string): Promise<boolean> {
    const [updatedUser] = await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return !!updatedUser;
  }

  // Add missing method from common interface  
  async updatePreferences(id: string, preferences: UserBookingPreferences): Promise<User | null> {
    const [updatedUser] = await db
      .update(users)
      .set({ userPreferences: preferences, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser || null;
  }

  // Keep the original setPassword for backward compatibility
  async setPassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await hash(newPassword, 10);
      await db
        .update(users)
        .set({
          passwordHash: hashedPassword,
          passwordChangedAt: new Date(),
          updatedAt: new Date(),
          // Clear any password reset tokens when password is changed
          resetToken: null,
          resetTokenExpires: null,
          passwordResetToken: null,
          passwordResetExpires: null
        })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to set password for user ${userId}`, error);
      return false;
    }
  }
}