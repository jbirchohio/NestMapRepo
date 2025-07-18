import { OpenAI } from 'openai';
import { z } from 'zod';
import { db } from '../db-connection.js';
import { trips, organizations, users } from '../db/schema.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schemas for AI optimization
const TripOptimizationRequestSchema = z.object({
  organizationId: z.string(),
  userId: z.string(),
  destinations: z.array(z.object({
    city: z.string(),
    country: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    flexibleDates: z.boolean().default(false),
    budgetConstraint: z.number().optional(),
  })),
  travelDates: z.object({
    startDate: z.string(),
    endDate: z.string(),
    flexibility: z.number().min(0).max(7).default(0), // days of flexibility
  }),
  preferences: z.object({
    budget: z.object({
      max: z.number(),
      priority: z.enum(['cost', 'time', 'comfort']),
    }),
    travelClass: z.enum(['economy', 'premium_economy', 'business', 'first']),
    directFlights: z.boolean().default(false),
    carbonFootprint: z.boolean().default(false),
  }),
  meetingSchedule: z.array(z.object({
    date: z.string(),
    time: z.string(),
    duration: z.number(), // minutes
    location: z.string(),
    attendees: z.number(),
  })).optional(),
});

const FlightPredictionSchema = z.object({
  route: z.string(),
  currentPrice: z.number(),
  predictedPrice: z.number(),
  confidence: z.number(),
  optimalBookingDate: z.string(),
  priceHistory: z.array(z.object({
    date: z.string(),
    price: z.number(),
  })),
  seasonalTrends: z.object({
    peak: z.array(z.string()),
    low: z.array(z.string()),
  }),
});

