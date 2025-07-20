/**
 * Organization Routes
 * Implements the required organization endpoints from improve.md
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db-connection';
import { organizations, users } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/secureAuth';
import { validateRequest } from '../middleware/input-validation';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all organization routes
router.use(authenticate);

// Validation schemas
const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(255),
  slug: z.string().min(1, 'Organization slug is required').max(255),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
  settings: z.object({
    timezone: z.string().optional(),
    locale: z.string().optional(),
    whiteLabel: z.object({
      enabled: z.boolean(),
      logoUrl: z.string().url().optional(),
      primaryColor: z.string().optional()
    }).optional()
  }).optional(),
  billingEmail: z.string().email().optional()
});

const updateOrganizationSchema = createOrganizationSchema.partial();

const orgIdSchema = z.object({
  id: z.string().uuid('Invalid organization ID')
});

/**
 * GET /api/organizations
 * List organizations (admin only or user's organization)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    let orgs;
    
    // Super admin can see all organizations
    if (user.role === 'super_admin') {
      orgs = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          plan: organizations.plan,
          settings: organizations.settings,
          billingEmail: organizations.billingEmail,
          subscriptionStatus: organizations.subscriptionStatus,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt
        })
        .from(organizations)
        .orderBy(desc(organizations.createdAt));
    } else {
      // Regular users can only see their own organization
      if (!user.organizationId) {
        return res.status(403).json({
          success: false,
          error: 'No organization access'
        });
      }
      
      orgs = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          plan: organizations.plan,
          settings: organizations.settings,
          billingEmail: organizations.billingEmail,
          subscriptionStatus: organizations.subscriptionStatus,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt
        })
        .from(organizations)
        .where(eq(organizations.id, user.organizationId));
    }

    res.json({
      success: true,
      data: orgs
    });
  } catch (error) {
    logger.error('Error fetching organizations:', error);
    next(error);
  }
});

/**
 * POST /api/organizations
 * Create new organization (admin only)
 */
router.post('/', validateRequest(createOrganizationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const orgData = req.body;
    
    const [newOrg] = await db
      .insert(organizations)
      .values({
        ...orgData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    logger.info('Organization created:', { organizationId: newOrg.id, name: newOrg.name });

    res.status(201).json({
      success: true,
      data: newOrg
    });
  } catch (error) {
    logger.error('Error creating organization:', error);
    next(error);
  }
});

/**
 * PUT /api/organizations/:id
 * Update organization
 */
router.put('/:id', validateRequest(updateOrganizationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user can update this organization
    if (user.role !== 'super_admin' && user.organizationId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const updateData = req.body;
    
    const [updatedOrg] = await db
      .update(organizations)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, id))
      .returning();

    if (!updatedOrg) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    logger.info('Organization updated:', { organizationId: id });

    res.json({
      success: true,
      data: updatedOrg
    });
  } catch (error) {
    logger.error('Error updating organization:', error);
    next(error);
  }
});

/**
 * GET /api/organizations/:id
 * Get organization details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user can access this organization
    if (user.role !== 'super_admin' && user.organizationId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    if (!org) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    res.json({
      success: true,
      data: org
    });
  } catch (error) {
    logger.error('Error fetching organization:', error);
    next(error);
  }
});

/**
 * GET /api/organizations/:id/members
 * Get organization members
 */
router.get('/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user can access this organization
    if (user.role !== 'super_admin' && user.organizationId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const members = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt
      })
      .from(users)
      .where(eq(users.organizationId, id))
      .orderBy(users.firstName);

    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    logger.error('Error fetching organization members:', error);
    next(error);
  }
});

export default router;