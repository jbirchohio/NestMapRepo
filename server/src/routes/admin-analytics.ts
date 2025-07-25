import type { Request, Response } from "express";
import { getDatabase } from "../db/connection.js";
import { users, organizations, trips } from "../db/schema.js";
import { eq } from 'drizzle-orm';
import { or, gte } from 'drizzle-orm/sql/expressions/conditions';
import { desc } from 'drizzle-orm/sql/expressions/select';
// TODO: Fix count and sql imports - may need different approach// TODO: Fix these imports - count, sql not available in current drizzle-orm version
// import { count, sql } from 'drizzle-orm';
import { authenticateJWT } from '../middleware/auth.js';

interface AdminAnalytics {
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
}

export function registerAdminAnalyticsRoutes(app: Application) {
  // Apply middleware to all admin analytics routes
  app.use('/api/admin/analytics', validateJWT);
  app.use('/api/admin/analytics', injectOrganizationContext);
  app.use('/api/admin/analytics', validateOrganizationAccess);
  
  // Apply middleware to organization performance routes
  app.use('/api/admin/organizations/performance', validateJWT);
  app.use('/api/admin/organizations/performance', injectOrganizationContext);
  app.use('/api/admin/organizations/performance', validateOrganizationAccess);
  // Admin analytics endpoint
  app.get("/api/admin/analytics", async (req, res) => {
    try {
      if (!req.user || req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

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
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

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

      const analytics: AdminAnalytics = {
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

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching admin analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Organization performance metrics
  app.get("/api/admin/organizations/performance", async (req, res) => {
    try {
      if (!req.user || req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const organizationPerformance = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          plan: organizations.plan,
          userCount: count(users.id),
          created_at: organizations.createdAt
        })
        .from(organizations)
        .leftJoin(users, eq(users.organizationId, organizations.id))
        .groupBy(organizations.id, organizations.name, organizations.plan, organizations.createdAt)
        .orderBy(desc(count(users.id)));

      res.json(organizationPerformance);
    } catch (error) {
      console.error("Error fetching organization performance:", error);
      res.status(500).json({ error: "Failed to fetch organization performance" });
    }
  });

  // User activity metrics
  app.get("/api/admin/users/activity", async (req, res) => {
    try {
      if (!req.user || req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const userActivity = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          last_login: users.lastLoginAt,
          created_at: users.createdAt,
          tripCount: count(trips.id)
        })
        .from(users)
        .leftJoin(trips, eq(trips.userId, users.id))
        .groupBy(users.id, users.username, users.email, users.lastLoginAt, users.createdAt)
        .orderBy(desc(users.lastLoginAt));

      res.json(userActivity);
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ error: "Failed to fetch user activity" });
    }
  });
}
