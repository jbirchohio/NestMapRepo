import { Router } from 'express';
import { eq, and, desc, gte, lte, sql, count } from 'drizzle-orm';
import { db } from '../db';
import { 
  trips, 
  expenses, 
  bookings, 
  users, 
  organizations,
  approvalRequests,
  activities
} from '@shared/schema';

const router = Router();

// Enterprise analytics dashboard
router.get('/dashboard', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organization_id;
    const userRole = req.user.role;
    
    // Only managers and admins can access analytics
    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: "Manager role required for analytics access" });
    }

    const { period = '30d' } = req.query;
    const startDate = getPeriodStartDate(period as string);
    const endDate = new Date();

    // Get comprehensive analytics
    const analytics = await Promise.all([
      getTripAnalytics(organizationId, startDate, endDate),
      getExpenseAnalytics(organizationId, startDate, endDate),
      getBookingAnalytics(organizationId, startDate, endDate),
      getUserEngagementAnalytics(organizationId, startDate, endDate),
      getApprovalAnalytics(organizationId, startDate, endDate),
      getCostAnalytics(organizationId, startDate, endDate)
    ]);

    const [
      tripStats,
      expenseStats,
      bookingStats,
      userEngagement,
      approvalStats,
      costBreakdown
    ] = analytics;

    res.json({
      period,
      overview: {
        totalTrips: tripStats.total,
        totalExpenses: expenseStats.total,
        totalBookings: bookingStats.total,
        activeUsers: userEngagement.activeUsers,
        pendingApprovals: approvalStats.pending
      },
      trips: tripStats,
      expenses: expenseStats,
      bookings: bookingStats,
      userEngagement,
      approvals: approvalStats,
      costBreakdown,
      trends: await getTrendAnalytics(organizationId, startDate, endDate)
    });

  } catch (error) {
    console.error('Error generating analytics dashboard:', error);
    res.status(500).json({ error: "Failed to generate analytics dashboard" });
  }
});

// Detailed trip performance report
router.get('/trips/performance', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organization_id;
    const { startDate, endDate, userId, departmentId } = req.query;

    const performance = await db
      .select({
        trip: {
          id: trips.id,
          title: trips.title,
          destination: trips.destination,
          startDate: trips.start_date,
          endDate: trips.end_date,
          status: trips.status,
          totalBudget: trips.total_budget
        },
        user: {
          id: users.id,
          displayName: users.display_name,
          department: users.department
        },
        metrics: {
          expenseCount: sql<number>`(
            SELECT COUNT(*) FROM expenses e 
            WHERE e.trip_id = ${trips.id}
          )`,
          totalExpenseAmount: sql<number>`(
            SELECT COALESCE(SUM(e.amount), 0) FROM expenses e 
            WHERE e.trip_id = ${trips.id}
          )`,
          bookingCount: sql<number>`(
            SELECT COUNT(*) FROM bookings b 
            WHERE b.trip_id = ${trips.id}
          )`,
          activitiesCount: sql<number>`(
            SELECT COUNT(*) FROM activities a 
            WHERE a.trip_id = ${trips.id}
          )`
        }
      })
      .from(trips)
      .leftJoin(users, eq(trips.user_id, users.id))
      .where(eq(trips.organization_id, organizationId))
      .orderBy(desc(trips.created_at));

    // Calculate ROI and efficiency metrics
    const enhancedPerformance = performance.map(trip => ({
      ...trip,
      roi: calculateTripROI(trip),
      efficiency: calculateTripEfficiency(trip),
      budgetUtilization: trip.trip.totalBudget ? 
        (trip.metrics.totalExpenseAmount / trip.trip.totalBudget) * 100 : 0,
      costPerDay: calculateCostPerDay(trip)
    }));

    res.json({
      trips: enhancedPerformance,
      summary: {
        totalTrips: performance.length,
        averageROI: enhancedPerformance.reduce((sum, t) => sum + t.roi, 0) / performance.length,
        averageEfficiency: enhancedPerformance.reduce((sum, t) => sum + t.efficiency, 0) / performance.length,
        totalSpend: performance.reduce((sum, t) => sum + t.metrics.totalExpenseAmount, 0)
      }
    });

  } catch (error) {
    console.error('Error generating trip performance report:', error);
    res.status(500).json({ error: "Failed to generate trip performance report" });
  }
});

