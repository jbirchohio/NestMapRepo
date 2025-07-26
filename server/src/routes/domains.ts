import type { Express, Request, Response } from "express";
import { db } from "../db";
import { customDomains, organizations, whiteLabelSettings } from "../db/schema";
import { eq } from '../utils/drizzle-shim';
import { and, or } from '../utils/drizzle-shim';
import crypto from "crypto";
import { promises as dns } from 'dns';
import { authenticate as validateJWT } from '../middleware/secureAuth';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext';
import type { AuthenticatedRequest } from '../types/auth-user';

interface Domain {
  id: number;
  domain: string | null;
  subdomain: string | null;
  status: string;
  dns_verified: boolean;
  ssl_verified: boolean;
  created_at: Date;
  verified_at: Date | null;
}

export function registerDomainRoutes(app: Express) {
  // Apply middleware to all domain routes
  app.use('/api/domains', validateJWT);
  app.use('/api/domains', injectOrganizationContext);
  app.use('/api/domains', validateOrganizationAccess);
  
  // Get organization's custom domains
  app.get<{}, { domains: Domain[] }>(
    "/api/domains",
    async (req: AuthenticatedRequest, res: Response<{ domains: Domain[] }>) => {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

    const organizationId = req.user.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: "No organization found" });
    }

    try {
      const domains = await db
        .select({
          id: customDomains.id,
          domain: customDomains.domain,
          subdomain: customDomains.subdomain,
          status: customDomains.status,
          dns_verified: customDomains.dns_verified,
          ssl_verified: customDomains.ssl_verified,
          created_at: customDomains.created_at,
          verified_at: customDomains.verified_at
        })
        .from(customDomains)
        .where(eq(customDomains.organization_id, organizationId));

      res.json({ domains });
    } catch (error) {
      console.error('Get domains error:', error);
      res.status(500).json({ error: "Failed to get domains" });
    }
  });

  // Add custom domain
  app.post<{}, { success: boolean; domain: Domain }>(
    "/api/domains",
    async (req: AuthenticatedRequest, res: Response<{ success: boolean; domain: Domain }>) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const organizationId = req.user.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: "No organization found" });
    }

    const { domain, subdomain } = req.body;

    if (!domain && !subdomain) {
      return res.status(400).json({ error: "Domain or subdomain is required" });
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

      const plan = organization.plan || 'basic';
      const hasAccess = ['pro', 'business', 'enterprise'].includes(plan);

      if (!hasAccess) {
        return res.status(403).json({ 
          error: "Upgrade required",
          message: "Custom domains require Pro plan ($99/month) or higher"
        });
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Insert domain record
      const [newDomain] = await db
        .insert(customDomains)
        .values({
          organization_id: organizationId,
          domain: domain || null,
          subdomain: subdomain || null,
          status: 'pending',
          dns_verified: false,
          ssl_verified: false,
          verification_token: verificationToken,
          created_at: new Date()
        })
        .returning();

      res.json({
        success: true,
        domain: newDomain,
        verification: {
          token: verificationToken,
          instructions: domain ? 
            `Add CNAME record: ${domain} -> your-nestmap-domain.com` :
            `Subdomain ${subdomain}.nestmap.com will be automatically configured`
        }
      });
    } catch (error) {
      console.error('Add domain error:', error);
      res.status(500).json({ error: "Failed to add domain" });
    }
  });

  // Verify domain DNS
  app.post<{ domainId: string }, { success: boolean; message: string }>(
    "/api/domains/:domainId/verify",
    async (req: AuthenticatedRequest, res: Response<{ success: boolean; message: string }>) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const organizationId = req.user.organization_id;
    const { domainId } = req.params;

    try {
      // Get domain record
      const [domain] = await db
        .select()
        .from(customDomains)
        .where(and(
          eq(customDomains.id, parseInt(domainId)),
          eq(customDomains.organization_id, organizationId!)
        ));

      if (!domain) {
        return res.status(404).json({ error: "Domain not found" });
      }

      let isVerified = false;
      try {
        const records = await dns.resolveTxt(domain.verification_record_name || domain.domain);
        const flat = records.flat().join('');
        if (flat.includes(domain.verification_record_value || domain.verification_token)) {
          isVerified = true;
        }
      } catch {
        isVerified = false;
      }

      if (isVerified) {
        await db
          .update(customDomains)
          .set({
            dns_verified: true,
            status: 'active',
            verified_at: new Date()
          })
          .where(eq(customDomains.id, parseInt(domainId)));

        res.json({
          success: true,
          message: "Domain verified successfully",
          nextSteps: [
            "SSL certificate will be automatically provisioned",
            "Domain will be active within 5-10 minutes"
          ]
        });
      } else {
        res.status(400).json({
          error: "Verification failed",
          message: "DNS records not found or incorrect"
        });
      }
    } catch (error) {
      console.error('Verify domain error:', error);
      res.status(500).json({ error: "Failed to verify domain" });
    }
  });

  // Delete custom domain
  app.delete<{ domainId: string }, { success: boolean; message: string }>(
    "/api/domains/:domainId",
    async (req: AuthenticatedRequest, res: Response<{ success: boolean; message: string }>) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const organizationId = req.user.organization_id;
    const { domainId } = req.params;

    try {
      const deletedDomain = await db
        .delete(customDomains)
        .where(and(
          eq(customDomains.id, parseInt(domainId)),
          eq(customDomains.organization_id, organizationId!)
        ))
        .returning();

      if (deletedDomain.length === 0) {
        return res.status(404).json({ error: "Domain not found" });
      }

      res.json({
        success: true,
        message: "Domain deleted successfully"
      });
    } catch (error) {
      console.error('Delete domain error:', error);
      res.status(500).json({ error: "Failed to delete domain" });
    }
  });

  // Get domain branding configuration for public access
  app.get<{ domain: string }>(
    "/api/domains/:domain/branding",
    async (req: Request<{ domain: string }>, res: Response) => {
    const { domain } = req.params;

    try {
      const result = await db
        .select({
          companyName: whiteLabelSettings.company_name,
          companyLogo: whiteLabelSettings.company_logo,
          primaryColor: whiteLabelSettings.primary_color,
          secondaryColor: whiteLabelSettings.secondary_color,
          accentColor: whiteLabelSettings.accent_color,
          tagline: whiteLabelSettings.tagline,
          supportEmail: whiteLabelSettings.support_email,
          helpUrl: whiteLabelSettings.help_url,
          footerText: whiteLabelSettings.footer_text
        })
        .from(customDomains)
        .leftJoin(
          whiteLabelSettings,
          eq(customDomains.organization_id, whiteLabelSettings.organization_id)
        )
        .where(and(
          eq(customDomains.domain, domain),
          eq(customDomains.status, 'active'),
          eq(whiteLabelSettings.status, 'approved')
        ))
        .limit(1);

      if (!result.length || !result[0].companyName) {
        return res.status(404).json({ error: "Domain not found or not configured" });
      }

      const branding = result[0];
      res.json({
        companyName: branding.companyName,
        companyLogo: branding.companyLogo,
        primaryColor: branding.primaryColor || '#6D5DFB',
        secondaryColor: branding.secondaryColor || '#6D5DFB',
        accentColor: branding.accentColor || '#6D5DFB',
        tagline: branding.tagline,
        supportEmail: branding.supportEmail,
        helpUrl: branding.helpUrl,
        footerText: branding.footerText
      });
    } catch (error) {
      console.error('Get domain branding error:', error);
      res.status(500).json({ error: "Failed to get branding configuration" });
    }
  });

  // Domain configuration dashboard
  app.get<{}, any>(
    "/api/domains/dashboard",
    async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const organizationId = req.user.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: "No organization found" });
    }

    try {
      // Get organization info
      const [organization] = await db
        .select({
          plan: organizations.plan,
          white_label_enabled: organizations.white_label_enabled
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      // Get domains
      const domains = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.organization_id, organizationId));

      // Get white label settings
      const [whiteLabelConfig] = await db
        .select()
        .from(whiteLabelSettings)
        .where(eq(whiteLabelSettings.organization_id, organizationId))
        .limit(1);

      const plan = organization?.plan || 'basic';
      const hasAccess = ['pro', 'business', 'enterprise'].includes(plan);

      res.json({
        hasAccess,
        currentPlan: plan,
        whiteLabelEnabled: organization?.white_label_enabled || false,
        domains: domains || [],
        branding: whiteLabelConfig || null,
        features: {
          customDomain: hasAccess,
          customBranding: hasAccess,
          sslCertificates: hasAccess,
          subdomains: true // Available on all plans
        }
      });
    } catch (error) {
      console.error('Domain dashboard error:', error);
      res.status(500).json({ error: "Failed to get domain dashboard" });
    }
  });
}

export default { registerDomainRoutes };



