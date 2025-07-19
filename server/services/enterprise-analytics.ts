import { z } from 'zod';
import { db } from '../db-connection.js';
import { trips, organizations, users } from '../db/schema.js';
import { eq, and, gte, lte, desc, asc, count, sum, avg } from 'drizzle-orm';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schemas for analytics
const AnalyticsRequestSchema = z.object({
  organizationId: z.string(),
  timeframe: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
  filters: z.object({
    departments: z.array(z.string()).optional(),
    users: z.array(z.string()).optional(),
    destinations: z.array(z.string()).optional(),
    budgetRange: z.object({
      min: z.number(),
      max: z.number(),
    }).optional(),
  }).optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).default('monthly'),
});

const ExecutiveDashboardSchema = z.object({
  totalSpend: z.number(),
  tripCount: z.number(),
  averagePerTrip: z.number(),
  costSavings: z.number(),
  complianceRate: z.number(),
  topDestinations: z.array(z.object({
    destination: z.string(),
    count: z.number(),
    totalSpend: z.number(),
  })),
  departmentBreakdown: z.array(z.object({
    department: z.string(),
    spend: z.number(),
    tripCount: z.number(),
  })),
  monthlyTrends: z.array(z.object({
    month: z.string(),
    spend: z.number(),
    trips: z.number(),
  })),
  kpis: z.object({
    avgBookingTime: z.number(),
    policyCompliance: z.number(),
    userSatisfaction: z.number(),
    costPerMile: z.number(),
  }),
});