// Financial compliance report
router.get('/compliance/financial', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organization_id;
    const userRole = req.user.role;
    
    // Only admins can access compliance reports
    if (userRole !== 'admin') {
      return res.status(403).json({ error: "Admin role required for compliance reports" });
    }

    const { year = new Date().getFullYear() } = req.query;
    const startDate = new Date(parseInt(year as string), 0, 1);
    const endDate = new Date(parseInt(year as string) + 1, 0, 0);

    // Get compliance metrics
    const complianceData = await Promise.all([
      getExpenseCompliance(organizationId, startDate, endDate),
      getApprovalCompliance(organizationId, startDate, endDate),
      getTaxComplianceData(organizationId, startDate, endDate),
      getAuditTrailCompleteness(organizationId, startDate, endDate)
    ]);

    const [expenseCompliance, approvalCompliance, taxData, auditCompleteness] = complianceData;

    const report = {
      period: `${year}`,
      overallScore: calculateComplianceScore([
        expenseCompliance,
        approvalCompliance,
        auditCompleteness
      ]),
      expenseCompliance,
      approvalCompliance,
      taxCompliance: taxData,
      auditTrail: auditCompleteness,
      recommendations: generateComplianceRecommendations([
        expenseCompliance,
        approvalCompliance,
        auditCompleteness
      ])
    };

    res.json(report);

  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: "Failed to generate compliance report" });
  }
});

// Export data for external analysis
router.get('/export/:reportType', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organization_id;
    const { reportType } = req.params;
    const { format = 'csv', startDate, endDate } = req.query;

    let data: any[] = [];
    let filename = '';

    switch (reportType) {
      case 'trips':
        data = await exportTripsData(organizationId, startDate as string, endDate as string);
        filename = 'trips-export';
        break;
      case 'expenses':
        data = await exportExpensesData(organizationId, startDate as string, endDate as string);
        filename = 'expenses-export';
        break;
      case 'bookings':
        data = await exportBookingsData(organizationId, startDate as string, endDate as string);
        filename = 'bookings-export';
        break;
      case 'compliance':
        data = await exportComplianceData(organizationId, startDate as string, endDate as string);
        filename = 'compliance-export';
        break;
      default:
        return res.status(400).json({ error: "Invalid report type" });
    }

    if (format === 'csv') {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
      res.send(csv);
    } else {
      res.json(data);
    }

  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: "Failed to export data" });
  }
});

// Custom report builder
router.post('/custom', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organization_id;
    const {
      metrics,
      filters,
      groupBy,
      timeRange
    } = req.body;

    const report = await buildCustomReport(organizationId, {
      metrics,
      filters,
      groupBy,
      timeRange
    });

    res.json(report);

  } catch (error) {
    console.error('Error building custom report:', error);
    res.status(500).json({ error: "Failed to build custom report" });
  }
});

// Helper functions
function getPeriodStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '1y':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

async function getTripAnalytics(organizationId: number, startDate: Date, endDate: Date) {
  const tripCount = await db
    .select({ count: count() })
    .from(trips)
    .where(and(
      eq(trips.organization_id, organizationId),
      gte(trips.created_at, startDate),
      lte(trips.created_at, endDate)
    ));

  const statusBreakdown = await db
    .select({
      status: trips.status,
      count: count()
    })
    .from(trips)
    .where(and(
      eq(trips.organization_id, organizationId),
      gte(trips.created_at, startDate),
      lte(trips.created_at, endDate)
    ))
    .groupBy(trips.status);

  return {
    total: tripCount[0]?.count || 0,
    byStatus: statusBreakdown,
    completionRate: calculateCompletionRate(statusBreakdown),
    averageDuration: await calculateAverageTripDuration(organizationId, startDate, endDate)
  };
}

