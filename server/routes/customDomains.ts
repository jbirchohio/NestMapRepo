import { Router, Request, Response } from 'express';
import { db } from '../db';
import { customDomains } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { validateJWT } from '../middleware/jwtAuth';
import { requireOrgPermission } from '../middleware/organizationRoleMiddleware';
import { z } from 'zod';
import crypto from 'crypto';
import { promises as dns } from 'dns';

const router = Router();

// Apply authentication to all routes in this file
router.use(validateJWT);

// GET /api/organizations/:orgId/domains - List custom domains for an organization
router.get('/organizations/:orgId/domains', requireOrgPermission('manage_domains'), async (req: Request, res: Response) => {
  const orgId = parseInt(req.params.orgId);
  if (isNaN(orgId)) {
    return res.status(400).json({ error: 'Invalid organization ID' });
  }

  try {
    // Security check: Ensure the user is part of the organization or a super_admin
    if (req.user?.organization_id !== orgId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const domains = await db.select().from(customDomains).where(eq(customDomains.organization_id, orgId));
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
  const orgId = parseInt(req.params.orgId);
  if (isNaN(orgId)) {
    return res.status(400).json({ error: 'Invalid organization ID' });
  }

  try {
    // Security check
    if (req.user?.organization_id !== orgId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const validation = addDomainSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid domain name', details: validation.error.issues });
    }
    const { domain } = validation.data;

    // Check if domain is already registered by any organization
    const existingDomain = await db.select().from(customDomains).where(eq(customDomains.domain, domain)).limit(1);
    if (existingDomain.length > 0) {
        return res.status(409).json({ error: 'Domain is already in use' });
    }

    // Generate a verification token
    const verificationToken = `nestmap-verification=${crypto.randomBytes(16).toString('hex')}`;

    const [newDomain] = await db.insert(customDomains).values({
      organization_id: orgId,
      domain,
      dns_verified: false,
      verification_token: verificationToken,
      status: 'pending',
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
  const orgId = parseInt(req.params.orgId);
  const domainId = parseInt(req.params.domainId);
  if (isNaN(orgId) || isNaN(domainId)) {
    return res.status(400).json({ error: 'Invalid organization or domain ID' });
  }

  try {
    // Security check
    if (req.user?.organization_id !== orgId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [domainToVerify] = await db.select().from(customDomains).where(and(eq(customDomains.id, domainId), eq(customDomains.organization_id, orgId)));

    if (!domainToVerify) {
      return res.status(404).json({ error: 'Domain not found or does not belong to this organization' });
    }

    if (domainToVerify.dns_verified) {
      return res.status(400).json({ message: 'Domain is already verified' });
    }

    // Perform DNS TXT record lookup
    const txtRecords = await dns.resolveTxt(domainToVerify.domain);
    const verificationRecord = txtRecords.flat().find(record => record === domainToVerify.verification_token);

    if (verificationRecord) {
      // Verification successful
      await db.update(customDomains).set({ dns_verified: true, status: 'verified', verified_at: new Date() }).where(eq(customDomains.id, domainId));
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
  const orgId = parseInt(req.params.orgId);
  const domainId = parseInt(req.params.domainId);
  if (isNaN(orgId) || isNaN(domainId)) {
    return res.status(400).json({ error: 'Invalid organization or domain ID' });
  }

  try {
    // Security check
    if (req.user?.organization_id !== orgId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [deletedDomain] = await db.delete(customDomains).where(and(eq(customDomains.id, domainId), eq(customDomains.organization_id, orgId))).returning();

    if (!deletedDomain) {
      return res.status(404).json({ error: 'Domain not found or you do not have permission to delete it.' });
    }

    return res.json({ success: true, message: 'Domain deleted successfully' });
  } catch (error) {
    console.error('Error deleting domain:', error);
    return res.status(500).json({ error: 'Failed to delete domain' });
  }
});

export default router;
