import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/connection';
import { users, organizations } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import { authenticateJWT, requireRole } from '../middleware/auth';

// Helper to get database instance
const getDB = () => {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
};

const router = Router();

// Apply JWT authentication and admin role requirement to all admin routes
router.use(authenticateJWT);
router.use(requireRole(['admin', 'superadmin_owner', 'superadmin_staff']));

// Type for API response to ensure consistency
type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: unknown;
  };
};

// GET /api/admin/analytics
router.get('/analytics', async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();

    if (!db) {
      throw new Error('Database connection not available');
    }

    // Get basic analytics data
    const totalUsers = await getDB().select().from(users).then(users => users.length);
    const totalOrganizations = await getDB().select().from(organizations).then(orgs => orgs.length);
    
    // Mock analytics data for now - in a real app, this would come from actual data
    const analytics = {
      users: {
        total: totalUsers,
        active: Math.floor(totalUsers * 0.8), // 80% active users
        newThisMonth: Math.floor(totalUsers * 0.1),
      },
      organizations: {
        total: totalOrganizations,
        active: Math.floor(totalOrganizations * 0.9),
        newThisMonth: Math.floor(totalOrganizations * 0.05),
      },
      performance: {
        avgResponseTime: 150,
        errorRate: 0.02,
        uptime: 99.9,
      },
    };

    const response: ApiResponse<typeof analytics> = {
      success: true,
      data: analytics,
    };
    res.json(response);

  } catch (error) {
    logger.error('Get admin analytics error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch analytics' },
    };
    res.status(500).json(response);
  }
});

// GET /api/admin/logs
router.get('/logs', async (_req: Request, res: Response) => {
  try {
    // Mock logs data - in a real app, this would come from a logging system
    const logs = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'User login successful',
        userId: '123',
        ip: '127.0.0.1',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        level: 'error',
        message: 'Failed database connection',
        userId: null,
        ip: '127.0.0.1',
      },
    ];

    const response: ApiResponse<typeof logs> = {
      success: true,
      data: logs,
    };
    res.json(response);

  } catch (error) {
    logger.error('Get admin logs error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch logs' },
    };
    res.status(500).json(response);
  }
});

// GET /api/admin/performance
router.get('/performance', async (_req: Request, res: Response) => {
  try {
    // Mock performance data
    const performance = {
      responseTime: {
        average: 150,
        p95: 300,
        p99: 500,
      },
      throughput: {
        requestsPerSecond: 100,
        requestsPerMinute: 6000,
      },
      errors: {
        rate: 0.02,
        count: 12,
      },
      uptime: 99.9,
      healthCheck: {
        database: 'healthy',
        redis: 'healthy',
        external: 'degraded',
      },
    };

    const response: ApiResponse<typeof performance> = {
      success: true,
      data: performance,
    };
    res.json(response);

  } catch (error) {
    logger.error('Get admin performance error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch performance data' },
    };
    res.status(500).json(response);
  }
});

// GET /api/admin/roles
router.get('/roles', async (_req: Request, res: Response) => {
  try {
    // Mock roles data
    const roles = [
      {
        id: 'member',
        name: 'Member',
        description: 'Basic access to the platform',
        permissions: ['view_trips', 'create_trips', 'edit_own_trips'],
      },
      {
        id: 'manager',
        name: 'Manager',
        description: 'Can manage team members and trips',
        permissions: ['view_trips', 'create_trips', 'edit_trips', 'manage_team'],
      },
      {
        id: 'admin',
        name: 'Admin',
        description: 'Full organization admin access',
        permissions: ['view_trips', 'create_trips', 'edit_trips', 'manage_team', 'manage_organization', 'view_analytics'],
      },
    ];

    const response: ApiResponse<typeof roles> = {
      success: true,
      data: roles,
    };
    res.json(response);

  } catch (error) {
    logger.error('Get admin roles error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch roles' },
    };
    res.status(500).json(response);
  }
});

// GET /api/admin/permissions
router.get('/permissions', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    // Mock permissions based on user role
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
        };
    }

    const response: ApiResponse<typeof permissions> = {
      success: true,
      data: permissions,
    };
    res.json(response);

  } catch (error) {
    logger.error('Get admin permissions error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch permissions' },
    };
    res.status(500).json(response);
  }
});

export default router;
