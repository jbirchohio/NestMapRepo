import { Router, Request, Response } from 'express';

const router = Router();

// Get available demo organizations
router.get("/organizations", async (req: Request, res: Response) => {
  try {
    // Return empty array for now - will populate with real data from database
    res.json({ organizations: [] });
  } catch (error) {
    console.error("Error fetching demo organizations:", error);
    res.status(500).json({ error: "Failed to fetch demo organizations" });
  }
});

// Demo login - creates session for a demo user
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    // For now, return success with minimal data
    res.json({
      success: true,
      user: {
        id: 1,
        email: "demo@example.com",
        displayName: "Demo User",
        role: "admin"
      },
      organization: {
        id: organizationId,
        name: "Demo Organization",
        domain: "demo.nestmap.app"
      }
    });

  } catch (error) {
    console.error("Error logging into demo:", error);
    res.status(500).json({ error: "Demo login failed" });
  }
});

// Reset demo data
router.post("/reset", async (req: Request, res: Response) => {
  try {
    // For now, just return success
    res.json({ 
      success: true, 
      message: "Demo data reset functionality will be implemented with database seeding." 
    });
  } catch (error) {
    console.error("Error resetting demo data:", error);
    res.status(500).json({ error: "Demo reset failed" });
  }
});

// Get demo users for organization
router.get("/users/:organizationId", async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    
    // Return empty array for now
    res.json({ users: [] });
  } catch (error) {
    console.error("Error fetching demo users:", error);
    res.status(500).json({ error: "Failed to fetch demo users" });
  }
});

export default router;