import type { Express, Response } from "express";
import { db } from "../db.js";
import { organizations, users, whiteLabelSettings } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext.js';
import type { AuthenticatedRequest } from '../src/types/auth-user.js';


export function registerSimplifiedWhiteLabelRoutes(app: Express) {
  // Apply middleware to all white label routes
  app.use('/api/white-label', validateJWT);
  app.use('/api/white-label', injectOrganizationContext);
  app.use('/api/white-label', validateOrganizationAccess);
  
  // Apply middleware to organization plan routes
  app.use('/api/organization/plan', validateJWT);
  app.use('/api/organization/plan', injectOrganizationContext);
  app.use('/api/organization/plan', validateOrganizationAccess);
  
  // Auto-enable white label on plan upgrade
  app.post("/api/white-label/auto-enable", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { plan } = req.body;
    const organizationId = req.user.organization_id || req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: "No organization found" });
    }

    try {
      // Auto-enable white label for Pro+ plans (tier inheritance)
      const shouldEnableWhiteLabel = ['pro', 'business', 'enterprise'].includes(plan.toLowerCase());
      
      if (shouldEnableWhiteLabel) {
        await db
          .update(organizations)
          .set({
            white_label_enabled: true,
            white_label_plan: plan.toLowerCase(),
            plan: plan.toLowerCase(),
            updated_at: new Date()
          })
          .where(eq(organizations.id, organizationId));

        res.json({
          success: true,
          white_label_enabled: true,
          message: "White label branding automatically enabled with your plan upgrade"
        });
      } else {
        // For basic plans, disable white label but keep standard branding
        await db
          .update(organizations)
          .set({
            white_label_enabled: false,
            white_label_plan: 'none',
            plan: plan.toLowerCase(),
            updated_at: new Date()
          })
          .where(eq(organizations.id, organizationId));

        res.json({
          success: true,
          white_label_enabled: false,
          message: "Plan updated. Upgrade to Pro ($99/month) for white label branding."
        });
      }
    } catch (error) {
      console.error('Auto-enable white label error:', error);
      res.status(500).json({ error: "Failed to update white label settings" });
    }
  });

  // Simplified permissions check
  app.get("/api/white-label/permissions", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const organizationId = req.user.organization_id || req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: "No organization found" });
    }

    try {
      const [organization] = await db
        .select({
          plan: organizations.plan,
          white_label_enabled: organizations.white_label_enabled,
          white_label_plan: organizations.white_label_plan
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const plan = organization.plan || 'basic.js';
      const canAccessWhiteLabel = ['pro', 'business', 'enterprise'].includes(plan);
      const upgradeRequired = !canAccessWhiteLabel;

      res.json({
        canAccessWhiteLabel,
        currentPlan: plan,
        white_label_enabled: organization.white_label_enabled,
        upgradeRequired,
        limitations: upgradeRequired ? [
          "Custom branding requires Pro plan ($99/month)",
          "Auto-enabled with plan upgrade - no manual approval needed"
        ] : []
      });
    } catch (error) {
      console.error('Check white label permissions error:', error);
      res.status(500).json({ error: "Failed to check permissions" });
    }
  });

  // Get organization plan info
  app.get("/api/organization/plan", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const organizationId = req.user.organization_id || req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: "No organization found" });
    }

    try {
      const [organization] = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          plan: organizations.plan,
          white_label_enabled: organizations.white_label_enabled,
          white_label_plan: organizations.white_label_plan,
          subscription_status: organizations.subscription_status
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      res.json(organization);
    } catch (error) {
      console.error('Get organization plan error:', error);
      res.status(500).json({ error: "Failed to get organization plan" });
    }
  });

  // Instant branding configuration for Professional+ plans
  app.post("/api/white-label/configure", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const organizationId = req.user.organization_id || req.user.organizationId;
    
    // Handle both camelCase (from frontend) and snake_case (from middleware transformation)
    const companyName = req.body.companyName || req.body.company_name;
    const primaryColor = req.body.primaryColor || req.body.primary_color;
    const secondaryColor = req.body.secondaryColor || req.body.secondary_color;
    const accentColor = req.body.accentColor || req.body.accent_color;
    const tagline = req.body.tagline;
    const companyLogo = req.body.companyLogo || req.body.company_logo;

    console.log('White label configure request body:', req.body);
    console.log('Extracted values:', { 
      companyName, 
      primaryColor, 
      secondaryColor, 
      accentColor, 
      tagline, 
      companyLogo 
    });

    if (!organizationId) {
      return res.status(400).json({ error: "No organization found" });
    }

    try {
      // Check if organization has white label access
      const [organization] = await db
        .select({
          plan: organizations.plan,
          white_label_enabled: organizations.white_label_enabled
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const plan = organization.plan || 'basic.js';
      const hasAccess = ['pro', 'business', 'enterprise'].includes(plan);

      if (!hasAccess) {
        return res.status(403).json({ 
          error: "Upgrade required",
          message: "White label branding requires Pro plan ($99/month) or higher"
        });
      }

      // Update organization white label status
      await db
        .update(organizations)
        .set({
          white_label_enabled: true,
          updated_at: new Date()
        })
        .where(eq(organizations.id, organizationId));

      // Save branding configuration to white_label_settings table
      const existingSettings = await db
        .select()
        .from(whiteLabelSettings)
        .where(eq(whiteLabelSettings.organization_id, organizationId))
        .limit(1);

      if (existingSettings.length > 0) {
        // Update existing settings
        await db
          .update(whiteLabelSettings)
          .set({
            company_name: companyName || 'My Company',
            tagline: tagline || null,
            primary_color: primaryColor || '#6D5DFB',
            secondary_color: secondaryColor || '#6D5DFB', 
            accent_color: accentColor || '#6D5DFB',
            company_logo: companyLogo || null,
            status: 'approved', // Auto-approve for Professional+ plans
            updated_at: new Date()
          })
          .where(eq(whiteLabelSettings.organization_id, organizationId));
      } else {
        // Create new settings
        await db
          .insert(whiteLabelSettings)
          .values({
            organization_id: organizationId,
            company_name: companyName || 'My Company',
            tagline: tagline || null,
            primary_color: primaryColor || '#6D5DFB',
            secondary_color: secondaryColor || '#6D5DFB',
            accent_color: accentColor || '#6D5DFB',
            company_logo: companyLogo || null,
            status: 'approved', // Auto-approve for Professional+ plans
            created_at: new Date(),
            updated_at: new Date()
          });
      }

      res.json({
        success: true,
        message: "Branding configuration saved successfully",
        config: {
          companyName,
          primaryColor,
          secondaryColor,
          accentColor,
          tagline,
          companyLogo
        }
      });
    } catch (error) {
      console.error('Configure white label error:', error);
      res.status(500).json({ error: "Failed to save branding configuration" });
    }
  });

  // Check if user needs onboarding
  app.get("/api/white-label/onboarding-status", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const organizationId = req.user.organization_id || req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: "No organization found" });
    }

    try {
      const [organization] = await db
        .select({
          plan: organizations.plan,
          white_label_enabled: organizations.white_label_enabled,
          primary_color: organizations.primary_color,
          logo_url: organizations.logo_url
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const plan = organization.plan || 'starter.js';
      const hasAccess = ['professional', 'enterprise'].includes(plan);
      const hasConfigured = organization.white_label_enabled && 
        (organization.primary_color || organization.logo_url);

      res.json({
        needsOnboarding: hasAccess && !hasConfigured,
        hasAccess,
        hasConfigured,
        plan
      });
    } catch (error) {
      console.error('Check onboarding status error:', error);
      res.status(500).json({ error: "Failed to check onboarding status" });
    }
  });

  // Get current branding configuration
  app.get("/api/white-label/config", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const organizationId = req.user.organization_id || req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: "No organization found" });
    }

    try {
      // Get organization white label status
      const [organization] = await db
        .select({
          white_label_enabled: organizations.white_label_enabled,
          plan: organizations.plan
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Get white label settings if enabled
      let brandingConfig = null;
      if (organization.white_label_enabled) {
        const [settings] = await db
          .select()
          .from(whiteLabelSettings)
          .where(eq(whiteLabelSettings.organization_id, organizationId))
          .limit(1);

        if (settings && settings.status === 'approved') {
          brandingConfig = {
            companyName: settings.company_name,
            tagline: settings.tagline,
            primaryColor: settings.primary_color,
            secondaryColor: settings.secondary_color,
            accentColor: settings.accent_color,
            logoUrl: settings.company_logo
          };
        }
      }

      res.json({
        isWhiteLabelActive: organization.white_label_enabled && brandingConfig !== null,
        config: brandingConfig || {
          companyName: "NestMap",
          tagline: "",
          primaryColor: "#6D5DFB",
          secondaryColor: "#6D5DFB",
          accentColor: "#6D5DFB",
          logoUrl: null
        }
      });
    } catch (error) {
      console.error('Get white label config error:', error);
      res.status(500).json({ error: "Failed to get branding configuration" });
    }
  });
}