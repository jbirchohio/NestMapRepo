import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { users } from '../db/schema';
import { logger } from '../utils/logger';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Apply JWT authentication to all user routes
router.use(authenticateJWT);

// Type for API response to ensure consistency
type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any;
  };
};

// GET /api/user/permissions
router.get('/permissions', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' },
      });
    }

    // Get user permissions based on role
    let permissions = {};
    
    switch (user.role) {
      case 'superadmin_owner':
      case 'superadmin_staff':
        permissions = {
          canViewAnalytics: true,
          canAccessAdmin: true,
          canManageOrganization: true,
          canManageUsers: true,
          canViewLogs: true,
          canManageRoles: true,
          canAccessPerformanceDashboard: true,
          canManageFlights: true,
          canManageBookings: true,
          canViewAllTrips: true,
          canManageInvoices: true,
          canAccessWhiteLabel: true,
          canManageProposals: true,
        };
        break;
      case 'admin':
        permissions = {
          canViewAnalytics: true,
          canAccessAdmin: true,
          canManageOrganization: true,
          canManageUsers: true,
          canViewLogs: true,
          canManageRoles: false,
          canAccessPerformanceDashboard: true,
          canManageFlights: true,
          canManageBookings: true,
          canViewAllTrips: true,
          canManageInvoices: true,
          canAccessWhiteLabel: false,
          canManageProposals: true,
        };
        break;
      case 'manager':
        permissions = {
          canViewAnalytics: true,
          canAccessAdmin: false,
          canManageOrganization: false,
          canManageUsers: false,
          canViewLogs: false,
          canManageRoles: false,
          canAccessPerformanceDashboard: false,
          canManageFlights: true,
          canManageBookings: true,
          canViewAllTrips: false,
          canManageInvoices: false,
          canAccessWhiteLabel: false,
          canManageProposals: false,
        };
        break;
      default:
        permissions = {
          canViewAnalytics: false,
          canAccessAdmin: false,
          canManageOrganization: false,
          canManageUsers: false,
          canViewLogs: false,
          canManageRoles: false,
          canAccessPerformanceDashboard: false,
          canManageFlights: false,
          canManageBookings: false,
          canViewAllTrips: false,
          canManageInvoices: false,
          canAccessWhiteLabel: false,
          canManageProposals: false,
        };
    }

    const response: ApiResponse<{ permissions: typeof permissions }> = {
      success: true,
      data: { permissions },
    };
    res.json(response);

  } catch (error) {
    logger.error('Get user permissions error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch user permissions' },
    };
    res.status(500).json(response);
  }
});

// GET /api/user/profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' },
      });
    }

    const db = getDatabase();
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        organizationId: users.organizationId,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
    }

    const response: ApiResponse<typeof user> = {
      success: true,
      data: user,
    };
    res.json(response);

  } catch (error) {
    logger.error('Get user profile error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch user profile' },
    };
    res.status(500).json(response);
  }
});

// PUT /api/user/profile
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' },
      });
    }

    const updateSchema = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      username: z.string().min(1).optional(),
    });

    const updateData = updateSchema.parse(req.body);
    const db = getDatabase();

    const [updatedUser] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        organizationId: users.organizationId,
      });

    logger.info(`User profile updated: ${updatedUser.email}`);

    const response: ApiResponse<typeof updatedUser> = {
      success: true,
      data: updatedUser,
    };
    res.json(response);

  } catch (error) {
    logger.error('Update user profile error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid profile data', details: error.errors },
      });
    }

    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to update user profile' },
    };
    res.status(500).json(response);
  }
});

export default router;