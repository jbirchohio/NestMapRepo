import { dbService } from '../services/database.service.js';
import { users } from '@@shared/schema';
import { BaseDAL } from './base.dal.js';
import { sql } from 'drizzle-orm';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  organizationId: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class UserDAL extends BaseDAL<User> {
  protected table = users;
  protected cacheTtl = 300; // 5 minutes
  
  // Define schema relationships
  protected schema = {
    relations: {
      organization: {
        table: 'organizations',
        foreignKey: 'organizationId',
        fields: ['id', 'name', 'domain']
      }
    }
  };

  /**
   * Find a user by email
   */
  public async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email });
  }

  /**
   * Find active users in an organization
   */
  public async findActiveByOrganization(organizationId: string): Promise<User[]> {
    return this.findAll({
      organizationId,
      isActive: true
    }, {
      orderBy: [{ column: 'lastName', direction: 'asc' }],
      relations: ['organization']
    });
  }

  /**
   * Update user's last login timestamp
   */
  public async updateLastLogin(userId: string): Promise<void> {
    await dbService.getDrizzle()
      .update(users)
      .set({ 
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(sql`${users.id}::text = ${userId}`);
    
    // Invalidate cache for this user
    await this.invalidateCache(`*:${userId}:*`);
  }

  /**
   * Soft delete a user
   */
  public async softDelete(userId: string): Promise<void> {
    await dbService.getDrizzle()
      .update(users)
      .set({ 
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(sql`${users.id}::text = ${userId}`);
    
    // Invalidate cache for this user
    await this.invalidateCache(`*:${userId}:*`);
  }
}

// Export a singleton instance
export const userDAL = new UserDAL();
