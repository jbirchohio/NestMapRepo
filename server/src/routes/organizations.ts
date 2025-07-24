import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { and, ne } from 'drizzle-orm/expressions';
import { getDatabase } from '../db/connection';
import { organizations } from '../db/schema';
import { logger } from '../utils/logger';
import { authenticateJWT } from '../middleware/auth';
import slugify from 'slugify';

// Helper to get database instance
const getDB = () => {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
};

// Type for API response to ensure consistency
type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any;
  };
};

const router = Router();

// Apply JWT authentication to all organization routes
router.use(authenticateJWT);

// Validation schemas
const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
  settings: z.object({
    timezone: z.string().optional(),
    locale: z.string().optional(),
    whiteLabel: z.object({
      enabled: z.boolean(),
      logoUrl: z.string().optional(),
      primaryColor: z.string().optional(),
    }).optional(),
  }).optional(),
});

const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  settings: z.object({
    timezone: z.string().optional(),
    locale: z.string().optional(),
    whiteLabel: z.object({
      enabled: z.boolean(),
      logoUrl: z.string().optional(),
      primaryColor: z.string().optional(),
    }).optional(),
  }).optional(),
});

// GET /api/organizations
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    if (!db) {
      return res.status(500).json({
        success: false,
        error: { message: 'Database connection not available' },
      });
    }
    
    const user = req.user; // Set by JWT middleware

    let organizationsList: any[];
    if (user.role === 'superadmin_owner' || user.role === 'superadmin_staff') {
      // Superadmins can see all organizations
      organizationsList = await getDB().select().from(organizations);
    } else {
      // Regular users can only see their organization
      organizationsList = await getDB().select().from(organizations).where(
        eq(organizations.id, user.organizationId)
      );
    }

    const response: ApiResponse<typeof organizationsList> = {
      success: true,
      data: organizationsList,
    };
    return res.json(response);
    return res.json(response);

  } catch (error) {
    logger.error('Get organizations error:', error);
    
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch organizations' },
    });
  }
});

// POST /api/organizations
router.post('/', async (req: Request, res: Response) => {
  try {
    const organizationData = createOrganizationSchema.parse(req.body);
    const user = req.user;

    // Only superadmins can create organizations
    if (user.role !== 'superadmin_owner' && user.role !== 'superadmin_staff') {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions to create organization' },
      });
    }

    const db = getDatabase();
    if (!db) {
      return res.status(500).json({
        success: false,
        error: { message: 'Database connection not available' },
      });
    }

    // Check if organization with same name already exists
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.name, organizationData.name))
      .limit(1);

    if (existingOrg) {
      return res.status(409).json({
        success: false,
        error: { message: 'Organization with this name already exists' },
      });
    }

    // Create organization
    const slug = slugify(organizationData.name, { lower: true, strict: true, locale: 'en' });
    const [newOrganization] = await getDB().insert(organizations).values({
      name: organizationData.name,
      slug: slug,
      plan: organizationData.plan || 'free',
      settings: organizationData.settings || null,
    }).returning();

    logger.info(`New organization created: ${newOrganization.name} (ID: ${newOrganization.id}) by user ${user.userId}`);

    const response: ApiResponse<typeof newOrganization> = {
      success: true,
      data: newOrganization,
    };
    res.status(201).json(response);

  } catch (error) {
    logger.error('Create organization error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid organization data', details: error.errors },
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Failed to create organization' },
    });
  }
});

// PUT /api/organizations/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = updateOrganizationSchema.parse(req.body);
    const user = req.user;

    const db = getDatabase();
    if (!db) {
      return res.status(500).json({
        success: false,
        error: { message: 'Database connection not available' },
      });
    }

    // Check if organization exists
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: { message: 'Organization not found' },
      });
    }

    // Check permissions
    const canUpdate = 
      user.role === 'superadmin_owner' || 
      user.role === 'superadmin_staff' ||
      (user.organizationId === id && (user.role === 'admin' || user.role === 'manager'));

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions to update organization' },
      });
    }

    // Check name uniqueness if updating name
    if (updateData.name && updateData.name !== organization.name) {
      const existingOrgs = await db
      .select()
      .from(organizations)
      .where(
        and(
          eq(organizations.name, updateData.name!),
          ne(organizations.id, id)
        )
      );

      if (existingOrgs.length > 0) {
        const response: ApiResponse = {
          success: false,
          error: { message: 'Organization with this name already exists' },
        };
        return res.status(409).json(response);
      }
    }

    // Update organization
    const updatePayload: any = {
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    const [updatedOrganization] = await getDB().update(organizations)
      .set(updatePayload)
      .where(eq(organizations.id, id))
      .returning();

    logger.info(`Organization updated: ${updatedOrganization.name} by user ${user.userId}`);

    const response: ApiResponse<typeof updatedOrganization> = {
      success: true,
      data: updatedOrganization,
    };
    res.json(response);

  } catch (error) {
    logger.error('Update organization error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid update data', details: error.errors },
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Failed to update organization' },
    });
  }
});

// GET /api/organizations/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const db = getDatabase();
    if (!db) {
      return res.status(500).json({
        success: false,
        error: { message: 'Database connection not available' },
      });
    }

    // Check permissions
    const canView = 
      user.role === 'superadmin_owner' || 
      user.role === 'superadmin_staff' ||
      user.organizationId === id;

    if (!canView) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions to view organization' },
      });
    }

    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: { message: 'Organization not found' },
      });
    }

    const response: ApiResponse<typeof organization> = {
      success: true,
      data: organization,
    };
    res.json(response);

  } catch (error) {
    logger.error('Get organization error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch organization' },
    };
    res.status(500).json(response);
  }
});

export default router;
