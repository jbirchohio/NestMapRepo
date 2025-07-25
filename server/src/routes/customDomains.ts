// Import types from our custom type definitions
import { Router, type Request as ExpressRequest, type Response, type NextFunction } from 'express';
import type { CustomRequest, RequestHandler } from '../types/custom-express'; // Added .js extension for ES modules
import { db } from '../db/db';
import { organizations, customDomains } from '../db/schema.js';
import { whiteLabelSettings } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { and, or } from 'drizzle-orm/sql/expressions/conditions';import { authenticate } from '../middleware/secureAuth';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext';
import { requireOrgPermission } from '../middleware/organizationRoleMiddleware';
import { z } from 'zod';
import crypto from 'crypto';
import { promises as dns } from 'dns';

// Type assertion for request handlers with CustomRequest
type CustomRequestHandler = (req: CustomRequest, res: Response, next: NextFunction) => Promise<void> | void;

const router = Router();

// Apply middleware to all routes in this file
router.use(authenticate as unknown as RequestHandler);
router.use(injectOrganizationContext as unknown as RequestHandler);
router.use(validateOrganizationAccess as unknown as RequestHandler);

// Helper function to create typed request handlers with proper type safety
function createHandler(
  handler: (req: CustomRequest, res: Response, next: NextFunction) => Promise<void> | void
): RequestHandler {
  return (async (req: ExpressRequest, res: Response, next: NextFunction) => {
    try {
      await handler(req as unknown as CustomRequest, res, next);
    } catch (error) {
      next(error);
    }
  }) as RequestHandler;
}

// Helper function to send JSON responses without returning them
const sendJsonResponse = <T>(res: Response, status: number, data: T): void => {
  res.status(status).json(data);
};

// Custom types are now imported from custom-express.d.ts

// GET /api/organizations/:orgId/domains - List custom domains for an organization
router.get('/organizations/:orgId/domains', 
  requireOrgPermission('view_domains') as unknown as RequestHandler,
  createHandler(async (req: CustomRequest, res: Response) => {
    const orgId = req.params.orgId;
    if (!orgId) {
      sendJsonResponse(res, 400, { error: 'Invalid organization ID' });
      return;
    }

    try {
      // Security check: Ensure the user is part of the organization or a super_admin
      if (req.user?.organizationId !== orgId && req.user?.role !== 'super_admin') {
        sendJsonResponse(res, 403, { error: 'Access denied' });
        return;
      }

      const domains = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.organizationId, orgId));
      
      sendJsonResponse(res, 200, domains);
    } catch (error) {
      console.error('Error fetching custom domains:', error);
      sendJsonResponse(res, 500, { error: 'Failed to fetch custom domains' });
    }
  })
);

// Validation schema for adding a domain
const addDomainSchema = z.object({
  domain: z.string().min(3).regex(/^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/, 'Invalid domain format'),
});

// POST /api/organizations/:orgId/domains - Add a new custom domain
router.post('/organizations/:orgId/domains', 
  requireOrgPermission('manage_domains') as unknown as RequestHandler, 
  createHandler(async (req: CustomRequest, res: Response) => {
  const orgId = req.params.orgId; // Keep as string to match schema
  if (!orgId) {
    sendJsonResponse(res, 400, { error: 'Invalid organization ID' });
    return;
  }

  try {
    // Security check
    if (req.user?.organizationId !== orgId && req.user?.role !== 'super_admin') {
      sendJsonResponse(res, 403, { error: 'Access denied' });
      return;
    }

    const validation = addDomainSchema.safeParse(req.body);
    if (!validation.success) {
      sendJsonResponse(res, 400, { 
        error: 'Invalid domain name', 
        details: validation.error.issues 
      });
      return;
    }
    const { domain } = validation.data;

    // Check if domain is already registered by any organization
    const existingDomain = await db.select().from(customDomains).where(eq(customDomains.domainName, domain)).limit(1);
    if (existingDomain.length > 0) {
      sendJsonResponse(res, 409, { error: 'Domain is already in use' });
      return;
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

    sendJsonResponse(res, 201, {
      message: 'Domain added successfully. Please add the provided TXT record to your DNS settings to verify ownership.',
      domain: newDomain
    });
  } catch (error) {
    console.error('Error adding custom domain:', error);
    sendJsonResponse(res, 500, { error: 'Failed to add custom domain' });
  }
})
);

// POST /api/organizations/:orgId/domains/:domainId/verify - Verify a custom domain
router.post('/organizations/:orgId/domains/:domainId/verify', 
  requireOrgPermission('manage_domains') as unknown as RequestHandler,
  createHandler(async (req: CustomRequest, res: Response) => {
  const orgId = req.params.orgId;
  const domainId = req.params.domainId;
  if (!orgId || !domainId) {
    sendJsonResponse(res, 400, { error: 'Invalid organization or domain ID' });
    return;
  }

  try {
    // Security check
    if (req.user?.organizationId !== orgId && req.user?.role !== 'super_admin') {
      sendJsonResponse(res, 403, { error: 'Access denied' });
      return;
    }

    const [domainToVerify] = await db.select().from(customDomains).where(and(eq(customDomains.id, domainId), eq(customDomains.organizationId, orgId)));

    if (!domainToVerify) {
      sendJsonResponse(res, 404, { error: 'Domain not found or does not belong to this organization' });
      return;
    }

    if (domainToVerify.status === 'active') {
      sendJsonResponse(res, 400, { message: 'Domain is already verified' });
      return;
    }

    // Perform DNS TXT record lookup
    const txtRecords = await dns.resolveTxt(domainToVerify.domainName);
    const verificationRecord = txtRecords.flat().find(record => record === domainToVerify.verificationRecordValue);

    if (verificationRecord) {
      // Verification successful
      await db.update(customDomains).set({ status: 'active', verifiedAt: new Date() }).where(eq(customDomains.id, domainId));
      sendJsonResponse(res, 200, { success: true, message: 'Domain verified successfully!' });
    } else {
      // Verification failed
      await db.update(customDomains).set({ status: 'failed' }).where(eq(customDomains.id, domainId));
      sendJsonResponse(res, 400, { success: false, message: 'Verification failed. TXT record not found or does not match.' });
    }
  } catch (error: any) {
    console.error('Error verifying domain:', error);
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      sendJsonResponse(res, 400, { success: false, message: 'Could not find DNS records for this domain.' });
    } else {
      sendJsonResponse(res, 500, { error: 'Failed to verify domain' });
    }
  }
})
);

