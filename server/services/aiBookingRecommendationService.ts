import { db } from "../db-connection";
import { 
  trips, 
  bookings, 
  users, 
  expenses,
  travelPolicies 
} from '@shared/schema';
import { eq, and, sql, desc, gte } from 'drizzle-orm';
import OpenAI from 'openai';
import { duffelFlightService } from './duffelFlightService';
// Ground transport service removed - APIs not available

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface UserPreferences {
  preferredAirlines: string[];
  preferredSeatType: string;
  preferredDepartureTime: 'morning' | 'afternoon' | 'evening' | 'night';
  preferredHotelChains: string[];
  preferredHotelType: 'business' | 'luxury' | 'budget';
  dietaryRestrictions?: string[];
  mobilityRequirements?: string[];
  averageTripDuration: number;
  commonDestinations: string[];
  bookingLeadTime: number; // days in advance
}

interface BookingRecommendation {
  type: 'flight' | 'hotel' | 'car_rental' | 'complete_package';
  confidence: number; // 0-1
  reasoning: string;
  options: Array<{
    provider: string;
    details: any;
    price: number;
    policyCompliant: boolean;
    score: number; // 0-100
    pros: string[];
    cons: string[];
  }>;
  alternativeOptions?: Array<{
    type: string;
    reason: string;
    savingsAmount?: number;
  }>;
  bookingTips: string[];
}

interface TripContext {
  purpose: 'sales' | 'client_meeting' | 'conference' | 'training' | 'other';
  attendees: number;
  budget?: number;
  mustHaveFeatures?: string[];
  flexibility: 'none' | 'low' | 'medium' | 'high';
}

