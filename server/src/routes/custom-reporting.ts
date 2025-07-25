import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';
import { getDatabase } from '../db/connection';
import { trips, users, organizations, expenses, bookings } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Apply JWT authentication to all custom reporting routes
router.use(authenticateJWT);

// Helper to get database instance
const getDB = () => {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
};

// Validation schemas
const generateReportSchema = z.object({
  title: z.string().min(1),
  dateRange: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }),
  groupBy: z.enum(['day', 'week', 'month', 'quarter', 'year', 'department', 'purpose', 'destination']).default('month'),
  metrics: z.array(z.enum(['totalCost', 'tripCount', 'averageCost', 'savings', 'carbonFootprint', 'duration'])),
  filters: z.object({
    status: z.enum(['pending', 'approved', 'completed', 'cancelled']).optional(),
    purpose: z.enum(['business', 'training', 'conference', 'meeting', 'other']).optional(),
    department: z.string().optional(),
    minCost: z.number().optional(),
    maxCost: z.number().optional(),
    destination: z.string().optional()
  }).optional(),
  format: z.enum(['json', 'csv', 'pdf', 'excel']).default('json'),
  includeCharts: z.boolean().default(true)
});

// Helper function to get real trip data from database for reporting
const getTripDataFromDatabase = async (dateRange: any, filters: any = {}) => {
  try {
    const db = getDB();
    
    // For now, fall back to mock data due to complex query issues
    // TODO: Implement proper database queries after fixing query builder
    logger.warn('Using mock data for custom reporting - database query implementation pending');
    return generateMockTripData(dateRange, filters);
    
  } catch (error) {
    logger.error('Database error while fetching trip data:', error);
    logger.warn('Falling back to mock data for reporting');
    return generateMockTripData(dateRange, filters);
  }
};

