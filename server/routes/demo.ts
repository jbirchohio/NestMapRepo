import { Router, Request, Response } from 'express';

const router = Router();

// Get available demo organizations
router.get("/organizations", async (req: Request, res: Response) => {
  try {
    const demoOrgs = [
      {
        id: 1,
        name: "Orbit Travel Co",
        domain: "demo1.nestmap.app",
        primary_color: "#3B82F6",
        secondary_color: "#1E40AF",
        logo_url: "/demo-assets/orbit-logo.svg"
      },
      {
        id: 2,
        name: "Haven Journeys",
        domain: "demo2.nestmap.app", 
        primary_color: "#10B981",
        secondary_color: "#059669",
        logo_url: "/demo-assets/haven-logo.svg"
      },
      {
        id: 3,
        name: "Velocity Trips",
        domain: "demo3.nestmap.app",
        primary_color: "#EF4444", 
        secondary_color: "#DC2626",
        logo_url: "/demo-assets/velocity-logo.svg"
      }
    ];
    
    res.json({ organizations: demoOrgs });
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
    const orgId = parseInt(organizationId);
    
    const mockUsers = {
      1: [
        { id: 1, email: "admin@demo1.nestmap.app", display_name: "Admin User", role: "admin" },
        { id: 2, email: "manager@demo1.nestmap.app", display_name: "Travel Manager", role: "manager" },
        { id: 3, email: "agent@demo1.nestmap.app", display_name: "Travel Agent", role: "user" }
      ],
      2: [
        { id: 4, email: "admin@demo2.nestmap.app", display_name: "Admin User", role: "admin" },
        { id: 5, email: "manager@demo2.nestmap.app", display_name: "Travel Manager", role: "manager" },
        { id: 6, email: "agent@demo2.nestmap.app", display_name: "Travel Agent", role: "user" }
      ],
      3: [
        { id: 7, email: "admin@demo3.nestmap.app", display_name: "Admin User", role: "admin" },
        { id: 8, email: "manager@demo3.nestmap.app", display_name: "Travel Manager", role: "manager" },
        { id: 9, email: "agent@demo3.nestmap.app", display_name: "Travel Agent", role: "user" }
      ]
    };
    
    res.json({ users: mockUsers[orgId] || [] });
  } catch (error) {
    console.error("Error fetching demo users:", error);
    res.status(500).json({ error: "Failed to fetch demo users" });
  }
});

export default router;