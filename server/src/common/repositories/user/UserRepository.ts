import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { and, asc, desc, eq, gte, ilike, lte, or, SQL, sql } from 'drizzle-orm';
import { db } from '../../../../db/db.js';
import { users } from '../../../../db/schema.js';
import type { User as DbUser } from '../../../../db/schema.js';
import { hash, compare } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// Types
export type UserRole = 'admin' | 'manager' | 'member' | 'guest';

export interface UserSettings {
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  preferences?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  organizationId: string | null;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  timezone: string;
  locale: string;
  settings: UserSettings;
  isSuspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  usersByRole: Record<string, number>;
  usersByOrganization: Record<string, number>;
  signupsOverTime: Record<string, number>;
  updatedAt: Date;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface UserCreateInput {
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  role?: UserRole;
  organizationId?: string | null;
  emailVerified?: boolean;
  isActive?: boolean;
  settings?: UserSettings;
}

export interface UserUpdateInput {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  organizationId?: string | null;
  emailVerified?: boolean;
  isActive?: boolean;
  settings?: UserSettings;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface UserListParams extends PaginationParams {
  search?: string;
  role?: UserRole;
  organizationId?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeInactive?: boolean;
}

// Default user settings
const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'system',
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
  preferences: {},
};

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  /**
   * Maps a database user to a domain user
   */
  private mapDbUserToUser(dbUser: DbUser): UserProfile {
    let userSettings: UserSettings = { ...DEFAULT_USER_SETTINGS };
    
    // Parse settings if they exist
    if (dbUser.settings) {
      try {
        const parsedSettings = typeof dbUser.settings === 'string' 
          ? JSON.parse(dbUser.settings) 
          : dbUser.settings;
        
        if (parsedSettings && typeof parsedSettings === 'object') {
          userSettings = { ...DEFAULT_USER_SETTINGS, ...parsedSettings };
        }
      } catch (error) {
        this.logger.error('Error parsing user settings:', error);
      }
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username || `${dbUser.firstName?.toLowerCase()}.${dbUser.lastName?.toLowerCase()}`,
      firstName: dbUser.firstName || '',
      lastName: dbUser.lastName || '',
      fullName: [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || dbUser.email.split('@')[0],
      avatarUrl: null,
      role: dbUser.role as UserRole,
      organizationId: dbUser.organizationId || null,
      emailVerified: dbUser.emailVerified || false,
      isActive: dbUser.isActive ?? true,
      lastLoginAt: dbUser.lastLoginAt || null,
      timezone: 'UTC',
      locale: 'en-US',
      settings: userSettings,
      isSuspended: false,
      createdAt: dbUser.createdAt || new Date(),
      updatedAt: dbUser.updatedAt || new Date(),
    };
  }

  /**
   * Builds where conditions for user queries
   */
  private buildWhereConditions(params: Partial<UserListParams> = {}): SQL[] {
    const conditions: SQL[] = [];
    
    if (params.search) {
      const searchTerm = `%${params.search}%`;
      conditions.push(
        or(
          ilike(users.email, searchTerm),
          ilike(users.username, searchTerm),
          ilike(users.firstName, searchTerm),
          ilike(users.lastName, searchTerm)
        )
      );
    }

    if (params.role) {
      conditions.push(eq(users.role, params.role));
    }

    if (params.organizationId) {
      conditions.push(eq(users.organizationId, params.organizationId));
    }

    if (params.isActive !== undefined) {
      conditions.push(eq(users.isActive, params.isActive));
    }

    if (params.emailVerified !== undefined) {
      conditions.push(eq(users.emailVerified, params.emailVerified));
    }

    return conditions;
  }

  //#region CRUD Operations

  async findById(id: string): Promise<UserProfile | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      return user ? this.mapDbUserToUser(user) : null;
    } catch (error) {
      this.logger.error(`Error finding user by id ${id}:`, error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      return user ? this.mapDbUserToUser(user) : null;
    } catch (error) {
      this.logger.error(`Error finding user by email ${email}:`, error);
      throw error;
    }
  }

