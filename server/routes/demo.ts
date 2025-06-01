import { Router, Request, Response } from "express";
import { db } from "../db";
import { organizations, users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "../auth";

const router = Router();

// Get available demo organizations
router.get("/organizations", async (req: Request, res: Response) => {
  try {
    const demoOrgs = await db.select({
      id: organizations.id,
      name: organizations.name,
      domain: organizations.domain,
      primary_color: organizations.primary_color,
      secondary_color: organizations.secondary_color,
      logo_url: organizations.logo_url
    }).from(organizations)
    .where(eq(organizations.white_label_enabled, true))
    .limit(10);

    res.json({ organizations: demoOrgs });
  } catch (error) {
    console.error("Error fetching demo organizations:", error);
    res.status(500).json({ message: "Failed to fetch demo organizations" });
  }
});

// Demo login endpoint
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    // Find the admin user for this organization
    const [adminUser] = await db.select()
      .from(users)
      .where(eq(users.organizationId, organizationId))
      .where(eq(users.role, 'admin'))
      .limit(1);

    if (!adminUser) {
      return res.status(404).json({ message: "Demo admin user not found" });
    }

    // Verify this is a demo organization
    const [org] = await db.select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .where(eq(organizations.whiteLabelEnabled, true))
      .limit(1);

    if (!org) {
      return res.status(403).json({ message: "Not a demo organization" });
    }

    // Create demo session
    (req.session as any).userId = adminUser.id;
    (req.session as any).organizationId = organizationId;
    (req.session as any).isDemo = true;
    (req.session as any).demoStartTime = Date.now();

    res.json({
      user: {
        id: adminUser.id,
        email: adminUser.email,
        displayName: adminUser.displayName,
        role: adminUser.role,
        organizationId: adminUser.organizationId,
        isDemo: true
      },
      organization: {
        id: org.id,
        name: org.name,
        domain: org.domain,
        primaryColor: org.primaryColor,
        logoUrl: org.logoUrl
      }
    });

  } catch (error) {
    console.error("Demo login error:", error);
    res.status(500).json({ message: "Demo login failed" });
  }
});

// Reset demo data endpoint (development only)
router.post("/reset", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: "Reset not allowed in production" });
  }

  try {
    const { seedDemoData } = await import("../../scripts/seed-demo-data");
    const result = await seedDemoData();
    res.json({ message: "Demo data reset successfully", result });
  } catch (error) {
    console.error("Error resetting demo data:", error);
    res.status(500).json({ message: "Failed to reset demo data" });
  }
});

// Get demo user list for organization
router.get("/users/:organizationId", async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.params.organizationId);

    // Verify this is a demo organization
    const [org] = await db.select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .where(eq(organizations.whiteLabelEnabled, true))
      .limit(1);

    if (!org) {
      return res.status(403).json({ message: "Not a demo organization" });
    }

    const demoUsers = await db.select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      department: users.department
    }).from(users)
    .where(eq(users.organizationId, organizationId));

    res.json({ users: demoUsers });
  } catch (error) {
    console.error("Error fetching demo users:", error);
    res.status(500).json({ message: "Failed to fetch demo users" });
  }
});

export default router;