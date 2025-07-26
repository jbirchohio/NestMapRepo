import type { Express, Response } from "express";
import { db } from "../db";
import { organizations, whiteLabelSettings, customDomains } from "../db/schema";
import { eq } from '../utils/drizzle-shim';
import { or } from '../utils/drizzle-shim';
import { authenticate as validateJWT } from '../middleware/secureAuth';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext';
import { enforceWhiteLabelAccess } from '../middleware/subscription-limits';
import type { AuthenticatedRequest } from '../types/auth-user';


export function registerWhiteLabelStatusRoutes(app: Express) {
  // Apply middleware to all white label status routes
  app.use('/api/white-label/status', validateJWT);
  app.use('/api/white-label/status', injectOrganizationContext);
  app.use('/api/white-label/status', validateOrganizationAccess);
  app.use('/api/white-label/status', enforceWhiteLabelAccess());
  
  // Get comprehensive white label status
  app.get("/api/white-label/status", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const organizationId = req.user.organization_id || req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: "No organization found" });
    }

    try {
      // Get organization details
      const [organization] = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          plan: organizations.plan,
          white_label_enabled: organizations.white_label_enabled,
          white_label_plan: organizations.white_label_plan
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Get white label settings
      const [settings] = await db
        .select()
        .from(whiteLabelSettings)
        .where(eq(whiteLabelSettings.organization_id, organizationId));

      // Get custom domains
      const domains = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.organization_id, organizationId));

      // Determine status
      const isConfigured = !!settings;
      const hasDomain = domains.length > 0;
      const hasVerifiedDomain = domains.some(domain => domain.dns_verified && domain.ssl_verified);
      const isActive = organization.white_label_enabled && isConfigured;

      // Determine completion steps
      const completionSteps = {
        subscription: organization.plan === 'pro' || organization.plan === 'business' || organization.plan === 'enterprise',
        branding: !!settings,
        domain: hasDomain,
        domainVerification: hasVerifiedDomain,
        active: isActive
      };

      // Calculate completion percentage
      const totalSteps = Object.keys(completionSteps).length;
      const completedSteps = Object.values(completionSteps).filter(Boolean).length;
      const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

      // Return comprehensive status
      res.json({
        organization: {
          id: organization.id,
          name: organization.name,
          plan: organization.plan
        },
        whiteLabelStatus: {
          isEnabled: organization.white_label_enabled,
          isConfigured,
          hasDomain,
          hasVerifiedDomain,
          isActive
        },
        completionSteps,
        completionPercentage,
        settings: settings || null,
        domains: domains || [],
        nextSteps: getNextSteps(completionSteps)
      });
    } catch (error) {
      console.error('Error fetching white label status:', error);
      res.status(500).json({ error: "Failed to fetch white label status" });
    }
  });
}

// Helper function to determine next steps for white label setup
function getNextSteps(completionSteps: {
  subscription: boolean;
  branding: boolean;
  domain: boolean;
  domainVerification: boolean;
  active: boolean;
}): string[] {
  const nextSteps: string[] = [];

  if (!completionSteps.subscription) {
    nextSteps.push("Upgrade to Pro plan or higher to enable white label features");
  }

  if (completionSteps.subscription && !completionSteps.branding) {
    nextSteps.push("Configure your branding settings (colors, logo, company name)");
  }

  if (completionSteps.subscription && completionSteps.branding && !completionSteps.domain) {
    nextSteps.push("Set up a custom domain for your white label experience");
  }

  if (completionSteps.domain && !completionSteps.domainVerification) {
    nextSteps.push("Verify your domain by adding the required DNS records");
  }

  if (completionSteps.subscription && completionSteps.branding && !completionSteps.active) {
    nextSteps.push("Activate white label mode in your organization settings");
  }

  return nextSteps;
}



