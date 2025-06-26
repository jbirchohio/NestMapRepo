import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { logger } from '../../../../utils/logger.js';
import { and, asc, desc, eq, ilike, or, SQL, sql } from 'drizzle-orm';
import { db } from '../../../../db/db.js';
import { users, userSettings } from '../../../../db/schema.js';
import { auditLogs } from '../../../../db/auditLog.js';
import type { User as DbUser, UserSettings as DbUserSettings } from '../../../../db/schema.js';
import { BaseRepositoryImpl } from '../base.repository.js';
import { hash, compare } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import type { 
  User, 
  UserCreateInput, 
  UserListParams, 
  UserUpdateInput, 
  UserRole, 
  UserSettings, 
  UserProfile, 
  UserStats, 
  UserActivity,
  PaginatedResponse,
  PaginationParams
} from '../../types/user.types.js';

@Injectable()
export class UserRepository extends BaseRepositoryImpl<User, string, UserCreateInput, UserUpdateInput> {
  protected logger = logger;
  
  constructor() {
    super('user', users, users.id);
  }

  public async mapToModel(dbUser: any): Promise<User> {
    if (!dbUser) {
      throw new Error('User data is required');
    }

    // Create the user object with all required fields first
    const user: User = {
      id: dbUser.id || '',
      email: dbUser.email || '',
      username: dbUser.username || '',
      firstName: dbUser.firstName || null,
      lastName: dbUser.lastName || null,
      passwordHash: dbUser.passwordHash || null,
      role: (dbUser.role as UserRole) || 'member',
      organizationId: dbUser.organizationId || null,
      emailVerified: Boolean(dbUser.emailVerified),
      isActive: dbUser.isActive !== false, // Default to true if not set
      mfaEnabled: Boolean(dbUser.mfaSecret),
      lastLoginAt: dbUser.lastLoginAt ? new Date(dbUser.lastLoginAt) : null,
      createdAt: dbUser.createdAt ? new Date(dbUser.createdAt) : new Date(),
      updatedAt: dbUser.updatedAt ? new Date(dbUser.updatedAt) : new Date(),
      settings: null, // Will be set below if available
    };

    // Fetch user settings if they exist
    try {
      const [settingsRecord] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, user.id))
        .limit(1);
      