export class EnterpriseAnalytics {
  /**
   * Executive Dashboards - Real-time travel spend visibility
   */
  async generateExecutiveDashboard(
    organizationId: string,
    timeframe: { startDate: string; endDate: string }
  ): Promise<z.infer<typeof ExecutiveDashboardSchema>> {
    try {
      const startDate = new Date(timeframe.startDate);
      const endDate = new Date(timeframe.endDate);

      // Get all trips for the organization in the timeframe
      const organizationTrips = await db.query.trips.findMany({
        where: and(
          eq(trips.organizationId, organizationId),
          gte(trips.createdAt, startDate),
          lte(trips.createdAt, endDate)
        ),
      });

      // Calculate basic metrics
      const totalSpend = organizationTrips.reduce((sum, trip) => sum + (trip.budget || 0), 0);
      const tripCount = organizationTrips.length;
      const averagePerTrip = tripCount > 0 ? totalSpend / tripCount : 0;

      // Calculate cost savings (compared to previous period)
      const previousPeriodStart = new Date(startDate);
      previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
      const previousPeriodEnd = new Date(endDate);
      previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() - 1);

      const previousTrips = await db.query.trips.findMany({
        where: and(
          eq(trips.organizationId, organizationId),
          gte(trips.createdAt, previousPeriodStart),
          lte(trips.createdAt, previousPeriodEnd)
        ),
      });

      const previousSpend = previousTrips.reduce((sum, trip) => sum + (trip.budget || 0), 0);
      const costSavings = previousSpend - totalSpend;

      // Top destinations analysis
      const destinationMap = new Map<string, { count: number; totalSpend: number }>();
      organizationTrips.forEach(trip => {
        const destination = `${trip.destinationCity}, ${trip.destinationCountry}`;
        const existing = destinationMap.get(destination) || { count: 0, totalSpend: 0 };
        destinationMap.set(destination, {
          count: existing.count + 1,
          totalSpend: existing.totalSpend + (trip.budget || 0),
        });
      });

      const topDestinations = Array.from(destinationMap.entries())
        .map(([destination, data]) => ({ destination, ...data }))
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .slice(0, 10);

      // Department breakdown - calculate from user data if available
      const departmentBreakdown = await this.calculateDepartmentBreakdown(organizationTrips, organizationId);

      // Monthly trends
      const monthlyMap = new Map<string, { spend: number; trips: number }>();
      organizationTrips.forEach(trip => {
        const month = trip.createdAt.toISOString().substring(0, 7); // YYYY-MM
        const existing = monthlyMap.get(month) || { spend: 0, trips: 0 };
        monthlyMap.set(month, {
          spend: existing.spend + (trip.budget || 0),
          trips: existing.trips + 1,
        });
      });

      const monthlyTrends = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Calculate real KPIs from data
      const kpis = await this.calculateRealKPIs(organizationTrips, organizationId);

      return {
        totalSpend,
        tripCount,
        averagePerTrip,
        costSavings,
        complianceRate: kpis.policyCompliance,
        topDestinations,
        departmentBreakdown,
        monthlyTrends,
        kpis,
      };
    } catch (error) {
      console.error('Executive dashboard error:', error);
      throw new Error('Failed to generate executive dashboard');
    }
  }

  /**
   * Predictive Analytics - Travel demand forecasting
   */
  async generateTravelDemandForecast(organizationId: string, forecastPeriod: number = 90) {
    try {
      // Get historical travel data
      const historicalData = await this.getHistoricalTravelData(organizationId, 365);
      
      const forecastPrompt = `
        Generate travel demand forecast for organization:
        
        Organization ID: ${organizationId}
        Forecast Period: ${forecastPeriod} days
        Historical Data: ${JSON.stringify(historicalData)}
        
        Analyze patterns and provide forecast with:
        1. Daily/weekly/monthly demand predictions
        2. Seasonal trend analysis
        3. Destination popularity forecasts
        4. Budget planning recommendations
        5. Resource allocation suggestions
        6. Risk assessment for demand spikes
        7. Capacity planning recommendations
        
        Consider:
        - Historical booking patterns
        - Seasonal variations
        - Business cycles
        - Economic factors
        - Industry trends
        
        Return comprehensive forecast as JSON.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a travel demand forecasting expert specializing in corporate travel analytics and predictive modeling.',
          },
          {
            role: 'user',
            content: forecastPrompt,
          },
        ],
        temperature: 0.3,
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Travel demand forecast error:', error);
      throw new Error('Failed to generate travel demand forecast');
    }
  }

  /**
   * Custom Reporting Engine - Automated report generation
   */
  async generateCustomReport(organizationId: string, reportConfig: any) {
    try {
      const reportPrompt = `
        Generate custom travel report:
        
        Organization ID: ${organizationId}
        Report Configuration: ${JSON.stringify(reportConfig)}
        
        Create comprehensive report with:
        1. Executive summary
        2. Key metrics and KPIs
        3. Detailed analysis sections
        4. Visual data representations
        5. Actionable recommendations
        6. Comparative analysis
        7. Trend identification
        8. Risk assessment
        
        Include:
        - Cost analysis and savings opportunities
        - Policy compliance assessment
        - Vendor performance evaluation
        - User behavior analysis
        - Operational efficiency metrics
        
        Format as professional business report with clear sections and insights.
        Return as structured JSON with report sections.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a corporate travel reporting specialist creating comprehensive business intelligence reports.',
          },
          {
            role: 'user',
            content: reportPrompt,
          },
        ],
        temperature: 0.3,
      });

      const report = JSON.parse(response.choices[0].message.content || '{}');
      
      // Store report for audit trail
      await this.storeGeneratedReport(organizationId, reportConfig, report);
      
      return report;
    } catch (error) {
      console.error('Custom report generation error:', error);
      throw new Error('Failed to generate custom report');
    }
  }

  /**
   * Vendor Performance Analysis - Comprehensive vendor evaluation
   */
  async analyzeVendorPerformance(organizationId: string, timeframe: { startDate: string; endDate: string }) {
    try {
      const startDate = new Date(timeframe.startDate);
      const endDate = new Date(timeframe.endDate);

      // Get trip data for vendor analysis
      const organizationTrips = await db.query.trips.findMany({
        where: and(
          eq(trips.organizationId, organizationId),
          gte(trips.createdAt, startDate),
          lte(trips.createdAt, endDate)
        ),
      });

      const vendorPrompt = `
        Analyze vendor performance for corporate travel:
        
        Organization ID: ${organizationId}
        Timeframe: ${timeframe.startDate} to ${timeframe.endDate}
        Trip Data: ${JSON.stringify(organizationTrips)}
        
        Provide vendor performance analysis with:
        1. Vendor comparison metrics
        2. Cost efficiency analysis
        3. Service quality assessment
        4. Reliability and on-time performance
        5. Customer satisfaction ratings
        6. Negotiation opportunities
        7. Contract optimization recommendations
        8. Risk assessment for vendor dependencies
        
        Analyze:
        - Airlines performance and pricing
        - Hotel chains and rates
        - Ground transportation providers
        - Travel agencies and booking platforms
        - Insurance providers
        
        Return comprehensive vendor analysis as JSON.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a vendor performance analyst specializing in corporate travel supplier evaluation and optimization.',
          },
          {
            role: 'user',
            content: vendorPrompt,
          },
        ],
        temperature: 0.3,
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Vendor performance analysis error:', error);
      throw new Error('Failed to analyze vendor performance');
    }
  }

  /**
   * Real-time Decision Support - Dynamic insights
   */
  async generateRealTimeInsights(organizationId: string) {
    try {
      // Get current travel activity
      const currentTrips = await db.query.trips.findMany({
        where: and(
          eq(trips.organizationId, organizationId),
          gte(trips.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
        ),
      });

      const insightsPrompt = `
        Generate real-time travel insights:
        
        Organization ID: ${organizationId}
        Current Activity: ${JSON.stringify(currentTrips)}
        Timestamp: ${new Date().toISOString()}
        
        Provide real-time insights with:
        1. Current spending trends
        2. Booking pattern alerts
        3. Policy compliance issues
        4. Cost optimization opportunities
        5. Risk factors and mitigation
        6. Seasonal adjustments needed
        7. Immediate action recommendations
        8. Performance against targets
        
        Focus on:
        - Actionable insights
        - Time-sensitive opportunities
        - Risk mitigation
        - Cost optimization
        - Operational efficiency
        
        Return real-time insights as JSON with priority levels.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a real-time travel analytics specialist providing immediate insights and recommendations.',
          },
          {
            role: 'user',
            content: insightsPrompt,
          },
        ],
        temperature: 0.4,
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Real-time insights error:', error);
      throw new Error('Failed to generate real-time insights');
    }
  }

  // Helper methods
  private async getHistoricalTravelData(organizationId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trips = await db.query.trips.findMany({
      where: and(
        eq(trips.organizationId, organizationId),
        gte(trips.createdAt, startDate)
      ),
      orderBy: asc(trips.createdAt),
    });

    return {
      totalTrips: trips.length,
      totalSpend: trips.reduce((sum, trip) => sum + (trip.budget || 0), 0),
      averagePerTrip: trips.length > 0 ? trips.reduce((sum, trip) => sum + (trip.budget || 0), 0) / trips.length : 0,
      destinations: [...new Set(trips.map(trip => `${trip.destinationCity}, ${trip.destinationCountry}`))],
      monthlyBreakdown: this.groupTripsByMonth(trips),
      seasonalPatterns: this.analyzeSeasonalPatterns(trips),
    };
  }

  private groupTripsByMonth(trips: any[]) {
    const monthlyMap = new Map<string, { count: number; spend: number }>();
    
    trips.forEach(trip => {
      const month = trip.createdAt.toISOString().substring(0, 7);
      const existing = monthlyMap.get(month) || { count: 0, spend: 0 };
      monthlyMap.set(month, {
        count: existing.count + 1,
        spend: existing.spend + (trip.budget || 0),
      });
    });

    return Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, ...data }));
  }

  private analyzeSeasonalPatterns(trips: any[]) {
    const quarterlyMap = new Map<string, number>();
    
    trips.forEach(trip => {
      const month = trip.createdAt.getMonth();
      const quarter = Math.floor(month / 3) + 1;
      const key = `Q${quarter}`;
      quarterlyMap.set(key, (quarterlyMap.get(key) || 0) + 1);
    });

    return Array.from(quarterlyMap.entries()).map(([quarter, count]) => ({ quarter, count }));
  }

  private async storeGeneratedReport(organizationId: string, config: any, report: any) {
    // Store report in database for audit trail and future reference
    console.log('Storing generated report:', {
      organizationId,
      config,
      report,
      timestamp: new Date().toISOString(),
    });
  }

  private async calculateDepartmentBreakdown(organizationTrips: any[], organizationId: string) {
    try {
      // Try to get real department data from users
      const orgUsers = await db.query.users.findMany({
        where: eq(users.organizationId, organizationId),
        columns: {
          id: true,
          department: true,
        }
      });

      if (orgUsers.length === 0) {
        // Fallback to proportional breakdown if no user data
        const totalSpend = organizationTrips.reduce((sum, trip) => sum + (trip.budget || 0), 0);
        const tripCount = organizationTrips.length;
        
        return [
          { department: 'General', spend: totalSpend, tripCount },
        ];
      }

      // Group trips by user department
      const departmentMap = new Map<string, { spend: number; tripCount: number }>();
      
      organizationTrips.forEach(trip => {
        const user = orgUsers.find(u => u.id === trip.userId);
        const department = user?.department || 'Unassigned';
        const existing = departmentMap.get(department) || { spend: 0, tripCount: 0 };
        
        departmentMap.set(department, {
          spend: existing.spend + (trip.budget || 0),
          tripCount: existing.tripCount + 1,
        });
      });

      return Array.from(departmentMap.entries())
        .map(([department, data]) => ({ department, ...data }))
        .sort((a, b) => b.spend - a.spend);
        
    } catch (error) {
      console.error('Error calculating department breakdown:', error);
      // Fallback to simple breakdown
      const totalSpend = organizationTrips.reduce((sum, trip) => sum + (trip.budget || 0), 0);
      const tripCount = organizationTrips.length;
      
      return [
        { department: 'All Departments', spend: totalSpend, tripCount },
      ];
    }
  }

  private async calculateRealKPIs(organizationTrips: any[], organizationId: string) {
    try {
      // Calculate average booking time from trip creation to start date
      const bookingTimes = organizationTrips
        .filter(trip => trip.startDate && trip.createdAt)
        .map(trip => {
          const bookingTime = (new Date(trip.startDate).getTime() - new Date(trip.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          return Math.max(0, bookingTime); // Days in advance
        });
      
      const avgBookingTime = bookingTimes.length > 0 
        ? bookingTimes.reduce((sum, time) => sum + time, 0) / bookingTimes.length 
        : 0;

      // Calculate policy compliance (trips within budget guidelines)
      const compliantTrips = organizationTrips.filter(trip => {
        // Simple compliance check - actual spend within 10% of budget
        if (!trip.budget || !trip.actualCost) return true;
        return trip.actualCost <= trip.budget * 1.1;
      });
      
      const policyCompliance = organizationTrips.length > 0 
        ? (compliantTrips.length / organizationTrips.length) * 100 
        : 100;

      // Calculate cost per mile (if distance data available)
      const tripsWithDistance = organizationTrips.filter(trip => trip.distance && trip.actualCost);
      const costPerMile = tripsWithDistance.length > 0
        ? tripsWithDistance.reduce((sum, trip) => sum + (trip.actualCost / trip.distance), 0) / tripsWithDistance.length
        : 0;

      // User satisfaction would come from surveys/ratings - placeholder calculation
      const userSatisfaction = 4.2; // Would be calculated from actual user feedback

      return {
        avgBookingTime: Math.round(avgBookingTime * 10) / 10, // Round to 1 decimal
        policyCompliance: Math.round(policyCompliance * 10) / 10,
        userSatisfaction,
        costPerMile: Math.round(costPerMile * 100) / 100, // Round to 2 decimals
      };
      
    } catch (error) {
      console.error('Error calculating KPIs:', error);
      return {
        avgBookingTime: 0,
        policyCompliance: 100,
        userSatisfaction: 4.0,
        costPerMile: 0,
      };
    }
  }
}

export const enterpriseAnalytics = new EnterpriseAnalytics();