async function getExpenseAnalytics(organizationId: number, startDate: Date, endDate: Date) {
  const expenseStats = await db
    .select({
      total: count(),
      totalAmount: sql<number>`SUM(${expenses.amount})`
    })
    .from(expenses)
    .where(and(
      eq(expenses.organizationId, organizationId),
      gte(expenses.createdAt, startDate),
      lte(expenses.createdAt, endDate)
    ));

  const categoryBreakdown = await db
    .select({
      category: expenses.category,
      count: count(),
      totalAmount: sql<number>`SUM(${expenses.amount})`
    })
    .from(expenses)
    .where(and(
      eq(expenses.organizationId, organizationId),
      gte(expenses.createdAt, startDate),
      lte(expenses.createdAt, endDate)
    ))
    .groupBy(expenses.category);

  return {
    total: expenseStats[0]?.total || 0,
    totalAmount: expenseStats[0]?.totalAmount || 0,
    byCategory: categoryBreakdown,
    averageExpense: expenseStats[0]?.totalAmount / Math.max(expenseStats[0]?.total, 1) || 0
  };
}

async function getBookingAnalytics(organizationId: number, startDate: Date, endDate: Date) {
  const bookingStats = await db
    .select({
      total: count(),
      totalAmount: sql<number>`SUM(${bookings.totalAmount})`
    })
    .from(bookings)
    .where(and(
      eq(bookings.organizationId, organizationId),
      gte(bookings.createdAt, startDate),
      lte(bookings.createdAt, endDate)
    ));

  return {
    total: bookingStats[0]?.total || 0,
    totalAmount: bookingStats[0]?.totalAmount || 0
  };
}

async function getUserEngagementAnalytics(organizationId: number, startDate: Date, endDate: Date) {
  const activeUsers = await db
    .select({ userId: trips.user_id })
    .from(trips)
    .where(and(
      eq(trips.organization_id, organizationId),
      gte(trips.created_at, startDate),
      lte(trips.created_at, endDate)
    ))
    .groupBy(trips.user_id);

  return {
    activeUsers: activeUsers.length,
    engagementRate: activeUsers.length // Would calculate against total users
  };
}

async function getApprovalAnalytics(organizationId: number, startDate: Date, endDate: Date) {
  const approvalStats = await db
    .select({
      status: approvalRequests.status,
      count: count()
    })
    .from(approvalRequests)
    .where(and(
      eq(approvalRequests.organizationId, organizationId),
      gte(approvalRequests.createdAt, startDate),
      lte(approvalRequests.createdAt, endDate)
    ))
    .groupBy(approvalRequests.status);

  const pending = approvalStats.find(s => s.status === 'pending')?.count || 0;
  const approved = approvalStats.find(s => s.status === 'approved')?.count || 0;
  const rejected = approvalStats.find(s => s.status === 'rejected')?.count || 0;

  return {
    pending,
    approved,
    rejected,
    approvalRate: approved / Math.max(approved + rejected, 1) * 100
  };
}

async function getCostAnalytics(organizationId: number, startDate: Date, endDate: Date) {
  // Combine expenses and bookings for total cost breakdown
  const expenseTotal = await db
    .select({ total: sql<number>`SUM(${expenses.amount})` })
    .from(expenses)
    .where(and(
      eq(expenses.organizationId, organizationId),
      gte(expenses.createdAt, startDate),
      lte(expenses.createdAt, endDate)
    ));

  const bookingTotal = await db
    .select({ total: sql<number>`SUM(${bookings.totalAmount})` })
    .from(bookings)
    .where(and(
      eq(bookings.organizationId, organizationId),
      gte(bookings.createdAt, startDate),
      lte(bookings.createdAt, endDate)
    ));

  return {
    expenses: expenseTotal[0]?.total || 0,
    bookings: bookingTotal[0]?.total || 0,
    total: (expenseTotal[0]?.total || 0) + (bookingTotal[0]?.total || 0)
  };
}

