import { prisma } from '@db';
import type { User as PrismaUser } from '@prisma/client';
import type { UserRepository } from '../user.repository.interface';
import type { UserResponse } from '@shared/src/types/auth/dto/response';
import { UserRole } from '@shared/src/types/auth/permissions';
import { logger } from '../../../utils/logger.js';

export class PrismaUserRepository implements UserRepository {
  private readonly logger = logger.child({ module: 'PrismaUserRepository' });

  async findById(userId: string): Promise<UserResponse | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organizationId: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return null;
      }

      return this.mapToUserResponse(user);
    } catch (error) {
      this.logger.error({ error, userId }, 'Error finding user by ID');
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserResponse | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organizationId: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return null;
      }

      return this.mapToUserResponse(user);
    } catch (error) {
      this.logger.error({ error, email }, 'Error finding user by email');
      throw error;
    }
  }

  async findByEmailAndOrganization(email: string, organizationId: string): Promise<UserResponse | null> {
    try {
      const user = await prisma.user.findFirst({
        where: { 
          email,
          organizationId 
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organizationId: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return null;
      }

      return this.mapToUserResponse(user);
    } catch (error) {
      this.logger.error({ error, email, organizationId }, 'Error finding user by email and organization');
      throw error;
    }
  }

  async findAll(params?: UserListParams): Promise<PaginatedResponse<UserResponse>> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      const skip = (page - 1) * limit;

      const where: Prisma.UserWhereInput = {};

      // Apply filters
      if (params?.search) {
        where.OR = [
          { email: { contains: params.search, mode: 'insensitive' } },
          { firstName: { contains: params.search, mode: 'insensitive' } },
          { lastName: { contains: params.search, mode: 'insensitive' } },
        ];
      }

      if (params?.role) {
        where.role = { in: Array.isArray(params.role) ? params.role : [params.role] };
      }

      if (params?.organizationId) {
        where.organizationId = {
          in: Array.isArray(params.organizationId) 
            ? params.organizationId 
            : [params.organizationId]
        };
      }

      if (params?.emailVerified !== undefined) {
        where.emailVerified = params.emailVerified;
      }

      // Build orderBy
      const orderBy: Prisma.UserOrderByWithRelationInput = {};
      if (params?.sortBy) {
        const sortField = params.sortBy === 'name' ? 'firstName' : params.sortBy;
        orderBy[sortField] = params.sortOrder || 'asc';
      } else {
        orderBy.createdAt = 'desc';
      }

      // Get total count
      const total = await prisma.user.count({ where });

      // Get paginated results
      const users = await prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organizationId: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        data: users.map(user => this.mapToUserResponse(user)),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error({ error, params }, 'Error finding all users');
      throw error;
    }
  }

  async findByOrganizationId(
    organizationId: string,
    params?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
  ): Promise<PaginatedResponse<UserResponse>> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      const skip = (page - 1) * limit;

      // Build orderBy
      const orderBy: Prisma.UserOrderByWithRelationInput = {};
      if (params?.sortBy) {
        const sortField = params.sortBy === 'name' ? 'firstName' : params.sortBy;
        orderBy[sortField] = params.sortOrder || 'asc';
      } else {
        orderBy.createdAt = 'desc';
      }

      // Get total count for the organization
      const total = await prisma.user.count({
        where: { organizationId }
      });

      // Get paginated results for the organization
      const users = await prisma.user.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organizationId: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        data: users.map(user => this.mapToUserResponse(user)),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        { error, organizationId, params },
        'Error finding users by organization ID'
      );
      throw error;
    }
  }

  async updateSettings(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string | null;
      timezone?: string;
      locale?: string;
      notificationPreferences?: Record<string, any>;
    }
  ): Promise<UserResponse> {
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: updates.firstName,
          lastName: updates.lastName,
          avatarUrl: updates.avatarUrl,
          timezone: updates.timezone,
          locale: updates.locale,
          notificationPreferences: updates.notificationPreferences
            ? JSON.stringify(updates.notificationPreferences)
            : undefined,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organizationId: true,
          emailVerified: true,
          avatarUrl: true,
          timezone: true,
          locale: true,
          notificationPreferences: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Parse notification preferences if they exist
      const userWithParsedPrefs = {
        ...updatedUser,
        notificationPreferences: updatedUser.notificationPreferences
          ? JSON.parse(updatedUser.notificationPreferences)
          : {},
      };

      return this.mapToUserResponse(userWithParsedPrefs);
    } catch (error) {
      this.logger.error(
        { error, userId, updates },
        'Error updating user settings'
      );
      throw error;
    }
  }

  async getProfile(userId: string): Promise<UserProfileResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatarUrl: true,
          timezone: true,
          locale: true,
          notificationPreferences: true,
          emailVerified: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              timezone: true,
              locale: true,
              settings: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Parse notification preferences if they exist
      const userWithParsedPrefs = {
        ...user,
        notificationPreferences: user.notificationPreferences
          ? JSON.parse(user.notificationPreferences)
          : {},
      };

      return {
        ...userWithParsedPrefs,
        organization: user.organization ? {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
          logoUrl: user.organization.logoUrl,
          timezone: user.organization.timezone,
          locale: user.organization.locale,
          settings: user.organization.settings ? JSON.parse(user.organization.settings) : {},
        } : null,
      };
    } catch (error) {
      this.logger.error(
        { error, userId },
        'Error fetching user profile'
      );
      throw error;
    }
  }

  async getStats(userId: string): Promise<UserStats> {
    try {
      // Get user with organization
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          organizationId: true,
          role: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);

      // Execute all stats queries in parallel
      const [
        totalTrips,
        upcomingTrips,
        pastTrips,
        activitiesThisMonth,
        favoriteDestinations,
        totalBookings,
        pendingBookings,
        completedBookings,
        cancelledBookings,
        totalSpent,
      ] = await Promise.all([
        // Total trips count
        prisma.trip.count({
          where: { userId },
        }),
        
        // Upcoming trips count
        prisma.trip.count({
          where: {
            userId,
            startDate: { gte: now },
          },
        }),
        
        // Past trips count
        prisma.trip.count({
          where: {
            userId,
            endDate: { lt: now },
          },
        }),
        
        // Activities this month count
        prisma.activity.count({
          where: {
            userId,
            startTime: { gte: thirtyDaysAgo },
          },
        }),
        
        // Favorite destinations (top 3 most visited)
        prisma.trip.groupBy({
          by: ['destination'],
          where: { userId },
          _count: { destination: true },
          orderBy: { _count: { destination: 'desc' } },
          take: 3,
        }),
        
        // Total bookings count
        prisma.booking.count({
          where: { userId },
        }),
        
        // Pending bookings count
        prisma.booking.count({
          where: { 
            userId,
            status: 'PENDING',
          },
        }),
        
        // Completed bookings count
        prisma.booking.count({
          where: { 
            userId,
            status: 'COMPLETED',
          },
        }),
        
        // Cancelled bookings count
        prisma.booking.count({
          where: { 
            userId,
            status: 'CANCELLED',
          },
        }),
        
        // Total amount spent on completed bookings
        prisma.booking.aggregate({
          where: { 
            userId,
            status: 'COMPLETED',
          },
          _sum: { totalAmount: true },
        }),
      ]);

      return {
        trips: {
          total: totalTrips,
          upcoming: upcomingTrips,
          past: pastTrips,
          activitiesThisMonth,
          favoriteDestinations: favoriteDestinations.map(dest => ({
            name: dest.destination,
            count: dest._count.destination,
          })),
        },
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
          totalSpent: totalSpent._sum.totalAmount || 0,
        },
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(
        { error, userId },
        'Error fetching user statistics'
      );
      throw error;
    }
  }

  private mapToUserResponse(user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    organizationId: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      role: user.role as UserRole,
      organizationId: user.organizationId || undefined,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  // Implement other required methods from UserRepository interface
  // For example:
  async updateUser(userId: string, updates: Partial<PrismaUser>): Promise<UserResponse | null> {
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updates,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organizationId: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return this.mapToUserResponse(updatedUser);
    } catch (error) {
      this.logger.error({ error, userId, updates }, 'Error updating user');
      throw error;
    }
  }
}