export class AITripOptimizer {
  /**
   * Predictive Travel Analytics - Flight price prediction with 90-day forecasting
   */
  async predictFlightPrices(route: string, travelDate: string): Promise<z.infer<typeof FlightPredictionSchema>> {
    try {
      // Get historical price data for the route
      const historicalData = await this.getHistoricalPriceData(route);
      
      // Use AI to analyze patterns and predict prices
      const prompt = `
        Analyze flight price data for route: ${route}
        Travel date: ${travelDate}
        Historical data: ${JSON.stringify(historicalData)}
        
        Provide a 90-day price forecast with:
        1. Current estimated price
        2. Predicted price for travel date
        3. Confidence level (0-1)
        4. Optimal booking date
        5. Seasonal trends analysis
        
        Return as JSON matching the schema.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert travel analyst specializing in flight price prediction and optimization.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      });

      const prediction = JSON.parse(response.choices[0].message.content || '{}');
      return FlightPredictionSchema.parse(prediction);
    } catch (error) {
      console.error('Flight price prediction error:', error);
      throw new Error('Failed to predict flight prices');
    }
  }

  /**
   * Intelligent Itinerary Optimization - Multi-traveler route optimization
   */
  async optimizeItinerary(request: z.infer<typeof TripOptimizationRequestSchema>) {
    try {
      const { organizationId, userId, destinations, travelDates, preferences, meetingSchedule } = request;

      // Get organization travel patterns and policies
      const orgData = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
      });

      // Get user travel history for personalization
      const userHistory = await db.query.trips.findMany({
        where: and(
          eq(trips.userId, userId),
          eq(trips.organizationId, organizationId)
        ),
        orderBy: desc(trips.createdAt),
        limit: 10,
      });

      // AI-powered optimization
      const optimizationPrompt = `
        Optimize travel itinerary for corporate traveler:
        
        Organization: ${orgData?.name}
        Destinations: ${JSON.stringify(destinations)}
        Travel Dates: ${JSON.stringify(travelDates)}
        Preferences: ${JSON.stringify(preferences)}
        Meeting Schedule: ${JSON.stringify(meetingSchedule)}
        User History: ${JSON.stringify(userHistory)}
        
        Provide optimized itinerary with:
        1. Route optimization for minimum cost/time
        2. Meeting schedule integration
        3. Buffer time recommendations
        4. Alternative options with cost-benefit analysis
        5. Risk assessment and mitigation strategies
        
        Consider:
        - Corporate travel policies
        - Budget constraints
        - Time efficiency
        - Meeting requirements
        - Traveler preferences
        
        Return detailed optimization plan as JSON.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert corporate travel optimizer specializing in cost-effective, time-efficient business travel planning.',
          },
          {
            role: 'user',
            content: optimizationPrompt,
          },
        ],
        temperature: 0.3,
      });

      const optimization = JSON.parse(response.choices[0].message.content || '{}');
      
      // Store optimization results for learning
      await this.storeOptimizationResults(organizationId, userId, request, optimization);
      
      return optimization;
    } catch (error) {
      console.error('Itinerary optimization error:', error);
      throw new Error('Failed to optimize itinerary');
    }
  }

  /**
   * Smart Budget Management - Dynamic budget allocation with ROI analysis
   */
  async analyzeBudgetOptimization(organizationId: string, timeframe: string = '90d') {
    try {
      // Get organization's travel spending data
      const spendingData = await this.getOrganizationSpendingData(organizationId, timeframe);
      
      // AI analysis for budget optimization
      const budgetPrompt = `
        Analyze corporate travel spending for budget optimization:
        
        Organization ID: ${organizationId}
        Timeframe: ${timeframe}
        Spending Data: ${JSON.stringify(spendingData)}
        
        Provide budget optimization analysis with:
        1. Spending pattern analysis
        2. Cost-saving opportunities
        3. ROI analysis for different travel categories
        4. Predictive budget allocation recommendations
        5. Variance alerts and thresholds
        6. Automated expense categorization suggestions
        
        Return comprehensive budget analysis as JSON.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a corporate travel finance expert specializing in budget optimization and ROI analysis.',
          },
          {
            role: 'user',
            content: budgetPrompt,
          },
        ],
        temperature: 0.3,
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Budget optimization error:', error);
      throw new Error('Failed to analyze budget optimization');
    }
  }

  /**
   * Proactive Travel Management - Weather and disruption mitigation
   */
  async getProactiveTravelAlerts(tripId: string) {
    try {
      const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
      });

      if (!trip) {
        throw new Error('Trip not found');
      }

      const alertsPrompt = `
        Generate proactive travel alerts for trip:
        
        Trip Details: ${JSON.stringify(trip)}
        Current Date: ${new Date().toISOString()}
        
        Analyze and provide alerts for:
        1. Weather conditions at destination
        2. Flight delay predictions
        3. Alternative accommodation suggestions
        4. Emergency travel support recommendations
        5. Meeting schedule impact assessment
        6. Real-time rebooking suggestions
        
        Return proactive alerts and recommendations as JSON.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a proactive travel management assistant specializing in risk mitigation and travel disruption prevention.',
          },
          {
            role: 'user',
            content: alertsPrompt,
          },
        ],
        temperature: 0.3,
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Proactive travel alerts error:', error);
      throw new Error('Failed to generate proactive travel alerts');
    }
  }

  // Helper methods
  private async getHistoricalPriceData(route: string) {
    // This would integrate with flight price APIs to get historical data
    // For now, return mock data structure
    return {
      route,
      priceHistory: [
        { date: '2024-01-01', price: 450 },
        { date: '2024-02-01', price: 420 },
        { date: '2024-03-01', price: 480 },
        // ... more historical data
      ],
      averagePrice: 450,
      seasonalTrends: {
        peak: ['December', 'July', 'August'],
        low: ['January', 'February', 'September'],
      },
    };
  }

  private async getOrganizationSpendingData(organizationId: string, timeframe: string) {
    const startDate = new Date();
    const days = parseInt(timeframe.replace('d', ''));
    startDate.setDate(startDate.getDate() - days);

    const spendingData = await db.query.trips.findMany({
      where: and(
        eq(trips.organizationId, organizationId),
        gte(trips.createdAt, startDate)
      ),
    });

    return {
      totalSpend: spendingData.reduce((sum, trip) => sum + (trip.budget || 0), 0),
      tripCount: spendingData.length,
      averagePerTrip: spendingData.length > 0 ? 
        spendingData.reduce((sum, trip) => sum + (trip.budget || 0), 0) / spendingData.length : 0,
      categories: this.categorizeSpending(spendingData),
      trends: this.analyzeTrends(spendingData),
    };
  }

  private categorizeSpending(trips: any[]) {
    // Categorize spending by type, destination, etc.
    return {
      flights: trips.filter(t => t.type === 'flight').reduce((sum, t) => sum + (t.budget || 0), 0),
      hotels: trips.filter(t => t.type === 'hotel').reduce((sum, t) => sum + (t.budget || 0), 0),
      ground: trips.filter(t => t.type === 'ground').reduce((sum, t) => sum + (t.budget || 0), 0),
      meals: trips.filter(t => t.type === 'meals').reduce((sum, t) => sum + (t.budget || 0), 0),
    };
  }

  private analyzeTrends(trips: any[]) {
    // Analyze spending trends over time
    return {
      monthlySpend: {}, // Monthly spending breakdown
      departmentSpend: {}, // Department-wise spending
      destinationSpend: {}, // Destination-wise spending
    };
  }

  private async storeOptimizationResults(organizationId: string, userId: string, request: any, optimization: any) {
    // Store optimization results for machine learning and improvement
    // This would go to a dedicated optimization results table
    console.log('Storing optimization results for learning:', {
      organizationId,
      userId,
      request,
      optimization,
    });
  }
}

export const aiTripOptimizer = new AITripOptimizer();
