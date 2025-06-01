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

// Demo analytics endpoint
router.get("/analytics", async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    if (!session?.isDemo) {
      return res.status(403).json({ error: "Demo access only" });
    }

    const mockAnalytics = {
      overview: {
        totalTrips: 127,
        totalUsers: 45,
        totalActivities: 892,
        averageTripLength: 4.2,
        averageActivitiesPerTrip: 7.0
      },
      destinations: [
        { city: "Tokyo", country: "Japan", tripCount: 23, percentage: 18.1 },
        { city: "London", country: "UK", tripCount: 19, percentage: 15.0 },
        { city: "New York", country: "USA", tripCount: 16, percentage: 12.6 },
        { city: "Paris", country: "France", tripCount: 14, percentage: 11.0 },
        { city: "Singapore", country: "Singapore", tripCount: 12, percentage: 9.4 }
      ],
      userEngagement: {
        usersWithTrips: 42,
        usersWithMultipleTrips: 28,
        averageTripsPerUser: 2.8,
        tripCompletionRate: 0.89,
        activityCompletionRate: 0.76
      },
      recentActivity: {
        newTripsLast7Days: 8,
        newUsersLast7Days: 3,
        activitiesAddedLast7Days: 47
      }
    };

    res.json(mockAnalytics);
  } catch (error) {
    console.error("Demo analytics error:", error);
    res.status(500).json({ error: "Failed to load demo analytics" });
  }
});

// Demo dashboard stats endpoint
router.get("/dashboard-stats", async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    if (!session?.isDemo) {
      return res.status(403).json({ error: "Demo access only" });
    }

    const mockStats = {
      totalTrips: 47,
      activeTrips: 12,
      upcomingTrips: 8,
      completedTrips: 27,
      totalBudget: 245000,
      spentBudget: 187500,
      teamMembers: 15,
      pendingApprovals: 3
    };

    res.json(mockStats);
  } catch (error) {
    console.error("Demo dashboard stats error:", error);
    res.status(500).json({ error: "Failed to load demo dashboard stats" });
  }
});

// Demo user permissions endpoint
router.get("/permissions", async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    if (!session?.isDemo) {
      return res.status(403).json({ error: "Demo access only" });
    }

    const role = session.role || "admin";
    const permissions = {
      admin: ["ACCESS_ANALYTICS", "MANAGE_ORGANIZATION", "INVITE_MEMBERS", "BILLING_ACCESS", "CREATE_TRIPS", "ADMIN_ACCESS"],
      manager: ["ACCESS_ANALYTICS", "INVITE_MEMBERS", "CREATE_TRIPS", "APPROVE_TRIPS"],
      user: ["CREATE_TRIPS", "VIEW_TRIPS"]
    };

    res.json(permissions[role as keyof typeof permissions] || permissions.user);
  } catch (error) {
    console.error("Demo permissions error:", error);
    res.status(500).json({ error: "Failed to load demo permissions" });
  }
});

// Demo trips endpoint
router.get("/trips", async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    if (!session?.isDemo) {
      return res.status(403).json({ error: "Demo access only" });
    }

    const mockTrips = [
      {
        id: 1,
        title: "Q1 Sales Conference - Tokyo",
        destination: "Tokyo, Japan",
        startDate: "2024-03-15",
        endDate: "2024-03-18",
        status: "completed",
        budget: 8500,
        activities: 12
      },
      {
        id: 2,
        title: "Client Meeting - London", 
        destination: "London, UK",
        startDate: "2024-04-10",
        endDate: "2024-04-12",
        status: "active",
        budget: 6200,
        activities: 8
      },
      {
        id: 3,
        title: "Team Retreat - Bali",
        destination: "Bali, Indonesia", 
        startDate: "2024-05-20",
        endDate: "2024-05-25",
        status: "planning",
        budget: 12000,
        activities: 15
      }
    ];

    res.json(mockTrips);
  } catch (error) {
    console.error("Demo trips error:", error);
    res.status(500).json({ error: "Failed to load demo trips" });
  }
});

// Demo notifications endpoint
router.get("/notifications", async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    if (!session?.isDemo) {
      return res.status(403).json({ error: "Demo access only" });
    }

    const mockNotifications = [
      {
        id: 1,
        type: "trip_approval",
        title: "Trip Approval Required",
        message: "Tokyo conference trip needs your approval",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        read: false
      },
      {
        id: 2,
        type: "budget_alert", 
        title: "Budget Alert",
        message: "Q1 travel budget 85% utilized",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        read: false
      },
      {
        id: 3,
        type: "info",
        title: "New Feature",
        message: "AI trip optimizer now available",
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
        read: true
      }
    ];

    res.json(mockNotifications);
  } catch (error) {
    console.error("Demo notifications error:", error);
    res.status(500).json({ error: "Failed to load demo notifications" });
  }
});

// Demo organization members endpoint
router.get("/members", async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    if (!session?.isDemo) {
      return res.status(403).json({ error: "Demo access only" });
    }

    const mockMembers = [
      {
        id: 11,
        email: "admin@orbittravelco.com",
        displayName: "Company Admin",
        role: "admin",
        department: "Operations",
        joinedAt: "2024-01-15"
      },
      {
        id: 12,
        email: "manager@orbittravelco.com", 
        displayName: "Travel Manager",
        role: "manager",
        department: "Travel Operations",
        joinedAt: "2024-02-01"
      },
      {
        id: 13,
        email: "agent@orbittravelco.com",
        displayName: "Travel Agent",
        role: "user",
        department: "Customer Service",
        joinedAt: "2024-02-15"
      },
      {
        id: 14,
        email: "sarah.chen@orbittravelco.com",
        displayName: "Sarah Chen",
        role: "user",
        department: "Sales",
        joinedAt: "2024-03-01"
      },
      {
        id: 15,
        email: "mike.johnson@orbittravelco.com",
        displayName: "Mike Johnson", 
        role: "manager",
        department: "Finance",
        joinedAt: "2024-03-10"
      }
    ];

    res.json(mockMembers);
  } catch (error) {
    console.error("Demo members error:", error);
    res.status(500).json({ error: "Failed to load demo members" });
  }
});

// Demo analytics endpoint for corporate dashboard
router.get("/analytics/corporate", async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    if (!session?.isDemo) {
      return res.status(403).json({ error: "Demo access only" });
    }

    const mockCorporateAnalytics = {
      overview: {
        totalTrips: 127,
        totalUsers: 45,
        totalBudget: 485000,
        averageTripCost: 3819,
        topDestinations: ["Tokyo", "London", "New York", "Singapore"],
        costSavings: 67500
      },
      departmentBreakdown: [
        { department: "Sales", trips: 42, budget: 185000 },
        { department: "Marketing", trips: 28, budget: 125000 },
        { department: "Operations", trips: 35, budget: 115000 },
        { department: "Finance", trips: 22, budget: 60000 }
      ],
      monthlyTrends: [
        { month: "Jan", trips: 8, budget: 32000 },
        { month: "Feb", trips: 12, budget: 48000 },
        { month: "Mar", trips: 15, budget: 58000 },
        { month: "Apr", trips: 18, budget: 72000 },
        { month: "May", trips: 14, budget: 55000 },
        { month: "Jun", trips: 16, budget: 62000 }
      ],
      complianceMetrics: {
        approvalRate: 0.94,
        policyViolations: 3,
        avgApprovalTime: 1.2
      }
    };

    res.json(mockCorporateAnalytics);
  } catch (error) {
    console.error("Demo corporate analytics error:", error);
    res.status(500).json({ error: "Failed to load demo corporate analytics" });
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