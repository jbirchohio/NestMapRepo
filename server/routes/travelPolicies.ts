import { Router } from 'express';
import { db } from '../db';
import { travelPolicies, policyViolations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { travelPolicyService } from '../services/travelPolicyService';
import { jwtAuthMiddleware } from '../middleware/jwtAuth';
import { requireOrganizationContext } from '../organizationContext';

const router = Router();

// Apply auth and organization context to all routes
router.use(jwtAuthMiddleware);
router.use(requireOrganizationContext);

// Get all policies for organization
router.get('/', async (req, res) => {
  try {
    if (!req.organizationContext?.id) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const policies = await db.select()
      .from(travelPolicies)
      .where(eq(travelPolicies.organization_id, req.organizationContext.id));

    res.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

// Get user's applicable policies
router.get('/my-policies', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const policies = await travelPolicyService.getUserPolicies(
      req.organizationContext.id,
      req.user.id,
      req.user.role,
      req.body.department
    );

    res.json(policies);
  } catch (error) {
    console.error('Error fetching user policies:', error);
    res.status(500).json({ error: 'Failed to fetch user policies' });
  }
});

// Create new policy
router.post('/', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    // Check if user has permission to create policies
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const policy = await travelPolicyService.createPolicy(
      req.organizationContext.id,
      {
        ...req.body,
        created_by: req.user.id
      }
    );

    res.status(201).json(policy);
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

// Update policy
router.put('/:id', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    // Check if user has permission
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const [updated] = await db.update(travelPolicies)
      .set({
        ...req.body,
        updated_at: new Date()
      })
      .where(
        eq(travelPolicies.id, parseInt(req.params.id)) &&
        eq(travelPolicies.organization_id, req.organizationContext.id)
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

// Check compliance for a booking/expense
router.post('/check-compliance', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const result = await travelPolicyService.checkPolicyCompliance(
      req.organizationContext.id,
      req.user.id,
      req.body
    );

    res.json(result);
  } catch (error) {
    console.error('Error checking compliance:', error);
    res.status(500).json({ error: 'Failed to check compliance' });
  }
});

// Get policy violations
router.get('/violations', async (req, res) => {
  try {
    if (!req.organizationContext?.id) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const violations = await travelPolicyService.getViolationHistory(
      req.organizationContext.id,
      {
        userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
        policyId: req.query.policyId ? parseInt(req.query.policyId as string) : undefined,
        status: req.query.status as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      }
    );

    res.json(violations);
  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({ error: 'Failed to fetch violations' });
  }
});

// Process violation (approve/reject)
router.post('/violations/:id/process', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    // Check if user has permission
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const violation = await travelPolicyService.processViolation(
      parseInt(req.params.id),
      {
        status: req.body.status,
        approvedBy: req.user.id,
        notes: req.body.notes
      }
    );

    res.json(violation);
  } catch (error) {
    console.error('Error processing violation:', error);
    res.status(500).json({ error: 'Failed to process violation' });
  }
});

// Get compliance analytics
router.get('/analytics', async (req, res) => {
  try {
    if (!req.organizationContext?.id) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const analytics = await travelPolicyService.getComplianceAnalytics(
      req.organizationContext.id,
      new Date(req.query.startDate as string),
      new Date(req.query.endDate as string)
    );

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;