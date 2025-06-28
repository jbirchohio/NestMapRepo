/**
 * Types related to business trip generation and management
 */

export interface BusinessTripRequest {
    traveler: {
        id: string;
        name: string;
        email: string;
        department: string;
        role: string;
        seniority: 'junior' | 'mid' | 'senior' | 'executive';
        preferences: {
            seatPreference?: 'window' | 'aisle' | 'none';
            mealPreference?: string;
            hotelPreferences?: string[];
            specialNeeds?: string[];
        };
    };
    destination: {
        city: string;
        country: string;
        timezone: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    dates: {
        departure: string; // ISO date string
        return: string; // ISO date string
        flexibleDates?: boolean;
    };
    budget: {
        maxTotal: number;
        currency: string;
        expenseCategories: {
            flights: number;
            accommodation: number;
            meals: number;
            localTransport: number;
            other: number;
        };
    };
    company: {
        id: string;
        name: string;
        industry: string;
        travelPolicy?: TravelPolicy;
    };
    tripPurpose: string;
    groupSize: number;
}

export interface TravelPolicy {
    maxDailyMealAllowance: number;
    maxHotelRate: number;
    preferredAirlines?: string[];
    preferredHotelChains?: string[];
    requiresAdvanceBooking?: number; // days
    maxFlightDuration?: number; // hours
    businessClassAllowed: boolean;
    requiresApproval: boolean;
    allowedExpenseCategories: string[];
    receiptRequiredFor: string[];
    restrictions: {
        noWeekendTravel?: boolean;
        noRedEyeFlights?: boolean;
        maxConnections?: number;
    };
    reimbursementProcess: string;
    specialProvisions?: string[];
}

export interface FlightSegment {
    departure: {
        airport: string;
        time: string; // ISO datetime string
        terminal?: string;
        gate?: string;
    };
    arrival: {
        airport: string;
        time: string; // ISO datetime string
        terminal?: string;
        gate?: string;
    };
    airline: string;
    flightNumber: string;
    aircraft?: string;
    duration: number; // minutes
    cabinClass: 'economy' | 'premium_economy' | 'business' | 'first';
    bookingClass?: string;
    fareBasis?: string;
    baggageAllowance?: {
        carryOn: number;
        checked: number;
    };
}

export interface Accommodation {
    id: string;
    name: string;
    type: 'hotel' | 'apartment' | 'hostel' | 'other';
    address: {
        line1: string;
        line2?: string;
        city: string;
        state?: string;
        postalCode: string;
        country: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    checkIn: string; // ISO date string
    checkOut: string; // ISO date string
    roomType: string;
    rate: {
        amount: number;
        currency: string;
        includesBreakfast: boolean;
        isRefundable: boolean;
        cancellationPolicy?: string;
    };
    amenities?: string[];
    distanceFromVenue?: {
        value: number;
        unit: 'meters' | 'miles' | 'kilometers';
    };
}

export interface Activity {
    id: string;
    name: string;
    type: 'meeting' | 'conference' | 'networking' | 'team_building' | 'meal' | 'transport' | 'other';
    startTime: string; // ISO datetime string
    endTime: string; // ISO datetime string
    location: {
        name: string;
        address?: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    description?: string;
    attendees?: string[];
    isRequired: boolean;
    dressCode?: string;
}

export interface Meal {
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    time: string; // ISO datetime string
    restaurant: {
        name: string;
        cuisine: string;
        priceRange?: '$' | '$$' | '$$$' | '$$$$';
        address?: string;
    };
    estimatedCost: number;
    isProvided: boolean;
    dietaryOptions?: string[];
}

export interface Transportation {
    type: 'taxi' | 'rental_car' | 'public_transit' | 'shuttle' | 'walking';
    startTime: string; // ISO datetime string
    endTime: string; // ISO datetime string
    from: string; // location name or address
    to: string; // location name or address
    provider?: string;
    estimatedDuration: number; // minutes
    estimatedCost?: number;
    bookingReference?: string;
    notes?: string;
}

export interface WeatherForecast {
    date: string; // ISO date string
    highTemp: number; // Celsius
    lowTemp: number; // Celsius
    condition: string;
    precipitationChance: number; // percentage
    windSpeed: number; // km/h
    humidity: number; // percentage
    sunrise?: string; // ISO time string
    sunset?: string; // ISO time string
    alerts?: string[];
}

export interface GeneratedBusinessTrip {
    tripSummary: {
        title: string;
        description: string;
        totalCost: number;
        carbonFootprint: number; // kg CO2
        duration: number; // days
        startDate: string; // ISO date string
        endDate: string; // ISO date string
    };
    flights: FlightSegment[];
    accommodation: Accommodation[];
    activities: Activity[];
    workSchedule: Activity[];
    meals: Meal[];
    transportation: Transportation[];
    budgetBreakdown: {
        flights: number;
        hotels: number;
        meals: number;
        activities: number;
        transportation: number;
        contingency: number;
    };
    conflicts: {
        type: 'schedule' | 'budget' | 'policy' | 'preference';
        description: string;
        severity: 'low' | 'medium' | 'high';
        resolution?: string;
    }[];
    recommendations: string[];
    weatherConsiderations: {
        forecast: WeatherForecast[];
        packingSuggestions: string[];
        potentialDisruptions: string[];
    };
    complianceNotes: string[];
}

/**
 * Duffel API Types
 */

export interface DuffelPassenger {
  /** Passenger's given name */
  given_name: string;
  
