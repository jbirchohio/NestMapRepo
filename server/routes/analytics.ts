import { Router, Request, Response } from 'express';
import { authenticate as validateJWT } from '../middleware/secureAuth';
import { requireOrgPermission } from '../middleware/organizationRoleMiddleware';
import { injectOrganizationContext, requireAnalyticsAccess } from '../middleware/organizationContext';
import { enforceAnalyticsAccess } from '../middleware/subscription-limits';
import { getSimpleAnalytics } from '../analytics-simple';

const router = Router();

// Apply authentication to all analytics routes
router.use(validateJWT);

// Root analytics endpoint (requires JWT authentication and Pro+ subscription)
router.get("/", enforceAnalyticsAccess(), async (req: Request, res: Response) => {
  try {
    // Require authentication
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get authentic analytics data from database
    const organizationId = req.user.organization_id || undefined;
    
    const analyticsData = await getSimpleAnalytics(organizationId);
    res.json(analyticsData);
  } catch (error) {
    console.error("Analytics endpoint error:", error);
    res.status(500).json({ message: "Could not fetch analytics data" });
  }
});

router.get("/personal", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const organizationId = req.user.organizationId || undefined;
    const analyticsData = await getSimpleAnalytics(organizationId);
    res.json(analyticsData);
  } catch (error) {
    console.error("Personal analytics endpoint error:", error);
    res.status(500).json({ message: "Could not fetch personal analytics data" });
  }
});

// Global analytics endpoint
router.get("/global", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const analyticsData = await getSimpleAnalytics();
    res.json(analyticsData);
  } catch (error) {
    console.error("Global analytics endpoint error:", error);
    res.status(500).json({ message: "Could not fetch global analytics data" });
  }
});

// Organization-specific analytics endpoint
router.get("/organization/:orgId", requireOrgPermission('access_analytics'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const orgId = parseInt(req.params.orgId);
    if (isNaN(orgId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    const analyticsData = await getSimpleAnalytics(orgId);
    res.json(analyticsData);
  } catch (error) {
    console.error("Organization analytics endpoint error:", error);
    res.status(500).json({ message: "Could not fetch organization analytics data" });
  }
});

// Analytics export endpoint  
router.get("/export/csv", requireOrgPermission('export_data'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const organizationId = req.user.organizationId;
    const analyticsData = await getSimpleAnalytics(organizationId);
    
    // Convert to CSV format
    const csvHeader = "Metric,Value\n";
    const csvRows = [
      `Total Trips,${analyticsData.overview.totalTrips}`,
      `Total Users,${analyticsData.overview.totalUsers}`,
      `Total Activities,${analyticsData.overview.totalActivities}`,
      `Average Trip Length,${analyticsData.overview.averageTripLength}`,
      `Average Activities Per Trip,${analyticsData.overview.averageActivitiesPerTrip}`
    ];
    const csvData = csvHeader + csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.csv"');
    res.send(csvData);
  } catch (error) {
    console.error("Analytics export endpoint error:", error);
    res.status(500).json({ message: "Could not export analytics data" });
  }
});

export default router;