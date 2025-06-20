import { eq, sql, and, isNull, gte, inArray } from 'drizzle-orm';
import { db } from '../../../db/db.js';
import { users } from '../../../db/schema.js';
import { UserRepository as CommonUserRepository } from '../../common/repositories/user/user.repository.interface.js';
import { User } from '../../../db/schema.js';
import { hash, compare } from 'bcryptjs';
import { BaseRepositoryImpl } from '../../common/repositories/base.repository.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserBookingPreferences } from '../../common/interfaces/booking.interfaces.js';

/**
 * User repository implementation that extends the base repository implementation
 * Implements user-specific operations in addition to common CRUD operations
 */
@Injectable()
export class UserRepositoryImpl extends BaseRepositoryImpl<User, string, Omit<User, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>> implements CommonUserRepository {
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
    
    return user;
  }

  // Implement common interface methods
  async findAll(): Promise<User[]> {
    return db.select().from(users).all();
  }

  async findByOrganizationId(organizationId: string): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId));
  }

  async findById(id: string): Promise<User | null> {
    if (!id) return null;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return user;
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
    const hashedPassword = userData.password ? await hash(userData.password, 10) : '';
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
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

  // Alias deleteUser to delete to match the common interface
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

  // Additional required methods
  async findAll(): Promise<User[]> {
    return await db.select().from(users);
  }

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
      // This is a simplified version - you might need to adjust based on your needs
      const conditions = Object.entries(filter)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => eq(users[key as keyof User], value));
      
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

  async findByOrganizationId(organizationId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId));
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'emailVerified' | 'isActive' | 'failedLoginAttempts' | 'lockedUntil'>): Promise<User> {
    const passwordHash = data.passwordHash || ''; // You might want to handle this differently
    return this.createUser(data, passwordHash);
  }

  async update(id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    return user || null;
  }

  async delete(id: string): Promise<boolean> {
    const [user] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });
    
    return !!user;
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
          password: passwordHash, 
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
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return !!updatedUser;
  }

  // Add missing method from common interface
  async updatePreferences(id: string, preferences: UserBookingPreferences): Promise<User | null> {
    const [updatedUser] = await db
      .update(users)
      .set({ preferences, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser || null;
  }

  // Keep the original setPassword as an alias for backward compatibility
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

  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await hash(newPassword, 10);
      await db
        .update(users)
        .set({
          passwordHash: hashedPassword,
          passwordChangedAt: new Date(),
          updatedAt: new Date(),
          // Clear any password reset tokens when password is updated
          resetToken: null,
          resetTokenExpires: null,
          passwordResetToken: null,
          passwordResetExpires: null
        })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to update password for user ${userId}`, error);
      return false;
    }
  }

  async updatePreferences(userId: string, preferences: Record<string, any>): Promise<boolean> {
    try {
      // Get current preferences
      const [user] = await db
        .select({ currentPreferences: users.preferences })
        .from(users)
        .where(eq(users.id, userId));
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Merge new preferences with existing ones
      const updatedPreferences = {
        ...(user.currentPreferences || {}),
        ...preferences
      };
      
      // Update user with merged preferences
      await db
        .update(users)
        .set({
          preferences: updatedPreferences,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to update preferences for user ${userId}`, error);
      return false;
    }
  }
}
