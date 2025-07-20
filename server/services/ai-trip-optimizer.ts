import { OpenAI } from 'openai';
import { z } from 'zod';
import { db } from '../db-connection';
import { trips, organizations, users } from '../db/schema';
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
    try {
      // Parse route to get origin and destination
      const [origin, destination] = route.split('-').map(s => s.trim());
      
      if (!origin || !destination) {
        throw new Error('Invalid route format. Expected "ORIGIN-DESTINATION"');
      }

      // Real implementation would use flight pricing APIs like:
      // - Amadeus Flight Offers API
      // - Skyscanner API
      // - Google Flights API
      // - Expedia Rapid API
      
      const apiKey = process.env.AMADEUS_API_KEY || process.env.FLIGHT_API_KEY;
      
      if (!apiKey) {
        console.warn('No flight API key configured. Using calculated estimates.');
        return this.generatePriceEstimates(route, origin, destination);
      }

      // Example with Amadeus API (pseudo-code)
      // const amadeusData = await this.fetchAmadeusFlightPrices(origin, destination, apiKey);
      // return this.processAmadeusResponse(amadeusData);
      
      // For now, return calculated estimates based on route characteristics
      return this.generatePriceEstimates(route, origin, destination);
      
    } catch (error) {
      console.error('Error fetching historical price data:', error);
      return this.generatePriceEstimates(route, 'Unknown', 'Unknown');
    }
  }

  private generatePriceEstimates(route: string, origin: string, destination: string) {
    // Calculate estimated prices based on route characteristics
    const basePrice = this.calculateBasePrice(origin, destination);
    const monthlyVariations = this.calculateSeasonalVariations(basePrice);
    
    return {
      route,
      priceHistory: monthlyVariations.map((price, index) => ({
        date: new Date(2024, index, 1).toISOString().split('T')[0],
        price: Math.round(price)
      })),
      averagePrice: Math.round(basePrice),
      seasonalTrends: {
        peak: ['June', 'July', 'August', 'December'],
        low: ['January', 'February', 'September', 'October'],
      },
      factors: {
        distance: this.estimateDistance(origin, destination),
        popularity: this.estimateRoutePopularity(origin, destination),
        seasonality: 'Varies by month and holidays'
      }
    };
  }

  private calculateBasePrice(origin: string, destination: string): number {
    // Estimate base price based on common flight pricing factors
    const domesticBase = 250;
    const internationalBase = 600;
    const longHaulBase = 1200;
    
    // Simple heuristic based on common airport codes and cities
    const isInternational = this.isInternationalRoute(origin, destination);
    const isLongHaul = this.isLongHaulRoute(origin, destination);
    
    if (isLongHaul) return longHaulBase + Math.random() * 400;
    if (isInternational) return internationalBase + Math.random() * 300;
    return domesticBase + Math.random() * 200;
  }

  private calculateSeasonalVariations(basePrice: number): number[] {
    // 12 months of price variations
    const seasonalMultipliers = [
      0.85, // January - low season
      0.87, // February - low season  
      0.95, // March - shoulder
      1.00, // April - normal
      1.05, // May - shoulder
      1.20, // June - peak
      1.25, // July - peak
      1.23, // August - peak
      0.90, // September - low
      0.92, // October - low
      1.10, // November - shoulder
      1.30  // December - peak (holidays)
    ];
    
    return seasonalMultipliers.map(multiplier => basePrice * multiplier);
  }

  private isInternationalRoute(origin: string, destination: string): boolean {
    // Simple heuristic - would use real country/airport data in production
    const usAirports = ['LAX', 'JFK', 'ORD', 'DFW', 'ATL', 'SFO', 'LAS', 'SEA'];
    const usCities = ['Los Angeles', 'New York', 'Chicago', 'Dallas', 'Atlanta', 'San Francisco', 'Las Vegas', 'Seattle'];
    
    const originIsUS = usAirports.includes(origin) || usCities.includes(origin);
    const destIsUS = usAirports.includes(destination) || usCities.includes(destination);
    
    return originIsUS !== destIsUS; // Different countries
  }

  private isLongHaulRoute(origin: string, destination: string): boolean {
    // Simple heuristic for long-haul flights (> 6 hours)
    const longHaulKeywords = ['Asia', 'Europe', 'Australia', 'Tokyo', 'London', 'Paris', 'Sydney', 'Bangkok'];
    const routeString = `${origin} ${destination}`.toLowerCase();
    
    return longHaulKeywords.some(keyword => routeString.includes(keyword.toLowerCase()));
  }

  private estimateDistance(origin: string, destination: string): string {
    if (this.isLongHaulRoute(origin, destination)) return '5000+ miles';
    if (this.isInternationalRoute(origin, destination)) return '1500-5000 miles';
    return '200-1500 miles';
  }

  private estimateRoutePopularity(origin: string, destination: string): string {
    const popularCities = ['New York', 'Los Angeles', 'London', 'Paris', 'Tokyo', 'Sydney'];
    const routeString = `${origin} ${destination}`;
    
    const popularityScore = popularCities.filter(city => 
      routeString.includes(city)
    ).length;
    
    if (popularityScore >= 2) return 'High';
    if (popularityScore === 1) return 'Medium';
    return 'Low';
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
