import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { users, organizations, trips } from '../../db/schema';
import { eq, gte, desc, count, sql } from '../../utils/drizzle-shim';
import { db } from '../../db/db';
import { TRPCError } from '@trpc/server';

// Types
type AdminAnalytics = {
  overview: {
    totalUsers: number;
    totalOrganizations: number;
    totalTrips: number;
    activeUsers: number;
    newUsersToday: number;
    newOrganizationsToday: number;
  };
  userGrowth: {
    date: string;
    users: number;
    organizations: number;
  }[];
  organizationTiers: {
    tier: string;
    count: number;
    percentage: number;
  }[];
  systemHealth: {
    avgResponseTime: number;
    errorRate: number;
    uptime: number;
    dbConnections: number;
  };
  recentActivity: {
    type: string;
    description: string;
    timestamp: Date;
    userId?: number;
    organizationId?: number;
  }[];
};

// Input validation schemas
const analyticsInputSchema = z.object({
  // Can add date ranges or other filters here if needed
});

type AnalyticsInput = z.infer<typeof analyticsInputSchema>;

export const adminAnalyticsRouter = router({
  getAnalytics: protectedProcedure
    .input(analyticsInputSchema.optional())
    .query<AdminAnalytics>(async ({ ctx }) => {
      // Check if user has admin role
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin access required',
        });
      }

      try {
        // Get total counts
        const [totalUsersResult] = await db.select({ count: count() }).from(users);
        const [totalOrganizationsResult] = await db.select({ count: count() }).from(organizations);
        const [totalTripsResult] = await db.select({ count: count() }).from(trips);

        // Get active users (logged in within last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const [activeUsersResult] = await db
          .select({ count: count() })
          .from(users)
          .where(gte(users.lastLoginAt, thirtyDaysAgo));

        // Get new users today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const [newUsersTodayResult] = await db
          .select({ count: count() })
          .from(users)
          .where(gte(users.createdAt, today));

        // Get new organizations today
        const [newOrganizationsTodayResult] = await db
          .select({ count: count() })
          .from(organizations)
          .where(gte(organizations.createdAt, today));

        // Get user growth data for the last 30 days
        const userGrowthData = await db
          .select({
            date: sql<string>`DATE(${users.createdAt})`,
            count: count()
          })
          .from(users)
          .where(gte(users.createdAt, thirtyDaysAgo))
          .groupBy(sql`DATE(${users.createdAt})`)
          .orderBy(sql`DATE(${users.createdAt})`);

        // Get organization tier distribution
        const organizationTiers = await db
          .select({
            tier: organizations.plan,
            count: count()
          })
          .from(organizations)
          .groupBy(organizations.plan);

        const totalOrgs = totalOrganizationsResult.count;
        const tiersWithPercentage = organizationTiers.map(tier => ({
          tier: tier.tier || 'free',
          count: tier.count,
          percentage: totalOrgs > 0 ? (tier.count / totalOrgs) * 100 : 0
        }));

        // Get recent activity (trips and user registrations)
        const recentTrips = await db
          .select({
            id: trips.id,
            title: trips.title,
            createdAt: trips.createdAt,
            userId: trips.userId
          })
          .from(trips)
          .orderBy(desc(trips.createdAt))
          .limit(5);

        const recentUsers = await db
          .select({
            id: users.id,
            username: users.username,
            createdAt: users.createdAt,
            organizationId: users.organizationId
          })
          .from(users)
          .orderBy(desc(users.createdAt))
          .limit(5);

        const recentActivity = [
          ...recentTrips.map(trip => ({
            type: 'trip_created',
            description: `Trip "${trip.title}" created`,
            timestamp: trip.createdAt || new Date(),
            userId: trip.userId,
          })),
          ...recentUsers.map(user => ({
            type: 'user_registered',
            description: `User "${user.username}" registered`,
            timestamp: user.createdAt || new Date(),
            userId: user.id,
            organizationId: user.organizationId
          }))
        ]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10);

        // Build cumulative user growth data
        let cumulativeUsers = 0;
        const userGrowth = userGrowthData.map(day => {
          cumulativeUsers += day.count;
          return {
            date: day.date,
            users: cumulativeUsers,
            organizations: 0 // Will be filled separately if needed
          };
        });

        return {
          overview: {
            totalUsers: totalUsersResult.count,
            totalOrganizations: totalOrganizationsResult.count,
            totalTrips: totalTripsResult.count,
            activeUsers: activeUsersResult.count,
            newUsersToday: newUsersTodayResult.count,
            newOrganizationsToday: newOrganizationsTodayResult.count,
          },
          userGrowth,
          organizationTiers: tiersWithPercentage,
          systemHealth: {
            avgResponseTime: 45, // This would come from monitoring system
            errorRate: 0.1,
            uptime: 99.9,
            dbConnections: 12
          },
          recentActivity
        };
      } catch (error) {
        console.error('Error in getAnalytics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch analytics',
          cause: error,
        });
      }
    }),

  getOrganizationPerformance: protectedProcedure
    .input(z.object({
      // Can add pagination or filters here
      limit: z.number().min(1).max(100).optional().default(10),
    }))
    .query(async ({ ctx, input }) => {
      // Check if user has admin role
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin access required',
        });
      }

      try {
        const organizationPerformance = await db
          .select({
            id: organizations.id,
            name: organizations.name,
            userCount: sql<number>`COUNT(DISTINCT ${users.id})`,
            tripCount: sql<number>`COUNT(DISTINCT ${trips.id})`,
            lastActive: sql<Date>`MAX(${trips.updatedAt})`,
            createdAt: organizations.createdAt,
          })
          .from(organizations)
          .leftJoin(users, eq(users.organizationId, organizations.id))
          .leftJoin(trips, eq(trips.organizationId, organizations.id))
          .groupBy(organizations.id, organizations.name, organizations.createdAt)
          .orderBy(desc(sql<number>`COUNT(DISTINCT ${users.id}) + COUNT(DISTINCT ${trips.id})`))
          .limit(input.limit);

        return organizationPerformance.map(org => ({
          id: org.id,
          name: org.name,
          userCount: Number(org.userCount) || 0,
          tripCount: Number(org.tripCount) || 0,
          lastActive: org.lastActive || org.createdAt,
          createdAt: org.createdAt,
        }));
      } catch (error) {
        console.error('Error in getOrganizationPerformance:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch organization performance data',
          cause: error,
        });
      }
    }),
});
