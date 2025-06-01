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
    const { organizationId, role = 'admin' } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'user'];
    const userRole = validRoles.includes(role) ? role : 'admin';

    // Create role-specific user ID
    const baseUserId = organizationId * 10;
    const userId = userRole === 'admin' ? baseUserId + 1 : userRole === 'manager' ? baseUserId + 2 : baseUserId + 3;

    // Create a proper demo session
    (req.session as any).userId = userId;
    (req.session as any).organizationId = organizationId;
    (req.session as any).isDemo = true;
    (req.session as any).role = userRole;

    // Get organization name from our demo data
    const orgNames = {
      1: "Orbit Travel Co",
      2: "Haven Journeys", 
      3: "Velocity Trips"
    } as const;

    // Role-specific email and display names
    const roleEmails = {
      admin: `admin@${orgNames[organizationId as keyof typeof orgNames]?.toLowerCase().replace(/\s+/g, '')}.com`,
      manager: `manager@${orgNames[organizationId as keyof typeof orgNames]?.toLowerCase().replace(/\s+/g, '')}.com`,
      user: `agent@${orgNames[organizationId as keyof typeof orgNames]?.toLowerCase().replace(/\s+/g, '')}.com`
    };

    const roleNames = {
      admin: 'Company Admin',
      manager: 'Travel Manager', 
      user: 'Travel Agent'
    };

    res.json({
      success: true,
      user: {
        id: userId,
        email: roleEmails[userRole as keyof typeof roleEmails],
        displayName: roleNames[userRole as keyof typeof roleNames],
        role: userRole
      },
      organization: {
        id: organizationId,
        name: orgNames[organizationId as keyof typeof orgNames] || "Demo Organization",
        domain: `demo${organizationId}.nestmap.app`
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