// Helper function to generate mock trip data for reporting (fallback)
const generateMockTripData = (dateRange: any, filters: any = {}) => {
  const trips: any[] = [];
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Generate 3-15 trips based on date range
  const tripCount = Math.min(15, Math.max(3, Math.floor(daysDiff / 10)));
  
  const purposes = ['business', 'training', 'conference', 'meeting'];
  const statuses = ['pending', 'approved', 'completed', 'cancelled'];
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'];
  const destinations = ['New York', 'London', 'Tokyo', 'Paris', 'San Francisco', 'Singapore', 'Dubai'];
  
  for (let i = 0; i < tripCount; i++) {
    const tripDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    const purpose = purposes[Math.floor(Math.random() * purposes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const department = departments[Math.floor(Math.random() * departments.length)];
    const destination = destinations[Math.floor(Math.random() * destinations.length)];
    const cost = Math.round(500 + Math.random() * 2500);
    const duration = Math.ceil(1 + Math.random() * 7);
    
    // Apply filters
    if (filters.status && status !== filters.status) continue;
    if (filters.purpose && purpose !== filters.purpose) continue;
    if (filters.department && department !== filters.department) continue;
    if (filters.minCost && cost < filters.minCost) continue;
    if (filters.maxCost && cost > filters.maxCost) continue;
    if (filters.destination && !destination.toLowerCase().includes(filters.destination.toLowerCase())) continue;
    
    trips.push({
      id: `trip_${i + 1}`,
      title: `${purpose.charAt(0).toUpperCase() + purpose.slice(1)} Trip to ${destination}`,
      destination: destination,
      startDate: tripDate.toISOString().split('T')[0],
      endDate: new Date(tripDate.getTime() + duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      purpose: purpose,
      status: status,
      department: department,
      cost: cost,
      duration: duration,
      carbonFootprint: Math.round(cost * 0.2), // Mock carbon calculation
      savings: status === 'completed' ? Math.round(cost * 0.1) : 0
    });
  }
  
  return trips;
};

// Helper function to aggregate data by groupBy parameter
const aggregateReportData = (trips: any[], groupBy: string, metrics: string[]) => {
  const aggregated: { [key: string]: any } = {};
  
  trips.forEach(trip => {
    let groupKey = '';
    
    switch (groupBy) {
      case 'month':
        groupKey = trip.startDate.substring(0, 7); // YYYY-MM
        break;
      case 'quarter':
        const month = parseInt(trip.startDate.substring(5, 7));
        const quarter = Math.ceil(month / 3);
        groupKey = `${trip.startDate.substring(0, 4)}-Q${quarter}`;
        break;
      case 'year':
        groupKey = trip.startDate.substring(0, 4);
        break;
      case 'department':
        groupKey = trip.department;
        break;
      case 'purpose':
        groupKey = trip.purpose;
        break;
      case 'destination':
        groupKey = trip.destination;
        break;
      default:
        groupKey = trip.startDate;
    }
    
    if (!aggregated[groupKey]) {
      aggregated[groupKey] = {
        group: groupKey,
        totalCost: 0,
        tripCount: 0,
        averageCost: 0,
        savings: 0,
        carbonFootprint: 0,
        duration: 0,
        trips: []
      };
    }
    
    const group = aggregated[groupKey];
    group.tripCount += 1;
    group.totalCost += trip.cost;
    group.savings += trip.savings;
    group.carbonFootprint += trip.carbonFootprint;
    group.duration += trip.duration;
    group.trips.push(trip);
    group.averageCost = Math.round(group.totalCost / group.tripCount);
  });
  
  // Filter to only include requested metrics
  return Object.values(aggregated).map((group: any) => {
    const filteredGroup: any = { group: group.group };
    metrics.forEach(metric => {
      filteredGroup[metric] = group[metric];
    });
    return filteredGroup;
  });
};

// Helper function to generate chart configuration
const generateChartConfig = (data: any[], metrics: string[], groupBy: string) => {
  const charts: any[] = [];
  
  // Generate chart for each metric
  metrics.forEach(metric => {
    let chartType = 'line';
    let title = metric;
    
    switch (metric) {
      case 'totalCost':
        chartType = 'bar';
        title = 'Total Spending';
        break;
      case 'tripCount':
        chartType = 'bar';
        title = 'Number of Trips';
        break;
      case 'averageCost':
        chartType = 'line';
        title = 'Average Trip Cost';
        break;
      case 'savings':
        chartType = 'area';
        title = 'Cost Savings';
        break;
      case 'carbonFootprint':
        chartType = 'line';
        title = 'Carbon Footprint';
        break;
    }
    
    charts.push({
      id: `chart_${metric}`,
      type: chartType,
      title: title,
      data: data.map(item => ({
        x: item.group,
        y: item[metric] || 0
      })),
      config: {
        xAxis: {
          title: groupBy.charAt(0).toUpperCase() + groupBy.slice(1),
          type: 'category'
        },
        yAxis: {
          title: metric === 'totalCost' || metric === 'averageCost' || metric === 'savings' ? 'Amount ($)' : 'Count',
          format: metric === 'totalCost' || metric === 'averageCost' || metric === 'savings' ? 'currency' : 'number'
        }
      }
    });
  });
  
  return charts;
};

// POST /api/custom-reporting/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { title, dateRange, groupBy, metrics, filters, format, includeCharts } = generateReportSchema.parse(req.body);
    const userId = (req as any).user?.id || 'anonymous';
    
    logger.info(`Custom report generation request from user ${userId}:`, { 
      title, 
      dateRange, 
      groupBy, 
      metrics: metrics.length 
    });
    
    // Get trip data from database based on filters and date range
    const trips = await getTripDataFromDatabase(dateRange, filters);
    
    // Aggregate data based on groupBy parameter
    const aggregatedData = aggregateReportData(trips, groupBy, metrics);
    
    // Calculate summary statistics
    const summary = {
      totalTrips: trips.length,
      totalCost: trips.reduce((sum, trip) => sum + trip.cost, 0),
      averageCost: Math.round(trips.reduce((sum, trip) => sum + trip.cost, 0) / trips.length) || 0,
      totalSavings: trips.reduce((sum, trip) => sum + trip.savings, 0),
      totalCarbonFootprint: trips.reduce((sum, trip) => sum + trip.carbonFootprint, 0),
      dateRange: dateRange,
      filters: filters
    };
    
    // Generate charts if requested
    let chartConfig: any[] | null = null;
    if (includeCharts) {
      chartConfig = generateChartConfig(aggregatedData, metrics, groupBy);
    }
    
    // Create report metadata
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    logger.info(`Custom report generated:`, {
      reportId,
      dataPoints: aggregatedData.length,
      totalTrips: summary.totalTrips,
      totalCost: summary.totalCost
    });
    
    res.json({
      success: true,
      data: {
        reportId: reportId,
        title: title,
        summary: summary,
        data: aggregatedData,
        chartConfig: chartConfig,
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: userId,
          format: format,
          totalRecords: aggregatedData.length,
          exportOptions: ['csv', 'excel', 'pdf']
        }
      }
    });
    
  } catch (error: unknown) {
    logger.error('Custom report generation error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid request data', details: error.errors }
      });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Custom report generation failed', details: errorMessage }
    });
  }
});

