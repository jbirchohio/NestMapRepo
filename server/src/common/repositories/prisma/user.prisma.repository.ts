import { PrismaClient, User as PrismaUser, UserRole as PrismaUserRole } from '@prisma/client';
import { UserRepository, UserListParams } from '../user/user.repository.interface.js';
import { User, UserProfile, UserSettings, UserStats, UserActivity } from '@shared/schema/types/auth/user.js';
import { UserRole } from '@shared/schema/types/auth/permissions';
import { hash, compare } from 'bcrypt';

// Define local pagination types since shared types are causing issues
interface PaginationParams {
  page?: number;
  limit?: number;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Prisma implementation of the UserRepository interface
 */
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Convert Prisma user model to domain model
   */
  private toDomainUser(prismaUser: PrismaUser): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      firstName: prismaUser.first_name || undefined,
      lastName: prismaUser.last_name || undefined,
      role: prismaUser.role as UserRole,
      organizationId: prismaUser.organization_id || undefined,
      isActive: prismaUser.is_active,
      emailVerified: prismaUser.email_verified,
      lastLoginAt: prismaUser.last_login_at?.toISOString(),
      avatarUrl: prismaUser.avatar_url || undefined,
      createdAt: prismaUser.created_at.toISOString(),
      updatedAt: prismaUser.updated_at.toISOString(),
      deletedAt: prismaUser.deleted_at?.toISOString(),
    };
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? this.toDomainUser(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.toDomainUser(user) : null;
  }

  async create(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    organizationId?: string;
  }): Promise<User> {
    const hashedPassword = await hash(userData.password, 10);
    
    const user = await this.prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        first_name: userData.firstName || null,
        last_name: userData.lastName || null,
        role: (userData.role || 'MEMBER') as PrismaUserRole,
        organization_id: userData.organizationId || null,
        is_active: true,
        email_verified: false,
      },
    });

    return this.toDomainUser(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          email: userData.email,
          first_name: userData.firstName !== undefined ? userData.firstName : undefined,
          last_name: userData.lastName !== undefined ? userData.lastName : undefined,
          role: userData.role as PrismaUserRole | undefined,
          organization_id: userData.organizationId !== undefined ? userData.organizationId : undefined,
          is_active: userData.isActive,
          email_verified: userData.emailVerified,
          last_login_at: userData.lastLoginAt ? new Date(userData.lastLoginAt) : undefined,
          avatar_url: userData.avatarUrl !== undefined ? userData.avatarUrl : undefined,
        },
      });
      return this.toDomainUser(user);
    } catch (error) {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.user.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user || !user.password) {
      return false;
    }

    return compare(password, user.password);
  }

  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await hash(newPassword, 10);
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async updateLastLogin(id: string): Promise<boolean> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { last_login_at: new Date() },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async findByEmailAndOrganization(email: string, organizationId: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        organization_id: organizationId,
      },
    });
    return user ? this.toDomainUser(user) : null;
  }

  async findAll(params?: UserListParams): Promise<PaginatedResponse<User>> {
    const { page = 1, limit = 10, search, role, status } = params || {};
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (role) {
      where.role = { in: Array.isArray(role) ? role : [role] };
    }
    
    if (status) {
      where.is_active = status === 'active';
    }
    
    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);
    
    return {
      items: items.map(user => this.toDomainUser(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  
  async findByOrganizationId(organizationId: string, params?: PaginationParams): Promise<User[]> {
    const { page = 1, limit = 100 } = params || {};
    const skip = (page - 1) * limit;
    
    const users = await this.prisma.user.findMany({
      where: { organization_id: organizationId },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    });
    
    return users.map(user => this.toDomainUser(user));
  }
  
  async updateSettings(id: string, settings: Partial<UserSettings>): Promise<User | null> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          settings: JSON.stringify(settings),
        },
      });
      return this.toDomainUser(user);
    } catch (error) {
      return null;
    }
  }
  
  async getProfile(id: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });
    
    if (!user) return null;
    
    const baseUser = this.toDomainUser(user);
    
    return {
      ...baseUser,
      organization: user.organization ? {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug || '',
        logoUrl: user.organization.logo_url || null,
      } : null,
      // Add any additional profile-specific fields here
    } as UserProfile;
  }
  
  async getStats(): Promise<UserStats> {
    const [
      totalUsers,
      activeUsers,
      usersThisMonth,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { is_active: true } }),
      this.prisma.user.count({
        where: {
          created_at: {
            gte: new Date(new Date().setDate(1)), // First day of current month
          },
        },
      }),
    ]);
    
    return {
      total_users: totalUsers,
      active_users: activeUsers,
      users_this_month: usersThisMonth,
    } as UserStats;
  }
  
  async getRecentActivities(userId: string, limit: number = 10): Promise<UserActivity[]> {
    try {
      // Check if activity_log table exists before querying
      const tables = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_log';
      `;
      
      if (tables.length === 0) {
        return [];
      }

      const activities = await this.prisma.$queryRaw<Array<{
        id: string;
        type: string;
        description: string | null;
        metadata: string | null;
        created_at: Date;
      }>>`
        SELECT id, type, description, metadata, created_at 
        FROM activity_log 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
      
      return activities.map(activity => ({
        id: activity.id,
        type: activity.type,
        description: activity.description || '',
        metadata: activity.metadata ? JSON.parse(activity.metadata) : {},
        createdAt: activity.created_at.toISOString(),
      }));
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  }
}