  /** Passenger's family name */
  family_name: string;
  
  /** Passenger's date of birth in YYYY-MM-DD format */
  born_on: string;
  
  /** Passenger's title (e.g., 'mr', 'ms', 'mrs', 'miss', 'mstr') */
  title?: 'mr' | 'ms' | 'mrs' | 'miss' | 'mstr';
  
  /** Passenger's gender (if required by airline) */
  gender?: 'm' | 'f' | 'x';
  
  /** Passenger type (e.g., 'adult', 'child', 'infant') */
  type?: 'adult' | 'child' | 'infant';
  
  /** Loyalty program information */
  loyalty_programme_accounts?: Array<{
    account_number: string;
    airline_iata_code: string;
  }>;
}

export interface DuffelContactInfo {
  /** Contact's email address */
  email: string;
  
  /** Contact's phone number with country code (e.g., +14155552671) */
  phone_number: string;
  
  /** Contact's full name */
  name: string;
  
  /** Contact's address */
  address?: {
    line1: string;
    line2?: string;
    city: string;
    country: string;
    postal_code: string;
    region?: string;
  };
}

export interface DuffelFlightSegment {
  /** Departure airport information */
  origin: {
    iata_code: string;
    name?: string;
    city_name?: string;
    country_name?: string;
  };
  
  /** Arrival airport information */
  destination: {
    iata_code: string;
    name?: string;
    city_name?: string;
    country_name?: string;
  };
  
  /** Departure time in ISO 8601 format */
  departing_at: string;
  
  /** Arrival time in ISO 8601 format */
  arriving_at: string;
  
  /** Marketing carrier (airline) information */
  marketing_carrier: {
    iata_code: string;
    name?: string;
  };
  
  /** Operating carrier (airline) information */
  operating_carrier?: {
    iata_code: string;
    name?: string;
  };
  
  /** Flight number */
  marketing_carrier_flight_number: string;
  
  /** Duration of the flight in ISO 8601 format (e.g., 'PT2H30M') */
  duration?: string;
  
  /** Aircraft information */
  aircraft?: {
    name?: string;
    iata_code?: string;
  };
}

export interface DuffelOffer {
  id: string;
  expires_at: string;
  total_amount: string;
  total_currency: string;
  slices: Array<{
    segments: DuffelFlightSegment[];
  }>;
  owner: {
    iata_code: string;
    name: string;
  };
}

export interface DuffelBookingResponse {
  success: boolean;
  bookingReference?: string;
  confirmationNumber?: string;
  status: string;
  bookingDetails?: Record<string, unknown>;
  error?: string;
}

// Types for search results
export interface FlightSearchResult {
    id: string;
    price: {
        amount: number;
        currency: string;
    };
    departure: {
        airport: {
            code: string;
            name: string;
            city: string;
            country: string;
        };
        time: string;
    };
    arrival: {
        airport: {
            code: string;
            name: string;
            city: string;
            country: string;
        };
        time: string;
    };
    airline: {
        code: string;
        name: string;
    };
    flightNumber: string;
    duration: string;
    segments: Array<{
        departure: {
            airport: {
                code: string;
                name: string;
                city: string;
                country: string;
            };
            time: string;
        };
        arrival: {
            airport: {
                code: string;
                name: string;
                city: string;
                country: string;
            };
            time: string;
        };
        airline: {
            code: string;
            name: string;
        };
        flight_number: string;
        duration: string;
    }>;
    bookingToken: string;
    validUntil: string;
}

export interface HotelSearchResult {
    id: string;
    name: string;
    starRating: number;
    rating: {
        score: number;
        reviews: number;
    };
    price: {
        amount: number;
        currency: string;
        per: 'night' | 'stay';
    };
    address: string;
    location: {
        latitude: number;
        longitude: number;
    };
    amenities: string[];
    images: string[];
    description: string;
    checkIn: string;
    checkOut: string;
    cancellation: string;
    searchResultId: string;
    ratesAvailable: number;
}

// Re-export all types through the index
export * from './business-trip.types.js';