// GET /api/organizations/:orgId/domains/:domainId - Get a specific domain
router.get('/organizations/:orgId/domains/:domainId', 
  requireOrgPermission('view_domains') as unknown as RequestHandler,
  createHandler(async (req: CustomRequest, res: Response) => {
    const orgId = req.params.orgId;
    const domainId = req.params.domainId;
    if (!orgId || !domainId) {
      sendJsonResponse(res, 400, { error: 'Invalid organization or domain ID' });
      return;
    }

    try {
      // Security check
      if (req.user?.organizationId !== orgId && req.user?.role !== 'super_admin') {
        sendJsonResponse(res, 403, { error: 'Access denied' });
        return;
      }

      const [domain] = await db.select().from(customDomains).where(
        and(
          eq(customDomains.id, domainId), 
          eq(customDomains.organizationId, orgId)
        )
      );

      if (!domain) {
        sendJsonResponse(res, 404, { error: 'Domain not found or does not belong to this organization' });
        return;
      }

      sendJsonResponse(res, 200, domain);
    } catch (error) {
      console.error('Error fetching domain:', error);
      sendJsonResponse(res, 500, { error: 'Failed to fetch domain' });
    }
  })
);

// DELETE /api/organizations/:orgId/domains/:domainId - Delete a custom domain
router.delete('/organizations/:orgId/domains/:domainId', 
  requireOrgPermission('manage_domains') as unknown as RequestHandler,
  createHandler(async (req: CustomRequest, res: Response) => {
    const orgId = req.params.orgId;
    const domainId = req.params.domainId;
    
    if (!orgId || !domainId) {
      sendJsonResponse(res, 400, { error: 'Invalid organization or domain ID' });
      return;
    }

    try {
      // Security check
      if (req.user?.organizationId !== orgId && req.user?.role !== 'super_admin') {
        sendJsonResponse(res, 403, { error: 'Access denied' });
        return;
      }

      // Check if domain exists and belongs to the organization
      const [domainToDelete] = await db
        .select()
        .from(customDomains)
        .where(and(
          eq(customDomains.id, domainId), 
          eq(customDomains.organizationId, orgId)
        ));

      if (!domainToDelete) {
        sendJsonResponse(res, 404, { 
          error: 'Domain not found or does not belong to this organization' 
        });
        return;
      }

      // Delete the domain
      await db
        .delete(customDomains)
        .where(eq(customDomains.id, domainId));

      sendJsonResponse(res, 204, {});
    } catch (error) {
      console.error('Error deleting domain:', error);
      sendJsonResponse(res, 500, { 
        error: 'Failed to delete domain',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

// Get domain branding configuration for public access
// Export the router
export { router };

// GET /domains/:domain/branding - Get branding for a domain (public endpoint)
router.get('/domains/:domain/branding', createHandler(async (req: CustomRequest, res: Response, _next: NextFunction) => {
  const { domain } = req.params;

  try {
    const result = await db
      .select({
        companyName: whiteLabelSettings.companyName,
        companyLogo: whiteLabelSettings.companyLogo,
        primaryColor: whiteLabelSettings.primaryColor,
        secondaryColor: whiteLabelSettings.secondaryColor,
        accentColor: whiteLabelSettings.accentColor,
        tagline: whiteLabelSettings.tagline,
        supportEmail: whiteLabelSettings.supportEmail,
        helpUrl: whiteLabelSettings.helpUrl,
        footerText: whiteLabelSettings.footerText
      })
      .from(customDomains)
      .leftJoin(
        whiteLabelSettings,
        eq(customDomains.organizationId, whiteLabelSettings.organizationId)
      )
      .where(and(
        eq(customDomains.domainName, domain),
        eq(customDomains.status, 'active'),
        eq(whiteLabelSettings.status, 'approved')
      ))
      .limit(1);

    if (!result.length || !result[0].companyName) {
      res.status(404).json({ error: "Domain not found or not configured" });
      return;
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
}));

// Domain configuration dashboard
router.get('/domains/dashboard', 
  authenticate as unknown as RequestHandler, 
  validateOrganizationAccess as unknown as RequestHandler, 
  (async (req: CustomRequest, res: Response) => {
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
      .where(eq(whiteLabelSettings.organizationId, organizationId))
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
}) as unknown as RequestHandler);

export default router;