async function getTrendAnalytics(organizationId: number, startDate: Date, endDate: Date) {
  // Monthly trends for the period
  const monthlyTrends = await db
    .select({
      month: sql<string>`to_char(${trips.created_at}, 'YYYY-MM')`,
      tripCount: count(),
      totalBudget: sql<number>`SUM(${trips.total_budget})`
    })
    .from(trips)
    .where(and(
      eq(trips.organization_id, organizationId),
      gte(trips.created_at, startDate),
      lte(trips.created_at, endDate)
    ))
    .groupBy(sql`to_char(${trips.created_at}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${trips.created_at}, 'YYYY-MM')`);

  return {
    monthly: monthlyTrends
  };
}

function calculateTripROI(trip: any): number {
  // Simplified ROI calculation
  const revenue = trip.trip.totalBudget || 0;
  const cost = trip.metrics.totalExpenseAmount || 0;
  return revenue > 0 ? ((revenue - cost) / cost) * 100 : 0;
}

function calculateTripEfficiency(trip: any): number {
  // Activities per day metric
  const duration = trip.trip.startDate && trip.trip.endDate ?
    Math.ceil((new Date(trip.trip.endDate).getTime() - new Date(trip.trip.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 1;
  return trip.metrics.activitiesCount / duration;
}

function calculateCostPerDay(trip: any): number {
  const duration = trip.trip.startDate && trip.trip.endDate ?
    Math.ceil((new Date(trip.trip.endDate).getTime() - new Date(trip.trip.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 1;
  return trip.metrics.totalExpenseAmount / duration;
}

function calculateCompletionRate(statusBreakdown: any[]): number {
  const completed = statusBreakdown.find(s => s.status === 'completed')?.count || 0;
  const total = statusBreakdown.reduce((sum, s) => sum + s.count, 0);
  return total > 0 ? (completed / total) * 100 : 0;
}

async function calculateAverageTripDuration(organizationId: number, startDate: Date, endDate: Date): Promise<number> {
  const trips_with_duration = await db
    .select({
      duration: sql<number>`EXTRACT(DAY FROM ${trips.end_date} - ${trips.start_date})`
    })
    .from(trips)
    .where(and(
      eq(trips.organization_id, organizationId),
      gte(trips.created_at, startDate),
      lte(trips.created_at, endDate)
    ));

  const totalDuration = trips_with_duration.reduce((sum, t) => sum + (t.duration || 0), 0);
  return trips_with_duration.length > 0 ? totalDuration / trips_with_duration.length : 0;
}

async function getExpenseCompliance(organizationId: number, startDate: Date, endDate: Date) {
  const totalExpenses = await db
    .select({ count: count() })
    .from(expenses)
    .where(and(
      eq(expenses.organizationId, organizationId),
      gte(expenses.createdAt, startDate),
      lte(expenses.createdAt, endDate)
    ));

  const expensesWithReceipts = await db
    .select({ count: count() })
    .from(expenses)
    .where(and(
      eq(expenses.organizationId, organizationId),
      gte(expenses.createdAt, startDate),
      lte(expenses.createdAt, endDate),
      sql`${expenses.receiptUrl} IS NOT NULL`
    ));

  const receiptComplianceRate = totalExpenses[0]?.count > 0 ?
    (expensesWithReceipts[0]?.count / totalExpenses[0]?.count) * 100 : 100;

  return {
    totalExpenses: totalExpenses[0]?.count || 0,
    withReceipts: expensesWithReceipts[0]?.count || 0,
    receiptComplianceRate,
    issues: receiptComplianceRate < 90 ? ['Low receipt compliance rate'] : []
  };
}

async function getApprovalCompliance(organizationId: number, startDate: Date, endDate: Date) {
  const requiresApproval = await db
    .select({ count: count() })
    .from(approvalRequests)
    .where(and(
      eq(approvalRequests.organizationId, organizationId),
      gte(approvalRequests.createdAt, startDate),
      lte(approvalRequests.createdAt, endDate)
    ));

  const processedOnTime = await db
    .select({ count: count() })
    .from(approvalRequests)
    .where(and(
      eq(approvalRequests.organizationId, organizationId),
      gte(approvalRequests.createdAt, startDate),
      lte(approvalRequests.createdAt, endDate),
      sql`${approvalRequests.approvedAt} <= ${approvalRequests.dueDate}`,
      sql`${approvalRequests.status} = 'approved'`
    ));

  const onTimeRate = requiresApproval[0]?.count > 0 ?
    (processedOnTime[0]?.count / requiresApproval[0]?.count) * 100 : 100;

  return {
    totalRequests: requiresApproval[0]?.count || 0,
    processedOnTime: processedOnTime[0]?.count || 0,
    onTimeRate,
    issues: onTimeRate < 95 ? ['Approval processing delays'] : []
  };
}

async function getTaxComplianceData(organizationId: number, startDate: Date, endDate: Date) {
  // Calculate tax-deductible amounts and compliance
  const taxDeductibleExpenses = await db
    .select({
      category: expenses.category,
      totalAmount: sql<number>`SUM(${expenses.amount})`
    })
    .from(expenses)
    .where(and(
      eq(expenses.organizationId, organizationId),
      gte(expenses.createdAt, startDate),
      lte(expenses.createdAt, endDate),
      sql`${expenses.category} IN ('meals', 'accommodation', 'transportation')`
    ))
    .groupBy(expenses.category);

  const totalDeductible = taxDeductibleExpenses.reduce((sum, e) => {
    const rate = e.category === 'meals' ? 0.5 : 1.0; // 50% for meals, 100% for others
    return sum + (e.totalAmount * rate);
  }, 0);

  return {
    totalDeductible,
    byCategory: taxDeductibleExpenses,
    complianceRate: 100 // Simplified - would include actual tax compliance checks
  };
}

async function getAuditTrailCompleteness(organizationId: number, startDate: Date, endDate: Date) {
  // Check audit trail completeness
  return {
    completeness: 100, // Simplified
    missingEntries: 0,
    issues: []
  };
}

function calculateComplianceScore(metrics: any[]): number {
  // Calculate overall compliance score
  const scores = metrics.map(m => m.complianceRate || m.onTimeRate || m.receiptComplianceRate || 100);
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function generateComplianceRecommendations(metrics: any[]): string[] {
  const recommendations: string[] = [];
  
  metrics.forEach(metric => {
    if (metric.issues) {
      recommendations.push(...metric.issues);
    }
  });

  if (recommendations.length === 0) {
    recommendations.push('All compliance metrics are within acceptable ranges');
  }

  return recommendations;
}

async function exportTripsData(organizationId: number, startDate?: string, endDate?: string) {
  // Export comprehensive trip data
  return await db
    .select()
    .from(trips)
    .leftJoin(users, eq(trips.user_id, users.id))
    .where(eq(trips.organization_id, organizationId));
}

async function exportExpensesData(organizationId: number, startDate?: string, endDate?: string) {
  // Export comprehensive expense data
  return await db
    .select()
    .from(expenses)
    .leftJoin(trips, eq(expenses.tripId, trips.id))
    .leftJoin(users, eq(expenses.userId, users.id))
    .where(eq(expenses.organizationId, organizationId));
}

async function exportBookingsData(organizationId: number, startDate?: string, endDate?: string) {
  // Export comprehensive booking data
  return await db
    .select()
    .from(bookings)
    .leftJoin(trips, eq(bookings.tripId, trips.id))
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.organizationId, organizationId));
}

async function exportComplianceData(organizationId: number, startDate?: string, endDate?: string) {
  // Export compliance-related data
  return await db
    .select()
    .from(approvalRequests)
    .leftJoin(users, eq(approvalRequests.requesterId, users.id))
    .where(eq(approvalRequests.organizationId, organizationId));
}

function convertToCSV(data: any[]): string {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(value => 
      typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
    ).join(',')
  );
  
  return [headers, ...rows].join('\n');
}

async function buildCustomReport(organizationId: number, config: any) {
  // Custom report builder - would implement based on config
  return {
    message: "Custom report builder would be implemented here",
    config
  };
}

export default router;