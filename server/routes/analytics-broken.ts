import { Router, Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/jwtAuth';
import { requireOrgPermission } from '../middleware/organizationRoleMiddleware';
import { getSimpleAnalytics } from '../analytics-simple';

const router = Router();

// Apply authentication to all analytics routes
router.use(jwtAuthMiddleware);

// Root analytics endpoint (requires JWT authentication)
router.get("/", async (req: Request, res: Response) => {
  try {
    // Require authentication
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get authentic analytics data from database
    const organizationId = req.user.organization_id;
    
    const analyticsData = await getSimpleAnalytics(organizationId);
    res.json(analyticsData);
  } catch (error) {
    console.error("Analytics endpoint error:", error);
    res.status(500).json({ message: "Could not fetch analytics data" });
  }
});

// Get personal analytics for authenticated user
router.get("/personal", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const analytics = await getSimpleAnalytics();
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

    const analytics = await getSimpleAnalytics();
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

    const analytics = await getSimpleAnalytics();
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
      analytics = await getSimpleAnalytics();
    } else if (type === 'organization') {
      const orgId = req.user?.organization_id;
      if (!orgId) {
        return res.status(400).json({ message: "Organization context required" });
      }
      analytics = await getSimpleAnalytics();
    } else {
      // Default to personal analytics
      const userId = req.user?.id;
      const organizationId = req.user?.organization_id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      analytics = await getSimpleAnalytics();
    }

    // Export functionality not implemented
    const csvContent = "Export not implemented";
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nestmap_analytics_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error("Error exporting analytics:", error);
    res.status(500).json({ message: "Could not export analytics" });
  }
});

export default router;