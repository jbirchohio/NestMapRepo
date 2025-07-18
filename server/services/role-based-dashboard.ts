import { z } from 'zod';
import { db } from '../db-connection.js';
import { trips, users, organizations } from '../db/schema.js';
import { eq, and, gte, lte, desc, count, sum, avg } from 'drizzle-orm';

// Role-based dashboard schemas
const DashboardRequestSchema = z.object({
  role: z.enum(['executive', 'travel_manager', 'finance', 'it_admin', 'employee']),
  timeframe: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  filters: z.object({
    department: z.string().optional(),
    location: z.string().optional(),
    budgetRange: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
  }).optional(),
});

const WidgetConfigSchema = z.object({
  widgetId: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  settings: z.record(z.any()),
  isVisible: z.boolean(),
});

const DashboardLayoutSchema = z.object({
  role: z.enum(['executive', 'travel_manager', 'finance', 'it_admin', 'employee']),
  widgets: z.array(WidgetConfigSchema),
  theme: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    layout: z.enum(['grid', 'masonry', 'flex']),
  }),
});

export const roleBasedDashboard = {
  // Generate role-specific dashboard data
  async generateDashboard(data: z.infer<typeof DashboardRequestSchema>, userId: string, organizationId: string) {
    const { role, timeframe, filters } = data;
    const startDate = new Date(timeframe.startDate);
    const endDate = new Date(timeframe.endDate);

    // Base query conditions
    const baseConditions = [
      eq(trips.organizationId, organizationId),
      gte(trips.startDate, startDate),
      lte(trips.endDate, endDate),
    ];

    // Apply filters
    if (filters?.department) {
      baseConditions.push(eq(users.department, filters.department));
    }

    // Role-specific dashboard generation
    switch (role) {
      case 'executive':
        return await this.generateExecutiveDashboard(baseConditions, organizationId, startDate, endDate);
      
      case 'travel_manager':
        return await this.generateTravelManagerDashboard(baseConditions, organizationId, startDate, endDate);
      
      case 'finance':
        return await this.generateFinanceDashboard(baseConditions, organizationId, startDate, endDate);
      
      case 'it_admin':
        return await this.generateITAdminDashboard(baseConditions, organizationId, startDate, endDate);
      
      case 'employee':
        return await this.generateEmployeeDashboard(baseConditions, userId, organizationId, startDate, endDate);
      
      default:
        throw new Error('Invalid role specified');
    }
  },

  // Executive dashboard with high-level KPIs
  async generateExecutiveDashboard(conditions: any[], organizationId: string, startDate: Date, endDate: Date) {
    // Travel spend overview
    const spendData = await db
      .select({
        totalSpend: sum(trips.budget),
        tripCount: count(trips.id),
        avgTripCost: avg(trips.budget),
      })
      .from(trips)
      .where(and(...conditions));

    // Department breakdown
    const departmentSpend = await db
      .select({
        department: users.department,
        totalSpend: sum(trips.budget),
        tripCount: count(trips.id),
      })
      .from(trips)
      .innerJoin(users, eq(trips.userId, users.id))
      .where(and(...conditions))
      .groupBy(users.department);

    // Compliance metrics
    const complianceData = await this.calculateComplianceMetrics(organizationId, startDate, endDate);

    // Cost savings analysis
    const costSavings = await this.calculateCostSavings(organizationId, startDate, endDate);

    return {
      role: 'executive',
      widgets: [
        {
          id: 'travel-spend-overview',
          type: 'kpi-card',
          title: 'Travel Spend Overview',
          data: spendData[0],
          priority: 1,
        },
        {
          id: 'department-breakdown',
          type: 'pie-chart',
          title: 'Spend by Department',
          data: departmentSpend,
          priority: 2,
        },
        {
          id: 'compliance-metrics',
          type: 'gauge-chart',
          title: 'Policy Compliance',
          data: complianceData,
          priority: 3,
        },
        {
          id: 'cost-savings',
          type: 'trend-chart',
          title: 'Cost Savings Trend',
          data: costSavings,
          priority: 4,
        },
        {
          id: 'travel-forecast',
          type: 'forecast-chart',
          title: 'Travel Demand Forecast',
          data: await this.generateTravelForecast(organizationId),
          priority: 5,
        },
      ],
      insights: await this.generateExecutiveInsights(organizationId, startDate, endDate),
      alerts: await this.generateExecutiveAlerts(organizationId),
    };
  },

  // Travel manager dashboard with operational focus
  async generateTravelManagerDashboard(conditions: any[], organizationId: string, startDate: Date, endDate: Date) {
    // Active trips and bookings
    const activeTrips = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.organizationId, organizationId),
        gte(trips.startDate, new Date()),
      ))
      .orderBy(desc(trips.startDate))
      .limit(10);

    // Booking trends
    const bookingTrends = await this.calculateBookingTrends(organizationId, startDate, endDate);

    // Vendor performance
    const vendorPerformance = await this.calculateVendorPerformance(organizationId, startDate, endDate);

    // Approval queue
    const approvalQueue = await this.getApprovalQueue(organizationId);

    return {
      role: 'travel_manager',
      widgets: [
        {
          id: 'active-trips',
          type: 'data-table',
          title: 'Active Trips',
          data: activeTrips,
          priority: 1,
        },
        {
          id: 'booking-trends',
          type: 'line-chart',
          title: 'Booking Trends',
          data: bookingTrends,
          priority: 2,
        },
        {
          id: 'vendor-performance',
          type: 'bar-chart',
          title: 'Vendor Performance',
          data: vendorPerformance,
          priority: 3,
        },
        {
          id: 'approval-queue',
          type: 'task-list',
          title: 'Pending Approvals',
          data: approvalQueue,
          priority: 4,
        },
        {
          id: 'traveler-satisfaction',
          type: 'rating-chart',
          title: 'Traveler Satisfaction',
          data: await this.calculateTravelerSatisfaction(organizationId, startDate, endDate),
          priority: 5,
        },
      ],
      quickActions: [
        { id: 'approve-trip', label: 'Approve Trip', icon: 'check', action: '/api/trips/approve' },
        { id: 'create-policy', label: 'Create Policy', icon: 'plus', action: '/api/policies/create' },
        { id: 'generate-report', label: 'Generate Report', icon: 'report', action: '/api/reports/generate' },
      ],
    };
  },

  // Finance dashboard with cost analysis
  async generateFinanceDashboard(conditions: any[], organizationId: string, startDate: Date, endDate: Date) {
    // Budget analysis
    const budgetAnalysis = await this.calculateBudgetAnalysis(organizationId, startDate, endDate);

    // Expense categories
    const expenseCategories = await this.calculateExpenseCategories(organizationId, startDate, endDate);

    // Cost center analysis
    const costCenterAnalysis = await this.calculateCostCenterAnalysis(organizationId, startDate, endDate);

    // Variance analysis
    const varianceAnalysis = await this.calculateVarianceAnalysis(organizationId, startDate, endDate);

    return {
      role: 'finance',
      widgets: [
        {
          id: 'budget-analysis',
          type: 'budget-chart',
          title: 'Budget vs Actual',
          data: budgetAnalysis,
          priority: 1,
        },
        {
          id: 'expense-categories',
          type: 'donut-chart',
          title: 'Expense Categories',
          data: expenseCategories,
          priority: 2,
        },
        {
          id: 'cost-center-analysis',
          type: 'tree-map',
          title: 'Cost Center Analysis',
          data: costCenterAnalysis,
          priority: 3,
        },
        {
          id: 'variance-analysis',
          type: 'variance-chart',
          title: 'Budget Variance',
          data: varianceAnalysis,
          priority: 4,
        },
      ],
      financialSummary: await this.generateFinancialSummary(organizationId, startDate, endDate),
      recommendations: await this.generateFinancialRecommendations(organizationId, startDate, endDate),
    };
  },

  // IT Admin dashboard with system metrics
  async generateITAdminDashboard(conditions: any[], organizationId: string, startDate: Date, endDate: Date) {
    // System performance metrics
    const systemMetrics = await this.getSystemMetrics(organizationId);

    // User activity
    const userActivity = await this.getUserActivity(organizationId, startDate, endDate);

    // Integration status
    const integrationStatus = await this.getIntegrationStatus(organizationId);

    // Security metrics
    const securityMetrics = await this.getSecurityMetrics(organizationId, startDate, endDate);

    return {
      role: 'it_admin',
      widgets: [
        {
          id: 'system-performance',
          type: 'metric-grid',
          title: 'System Performance',
          data: systemMetrics,
          priority: 1,
        },
        {
          id: 'user-activity',
          type: 'activity-chart',
          title: 'User Activity',
          data: userActivity,
          priority: 2,
        },
        {
          id: 'integration-status',
          type: 'status-grid',
          title: 'Integration Status',
          data: integrationStatus,
          priority: 3,
        },
        {
          id: 'security-metrics',
          type: 'security-dashboard',
          title: 'Security Overview',
          data: securityMetrics,
          priority: 4,
        },
      ],
      systemHealth: await this.getSystemHealth(organizationId),
      alerts: await this.getSystemAlerts(organizationId),
    };
  },

  // Employee dashboard with personal travel info
  async generateEmployeeDashboard(conditions: any[], userId: string, organizationId: string, startDate: Date, endDate: Date) {
    // Personal trips
    const personalTrips = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.userId, userId),
        eq(trips.organizationId, organizationId),
      ))
      .orderBy(desc(trips.startDate))
      .limit(10);

    // Upcoming trips
    const upcomingTrips = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.userId, userId),
        gte(trips.startDate, new Date()),
      ))
      .orderBy(trips.startDate)
      .limit(5);

    // Travel statistics
    const travelStats = await this.calculatePersonalTravelStats(userId, organizationId, startDate, endDate);

    return {
      role: 'employee',
      widgets: [
        {
          id: 'upcoming-trips',
          type: 'trip-cards',
          title: 'Upcoming Trips',
          data: upcomingTrips,
          priority: 1,
        },
        {
          id: 'travel-history',
          type: 'timeline',
          title: 'Travel History',
          data: personalTrips,
          priority: 2,
        },
        {
          id: 'travel-stats',
          type: 'stat-cards',
          title: 'Travel Statistics',
          data: travelStats,
          priority: 3,
        },
        {
          id: 'expense-summary',
          type: 'expense-chart',
          title: 'Expense Summary',
          data: await this.calculatePersonalExpenses(userId, organizationId, startDate, endDate),
          priority: 4,
        },
      ],
      quickActions: [
        { id: 'book-trip', label: 'Book New Trip', icon: 'plane', action: '/trips/new' },
        { id: 'view-expenses', label: 'View Expenses', icon: 'receipt', action: '/expenses' },
        { id: 'update-profile', label: 'Update Profile', icon: 'user', action: '/profile' },
      ],
      recommendations: await this.generatePersonalRecommendations(userId, organizationId),
    };
  },

  // Save custom dashboard layout
  async saveDashboardLayout(layoutData: z.infer<typeof DashboardLayoutSchema>, userId: string, organizationId: string) {
    // Store layout configuration in database or cache
    console.log('Saving dashboard layout for user:', userId, 'organization:', organizationId);
    
    // In a real implementation, this would save to a dashboard_layouts table
    return {
      success: true,
      message: 'Dashboard layout saved successfully',
      layoutId: `layout_${userId}_${Date.now()}`,
    };
  },

  // Helper methods for calculations
  async calculateComplianceMetrics(organizationId: string, startDate: Date, endDate: Date) {
    // Mock compliance calculation
    return {
      overallCompliance: 92,
      policyViolations: 8,
      approvalRate: 95,
      averageApprovalTime: 2.5,
    };
  },

  async calculateCostSavings(organizationId: string, startDate: Date, endDate: Date) {
    // Mock cost savings calculation
    return [
      { month: 'Jan', savings: 15000, percentage: 12 },
      { month: 'Feb', savings: 18000, percentage: 15 },
      { month: 'Mar', savings: 22000, percentage: 18 },
      { month: 'Apr', savings: 25000, percentage: 20 },
    ];
  },

  async generateTravelForecast(organizationId: string) {
    // Mock travel forecast
    return {
      nextQuarter: { trips: 150, budget: 450000, confidence: 85 },
      seasonalTrends: [
        { quarter: 'Q1', predicted: 120, actual: 115 },
        { quarter: 'Q2', predicted: 150, actual: 145 },
        { quarter: 'Q3', predicted: 180, actual: null },
        { quarter: 'Q4', predicted: 160, actual: null },
      ],
    };
  },

  async generateExecutiveInsights(organizationId: string, startDate: Date, endDate: Date) {
    return [
      {
        type: 'cost_optimization',
        title: 'Cost Optimization Opportunity',
        description: 'Switching to preferred vendors could save 15% on accommodation costs',
        impact: 'high',
        action: 'Review vendor agreements',
      },
      {
        type: 'policy_compliance',
        title: 'Policy Compliance Improvement',
        description: 'Recent policy updates have improved compliance by 8%',
        impact: 'medium',
        action: 'Continue monitoring',
      },
    ];
  },

  async generateExecutiveAlerts(organizationId: string) {
    return [
      {
        type: 'budget_warning',
        severity: 'high',
        message: 'Q3 travel budget is 85% utilized with 1 month remaining',
        action: 'Review upcoming trips and consider budget reallocation',
      },
      {
        type: 'compliance_alert',
        severity: 'medium',
        message: '3 trips require immediate approval review',
        action: 'Review pending approvals',
      },
    ];
  },

  // Additional helper methods would be implemented here
  async calculateBookingTrends(organizationId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    return [];
  },

  async calculateVendorPerformance(organizationId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    return [];
  },

  async getApprovalQueue(organizationId: string) {
    // Mock implementation
    return [];
  },

  async calculateTravelerSatisfaction(organizationId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    return { averageRating: 4.2, responseRate: 78 };
  },

  async calculateBudgetAnalysis(organizationId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    return {};
  },

  async calculateExpenseCategories(organizationId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    return [];
  },

  async calculateCostCenterAnalysis(organizationId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    return {};
  },

  async calculateVarianceAnalysis(organizationId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    return {};
  },

  async generateFinancialSummary(organizationId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    return {};
  },

  async generateFinancialRecommendations(organizationId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    return [];
  },

  async getSystemMetrics(organizationId: string) {
    // Mock implementation
    return {};
  },

  async getUserActivity(organizationId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    return {};
  },

  async getIntegrationStatus(organizationId: string) {
    // Mock implementation
    return {};
  },

  async getSecurityMetrics(organizationId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    return {};
  },

  async getSystemHealth(organizationId: string) {
    // Mock implementation
    return {};
  },

  async getSystemAlerts(organizationId: string) {
    // Mock implementation
    return [];
  },

  async calculatePersonalTravelStats(userId: string, organizationId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    return {};
  },

  async calculatePersonalExpenses(userId: string, organizationId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    return {};
  },

  async generatePersonalRecommendations(userId: string, organizationId: string) {
    // Mock implementation
    return [];
  },
};
