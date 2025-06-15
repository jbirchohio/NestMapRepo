import { Router, Request, Response } from 'express';
import { db } from '../db';
import { organizations, customDomains } from '../db/schema';
import { whiteLabelSettings } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { validateJWT } from '../middleware/jwtAuth';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext';
import { requireOrgPermission } from '../middleware/organizationRoleMiddleware';
import { z } from 'zod';
import crypto from 'crypto';
import { promises as dns } from 'dns';

const router = Router();

// Apply middleware to all routes in this file
router.use(validateJWT);
router.use(injectOrganizationContext);
router.use(validateOrganizationAccess);

// GET /api/organizations/:orgId/domains - List custom domains for an organization
router.get('/organizations/:orgId/domains', requireOrgPermission('manage_domains'), async (req: Request, res: Response) => {
  const orgId = req.params.orgId;
  if (!orgId) {
    return res.status(400).json({ error: 'Invalid organization ID' });
  }

  try {
    // Security check: Ensure the user is part of the organization or a super_admin
    if (req.user?.organizationId !== orgId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const domains = await db.select().from(customDomains).where(eq(customDomains.organizationId, orgId));
    return res.json(domains);
  } catch (error) {
    console.error('Error fetching custom domains:', error);
    return res.status(500).json({ error: 'Failed to fetch custom domains' });
  }
});

// Validation schema for adding a domain
const addDomainSchema = z.object({
  domain: z.string().min(3).regex(/^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/, 'Invalid domain format'),
});

// POST /api/organizations/:orgId/domains - Add a new custom domain
router.post('/organizations/:orgId/domains', requireOrgPermission('manage_domains'), async (req: Request, res: Response) => {
  const orgId = req.params.orgId; // Keep as string to match schema
  if (!orgId) {
    return res.status(400).json({ error: 'Invalid organization ID' });
  }

  try {
    // Security check
    if (req.user?.organizationId !== orgId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const validation = addDomainSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid domain name', details: validation.error.issues });
    }
    const { domain } = validation.data;

    // Check if domain is already registered by any organization
    const existingDomain = await db.select().from(customDomains).where(eq(customDomains.domainName, domain)).limit(1);
    if (existingDomain.length > 0) {
      return res.status(409).json({ error: 'Domain is already in use' });
    }

    // Generate a verification token
    const verificationToken = `nestmap-verification=${crypto.randomBytes(16).toString('hex')}`;

    const [newDomain] = await db.insert(customDomains).values({
      organizationId: orgId,
      domainName: domain,
      status: 'pending_verification',
      verificationRecordName: `_nestlein-verify.${domain}`,
      verificationRecordValue: verificationToken,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    return res.status(201).json({
      message: 'Domain added successfully. Please add the provided TXT record to your DNS settings to verify ownership.',
      domain: newDomain
    });
  } catch (error) {
    console.error('Error adding custom domain:', error);
    return res.status(500).json({ error: 'Failed to add custom domain' });
  }
});

// POST /api/organizations/:orgId/domains/:domainId/verify - Verify a custom domain
router.post('/organizations/:orgId/domains/:domainId/verify', requireOrgPermission('manage_domains'), async (req: Request, res: Response) => {
  const orgId = req.params.orgId;
  const domainId = req.params.domainId;
  if (!orgId || !domainId) {
    return res.status(400).json({ error: 'Invalid organization or domain ID' });
  }

  try {
    // Security check
    if (req.user?.organizationId !== orgId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [domainToVerify] = await db.select().from(customDomains).where(and(eq(customDomains.id, domainId), eq(customDomains.organizationId, orgId)));

    if (!domainToVerify) {
      return res.status(404).json({ error: 'Domain not found or does not belong to this organization' });
    }

    if (domainToVerify.status === 'active') {
      return res.status(400).json({ message: 'Domain is already verified' });
    }

    // Perform DNS TXT record lookup
    const txtRecords = await dns.resolveTxt(domainToVerify.domainName);
    const verificationRecord = txtRecords.flat().find(record => record === domainToVerify.verificationRecordValue);

    if (verificationRecord) {
      // Verification successful
      await db.update(customDomains).set({ status: 'active', verifiedAt: new Date() }).where(eq(customDomains.id, domainId));
      return res.json({ success: true, message: 'Domain verified successfully!' });
    } else {
      // Verification failed
      await db.update(customDomains).set({ status: 'failed' }).where(eq(customDomains.id, domainId));
      return res.status(400).json({ success: false, message: 'Verification failed. TXT record not found or does not match.' });
    }
  } catch (error: any) {
    console.error('Error verifying domain:', error);
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      return res.status(400).json({ success: false, message: 'Could not find DNS records for this domain.' });
    }
    return res.status(500).json({ error: 'Failed to verify domain' });
  }
});

// DELETE /api/organizations/:orgId/domains/:domainId - Delete a custom domain
router.delete('/organizations/:orgId/domains/:domainId', requireOrgPermission('manage_domains'), async (req: Request, res: Response) => {
  const orgId = req.params.orgId;
  const domainId = req.params.domainId;
  if (!orgId || !domainId) {
    return res.status(400).json({ error: 'Invalid organization or domain ID' });
  }

  try {
    // Security check
    if (req.user?.organizationId !== orgId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if domain exists and belongs to the organization
    const [domainToDelete] = await db.select().from(customDomains).where(and(eq(customDomains.id, domainId), eq(customDomains.organizationId, orgId)));

    if (!domainToDelete) {
      return res.status(404).json({ error: 'Domain not found or does not belong to this organization' });
    }

    await db.delete(customDomains).where(eq(customDomains.id, domainId));

    return res.json({ success: true, message: 'Domain deleted successfully' });
  } catch (error) {
    console.error('Error deleting domain:', error);
    return res.status(500).json({ error: 'Failed to delete domain' });
  }
});

// Get domain branding configuration for public access
router.get('/domains/:domain/branding', async (req: Request, res: Response) => {
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
        eq(customDomains.organizationId, whiteLabelSettings.organization_id)
      )
      .where(and(
        eq(customDomains.domainName, domain),
        eq(customDomains.status, 'active'),
        eq(whiteLabelSettings.status, 'approved')
      ))
      .limit(1);

    if (!result.length || !result[0].companyName) {
      return res.status(404).json({ error: "Domain not found or not configured" });
    }

    const branding = result[0];
    return res.json({
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
    return res.status(500).json({ error: "Failed to get branding configuration" });
  }
});

// Domain configuration dashboard
router.get('/domains/dashboard', validateJWT, injectOrganizationContext, validateOrganizationAccess, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const organizationId = req.user.organizationId;
  if (!organizationId) {
    return res.status(400).json({ error: "No organization found" });
  }

  try {
    // Get organization info
    const [organization] = await db
      .select({
        plan: organizations.plan,
        settings: organizations.settings
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    // Get domains
    const domains = await db
      .select()
      .from(customDomains)
      .where(eq(customDomains.organizationId, organizationId));

    // Get white label settings
    const [whiteLabelConfig] = await db
      .select()
      .from(whiteLabelSettings)
      .where(eq(whiteLabelSettings.organization_id, organizationId))
      .limit(1);

    const plan = organization?.plan || 'basic';
    const hasAccess = ['pro', 'business', 'enterprise'].includes(plan);

    return res.json({
      hasAccess,
      currentPlan: plan,
      whiteLabelEnabled: organization?.settings?.whiteLabel?.enabled || hasAccess, // Use settings.whiteLabel.enabled if available, otherwise fall back to plan-based access
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
    return res.status(500).json({ error: "Failed to get domain dashboard" });
  }
});

export default router;
