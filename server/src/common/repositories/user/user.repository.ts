import { Injectable } from 'injection-js';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../../../db/connection';
import { users, organizationMembers } from '../../../db/schema';
import { type User } from '../../../db/schema';
import { UserRepository } from './user.repository.interface';
import { BaseRepositoryImpl } from '../base.repository';

@Injectable()
export class UserRepositoryImpl extends BaseRepositoryImpl<User, string, Omit<User, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>> implements UserRepository {
  constructor() {
    super('User', users, users.id);
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.log(`Finding user by email: ${email}`);
    
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return (user as User) || null;
  }

  async findByOrganizationId(organizationId: string): Promise<User[]> {
    this.logger.log(`Finding users for organization: ${organizationId}`);
    
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    const members = await db
      .select({
        user: users
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, organizationId));
    
    return members.map(m => m.user as User);
  }

  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    this.logger.log(`Updating password for user: ${id}`);
    
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    const result = await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
    
    // For Drizzle ORM with Postgres, check the result based on updated rows
    return result !== undefined;
  }

  async updateLastLogin(id: string): Promise<boolean> {
    this.logger.log(`Updating last login for user: ${id}`);
    
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    const result = await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
    
    // For Drizzle ORM with Postgres, check the result based on updated rows
    return result !== undefined;
  }

  // Commented out as preferences field doesn't exist in schema
  // async updatePreferences(id: string, preferences: UserBookingPreferences): Promise<User | null> {
  //   this.logger.log(`Updating preferences for user: ${id}`);
  //   
  //   const db = await getDatabase();
  //   if (!db) {
  //     throw new Error('Database not initialized');
  //   }
  //   const [updatedUser] = await db
  //     .update(users)
  //     .set({
  //       preferences,
  //       updatedAt: new Date()
  //     })
  //     .where(eq(users.id, id))
  //     .returning();
  //   
  //   return updatedUser || null;
  // }
}