      if (settingsRecord?.settings) {
        // Convert database UserSettings to domain UserSettings
        const dbSettings = settingsRecord.settings as any;
        const domainSettings: UserSettings = {
          notifications: dbSettings.notifications,
          preferences: dbSettings.preferences,
          privacy: dbSettings.privacy ? {
            profileVisibility: dbSettings.privacy.profileVisibility || 'private',
            activityFeed: dbSettings.privacy.activityFeed,
            locationSharing: dbSettings.privacy.locationSharing
          } : undefined,
          security: dbSettings.security
        };
        user.settings = domainSettings;
      }
    } catch (error) {
      this.logger.error(`Error fetching settings for user ${user.id}:`, error);
      // Continue without settings if there's an error
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      return user ? this.mapToModel(user) : null;
    } catch (error) {
      this.logger.error(`Error finding user by email ${email}:`, error);
      throw error;
    }
  }

  async findByEmailAndOrganization(email: string, organizationId: string): Promise<User | null> {
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
      
      return user ? this.mapToModel(user) : null;
    } catch (error) {
      this.logger.error(
        `Error finding user by email ${email} and organization ${organizationId}:`,
        error
      );
      throw error;
    }
  }

  async findAll(params?: UserListParams): Promise<User[]> {
    try {
      // If no params provided, use the base implementation
      if (!params) {
        const dbUsers = await db.select().from(users);
        const userModels = await Promise.all(dbUsers.map(user => this.mapToModel(user)));
        return userModels.filter((user): user is User => user !== null);
      }
      
      // Otherwise, use the enhanced implementation with pagination
      const result = await this.findPaginated(params);
      return result.items;
    } catch (error) {
      this.logger.error('Error in findAll:', error);
      throw error;
    }
  }

  async findPaginated(params?: UserListParams): Promise<PaginatedResponse<User>> {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search,
        role,
        organizationId,
        isActive,
        emailVerified,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeInactive = false,
      } = params || {};

      // Build conditions array
      const conditions: SQL[] = [];
      
      // Add search condition if provided
      if (search) {
        const searchTerm = `%${search}%`;
        const searchCondition = or(
          ilike(users.email, searchTerm),
          ilike(users.firstName, searchTerm),
          ilike(users.lastName, searchTerm),
          ilike(users.username, searchTerm)
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      // Add filter conditions
      if (role) conditions.push(eq(users.role, role));
      if (organizationId) conditions.push(eq(users.organizationId, organizationId));
      if (isActive !== undefined) {
        conditions.push(eq(users.isActive, isActive));
      } else if (!includeInactive) {
        conditions.push(eq(users.isActive, true));
      }
      if (emailVerified !== undefined) conditions.push(eq(users.emailVerified, emailVerified));

      // Build the base query with conditions
      const baseQuery = db
        .select()
        .from(users)
        .$dynamic();
      
      // Apply where clause if we have conditions
      if (conditions.length > 0) {
        baseQuery.where(and(...conditions));
      }
      
      // Get total count with the same conditions
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .$dynamic();
      
      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }
      
      const countResult = await countQuery;
      const total = Number(countResult[0]?.count || 0);
      const offset = (page - 1) * limit;
      
      // Define valid sort columns and their corresponding SQL columns
      const sortableColumns = {
        'id': users.id,
        'email': users.email,
        'username': users.username,
        'firstName': users.firstName,
        'lastName': users.lastName,
        'role': users.role,
        'organizationId': users.organizationId,
        'emailVerified': users.emailVerified,
        'isActive': users.isActive,
        'lastLoginAt': users.lastLoginAt,
        'createdAt': users.createdAt,
        'updatedAt': users.updatedAt
      } as const;
      
      type SortableColumn = keyof typeof sortableColumns;
      
      // Get the sort column with fallback to 'createdAt'
      const sortColumn: SortableColumn = (sortBy && sortBy in sortableColumns)
        ? sortBy as SortableColumn
        : 'createdAt';
      
      // Get the actual SQL column for sorting
      const sortColumnRef = sortableColumns[sortColumn];
      
      // Build the final query with ordering and pagination
      let finalQuery = baseQuery;
      
      // Apply ordering
      if (sortOrder === 'asc') {
        finalQuery = finalQuery.orderBy(asc(sortColumnRef));
      } else {
        finalQuery = finalQuery.orderBy(desc(sortColumnRef));
      }
      
      // Apply pagination
      const dbUsers = await finalQuery
        .limit(limit)
        .offset(offset);

      // Map database users to domain models
      const userModels = await Promise.all(dbUsers.map(user => this.mapToModel(user)));
      const filteredUsers = userModels.filter((user): user is User => user !== null);

      return {
        items: filteredUsers,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + filteredUsers.length < total,
        },
      };
    } catch (error) {
      this.logger.error('Error finding users:', error);
      throw error;
    }
  }

  async findByOrganizationId(organizationId: string, params: PaginationParams = {}): Promise<User[]> {
    try {
      const { page = 1, limit = 100 } = params;
      const offset = (page - 1) * limit;
      
      const dbUsers = await db
        .select()
        .from(users)
        .where(eq(users.organizationId, organizationId))
        .limit(limit)
        .offset(offset);
      
      const userModels = await Promise.all(dbUsers.map(user => this.mapToModel(user)));
      return userModels.filter((user): user is User => user !== null);
    } catch (error) {
      this.logger.error(`Error finding users for organization ${organizationId}:`, error);
      throw error;
    }
  }

  async create(data: UserCreateInput): Promise<User> {
    try {
      const existingUser = await this.findByEmail(data.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const hashedPassword = data.password ? await hash(data.password, 10) : null;

      const newUser: any = {
        id: uuidv4(),
        email: data.email,
        username: data.username || data.email.split('@')[0],
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        passwordHash: hashedPassword || '',
        role: data.role || 'member',
        organizationId: data.organizationId || null,
        emailVerified: data.emailVerified || false,
        isActive: data.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Handle settings separately to avoid type issues
      if (data.settings) {
        newUser.settings = JSON.stringify(data.settings);
      }

      const [createdUser] = await db.insert(users).values(newUser).returning();
      return this.mapToModel(createdUser);
    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  async update(id: string, data: UserUpdateInput): Promise<User | null> {
    try {
      const existingUser = await this.findById(id);
      if (!existingUser) return null;

      if (data.email && data.email !== existingUser.email) {
        const userWithEmail = await this.findByEmail(data.email);
        if (userWithEmail && userWithEmail.id !== id) {
          throw new ConflictException('Email already in use by another user');
        }
      }

      const updateData: any = { updatedAt: new Date() };
      
      // Update standard fields
      const fieldsToUpdate: (keyof UserUpdateInput)[] = [
        'email', 'username', 'firstName', 'lastName', 'role',
        'organizationId', 'emailVerified', 'isActive', 'lastLoginAt'
      ];
      
      for (const field of fieldsToUpdate) {
        if (field in data) {
          updateData[field] = (data as any)[field];
        }
      }
      
      // Handle settings update through the dedicated method
      if (data.settings) {
        await this.updateSettings(id, data.settings);
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      return updatedUser ? this.mapToModel(updatedUser) : null;
    } catch (error) {
      this.logger.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await db
        .update(users)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(users.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      this.logger.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  }

  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    try {
      const result = await db
        .update(users)
        .set({ 
          passwordHash,
          updatedAt: new Date() 
        })
        .where(eq(users.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
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
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      this.logger.error(`Error updating last login for user ${id}:`, error);
      throw error;
    }
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user || !user.passwordHash) return false;
      return await compare(password, user.passwordHash);
    } catch (error) {
      this.logger.error(`Error verifying password for user ${userId}:`, error);
      return false;
    }
  }

  // updateSettings method is implemented below with more complete functionality

  async getProfile(userId: string): Promise<UserProfile> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      
      return {
        id: user.id,
        email: user.email,
        username: user.username || `${user.firstName?.toLowerCase()}.${user.lastName?.toLowerCase()}`,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email.split('@')[0],
        avatarUrl: null,
        role: user.role,
        organizationId: user.organizationId,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        timezone: 'UTC',
        locale: 'en-US',
        settings: user.settings || {},
        isSuspended: false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Error getting profile for user ${userId}:`, error);
      throw error;
    }
  }

  async getStats(_userId?: string): Promise<UserStats> {
    try {
      // TODO: Implement actual stats calculation
      return {
        totalTrips: 0,
        upcomingTrips: 0,
        pastTrips: 0,
        totalExpenses: 0,
        averageExpense: 0,
        favoriteDestination: null,
        mostUsedAirline: null,
        mostUsedHotel: null,
        tripsByMonth: [],
        expensesByCategory: {}
      };
    } catch (error) {
      this.logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  async updateSettings(userId: string, settings: UserSettings): Promise<User | null> {
    try {
      // First check if user exists
      const user = await this.findById(userId);
      if (!user) return null;

      // Convert domain UserSettings to database UserSettings format
      const dbSettings = {
        ...settings,
        // Ensure privacy settings match the database schema
        privacy: settings.privacy ? {
          showEmail: settings.privacy.profileVisibility === 'public',
          showFullName: settings.privacy.profileVisibility === 'public',
          showLastActive: settings.privacy.activityFeed
        } : undefined
      };

      // Check if user already has settings
      const [existingSettings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);
      
      if (existingSettings) {
        // Update existing settings
        await db
          .update(userSettings)
          .set({
            settings: {
              ...(existingSettings.settings || {}),
              ...dbSettings
            },
            updatedAt: new Date()
          })
          .where(eq(userSettings.userId, userId));
      } else {
        // Create new settings record
        await db
          .insert(userSettings)
          .values({
            id: uuidv4(),
            userId,
            settings: dbSettings as any, // Type assertion needed due to drizzle-orm type checking
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }

      // Return the updated user with settings
      return this.findById(userId);
    } catch (error) {
      this.logger.error(`Error updating settings for user ${userId}:`, error);
      throw error;
    }
  }

  async getUserStats(userId: string): Promise<UserStats> {
    // Delegate to getStats with the userId
    return this.getStats(userId);
  }

  async getRecentActivities(userId: string, limit = 20): Promise<UserActivity[]> {
    try {
      // First, verify the user exists
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const activities = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      return activities.map(activity => ({
        id: activity.id,
        userId: activity.userId,
        action: activity.action,
        metadata: {
          ...(activity.metadata as Record<string, unknown> || {}),
          resource: activity.resource,
          resourceId: activity.resourceId,
          organizationId: activity.organizationId,
        },
        timestamp: activity.createdAt,
      }));
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch recent activities for user ${userId}:`, error);
      throw new Error('Failed to fetch user activities');
    }
  }

  async getUserActivity(userId: string, limit = 20): Promise<UserActivity[]> {
    return this.getRecentActivities(userId, limit);
  }

  async updatePreferences(userId: string, preferences: Record<string, any>): Promise<User | null> {
    try {
      const user = await this.findById(userId);
      if (!user) return null;

      const updatedSettings = {
        ...(user.settings || {}),
        preferences: {
          ...(user.settings?.preferences || {}),
          ...preferences,
        },
      };

      await this.updateSettings(userId, updatedSettings);
      return this.findById(userId);
    } catch (error) {
      this.logger.error(`Error updating preferences for user ${userId}:`, error);
      throw error;
    }
  }
}