  async findByEmailAndOrganization(email: string, organizationId: string): Promise<UserProfile | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.email, email),
            eq(users.organizationId, organizationId)
          )
        )
        .limit(1);
      
      return user ? this.mapDbUserToUser(user) : null;
    } catch (error) {
      this.logger.error(
        `Error finding user by email ${email} and organization ${organizationId}:`,
        error
      );
      throw error;
    }
  }

  async findAll(params?: UserListParams): Promise<PaginatedResponse<UserProfile>> {
    try {
      const { 
        page = 1, 
        limit = 20, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        includeInactive = false,
        ...filters 
      } = params || {};

      // Build where conditions
      const conditions = this.buildWhereConditions(filters);
      
      // Only include active users by default
      if (!includeInactive && filters.isActive === undefined) {
        conditions.push(eq(users.isActive, true));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(users);
        
      if (whereClause) {
        countQuery.where(whereClause);
      }
      
      const [countResult] = await countQuery;
      const total = Number(countResult?.count || 0);
      const offset = (page - 1) * limit;

      // Get paginated results
      const query = db
        .select()
        .from(users);
        
      if (whereClause) {
        query.where(whereClause);
      }
      
      // Handle sorting
      const orderByField = sortBy in users ? users[sortBy as keyof typeof users] : users.createdAt;
      const orderByClause = sortOrder === 'asc' ? asc(orderByField) : desc(orderByField);
      
      const dbUsers = await query
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Map database users to domain users
      const items = dbUsers.map(user => this.mapDbUserToUser(user));

      return {
        items,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + items.length < total,
        },
      };
    } catch (error) {
      this.logger.error('Error finding users:', error);
      throw error;
    }
  }

  async create(userData: UserCreateInput): Promise<UserProfile> {
    try {
      // Check if email already exists
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash password if provided
      const hashedPassword = userData.password ? await hash(userData.password, 10) : null;

      const newUser = {
        id: uuidv4(),
        email: userData.email,
        username: userData.username || userData.email.split('@')[0],
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        passwordHash: hashedPassword || '',
        role: userData.role || 'member',
        organizationId: userData.organizationId || null,
        emailVerified: userData.emailVerified || false,
        isActive: userData.isActive !== false, // Default to true if not set
        settings: userData.settings ? JSON.stringify(userData.settings) : JSON.stringify(DEFAULT_USER_SETTINGS),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [createdUser] = await db.insert(users).values(newUser).returning();
      return this.mapDbUserToUser(createdUser);
    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  async update(id: string, userData: UserUpdateInput): Promise<UserProfile | null> {
    try {
      const existingUser = await this.findById(id);
      if (!existingUser) {
        return null;
      }

      // Check if email is being updated to an existing email
      if (userData.email && userData.email !== existingUser.email) {
        const userWithEmail = await this.findByEmail(userData.email);
        if (userWithEmail && userWithEmail.id !== id) {
          throw new ConflictException('Email already in use by another user');
        }
      }

      // Create a type-safe update object
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };
      
      // Only add defined fields to the update object
      if (userData.email !== undefined) updateData.email = userData.email;
      if (userData.username !== undefined) updateData.username = userData.username;
      if (userData.firstName !== undefined) updateData.firstName = userData.firstName;
      if (userData.lastName !== undefined) updateData.lastName = userData.lastName;
      if (userData.role !== undefined) updateData.role = userData.role;
      if (userData.organizationId !== undefined) updateData.organizationId = userData.organizationId;
      if (userData.emailVerified !== undefined) updateData.emailVerified = userData.emailVerified;
      if (userData.isActive !== undefined) updateData.isActive = userData.isActive;
      if (userData.settings !== undefined) {
        updateData.settings = JSON.stringify({
          ...(existingUser.settings || {}),
          ...userData.settings,
        });
      }

      if (Object.keys(updateData).length === 1) { // Only updatedAt was set
        return existingUser; // No actual changes to update
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      return updatedUser ? this.mapDbUserToUser(updatedUser) : null;
    } catch (error) {
      this.logger.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Soft delete by setting isActive to false
      const result = await db
        .update(users)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(users.id, id));
      
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  }

  //#endregion

  //#region Authentication

  async updatePassword(id: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Get the user with password hash
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      if (!user || !user.passwordHash) {
        throw new NotFoundException('User not found or has no password set');
      }
      
      // Verify current password
      const isPasswordValid = await compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }
      
      // Hash and update password
      const hashedPassword = await hash(newPassword, 10);
      const result = await db
        .update(users)
        .set({ 
          passwordHash: hashedPassword,
          updatedAt: new Date() 
        })
        .where(eq(users.id, id));
      
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error(`Error updating password for user ${id}:`, error);
      throw error;
    }
  }

  async updateLastLogin(id: string): Promise<boolean> {
    try {
      const result = await db
        .update(users)
        .set({ 
          lastLoginAt: new Date(),
          updatedAt: new Date() 
        })
        .where(eq(users.id, id));
      
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error(`Error updating last login for user ${id}:`, error);
      throw error;
    }
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    try {
      // Get user with password hash
      const [user] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, userId),
          eq(users.isActive, true)
        ))
        .limit(1);
      
      if (!user || !('passwordHash' in user) || !user.passwordHash) {
        return false;
      }
      
      return await compare(password, user.passwordHash);
    } catch (error) {
      this.logger.error(`Error verifying password for user ${userId}:`, error);
      return false; // In case of error, don't grant access
    }
  }

  //#endregion

  //#region Profile & Stats

  async getProfile(userId: string): Promise<UserProfile> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      
      // In a real implementation, you would fetch additional profile data here
      return user;
    } catch (error) {
      this.logger.error(`Error getting profile for user ${userId}:`, error);
      throw error;
    }
  }

  async getStats(): Promise<UserStats> {
    try {
      // Get total users
      const [totalUsersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      
      const totalUsers = Number(totalUsersResult?.count || 0);
      
      // Get active users
      const [activeUsersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.isActive, true));
      
      const activeUsers = Number(activeUsersResult?.count || 0);
      
      // Get users by role (simplified)
      const usersByRole = {};
      
      // Get users by organization (simplified)
      const usersByOrganization = {};
      
      // Get signups over time (simplified)
      const signupsOverTime = {};
      
      return {
        totalUsers,
        activeUsers,
        usersByRole,
        usersByOrganization,
        signupsOverTime,
        updatedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Error getting user stats:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        usersByRole: {},
        usersByOrganization: {},
        signupsOverTime: {},
        updatedAt: new Date()
      };
    }
  }

  async getRecentActivities(limit = 20): Promise<UserActivity[]> {
    try {
      this.logger.log(`Fetching recent activities, limit: ${limit}`);
      
      // In a real implementation, you would query an activities table
      // This is a simplified placeholder
      return [];
    } catch (error) {
      this.logger.error('Error getting recent activities:', error);
      return [];
    }
  }

  //#endregion
}
