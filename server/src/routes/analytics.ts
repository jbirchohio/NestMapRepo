import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// Apply JWT authentication to all analytics routes
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

// GET /api/analytics - General analytics (requires permission)
router.get('/', requireRole(['admin', 'manager', 'superadmin_owner', 'superadmin_staff']), async (_req: Request, res: Response) => {
  try {
    // Mock analytics data
    const analytics = {
      overview: {
        totalTrips: 156,
        totalBookings: 243,
        totalRevenue: 89750.50,
        avgTripCost: 575.65,
      },
      trends: {
        tripsThisMonth: 23,
        bookingsThisMonth: 45,
        revenueThisMonth: 15600.25,
        growthRate: 12.5,
      },
      topDestinations: [
        { city: 'New York', count: 45, percentage: 28.8 },
        { city: 'Los Angeles', count: 32, percentage: 20.5 },
        { city: 'Chicago', count: 28, percentage: 17.9 },
        { city: 'Miami', count: 22, percentage: 14.1 },
        { city: 'Boston', count: 18, percentage: 11.5 },
      ],
      monthlyData: Array.from({ length: 12 }, (_, i) => ({
        month: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short' }),
        trips: Math.floor(Math.random() * 30) + 10,
        bookings: Math.floor(Math.random() * 50) + 20,
        revenue: Math.floor(Math.random() * 20000) + 10000,
      })),
    };

    const response: ApiResponse<typeof analytics> = {
      success: true,
      data: analytics,
    };
    res.json(response);

  } catch (error) {
    logger.error('Get analytics error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch analytics' },
    };
    res.status(500).json(response);
  }
});

// GET /api/analytics/agency - Agency-specific analytics
router.get('/agency', requireRole(['admin', 'manager', 'superadmin_owner', 'superadmin_staff']), async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    // Mock agency analytics data
    const agencyAnalytics = {
      performance: {
        totalClients: 45,
        activeClients: 38,
        clientSatisfaction: 4.7,
        avgResponseTime: '2.3 hours',
      },
      bookings: {
        totalBookings: 189,
        completedBookings: 165,
        cancelledBookings: 12,
        pendingBookings: 12,
      },
      revenue: {
        totalRevenue: 78900.50,
        thisMonth: 12450.25,
        avgBookingValue: 417.50,
        commission: 7890.05,
      },
      clientActivity: userId ? {
        userId: userId,
        totalBookings: 23,
        totalSpent: 9875.50,
        avgTripLength: '4.2 days',
        preferredDestinations: ['New York', 'Los Angeles', 'Boston'],
      } : null,
    };

    const response: ApiResponse<typeof agencyAnalytics> = {
      success: true,
      data: agencyAnalytics,
    };
    res.json(response);

  } catch (error) {
    logger.error('Get agency analytics error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch agency analytics' },
    };
    res.status(500).json(response);
  }
});

// GET /api/analytics/corporate - Corporate-specific analytics
router.get('/corporate', requireRole(['admin', 'manager', 'superadmin_owner', 'superadmin_staff']), async (_req: Request, res: Response) => {
  try {
    // Mock corporate analytics data
    const corporateAnalytics = {
      travelSpend: {
        totalSpend: 125600.75,
        budgetUtilization: 78.5,
        monthlySpend: 15200.25,
        avgCostPerEmployee: 2856.75,
      },
      compliance: {
        policyCompliance: 92.3,
        approvalRate: 96.8,
        avgApprovalTime: '1.2 days',
        nonCompliantBookings: 8,
      },
      efficiency: {
        advanceBookingRate: 85.2,
        avgAdvanceBooking: '12.5 days',
        costSavings: 15600.50,
        preferredSuppliers: 78.9,
      },
      departments: [
        { name: 'Sales', spend: 45600.25, trips: 78 },
        { name: 'Marketing', spend: 32100.50, trips: 45 },
        { name: 'Engineering', spend: 28900.00, trips: 42 },
        { name: 'Operations', spend: 19000.00, trips: 23 },
      ],
    };

    const response: ApiResponse<typeof corporateAnalytics> = {
      success: true,
      data: corporateAnalytics,
    };
    res.json(response);

  } catch (error) {
    logger.error('Get corporate analytics error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch corporate analytics' },
    };
    res.status(500).json(response);
  }
});

export default router;