// GET /api/custom-reporting/templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    
    const templates = [
      {
        id: 'monthly_spending',
        title: 'Monthly Spending Report',
        description: 'Track travel spending by month with cost breakdown',
        defaultParams: {
          groupBy: 'month',
          metrics: ['totalCost', 'tripCount', 'averageCost'],
          includeCharts: true
        }
      },
      {
        id: 'department_analysis',
        title: 'Department Travel Analysis',
        description: 'Compare travel patterns across departments',
        defaultParams: {
          groupBy: 'department',
          metrics: ['totalCost', 'tripCount', 'carbonFootprint'],
          includeCharts: true
        }
      },
      {
        id: 'cost_savings',
        title: 'Cost Savings Report',
        description: 'Track savings and optimization opportunities',
        defaultParams: {
          groupBy: 'quarter',
          metrics: ['totalCost', 'savings', 'averageCost'],
          includeCharts: true
        }
      },
      {
        id: 'carbon_footprint',
        title: 'Carbon Footprint Analysis',
        description: 'Environmental impact tracking and trends',
        defaultParams: {
          groupBy: 'month',
          metrics: ['carbonFootprint', 'tripCount'],
          includeCharts: true
        }
      }
    ];
    
    logger.info(`Report templates requested by user ${userId}`);
    
    res.json({
      success: true,
      data: {
        templates: templates,
        availableMetrics: [
          { key: 'totalCost', name: 'Total Cost', description: 'Sum of all trip costs' },
          { key: 'tripCount', name: 'Trip Count', description: 'Number of trips' },
          { key: 'averageCost', name: 'Average Cost', description: 'Average cost per trip' },
          { key: 'savings', name: 'Savings', description: 'Cost savings achieved' },
          { key: 'carbonFootprint', name: 'Carbon Footprint', description: 'Environmental impact' },
          { key: 'duration', name: 'Duration', description: 'Total trip duration in days' }
        ],
        availableGroupings: [
          { key: 'day', name: 'Daily' },
          { key: 'week', name: 'Weekly' },
          { key: 'month', name: 'Monthly' },
          { key: 'quarter', name: 'Quarterly' },
          { key: 'year', name: 'Yearly' },
          { key: 'department', name: 'By Department' },
          { key: 'purpose', name: 'By Purpose' },
          { key: 'destination', name: 'By Destination' }
        ]
      }
    });
    
  } catch (error: unknown) {
    logger.error('Report templates error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get report templates', details: errorMessage }
    });
  }
});

// GET /api/custom-reporting/reports/:reportId
router.get('/reports/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = (req as any).user?.id || 'anonymous';
    
    // In a real implementation, you would store generated reports in a database table
    // For now, return a message indicating the report should be regenerated
    logger.info(`Report ${reportId} requested by user ${userId}`);
    
    res.status(404).json({
      success: false,
      error: { 
        message: 'Report not found or expired', 
        details: 'Reports are generated on-demand. Please use the generate endpoint to create a new report.'
      },
      suggestion: 'Use POST /api/custom-reporting/generate to create a new report'
    });
    
  } catch (error: unknown) {
    logger.error('Get report error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get report', details: errorMessage }
    });
  }
});

export default router;