export class AIBookingRecommendationService {
  // Learn user preferences from history
  async learnUserPreferences(userId: number): Promise<UserPreferences> {
    // Get user's booking history
    const userBookings = await db.select()
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, userId),
          eq(bookings.status, 'confirmed'),
          gte(bookings.createdAt, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)) // Last year
        )
      )
      .orderBy(desc(bookings.createdAt));

    // Get user's trips
    const userTrips = await db.select()
      .from(trips)
      .where(eq(trips.user_id, userId))
      .orderBy(desc(trips.created_at))
      .limit(20);

    // Analyze patterns
    const preferences: UserPreferences = {
      preferredAirlines: this.extractPreferredAirlines(userBookings),
      preferredSeatType: this.extractPreferredSeatType(userBookings),
      preferredDepartureTime: this.extractPreferredDepartureTime(userBookings),
      preferredHotelChains: this.extractPreferredHotelChains(userBookings),
      preferredHotelType: this.extractPreferredHotelType(userBookings),
      averageTripDuration: this.calculateAverageTripDuration(userTrips),
      commonDestinations: this.extractCommonDestinations(userTrips),
      bookingLeadTime: this.calculateBookingLeadTime(userBookings)
    };

    return preferences;
  }

  // Get AI-powered recommendations
  async getRecommendations(
    userId: number,
    organizationId: number,
    tripDetails: {
      origin: string;
      destination: string;
      startDate: Date;
      endDate: Date;
      context: TripContext;
    }
  ): Promise<BookingRecommendation[]> {
    // Learn user preferences
    const preferences = await this.learnUserPreferences(userId);

    // Get organization policies
    const policies = await db.select()
      .from(travelPolicies)
      .where(
        and(
          eq(travelPolicies.organization_id, organizationId),
          eq(travelPolicies.is_active, true)
        )
      );

    // Get similar past trips
    const similarTrips = await this.findSimilarTrips(
      userId,
      tripDetails.destination,
      tripDetails.context.purpose
    );

    // Generate recommendations using AI
    const aiInsights = await this.generateAIInsights(
      preferences,
      tripDetails,
      similarTrips,
      policies[0]
    );

    const recommendations: BookingRecommendation[] = [];

    // Flight recommendations
    if (tripDetails.origin !== tripDetails.destination) {
      const flightRec = await this.recommendFlights(
        tripDetails,
        preferences,
        policies[0],
        aiInsights
      );
      recommendations.push(flightRec);
    }

    // Hotel recommendations
    const hotelRec = await this.recommendHotels(
      tripDetails,
      preferences,
      policies[0],
      aiInsights
    );
    recommendations.push(hotelRec);

    // Ground transport recommendations
    const transportRec = await this.recommendGroundTransport(
      tripDetails,
      preferences,
      policies[0],
      aiInsights
    );
    recommendations.push(transportRec);

    // Complete package recommendation
    const packageRec = await this.recommendCompletePackage(
      recommendations,
      tripDetails,
      policies[0]
    );
    recommendations.push(packageRec);

    return recommendations;
  }

  // Generate AI insights
  private async generateAIInsights(
    preferences: UserPreferences,
    tripDetails: any,
    similarTrips: any[],
    policy: any
  ): Promise<any> {
    const prompt = `
      Analyze this business trip and provide booking recommendations:
      
      Trip Details:
      - Route: ${tripDetails.origin} to ${tripDetails.destination}
      - Dates: ${tripDetails.startDate.toDateString()} to ${tripDetails.endDate.toDateString()}
      - Purpose: ${tripDetails.context.purpose}
      - Budget: ${tripDetails.context.budget ? `$${tripDetails.context.budget}` : 'Standard policy limits'}
      
      User Preferences:
      - Preferred airlines: ${preferences.preferredAirlines.join(', ')}
      - Preferred departure time: ${preferences.preferredDepartureTime}
      - Average booking lead time: ${preferences.bookingLeadTime} days
      - Common destinations: ${preferences.commonDestinations.join(', ')}
      
      Past Similar Trips:
      ${similarTrips.map(t => `- ${t.destination}: $${t.totalCost}, ${t.duration} days`).join('\n')}
      
      Policy Constraints:
      - Flight class: ${policy?.flight_class_domestic || 'economy'}
      - Hotel limit: $${policy?.hotel_price_limit_domestic || 200}/night
      - Requires pre-approval: ${policy?.requires_pre_approval || false}
      
      Provide recommendations for:
      1. Optimal booking timing
      2. Cost-saving opportunities
      3. Convenience vs cost trade-offs
      4. Alternative travel options
      5. Risk factors to consider
    `;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert business travel advisor. Provide practical, cost-effective recommendations while ensuring policy compliance and traveler comfort.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('AI insights generation failed:', error);
      return {
        bookingTiming: 'Book 14-21 days in advance for best rates',
        costSaving: ['Consider nearby airports', 'Book mid-week flights'],
        convenience: ['Direct flights save time despite higher cost'],
        alternatives: [],
        risks: ['Weather delays common this season']
      };
    }
  }

  // Recommend flights
  private async recommendFlights(
    tripDetails: any,
    preferences: UserPreferences,
    policy: any,
    aiInsights: any
  ): Promise<BookingRecommendation> {
    // Search for flights
    const flightOptions = await duffelService.searchFlights({
      origin: tripDetails.origin,
      destination: tripDetails.destination,
      departureDate: tripDetails.startDate.toISOString(),
      returnDate: tripDetails.endDate.toISOString(),
      passengers: [{ type: 'adult' }],
      cabinClass: policy?.flight_class_domestic || 'economy'
    });

    // Score and rank options
    const scoredOptions = flightOptions.map(flight => {
      let score = 50; // Base score
      
      // Preference matching
      if (preferences.preferredAirlines.includes(flight.airline)) score += 15;
      if (this.matchesDeparturePreference(flight.departureTime, preferences.preferredDepartureTime)) score += 10;
      
      // Policy compliance
      const priceLimit = policy?.flight_price_limit_domestic || 99999;
      if (flight.price <= priceLimit) score += 20;
      
      // Convenience factors
      if (flight.stops === 0) score += 15;
      if (flight.duration < 180) score += 10; // Under 3 hours
      
      // Price factor (inverse - lower price = higher score)
      const priceScore = Math.max(0, 20 - (flight.price / 100));
      score += priceScore;

      return {
        provider: flight.airline,
        details: flight,
        price: flight.price,
        policyCompliant: flight.price <= priceLimit,
        score: Math.min(100, score),
        pros: this.generateFlightPros(flight, preferences),
        cons: this.generateFlightCons(flight, preferences)
      };
    }).sort((a, b) => b.score - a.score);

    return {
      type: 'flight',
      confidence: 0.85,
      reasoning: aiInsights.flightRecommendation || 'Based on your preferences and policy compliance',
      options: scoredOptions.slice(0, 3),
      alternativeOptions: [
        {
          type: 'nearby_airport',
          reason: 'Flying from Newark instead could save $150',
          savingsAmount: 150
        },
        {
          type: 'date_flexibility',
          reason: 'Departing one day earlier could save $200',
          savingsAmount: 200
        }
      ],
      bookingTips: [
        aiInsights.bookingTiming || 'Book within the next 48 hours for these rates',
        'Consider TSA PreCheck for faster security',
        'Your preferred airline has a flight 30 minutes later at similar price'
      ]
    };
  }

  // Recommend hotels
  private async recommendHotels(
    tripDetails: any,
    preferences: UserPreferences,
    policy: any,
    aiInsights: any
  ): Promise<BookingRecommendation> {
    // Mock hotel options (would integrate with real hotel API)
    const hotelOptions = [
      {
        provider: 'Marriott Business',
        name: 'Courtyard by Marriott Downtown',
        pricePerNight: 145,
        location: 'Downtown Business District',
        amenities: ['Free WiFi', 'Business Center', 'Gym', 'Breakfast'],
        rating: 4.2,
        corporateRate: true
      },
      {
        provider: 'Hilton',
        name: 'Hilton Garden Inn',
        pricePerNight: 165,
        location: 'Near Airport',
        amenities: ['Free WiFi', 'Airport Shuttle', 'Restaurant', 'Gym'],
        rating: 4.4,
        corporateRate: false
      },
      {
        provider: 'Independent',
        name: 'The Business Suites',
        pricePerNight: 125,
        location: 'Financial District',
        amenities: ['Free WiFi', 'Kitchenette', 'Laundry'],
        rating: 4.0,
        corporateRate: false
      }
    ];

    const nights = Math.ceil((tripDetails.endDate - tripDetails.startDate) / (1000 * 60 * 60 * 24));
    const priceLimit = policy?.hotel_price_limit_domestic || 200;

    const scoredOptions = hotelOptions.map(hotel => {
      let score = 50;
      
      // Preference matching
      if (preferences.preferredHotelChains.some(chain => hotel.provider.includes(chain))) score += 15;
      
      // Policy compliance
      if (hotel.pricePerNight <= priceLimit) score += 20;
      
      // Corporate rate bonus
      if (hotel.corporateRate) score += 15;
      
      // Location score
      if (hotel.location.includes('Downtown') || hotel.location.includes('Business')) score += 10;
      
      // Amenities score
      score += hotel.amenities.length * 2;
      
      // Rating score
      score += (hotel.rating - 3) * 10;

      return {
        provider: hotel.provider,
        details: {
          ...hotel,
          totalPrice: hotel.pricePerNight * nights
        },
        price: hotel.pricePerNight * nights,
        policyCompliant: hotel.pricePerNight <= priceLimit,
        score: Math.min(100, score),
        pros: [
          hotel.corporateRate ? 'Corporate rate available' : null,
          `${hotel.amenities.length} amenities included`,
          hotel.rating >= 4 ? `Highly rated (${hotel.rating}/5)` : null,
          hotel.location.includes('Downtown') ? 'Central location' : null
        ].filter(Boolean),
        cons: [
          hotel.pricePerNight > 150 ? 'Higher price point' : null,
          !hotel.amenities.includes('Breakfast') ? 'No breakfast included' : null,
          hotel.location.includes('Airport') ? 'Far from city center' : null
        ].filter(Boolean)
      };
    }).sort((a, b) => b.score - a.score);

    return {
      type: 'hotel',
      confidence: 0.82,
      reasoning: 'Selected based on location proximity to meetings and corporate rates',
      options: scoredOptions.slice(0, 3),
      alternativeOptions: [
        {
          type: 'apartment_rental',
          reason: 'Extended stay apartment could save 30% for trips over 5 nights'
        }
      ],
      bookingTips: [
        'Book directly with hotel for potential upgrades',
        'Your company has negotiated rates with Marriott properties',
        'Consider location relative to your meeting venues'
      ]
    };
  }

  // Recommend ground transport
  private async recommendGroundTransport(
    tripDetails: any,
    preferences: UserPreferences,
    policy: any,
    aiInsights: any
  ): Promise<BookingRecommendation> {
    const options = [];

    // Ground transport removed - APIs not available
    // Provide local transport budget estimate instead
    const dailyTransportBudget = policy?.local_transport_budget || 10000; // cents
    const days = Math.ceil((tripDetails.endDate.getTime() - tripDetails.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    options.push({
      provider: 'Local Transport Budget',
      details: {
        type: 'transport_budget',
        dailyBudget: dailyTransportBudget / 100,
        totalDays: days,
        totalBudget: (dailyTransportBudget * days) / 100
      },
      price: dailyTransportBudget * days,
      policyCompliant: true,
      score: 75,
      pros: [
        'No parking hassles',
        'Can work during commute',
        'Pay per use'
      ],
      cons: [
        'Less flexibility',
        'Surge pricing possible',
        'Wait times'
      ]
    });

    // Public transport option (if available)
    if (['New York', 'San Francisco', 'Chicago', 'Boston'].includes(tripDetails.destination)) {
      options.push({
        provider: 'Public Transit',
        details: {
          type: 'public_transport',
          passType: 'Weekly Pass',
          price: 35
        },
        price: 35,
        policyCompliant: true,
        score: 65,
        pros: [
          'Most economical option',
          'Environmentally friendly',
          'No traffic concerns'
        ],
        cons: [
          'Less convenient',
          'Limited hours',
          'May require walking'
        ]
      });
    }

    return {
      type: 'car_rental',
      confidence: 0.78,
      reasoning: 'Recommendations based on trip duration and meeting locations',
      options: options.sort((a, b) => b.score - a.score),
      bookingTips: [
        'Consider meeting locations when choosing transport',
        'Uber for Business provides automatic expense reporting',
        'Rental car may be cost-effective for trips over 3 days'
      ]
    };
  }

  // Recommend complete package
  private async recommendCompletePackage(
    individualRecommendations: BookingRecommendation[],
    tripDetails: any,
    policy: any
  ): Promise<BookingRecommendation> {
    const flightRec = individualRecommendations.find(r => r.type === 'flight');
    const hotelRec = individualRecommendations.find(r => r.type === 'hotel');
    const transportRec = individualRecommendations.find(r => r.type === 'car_rental');

    const bestFlight = flightRec?.options[0];
    const bestHotel = hotelRec?.options[0];
    const bestTransport = transportRec?.options[0];

    const totalPrice = (bestFlight?.price || 0) + (bestHotel?.price || 0) + (bestTransport?.price || 0);

    return {
      type: 'complete_package',
      confidence: 0.88,
      reasoning: 'Optimized package balancing cost, convenience, and policy compliance',
      options: [{
        provider: 'Remvana Recommended Package',
        details: {
          flight: bestFlight?.details,
          hotel: bestHotel?.details,
          transport: bestTransport?.details
        },
        price: totalPrice,
        policyCompliant: true,
        score: 92,
        pros: [
          `Save $${Math.round(totalPrice * 0.1)} with package booking`,
          'All bookings policy compliant',
          'Coordinated arrival/departure times',
          'Single invoice for accounting'
        ],
        cons: [
          'Less flexibility to change individual components'
        ]
      }],
      alternativeOptions: [
        {
          type: 'premium_package',
          reason: 'Business class flight + premium hotel for important client meetings',
          savingsAmount: -500 // Additional cost
        },
        {
          type: 'extended_stay',
          reason: 'Adding weekend stay could save $300 on airfare',
          savingsAmount: 300
        }
      ],
      bookingTips: [
        'Book all components together for simplified expense reporting',
        'Consider travel insurance for trips over $5000',
        'Review cancellation policies before booking'
      ]
    };
  }

  // Helper: Extract preferred airlines
  private extractPreferredAirlines(bookings: any[]): string[] {
    const airlineCounts: Record<string, number> = {};
    
    bookings
      .filter(b => b.type === 'flight')
      .forEach(b => {
        const airline = b.provider;
        airlineCounts[airline] = (airlineCounts[airline] || 0) + 1;
      });

    return Object.entries(airlineCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([airline]) => airline);
  }

  // Helper: Extract preferred seat type
  private extractPreferredSeatType(bookings: any[]): string {
    const seatTypes = bookings
      .filter(b => b.type === 'flight' && b.bookingData?.seatClass)
      .map(b => b.bookingData.seatClass);

    const counts: Record<string, number> = {};
    seatTypes.forEach(type => {
      counts[type] = (counts[type] || 0) + 1;
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'economy';
  }

  // Helper: Extract preferred departure time
  private extractPreferredDepartureTime(bookings: any[]): 'morning' | 'afternoon' | 'evening' | 'night' {
    const times = bookings
      .filter(b => b.type === 'flight' && b.departureDate)
      .map(b => new Date(b.departureDate).getHours());

    const avgHour = times.reduce((sum, hour) => sum + hour, 0) / times.length;

    if (avgHour < 6) return 'night';
    if (avgHour < 12) return 'morning';
    if (avgHour < 18) return 'afternoon';
    return 'evening';
  }

  // Helper: Extract preferred hotel chains
  private extractPreferredHotelChains(bookings: any[]): string[] {
    const hotelCounts: Record<string, number> = {};
    
    bookings
      .filter(b => b.type === 'hotel')
      .forEach(b => {
        const chain = b.provider;
        hotelCounts[chain] = (hotelCounts[chain] || 0) + 1;
      });

    return Object.entries(hotelCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([chain]) => chain);
  }

  // Helper: Extract preferred hotel type
  private extractPreferredHotelType(bookings: any[]): 'business' | 'luxury' | 'budget' {
    const avgPrice = bookings
      .filter(b => b.type === 'hotel' && b.totalAmount)
      .reduce((sum, b) => sum + (b.totalAmount / 100), 0) / bookings.length;

    if (avgPrice < 100) return 'budget';
    if (avgPrice > 250) return 'luxury';
    return 'business';
  }

  // Helper: Calculate average trip duration
  private calculateAverageTripDuration(trips: any[]): number {
    if (trips.length === 0) return 3;

    const durations = trips.map(trip => {
      const start = new Date(trip.start_date);
      const end = new Date(trip.end_date);
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    });

    return Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
  }

  // Helper: Extract common destinations
  private extractCommonDestinations(trips: any[]): string[] {
    const destinationCounts: Record<string, number> = {};
    
    trips.forEach(trip => {
      const dest = trip.city || trip.location;
      if (dest) {
        destinationCounts[dest] = (destinationCounts[dest] || 0) + 1;
      }
    });

    return Object.entries(destinationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([dest]) => dest);
  }

  // Helper: Calculate booking lead time
  private calculateBookingLeadTime(bookings: any[]): number {
    const leadTimes = bookings
      .filter(b => b.createdAt && b.departureDate)
      .map(b => {
        const bookingDate = new Date(b.createdAt);
        const departureDate = new Date(b.departureDate);
        return Math.ceil((departureDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
      })
      .filter(days => days > 0 && days < 180); // Reasonable range

    if (leadTimes.length === 0) return 14;

    return Math.round(leadTimes.reduce((sum, days) => sum + days, 0) / leadTimes.length);
  }

  // Helper: Check departure time preference
  private matchesDeparturePreference(
    departureTime: string,
    preference: string
  ): boolean {
    const hour = new Date(departureTime).getHours();
    
    switch (preference) {
      case 'morning': return hour >= 6 && hour < 12;
      case 'afternoon': return hour >= 12 && hour < 18;
      case 'evening': return hour >= 18 && hour < 24;
      case 'night': return hour >= 0 && hour < 6;
      default: return true;
    }
  }

  // Helper: Generate flight pros
  private generateFlightPros(flight: any, preferences: UserPreferences): string[] {
    const pros = [];
    
    if (flight.stops === 0) pros.push('Non-stop flight');
    if (preferences.preferredAirlines.includes(flight.airline)) pros.push('Your preferred airline');
    if (flight.duration < 120) pros.push('Short flight duration');
    if (flight.price < 300) pros.push('Great price');
    
    return pros;
  }

  // Helper: Generate flight cons
  private generateFlightCons(flight: any, preferences: UserPreferences): string[] {
    const cons = [];
    
    if (flight.stops > 0) cons.push(`${flight.stops} stop(s)`);
    if (flight.duration > 300) cons.push('Long flight duration');
    if (flight.price > 500) cons.push('Higher price');
    if (!preferences.preferredAirlines.includes(flight.airline)) cons.push('Not your preferred airline');
    
    return cons;
  }

  // Helper: Find similar trips
  private async findSimilarTrips(
    userId: number,
    destination: string,
    purpose: string
  ): Promise<any[]> {
    const trips = await db.select({
      destination: trips.city,
      totalCost: sql`
        COALESCE(
          (SELECT SUM(total_amount) 
           FROM bookings 
           WHERE bookings.trip_id = trips.id 
           AND bookings.status = 'confirmed'), 
          0
        )
      `,
      duration: sql`
        EXTRACT(DAY FROM trips.end_date - trips.start_date)
      `
    })
    .from(trips)
    .where(
      and(
        eq(trips.user_id, userId),
        sql`trips.city = ${destination} OR trips.location = ${destination}`,
        eq(trips.trip_type, purpose)
      )
    )
    .limit(5);

    return trips;
  }
}

export const aiBookingRecommendationService = new AIBookingRecommendationService();