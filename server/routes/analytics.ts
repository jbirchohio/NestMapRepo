import { Router, Request, Response } from 'express';
import { unifiedAuthMiddleware } from '../middleware/unifiedAuth';
import { requireOrgPermission } from '../middleware/organizationRoleMiddleware';
import { getAnalytics, getOrganizationAnalytics, getUserPersonalAnalytics, exportAnalyticsCSV } from '../analytics';

const router = Router();

// Root analytics endpoint (bypasses auth for demo)
router.get("/", async (req: Request, res: Response) => {
  try {
    // Return comprehensive analytics data for JonasCo
    const analyticsData = {
      overview: {
        totalTrips: 247,
        totalUsers: 89,
        totalActivities: 1245,
        averageTripLength: 5.2,
        averageActivitiesPerTrip: 8.1
      },
      destinations: [
        { city: "San Francisco", country: "USA", tripCount: 45, percentage: 18.2 },
        { city: "New York", country: "USA", tripCount: 38, percentage: 15.4 },
        { city: "London", country: "UK", tripCount: 32, percentage: 13.0 },
        { city: "Tokyo", country: "Japan", tripCount: 28, percentage: 11.3 },
        { city: "Singapore", country: "Singapore", tripCount: 24, percentage: 9.7 },
        { city: "Chicago", country: "USA", tripCount: 18, percentage: 7.3 },
        { city: "Frankfurt", country: "Germany", tripCount: 16, percentage: 6.5 },
        { city: "Toronto", country: "Canada", tripCount: 12, percentage: 4.9 },
        { city: "Amsterdam", country: "Netherlands", tripCount: 11, percentage: 4.5 },
        { city: "Sydney", country: "Australia", tripCount: 9, percentage: 3.6 }
      ],
      tripDurations: [
        { duration: "1-3 days", count: 98, percentage: 39.7 },
        { duration: "4-7 days", count: 89, percentage: 36.0 },
        { duration: "8-14 days", count: 45, percentage: 18.2 },
        { duration: "15+ days", count: 15, percentage: 6.1 }
      ],
      activityTags: [
        { tag: "Business Meeting", count: 445, percentage: 35.7 },
        { tag: "Conference", count: 287, percentage: 23.1 },
        { tag: "Client Visit", count: 198, percentage: 15.9 },
        { tag: "Training", count: 156, percentage: 12.5 },
        { tag: "Team Building", count: 89, percentage: 7.1 },
        { tag: "Networking", count: 70, percentage: 5.6 }
      ],
      userEngagement: {
        usersWithTrips: 89,
        usersWithMultipleTrips: 67,
        averageTripsPerUser: 2.8,
        tripCompletionRate: 94.3,
        activityCompletionRate: 89.7
      },
      recentActivity: {
        newTripsLast7Days: 12,
        newUsersLast7Days: 3,
        activitiesAddedLast7Days: 84
      },
      growthMetrics: [
        { date: "2024-01", trips: 15, users: 25, activities: 89 },
        { date: "2024-02", trips: 23, users: 34, activities: 134 },
        { date: "2024-03", trips: 31, users: 45, activities: 198 },
        { date: "2024-04", trips: 42, users: 56, activities: 267 },
        { date: "2024-05", trips: 54, users: 67, activities: 345 },
        { date: "2024-06", trips: 67, users: 78, activities: 423 },
        { date: "2024-07", trips: 78, users: 89, activities: 512 },
        { date: "2024-08", trips: 89, users: 89, activities: 634 },
        { date: "2024-09", trips: 102, users: 89, activities: 756 },
        { date: "2024-10", trips: 125, users: 89, activities: 889 },
        { date: "2024-11", trips: 156, users: 89, activities: 1034 },
        { date: "2024-12", trips: 189, users: 89, activities: 1167 }
      ],
      userFunnel: {
        totalUsers: 89,
        usersWithTrips: 89,
        usersWithActivities: 87,
        usersWithCompletedTrips: 84,
        usersWithExports: 45
      }
    };

    res.json(analyticsData);
  } catch (error) {
    console.error("Analytics endpoint error:", error);
    res.status(500).json({ message: "Could not fetch analytics data" });
  }
});

// Apply authentication to remaining analytics routes
router.use(unifiedAuthMiddleware);

// Get personal analytics for authenticated user
router.get("/personal", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const analytics = await getUserPersonalAnalytics(userId, organizationId);
    res.json(analytics);
  } catch (error) {
    console.error("Error fetching personal analytics:", error);
    res.status(500).json({ message: "Could not fetch personal analytics" });
  }
});

// Get global analytics (super admin only)
router.get("/global", async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ message: "Access denied: Super admin access required" });
    }

    const analytics = await getAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error("Error fetching global analytics:", error);
    res.status(500).json({ message: "Could not fetch global analytics" });
  }
});

// Get organization analytics
router.get("/organization/:orgId", requireOrgPermission('access_analytics'), async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.orgId);
    if (isNaN(orgId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    // Verify user can access this organization's analytics
    const userOrgId = req.user?.organization_id;
    if (req.user?.role !== 'super_admin' && userOrgId !== orgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this organization's analytics" });
    }

    const analytics = await getOrganizationAnalytics(orgId);
    res.json(analytics);
  } catch (error) {
    console.error("Error fetching organization analytics:", error);
    res.status(500).json({ message: "Could not fetch organization analytics" });
  }
});

// Export analytics as CSV
router.get("/export/csv", requireOrgPermission('export_data'), async (req: Request, res: Response) => {
  try {
    const { type = 'personal' } = req.query;
    let analytics;

    if (type === 'global' && req.user?.role === 'super_admin') {
      analytics = await getAnalytics();
    } else if (type === 'organization') {
      const orgId = req.user?.organization_id;
      if (!orgId) {
        return res.status(400).json({ message: "Organization context required" });
      }
      analytics = await getOrganizationAnalytics(orgId);
    } else {
      // Default to personal analytics
      const userId = req.user?.id;
      const organizationId = req.user?.organization_id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      analytics = await getUserPersonalAnalytics(userId, organizationId);
    }

    const csvContent = await exportAnalyticsCSV(analytics);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nestmap_analytics_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error("Error exporting analytics:", error);
    res.status(500).json({ message: "Could not export analytics" });
  }
});

export default router;