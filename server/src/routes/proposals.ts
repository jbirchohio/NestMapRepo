import { Router, Response } from 'express';
import { proposals, insertProposalSchema, proposalStatusEnum } from '../db/proposalSchema';
import { getDatabase } from '../db/connection.js';
import { authenticate as validateJWT } from '../middleware/secureAuth';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext';
import { validateAndSanitizeRequest } from '../middleware/inputValidation';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../src/types/auth-user';

// Helper to get database instance
const getDB = () => {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
};


const router = Router();

// Create a new proposal
router.post(
  '/',
  validateJWT,
  injectOrganizationContext,
  validateOrganizationAccess,
  validateAndSanitizeRequest({ body: insertProposalSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const proposal = await db
        .insert(proposals)
        .values({
          ...req.body,
          createdById: req.user.id,
          organizationId: req.user.organizationId,
        })
        .returning();
      res.status(201).json(proposal[0]);
    } catch (error: any) {
      res
        .status(500)
        .json({ message: 'Failed to create proposal', error: error.message });
    }
  },
);

// Get all proposals for an organization
router.get(
  '/',
  validateJWT,
  injectOrganizationContext,
  validateOrganizationAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orgId = req.user.organizationId;
      const allProposals = await db
        .select()
        .from(proposals)
        .where(proposals.organizationId.eq(orgId));
      res.json(allProposals);
    } catch (error: any) {
      res
        .status(500)
        .json({ message: 'Failed to fetch proposals', error: error.message });
    }
  },
);

// Get a single proposal by ID
router.get(
  '/:id',
  validateJWT,
  injectOrganizationContext,
  validateOrganizationAccess,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const proposal = await db
        .select()
        .from(proposals)
        .where(proposals.id.eq(id));
      if (!proposal[0]) {
        return res.status(404).json({ message: 'Proposal not found' });
      }
      res.json(proposal[0]);
    } catch (error: any) {
      res
        .status(500)
        .json({ message: 'Failed to fetch proposal', error: error.message });
    }
  },
);

// Update proposal status (approve, sign, reject, etc.)
router.patch(
  '/:id/status',
  validateJWT,
  injectOrganizationContext,
  validateOrganizationAccess,
  validateAndSanitizeRequest({ body: z.object({ status: proposalStatusEnum }) }),
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await db
        .update(proposals)
        .set({ status })
        .where(proposals.id.eq(id))
        .returning();
      if (!updated[0]) {
        return res.status(404).json({ message: 'Proposal not found' });
      }
      res.json(updated[0]);
    } catch (error: any) {
      res
        .status(500)
        .json({ message: 'Failed to update status', error: error.message });
    }
  },
);

// Approve/sign a proposal (optionally save signature data)
router.patch(
  '/:id/sign',
  validateJWT,
  validateAndSanitizeRequest({
    body: z.object({ signedBy: z.string(), signatureImage: z.string().optional() }),
  }),
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const { signedBy, signatureImage } = req.body;
      const updated = await db
        .update(proposals)
        .set({
          status: 'signed',
          signatureData: {
            signedBy,
            signatureImage,
            signedAt: new Date().toISOString(),
          },
          signedAt: new Date(),
        })
        .where(proposals.id.eq(id))
        .returning();
      if (!updated[0]) {
        return res.status(404).json({ message: 'Proposal not found' });
      }
      res.json(updated[0]);
    } catch (error: any) {
      res
        .status(500)
        .json({ message: 'Failed to sign proposal', error: error.message });
    }
  },
);

// Mark proposal as invoiced
router.patch(
  '/:id/invoice',
  validateJWT,
  validateAndSanitizeRequest({ body: z.object({ invoiceId: z.string().uuid() }) }),
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const { invoiceId } = req.body;
      const updated = await db
        .update(proposals)
        .set({ status: 'invoiced', invoicedAt: new Date(), invoiceId })
        .where(proposals.id.eq(id))
        .returning();
      if (!updated[0]) {
        return res.status(404).json({ message: 'Proposal not found' });
      }
      res.json(updated[0]);
    } catch (error: any) {
      res
        .status(500)
        .json({ message: 'Failed to mark as invoiced', error: error.message });
    }
  },
);

export default router;
