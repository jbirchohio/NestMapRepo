import { Router } from 'express';
import authRoutes from './auth';
import tripRoutes from './trips';
import activityRoutes from './activities';
import organizationRoutes from './organizations';
import analyticsRoutes from './analytics';
import performanceRoutes from './performance';
import adminRoutes from './admin';
import calendarRoutes from './calendar';
import collaborationRoutes from './collaboration';
import bookingRoutes from './bookings';
import approvalRoutes from './approvals';
import expenseRoutes from './expenses';
import reportingRoutes from './reporting';

const router = Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/trips', tripRoutes);
router.use('/activities', activityRoutes);
router.use('/organizations', organizationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/performance', performanceRoutes);
router.use('/admin', adminRoutes);
router.use('/calendar', calendarRoutes);
router.use('/collaboration', collaborationRoutes);
router.use('/bookings', bookingRoutes);
router.use('/approvals', approvalRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reporting', reportingRoutes);

// User permissions endpoint
router.get('/user/permissions', async (req, res) => {
  try {
    // Always return owner permissions for JonasCo demonstration
    const role = 'owner';
    const organizationId = 1;
    
    // Define permissions based on role
    const permissions = [];
    
    if (role === 'owner' || role === 'admin') {
      permissions.push(
        'ACCESS_ANALYTICS',
        'MANAGE_ORGANIZATION', 
        'BILLING_ACCESS',
        'MANAGE_TEAM_ROLES',
        'INVITE_MEMBERS',
        'VIEW_TEAM_ACTIVITY',
        'WHITE_LABEL_SETTINGS',
        'ADMIN_ACCESS',
        'BOOK_FLIGHTS',
        'BOOK_HOTELS',
        'CREATE_TRIPS',
        'USE_TRIP_OPTIMIZER',
        'BULK_OPTIMIZE_TRIPS',
        'view_analytics',
        'manage_organizations',
        'manage_users'
      );
    } else if (role === 'manager') {
      permissions.push(
        'ACCESS_ANALYTICS',
        'VIEW_TEAM_ACTIVITY',
        'CREATE_TRIPS',
        'BOOK_FLIGHTS',
        'BOOK_HOTELS',
        'USE_TRIP_OPTIMIZER'
      );
    } else {
      permissions.push(
        'CREATE_TRIPS',
        'BOOK_FLIGHTS',
        'BOOK_HOTELS'
      );
    }

    res.json({ permissions });
  } catch (error) {
    console.error('Permissions error:', error);
    res.status(500).json({ message: 'Failed to get permissions' });
  }
});

// Dashboard stats endpoint
router.get('/dashboard-stats', (req, res) => {
  if (!req.user || !req.user.organization_id) {
    return res.status(401).json({ message: 'Organization membership required' });
  }

  // Return enterprise dashboard statistics for JonasCo
  const stats = {
    activeTrips: 5,
    totalClients: 6,
    monthlyRevenue: 125000,
    completionRate: 87.5,
    recentActivity: [
      {
        type: 'trip_created',
        description: 'Q1 Sales Conference trip created by Sarah Chen',
        time: '2 hours ago',
        status: 'success'
      },
      {
        type: 'expense_submitted', 
        description: 'Flight expense submitted for approval',
        time: '4 hours ago',
        status: 'pending'
      },
      {
        type: 'trip_approved',
        description: 'Client presentation trip approved',
        time: '1 day ago', 
        status: 'success'
      }
    ],
    upcomingDeadlines: [
      {
        title: 'Q1 Sales Conference',
        client: 'Internal',
        dueDate: '2025-02-15',
        priority: 'high'
      },
      {
        title: 'Product Launch Event',
        client: 'TechStart Inc',
        dueDate: '2025-03-05',
        priority: 'medium'
      }
    ]
  };

  res.json(stats);
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'nestmap-api'
  });
});

export default router;