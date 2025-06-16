import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../../db';
import { users, organizationMembers, type User } from '../../../../db/schema.js';
import { UserRepository } from './user.repository.interface';
import { UserBookingPreferences } from '../../interfaces/booking.interfaces';
import { BaseRepositoryImpl } from '../base.repository';

@Injectable()
export class UserRepositoryImpl extends BaseRepositoryImpl<User, string, Omit<User, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>> implements UserRepository {
  constructor() {
    super('User', users, users.id);
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.log(`Finding user by email: ${email}`);
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return user || null;
  }

  async findByOrganizationId(organizationId: string): Promise<User[]> {
    this.logger.log(`Finding users for organization: ${organizationId}`);
    
    const members = await db
      .select({
        user: users
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, organizationId));
    
    return members.map(m => m.user);
  }

  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    this.logger.log(`Updating password for user: ${id}`);
    
    const result = await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
    
    return result.rowCount > 0;
  }

  async updateLastLogin(id: string): Promise<boolean> {
    this.logger.log(`Updating last login for user: ${id}`);
    
    const result = await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
    
    return result.rowCount > 0;
  }

  async updatePreferences(id: string, preferences: UserBookingPreferences): Promise<User | null> {
    this.logger.log(`Updating preferences for user: ${id}`);
    
    const [updatedUser] = await db
      .update(users)
      .set({
        preferences,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser || null;
  }
}
