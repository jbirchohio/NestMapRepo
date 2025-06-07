import type { Express } from "express";
import { db } from "../db";
import { users, organizations, trips, activities } from "@shared/schema";
import { eq, count, sql, and, gte, desc } from "drizzle-orm";

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

export function registerAdminAnalyticsRoutes(app: Express) {
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
        .where(gte(users.last_login, thirtyDaysAgo));

      // Get new users today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [newUsersTodayResult] = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.created_at, today));

      // Get new organizations today
      const [newOrganizationsTodayResult] = await db
        .select({ count: count() })
        .from(organizations)
        .where(gte(organizations.created_at, today));

      // Get user growth data for the last 30 days
      const userGrowthData = await db
        .select({
          date: sql<string>`DATE(${users.created_at})`,
          count: count()
        })
        .from(users)
        .where(gte(users.created_at, thirtyDaysAgo))
        .groupBy(sql`DATE(${users.created_at})`)
        .orderBy(sql`DATE(${users.created_at})`);

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
          created_at: trips.created_at,
          user_id: trips.user_id
        })
        .from(trips)
        .orderBy(desc(trips.created_at))
        .limit(5);

      const recentUsers = await db
        .select({
          id: users.id,
          username: users.username,
          created_at: users.created_at,
          organization_id: users.organization_id
        })
        .from(users)
        .orderBy(desc(users.created_at))
        .limit(5);

      const recentActivity = [
        ...recentTrips.map(trip => ({
          type: 'trip_created',
          description: `Trip "${trip.title}" created`,
          timestamp: trip.created_at || new Date(),
          userId: trip.user_id,
        })),
        ...recentUsers.map(user => ({
          type: 'user_registered',
          description: `User "${user.username}" registered`,
          timestamp: user.created_at || new Date(),
          userId: user.id,
          organizationId: user.organization_id
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
          created_at: organizations.created_at
        })
        .from(organizations)
        .leftJoin(users, eq(users.organization_id, organizations.id))
        .groupBy(organizations.id, organizations.name, organizations.plan, organizations.created_at)
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
          last_login: users.last_login,
          created_at: users.created_at,
          tripCount: count(trips.id)
        })
        .from(users)
        .leftJoin(trips, eq(trips.user_id, users.id))
        .groupBy(users.id, users.username, users.email, users.last_login, users.created_at)
        .orderBy(desc(users.last_login));

      res.json(userActivity);
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ error: "Failed to fetch user activity" });
    }
  });
}